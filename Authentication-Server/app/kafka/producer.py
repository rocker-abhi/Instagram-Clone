import logging
from app.exceptions.infrastructure_exception import InfrastructureException
from app.kafka.kafka_client import kafka_client

logger = logging.getLogger(__name__)


class KafkaProducer:

    def __init__(self):
        self.client = kafka_client

    def publish(self, topic: str, message: dict, key: bytes = None):
        """Publish a single message to a Kafka topic."""
        try:
            future = self.client.producer.send(topic, value=message, key=key)
            # Wait for metadata synchronously to ensure it published
            metadata = future.get(timeout=10)
            logger.info(
                "Published message to %s [partition=%d, offset=%d]",
                metadata.topic,
                metadata.partition,
                metadata.offset,
            )
            return metadata
        except Exception as e:
            raise InfrastructureException(service="Kafka") from e

    def flush(self):
        """Flush any pending messages."""
        try:
            if self.client._producer is not None:
                self.client.producer.flush()
                logger.info("Kafka producer flushed successfully.")
        except Exception as e:
            raise InfrastructureException(service="Kafka") from e