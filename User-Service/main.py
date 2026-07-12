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

    # Start async gRPC server
    try:
        await start_grpc()
    except Exception as e:
        logger.critical("Failed to start gRPC server: %s", str(e))
        raise SystemExit("Fatal: gRPC server failed to start.") from e

    yield

    logger.info("Application is shutting down...")
    await stop_grpc()

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
