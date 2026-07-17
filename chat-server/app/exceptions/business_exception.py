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


class SelfConversationException(BusinessException):
    def __init__(self, message: str = "You cannot create a conversation with yourself."):
        super().__init__(
            message=message,
            status_code=HTTPStatus.BAD_REQUEST,
            error_code="SELF_CONVERSATION"
        )


class ConversationNotFoundException(BusinessException):
    def __init__(self, message: str = "Conversation was not found."):
        super().__init__(
            message=message,
            status_code=HTTPStatus.NOT_FOUND,
            error_code="CONVERSATION_NOT_FOUND"
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

