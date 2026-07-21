import uuid
import logging
from datetime import datetime, timezone
from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.post import Post
from app.models.post_media import PostMedia
from app.models.post_comment import PostComment
from app.models.post_like import PostLike
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
                .options(selectinload(Post.media), selectinload(Post.likes), selectinload(Post.comments))
                .where(Post.id == post_id)
                .where(Post.is_deleted.isnot(True))
            )
            result = await self.session.execute(stmt)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.exception("Failed to fetch post by id: %s", post_id)
            raise InfrastructureException(service="Database", message=f"Failed to fetch post: {str(e)}")

    async def list_feed_posts(
        self,
        followed_user_ids: list[uuid.UUID] | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> list[Post]:
        """
        Fetch public posts and posts from followed users for feed display ordered by creation date descending.
        """
        try:
            conditions = [Post.visibility == PostVisibility.PUBLIC]
            if followed_user_ids:
                conditions.append(Post.user_id.in_(followed_user_ids))

            stmt = (
                select(Post)
                .options(selectinload(Post.media), selectinload(Post.likes), selectinload(Post.comments))
                .where(Post.is_deleted.isnot(True))
                .where(or_(*conditions))
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
                .options(selectinload(Post.media), selectinload(Post.likes), selectinload(Post.comments))
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

    async def update_post(
        self,
        post: Post,
        caption: str | None,
        location: str | None,
        visibility: PostVisibility | None,
        comments_enabled: bool | None,
    ) -> Post:
        """
        Update post metadata without modifying post media.
        """
        try:
            if caption is not None:
                post.caption = caption
            if location is not None:
                post.location = location
            if visibility is not None:
                post.visibility = visibility
            if comments_enabled is not None:
                post.comments_enabled = comments_enabled

            post.updated_at = datetime.now(timezone.utc)
            await self.session.flush()
            await self.session.commit()
            return await self.get_post_by_id(post.id)
        except Exception as e:
            await self.session.rollback()
            logger.exception("Failed to update post: %s", post.id)
            raise InfrastructureException(service="Database", message=f"Failed to update post: {str(e)}")

    async def create_like(self, like: PostLike) -> PostLike:
        """
        Save a new PostLike record.
        """
        try:
            self.session.add(like)
            await self.session.flush()
            await self.session.commit()
            return like
        except Exception as e:
            await self.session.rollback()
            logger.exception("Failed to save post like")
            raise InfrastructureException(service="Database", message=f"Failed to like post: {str(e)}")

    async def get_like(self, post_id: uuid.UUID, user_id: uuid.UUID) -> PostLike | None:
        """
        Fetch a PostLike record if it exists.
        """
        try:
            stmt = select(PostLike).where(PostLike.post_id == post_id, PostLike.user_id == user_id)
            result = await self.session.execute(stmt)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.exception("Failed to fetch like for post %s and user %s", post_id, user_id)
            raise InfrastructureException(service="Database", message=f"Failed to fetch like: {str(e)}")

    async def delete_like(self, like: PostLike) -> None:
        """
        Delete a PostLike record.
        """
        try:
            await self.session.delete(like)
            await self.session.flush()
            await self.session.commit()
        except Exception as e:
            await self.session.rollback()
            logger.exception("Failed to delete like")
            raise InfrastructureException(service="Database", message=f"Failed to delete like: {str(e)}")

    async def create_comment(self, comment: PostComment) -> PostComment:
        """
        Save a new PostComment record.
        """
        try:
            self.session.add(comment)
            await self.session.flush()
            await self.session.commit()
            return comment
        except Exception as e:
            await self.session.rollback()
            logger.exception("Failed to save post comment")
            raise InfrastructureException(service="Database", message=f"Failed to create comment: {str(e)}")

    async def get_comment_by_id(self, comment_id: uuid.UUID) -> PostComment | None:
        """
        Fetch a comment by its UUID.
        """
        try:
            stmt = select(PostComment).where(PostComment.id == comment_id).where(PostComment.is_deleted.isnot(True))
            result = await self.session.execute(stmt)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.exception("Failed to fetch comment by id: %s", comment_id)
            raise InfrastructureException(service="Database", message=f"Failed to fetch comment: {str(e)}")

    async def delete_comment(self, comment: PostComment) -> None:
        """
        Soft delete a comment record.
        """
        try:
            from datetime import datetime, timezone
            comment.is_deleted = True
            comment.deleted_at = datetime.now(timezone.utc)
            await self.session.commit()
        except Exception as e:
            await self.session.rollback()
            logger.exception("Failed to soft delete comment: %s", comment.id)
            raise InfrastructureException(service="Database", message=f"Failed to delete comment: {str(e)}")

