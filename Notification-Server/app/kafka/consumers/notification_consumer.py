from app.kafka.consumer import BaseConsumer


class NotificationConsumer(BaseConsumer):

    def __init__(self, consumer, registry):
        super().__init__(
            consumer=consumer,
            registry=registry
        )