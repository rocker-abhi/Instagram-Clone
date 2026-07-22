import logging
import subprocess
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
import uvicorn

from app.core.config import settings
from app.core.database import db
from app.core.redis import redis_client
from app.routes import api_router

from app.core.global_exception_handler import register_exception_handlers
from app.core.request_handler import register_middleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Chat Service...")

    # Verify Database Connection
    try:
        async with db.engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("Database connection verified successfully.")
    except Exception as e:
        logger.critical("Database connection failed: %s", str(e))
        raise SystemExit("Fatal: Database is unreachable.") from e

    # Auto-run Database Migrations (Alembic)
    try:
        logger.info("Checking database schema and running migrations...")
        result = subprocess.run(
            [sys.executable, "-m", "alembic", "upgrade", "head"],
            capture_output=True,
            text=True
        )
        if result.returncode != 0:
            logger.error("Alembic auto-migration failed: %s", result.stderr)
            raise RuntimeError(f"Alembic auto-migration failed: {result.stderr}")
        else:
            logger.info("Alembic schema verification and migration successful.")
    except Exception as e:
        logger.critical("Database auto-migration failed: %s", str(e))
        raise SystemExit("Fatal: Database migrations failed to apply.") from e

    # Verify Redis Connection
    try:
        await redis_client.ping()
        logger.info("Redis connection verified successfully.")
    except Exception as e:
        logger.critical("Redis connection failed: %s", str(e))
        raise SystemExit("Fatal: Redis is unreachable.") from e

    yield
    logger.info("Shutting down Chat Service...")
    await db.close()
    await redis_client.close()
    logger.info("Redis connection closed.")


app = FastAPI(
    title=settings.APP_NAME,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_middleware(app)
register_exception_handlers(app)

app.include_router(api_router)


@app.get("/")
def read_root():
    return {"message": "Welcome to Instagram Chat Service API"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
