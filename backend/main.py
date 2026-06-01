from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import PORT
from database import init_db
from routes.insights import router as insights_router
from routes.receipts import router as receipts_router

app = FastAPI(title="Receipts to Riches API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialise the database on startup
init_db()

# Mount routers
app.include_router(receipts_router)
app.include_router(insights_router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
