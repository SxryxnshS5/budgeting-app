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


@router.post("", status_code=201)
async def upload_receipt(receipt: UploadFile = File(...)):
    """Upload a receipt image or PDF, extract data with AI, and save to the DB."""
    if receipt.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only JPG, PNG, WebP and PDF are accepted.",
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

    store_name = receipt_data.get("store_name")
    date = receipt_data.get("date")
    total_amount = receipt_data.get("total_amount")
    category = receipt_data.get("category")
    items = receipt_data.get("items", [])

    # Persist to DB
    with get_db() as conn:
        cursor = conn.execute(
            """
            INSERT INTO receipts
                (filename, uploaded_at, store_name, date, total_amount, category, items, raw_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                filename,
                time.time(),
                store_name,
                date,
                total_amount,
                category,
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
        "total_amount": total_amount,
        "category": category,
        "items": items,
    }


@router.get("")
def list_receipts():
    """Return all receipts from the database, newest first."""
    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT id, filename, uploaded_at, store_name, date, total_amount, category, items
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
            "total_amount": row["total_amount"],
            "category": row["category"],
            "items": items,
        })

    return result
