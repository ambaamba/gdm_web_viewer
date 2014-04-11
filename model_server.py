from flask import Flask
from flask import request

import global_demo_model

app = Flask(__name__)

model = global_demo_model.GlobalDemoModel.from_pickle('D:/rob/Dropbox/PhD/Demo Model/demo-model/dummy.gdm')

@app.route('/', methods=['GET'])
def respond():
    return str(model.flows_to_json(model.trade_flows()))

@app.route('/set_fd/', methods=['POST'])
def set_final_demand():
    

if __name__ == "__main__":
    app.run()