from flask import Flask, render_template, request, make_response
from functools import update_wrapper
from global_demo_model import GlobalDemoModel, keys_to_items
import json
from flask_cors import cross_origin
import time

app = Flask(__name__)
model = None
debug = False
_dummy_data = {
    "sectors": [
        {"name": "Food", "id": 9},
        {"name": "Agriculture", "id": 0}
    ], 
    "flows": [
        {"sector": 0, "to": 15, "from": 15, "id": 0, "value": 0.0},
        {"sector": 0, "to": 39, "from": 15, "id": 1, "value": 213.0},
        {"sector": 0, "to": 15, "from": 39, "id": 2, "value": -538.0},
        {"sector": 0, "to": 39, "from": 39, "id": 3, "value": 0.0},
        {"sector": 9, "to": 15, "from": 15, "id": 4, "value": 0.0},
        {"sector": 9, "to": 39, "from": 15, "id": 5, "value": 1922.0},
        {"sector": 9, "to": 15, "from": 39, "id": 6, "value": -1264.0},
        {"sector": 9, "to": 39, "from": 39, "id": 7, "value": 0.0}
    ],
    "countries": [
        {"name": "GBR", "id": 15},
        {"name": "USA", "id": 39}
    ]}
    
def load_model():
    global model
    #model = GlobalDemoModel.from_pickle('../../../demo-model/model.gdm')
    model = GlobalDemoModel.from_pickle('D:\Rob\Dropbox\PhD\Demo Model\demo-model\model.gdm')
    #model = GlobalDemoModel.from_pickle('../demo-model/model.gdm')

def response(response_text):
    r = make_response(response_text)
    #r.headers['Access-Control-Allow-Origin'] = '*'
    #r.headers["Access-Control-Allow-Methods"] = "POST, GET, OPTIONS"  
    #r.headers["Access-Control-Max-Age"] = "1000"  
    #r.headers["Access-Control-Allow-Headers"] = "*"  
    return r

@app.route('/')
def show_index():
    return response(render_template('index.html'))

@app.route('/get_flows', methods=['GET'])
@cross_origin()
def get_flows():
    print "getting flows..."
    countries = ['USA', 'DEU', 'GBR', 'FRA', 'ESP', 'CHN', 'BRA', 'IND', 'ITA', 'KOR', 'RUS']
    sectors = ['Agriculture', 'Food', 'Mining', 'Vehicles', 'Chemicals', 'Business Services', 'Paper', 'Wood']
    #countries = ['USA', 'DEU', 'GBR', 'FRA']
    #sectors = ['Agriculture', 'Food', 'Mining']
    countries = None
    sectors = None
    if debug:
        model_output = json.dumps(_dummy_data)
    else:    
        model_output = model.flows_to_json(model.trade_flows(countries, sectors))
    return response(model_output)

@app.route('/get_countries', methods=['GET'])
def get_countries():
    return json.dumps(keys_to_items(model.country_ids))

@app.route('/set_final_demand', methods=['POST'])
def set_final_demand():
    print "set_final_demand not implemented yet"
    return "implement me!"

@app.route('/kill_trade_route', methods=['POST'])
@cross_origin(headers=['Content-Type']) # Send Access-Control-Allow-Headers
def kill_trade_route():
    from_id = request.json['from']
    to_id = request.json['to']
    sector_id = request.json['sector']
    print "killing trade route from %s to %s in sector %s" % (from_id, to_id, sector_id)
    model_response = model.set_import_propensity(sector=sector_id, from_country=from_id,
            to_country=to_id, value=0)
    return response(str(model_response))

@app.route('/reset_model', methods=['GET'])
def reset_model():
    print "Model is being reset..."
    load_model()
    print "Model reset."
    return "Model reset at %s" % time.ctime()
    
if __name__ == "__main__":
    load_model()
    app.run(debug=True, host='0.0.0.0')

