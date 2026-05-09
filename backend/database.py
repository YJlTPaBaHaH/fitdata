import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "fitdata.db"


def get_connection():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def init_database():
    schema_path = BASE_DIR / "schema.sql"

    with get_connection() as connection:
        with open(schema_path, "r", encoding="utf-8") as file:
            connection.executescript(file.read())

    print("База данных FITDATA создана")