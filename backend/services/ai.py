"""All interactions with the OpenAI API live here."""

import json
import re

from openai import OpenAI

from config import OPENAI_API_KEY

_EXTRACTION_SYSTEM = (
    "You are a receipt parser and food analyst. Extract structured data from receipt "
    "images and return valid JSON only — no markdown, no explanation, just the JSON object."
)

_EXTRACTION_PROMPT = (
    "Look at this image and return a JSON object with these exact keys:\n"
    "- is_receipt (boolean): true only if the image is clearly a purchase receipt or bill\n"
    "- is_food_related (boolean): true only if it is a receipt for food or drink — "
    "groceries, restaurants, cafes, bars, food delivery, etc. False for anything else "
    "(clothing, electronics, fuel, utilities, non-receipt images, etc.)\n"
    "- store_name (string): the shop/restaurant/merchant name, or null\n"
    "- date (string): transaction date in YYYY-MM-DD format, or null if not found\n"
    "- time (string): transaction time in 24-hour HH:MM format if printed on the receipt, "
    "or null if not found\n"
    "- total_amount (number): the final total charged, or null if not found\n"
    "- category (string): one of groceries, dining, other\n"
    "- cuisine (string): the cuisine or food style. One of: Italian, Indian, Chinese, "
    "American, Mexican, Japanese, Thai, Cafe, Fast Food, Bakery, Grocery, Other\n"
    "- meal_type (string): best guess of the meal. One of: breakfast, lunch, dinner, midnight\n"
    "- items (array of objects). Each item object MUST have these keys:\n"
    "    - name (string)\n"
    "    - price (number)\n"
    "    - kind (string): 'food' or 'drink'\n"
    "    - alcoholic (boolean): true only for alcoholic drinks (beer, wine, cocktails, spirits)\n"
    "    - health_labels (array of strings): zero or more estimated labels describing the item, "
    "chosen ONLY from: high-calorie, high-sugar, high-sodium, high-fat, fried, processed, "
    "healthy, high-protein. Estimate from the item name; use [] if unsure.\n"
    "    - taste_tags (array of strings): zero or more flavour tags chosen ONLY from: "
    "sweet, savory, spicy, sour, umami, salty.\n\n"
    "Return ONLY the JSON object, no other text."
)

_INSIGHTS_SYSTEM = (
    "You are a personal finance advisor and food analyst. You analyse a person's food "
    "spending and return concise, actionable, friendly guidance as valid JSON only."
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
        max_tokens=1500,
    )

    raw_text = response.choices[0].message.content or "{}"
    clean = _strip_fences(raw_text)

    try:
        return json.loads(clean), clean
    except json.JSONDecodeError:
        return {}, clean


_INSIGHTS_PROMPT = (
    "Here is my food spending data from {n} receipts:\n\n{data}\n\n"
    "Return a JSON object with these exact keys:\n"
    "- narrative (string): a friendly 2-3 sentence summary of my food spending habits.\n"
    "- tips (array of 2-3 objects), each with: title (string, short), "
    "detail (string, one sentence), monthly_saving (number, estimated $/month I could save).\n"
    "- alternatives (array of 2-3 objects, concrete cheaper swaps), each with: "
    "instead_of (string), swap_to (string), saving (number, estimated $ saved per occurrence).\n"
    "- recommendations (array of exactly 3 objects, dishes I'd likely enjoy based on the "
    "cuisines and taste tags in my data), each with: dish (string), cuisine (string), "
    "reason (string, one short sentence).\n\n"
    "Return ONLY the JSON object, no other text."
)


def generate_insights(receipts: list[dict]) -> dict:
    """
    Ask GPT-4o for structured spending insights across all receipts.

    Args:
        receipts: List of enriched receipt dicts from the database.

    Returns:
        Dict with keys: narrative (str), tips (list), alternatives (list),
        recommendations (list). Falls back to safe empty values on parse error.
    """
    response = _client().chat.completions.create(
        model="gpt-4o",
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": _INSIGHTS_SYSTEM},
            {
                "role": "user",
                "content": _INSIGHTS_PROMPT.format(
                    n=len(receipts), data=json.dumps(receipts, indent=2)
                ),
            },
        ],
        max_tokens=1200,
    )

    raw = response.choices[0].message.content or "{}"
    try:
        parsed = json.loads(_strip_fences(raw))
    except json.JSONDecodeError:
        parsed = {}

    return {
        "narrative": parsed.get("narrative") or "Unable to generate insights.",
        "tips": parsed.get("tips") or [],
        "alternatives": parsed.get("alternatives") or [],
        "recommendations": parsed.get("recommendations") or [],
    }
