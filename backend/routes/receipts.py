"""Routes for receipt upload and listing."""

import base64
import json
import shutil
import time
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

from config import ALLOWED_MIME_TYPES, OPENAI_API_KEY, UPLOADS_DIR
from database import get_db
from services.ai import extract_receipt

router = APIRouter(prefix="/receipts", tags=["receipts"])

_uploads = Path(UPLOADS_DIR)
_uploads.mkdir(exist_ok=True)

_VALID_MEALS = {"breakfast", "lunch", "dinner", "midnight"}


def _meal_from_time(time_str: str | None) -> str | None:
    """Derive a meal type from an HH:MM time string, or None if unparseable."""
    if not time_str:
        return None
    try:
        hour = int(time_str.split(":")[0])
    except (ValueError, AttributeError, IndexError):
        return None
    if 5 <= hour < 11:
        return "breakfast"
    if 11 <= hour < 16:
        return "lunch"
    if 16 <= hour < 22:
        return "dinner"
    return "midnight"


@router.post("", status_code=201)
async def upload_receipt(receipt: UploadFile = File(...)):
    """Upload a food receipt image, extract data with AI, and save to the DB.

    Only image files are accepted, and only food-related receipts are processed
    and stored — anything else is rejected and the uploaded file is discarded.
    """
    if receipt.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only JPG, PNG and WebP images are accepted.",
        )

    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured.")

    # Save file to disk
    filename = f"{int(time.time() * 1000)}-{receipt.filename}"
    dest = _uploads / filename
    with dest.open("wb") as f:
        shutil.copyfileobj(receipt.file, f)

    # Encode as base64 for the vision API
    image_base64 = base64.standard_b64encode(dest.read_bytes()).decode()

    # AI extraction
    receipt_data, raw_text = extract_receipt(image_base64, receipt.content_type)

    # Reject anything that isn't a readable, food-related receipt. Discard the
    # uploaded file so we don't keep images we never store in the database.
    if not receipt_data:
        dest.unlink(missing_ok=True)
        raise HTTPException(
            status_code=422,
            detail="Couldn't read this image as a receipt. Please upload a clear photo of a food bill.",
        )
    if not receipt_data.get("is_receipt"):
        dest.unlink(missing_ok=True)
        raise HTTPException(
            status_code=422,
            detail="This doesn't look like a receipt. Please upload a photo of a food bill.",
        )
    if not receipt_data.get("is_food_related"):
        dest.unlink(missing_ok=True)
        raise HTTPException(
            status_code=422,
            detail="Only food-related bills are supported. This receipt doesn't look food-related, so it wasn't saved.",
        )

    store_name = receipt_data.get("store_name")
    date = receipt_data.get("date")
    total_amount = receipt_data.get("total_amount")
    category = receipt_data.get("category")
    items = receipt_data.get("items", [])
    receipt_time = receipt_data.get("time")
    cuisine = receipt_data.get("cuisine")

    # Prefer a meal type derived from the printed time; fall back to the AI's guess.
    meal_type = _meal_from_time(receipt_time)
    if meal_type is None:
        ai_meal = (receipt_data.get("meal_type") or "").lower()
        meal_type = ai_meal if ai_meal in _VALID_MEALS else None

    # Persist to DB
    with get_db() as conn:
        cursor = conn.execute(
            """
            INSERT INTO receipts
                (filename, uploaded_at, store_name, date, time, total_amount,
                 category, cuisine, meal_type, items, raw_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                filename,
                time.time(),
                store_name,
                date,
                receipt_time,
                total_amount,
                category,
                cuisine,
                meal_type,
                json.dumps(items),
                raw_text,
            ),
        )
        receipt_id = cursor.lastrowid
        conn.commit()

    return {
        "id": receipt_id,
        "filename": filename,
        "store_name": store_name,
        "date": date,
        "time": receipt_time,
        "total_amount": total_amount,
        "category": category,
        "cuisine": cuisine,
        "meal_type": meal_type,
        "items": items,
    }


@router.get("")
def list_receipts():
    """Return all receipts from the database, newest first."""
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT id, filename, uploaded_at, store_name, date, time, total_amount,
                   category, cuisine, meal_type, items
            FROM receipts
            ORDER BY uploaded_at DESC
            """
        ).fetchall()

    result = []
    for row in rows:
        try:
            items = json.loads(row["items"]) if row["items"] else []
        except json.JSONDecodeError:
            items = []

        result.append({
            "id": row["id"],
            "filename": row["filename"],
            "uploaded_at": row["uploaded_at"],
            "store_name": row["store_name"],
            "date": row["date"],
            "time": row["time"],
            "total_amount": row["total_amount"],
            "category": row["category"],
            "cuisine": row["cuisine"],
            "meal_type": row["meal_type"],
            "items": items,
        })

    return result
