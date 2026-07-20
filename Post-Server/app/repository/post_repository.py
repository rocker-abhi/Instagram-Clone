import uuid
import logging
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.post import Post
from app.models.post_media import PostMedia
from app.enums.post_visibility import PostVisibility
from app.exceptions.infrastructure_exception import InfrastructureException

logger = logging.getLogger(__name__)


class PostRepository:
    """
    Database repository handling Post and PostMedia persistence operations.
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_post(self, post: Post, media_items: list[PostMedia]) -> Post:
        """
        Save a new Post and associated PostMedia items to database.
        """
        try:
            self.session.add(post)
            await self.session.flush()

            for media in media_items:
                media.post_id = post.id
                self.session.add(media)

            await self.session.flush()
            await self.session.commit()

            # Refresh post with media loaded
            return await self.get_post_by_id(post.id)
        except Exception as e:
            await self.session.rollback()
            logger.exception("Failed to create post in database")
            raise InfrastructureException(service="Database", message=f"Failed to create post: {str(e)}")

    async def get_post_by_id(self, post_id: uuid.UUID) -> Post | None:
        """
        Fetch a post by its UUID along with media attachments.
        """
        try:
            stmt = (
                select(Post)
                .options(selectinload(Post.media))
                .where(Post.id == post_id)
                .where(Post.is_deleted.isnot(True))
            )
            result = await self.session.execute(stmt)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.exception("Failed to fetch post by id: %s", post_id)
            raise InfrastructureException(service="Database", message=f"Failed to fetch post: {str(e)}")

    async def list_feed_posts(self, limit: int = 20, offset: int = 0) -> list[Post]:
        """
        Fetch public posts for feed display ordered by creation date descending.
        """
        try:
            stmt = (
                select(Post)
                .options(selectinload(Post.media))
                .where(Post.visibility == PostVisibility.PUBLIC)
                .where(Post.is_deleted.isnot(True))
                .order_by(Post.created_at.desc())
                .limit(limit)
                .offset(offset)
            )
            result = await self.session.execute(stmt)
            return list(result.scalars().all())
        except Exception as e:
            logger.exception("Failed to list feed posts")
            raise InfrastructureException(service="Database", message=f"Failed to fetch feed posts: {str(e)}")

    async def list_user_posts(self, user_id: uuid.UUID, limit: int = 50, offset: int = 0) -> list[Post]:
        """
        Fetch posts created by a specific user profile.
        """
        try:
            stmt = (
                select(Post)
                .options(selectinload(Post.media))
                .where(Post.user_id == user_id)
                .where(Post.is_deleted.isnot(True))
                .order_by(Post.created_at.desc())
                .limit(limit)
                .offset(offset)
            )
            result = await self.session.execute(stmt)
            return list(result.scalars().all())
        except Exception as e:
            logger.exception("Failed to list posts for user: %s", user_id)
            raise InfrastructureException(service="Database", message=f"Failed to fetch user posts: {str(e)}")

    async def soft_delete_post(self, post: Post) -> None:
        """
        Soft delete a post by setting is_deleted = True and deleted_at timestamp.
        """
        try:
            post.is_deleted = True
            post.deleted_at = datetime.now(timezone.utc)
            await self.session.flush()
            await self.session.commit()
        except Exception as e:
            await self.session.rollback()
            logger.exception("Failed to soft delete post: %s", post.id)
            raise InfrastructureException(service="Database", message=f"Failed to delete post: {str(e)}")
