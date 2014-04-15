from flask import Flask, render_template, request
from functools import update_wrapper
from global_demo_model import GlobalDemoModel, keys_to_items
import json

app = Flask(__name__)

model = GlobalDemoModel.from_pickle('../../../demo-model/model.gdm')

@app.route('/')
def show_index():
    return render_template('index.html')

@app.route('/get_flows', methods=['GET'])
def get_flows():
    countries = ['USA', 'DEU', 'GBR', 'FRA', 'ESP', 'CHN', 'BRA']
    sectors = ['Agriculture', 'Food', 'Mining', 'Vehicles', 'Chemicals']
    return str(model.flows_to_json(model.trade_flows(countries, sectors)))

@app.route('/get_countries', methods=['GET'])
def get_countries():
    return json.dumps(keys_to_items(model.country_ids))

@app.route('/set_final_demand', methods=['POST'])
def set_final_demand():
    print "set_final_demand not implemented yet"
    return "implement me!"

@app.route('/kill_trade_route', methods=['POST'])
def kill_trade_route():
    from_id = request.json['from']
    to_id = request.json['to']
    sector_id = request.json['sector']
    return model.set_import_propensity(sector=sector_id, from_country=from_id,
            to_country=to_id, value=0)

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0')
