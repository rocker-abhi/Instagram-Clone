import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.notification_route import router as notification_router
import uvicorn

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

manager = ConsumerManager()
consumer = kafka_client.create_consumer(
    topic=[
        KafakTopics.USER_REGISTERED, 
        KafakTopics.EMAIL_VERIFIED, 
        KafakTopics.USER_PASSWORD_RESET_COMPLETED,
        KafakTopics.USER_PASSWORD_RESET_REQUESTED
    ],
    group_id="notification-service"
)
manager.register(NotificationConsumer(consumer, registry))


@asynccontextmanager
async def lifespan(app: FastAPI):
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


@app.get("/health")
def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=5001, reload=True)
