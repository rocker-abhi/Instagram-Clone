from typing import Optional
from pydantic import BaseModel, UUID4, field_validator
import re
import uuid
from app.enums.account_visibility import AccountVisibility


# ─────────────────────────────────────────────
# Response Schemas
# ─────────────────────────────────────────────

class UserProfileResponse(BaseModel):
    """
    Full profile response returned by GET /home-user-profile and PUT /home-user-profile.
    profile_picture_url is a pre-signed MinIO URL (valid 1 hour), or "" if no
    avatar has been uploaded yet.
    """
    user_id: UUID4
    username: str
    display_name: str
    bio: str
    profile_picture_url: str   # resolved pre-signed URL (not the raw object key)
    is_onboarding_completed: bool


class PortfolioUserProfileResponse(BaseModel):
    """
    Full profile data needed by the ProfilePage component.
    Returned by GET /portfolio-user-profile.
    """
    user_id: UUID4
    username: str
    display_name: str          # maps to fullName in the frontend
    bio: str
    website: str               # optional link shown under the bio
    profile_picture_url: str   # resolved pre-signed URL or ""
    followers_count: int
    following_count: int
    account_visibility: AccountVisibility
    following_status: Optional[str] = None


class UserMeResponse(BaseModel):
    """
    Lightweight summary returned by GET /user-profile/me.
    Contains only the three fields the frontend sidebar / navbar needs.
    """
    user_id: UUID4
    username: str
    display_name: str
    profile_picture_url: str   # resolved pre-signed URL, or ""


# ─────────────────────────────────────────────
class ProfileSetupRequest(BaseModel):
    display_name: str
    bio: Optional[str] = None

    @field_validator("display_name")
    @classmethod
    def validate_display_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 6 or len(v) > 20:
            raise ValueError("Full name must be between 6 and 20 characters")
        if not re.match(r"^[a-zA-Z0-9 ]+$", v):
            raise ValueError("Full name can only contain letters, numbers, and spaces")
        if "  " in v:
            raise ValueError("Full name cannot contain consecutive spaces")
        return v

    @field_validator("bio")
    @classmethod
    def validate_bio(cls, v: Optional[str]) -> Optional[str]:
        if v and len(v) > 150:
            raise ValueError("Bio cannot exceed 150 characters")
        return v


class UserProfileUpdateRequest(BaseModel):
    """
    Inbound schema for a partial profile update (JSON body).
    All fields are optional — only provided values are applied.
    """
    username: Optional[str] = None
    display_name: Optional[str] = None
    bio: Optional[str] = None
    is_onboarding_completed: Optional[bool] = None

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip().lower()
        if not v:
            raise ValueError("Username cannot be empty")
        if " " in v:
            raise ValueError("Username cannot contain spaces")
        if not re.match(r"^[a-zA-Z0-9._]+$", v):
            raise ValueError("Username can only use letters, numbers, underscores, and periods")
        if v.startswith(".") or v.endswith("."):
            raise ValueError("Username cannot start or end with a period")
        if ".." in v:
            raise ValueError("Username cannot contain consecutive periods")
        if len(v) < 6 or len(v) > 20:
            raise ValueError("Username must be between 6 and 20 characters")
        return v

    @field_validator("display_name")
    @classmethod
    def validate_display_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if not v:
            raise ValueError("Full name cannot be empty")
        if len(v) < 6 or len(v) > 20:
            raise ValueError("Full name must be between 6 and 20 characters")
        if not re.match(r"^[a-zA-Z0-9 ]+$", v):
            raise ValueError("Full name can only contain letters, numbers, and spaces")
        if "  " in v:
            raise ValueError("Full name cannot contain consecutive spaces")
        return v

    @field_validator("bio")
    @classmethod
    def validate_bio(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if len(v) > 150:
            raise ValueError("Bio cannot exceed 150 characters")
        return v




class PrivacySettingsResponse(BaseModel):
    account_visibility: AccountVisibility
    show_activity_status: bool

class PrivacySettingsUpdateRequest(BaseModel):
    account_visibility: Optional[AccountVisibility] = None
    show_activity_status: Optional[bool] = None


class FollowRequestResponse(BaseModel):
    id: uuid.UUID
    follower_username: str
    follower_display_name: str
    follower_profile_picture_url: str
