import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from sqlalchemy import text
import uvicorn

from app.core.config import settings
from app.core.global_exception_handler import register_exception_handlers
from app.core.logger import setup_logger
from app.core.request_handler import register_middleware
from app.core.database import db
from app.core.redis import redis_client
from app.kafka.kafka_client import kafka_client

# Initialize logging configuration at startup
setup_logger()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Application is starting...")

    # 1. Verify Database Connection
    try:
        async with db.engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("Database connection verified successfully.")
    except Exception as e:
        logger.critical("Database connection failed: %s", str(e))
        raise SystemExit("Fatal: Database is unreachable.") from e

    # 2. Verify Redis Connection
    try:
        await redis_client.ping()
        logger.info("Redis connection verified successfully.")
    except Exception as e:
        logger.critical("Redis connection failed: %s", str(e))
        raise SystemExit("Fatal: Redis is unreachable.") from e

    # 3. Verify Kafka Connection
    try:
        kafka_client.verify_connection()
    except Exception as e:
        logger.critical("Kafka connection failed: %s", str(e))
        raise SystemExit("Fatal: Kafka is unreachable.") from e

    yield

    logger.info("Application is shutting down...")
    await db.close()
    logger.info("Database connection closed.")
    await redis_client.close()
    logger.info("Redis connection closed.")
    kafka_client.stop_producer()
    logger.info("Kafka connection closed.")


from app.routes import api_router

from fastapi.middleware.cors import CORSMiddleware

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

# Register request middleware and global exception handlers
register_middleware(app)
register_exception_handlers(app)
app.include_router(api_router)


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
