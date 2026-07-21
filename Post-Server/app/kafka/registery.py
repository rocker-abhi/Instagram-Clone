class EventRegistry:

    def __init__(self):
        self._handlers = {}

    def register(self, event_type, handler):
        self._handlers[event_type] = handler

    def get(self, event_type):
        return self._handlers.get(event_type)
