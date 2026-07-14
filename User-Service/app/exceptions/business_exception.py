from http import HTTPStatus
from app.exceptions.base_exception import ApplicationException


class BusinessException(ApplicationException):
    """
    Base exception class representing custom business rule violations.
    """
    def __init__(
        self,
        message: str,
        status_code: int = HTTPStatus.BAD_REQUEST,
        error_code: str = "BUSINESS_ERROR"
    ):
        super().__init__(
            message=message,
            status_code=status_code,
            error_code=error_code
        )


class ProfileNotFound(BusinessException):
    """
    Exception thrown when a requested user profile does not exist.
    """
    def __init__(self, message: str = "Requested user profile was not found."):
        super().__init__(
            message=message,
            status_code=HTTPStatus.NOT_FOUND,
            error_code="PROFILE_NOT_FOUND"
        )


class JWTException(BusinessException):
    """
    Base exception class representing token related errors.
    """
    def __init__(
        self,
        message: str,
        status_code: int = HTTPStatus.UNAUTHORIZED,
        error_code: str = "TOKEN_ERROR"
    ):
        super().__init__(
            message=message,
            status_code=status_code,
            error_code=error_code
        )


class TokenExpiredException(JWTException):
    """
    Exception thrown when a JWT token signature has expired.
    """
    def __init__(self, message: str = "Token has expired"):
        super().__init__(
            message=message,
            error_code="TOKEN_EXPIRED"
        )


class InvalidTokenException(JWTException):
    """
    Exception thrown when a JWT token format or signature is invalid.
    """
    def __init__(self, message: str = "Invalid token"):
        super().__init__(
            message=message,
            error_code="INVALID_TOKEN"
        )


class MissingTokenPayloadException(JWTException):
    """
    Exception thrown when a required claim is absent from the JWT payload.
    """
    def __init__(self, message: str = "Token payload is missing required identifier"):
        super().__init__(
            message=message,
            error_code="MISSING_TOKEN_PAYLOAD"
        )


class InvalidUserIdFormatException(JWTException):
    """
    Exception thrown when the user ID extracted from a JWT token is not a valid UUID.
    """
    def __init__(self, message: str = "Invalid user ID format in token"):
        super().__init__(
            message=message,
            error_code="INVALID_USER_ID_FORMAT"
        )


class ProfileAlreadySetupException(BusinessException):
    """
    Exception thrown when a user attempts to set up a profile that is already completed.
    """
    def __init__(self, message: str = "Profile has already been set up."):
        super().__init__(
            message=message,
            status_code=HTTPStatus.CONFLICT,
            error_code="PROFILE_ALREADY_SETUP"
        )


class InvalidProfilePictureException(BusinessException):
    """
    Exception thrown when a profile picture payload cannot be decoded.
    """
    def __init__(self, message: str = "Invalid profile picture encoding"):
        super().__init__(
            message=message,
            status_code=HTTPStatus.UNPROCESSABLE_ENTITY,
            error_code="INVALID_PROFILE_PICTURE"
        )


class UsernameAlreadyExistsException(BusinessException):
    """
    Exception thrown when a requested username is already taken.
    """
    def __init__(self, message: str = "Username is already taken."):
        super().__init__(
            message=message,
            status_code=HTTPStatus.CONFLICT,
            error_code="USERNAME_ALREADY_TAKEN"
        )
