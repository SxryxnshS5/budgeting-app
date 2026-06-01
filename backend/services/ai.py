"""All interactions with the OpenAI API live here."""

import json
import re

from openai import OpenAI

from config import OPENAI_API_KEY

_EXTRACTION_SYSTEM = (
    "You are a receipt parser. Extract structured data from receipt images and return "
    "valid JSON only — no markdown, no explanation, just the JSON object."
)

_EXTRACTION_PROMPT = (
    "Look at this image and return a JSON object with these exact keys:\n"
    "- is_receipt (boolean): true only if the image is clearly a purchase receipt or bill\n"
    "- is_food_related (boolean): true only if it is a receipt for food or drink — "
    "groceries, restaurants, cafes, bars, food delivery, etc. False for anything else "
    "(clothing, electronics, fuel, utilities, non-receipt images, etc.)\n"
    "- store_name (string): the shop/restaurant/merchant name, or null\n"
    "- date (string): transaction date in YYYY-MM-DD format, or null if not found\n"
    "- items (array of objects with 'name' string and 'price' number)\n"
    "- total_amount (number): the final total charged, or null if not found\n"
    "- category (string): one of groceries, dining, other\n\n"
    "Return ONLY the JSON object, no other text."
)

_INSIGHTS_SYSTEM = (
    "You are a personal finance advisor. Analyse spending data and give clear, "
    "actionable insights in 3-5 sentences."
)


def _strip_fences(text: str) -> str:
    """Remove markdown code fences the model sometimes wraps JSON in."""
    text = text.strip()
    match = re.match(r"^```(?:json)?\s*(.*?)\s*```$", text, re.DOTALL)
    return match.group(1).strip() if match else text


def _client() -> OpenAI:
    return OpenAI(api_key=OPENAI_API_KEY)


def extract_receipt(image_base64: str, media_type: str) -> tuple[dict, str]:
    """
    Send a receipt image to GPT-4o and return the parsed receipt dict.

    Args:
        image_base64: Base64-encoded file content.
        media_type:   MIME type of the file (e.g. "image/jpeg", "application/pdf").

    Returns:
        Tuple of (parsed receipt dict, raw JSON string from the model).

    Note:
        PDFs are not natively supported by the OpenAI vision API.
        They are sent as a data-URI and the model will do its best,
        but for reliable PDF extraction consider converting to an image first.
    """
    data_uri = f"data:{media_type};base64,{image_base64}"

    response = _client().chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": _EXTRACTION_SYSTEM},
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": data_uri, "detail": "high"},
                    },
                    {"type": "text", "text": _EXTRACTION_PROMPT},
                ],
            },
        ],
        max_tokens=1024,
    )

    raw_text = response.choices[0].message.content or "{}"
    clean = _strip_fences(raw_text)

    try:
        return json.loads(clean), clean
    except json.JSONDecodeError:
        return {}, clean


def generate_insights(receipts: list[dict]) -> str:
    """
    Ask GPT-4o to summarise spending patterns across all receipts.

    Args:
        receipts: List of receipt dicts from the database.

    Returns:
        Plain-text insights string.
    """
    response = _client().chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": _INSIGHTS_SYSTEM},
            {
                "role": "user",
                "content": (
                    f"Here is my spending data from {len(receipts)} receipts:\n\n"
                    f"{json.dumps(receipts, indent=2)}\n\n"
                    "Provide: 1) a brief spending summary, 2) top spending categories, "
                    "3) one specific saving tip."
                ),
            },
        ],
        max_tokens=1024,
    )

    return response.choices[0].message.content or "Unable to generate insights."
