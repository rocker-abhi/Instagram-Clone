import threading


class ConsumerManager:

    def __init__(self):
        self.consumers = []
        self.threads = []

    def register(self, consumer):
        self.consumers.append(consumer)

    def start(self):
        for consumer in self.consumers:
            thread = threading.Thread(
                target=consumer.start,
                daemon=True
            )
            thread.start()
            self.threads.append(thread)

    def stop(self):
        for consumer in self.consumers:
            consumer.stop()
