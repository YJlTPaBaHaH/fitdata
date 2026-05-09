PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS sets;
DROP TABLE IF EXISTS workout_exercises;
DROP TABLE IF EXISTS workouts;
DROP TABLE IF EXISTS exercises;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE workouts (
    workout_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    duration INTEGER,

    FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

CREATE TABLE exercises (
    exercise_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    muscle_group TEXT NOT NULL,
    description TEXT
);

CREATE TABLE workout_exercises (
    workout_exercise_id INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_id INTEGER NOT NULL,
    exercise_id INTEGER NOT NULL,
    order_index INTEGER NOT NULL,

    FOREIGN KEY (workout_id)
        REFERENCES workouts(workout_id)
        ON DELETE CASCADE,

    FOREIGN KEY (exercise_id)
        REFERENCES exercises(exercise_id)
        ON DELETE RESTRICT
);

CREATE TABLE sets (
    set_id INTEGER PRIMARY KEY AUTOINCREMENT,
    workout_exercise_id INTEGER NOT NULL,
    set_number INTEGER NOT NULL,
    weight REAL NOT NULL,
    reps INTEGER NOT NULL,

    FOREIGN KEY (workout_exercise_id)
        REFERENCES workout_exercises(workout_exercise_id)
        ON DELETE CASCADE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_workouts_user_id ON workouts(user_id);
CREATE INDEX idx_workouts_user_date ON workouts(user_id, date);
CREATE INDEX idx_workout_exercises_workout_id ON workout_exercises(workout_id);
CREATE INDEX idx_workout_exercises_exercise_id ON workout_exercises(exercise_id);
CREATE INDEX idx_sets_workout_exercise_id ON sets(workout_exercise_id);
CREATE INDEX idx_sets_order ON sets(workout_exercise_id, set_number);