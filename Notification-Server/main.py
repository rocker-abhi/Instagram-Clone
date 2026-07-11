import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
import uvicorn

from app.kafka.registery import EventRegistry
from app.kafka.topics import KafakTopics
from app.kafka.handler.user_registered_handler import UserRegisteredHandler
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

manager = ConsumerManager()
consumer = kafka_client.create_consumer(
    topic=KafakTopics.USER_REGISTERED,
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


@app.get("/health")
def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=5001, reload=True)
