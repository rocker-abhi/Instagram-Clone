import uuid
from datetime import datetime
from pydantic import BaseModel, Field
from app.enums.post_visibility import PostVisibility
from app.enums.media_type import MediaType


# ---------------------------------------------------------
# Presigned Upload URL Schemas
# ---------------------------------------------------------
class FileUploadItem(BaseModel):
    file_name: str = Field(..., description="Original filename of the file")
    content_type: str = Field(..., description="MIME content type (e.g. image/jpeg, image/png)")
    file_size: int = Field(..., gt=0, description="Size of file in bytes")


class PresignedUploadUrlRequest(BaseModel):
    files: list[FileUploadItem] = Field(..., min_items=1, max_items=10, description="List of files to upload (max 10)")


class PresignedUrlItem(BaseModel):
    file_name: str
    object_key: str
    upload_url: str
    display_order: int


class PresignedUploadUrlResponse(BaseModel):
    post_id: uuid.UUID
    upload_urls: list[PresignedUrlItem]


# ---------------------------------------------------------
# Post Creation Schemas
# ---------------------------------------------------------
class PostMediaInput(BaseModel):
    object_key: str = Field(..., description="MinIO object key generated during presigned upload")
    mime_type: str = Field("image/jpeg", description="MIME content type")
    file_size: int = Field(..., gt=0, description="Size of file in bytes")
    display_order: int = Field(0, ge=0, description="Carousel display order index")
    media_type: MediaType = Field(MediaType.IMAGE, description="IMAGE or VIDEO")
    thumbnail_key: str | None = None
    width: int | None = None
    height: int | None = None
    duration: int | None = None


class PostCreateRequest(BaseModel):
    post_id: uuid.UUID = Field(..., description="Pre-generated UUID received from /posts/upload-urls endpoint")
    caption: str | None = Field(None, max_length=2200, description="Post caption text")
    location: str | None = Field(None, max_length=255, description="Tagged location name")
    visibility: PostVisibility = Field(PostVisibility.PUBLIC, description="Post privacy visibility")
    comments_enabled: bool = Field(True, description="Allow comments toggle")
    media: list[PostMediaInput] = Field(..., min_items=1, max_items=10, description="Uploaded media files")


# ---------------------------------------------------------
# Post Response Schemas
# ---------------------------------------------------------
class PostMediaResponse(BaseModel):
    id: uuid.UUID
    media_type: MediaType
    object_key: str
    thumbnail_key: str | None = None
    url: str = Field(..., description="Pre-signed GET URL valid for direct client rendering")
    display_order: int
    mime_type: str
    file_size: int
    width: int | None = None
    height: int | None = None
    duration: int | None = None
    created_at: datetime


class PostResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    caption: str | None = None
    location: str | None = None
    visibility: PostVisibility
    comments_enabled: bool
    media_count: int
    is_deleted: bool
    created_at: datetime
    updated_at: datetime
    media: list[PostMediaResponse]
