import uuid
import logging
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.story import Story
from app.exceptions.infrastructure_exception import InfrastructureException

logger = logging.getLogger(__name__)


class StoryRepository:
    """
    Database repository handling Story persistence operations.
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_story(self, story: Story) -> Story:
        """
        Persist a new Story record in PostgreSQL.
        """
        try:
            self.session.add(story)
            await self.session.flush()
            await self.session.commit()
            await self.session.refresh(story)
            return story
        except Exception as e:
            await self.session.rollback()
            logger.exception("Failed to persist story in database")
            raise InfrastructureException(service="Database", message=f"Failed to create story: {str(e)}")

    async def get_active_stories_for_users(self, user_ids: list[uuid.UUID]) -> list[Story]:
        """
        Fetch active unexpired stories (expires_at > NOW()) for given user UUIDs.
        """
        if not user_ids:
            return []
        try:
            now = datetime.now(timezone.utc)
            stmt = (
                select(Story)
                .where(Story.user_id.in_(user_ids))
                .where(Story.expires_at > now)
                .order_by(Story.created_at.asc())
            )
            result = await self.session.execute(stmt)
            return list(result.scalars().all())
        except Exception as e:
            logger.exception("Failed to fetch active stories for users")
            raise InfrastructureException(service="Database", message=f"Failed to fetch stories: {str(e)}")

    async def get_story_by_id(self, story_id: uuid.UUID) -> Story | None:
        """
        Fetch story by UUID.
        """
        try:
            stmt = select(Story).where(Story.id == story_id)
            result = await self.session.execute(stmt)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.exception("Failed to fetch story by id: %s", story_id)
            raise InfrastructureException(service="Database", message=f"Failed to fetch story: {str(e)}")

    async def delete_story(self, story: Story) -> None:
        """
        Delete a story record from database.
        """
        try:
            await self.session.delete(story)
            await self.session.flush()
            await self.session.commit()
        except Exception as e:
            await self.session.rollback()
            logger.exception("Failed to delete story: %s", story.id)
            raise InfrastructureException(service="Database", message=f"Failed to delete story: {str(e)}")
