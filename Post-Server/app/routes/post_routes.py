import uuid
import logging
from fastapi import APIRouter, Depends, Query, status

from app.routes.dependencies import get_current_user_id, get_post_service
from app.service.post_service import PostService
from app.schemas.common_schema import APIResponse
from app.schemas.post_schema import (
    PresignedUploadUrlRequest,
    PresignedUploadUrlResponse,
    PostCreateRequest,
    PostResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/posts", tags=["Posts"])


@router.post(
    "/upload-urls",
    response_model=APIResponse[PresignedUploadUrlResponse],
    summary="Request pre-signed upload URLs for uploading multiple images directly to MinIO"
)
async def request_presigned_upload_urls(
    request: PresignedUploadUrlRequest,
    user_id: uuid.UUID = Depends(get_current_user_id),
    post_service: PostService = Depends(get_post_service),
):
    """
    Step 1: Request pre-signed PUT upload URLs.
    The client sends file names, content types, and sizes, and receives presigned URLs to upload files directly to MinIO.
    """
    result = await post_service.generate_presigned_upload_urls(user_id=user_id, request=request)
    return APIResponse(
        success=True,
        message="Pre-signed upload URLs generated successfully.",
        data=result,
    )


@router.post(
    "",
    response_model=APIResponse[PostResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a new post using uploaded MinIO object keys"
)
async def create_post(
    request: PostCreateRequest,
    user_id: uuid.UUID = Depends(get_current_user_id),
    post_service: PostService = Depends(get_post_service),
):
    """
    Step 2: Save post and post_media records after client finishes uploading files to MinIO.
    Returns the created post with pre-signed GET URLs for image rendering.
    """
    post_response = await post_service.create_post(user_id=user_id, request=request)
    return APIResponse(
        success=True,
        message="Post created successfully.",
        data=post_response,
    )


@router.get(
    "",
    response_model=APIResponse[list[PostResponse]],
    summary="Get public feed posts"
)
async def list_feed_posts(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    post_service: PostService = Depends(get_post_service),
):
    """
    Fetch public posts for feed display. Every media object_key is resolved into a pre-signed GET URL.
    """
    feed = await post_service.list_feed_posts(limit=limit, offset=offset)
    return APIResponse(
        success=True,
        message="Feed posts retrieved successfully.",
        data=feed,
    )


@router.get(
    "/user/{user_id}",
    response_model=APIResponse[list[PostResponse]],
    summary="Get posts created by a specific user"
)
async def list_user_posts(
    user_id: uuid.UUID,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    post_service: PostService = Depends(get_post_service),
):
    """
    Fetch posts created by a specific user profile.
    """
    posts = await post_service.list_user_posts(user_id=user_id, limit=limit, offset=offset)
    return APIResponse(
        success=True,
        message=f"Retrieved posts for user {user_id}.",
        data=posts,
    )


@router.get(
    "/{post_id}",
    response_model=APIResponse[PostResponse],
    summary="Get post by ID"
)
async def get_post_by_id(
    post_id: uuid.UUID,
    post_service: PostService = Depends(get_post_service),
):
    """
    Fetch details of a single post with presigned GET URLs for media files.
    """
    post = await post_service.get_post_by_id(post_id)
    return APIResponse(
        success=True,
        message="Post details retrieved successfully.",
        data=post,
    )


@router.delete(
    "/{post_id}",
    response_model=APIResponse[dict],
    summary="Delete post by ID"
)
async def delete_post(
    post_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    post_service: PostService = Depends(get_post_service),
):
    """
    Soft delete a post owned by the requesting user.
    """
    await post_service.delete_post(post_id=post_id, user_id=user_id)
    return APIResponse(
        success=True,
        message="Post deleted successfully.",
        data={"post_id": str(post_id)},
    )
