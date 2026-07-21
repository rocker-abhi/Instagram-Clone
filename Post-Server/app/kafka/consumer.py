import logging
from abc import ABC

logger = logging.getLogger(__name__)


class BaseConsumer(ABC):

    def __init__(self, consumer, registry):
        self.consumer = consumer
        self.registry = registry
        self.running = False

    def start(self):
        self.running = True
        logger.info("Consumer started")
        try:
            self.consume()
        finally:
            self.stop()

    def stop(self):
        self.running = False
        self.consumer.close()
        logger.info("Consumer stopped")

    def consume(self):
        try:
            for message in self.consumer:
                if not self.running:
                    break
                event = message.value
                logger.info(
                    "Received event %s",
                    event.get("event_type")
                )
                self.dispatch(event)
        except AssertionError:
            logger.info("Kafka consumer was closed.")
        except Exception as e:
            logger.error("Error in consumer loop: %s", str(e))

    def dispatch(self, event):
        event_type = event.get("event_type")
        handler = self.registry.get(event_type)
        if handler is None:
            logger.warning(
                "No handler found for %s",
                event_type
            )
            return
        try:
            handler.handle(event)
        except Exception as e:
            logger.error("Error handling event %s: %s", event_type, str(e))
