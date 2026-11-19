import os
from pathlib import Path

import psycopg
from dotenv import load_dotenv

project_root = Path(__file__).resolve().parents[3]
load_dotenv(project_root / ".env")


def open_connection():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is missing")

    return psycopg.connect(database_url, connect_timeout=5)