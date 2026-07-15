import uuid
import logging
from sqlalchemy import select, func
from app.models.user_profile import UserProfile
from app.models.privacy_setting import PrivacySetting
from app.models.follow import Follow
from app.enums.follow_status import FollowStatus
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
            # People who follow this profile  →  following_id == profile_id (must be ACCEPTED)
            followers_stmt = (
                select(func.count())
                .select_from(Follow)
                .where(Follow.following_id == profile_id)
                .where(Follow.status == FollowStatus.ACCEPTED)
            )
            # People this profile follows  →  follower_id == profile_id (must be ACCEPTED)
            following_stmt = (
                select(func.count())
                .select_from(Follow)
                .where(Follow.follower_id == profile_id)
                .where(Follow.status == FollowStatus.ACCEPTED)
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

    async def get_pending_follow_requests(self, profile_id: uuid.UUID) -> list[tuple[Follow, UserProfile]]:
        """
        Get pending follow requests targeting the given profile.
        """
        try:
            stmt = (
                select(Follow, UserProfile)
                .join(UserProfile, Follow.follower_id == UserProfile.id)
                .where(Follow.following_id == profile_id)
                .where(Follow.status == FollowStatus.PENDING)
            )
            result = await self.session.execute(stmt)
            return list(result.all())
        except Exception as e:
            raise InfrastructureException(service="Database", message=f"Failed to fetch pending follow requests: {str(e)}")

    async def get_follow_by_id(self, follow_id: uuid.UUID) -> Follow | None:
        """
        Fetch follow by primary key ID.
        """
        try:
            stmt = select(Follow).where(Follow.id == follow_id)
            result = await self.session.execute(stmt)
            return result.scalar_one_or_none()
        except Exception as e:
            raise InfrastructureException(service="Database", message=f"Failed to fetch follow: {str(e)}")

    async def delete_follow(self, follow: Follow) -> None:
        """
        Delete follow record.
        """
        try:
            await self.session.delete(follow)
            await self.session.flush()
        except Exception as e:
            raise InfrastructureException(service="Database", message=f"Failed to delete follow: {str(e)}")

    async def get_follow_relationship(self, follower_id: uuid.UUID, following_id: uuid.UUID) -> Follow | None:
        """
        Fetch a follow record between follower and following profiles.
        """
        try:
            stmt = select(Follow).where(
                Follow.follower_id == follower_id,
                Follow.following_id == following_id
            )
            result = await self.session.execute(stmt)
            return result.scalar_one_or_none()
        except Exception as e:
            raise InfrastructureException(service="Database", message=f"Failed to fetch follow relationship: {str(e)}")

    async def create_follow(self, follower_id: uuid.UUID, following_id: uuid.UUID, status: FollowStatus) -> Follow:
        """
        Create a new follow record.
        """
        try:
            follow = Follow(
                follower_id=follower_id,
                following_id=following_id,
                status=status
            )
            self.session.add(follow)
            await self.session.flush()
            return follow
        except Exception as e:
            raise InfrastructureException(service="Database", message=f"Failed to create follow: {str(e)}")

    async def get_followers_list(self, profile_id: uuid.UUID) -> list[UserProfile]:
        """
        Get list of profiles that follow this user profile (status is ACCEPTED).
        """
        try:
            stmt = (
                select(UserProfile)
                .join(Follow, Follow.follower_id == UserProfile.id)
                .where(Follow.following_id == profile_id)
                .where(Follow.status == FollowStatus.ACCEPTED)
            )
            result = await self.session.execute(stmt)
            return list(result.scalars().all())
        except Exception as e:
            raise InfrastructureException(service="Database", message=f"Failed to fetch followers list: {str(e)}")

    async def get_following_list(self, profile_id: uuid.UUID) -> list[UserProfile]:
        """
        Get list of profiles this user profile follows (status is ACCEPTED).
        """
        try:
            stmt = (
                select(UserProfile)
                .join(Follow, Follow.following_id == UserProfile.id)
                .where(Follow.follower_id == profile_id)
                .where(Follow.status == FollowStatus.ACCEPTED)
            )
            result = await self.session.execute(stmt)
            return list(result.scalars().all())
        except Exception as e:
            raise InfrastructureException(service="Database", message=f"Failed to fetch following list: {str(e)}")
