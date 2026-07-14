import uuid
import logging
import io
from app.repository.user_profile_repository import UserProfileRepository
from app.exceptions.business_exception import ProfileNotFound, InvalidProfilePictureException, UsernameAlreadyExistsException
from app.schema.user_profile_schema import (
    UserProfileResponse,
    UserProfileUpdateRequest,
    UserMeResponse,
    PortfolioUserProfileResponse,
)
from app.core.storage import StorageFactory
from app.storage.buckets import Buckets
from app.storage.models import UploadRequest, DeleteRequest

logger = logging.getLogger(__name__)

# Allowed MIME types for avatar upload
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}

# 5 MB upload limit
MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024


class UserProfileService:

    def __init__(self, session):
        self.repository = UserProfileRepository(session)
        self.session = session

    async def _resolve_avatar_url(self, object_key: str | None) -> str:
        """
        Convert a MinIO object key into a pre-signed public URL (1 hour).
        Returns "" when no key is stored.
        """
        if not object_key:
            return ""
        storage = StorageFactory.get_storage()
        return await storage.get_url(Buckets.PROFILE_IMAGES, object_key)

    async def get_profile_by_user_id(self, user_id: uuid.UUID) -> UserProfileResponse:
        """
        Retrieve full profile for the given user ID.
        profile_picture_url is a pre-signed MinIO URL valid for 1 hour.
        """
        profile = await self.repository.get_profile_by_user_uuid(user_id)
        if not profile:
            raise ProfileNotFound(f"Profile for user ID {user_id} was not found")

        return UserProfileResponse(
            user_id=profile.user_id,
            username=profile.username,
            display_name=profile.display_name or "",
            bio=profile.bio or "",
            profile_picture_url=await self._resolve_avatar_url(profile.profile_picture_key),
            is_onboarding_completed=profile.is_onboarding_completed,
        )

    async def get_me(self, user_id: uuid.UUID) -> UserMeResponse:
        """
        Retrieve the lightweight /me summary: username, display_name, avatar URL.
        profile_picture_url is a pre-signed MinIO URL (1 hour), or "".
        """
        profile = await self.repository.get_profile_by_user_uuid(user_id)
        if not profile:
            raise ProfileNotFound(f"Profile for user ID {user_id} was not found")

        return UserMeResponse(
            username=profile.username,
            display_name=profile.display_name or "",
            profile_picture_url=await self._resolve_avatar_url(profile.profile_picture_key),
        )

    async def get_portfolio_profile(self, user_id: uuid.UUID) -> PortfolioUserProfileResponse:
        """
        Retrieve all profile data required by the ProfilePage component:
        username, display_name, bio, website, profile_picture_url,
        followers_count, and following_count.

        Uses COUNT queries for follow stats to avoid SQLAlchemy lazy-load
        errors in async context (MissingGreenlet).
        """
        profile = await self.repository.get_profile_by_user_uuid(user_id)
        if not profile:
            raise ProfileNotFound(f"Profile for user ID {user_id} was not found")

        followers_count, following_count = await self.repository.get_follow_counts(profile.id)

        return PortfolioUserProfileResponse(
            username=profile.username,
            display_name=profile.display_name or "",
            bio=profile.bio or "",
            website=profile.website or "",
            profile_picture_url=await self._resolve_avatar_url(profile.profile_picture_key),
            followers_count=followers_count,
            following_count=following_count,
        )

    async def update_profile(self, user_id: uuid.UUID, data: UserProfileUpdateRequest) -> UserProfileResponse:
        """
        Partially update user profile text attributes.
        """
        profile = await self.repository.get_profile_by_user_uuid(user_id)
        if not profile:
            raise ProfileNotFound(f"Profile for user ID {user_id} was not found")

        if data.username is not None and data.username != profile.username:
            # Check if username is already taken by another profile
            existing = await self.repository.get_profile_by_username(data.username)
            if existing:
                raise UsernameAlreadyExistsException(f"Username '{data.username}' is already taken.")
            profile.username = data.username

        if data.display_name is not None:
            profile.display_name = data.display_name
        if data.bio is not None:
            profile.bio = data.bio
        if data.is_onboarding_completed is not None:
            profile.is_onboarding_completed = data.is_onboarding_completed

        await self.session.commit()

        return UserProfileResponse(
            user_id=profile.user_id,
            username=profile.username,
            display_name=profile.display_name or "",
            bio=profile.bio or "",
            profile_picture_url=await self._resolve_avatar_url(profile.profile_picture_key),
            is_onboarding_completed=profile.is_onboarding_completed,
        )

    async def setup_profile(
        self,
        user_id: uuid.UUID,
        display_name: str,
        bio: str,
        image_bytes: bytes | None,
        content_type: str | None,
    ) -> UserProfileResponse:
        """
        Perform initial profile setup (onboarding) from multipart form data.

        - Validates and uploads the avatar to MinIO.
        - Stores the object key in the database.
        - Sets is_onboarding_completed = True.

        Raises:
            ProfileNotFound:               No profile record for this user.
            InvalidProfilePictureException: File type not allowed or exceeds size limit.
        """
        profile = await self.repository.get_profile_by_user_uuid(user_id)
        if not profile:
            raise ProfileNotFound(f"Profile for user ID {user_id} was not found")

        object_key = profile.profile_picture_key or ""

        if image_bytes is not None:
            # ── Validate content type ───────────────────────────────────────
            if content_type not in ALLOWED_CONTENT_TYPES:
                raise InvalidProfilePictureException(
                    f"Unsupported image type '{content_type}'. "
                    f"Allowed: {', '.join(ALLOWED_CONTENT_TYPES)}"
                )

            # ── Validate file size ──────────────────────────────────────────
            if len(image_bytes) > MAX_AVATAR_SIZE_BYTES:
                raise InvalidProfilePictureException(
                    f"Profile picture exceeds the maximum allowed size of "
                    f"{MAX_AVATAR_SIZE_BYTES // (1024 * 1024)} MB"
                )

            storage = StorageFactory.get_storage()

            # Derive extension from content type (jpeg | png | webp)
            ext = content_type.split("/")[-1]
            object_key = f"users/{user_id}/avatar.{ext}"

            # Delete existing avatar before uploading the new one
            if await storage.exists(Buckets.PROFILE_IMAGES, object_key):
                logger.info("Existing avatar found for user %s — deleting before upload.", user_id)
                await storage.delete(DeleteRequest(bucket=Buckets.PROFILE_IMAGES, object_key=object_key))

            upload_req = UploadRequest(
                bucket=Buckets.PROFILE_IMAGES,
                object_key=object_key,
                file=io.BytesIO(image_bytes),
                content_type=content_type,
                size=len(image_bytes),
            )
            await storage.upload(upload_req)
            logger.info("Avatar uploaded for user %s → %s", user_id, object_key)

        # Persist text fields and mark onboarding complete
        profile.display_name = display_name
        profile.bio = bio
        profile.profile_picture_key = object_key
        profile.is_onboarding_completed = True

        await self.session.commit()

        return UserProfileResponse(
            user_id=profile.user_id,
            username=profile.username,
            display_name=profile.display_name or "",
            bio=profile.bio or "",
            profile_picture_url=await self._resolve_avatar_url(profile.profile_picture_key),
            is_onboarding_completed=profile.is_onboarding_completed,
        )

    async def check_username_availability(self, username: str) -> bool:
        """
        Check if the username is available (i.e. not taken by any profile).
        """
        profile = await self.repository.get_profile_by_username(username)
        return profile is None

    async def search_profiles(self, query: str, exclude_user_id: uuid.UUID = None) -> list[UserProfileResponse]:
        """
        Search profiles by matching username handles.
        """
        if not query:
            return []
        profiles = await self.repository.search_profiles_by_username(query, exclude_user_id=exclude_user_id)
        res = []
        for p in profiles:
            res.append(
                UserProfileResponse(
                    user_id=p.user_id,
                    username=p.username,
                    display_name=p.display_name or "",
                    bio=p.bio or "",
                    profile_picture_url=await self._resolve_avatar_url(p.profile_picture_key),
                    is_onboarding_completed=p.is_onboarding_completed,
                )
            )
        return res
