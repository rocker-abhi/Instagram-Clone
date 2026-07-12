import uuid
import logging
from sqlalchemy import select
from app.models.user_profile import UserProfile
from app.models.privacy_setting import PrivacySetting
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
