import uuid
import logging
from fastapi import APIRouter, Depends, Request, status

from app.routes.dependencies import get_current_user, get_current_user_id, get_story_service
from app.service.story_service import StoryService
from app.schemas.common_schema import APIResponse
from app.schemas.story_schema import (
    StoryUploadUrlRequest,
    StoryUploadUrlResponse,
    StoryCreateRequest,
    StoryResponse,
    UserStoryGroup,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/stories", tags=["Stories"])


@router.post(
    "/upload-url",
    response_model=APIResponse[StoryUploadUrlResponse],
    summary="Request presigned upload URL for Story image"
)
async def request_story_upload_url(
    request: StoryUploadUrlRequest,
    user_id: uuid.UUID = Depends(get_current_user_id),
    story_service: StoryService = Depends(get_story_service),
):
    """
    Request presigned PUT upload URL for story image.
    Strictly validates that content_type starts with image/. Videos are rejected.
    """
    result = await story_service.generate_presigned_upload_url(user_id=user_id, request=request)
    return APIResponse(
        success=True,
        message="Story presigned upload URL generated successfully.",
        data=result,
    )


@router.post(
    "",
    response_model=APIResponse[StoryResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Create a 24-hour image story"
)
async def create_story(
    request: StoryCreateRequest,
    current_user: dict = Depends(get_current_user),
    user_id: uuid.UUID = Depends(get_current_user_id),
    story_service: StoryService = Depends(get_story_service),
):
    """
    Publish a new 24-hour image story.
    Video uploads will be strictly rejected.
    """
    username = current_user.get("username") or "user"
    user_avatar = current_user.get("profile_picture_url")

    story_response = await story_service.create_story(
        user_id=user_id,
        request=request,
        username=username,
        user_avatar=user_avatar,
    )
    return APIResponse(
        success=True,
        message="Story published successfully.",
        data=story_response,
    )


@router.get(
    "/feed",
    response_model=APIResponse[list[UserStoryGroup]],
    summary="Get active 24-hour stories of followed users"
)
async def get_stories_feed(
    req: Request,
    current_user: dict = Depends(get_current_user),
    user_id: uuid.UUID = Depends(get_current_user_id),
    story_service: StoryService = Depends(get_story_service),
):
    """
    Retrieve active, unexpired stories posted by followed users + self.
    """
    auth_header = req.headers.get("Authorization", "")
    token = auth_header.split()[1] if len(auth_header.split()) == 2 else ""

    username = current_user.get("username") or "user"
    user_avatar = current_user.get("profile_picture_url")

    feed = await story_service.get_stories_feed(
        current_user_id=user_id,
        auth_token=token,
        current_username=username,
        current_avatar=user_avatar,
    )
    return APIResponse(
        success=True,
        message="Active stories feed retrieved successfully.",
        data=feed,
    )


@router.delete(
    "/{story_id}",
    response_model=APIResponse[dict],
    summary="Delete story by ID"
)
async def delete_story(
    story_id: uuid.UUID,
    user_id: uuid.UUID = Depends(get_current_user_id),
    story_service: StoryService = Depends(get_story_service),
):
    """
    Delete a story owned by the requesting user.
    """
    await story_service.delete_story(story_id=story_id, user_id=user_id)
    return APIResponse(
        success=True,
        message="Story deleted successfully.",
        data={"story_id": str(story_id)},
    )
