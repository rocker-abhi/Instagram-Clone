import json
from dataclasses import asdict


class EventSerializer:

    @staticmethod
    def serialize(event) -> bytes:

        return json.dumps(
            asdict(event)
        ).encode("utf-8")