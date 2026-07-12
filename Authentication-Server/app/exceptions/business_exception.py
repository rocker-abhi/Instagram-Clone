from http import HTTPStatus
from app.exceptions.base_exception import ApplicationException


class UserNotFound(ApplicationException):

    def __init__(self, message="User not found."):
        super().__init__(
            message=message,
            status_code=HTTPStatus.NOT_FOUND,
            error_code="USER_NOT_FOUND",
        )

class UserAlreadyExists(ApplicationException):

    def __init__(self, message="User already exists."):
        super().__init__(
            message=message,
            status_code=HTTPStatus.CONFLICT,
            error_code="USER_ALREADY_EXISTS",
        )

class PhoneNumberAlreadyExists(ApplicationException):

    def __init__(self, message="Phone number already exists"):
        super().__init__(
            message=message,
            status_code=HTTPStatus.CONFLICT,
            error_code="PHONE_NUMBER_ALREADY_EXISTS",
        )

class EmailAlreadyExists(ApplicationException):

    def __init__(self, message="Email already exists"):
        super().__init__(
            message=message,
            status_code=HTTPStatus.CONFLICT,
            error_code="EMAIL_ALREADY_EXISTS"
        )


class InvalidVerificationCode(ApplicationException):

    def __init__(self, message="Invalid or expired verification code."):
        super().__init__(
            message=message,
            status_code=HTTPStatus.BAD_REQUEST,
            error_code="INVALID_VERIFICATION_CODE",
        )

class RepeatedPassword(ApplicationException):

    def __init__(self, message="New password cannot be the same as any of the last 3 passwords."):
        super().__init__(
            message=message,
            status_code=HTTPStatus.BAD_REQUEST,
            error_code="REPEATED_PASSWORD",
        )

class EmailNotFound(ApplicationException):

    def __init__(self, message="Email address not found."):
        super().__init__(
            message=message,
            status_code=HTTPStatus.NOT_FOUND,
            error_code="EMAIL_NOT_FOUND",
        )

class EmailNotVerified(ApplicationException):

    def __init__(self, message="Email address is not verified."):
        super().__init__(
            message=message,
            status_code=HTTPStatus.BAD_REQUEST,
            error_code="EMAIL_NOT_VERIFIED",
        )

class AccountNotVerified(ApplicationException):

    def __init__(self, message="Account is not verified."):
        super().__init__(
            message=message,
            status_code=HTTPStatus.BAD_REQUEST,
            error_code="ACCOUNT_NOT_VERIFIED",
        )

class InvalidPassword(ApplicationException):

    def __init__(self, message="Invalid password."):
        super().__init__(
            message=message,
            status_code=HTTPStatus.UNAUTHORIZED,
            error_code="INVALID_PASSWORD",
        )

class InvalidSession(ApplicationException):

    def __init__(self, message="Session is invalid or has been revoked."):
        super().__init__(
            message=message,
            status_code=HTTPStatus.UNAUTHORIZED,
            error_code="INVALID_SESSION",
        )

class SessionExpired(ApplicationException):

    def __init__(self, message="Session has expired."):
        super().__init__(
            message=message,
            status_code=HTTPStatus.UNAUTHORIZED,
            error_code="SESSION_EXPIRED",
        )

class AlreadyLoggedIn(ApplicationException):

    def __init__(self, message="User is already logged in on another device."):
        super().__init__(
            message=message,
            status_code=HTTPStatus.CONFLICT,
            error_code="ALREADY_LOGGED_IN",
        )