import uuid
import logging
from app.repository.user_profile_repository import UserProfileRepository
from app.models.user_profile import UserProfile
from app.models.privacy_setting import PrivacySetting

logger = logging.getLogger(__name__)


class AuthGrpcService:

    def __init__(self, session):
        self.session = session
        self.repository = UserProfileRepository(session)

    async def create_profile(self, user_uuid: uuid.UUID, username: str) -> None:
        """
        Check if profile exists, otherwise create it within a transaction.
        """
        async with self.session.begin():
            existing = await self.repository.get_profile_by_user_uuid(user_uuid)
            if existing:
                logger.info("Profile already exists for user_uuid=%s", user_uuid)
                return

            await self.repository.create_profile_with_defaults(user_uuid, username)

    async def get_profile(self, user_uuid: uuid.UUID) -> tuple[UserProfile, PrivacySetting | None]:
        """
        Fetch profile and corresponding privacy settings.
        """
        profile = await self.repository.get_profile_by_user_uuid(user_uuid)
        if not profile:
            raise ValueError("Profile not found")

        privacy = await self.repository.get_privacy_settings(profile.id)
        return profile, privacy

    async def get_user_id_by_username(self, username: str) -> uuid.UUID | None:
        """
        Fetch user_id corresponding to the given username.
        """
        profile = await self.repository.get_profile_by_username(username)
        return profile.user_id if profile else None
