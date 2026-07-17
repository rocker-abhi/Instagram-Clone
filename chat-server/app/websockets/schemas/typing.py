from pydantic import BaseModel
from uuid import UUID


class TypingSchema(BaseModel):
    conversation_id: UUID
