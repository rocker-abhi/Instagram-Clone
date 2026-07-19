import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from sqlalchemy import text
import uvicorn
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Post Service...")
    # Verify Database Connection
    try:
        async with db.engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("Database connection verified successfully.")
    except Exception as e:
        logger.critical("Database connection failed: %s", str(e))
        raise SystemExit("Fatal: Database is unreachable.") from e

    yield
    logger.info("Shutting down Post Service...")
    await db.close()
    logger.info("Database connection closed.")


app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "Welcome to Instagram Post Service API"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
