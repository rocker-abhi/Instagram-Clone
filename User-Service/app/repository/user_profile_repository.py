import uuid
import logging
from sqlalchemy import select, func
from app.models.user_profile import UserProfile
from app.models.privacy_setting import PrivacySetting
from app.models.follow import Follow
from app.exceptions.infrastructure_exception import InfrastructureException

logger = logging.getLogger(__name__)


class UserProfileRepository:

    def __init__(self, session):
        self.session = session

    async def get_profile_by_user_uuid(self, user_uuid: uuid.UUID) -> UserProfile | None:
        """
        Fetch UserProfile using user_id UUID.
        """
        try:
            stmt = select(UserProfile).where(UserProfile.user_id == user_uuid)
            result = await self.session.execute(stmt)
            return result.scalar_one_or_none()
        except Exception as e:
            raise InfrastructureException(service="Database", message=f"Failed to fetch profile: {str(e)}")

    async def get_profile_by_username(self, username: str) -> UserProfile | None:
        """
        Fetch UserProfile using username handle.
        """
        try:
            stmt = select(UserProfile).where(UserProfile.username == username)
            result = await self.session.execute(stmt)
            return result.scalar_one_or_none()
        except Exception as e:
            raise InfrastructureException(service="Database", message=f"Failed to fetch profile by username: {str(e)}")

    async def get_privacy_settings(self, profile_id: int) -> PrivacySetting | None:
        """
        Fetch PrivacySetting using profile id.
        """
        try:
            stmt = select(PrivacySetting).where(PrivacySetting.user_id == profile_id)
            result = await self.session.execute(stmt)
            return result.scalar_one_or_none()
        except Exception as e:
            raise InfrastructureException(service="Database", message=f"Failed to fetch privacy settings: {str(e)}")

    async def get_follow_counts(self, profile_id: uuid.UUID) -> tuple[int, int]:
        """
        Return (followers_count, following_count) for the given profile ID
        using two lightweight COUNT queries — avoids lazy-loading the full
        relationship collection which would trigger MissingGreenlet in async.

        Args:
            profile_id: The UserProfile.id (NOT user_id) primary key.

        Returns:
            Tuple of (followers_count, following_count).
        """
        try:
            # People who follow this profile  →  following_id == profile_id
            followers_stmt = (
                select(func.count())
                .select_from(Follow)
                .where(Follow.following_id == profile_id)
            )
            # People this profile follows  →  follower_id == profile_id
            following_stmt = (
                select(func.count())
                .select_from(Follow)
                .where(Follow.follower_id == profile_id)
            )
            followers_result = await self.session.execute(followers_stmt)
            following_result = await self.session.execute(following_stmt)
            return (
                followers_result.scalar_one(),
                following_result.scalar_one(),
            )
        except Exception as e:
            raise InfrastructureException(
                service="Database",
                message=f"Failed to fetch follow counts: {str(e)}"
            )

    async def create_profile_with_defaults(self, user_uuid: uuid.UUID, username: str) -> UserProfile:
        """
        Insert new UserProfile and PrivacySetting records.
        """
        try:
            profile = UserProfile(
                user_id=user_uuid,
                username=username,
                is_onboarding_completed=False
            )
            self.session.add(profile)
            await self.session.flush()

            privacy = PrivacySetting(
                user_id=profile.id
            )
            self.session.add(privacy)
            await self.session.flush()
            return profile
        except Exception as e:
            raise InfrastructureException(service="Database", message=f"Failed to create profile: {str(e)}")

    async def search_profiles_by_username(
        self, username_query: str, exclude_user_id: uuid.UUID = None, limit: int = 20
    ) -> list[UserProfile]:
        """
        Search profiles matching the username handle using ILIKE query.
        """
        try:
            stmt = select(UserProfile).where(UserProfile.username.ilike(f"%{username_query}%"))
            if exclude_user_id:
                stmt = stmt.where(UserProfile.user_id != exclude_user_id)
            stmt = stmt.limit(limit)
            result = await self.session.execute(stmt)
            return list(result.scalars().all())
        except Exception as e:
            raise InfrastructureException(service="Database", message=f"Failed to search profiles: {str(e)}")
