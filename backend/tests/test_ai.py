"""
Integration tests for services/ai.py — these make real OpenAI API calls.

Requirements:
  - OPENAI_API_KEY must be set in backend/.env or as an environment variable.
  - An active internet connection is required.

Run with:
    pytest tests/test_ai.py -v
"""

import base64
import os
import sys

import pytest
from openai import AuthenticationError, OpenAI

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from config import OPENAI_API_KEY
from services.ai import extract_receipt, generate_insights

RECEIPT_IMAGE = os.path.join(os.path.dirname(__file__), "1000-receipt.jpg")

# ---------------------------------------------------------------------------
# Skip the whole module if no key is present
# ---------------------------------------------------------------------------

pytestmark = pytest.mark.skipif(
    not OPENAI_API_KEY,
    reason="OPENAI_API_KEY not set — skipping live API tests.",
)

# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

SAMPLE_RECEIPTS = [
    {
        "store_name": "Tesco",
        "date": "2024-06-01",
        "total_amount": 42.50,
        "category": "groceries",
        "items": [{"name": "Milk", "price": 1.20}, {"name": "Bread", "price": 1.50}],
    },
    {
        "store_name": "Pizza Express",
        "date": "2024-06-05",
        "total_amount": 28.00,
        "category": "dining",
        "items": [{"name": "Margherita", "price": 14.00}, {"name": "Cola", "price": 3.50}],
    },
]


def _receipt_b64() -> str:
    """Return the test receipt image as a base64 string."""
    with open(RECEIPT_IMAGE, "rb") as f:
        return base64.standard_b64encode(f.read()).decode()


# ---------------------------------------------------------------------------
# API key sanity checks
# ---------------------------------------------------------------------------

class TestApiKey:
    def test_key_is_present(self):
        """The OPENAI_API_KEY must not be empty."""
        assert OPENAI_API_KEY, "OPENAI_API_KEY is empty — check your .env file."

    def test_key_format(self):
        """OpenAI keys start with 'sk-'."""
        assert OPENAI_API_KEY.startswith("sk-"), (
            f"Key does not look like an OpenAI key (expected 'sk-...'): {OPENAI_API_KEY[:8]}..."
        )

    def test_key_is_accepted_by_openai(self):
        """Make a cheap models.list() call to confirm the key is valid and active."""
        try:
            models = OpenAI(api_key=OPENAI_API_KEY).models.list()
            assert models.data, "models.list() returned an empty list — unexpected."
        except AuthenticationError as exc:
            pytest.fail(f"OpenAI rejected the API key: {exc}")


# ---------------------------------------------------------------------------
# extract_receipt
# ---------------------------------------------------------------------------

class TestExtractReceipt:
    """
    All tests share a single API call (cached on the class) to avoid
    redundant requests. The cache is intentionally reset between test
    sessions via the module-level fixture below.
    """
    _result: tuple[dict, str] | None = None

    @classmethod
    def _get_result(cls) -> tuple[dict, str]:
        if cls._result is None:
            cls._result = extract_receipt(_receipt_b64(), "image/jpeg")
        return cls._result

    @classmethod
    def reset(cls) -> None:
        cls._result = None

    # ------------------------------------------------------------------
    # Structure tests — verify the response shape is always correct
    # ------------------------------------------------------------------

    def test_returns_tuple(self):
        """extract_receipt must return a (dict, str) tuple."""
        result = self._get_result()
        assert isinstance(result, tuple) and len(result) == 2

    def test_dict_has_expected_keys(self):
        """The parsed dict must contain all five receipt keys."""
        receipt_dict, _ = self._get_result()
        for key in ("store_name", "date", "total_amount", "category", "items"):
            assert key in receipt_dict, (
                f"Missing key '{key}'. Full response: {receipt_dict}"
            )

    def test_raw_text_is_valid_json(self):
        """The cleaned string must be parseable as JSON (markdown fences stripped)."""
        import json
        _, raw_text = self._get_result()
        try:
            json.loads(raw_text)
        except json.JSONDecodeError:
            pytest.fail(f"raw_text is not valid JSON: {raw_text[:300]}")

    def test_items_is_a_list(self):
        """items must always be a list (empty is fine for receipts with no line items)."""
        receipt_dict, _ = self._get_result()
        assert isinstance(receipt_dict.get("items"), list), (
            f"Expected items to be a list, got: {type(receipt_dict.get('items'))}"
        )

    # ------------------------------------------------------------------
    # Content tests — check values extracted from the real receipt.
    # Fields are allowed to be None if the receipt doesn't show them.
    # ------------------------------------------------------------------

    def test_items_have_name_and_price(self):
        """Every item object must have a 'name' string and a numeric 'price'."""
        receipt_dict, _ = self._get_result()
        for item in receipt_dict.get("items", []):
            assert "name" in item, f"Item missing 'name': {item}"
            assert "price" in item, f"Item missing 'price': {item}"
            assert isinstance(item["price"], (int, float)), (
                f"Item price is not a number: {item['price']}"
            )

    def test_total_amount_is_number_or_none(self):
        """total_amount is a number when present, or None if the receipt omits it."""
        receipt_dict, _ = self._get_result()
        value = receipt_dict.get("total_amount")
        assert value is None or isinstance(value, (int, float)), (
            f"total_amount must be a number or None, got: {value!r}"
        )

    def test_store_name_is_string_or_none(self):
        """store_name is a non-empty string when present, or None if unreadable."""
        receipt_dict, _ = self._get_result()
        value = receipt_dict.get("store_name")
        assert value is None or (isinstance(value, str) and len(value) > 0), (
            f"store_name must be a non-empty string or None, got: {value!r}"
        )

    def test_date_is_string_or_none(self):
        """date is a string when present, or None if missing from the receipt."""
        receipt_dict, _ = self._get_result()
        value = receipt_dict.get("date")
        assert value is None or isinstance(value, str), (
            f"date must be a string or None, got: {value!r}"
        )

    def test_category_is_valid_or_none(self):
        """Category must be one of the allowed values, or None if undetectable."""
        valid = {
            "groceries", "dining", "transport", "entertainment",
            "health", "shopping", "utilities", "other", None,
        }
        receipt_dict, _ = self._get_result()
        assert receipt_dict.get("category") in valid, (
            f"Unexpected category: {receipt_dict.get('category')!r}"
        )

    def test_known_receipt_values(self):
        """Spot-check values we can read directly from the 1000-receipt.jpg image."""
        receipt_dict, _ = self._get_result()
        assert receipt_dict.get("store_name", "").upper() == "GREEN FIELD", (
            f"Expected store 'GREEN FIELD', got: {receipt_dict.get('store_name')!r}"
        )
        assert receipt_dict.get("total_amount") == 56.58, (
            f"Expected total $56.58, got: {receipt_dict.get('total_amount')!r}"
        )
        assert receipt_dict.get("date") == "2016-05-26", (
            f"Expected date '2016-05-26', got: {receipt_dict.get('date')!r}"
        )


# ---------------------------------------------------------------------------
# generate_insights
# ---------------------------------------------------------------------------

class TestGenerateInsights:
    def test_returns_structured_dict(self):
        """generate_insights must return a dict with the expected keys."""
        result = generate_insights(SAMPLE_RECEIPTS)
        assert isinstance(result, dict)
        for key in ("narrative", "tips", "alternatives", "recommendations"):
            assert key in result
        assert isinstance(result["narrative"], str) and len(result["narrative"].strip()) > 0
        for key in ("tips", "alternatives", "recommendations"):
            assert isinstance(result[key], list)

    def test_narrative_mentions_a_category_or_store(self):
        """The narrative should reference at least one category or store from the data."""
        result = generate_insights(SAMPLE_RECEIPTS)["narrative"].lower()
        keywords = {"groceries", "dining", "tesco", "pizza", "spending", "food"}
        assert any(kw in result for kw in keywords), (
            f"Insights don't seem to reference the receipt data: {result[:300]}"
        )

    def test_single_receipt(self):
        """Should handle a list with just one receipt without error."""
        result = generate_insights([SAMPLE_RECEIPTS[0]])
        assert isinstance(result, dict) and result["narrative"].strip()

    def test_empty_list_does_not_crash(self):
        """Passing an empty list should return a dict, not raise."""
        result = generate_insights([])
        assert isinstance(result, dict)
