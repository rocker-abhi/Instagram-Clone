from app.exceptions.base_exception import ApplicationException


class JWTException(ApplicationException):
    def __init__(
        self,
        message: str = "JWT Authentication failed.",
        status_code: int = 401,
        error_code: str = "JWT_AUTH_FAILED"
    ):
        super().__init__(
            message=message,
            status_code=status_code,
            error_code=error_code
        )


class TokenExpiredException(JWTException):
    def __init__(self, message: str = "Token has expired."):
        super().__init__(
            message=message,
            status_code=401,
            error_code="TOKEN_EXPIRED"
        )


class InvalidTokenException(JWTException):
    def __init__(self, message: str = "Invalid token provided."):
        super().__init__(
            message=message,
            status_code=401,
            error_code="INVALID_TOKEN"
        )


class MissingTokenPayloadException(JWTException):
    def __init__(self, message: str = "Token payload is missing required user claims."):
        super().__init__(
            message=message,
            status_code=401,
            error_code="MISSING_TOKEN_PAYLOAD"
        )


class InvalidUserIdFormatException(JWTException):
    def __init__(self, message: str = "User ID in token is not a valid UUID format."):
        super().__init__(
            message=message,
            status_code=401,
            error_code="INVALID_USER_ID_FORMAT"
        )


class PostNotFoundException(ApplicationException):
    def __init__(self, message: str = "Requested post was not found."):
        super().__init__(
            message=message,
            status_code=404,
            error_code="POST_NOT_FOUND"
        )


class PostValidationException(ApplicationException):
    def __init__(self, message: str = "Post validation error."):
        super().__init__(
            message=message,
            status_code=400,
            error_code="POST_VALIDATION_ERROR"
        )


class UnauthorizedPostAccessException(ApplicationException):
    def __init__(self, message: str = "You do not have permission to modify this post."):
        super().__init__(
            message=message,
            status_code=403,
            error_code="UNAUTHORIZED_POST_ACCESS"
        )
