import json
import logging

logger = logging.getLogger(__name__)


class EventDeserializer:

    @staticmethod
    def deserialize(data: bytes) -> dict:
        if not data:
            return {}
        try:
            return json.loads(data.decode("utf-8"))
        except Exception as e:
            logger.error("Failed to deserialize message: %s", str(e))
            return {}
