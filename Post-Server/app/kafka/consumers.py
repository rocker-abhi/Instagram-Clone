from app.kafka.consumer import BaseConsumer


class PostEventConsumer(BaseConsumer):
    """
    Consumer class for handling post like, comment, and reply events.
    """
    def __init__(self, consumer, registry):
        super().__init__(consumer=consumer, registry=registry)
