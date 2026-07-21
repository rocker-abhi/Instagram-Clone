from __future__ import annotations

import uuid
from datetime import datetime
from pydantic import BaseModel, Field


class StoryUploadUrlRequest(BaseModel):
    file_name: str
    content_type: str
    file_size: int


class StoryUploadUrlResponse(BaseModel):
    story_id: uuid.UUID
    object_key: str
    upload_url: str


class StoryCreateRequest(BaseModel):
    object_key: str = Field(..., description="MinIO storage key in temp-media bucket")
    caption: str | None = Field(None, description="Optional caption for story")
    mime_type: str = Field("image/jpeg", description="MIME type of the story asset (must be an image)")


class StoryResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    username: str
    user_avatar: str | None = None
    media_url: str = Field(..., description="Presigned GET URL for story image")
    caption: str | None = None
    mime_type: str
    created_at: datetime
    expires_at: datetime


class UserStoryGroup(BaseModel):
    user_id: uuid.UUID
    username: str
    user_avatar: str | None = None
    is_user: bool = False
    stories: list[StoryResponse] = []
