from flask import Flask, render_template, request, make_response
from functools import update_wrapper
from global_demo_model import GlobalDemoModel, keys_to_items
import json

app = Flask(__name__)
model = None

def load_model():
    global model
    #model = GlobalDemoModel.from_pickle('../../../demo-model/model.gdm')
    model = GlobalDemoModel.from_pickle('../demo-model/model.gdm')

@app.route('/')
def show_index():
    return render_template('index.html')

@app.route('/get_flows', methods=['GET'])
def get_flows():
    countries = ['USA', 'DEU', 'GBR', 'FRA', 'ESP', 'CHN', 'BRA', 'IND', 'ITA', 'KOR', 'RUS']
    sectors = ['Agriculture', 'Food', 'Mining', 'Vehicles', 'Chemicals', 'Business Services', 'Paper', 'Wood']
#    countries = None
#    sectors = None
    model_output = model.flows_to_json(model.trade_flows(countries, sectors))
    response = make_response(model_output)
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response

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
    print "killing trade route from %s to %s in sector %s" % (from_id, to_id, sector_id)
    return model.set_import_propensity(sector=sector_id, from_country=from_id,
            to_country=to_id, value=0)

@app.route('/reset_model', methods=['GET'])
def reset_model():
    print "Model is being reset..."
    load_model()
    print "Model reset."
    return "Model reset"
    
if __name__ == "__main__":
    load_model()
    app.run(debug=True, host='0.0.0.0')
