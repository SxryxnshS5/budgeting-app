"""Routes for AI-generated spending insights."""

import json

from fastapi import APIRouter, HTTPException

from config import OPENAI_API_KEY
from database import get_db
from services.ai import generate_insights

router = APIRouter(prefix="/insights", tags=["insights"])


@router.get("")
def get_insights():
    """Return AI-generated spending insights based on all stored receipts."""
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured.")

    with get_db() as conn:
        rows = conn.execute(
            "SELECT store_name, date, total_amount, category, items FROM receipts ORDER BY uploaded_at DESC"
        ).fetchall()

    if not rows:
        return {
            "insights": "No receipts uploaded yet. Upload some receipts to get spending insights!",
            "receipt_count": 0,
        }

    receipts = []
    for row in rows:
        try:
            items = json.loads(row["items"]) if row["items"] else []
        except json.JSONDecodeError:
            items = []

        receipts.append({
            "store_name": row["store_name"],
            "date": row["date"],
            "total_amount": row["total_amount"],
            "category": row["category"],
            "items": items,
        })

    insights_text = generate_insights(receipts)

    return {"insights": insights_text, "receipt_count": len(receipts)}
