from pydantic import BaseModel
from typing import Any


class WebSocketEventSchema(BaseModel):
    event_type: str
    data: dict[str, Any]
