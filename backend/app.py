from flask import Flask, jsonify
from flask_cors import CORS
from routes.ml_routes import ml_routes

from routes.auth_routes import auth_routes
from routes.workout_routes import workout_routes
from routes.analytics_routes import analytics_routes


app = Flask(__name__)
app.json.ensure_ascii = False
CORS(app)

app.register_blueprint(ml_routes)
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


app.register_blueprint(auth_routes)
app.register_blueprint(workout_routes)
app.register_blueprint(analytics_routes)


if __name__ == "__main__":
    app.run(debug=True)