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
from app.models.post_comment import PostComment
from app.models.post_like import PostLike
from app.enums.media_type import MediaType
from app.service.hls_service import hls_service
from minio.datatypes import Part
from app.schemas.post_schema import (
    PresignedUploadUrlRequest,
    PresignedUploadUrlResponse,
    PresignedUrlItem,
    PostCreateRequest,
    PostUpdateRequest,
    PostResponse,
    PostMediaResponse,
    PostCommentRequest,
    PostCommentResponse,
    PostLikeResponse,
    MultipartInitiateRequest,
    MultipartInitiateResponse,
    MultipartPresignPartsRequest,
    MultipartPresignPartsResponse,
    MultipartCompleteRequest,
    PresignedPartItem,
)
from app.exceptions.business_exception import (
    PostNotFoundException,
    PostValidationException,
    UnauthorizedPostAccessException,
)
from app.kafka.producer import kafka_producer
from app.kafka.topics import KafkaTopics

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

    async def initiate_multipart_upload(
        self,
        user_id: uuid.UUID,
        request: MultipartInitiateRequest,
    ) -> MultipartInitiateResponse:
        """
        Initiate a multipart upload session with MinIO.
        """
        post_id = uuid.uuid4()
        await self.storage.ensure_bucket(POST_MEDIA_BUCKET)

        ext = request.file_name.split(".")[-1] if "." in request.file_name else "mp4"
        object_key = f"posts/{user_id}/{post_id}/reel_{uuid.uuid4().hex[:8]}.{ext}"

        upload_id = await asyncio.to_thread(
            self.storage._client._create_multipart_upload,
            bucket_name=POST_MEDIA_BUCKET,
            object_name=object_key,
            headers={},
        )

        logger.info("Initiated multipart upload for user %s: object_key=%s, upload_id=%s", user_id, object_key, upload_id)
        return MultipartInitiateResponse(
            post_id=post_id,
            upload_id=upload_id,
            object_key=object_key,
        )

    async def presign_multipart_parts(
        self,
        user_id: uuid.UUID,
        request: MultipartPresignPartsRequest,
    ) -> MultipartPresignPartsResponse:
        """
        Generate presigned PUT URLs for specific part numbers of a multipart upload.
        """
        parts_list = []
        for part_num in request.part_numbers:
            # Generate presigned PUT URL using MinIO's get_presigned_url
            upload_url = await asyncio.to_thread(
                self.storage._client.get_presigned_url,
                method="PUT",
                bucket_name=POST_MEDIA_BUCKET,
                object_name=request.object_key,
                expires=timedelta(minutes=30),
                extra_query_params={
                    "uploadId": request.upload_id,
                    "partNumber": str(part_num),
                },
            )
            parts_list.append(
                PresignedPartItem(
                    part_number=part_num,
                    upload_url=upload_url,
                )
            )

        return MultipartPresignPartsResponse(parts=parts_list)

    async def complete_multipart_upload(
        self,
        user_id: uuid.UUID,
        request: MultipartCompleteRequest,
    ) -> dict:
        """
        Signal MinIO to complete/assemble the uploaded chunks into the final object.
        """
        # Map input parts to minio.datatypes.Part
        minio_parts = [
            Part(part_number=p.part_number, etag=p.etag)
            for p in request.parts
        ]

        # Call MinIO's internal/private _complete_multipart_upload
        await asyncio.to_thread(
            self.storage._client._complete_multipart_upload,
            bucket_name=POST_MEDIA_BUCKET,
            object_name=request.object_key,
            upload_id=request.upload_id,
            parts=minio_parts,
        )

        logger.info("Completed multipart upload for upload_id: %s", request.upload_id)
        return {"success": True, "message": "Multipart upload completed successfully."}

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

        # Trigger background HLS transcoding task for video media items
        for m in media_items:
            if m.media_type == MediaType.VIDEO:
                asyncio.create_task(hls_service.generate_hls_stream(m.object_key))

        return await self._enrich_post_with_urls(created_post, current_user_id=user_id)

    async def get_post_by_id(self, post_id: uuid.UUID, current_user_id: uuid.UUID | None = None) -> PostResponse:
        """
        Get post details by ID with resolved presigned GET URLs.
        """
        post = await self.repository.get_post_by_id(post_id)
        if not post:
            raise PostNotFoundException(f"Post with ID '{post_id}' not found.")
        return await self._enrich_post_with_urls(post, current_user_id=current_user_id)

    async def list_feed_posts(
        self,
        limit: int = 20,
        offset: int = 0,
        current_user_id: uuid.UUID | None = None,
        auth_token: str | None = None,
    ) -> list[PostResponse]:
        """
        List feed posts with presigned GET URLs for direct media rendering.
        Includes public posts AND posts created by followed friends.
        """
        followed_ids: list[uuid.UUID] = [current_user_id] if current_user_id else []

        if current_user_id and auth_token:
            try:
                import httpx
                async with httpx.AsyncClient(timeout=3.0) as client:
                    resp = await client.get(
                        f"{settings.USER_SERVICE_GATEWAY_URL}/{current_user_id}/following",
                        headers={"Authorization": f"Bearer {auth_token}"},
                    )
                    if resp.status_code == 200:
                        body = resp.json()
                        if body.get("success") and body.get("data"):
                            for profile in body["data"]:
                                uid_str = profile.get("id") or profile.get("user_id")
                                if uid_str:
                                    try:
                                        followed_ids.append(uuid.UUID(uid_str))
                                    except ValueError:
                                        pass
            except Exception as err:
                logger.warning("Could not fetch following list for feed posts: %s", err)

        posts = await self.repository.list_feed_posts(
            followed_user_ids=followed_ids if followed_ids else None,
            limit=limit,
            offset=offset,
        )
        enriched: list[PostResponse] = []
        for post in posts:
            enriched.append(await self._enrich_post_with_urls(post, current_user_id=current_user_id))
        return enriched

    async def list_user_posts(self, user_id: uuid.UUID, limit: int = 50, offset: int = 0, current_user_id: uuid.UUID | None = None) -> list[PostResponse]:
        """
        List posts owned by a specific user profile.
        """
        posts = await self.repository.list_user_posts(user_id=user_id, limit=limit, offset=offset)
        enriched: list[PostResponse] = []
        for post in posts:
            enriched.append(await self._enrich_post_with_urls(post, current_user_id=current_user_id))
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

    async def update_post(
        self,
        post_id: uuid.UUID,
        user_id: uuid.UUID,
        request: PostUpdateRequest,
    ) -> PostResponse:
        """
        Update metadata of an existing post (caption, location, visibility, comments_enabled).
        Verifies ownership and ensures post images/media are not removed or modified.
        """
        post = await self.repository.get_post_by_id(post_id)
        if not post:
            raise PostNotFoundException(f"Post with ID '{post_id}' not found.")

        if post.user_id != user_id:
            raise UnauthorizedPostAccessException("You can only edit your own posts.")

        updated_post = await self.repository.update_post(
            post=post,
            caption=request.caption,
            location=request.location,
            visibility=request.visibility,
            comments_enabled=request.comments_enabled,
        )
        logger.info("User %s updated post: %s", user_id, post_id)
        return await self._enrich_post_with_urls(updated_post, current_user_id=user_id)

    async def _enrich_post_with_urls(self, post: Post, current_user_id: uuid.UUID | None = None) -> PostResponse:
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

            hls_url = None
            if m.media_type == MediaType.VIDEO:
                key_parts = m.object_key.split("/")
                if len(key_parts) >= 3:
                    hls_key = "/".join(key_parts[:-1]) + "/hls/index.m3u8"
                    if await self.storage.exists(POST_MEDIA_BUCKET, hls_key):
                        hls_url = await self.storage.get_url(
                            bucket=POST_MEDIA_BUCKET,
                            object_key=hls_key,
                            expires_in=3600,
                        )

            media_responses.append(
                PostMediaResponse(
                    id=m.id,
                    media_type=m.media_type,
                    object_key=m.object_key,
                    thumbnail_key=m.thumbnail_key,
                    url=presigned_url,
                    hls_url=hls_url,
                    display_order=m.display_order,
                    mime_type=m.mime_type,
                    file_size=m.file_size,
                    width=m.width,
                    height=m.height,
                    duration=m.duration,
                    created_at=m.created_at,
                )
            )

        # Convert comments
        comments_list = []
        for c in (post.comments or []):
            if not c.is_deleted:
                comments_list.append({
                    "id": str(c.id),
                    "user_id": str(c.user_id),
                    "username": f"user_{c.user_id.hex[:4]}",
                    "text": c.content,
                    "parent_comment_id": str(c.parent_comment_id) if c.parent_comment_id else None,
                    "created_at": c.created_at.isoformat()
                })

        has_liked = False
        if current_user_id:
            has_liked = any(str(l.user_id) == str(current_user_id) for l in (post.likes or []))

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
            likes=len(post.likes or []),
            hasLiked=has_liked,
            comments=comments_list
        )

    async def like_post(self, post_id: uuid.UUID, user_id: uuid.UUID) -> PostLikeResponse:
        """
        Register a like on a post (or remove it if already liked), and publish an event to Kafka.
        """
        post = await self.repository.get_post_by_id(post_id)
        if not post:
            raise PostNotFoundException(f"Post with ID '{post_id}' not found.")

        # Check if already liked
        existing_like = await self.repository.get_like(post_id=post_id, user_id=user_id)
        if existing_like:
            # Unlike the post
            await self.repository.delete_like(existing_like)
            return PostLikeResponse(
                id=None,
                post_id=post_id,
                user_id=user_id,
                created_at=None,
                liked=False
            )

        like = PostLike(
            post_id=post_id,
            user_id=user_id
        )
        saved_like = await self.repository.create_like(like)

        # Publish event via Kafka
        event = {
            "event_type": KafkaTopics.POST_LIKE,
            "post_id": str(post_id),
            "user_id": str(user_id),
            "post_owner_id": str(post.user_id),
            "created_at": saved_like.created_at.isoformat()
        }
        try:
            kafka_producer.publish(KafkaTopics.POST_LIKE, event)
        except Exception as e:
            logger.error("Failed to publish post.liked event to Kafka: %s", str(e))

        return PostLikeResponse(
            id=saved_like.id,
            post_id=saved_like.post_id,
            user_id=saved_like.user_id,
            created_at=saved_like.created_at,
            liked=True
        )

    async def comment_on_post(self, post_id: uuid.UUID, user_id: uuid.UUID, request: PostCommentRequest) -> PostCommentResponse:
        """
        Create a comment on a post, and publish an event to Kafka.
        """
        post = await self.repository.get_post_by_id(post_id)
        if not post:
            raise PostNotFoundException(f"Post with ID '{post_id}' not found.")

        comment = PostComment(
            post_id=post_id,
            user_id=user_id,
            content=request.content
        )
        saved_comment = await self.repository.create_comment(comment)

        # Publish event via Kafka
        event = {
            "event_type": KafkaTopics.POST_COMMENT,
            "comment_id": str(saved_comment.id),
            "post_id": str(post_id),
            "user_id": str(user_id),
            "post_owner_id": str(post.user_id),
            "content": saved_comment.content,
            "created_at": saved_comment.created_at.isoformat()
        }
        try:
            kafka_producer.publish(KafkaTopics.POST_COMMENT, event)
        except Exception as e:
            logger.error("Failed to publish post.commented event to Kafka: %s", str(e))

        return PostCommentResponse(
            id=saved_comment.id,
            post_id=saved_comment.post_id,
            user_id=saved_comment.user_id,
            parent_comment_id=saved_comment.parent_comment_id,
            content=saved_comment.content,
            created_at=saved_comment.created_at,
            updated_at=saved_comment.updated_at
        )

    async def reply_to_comment(
        self, post_id: uuid.UUID, comment_id: uuid.UUID, user_id: uuid.UUID, request: PostCommentRequest
    ) -> PostCommentResponse:
        """
        Create a reply comment, and publish an event to Kafka.
        """
        post = await self.repository.get_post_by_id(post_id)
        if not post:
            raise PostNotFoundException(f"Post with ID '{post_id}' not found.")

        parent = await self.repository.get_comment_by_id(comment_id)
        if not parent:
            raise PostNotFoundException(f"Comment with ID '{comment_id}' not found.")

        reply = PostComment(
            post_id=post_id,
            user_id=user_id,
            parent_comment_id=comment_id,
            content=request.content
        )
        saved_reply = await self.repository.create_comment(reply)

        # Publish event via Kafka
        event = {
            "event_type": KafkaTopics.COMMENT_REPLY,
            "comment_id": str(saved_reply.id),
            "parent_comment_id": str(comment_id),
            "parent_comment_owner_id": str(parent.user_id),
            "post_id": str(post_id),
            "user_id": str(user_id),
            "content": saved_reply.content,
            "created_at": saved_reply.created_at.isoformat()
        }
        try:
            kafka_producer.publish(KafkaTopics.COMMENT_REPLY, event)
        except Exception as e:
            logger.error("Failed to publish comment.replied event to Kafka: %s", str(e))

        return PostCommentResponse(
            id=saved_reply.id,
            post_id=saved_reply.post_id,
            user_id=saved_reply.user_id,
            parent_comment_id=saved_reply.parent_comment_id,
            content=saved_reply.content,
            created_at=saved_reply.created_at,
            updated_at=saved_reply.updated_at
        )

    async def delete_comment(self, post_id: uuid.UUID, comment_id: uuid.UUID, user_id: uuid.UUID) -> None:
        """
        Delete a comment if owned by the requesting user.
        """
        comment = await self.repository.get_comment_by_id(comment_id)
        if not comment:
            raise PostNotFoundException(f"Comment with ID '{comment_id}' not found.")
        if comment.user_id != user_id:
            raise UnauthorizedPostAccessException("You can only delete your own comments.")
        await self.repository.delete_comment(comment)

