import uuid
import asyncio
import logging
from datetime import timedelta
from sqlalchemy.ext.asyncio import AsyncSession

from app.repository.post_repository import PostRepository
from app.core.storage import StorageFactory
from app.storage.buckets import POST_MEDIA_BUCKET
from app.models.post import Post
from app.models.post_media import PostMedia
from app.schemas.post_schema import (
    PresignedUploadUrlRequest,
    PresignedUploadUrlResponse,
    PresignedUrlItem,
    PostCreateRequest,
    PostResponse,
    PostMediaResponse,
)
from app.exceptions.business_exception import (
    PostNotFoundException,
    PostValidationException,
    UnauthorizedPostAccessException,
)

logger = logging.getLogger(__name__)


class PostService:
    """
    Business service layer orchestrating post creation, presigned upload URLs,
    database transactions, and resolving media object keys into presigned GET URLs.
    """

    def __init__(self, session: AsyncSession):
        self.repository = PostRepository(session)
        self.storage = StorageFactory.get_storage()

    async def generate_presigned_upload_urls(
        self,
        user_id: uuid.UUID,
        request: PresignedUploadUrlRequest,
    ) -> PresignedUploadUrlResponse:
        """
        Generate pre-signed PUT URLs allowing clients to upload multiple images directly to MinIO.
        """
        post_id = uuid.uuid4()
        upload_items: list[PresignedUrlItem] = []

        # Ensure target storage bucket exists
        await self.storage.ensure_bucket(POST_MEDIA_BUCKET)

        for idx, file_info in enumerate(request.files):
            # Validate content type is an image
            if not file_info.content_type.startswith("image/"):
                raise PostValidationException(
                    f"File '{file_info.file_name}' has invalid content type '{file_info.content_type}'. Videos are not allowed, please upload image files only."
                )

            # Generate clean object key: posts/{user_id}/{post_id}/{order}_{uuid}.ext
            ext = file_info.file_name.split(".")[-1] if "." in file_info.file_name else "jpg"
            object_key = f"posts/{user_id}/{post_id}/{idx}_{uuid.uuid4().hex[:8]}.{ext}"

            # Generate presigned PUT URL valid for 15 minutes
            upload_url = await asyncio.to_thread(
                self.storage._client.presigned_put_object,
                bucket_name=POST_MEDIA_BUCKET,
                object_name=object_key,
                expires=timedelta(minutes=15),
            )

            upload_items.append(
                PresignedUrlItem(
                    file_name=file_info.file_name,
                    object_key=object_key,
                    upload_url=upload_url,
                    display_order=idx,
                )
            )

        logger.info("Generated %d presigned upload URLs for user: %s (post_id: %s)", len(upload_items), user_id, post_id)
        return PresignedUploadUrlResponse(
            post_id=post_id,
            upload_urls=upload_items,
        )

    async def create_post(
        self,
        user_id: uuid.UUID,
        request: PostCreateRequest,
    ) -> PostResponse:
        """
        Persist Post and PostMedia records into database and return enriched post with presigned GET URLs.
        """
        if not request.media:
            raise PostValidationException("Post must contain at least one media item.")

        # Construct Post entity
        post = Post(
            id=request.post_id,
            user_id=user_id,
            caption=request.caption,
            location=request.location,
            visibility=request.visibility,
            comments_enabled=request.comments_enabled,
            media_count=len(request.media),
        )

        # Construct PostMedia entities
        media_items: list[PostMedia] = []
        for item in request.media:
            media_items.append(
                PostMedia(
                    post_id=request.post_id,
                    media_type=item.media_type,
                    object_key=item.object_key,
                    thumbnail_key=item.thumbnail_key,
                    display_order=item.display_order,
                    mime_type=item.mime_type,
                    file_size=item.file_size,
                    width=item.width,
                    height=item.height,
                    duration=item.duration,
                )
            )

        # Save to PostgreSQL
        created_post = await self.repository.create_post(post, media_items)
        return await self._enrich_post_with_urls(created_post)

    async def get_post_by_id(self, post_id: uuid.UUID) -> PostResponse:
        """
        Get post details by ID with resolved presigned GET URLs.
        """
        post = await self.repository.get_post_by_id(post_id)
        if not post:
            raise PostNotFoundException(f"Post with ID '{post_id}' not found.")
        return await self._enrich_post_with_urls(post)

    async def list_feed_posts(self, limit: int = 20, offset: int = 0) -> list[PostResponse]:
        """
        List public feed posts with presigned GET URLs for direct media rendering.
        """
        posts = await self.repository.list_feed_posts(limit=limit, offset=offset)
        enriched: list[PostResponse] = []
        for post in posts:
            enriched.append(await self._enrich_post_with_urls(post))
        return enriched

    async def list_user_posts(self, user_id: uuid.UUID, limit: int = 50, offset: int = 0) -> list[PostResponse]:
        """
        List posts owned by a specific user profile.
        """
        posts = await self.repository.list_user_posts(user_id=user_id, limit=limit, offset=offset)
        enriched: list[PostResponse] = []
        for post in posts:
            enriched.append(await self._enrich_post_with_urls(post))
        return enriched

    async def delete_post(self, post_id: uuid.UUID, user_id: uuid.UUID) -> None:
        """
        Soft delete a post if owned by the requesting user.
        """
        post = await self.repository.get_post_by_id(post_id)
        if not post:
            raise PostNotFoundException(f"Post with ID '{post_id}' not found.")

        if post.user_id != user_id:
            raise UnauthorizedPostAccessException("You can only delete your own posts.")

        await self.repository.soft_delete_post(post)
        logger.info("User %s soft deleted post: %s", user_id, post_id)

    async def _enrich_post_with_urls(self, post: Post) -> PostResponse:
        """
        Helper method converting PostMedia object keys into pre-signed GET URLs for image rendering.
        """
        media_responses: list[PostMediaResponse] = []
        
        # Sort media by display_order
        sorted_media = sorted(post.media or [], key=lambda m: m.display_order)

        for m in sorted_media:
            # Generate pre-signed GET URL valid for 1 hour (3600 seconds)
            presigned_url = await self.storage.get_url(
                bucket=POST_MEDIA_BUCKET,
                object_key=m.object_key,
                expires_in=3600,
            )

            media_responses.append(
                PostMediaResponse(
                    id=m.id,
                    media_type=m.media_type,
                    object_key=m.object_key,
                    thumbnail_key=m.thumbnail_key,
                    url=presigned_url,
                    display_order=m.display_order,
                    mime_type=m.mime_type,
                    file_size=m.file_size,
                    width=m.width,
                    height=m.height,
                    duration=m.duration,
                    created_at=m.created_at,
                )
            )

        return PostResponse(
            id=post.id,
            user_id=post.user_id,
            caption=post.caption,
            location=post.location,
            visibility=post.visibility,
            comments_enabled=post.comments_enabled,
            media_count=post.media_count,
            is_deleted=post.is_deleted,
            created_at=post.created_at,
            updated_at=post.updated_at,
            media=media_responses,
        )
