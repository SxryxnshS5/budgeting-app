---

## Running the backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# Mac/Linux
source .venv/bin/activate

pip install -r requirements.txt
python main.py
```

Backend is now live at **`http://localhost:8000`**

---

## API endpoints

| Method | URL                              | Body / Params                                                    | Returns                              |
| ------ | -------------------------------- | ---------------------------------------------------------------- | ------------------------------------ |
| `POST` | `http://localhost:8000/receipts` | `multipart/form-data` — field name `receipt`, value = image file | Extracted receipt JSON               |
| `GET`  | `http://localhost:8000/receipts` | —                                                                | Array of all saved receipts          |
| `GET`  | `http://localhost:8000/insights` | —                                                                | AI spending insights + receipt count |

### POST `/receipts` — response shape

```json
{
  "id": 1,
  "filename": "1748000000000-receipt.jpg",
  "store_name": "GREEN FIELD",
  "date": "2016-05-26",
  "total_amount": 56.58,
  "category": "dining",
  "items": [
    { "name": "Coffee", "price": 3.0 },
    { "name": "Lunch", "price": 45.9 },
    { "name": "Coke", "price": 3.0 }
  ]
}
```

### GET `/receipts` — response shape

```json
[
  {
    "id": 1,
    "filename": "1748000000000-receipt.jpg",
    "uploaded_at": 1748000000.0,
    "store_name": "GREEN FIELD",
    "date": "2016-05-26",
    "total_amount": 56.58,
    "category": "dining",
    "items": [...]
  }
]
```

### GET `/insights` — response shape

```json
{
  "insights": "You spent $56.58 this period, mostly on dining...",
  "receipt_count": 3
}
```

---

## Running the frontend

The frontend already has `VITE_API_URL` wired in `.env.example` and `src/services/api.js` reads it automatically.

```bash
cd frontend

# Copy the env file (already has the right URL)
cp .env.example .env

npm install
npm run dev
```

Frontend runs at **`http://localhost:5173`** and will call the backend at `http://localhost:8000`.

---

## Checklist before testing

- [ ] Backend `.env` has `OPENAI_API_KEY` set
- [ ] Backend venv is activated and `python main.py` is running
- [ ] Frontend `.env` has `VITE_API_URL=http://localhost:8000`
- [ ] Both terminals are open at the same time

Interactive API docs (auto-generated): **`http://localhost:8000/docs`**
