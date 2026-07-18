import uuid
import logging
import io
import asyncio
from app.repository.user_profile_repository import UserProfileRepository
from app.exceptions.business_exception import ProfileNotFound, InvalidProfilePictureException, UsernameAlreadyExistsException
from app.schema.user_profile_schema import (
    UserProfileResponse,
    UserProfileUpdateRequest,
    UserMeResponse,
    PortfolioUserProfileResponse,
    PrivacySettingsResponse,
    PrivacySettingsUpdateRequest,
    FollowRequestResponse,
)
from app.enums.account_visibility import AccountVisibility
from app.core.storage import StorageFactory
from app.storage.buckets import Buckets
from app.storage.models import UploadRequest, DeleteRequest
from app.kafka.producer import KafkaProducer
from app.kafka.events import NotificationCreatedEventBuilder
from app.kafka.topics import KafakTopics

logger = logging.getLogger(__name__)

# Allowed MIME types for avatar upload
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}

# 5 MB upload limit
MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024


class UserProfileService:

    def __init__(self, session):
        self.repository = UserProfileRepository(session)
        self.session = session
        self.kafka_producer = KafkaProducer()

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
        privacy = await self.repository.get_privacy_settings(profile.id)
        visibility = privacy.account_visibility if privacy else AccountVisibility.PUBLIC

        return PortfolioUserProfileResponse(
            username=profile.username,
            display_name=profile.display_name or "",
            bio=profile.bio or "",
            website=profile.website or "",
            profile_picture_url=await self._resolve_avatar_url(profile.profile_picture_key),
            followers_count=followers_count,
            following_count=following_count,
            account_visibility=visibility,
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

    async def get_settings(self, user_id: uuid.UUID) -> PrivacySettingsResponse:
        """
        Get privacy settings for the given user.
        """
        profile = await self.repository.get_profile_by_user_uuid(user_id)
        if not profile:
            raise ProfileNotFound("Profile not found")

        privacy = await self.repository.get_privacy_settings(profile.id)
        if not privacy:
            from app.models.privacy_setting import PrivacySetting
            privacy = PrivacySetting(user_id=profile.id)
            self.session.add(privacy)
            await self.session.commit()

        return PrivacySettingsResponse(
            account_visibility=privacy.account_visibility,
            show_activity_status=privacy.show_activity_status,
        )

    async def update_settings(self, user_id: uuid.UUID, update_req: PrivacySettingsUpdateRequest) -> PrivacySettingsResponse:
        """
        Update privacy settings for the given user.
        """
        profile = await self.repository.get_profile_by_user_uuid(user_id)
        if not profile:
            raise ProfileNotFound("Profile not found")

        privacy = await self.repository.get_privacy_settings(profile.id)
        if not privacy:
            from app.models.privacy_setting import PrivacySetting
            privacy = PrivacySetting(user_id=profile.id)
            self.session.add(privacy)

        if update_req.account_visibility is not None:
            privacy.account_visibility = update_req.account_visibility
        if update_req.show_activity_status is not None:
            privacy.show_activity_status = update_req.show_activity_status

        await self.session.commit()

        # Publish settings update notification event to Kafka
        try:
            event = (
                NotificationCreatedEventBuilder()
                .set_receiver_id(profile.user_id)
                .set_actor_id(profile.user_id)
                .set_type("settings")
                .set_message("Your privacy settings have been updated successfully.")
                .build()
            )
            # Run in executor thread since publish is blocking I/O
            await asyncio.to_thread(
                self.kafka_producer.publish,
                topic=KafakTopics.NOTIFICATION_CREATED,
                message=event.to_dict()
            )
            logger.info("Published settings update notification event to Kafka for user: %s", profile.user_id)
        except Exception as e:
            logger.error("Failed to publish settings update notification to Kafka: %s", str(e))

        return PrivacySettingsResponse(
            account_visibility=privacy.account_visibility,
            show_activity_status=privacy.show_activity_status,
        )

    async def get_public_profile(self, username: str, current_user_id: uuid.UUID = None) -> PortfolioUserProfileResponse:
        """
        Fetch public portfolio details for a profile matching the username handle.
        """
        profile = await self.repository.get_profile_by_username(username)
        if not profile:
            raise ProfileNotFound("Profile not found")

        followers_count, following_count = await self.repository.get_follow_counts(profile.id)
        privacy = await self.repository.get_privacy_settings(profile.id)
        visibility = privacy.account_visibility if privacy else AccountVisibility.PUBLIC

        following_status = None
        if current_user_id:
            curr_profile = await self.repository.get_profile_by_user_uuid(current_user_id)
            if curr_profile:
                rel = await self.repository.get_follow_relationship(curr_profile.id, profile.id)
                if rel:
                    following_status = rel.status.value

        return PortfolioUserProfileResponse(
            username=profile.username,
            display_name=profile.display_name or "",
            bio=profile.bio or "",
            website=profile.website or "",
            profile_picture_url=await self._resolve_avatar_url(profile.profile_picture_key),
            followers_count=followers_count,
            following_count=following_count,
            account_visibility=visibility,
            following_status=following_status,
        )

    async def get_follow_requests(self, user_id: uuid.UUID) -> list[FollowRequestResponse]:
        """
        Get all pending follow requests for the logged-in user.
        """
        profile = await self.repository.get_profile_by_user_uuid(user_id)
        if not profile:
            raise ProfileNotFound("Profile not found")

        requests = await self.repository.get_pending_follow_requests(profile.id)
        
        result = []
        for follow, follower_profile in requests:
            avatar_url = await self._resolve_avatar_url(follower_profile.profile_picture_key)
            result.append(
                FollowRequestResponse(
                    id=follow.id,
                    follower_username=follower_profile.username,
                    follower_display_name=follower_profile.display_name or "",
                    follower_profile_picture_url=avatar_url,
                )
            )
        return result

    async def accept_follow_request(self, user_id: uuid.UUID, follow_id: uuid.UUID) -> None:
        """
        Accept a pending follow request.
        """
        profile = await self.repository.get_profile_by_user_uuid(user_id)
        if not profile:
            raise ProfileNotFound("Profile not found")

        follow = await self.repository.get_follow_by_id(follow_id)
        if not follow:
            raise ValueError("Follow request not found.")

        # Ensure the follow request belongs to this user
        if follow.following_id != profile.id:
            raise ValueError("Unauthorized to accept this follow request.")

        from app.enums.follow_status import FollowStatus
        follow.status = FollowStatus.ACCEPTED
        await self.session.commit()

        # Publish accept follow request notification event to Kafka
        try:
            follower_profile = await self.repository.get_profile_by_id(follow.follower_id)
            if follower_profile:
                # 1. Notify the requester
                event_follower = (
                    NotificationCreatedEventBuilder()
                    .set_receiver_id(follower_profile.user_id)
                    .set_actor_id(profile.user_id)
                    .set_type("follow_accept")
                    .set_message(f"{profile.username} accepted your follow request.")
                    .build()
                )
                await asyncio.to_thread(
                    self.kafka_producer.publish,
                    topic=KafakTopics.NOTIFICATION_CREATED,
                    message=event_follower.to_dict()
                )

                # 2. Notify the accepting user
                event_acceptor = (
                    NotificationCreatedEventBuilder()
                    .set_receiver_id(profile.user_id)
                    .set_actor_id(follower_profile.user_id)
                    .set_type("follow_accept")
                    .set_message(f"You accepted {follower_profile.username}'s follow request.")
                    .build()
                )
                await asyncio.to_thread(
                    self.kafka_producer.publish,
                    topic=KafakTopics.NOTIFICATION_CREATED,
                    message=event_acceptor.to_dict()
                )
                logger.info("Published accept follow notification events to Kafka for both users.")
        except Exception as e:
            logger.error("Failed to publish accept follow notifications to Kafka: %s", str(e))

    async def reject_follow_request(self, user_id: uuid.UUID, follow_id: uuid.UUID) -> None:
        """
        Reject/Delete a follow request.
        """
        profile = await self.repository.get_profile_by_user_uuid(user_id)
        if not profile:
            raise ProfileNotFound("Profile not found")

        follow = await self.repository.get_follow_by_id(follow_id)
        if not follow:
            raise ValueError("Follow request not found.")

        # Ensure the follow request belongs to this user
        if follow.following_id != profile.id:
            raise ValueError("Unauthorized to reject this follow request.")

        await self.repository.delete_follow(follow)
        await self.session.commit()

    async def follow_user(self, current_user_id: uuid.UUID, target_username: str) -> str:
        """
        Follow another user. If target is private, status is PENDING.
        If public, status is ACCEPTED. Returns status string.
        """
        curr_profile = await self.repository.get_profile_by_user_uuid(current_user_id)
        if not curr_profile:
            raise ProfileNotFound("Profile not found")

        target_profile = await self.repository.get_profile_by_username(target_username)
        if not target_profile:
            raise ProfileNotFound("Target profile not found")

        if curr_profile.id == target_profile.id:
            raise ValueError("You cannot follow yourself.")

        # Check existing follow relationship
        existing = await self.repository.get_follow_relationship(curr_profile.id, target_profile.id)
        if existing:
            return existing.status.value

        privacy = await self.repository.get_privacy_settings(target_profile.id)
        visibility = privacy.account_visibility if privacy else AccountVisibility.PUBLIC

        from app.enums.follow_status import FollowStatus
        status = FollowStatus.PENDING if visibility == AccountVisibility.PRIVATE else FollowStatus.ACCEPTED

        await self.repository.create_follow(curr_profile.id, target_profile.id, status)
        await self.session.commit()

        # Publish follow notification event to Kafka
        try:
            event = (
                NotificationCreatedEventBuilder()
                .set_receiver_id(target_profile.user_id)
                .set_actor_id(curr_profile.user_id)
                .set_type("follow")
                .set_message(
                    f"{curr_profile.username} started following you."
                    if status == FollowStatus.ACCEPTED
                    else f"{curr_profile.username} requested to follow you."
                )
                .build()
            )
            # Run in executor thread since publish is blocking I/O
            await asyncio.to_thread(
                self.kafka_producer.publish,
                topic=KafakTopics.NOTIFICATION_CREATED,
                message=event.to_dict()
            )
            logger.info("Published follow notification event to Kafka for receiver: %s", target_profile.user_id)
        except Exception as e:
            logger.error("Failed to publish follow notification to Kafka: %s", str(e))

        return status.value

    async def unfollow_user(self, current_user_id: uuid.UUID, target_username: str) -> None:
        """
        Unfollow another user or withdraw follow request.
        """
        curr_profile = await self.repository.get_profile_by_user_uuid(current_user_id)
        if not curr_profile:
            raise ProfileNotFound("Profile not found")

        target_profile = await self.repository.get_profile_by_username(target_username)
        if not target_profile:
            raise ProfileNotFound("Target profile not found")

        existing = await self.repository.get_follow_relationship(curr_profile.id, target_profile.id)
        if existing:
            await self.repository.delete_follow(existing)
            await self.session.commit()

    async def get_followers_list(self, user_id_or_username: str) -> list[UserProfileResponse]:
        """
        Get followers list of the specified profile.
        """
        profile = None
        try:
            user_uuid = uuid.UUID(user_id_or_username)
            profile = await self.repository.get_profile_by_user_uuid(user_uuid)
        except ValueError:
            profile = await self.repository.get_profile_by_username(user_id_or_username)

        if not profile:
            raise ProfileNotFound("Profile not found")

        followers = await self.repository.get_followers_list(profile.id)
        res = []
        for p in followers:
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

    async def get_following_list(self, user_id_or_username: str) -> list[UserProfileResponse]:
        """
        Get following list of the specified profile.
        """
        profile = None
        try:
            user_uuid = uuid.UUID(user_id_or_username)
            profile = await self.repository.get_profile_by_user_uuid(user_uuid)
        except ValueError:
            profile = await self.repository.get_profile_by_username(user_id_or_username)

        if not profile:
            raise ProfileNotFound("Profile not found")

        following = await self.repository.get_following_list(profile.id)
        res = []
        for p in following:
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
