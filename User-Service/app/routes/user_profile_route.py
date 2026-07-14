import logging
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

    import re
    from fastapi import HTTPException
    display_name = display_name.strip()
    if len(display_name) < 6 or len(display_name) > 20:
        raise HTTPException(status_code=400, detail="Full name must be between 6 and 20 characters")
    if not re.match(r"^[a-zA-Z0-9 ]+$", display_name):
        raise HTTPException(status_code=400, detail="Full name can only contain letters, numbers, and spaces")
    if "  " in display_name:
        raise HTTPException(status_code=400, detail="Full name cannot contain consecutive spaces")
    if bio and len(bio) > 150:
        raise HTTPException(status_code=400, detail="Bio cannot exceed 150 characters")

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
