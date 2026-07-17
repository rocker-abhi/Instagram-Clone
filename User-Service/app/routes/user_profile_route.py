import logging
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, Form
from app.service.user_profile_service import UserProfileService
from app.routes.dependencies import (
    get_current_user,
    get_user_profile_service,
    extract_user_uuid,
)
from app.schema.common_schema import APIResponse
from app.schema.user_profile_schema import (
    UserProfileResponse,
    UserProfileUpdateRequest,
    UserMeResponse,
    PortfolioUserProfileResponse,
    PrivacySettingsResponse,
    PrivacySettingsUpdateRequest,
    FollowRequestResponse,
    ProfileSetupRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/user-profile", tags=["User Profile"])


# ─── /me must come before the parameterless "" GET to avoid routing collision ───

@router.get("/me", response_model=APIResponse[UserMeResponse])
async def get_my_summary(
    current_user: dict = Depends(get_current_user),
    service: UserProfileService = Depends(get_user_profile_service),
):
    """
    GET /user-profile/me

    Lightweight profile summary for the authenticated user:
    username, display_name, and a pre-signed avatar URL (valid 1 hour).
    Designed for navbar / sidebar rendering where the full profile is not needed.

    Raises:
        MissingTokenPayloadException: JWT payload is missing the user identifier.
        InvalidUserIdFormatException: User ID in the token is not a valid UUID.
        ProfileNotFound:              No profile exists for the authenticated user.
    """
    user_uuid = extract_user_uuid(current_user)
    me = await service.get_me(user_uuid)
    return APIResponse(
        success=True,
        message="User summary retrieved successfully",
        data=me,
    )


@router.get("/portfolio", response_model=APIResponse[PortfolioUserProfileResponse])
async def get_portfolio_profile(
    current_user: dict = Depends(get_current_user),
    service: UserProfileService = Depends(get_user_profile_service),
):
    """
    GET /user-profile/portfolio

    Full profile data needed by the ProfilePage component:
    username, display_name (full name), bio, website, profile_picture_url,
    followers_count, and following_count. Post data is NOT included.

    Raises:
        MissingTokenPayloadException: JWT payload is missing the user identifier.
        InvalidUserIdFormatException: User ID in the token is not a valid UUID.
        ProfileNotFound:              No profile exists for the authenticated user.
    """
    user_uuid = extract_user_uuid(current_user)
    portfolio = await service.get_portfolio_profile(user_uuid)
    return APIResponse(
        success=True,
        message="Portfolio profile retrieved successfully",
        data=portfolio,
    )


@router.get("/check-username", response_model=APIResponse[dict])
async def check_username(
    username: str,
    service: UserProfileService = Depends(get_user_profile_service),
):
    """
    GET /user-profile/check-username

    Check if the given username is available or already taken.
    """
    available = await service.check_username_availability(username)
    return APIResponse(
        success=True,
        message="Username availability checked successfully",
        data={"available": available},
    )


@router.get("/search", response_model=APIResponse[list[UserProfileResponse]])
async def search_profiles(
    query: str,
    current_user: dict = Depends(get_current_user),
    service: UserProfileService = Depends(get_user_profile_service),
):
    """
    GET /user-profile/search

    Search for profiles matching the query string.
    """
    user_uuid = extract_user_uuid(current_user)
    profiles = await service.search_profiles(query, exclude_user_id=user_uuid)
    return APIResponse(
        success=True,
        message="Profiles searched successfully",
        data=profiles,
    )


@router.get("/settings", response_model=APIResponse[PrivacySettingsResponse])
async def get_privacy_settings(
    current_user: dict = Depends(get_current_user),
    service: UserProfileService = Depends(get_user_profile_service),
):
    """
    GET /user-profile/settings
    """
    user_uuid = extract_user_uuid(current_user)
    settings = await service.get_settings(user_uuid)
    return APIResponse(
        success=True,
        message="Privacy settings retrieved successfully",
        data=settings,
    )


@router.put("/settings", response_model=APIResponse[PrivacySettingsResponse])
async def update_privacy_settings(
    update_data: PrivacySettingsUpdateRequest,
    current_user: dict = Depends(get_current_user),
    service: UserProfileService = Depends(get_user_profile_service),
):
    """
    PUT /user-profile/settings
    """
    user_uuid = extract_user_uuid(current_user)
    updated_settings = await service.update_settings(user_uuid, update_data)
    return APIResponse(
        success=True,
        message="Privacy settings updated successfully",
        data=updated_settings,
    )


@router.get("/requests", response_model=APIResponse[list[FollowRequestResponse]])
async def get_follow_requests(
    current_user: dict = Depends(get_current_user),
    service: UserProfileService = Depends(get_user_profile_service),
):
    """
    GET /user-profile/requests

    List all pending follow requests.
    """
    user_uuid = extract_user_uuid(current_user)
    requests = await service.get_follow_requests(user_uuid)
    return APIResponse(
        success=True,
        message="Follow requests retrieved successfully",
        data=requests,
    )


@router.post("/requests/{follow_id}/accept", response_model=APIResponse)
async def accept_follow_request(
    follow_id: str,
    current_user: dict = Depends(get_current_user),
    service: UserProfileService = Depends(get_user_profile_service),
):
    """
    POST /user-profile/requests/{follow_id}/accept

    Accept a follow request.
    """
    user_uuid = extract_user_uuid(current_user)
    import uuid
    try:
        f_id = uuid.UUID(follow_id)
    except ValueError:
        return APIResponse(success=False, message="Invalid follow ID format.")

    try:
        await service.accept_follow_request(user_uuid, f_id)
        return APIResponse(success=True, message="Follow request accepted.")
    except ValueError as e:
        return APIResponse(success=False, message=str(e))


@router.post("/requests/{follow_id}/reject", response_model=APIResponse)
async def reject_follow_request(
    follow_id: str,
    current_user: dict = Depends(get_current_user),
    service: UserProfileService = Depends(get_user_profile_service),
):
    """
    POST /user-profile/requests/{follow_id}/reject

    Reject/Delete a follow request.
    """
    user_uuid = extract_user_uuid(current_user)
    import uuid
    try:
        f_id = uuid.UUID(follow_id)
    except ValueError:
        return APIResponse(success=False, message="Invalid follow ID format.")

    try:
        await service.reject_follow_request(user_uuid, f_id)
        return APIResponse(success=True, message="Follow request rejected.")
    except ValueError as e:
        return APIResponse(success=False, message=str(e))


@router.get("/public/{username}", response_model=APIResponse[PortfolioUserProfileResponse])
async def get_public_user_profile(
    username: str,
    current_user: dict = Depends(get_current_user),
    service: UserProfileService = Depends(get_user_profile_service),
):
    """
    GET /user-profile/public/{username}

    Retrieve public portfolio details of another user by their username.
    """
    user_uuid = extract_user_uuid(current_user)
    profile = await service.get_public_profile(username, current_user_id=user_uuid)
    return APIResponse(
        success=True,
        message="Public user profile retrieved successfully",
        data=profile,
    )


@router.post("/{username}/follow", response_model=APIResponse)
async def follow_user_endpoint(
    username: str,
    current_user: dict = Depends(get_current_user),
    service: UserProfileService = Depends(get_user_profile_service),
):
    """
    POST /user-profile/{username}/follow
    """
    user_uuid = extract_user_uuid(current_user)
    try:
        status = await service.follow_user(user_uuid, username)
        return APIResponse(
            success=True,
            message="Follow action completed",
            data={"status": status}
        )
    except ValueError as e:
        return APIResponse(success=False, message=str(e))


@router.post("/{username}/unfollow", response_model=APIResponse)
async def unfollow_user_endpoint(
    username: str,
    current_user: dict = Depends(get_current_user),
    service: UserProfileService = Depends(get_user_profile_service),
):
    """
    POST /user-profile/{username}/unfollow
    """
    user_uuid = extract_user_uuid(current_user)
    try:
        await service.unfollow_user(user_uuid, username)
        return APIResponse(success=True, message="Unfollowed successfully.")
    except ValueError as e:
        return APIResponse(success=False, message=str(e))


@router.get("", response_model=APIResponse[UserProfileResponse])
async def get_user_profile(
    current_user: dict = Depends(get_current_user),
    service: UserProfileService = Depends(get_user_profile_service),
):
    """
    GET /user-profile

    Retrieve the full profile for the authenticated user.
    profile_picture_url is a pre-signed MinIO URL valid for 1 hour.

    Raises:
        MissingTokenPayloadException: JWT payload is missing the user identifier.
        InvalidUserIdFormatException: User ID in the token is not a valid UUID.
        ProfileNotFound:              No profile exists for the authenticated user.
    """
    user_uuid = extract_user_uuid(current_user)
    profile_response = await service.get_profile_by_user_id(user_uuid)
    return APIResponse(
        success=True,
        message="User profile retrieved successfully",
        data=profile_response,
    )


@router.get("/{user_id}", response_model=APIResponse[UserProfileResponse])
async def get_user_profile_by_id(
    user_id: uuid.UUID,
    current_user: dict = Depends(get_current_user),
    service: UserProfileService = Depends(get_user_profile_service),
):
    """
    GET /user-profile/{user_id}

    Retrieve another user's profile details by their UUID.
    """
    profile_response = await service.get_profile_by_user_id(user_id)
    return APIResponse(
        success=True,
        message="User profile retrieved successfully",
        data=profile_response,
    )


@router.put("", response_model=APIResponse[UserProfileResponse])
async def update_user_profile(
    update_data: UserProfileUpdateRequest,
    current_user: dict = Depends(get_current_user),
    service: UserProfileService = Depends(get_user_profile_service),
):
    """
    PUT /user-profile

    Partially update the authenticated user's profile text fields (JSON body).
    profile_picture_url in the response is a freshly resolved pre-signed URL.

    Raises:
        MissingTokenPayloadException: JWT payload is missing the user identifier.
        InvalidUserIdFormatException: User ID in the token is not a valid UUID.
        ProfileNotFound:              No profile exists for the authenticated user.
    """
    user_uuid = extract_user_uuid(current_user)
    updated_profile = await service.update_profile(user_uuid, update_data)
    return APIResponse(
        success=True,
        message="User profile updated successfully",
        data=updated_profile,
    )


@router.post("/setup", response_model=APIResponse[UserProfileResponse])
async def setup_user_profile(
    current_user: dict = Depends(get_current_user),
    service: UserProfileService = Depends(get_user_profile_service),
    display_name: str = Form(..., description="User's display name"),
    bio: str = Form(..., description="User's bio (max 150 characters)"),
    profile_picture: Optional[UploadFile] = File(
        default=None,
        description="Avatar image file (JPEG / PNG / WebP, max 5 MB)",
    ),
):
    """
    POST /user-profile/setup — multipart/form-data

    Initializes the user's profile during onboarding.
    Accepts display_name and bio as form fields plus an optional avatar image file.
    The avatar is uploaded to MinIO; the object key is stored in the database.
    The response includes a freshly resolved pre-signed URL for the avatar.

    Raises:
        MissingTokenPayloadException:   JWT payload is missing the user identifier.
        InvalidUserIdFormatException:   User ID in the token is not a valid UUID.
        ProfileNotFound:                No profile exists for the authenticated user.
        InvalidProfilePictureException: Unsupported image type or file too large.
    """
    user_uuid = extract_user_uuid(current_user)

    from fastapi import HTTPException
    try:
        req = ProfileSetupRequest(display_name=display_name, bio=bio)
        display_name = req.display_name
        bio = req.bio
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    image_bytes: bytes | None = None
    content_type: str | None = None

    if profile_picture is not None:
        image_bytes = await profile_picture.read()
        content_type = profile_picture.content_type

    setup_profile = await service.setup_profile(
        user_id=user_uuid,
        display_name=display_name,
        bio=bio,
        image_bytes=image_bytes,
        content_type=content_type,
    )

    return APIResponse(
        success=True,
        message="User profile onboarding setup completed successfully",
        data=setup_profile,
    )


@router.get("/{username_or_id}/followers", response_model=APIResponse[list[UserProfileResponse]])
async def get_user_followers(
    username_or_id: str,
    current_user: dict = Depends(get_current_user),
    service: UserProfileService = Depends(get_user_profile_service),
):
    """
    GET /user-profile/{username_or_id}/followers

    Get list of followers for the specified user (accepts username, user UUID, 'me', or 'portfolio').
    """
    target = username_or_id
    if target in ("me", "portfolio"):
        target = str(extract_user_uuid(current_user))

    followers = await service.get_followers_list(target)
    return APIResponse(
        success=True,
        message="Followers list retrieved successfully",
        data=followers,
    )


@router.get("/{username_or_id}/following", response_model=APIResponse[list[UserProfileResponse]])
async def get_user_following(
    username_or_id: str,
    current_user: dict = Depends(get_current_user),
    service: UserProfileService = Depends(get_user_profile_service),
):
    """
    GET /user-profile/{username_or_id}/following

    Get list of users followed by the specified user (accepts username, user UUID, 'me', or 'portfolio').
    """
    target = username_or_id
    if target in ("me", "portfolio"):
        target = str(extract_user_uuid(current_user))

    following = await service.get_following_list(target)
    return APIResponse(
        success=True,
        message="Following list retrieved successfully",
        data=following,
    )
