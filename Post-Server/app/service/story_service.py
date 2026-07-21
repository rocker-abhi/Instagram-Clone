import uuid
import asyncio
import httpx
import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.repository.story_repository import StoryRepository
from app.models.story import Story
from app.schemas.story_schema import (
    StoryUploadUrlRequest,
    StoryUploadUrlResponse,
    StoryCreateRequest,
    StoryResponse,
    UserStoryGroup,
)
from app.core.storage import StorageFactory
from app.storage.buckets import TEMP_MEDIA_BUCKET
from app.exceptions.business_exception import PostValidationException, PostNotFoundException
from app.core.config import settings

logger = logging.getLogger(__name__)


class StoryService:
    """
    Business service for managing 24-hour ephemeral Stories.
    """

    def __init__(self, session: AsyncSession):
        self.repository = StoryRepository(session)
        self.storage = StorageFactory.get_storage()

    async def generate_presigned_upload_url(
        self,
        user_id: uuid.UUID,
        request: StoryUploadUrlRequest,
    ) -> StoryUploadUrlResponse:
        """
        Generate presigned PUT URL for uploading image to temp-media bucket.
        Validates that content_type is an image. Video assets are strictly rejected.
        """
        if not request.content_type or not request.content_type.startswith("image/"):
            raise PostValidationException(
                "Videos are not supported in Stories. Please select an image file."
            )

        await self.storage.ensure_bucket(TEMP_MEDIA_BUCKET)

        story_id = uuid.uuid4()
        ext = request.file_name.split(".")[-1] if "." in request.file_name else "jpg"
        object_key = f"stories/{user_id}/{story_id}/story_{uuid.uuid4().hex[:8]}.{ext}"

        upload_url = await asyncio.to_thread(
            self.storage._client.presigned_put_object,
            bucket_name=TEMP_MEDIA_BUCKET,
            object_name=object_key,
            expires=timedelta(minutes=15),
        )

        return StoryUploadUrlResponse(
            story_id=story_id,
            object_key=object_key,
            upload_url=upload_url,
        )

    async def create_story(
        self,
        user_id: uuid.UUID,
        request: StoryCreateRequest,
        username: str = "user",
        user_avatar: str | None = None,
    ) -> StoryResponse:
        """
        Create a new 24-hour image story.
        Strictly validates that mime_type is an image. Video assets are rejected.
        """
        if not request.mime_type or not request.mime_type.startswith("image/"):
            raise PostValidationException(
                "Videos are not supported in Stories. Please select an image file."
            )

        # Ensure temp-media bucket exists with 1-day lifecycle
        await self.storage.ensure_bucket(TEMP_MEDIA_BUCKET)

        now = datetime.now(timezone.utc)
        story = Story(
            user_id=user_id,
            object_key=request.object_key,
            caption=request.caption,
            mime_type=request.mime_type,
            created_at=now,
            expires_at=now + timedelta(days=1),
        )

        saved_story = await self.repository.create_story(story)

        presigned_url = await self.storage.get_url(
            bucket=TEMP_MEDIA_BUCKET,
            object_key=saved_story.object_key,
            expires_in=86400,
        )

        return StoryResponse(
            id=saved_story.id,
            user_id=saved_story.user_id,
            username=username,
            user_avatar=user_avatar,
            media_url=presigned_url,
            caption=saved_story.caption,
            mime_type=saved_story.mime_type,
            created_at=saved_story.created_at,
            expires_at=saved_story.expires_at,
        )

    async def get_stories_feed(
        self,
        current_user_id: uuid.UUID,
        auth_token: str,
        current_username: str = "user",
        current_avatar: str | None = None,
    ) -> list[UserStoryGroup]:
        """
        Retrieve active unexpired stories for users that the current user follows + self.
        """
        target_user_ids = [current_user_id]
        user_profile_map: dict[str, dict] = {
            str(current_user_id): {
                "username": current_username,
                "avatar": current_avatar,
                "is_user": True,
            }
        }

        # Fetch following list from User-Service
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(
                    f"http://localhost:8002/user-profile/{current_user_id}/following",
                    headers={"Authorization": f"Bearer {auth_token}"},
                )
                if resp.status_code == 200:
                    body = resp.json()
                    if body.get("success") and body.get("data"):
                        for profile in body["data"]:
                            uid_str = profile.get("id") or profile.get("user_id")
                            if uid_str:
                                try:
                                    uid = uuid.UUID(uid_str)
                                    target_user_ids.append(uid)
                                    user_profile_map[str(uid)] = {
                                        "username": profile.get("username", "user"),
                                        "avatar": profile.get("profile_picture_url"),
                                        "is_user": False,
                                    }
                                except ValueError:
                                    pass
        except Exception as err:
            logger.warning("Could not fetch following list from User-Service for story feed: %s", err)

        # Query database for active unexpired stories for target_user_ids
        active_stories = await self.repository.get_active_stories_for_users(target_user_ids)

        # Group stories by user_id
        grouped: dict[str, list[StoryResponse]] = {}
        for s in active_stories:
            uid_key = str(s.user_id)
            if uid_key not in grouped:
                grouped[uid_key] = []

            meta = user_profile_map.get(uid_key, {"username": "user", "avatar": None, "is_user": False})

            try:
                presigned_url = await self.storage.get_url(
                    bucket=TEMP_MEDIA_BUCKET,
                    object_key=s.object_key,
                    expires_in=86400,
                )
            except Exception:
                presigned_url = ""

            grouped[uid_key].append(
                StoryResponse(
                    id=s.id,
                    user_id=s.user_id,
                    username=meta["username"],
                    user_avatar=meta["avatar"],
                    media_url=presigned_url,
                    caption=s.caption,
                    mime_type=s.mime_type,
                    created_at=s.created_at,
                    expires_at=s.expires_at,
                )
            )

        # Build UserStoryGroup response list
        result: list[UserStoryGroup] = []

        for uid_key, stories in grouped.items():
            meta = user_profile_map.get(uid_key, {"username": "user", "avatar": None, "is_user": False})
            result.append(
                UserStoryGroup(
                    user_id=uuid.UUID(uid_key),
                    username=meta["username"],
                    user_avatar=meta["avatar"],
                    is_user=(str(uid_key) == str(current_user_id)),
                    stories=stories,
                )
            )

        # Sort so current user's story is first, followed by others
        result.sort(key=lambda g: 0 if g.is_user else 1)
        return result

    async def delete_story(self, story_id: uuid.UUID, user_id: uuid.UUID) -> None:
        """
        Delete a story owned by the requesting user.
        """
        story = await self.repository.get_story_by_id(story_id)
        if not story:
            raise PostNotFoundException(f"Story with ID '{story_id}' not found.")
        if story.user_id != user_id:
            raise PostValidationException("You are not authorized to delete this story.")

        try:
            await self.storage.delete(bucket=TEMP_MEDIA_BUCKET, object_key=story.object_key)
        except Exception as err:
            logger.warning("Could not delete story MinIO object key '%s': %s", story.object_key, err)

        await self.repository.delete_story(story)
