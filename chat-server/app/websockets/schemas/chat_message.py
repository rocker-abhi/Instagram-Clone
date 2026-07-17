from pydantic import BaseModel
from uuid import UUID


class ChatMessageSchema(BaseModel):
    conversation_id: UUID
    content: str
    message_type: str = "TEXT"
    reply_to_message_id: UUID | None = None
