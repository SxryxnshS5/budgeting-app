import os
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
PORT: int = int(os.getenv("PORT", 8000))
UPLOADS_DIR: str = "uploads"
DB_PATH: str = "receipts.db"

ALLOWED_MIME_TYPES: set[str] = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
}
