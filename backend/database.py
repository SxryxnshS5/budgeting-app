import sqlite3
from contextlib import contextmanager

from config import DB_PATH

# Columns added after the initial release. Each is applied with ALTER TABLE
# only if it's missing, so existing databases upgrade in place.
_MIGRATIONS = {
    "time": "TEXT",
    "cuisine": "TEXT",
    "meal_type": "TEXT",
}


def init_db() -> None:
    """Create tables if they don't exist yet, then apply column migrations."""
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

        # Add any newer columns that an older database is missing.
        existing = {row[1] for row in conn.execute("PRAGMA table_info(receipts)")}
        for column, col_type in _MIGRATIONS.items():
            if column not in existing:
                conn.execute(f"ALTER TABLE receipts ADD COLUMN {column} {col_type}")

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
