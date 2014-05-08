var GDMVIEWER = GDMVIEWER || {};

GDMVIEWER.Paths = (function() {
    'use strict';

    // [ private properties ]
    var curvature         = 280,
        radius_fraction   = 10,
        scaleup_factor    = 0.1,
        line_gen = d3.svg.line().interpolate("basis");

    // [ private methods ]
    // Take a pair of points, formatted like [[x1,y1],[x2,y2]]
    // and draw a curve on the global svg object like this:
    //
    //        radius_fraction
    //                |
    //   ____________---   
    //  /            \  | curvature
    // /              \ |
    function curve_data(points, scale_up) {
        var line_data = get_curve(points[0], points[1], scale_up);
        return line_gen(line_data);
    }

    function get_curve(start,end, scale_up) {
        var midpoint = get_curve_midpoint(start, end, scale_up);
        return [start, midpoint[0], midpoint[1], end];
    }

    function get_curve_midpoint(start, end, scale_up) {
        var x_1 = +start[0],
            y_1 = +start[1],
            x_2 = +end[0],
            y_2 = +end[1];
        var c = curvature * (scale_up * scaleup_factor);
        var x_m1 = x_1 + ((x_2 - x_1) / radius_fraction),
            y_m1 = y_1 + ((y_2 - y_1) / radius_fraction),
            x_m2 = x_1 + ((x_2 - x_1) * (1 - (1 / radius_fraction))),
            y_m2 = y_1 + ((y_2 - y_1) * (1 - (1 / radius_fraction)));

        var v_1 = [y_m1 - y_1, x_1 - x_m1],
            v_2 = [y_m2 - y_1, x_1 - x_m2];
        var mod_v_1 = Math.sqrt(Math.pow(v_1[0],2) + Math.pow(v_1[1],2)),
            mod_v_2 = Math.sqrt(Math.pow(v_2[0],2) + Math.pow(v_2[1],2));

        var x_z1 = x_m1 + c / mod_v_1 * v_1[0],
            y_z1 = y_m1 + c / mod_v_1 * v_1[1],
            x_z2 = x_m2 + c / mod_v_2 * v_2[0],
            y_z2 = y_m2 + c / mod_v_2 * v_2[1];

        return [[x_z1,y_z1],[x_z2,y_z2]];
    }

    // [ public methods ]
    return {
        curve_data: function(points, scale_up) {
            scale_up = typeof scale_up !== 'undefined' ? scale_up : 1;
            var line_data = get_curve(points[0], points[1], scale_up);
            return line_gen(line_data);
        }
    };
});

GDMVIEWER.Viewer = (function() {
    'use strict';

    // [ private properties ]
    var W                  = 1280,
    H                  = W,
    svg                = d3.select("body").append("svg"),

    country_radius     = W / 4, 
    sector_radius      = country_radius / 6,

    max_flow_value     = 0,
    max_country_size   = 0,

    server_address     = "http://localhost:5000";
    // end var

    // [ private methods ]
    function createCountriesAndSectors(error, json) {
        // Request the flows JSON from the server
        var countries = [];
        if (error) {
            console.log("Error:" + error);
        } else {
            console.log("JSON Loaded successfully");
            max_flow_value = d3.max(json.flows, 
                    function(d) { return d.value; });
            countries = createCountries(json.countries, json.flows);
            countries.forEach(function(c) {
                var sectors = add_xy_to_sectors(c, json.sectors);
                label_sectors(c, sectors);
                set_sector_sizes(sectors, json.flows);
                draw_items(sectors, "sector");
            });
            draw_flows(json.flows);
        }
    }

    // Set the size of each country in countries, based on the flows
    // Set the max_country_size property based in this.
    // Create a d3 object for each country
    function createCountries(countries, flows) {
        set_country_sizes(countries, flows);
        max_country_size = d3.max(countries, 
                function(d) { return d.size; });
        countries = add_xy_to_countries(countries);
        draw_items(countries, "country");
        return countries;
    }

    // Make a circle for each object in placed_items
    // The items must have an x a y and either an r
    // or, alternatively a radius specified by radius_field
    function draw_items(placed_items, class_name, radius_field) {
        radius_field = typeof radius_field !== 
            'undefined' ? radius_field : 'r';
        // Set the radius
        placed_items.forEach(function(x) {set_radius(x, radius_field);});
        var items_with_data = svg.selectAll("circle")
            .data(placed_items, function(d) { return d.name + d.id; });

        // Enter
        var new_items = items_with_data.enter()
            .append("g") // Each circle is in a group with its label
            .classed(class_name, true)
            .attr("transform", function(d) {
                return "translate(" + d.x + "," + d.y + ")";
            })
            .attr("id", function(d) {return d.id;})
            .attr("x", function(d) { return d.x; }) // Used for drawing paths
            .attr("y", function(d) { return d.y; })
            .attr("parent_id", function(d) { 
                if (typeof d.parent_id !== 'undefined') {
                    return d.parent_id;
                }
            });
         new_items.append("circle")
            .classed(class_name, true)
            .style("fill", class_name === "country" ? "red" : "blue")
            .attr("r", 0) // Start each circle small and transition up
            .transition().duration(500)
            .attr("r",  function (d) {return d[radius_field];});
       new_items.append("text")
            .classed(class_name, true)
            .attr("text-anchor", "middle")
            .text(function(d) {return d.name;})
        // Update
        items_with_data.transition().duration(500)
            .attr("r", function(d) {return d[radius_field];});
    }

    function draw_flows(flow_data) {
        var flows = svg.selectAll("path")
            .data(flow_data, function(d) { return d.id; })
        // Enter
        flows.enter().append("path")
            .attr("d", flow_line)
            .classed("dimmed", true)
            .attr("stroke", "black")
            .style("fill", "none")
            .attr("stroke-width", function (d) { return d.value / max_flow_value * 3; })
            .on("click", flow_on_click)
            .on("mouseover", flow_on_mouseover)
            .on("mouseout", flow_on_mouseout);
        // Update
        flows.transition().duration(500)
            .attr("stroke-width", function(d) { return d.value / max_flow_value * 3; }) // TODO: Refactor!
    }

    function flow_on_mouseover(d) {
        d3.select(this).classed("dimmed", false);
    }

    function flow_on_mouseout(d) {
        d3.select(this).classed("dimmed", true);
    }
    function get_sector_from_ids(country_id, sector_id) {
        var country = get_country_from_id(country_id);
        return svg.selectAll(".sector")
            .filter(function (s) { return s.id === sector_id; })
            .filter(function (s) { return s.parent_id === country.datum().id; });
    }

    function get_country_from_id(id) {
        return svg.selectAll(".country").filter(function(d) { return d.id === id; });
    }

    // Add x,y values to each country
    function add_xy_to_countries(countries) {
        return add_xy_to_items(countries, country_radius);
    }

    // Add x,y values to each sector
    function add_xy_to_sectors(country, sectors) {
        return add_xy_to_items(sectors, sector_radius, country.x, country.y);
    }

    function add_xy_to_items(items, r, x_offset, y_offset) {
        var placed = [];
        items = items.sort();
        for (var i = 0; i < items.length; i++) {
            var item = {
                name: items[i].name,
                id: items[i].id,
                size: items[i].size
            };
            set_xy(item, i, items.length, r, x_offset, y_offset);
            placed.push(item);
        }
        return placed;
    }

    function label_sectors(country, sectors) {
        sectors.forEach(function(s) {
            s.name = country.name + ' ' + s.name;
            s.parent_id = country.id;
        });
    }

    // TODO: Rationalise this and the next function
    function set_country_sizes(countries, flows) {
        for (var i = 0; i < countries.length; i++) {
            set_country_size(countries[i], flows);
        }
    }

    function set_country_size(country, flows) {
        country.size = flows
            .filter(function(f) { return f.to === country.id; })
            .reduce(function(total, flow) { 
                return total + flow.value; 
            }, 0);
    }

    function set_sector_sizes(sectors, flows) {
        for (var i = 0; i < sectors.length; i++) {
            set_sector_size(sectors[i], flows);
        }
    }

    function set_sector_size(sector, flows) {
        sector.size = flows
            .filter(function(f) {
                return f.sector === sector.id && 
                f.to === sector.parent_id; })
            .reduce(sum_over_field('value'), 0);

    }

    // Run over the objects in an array and
    // create a running sum by adding 'field'
    function sum_over_field(field) {
        return function(total, x) { return total + x[field]; };
    }

    // Set the radius from the radius_field. 
    function set_radius(object, radius_field) {
        object[radius_field] = object.size / max_country_size * 20;
    }

    // Set x and y values of the object c 
    function set_xy(c, i, n, r, x_offset, y_offset) {
        // Set the x and y attributes of an object c
        var xy = xy_from_index(i, n, r, x_offset, y_offset);
        c.x = xy[0];
        c.y = xy[1];
    }

    // x and y values for the position of the nth chunk
    // on the arc of a circle of radius r
    // where the arc is divided into n chunks. Offset
    // defaults to w/2, h/2
    function xy_from_index(i, n, r, x_offset, y_offset) {
        var pi = Math.PI;
        // Set default offset to half of w, h
        x_offset = typeof x_offset !== 'undefined' ? x_offset : W / 2;
        y_offset = typeof y_offset !== 'undefined' ? y_offset : H / 2;
        var x = r * Math.sin(2 * pi * i / n);
        var y = r * Math.cos(2 * pi * i / n);
        return [x + x_offset, y + y_offset];
    }

    // Define a line between countries d.from and d.to 
    // in the sector d.sector
    function flow_line(d) {
        var from_sector = 0,
            to_sector = 0,
            points = [];

        if (d.from !== d.to) {
            from_sector = get_sector_from_ids(d.from, d.sector); 
            to_sector = get_sector_from_ids(d.to, d.sector);
            points = [[from_sector.attr("x"), from_sector.attr("y")],
                        [to_sector.attr("x"), to_sector.attr("y")]];
            return GDMVIEWER.Paths().curve_data(points);
        }
//        return "M" + from_sector.attr("cx") + "," + from_sector.attr("cy") +
//            "L" + to_sector.attr("cx") + "," + to_sector.attr("cy");
    }

    function flow_on_click(flow) {
        d3.xhr(server_address + '/kill_trade_route')
            .header("Content-type", "application/json")
            .post(JSON.stringify(flow), function(error, data) {
                showServerResponse(data);
                requestCountriesAndSectors();
            });
    }

    function requestCountriesAndSectors() {
        d3.json(server_address + '/get_flows', createCountriesAndSectors);
    }

    function showServerResponse(data) {
        console.log(data.response);
    }
    // [ public methods ]
    return {
        init: function() {
            svg.attr("height", H);
            svg.attr("width", W);
            // Request a JSON object from the server and create
            // coutries and sectors from it
            requestCountriesAndSectors();
        }
    };
}());



