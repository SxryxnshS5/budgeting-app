"""
API tests — uses FastAPI's TestClient (no live server needed).

AI calls (extract_receipt / generate_insights) are mocked so tests run
without an OpenAI API key and without hitting the network.

A temporary SQLite database is used for every test session, then cleaned up.
"""

import io
import os
import sys
import tempfile
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

# ---------------------------------------------------------------------------
# Point the app at a throw-away database before importing anything
# ---------------------------------------------------------------------------

_tmp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_tmp_db.close()
os.environ["OPENAI_API_KEY"] = "test-key"   # satisfy the key guard

# Patch DB_PATH in config before the app boots
import config
config.DB_PATH = _tmp_db.name

# Now it's safe to import the app
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from main import app          # noqa: E402
from database import init_db  # noqa: E402

init_db()   # create tables in the temp DB

client = TestClient(app)

# ---------------------------------------------------------------------------
# Fake AI responses
# ---------------------------------------------------------------------------

FAKE_RECEIPT = {
    "is_receipt": True,
    "is_food_related": True,
    "store_name": "Tesco",
    "date": "2024-06-01",
    "time": "13:30",
    "total_amount": 42.50,
    "category": "groceries",
    "cuisine": "Grocery",
    "meal_type": "lunch",
    "items": [
        {"name": "Milk", "price": 1.20, "kind": "drink", "alcoholic": False,
         "health_labels": [], "taste_tags": []},
        {"name": "Bread", "price": 1.50, "kind": "food", "alcoholic": False,
         "health_labels": ["processed"], "taste_tags": ["savory"]},
    ],
}

FAKE_INSIGHTS = {
    "narrative": "You spent most on groceries this month. Consider meal planning to save money.",
    "tips": [{"title": "Plan meals", "detail": "Batch cook on Sundays.", "monthly_saving": 40}],
    "alternatives": [{"instead_of": "Takeaway coffee", "swap_to": "Home brew", "saving": 3.5}],
    "recommendations": [{"dish": "Caprese salad", "cuisine": "Italian", "reason": "You enjoy savory dishes."}],
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def fake_image() -> bytes:
    """Return a minimal 1x1 white JPEG — valid enough for the upload handler."""
    return (
        b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00"
        b"\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t"
        b"\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a"
        b"\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\x1e41="
        b"<-$a-+#2+<.;.+#2+\xef"
        b"\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00"
        b"\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00"
        b"\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b"
        b"\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xf5\x0a\xff\xd9"
    )


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestUploadReceipt:
    def test_upload_valid_image_returns_201(self):
        """A valid image upload should return 201 with extracted receipt data."""
        with patch("routes.receipts.extract_receipt", return_value=(FAKE_RECEIPT, "{}")):
            response = client.post(
                "/receipts",
                files={"receipt": ("receipt.jpg", io.BytesIO(fake_image()), "image/jpeg")},
            )

        assert response.status_code == 201
        body = response.json()
        assert body["store_name"] == "Tesco"
        assert body["total_amount"] == 42.50
        assert body["category"] == "groceries"
        assert len(body["items"]) == 2
        assert "id" in body
        assert "filename" in body

    def test_upload_invalid_file_type_returns_400(self):
        """A non-image file type should be rejected with 400."""
        response = client.post(
            "/receipts",
            files={"receipt": ("doc.txt", io.BytesIO(b"hello"), "text/plain")},
        )

        assert response.status_code == 400
        assert "Invalid file type" in response.json()["detail"]

    def test_upload_missing_file_returns_422(self):
        """Posting with no file should return 422 Unprocessable Entity."""
        response = client.post("/receipts")
        assert response.status_code == 422

    def test_upload_non_food_receipt_is_rejected(self):
        """A valid receipt that isn't food-related should be rejected and not saved."""
        non_food = {**FAKE_RECEIPT, "is_food_related": False, "store_name": "H&M"}
        with patch("routes.receipts.extract_receipt", return_value=(non_food, "{}")):
            response = client.post(
                "/receipts",
                files={"receipt": ("r.jpg", io.BytesIO(fake_image()), "image/jpeg")},
            )

        assert response.status_code == 422
        assert "food-related" in response.json()["detail"]
        # It must not have been persisted.
        store_names = [r["store_name"] for r in client.get("/receipts").json()]
        assert "H&M" not in store_names

    def test_upload_non_receipt_is_rejected(self):
        """An image that isn't a receipt at all should be rejected."""
        not_receipt = {"is_receipt": False, "is_food_related": False}
        with patch("routes.receipts.extract_receipt", return_value=(not_receipt, "{}")):
            response = client.post(
                "/receipts",
                files={"receipt": ("r.jpg", io.BytesIO(fake_image()), "image/jpeg")},
            )

        assert response.status_code == 422
        assert "receipt" in response.json()["detail"].lower()

    def test_upload_unreadable_image_is_rejected(self):
        """If the AI can't parse the image, the upload should fail cleanly."""
        with patch("routes.receipts.extract_receipt", return_value=({}, "")):
            response = client.post(
                "/receipts",
                files={"receipt": ("r.jpg", io.BytesIO(fake_image()), "image/jpeg")},
            )

        assert response.status_code == 422


class TestListReceipts:
    def test_list_returns_200_and_array(self):
        """GET /receipts should return 200 and a list."""
        response = client.get("/receipts")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_uploaded_receipt_appears_in_list(self):
        """A receipt uploaded via POST should show up in GET /receipts."""
        with patch("routes.receipts.extract_receipt", return_value=(FAKE_RECEIPT, "{}")):
            client.post(
                "/receipts",
                files={"receipt": ("r.jpg", io.BytesIO(fake_image()), "image/jpeg")},
            )

        response = client.get("/receipts")
        assert response.status_code == 200
        receipts = response.json()
        store_names = [r["store_name"] for r in receipts]
        assert "Tesco" in store_names

    def test_list_receipt_has_expected_keys(self):
        """Each receipt object must expose the expected fields."""
        with patch("routes.receipts.extract_receipt", return_value=(FAKE_RECEIPT, "{}")):
            client.post(
                "/receipts",
                files={"receipt": ("r.jpg", io.BytesIO(fake_image()), "image/jpeg")},
            )

        receipts = client.get("/receipts").json()
        assert len(receipts) > 0
        keys = receipts[0].keys()
        for field in ("id", "filename", "uploaded_at", "store_name", "date", "time",
                      "total_amount", "category", "cuisine", "meal_type", "items"):
            assert field in keys

    def test_uploaded_receipt_stores_enriched_fields(self):
        """Cuisine and meal type from the AI should be persisted and returned."""
        with patch("routes.receipts.extract_receipt", return_value=(FAKE_RECEIPT, "{}")):
            body = client.post(
                "/receipts",
                files={"receipt": ("r.jpg", io.BytesIO(fake_image()), "image/jpeg")},
            ).json()

        assert body["cuisine"] == "Grocery"
        # 13:30 falls in the lunch window (11:00-15:59).
        assert body["meal_type"] == "lunch"


class TestInsights:
    def test_insights_returns_200_with_text(self):
        """GET /insights should return 200 with a narrative plus structured fields."""
        with patch("routes.insights.generate_insights", return_value=FAKE_INSIGHTS):
            response = client.get("/insights")

        assert response.status_code == 200
        body = response.json()
        assert "insights" in body
        assert len(body["insights"]) > 0
        # New structured fields are surfaced to the frontend.
        for field in ("tips", "alternatives", "recommendations"):
            assert isinstance(body[field], list)
        assert body["tips"][0]["title"] == "Plan meals"

    def test_insights_includes_receipt_count(self):
        """Response should include a receipt_count field."""
        with patch("routes.insights.generate_insights", return_value=FAKE_INSIGHTS):
            response = client.get("/insights")

        body = response.json()
        assert "receipt_count" in body
        assert isinstance(body["receipt_count"], int)

    def test_insights_no_receipts_returns_placeholder(self):
        """When the DB is empty the endpoint should return a helpful message, not an error."""
        # Temporarily empty the receipts table
        from database import get_db
        with get_db() as conn:
            conn.execute("DELETE FROM receipts")
            conn.commit()

        response = client.get("/insights")
        assert response.status_code == 200
        body = response.json()
        assert body["receipt_count"] == 0
        assert "No receipts" in body["insights"]


# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------

def teardown_module(_module):
    """Delete the temporary database after all tests finish."""
    try:
        os.unlink(_tmp_db.name)
    except OSError:
        pass
