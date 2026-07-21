import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from sqlalchemy import text
import uvicorn
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import db
from app.core.storage import StorageFactory
from app.storage.buckets import POST_MEDIA_BUCKET
from app.core.global_exception_handler import register_exception_handlers
from app.core.request_handler import register_middleware
from app.routes import api_router
from app.core.kafka import kafka_client

from app.kafka.registery import EventRegistry
from app.kafka.topics import KafkaTopics
from app.kafka.handlers import PostLikedHandler, PostCommentedHandler, CommentRepliedHandler
from app.kafka.consumer_manager import ConsumerManager
from app.kafka.consumers import PostEventConsumer

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

    # Verify MinIO Storage Connection & Ensure Bucket Exists
    try:
        storage = StorageFactory.get_storage()
        # Verify connectivity by checking bucket existence or listing buckets
        await asyncio.to_thread(storage._client.list_buckets)
        await storage.ensure_bucket(POST_MEDIA_BUCKET)
        logger.info("MinIO storage connection verified successfully. Bucket '%s' ready.", POST_MEDIA_BUCKET)
    except Exception as e:
        logger.critical("MinIO storage connection failed: %s", str(e))
        raise SystemExit("Fatal: MinIO storage is unreachable.") from e

    # Verify Kafka Connection
    try:
        kafka_client.verify_connection()
        logger.info("Kafka connection verified successfully.")
    except Exception as e:
        logger.critical("Kafka connection failed: %s", str(e))
        raise SystemExit("Fatal: Kafka is unreachable.") from e

    # Initialize and start Kafka consumers
    try:
        

        global registry, manager
        registry = EventRegistry()
        registry.register(KafkaTopics.POST_LIKE, PostLikedHandler())
        registry.register(KafkaTopics.POST_COMMENT, PostCommentedHandler())
        registry.register(KafkaTopics.COMMENT_REPLY, CommentRepliedHandler())

        manager = ConsumerManager()
        consumer = kafka_client.create_consumer(
            topic=[
                KafkaTopics.POST_LIKE,
                KafkaTopics.POST_COMMENT,
                KafkaTopics.COMMENT_REPLY
            ],
            group_id="post-service"
        )
        manager.register(PostEventConsumer(consumer, registry))
        manager.start()
        logger.info("Kafka consumers started successfully.")
    except Exception as e:
        logger.error("Failed to start Kafka consumers: %s", str(e))

    yield
    logger.info("Shutting down Post Service...")
    try:
        if 'manager' in globals():
            manager.stop()
            logger.info("Kafka consumers stopped successfully.")
    except Exception as e:
        logger.error("Failed to stop Kafka consumers: %s", str(e))
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

# Register request middleware, exception handlers, and API router
register_middleware(app)
register_exception_handlers(app)
app.include_router(api_router)


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
