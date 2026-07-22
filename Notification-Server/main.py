import logging
import asyncio
import subprocess
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.routes.notification_route import router as notification_router
import uvicorn

from app.core.database import db
from app.kafka.registery import EventRegistry
from app.kafka.topics import KafakTopics
from app.kafka.handler.user_registered_handler import UserRegisteredHandler
from app.kafka.handler.email_verified_handler import EmailVerifiedHandler
from app.kafka.handler.password_reset_completed_handler import PasswordResetCompletedHandler
from app.kafka.handler.password_reset_requested_handler import PasswordResetRequestedHandler
from app.kafka.consumer_manager import ConsumerManager
from app.kafka.consumers.notification_consumer import NotificationConsumer
from app.kafka.kafka_client import kafka_client
from app.core.logger import setup_logger
from app.core.email import email_service

from app.kafka.handler.post_notification_handlers import (
    PostLikedNotificationHandler,
    PostCommentedNotificationHandler,
    CommentRepliedNotificationHandler
)

setup_logger()
logger = logging.getLogger(__name__)


registry = EventRegistry()
registry.register(
    KafakTopics.USER_REGISTERED, UserRegisteredHandler(email_service)
)
registry.register(
    KafakTopics.EMAIL_VERIFIED, EmailVerifiedHandler(email_service)
)
registry.register(
    KafakTopics.USER_PASSWORD_RESET_COMPLETED, PasswordResetCompletedHandler(email_service)
)
registry.register(
    KafakTopics.USER_PASSWORD_RESET_REQUESTED, PasswordResetRequestedHandler(email_service)
)
registry.register(
    KafakTopics.POST_LIKED, PostLikedNotificationHandler()
)
registry.register(
    KafakTopics.POST_COMMENTED, PostCommentedNotificationHandler()
)
registry.register(
    KafakTopics.COMMENT_REPLIED, CommentRepliedNotificationHandler()
)

manager = ConsumerManager()
consumer = kafka_client.create_consumer(
    topic=[
        KafakTopics.USER_REGISTERED, 
        KafakTopics.EMAIL_VERIFIED, 
        KafakTopics.USER_PASSWORD_RESET_COMPLETED,
        KafakTopics.USER_PASSWORD_RESET_REQUESTED,
        KafakTopics.POST_LIKED,
        KafakTopics.POST_COMMENTED,
        KafakTopics.COMMENT_REPLIED
    ],
    group_id="notification-service"
)
manager.register(NotificationConsumer(consumer, registry))


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Capture the running main event loop for handler threads to reuse
    from app.kafka.handler.post_notification_handlers import BaseNotificationHandler
    BaseNotificationHandler.main_loop = asyncio.get_running_loop()

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

    logger.info("Verifying Kafka connection...")
    kafka_client.verify_connection()
    logger.info("Starting Notification Service background consumers...")
    manager.start()
    email_service.connect()
    yield
    logger.info("Shutting down Notification Service background consumers...")
    manager.stop()
    email_service.disconnect()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(notification_router)
app.include_router(notification_router, prefix="/notifications")


@app.get("/health")
def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=5001, reload=True)
