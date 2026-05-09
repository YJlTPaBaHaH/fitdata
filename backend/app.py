from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

from database import get_connection

app = Flask(__name__)
CORS(app)


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json()

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Необходимо указать электронную почту и пароль"}), 400

    password_hash = generate_password_hash(password)

    try:
        with get_connection() as connection:
            cursor = connection.execute(
                """
                INSERT INTO users (email, password_hash)
                VALUES (?, ?)
                """,
                (email, password_hash)
            )

            user_id = cursor.lastrowid

        return jsonify({
            "user_id": user_id,
            "email": email
        }), 201

    except Exception:
        return jsonify({"error": "Пользователь с такой электронной почтой уже существует"}), 409


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json()

    email = data.get("email")
    password = data.get("password")

    with get_connection() as connection:
        user = connection.execute(
            """
            SELECT user_id, email, password_hash
            FROM users
            WHERE email = ?
            """,
            (email,)
        ).fetchone()

    if user is None:
        return jsonify({"error": "Пользователь не найден"}), 404

    if not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "Неверный пароль"}), 401

    return jsonify({
        "user_id": user["user_id"],
        "email": user["email"]
    })


@app.route("/api/exercises", methods=["GET"])
def get_exercises():
    with get_connection() as connection:
        exercises = connection.execute(
            """
            SELECT exercise_id, name, muscle_group, description
            FROM exercises
            ORDER BY name
            """
        ).fetchall()

    return jsonify([dict(exercise) for exercise in exercises])


@app.route("/api/workouts", methods=["POST"])
def create_workout():
    data = request.get_json()

    user_id = data.get("user_id")
    date = data.get("date")
    duration = data.get("duration")

    if not user_id or not date:
        return jsonify({"error": "Необходимо указать пользователя и дату тренировки"}), 400

    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO workouts (user_id, date, duration)
            VALUES (?, ?, ?)
            """,
            (user_id, date, duration)
        )

        workout_id = cursor.lastrowid

    return jsonify({
        "workout_id": workout_id,
        "user_id": user_id,
        "date": date,
        "duration": duration
    }), 201


@app.route("/api/workouts", methods=["GET"])
def get_workouts():
    user_id = request.args.get("user_id")

    if not user_id:
        return jsonify({"error": "Необходимо указать user_id"}), 400

    with get_connection() as connection:
        workouts = connection.execute(
            """
            SELECT workout_id, user_id, date, duration
            FROM workouts
            WHERE user_id = ?
            ORDER BY date DESC
            """,
            (user_id,)
        ).fetchall()

    return jsonify([dict(workout) for workout in workouts])


@app.route("/api/workout-exercises", methods=["POST"])
def add_exercise_to_workout():
    data = request.get_json()

    workout_id = data.get("workout_id")
    exercise_id = data.get("exercise_id")
    order_index = data.get("order_index")

    if not workout_id or not exercise_id or order_index is None:
        return jsonify({"error": "Необходимо указать workout_id, exercise_id и order_index"}), 400

    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO workout_exercises (workout_id, exercise_id, order_index)
            VALUES (?, ?, ?)
            """,
            (workout_id, exercise_id, order_index)
        )

        workout_exercise_id = cursor.lastrowid

    return jsonify({
        "workout_exercise_id": workout_exercise_id,
        "workout_id": workout_id,
        "exercise_id": exercise_id,
        "order_index": order_index
    }), 201


@app.route("/api/sets", methods=["POST"])
def add_set():
    data = request.get_json()

    workout_exercise_id = data.get("workout_exercise_id")
    set_number = data.get("set_number")
    weight = data.get("weight")
    reps = data.get("reps")

    if not workout_exercise_id or not set_number or weight is None or reps is None:
        return jsonify({"error": "Необходимо указать параметры подхода"}), 400

    with get_connection() as connection:
        cursor = connection.execute(
            """
            INSERT INTO sets (workout_exercise_id, set_number, weight, reps)
            VALUES (?, ?, ?, ?)
            """,
            (workout_exercise_id, set_number, weight, reps)
        )

        set_id = cursor.lastrowid

    return jsonify({
        "set_id": set_id,
        "workout_exercise_id": workout_exercise_id,
        "set_number": set_number,
        "weight": weight,
        "reps": reps
    }), 201


@app.route("/api/workouts/<int:workout_id>", methods=["GET"])
def get_workout_details(workout_id):
    with get_connection() as connection:
        workout = connection.execute(
            """
            SELECT workout_id, user_id, date, duration
            FROM workouts
            WHERE workout_id = ?
            """,
            (workout_id,)
        ).fetchone()

        if workout is None:
            return jsonify({"error": "Тренировка не найдена"}), 404

        exercises = connection.execute(
            """
            SELECT 
                we.workout_exercise_id,
                we.order_index,
                e.exercise_id,
                e.name,
                e.muscle_group,
                e.description
            FROM workout_exercises we
            JOIN exercises e ON e.exercise_id = we.exercise_id
            WHERE we.workout_id = ?
            ORDER BY we.order_index
            """,
            (workout_id,)
        ).fetchall()

        result_exercises = []

        for exercise in exercises:
            sets = connection.execute(
                """
                SELECT set_id, set_number, weight, reps
                FROM sets
                WHERE workout_exercise_id = ?
                ORDER BY set_number
                """,
                (exercise["workout_exercise_id"],)
            ).fetchall()

            exercise_dict = dict(exercise)
            exercise_dict["sets"] = [dict(item) for item in sets]
            result_exercises.append(exercise_dict)

    workout_dict = dict(workout)
    workout_dict["exercises"] = result_exercises

    return jsonify(workout_dict)
@app.route("/api/analytics/exercise", methods=["GET"])
def get_exercise_analytics():
    user_id = request.args.get("user_id")
    exercise_name = request.args.get("name")

    if not user_id or not exercise_name:
        return jsonify({"error": "Необходимо указать user_id и name"}), 400

    with get_connection() as connection:
        records = connection.execute(
            """
            SELECT
                s.set_id,
                w.workout_id,
                we.workout_exercise_id,
                e.exercise_id,
                e.name,
                w.date,
                s.weight,
                s.reps,
                s.set_number
            FROM sets s
            JOIN workout_exercises we ON we.workout_exercise_id = s.workout_exercise_id
            JOIN workouts w ON w.workout_id = we.workout_id
            JOIN exercises e ON e.exercise_id = we.exercise_id
            WHERE w.user_id = ?
              AND e.name = ?
            ORDER BY w.date DESC, s.set_id DESC
            """,
            (user_id, exercise_name)
        ).fetchall()

    return jsonify([dict(record) for record in records])


@app.route("/api/analytics/record", methods=["POST"])
def add_analytics_record():
    data = request.get_json()

    user_id = data.get("user_id")
    exercise_name = data.get("name")
    weight = data.get("weight")
    reps = data.get("reps")
    date = data.get("date")

    if not user_id or not exercise_name or weight is None or reps is None or not date:
        return jsonify({"error": "Необходимо указать user_id, name, weight, reps и date"}), 400

    with get_connection() as connection:
        exercise = connection.execute(
            """
            SELECT exercise_id
            FROM exercises
            WHERE name = ?
            """,
            (exercise_name,)
        ).fetchone()

        if exercise is None:
            return jsonify({"error": "Упражнение не найдено"}), 404

        workout_cursor = connection.execute(
            """
            INSERT INTO workouts (user_id, date, duration)
            VALUES (?, ?, ?)
            """,
            (user_id, date, None)
        )

        workout_id = workout_cursor.lastrowid

        workout_exercise_cursor = connection.execute(
            """
            INSERT INTO workout_exercises (workout_id, exercise_id, order_index)
            VALUES (?, ?, ?)
            """,
            (workout_id, exercise["exercise_id"], 1)
        )

        workout_exercise_id = workout_exercise_cursor.lastrowid

        set_cursor = connection.execute(
            """
            INSERT INTO sets (workout_exercise_id, set_number, weight, reps)
            VALUES (?, ?, ?, ?)
            """,
            (workout_exercise_id, 1, weight, reps)
        )

        set_id = set_cursor.lastrowid

    return jsonify({
        "set_id": set_id,
        "workout_id": workout_id,
        "workout_exercise_id": workout_exercise_id,
        "exercise_id": exercise["exercise_id"],
        "name": exercise_name,
        "date": date,
        "weight": weight,
        "reps": reps
    }), 201

if __name__ == "__main__":
    app.run(debug=True)