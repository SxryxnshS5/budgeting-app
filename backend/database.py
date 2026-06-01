import sqlite3
from contextlib import contextmanager

from config import DB_PATH


def init_db() -> None:
    """Create tables if they don't exist yet."""
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS receipts (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                filename     TEXT    NOT NULL,
                uploaded_at  REAL    NOT NULL,
                store_name   TEXT,
                date         TEXT,
                total_amount REAL,
                category     TEXT,
                items        TEXT,
                raw_json     TEXT
            )
        """)
        conn.commit()


@contextmanager
def get_db():
    """Yield a sqlite3 connection with Row factory, then close it."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()
