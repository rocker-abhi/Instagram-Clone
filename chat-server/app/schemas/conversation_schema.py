from pydantic import BaseModel, Field, AliasChoices
from uuid import UUID
from datetime import datetime
from typing import Optional


class ConversationCreateRequest(BaseModel):
    user_two_id: UUID = Field(validation_alias=AliasChoices("user_two_id", "partner_id"))



class ConversationResponse(BaseModel):
    id: UUID
    user_one_id: UUID
    user_two_id: UUID
    created_at: datetime
    updated_at: datetime

    # Enriched via gRPC — resolved by chat-server at list time
    partner_id: Optional[UUID] = None
    partner_username: Optional[str] = None
    partner_display_name: Optional[str] = None
    partner_profile_picture: Optional[str] = None
    is_partner_online: bool = False

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    sender_id: UUID
    message_type: str
    content: str
    reply_to_message_id: UUID | None = None
    is_edited: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
