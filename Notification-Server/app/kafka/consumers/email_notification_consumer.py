from app.kafka.consumer import BaseConsumer


class EmailNotificationConsumer(BaseConsumer):

    def __init__(self, consumer, registry):
        super().__init__(
            consumer=consumer,
            registry=registry
        )
