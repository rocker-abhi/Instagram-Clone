from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class ConversationCreateRequest(BaseModel):
    user_two_id: UUID


class ConversationResponse(BaseModel):
    id: UUID
    user_one_id: UUID
    user_two_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    sender_id: UUID
    message_type: str
    content: str
    reply_to_message_id: UUID | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

