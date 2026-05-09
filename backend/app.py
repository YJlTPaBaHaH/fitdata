from flask import Flask, jsonify
from flask_cors import CORS

from routes.auth_routes import auth_routes
from routes.workout_routes import workout_routes
from routes.analytics_routes import analytics_routes


app = Flask(__name__)
CORS(app)


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


app.register_blueprint(auth_routes)
app.register_blueprint(workout_routes)
app.register_blueprint(analytics_routes)


if __name__ == "__main__":
    app.run(debug=True)