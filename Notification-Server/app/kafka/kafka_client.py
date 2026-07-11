import json
import logging
from kafka import KafkaProducer, KafkaConsumer as PyKafkaConsumer

from app.core.config import settings
from app.kafka.deserialzer import EventDeserializer

logger = logging.getLogger(__name__)


class KafkaClient:

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if hasattr(self, "_producer"):
            return
        self._producer = None

    def start_producer(self):
        """Initialize the Kafka producer."""
        if self._producer is not None:
            return
        try:
            self._producer = KafkaProducer(
                bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
                value_serializer=lambda value: json.dumps(value).encode("utf-8"),
                batch_size=settings.KAFKA_BATCH_SIZE,
                linger_ms=settings.KAFKA_LINGER_MS,
                acks=settings.KAFKA_ACKS,
                retries=settings.KAFKA_RETRIES,
                security_protocol=settings.KAFKA_SECURITY_PROTOCOL,
                sasl_mechanism=settings.KAFKA_SASL_MECHANISM,
                sasl_plain_username=settings.KAFKA_SASL_PLAIN_USERNAME,
                sasl_plain_password=settings.KAFKA_SASL_PLAIN_PASSWORD,
            )
            logger.info("Kafka Producer started successfully.")
        except Exception as e:
            logger.error("Failed to start Kafka Producer: %s", str(e))
            raise e

    @property
    def producer(self) -> KafkaProducer:
        if self._producer is None:
            self.start_producer()
        return self._producer

    def stop_producer(self):
        """Flush and close the Kafka producer."""
        if self._producer is not None:
            try:
                self._producer.flush()
                self._producer.close()
                logger.info("Kafka Producer stopped successfully.")
            except Exception as e:
                logger.error("Error stopping Kafka Producer: %s", str(e))
            finally:
                self._producer = None

    def verify_connection(self):
        """Verify connection to Kafka bootstrap servers."""
        try:
            prod = self.producer
            if not prod.bootstrap_connected():
                raise Exception("Not connected to bootstrap servers")
            logger.info("Kafka connection verified successfully.")
        except Exception as e:
            logger.critical("Kafka connection check failed: %s", str(e))
            raise e

    def create_consumer(self, topic, group_id) -> PyKafkaConsumer:
        """Create and return a raw KafkaConsumer instance."""
        topics = [topic] if isinstance(topic, str) else list(topic)
        try:
            return PyKafkaConsumer(
                *topics,
                bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
                group_id=group_id,
                value_deserializer=lambda v: EventDeserializer.deserialize(v),
                auto_offset_reset="earliest",
                security_protocol=settings.KAFKA_SECURITY_PROTOCOL,
                sasl_mechanism=settings.KAFKA_SASL_MECHANISM,
                sasl_plain_username=settings.KAFKA_SASL_PLAIN_USERNAME,
                sasl_plain_password=settings.KAFKA_SASL_PLAIN_PASSWORD,
            )
        except Exception as error:
            logger.error("Error creating Kafka Consumer: %s", str(error))
            raise error


kafka_client = KafkaClient()
