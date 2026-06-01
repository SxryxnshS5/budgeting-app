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
    "store_name": "Tesco",
    "date": "2024-06-01",
    "total_amount": 42.50,
    "category": "groceries",
    "items": [
        {"name": "Milk", "price": 1.20},
        {"name": "Bread", "price": 1.50},
    ],
}

FAKE_INSIGHTS = "You spent most on groceries this month. Consider meal planning to save money."


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
        for field in ("id", "filename", "uploaded_at", "store_name", "date", "total_amount", "category", "items"):
            assert field in keys


class TestInsights:
    def test_insights_returns_200_with_text(self):
        """GET /insights should return 200 and a non-empty insights string."""
        with patch("routes.insights.generate_insights", return_value=FAKE_INSIGHTS):
            response = client.get("/insights")

        assert response.status_code == 200
        body = response.json()
        assert "insights" in body
        assert len(body["insights"]) > 0

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
