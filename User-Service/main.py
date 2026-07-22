import logging
import asyncio
import subprocess
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from sqlalchemy import text
import uvicorn

from app.core.config import settings
from app.core.global_exception_handler import register_exception_handlers
from app.core.logger import setup_logger
from app.core.request_handler import register_middleware
from app.core.database import db
from app.core.storage import StorageFactory
from app.kafka.kafka_client import kafka_client
from app.grpc.server.server import start_grpc, stop_grpc
from app.routes import api_router
from fastapi.middleware.cors import CORSMiddleware

# Initialize logging configuration at startup
setup_logger()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Application is starting...")

    # Verify Database Connection
    try:
        async with db.engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("Database connection verified successfully.")
    except Exception as e:
        logger.critical("Database connection failed: %s", str(e))
        raise SystemExit("Fatal: Database is unreachable.") from e

    # Verify MinIO connection
    try:
        storage = StorageFactory.get_storage()
        # Verify connectivity by checking if we can list buckets (run blocking call in thread)
        await asyncio.to_thread(storage._client.list_buckets)
        logger.info("MinIO storage connection verified successfully.")
    except Exception as e:
        logger.critical("MinIO storage connection failed: %s", str(e))
        raise SystemExit("Fatal: MinIO storage is unreachable.") from e

    # Verify Kafka connection
    try:
        kafka_client.verify_connection()
    except Exception as e:
        logger.critical("Kafka connection check failed: %s", str(e))
        raise SystemExit("Fatal: Kafka is unreachable.") from e

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
        raise SystemExit("Fatal: Database migration failed.") from e

    # Start async gRPC server
    try:
        await start_grpc()
    except Exception as e:
        logger.critical("Failed to start gRPC server: %s", str(e))
        raise SystemExit("Fatal: gRPC server failed to start.") from e

    yield

    logger.info("Application is shutting down...")
    await stop_grpc()

    # Stop Kafka Producer
    try:
        kafka_client.stop_producer()
    except Exception as e:
        logger.error("Error stopping Kafka Producer: %s", str(e))

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
