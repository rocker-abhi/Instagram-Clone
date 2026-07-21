import json
from dataclasses import asdict


class EventSerializer:

    @staticmethod
    def serialize(event) -> bytes:
        if hasattr(event, "dict"):
            return json.dumps(event.dict()).encode("utf-8")
        elif hasattr(event, "__dict__"):
            return json.dumps(event.__dict__).encode("utf-8")
        try:
            return json.dumps(asdict(event)).encode("utf-8")
        except Exception:
            return json.dumps(event).encode("utf-8")
