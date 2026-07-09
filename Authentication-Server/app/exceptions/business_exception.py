from http import HTTPStatus
from app.exceptions.base_exception import ApplicationException


class UserNotFound(ApplicationException):

    def __init__(self, message="User not found."):
        super().__init__(
            message=message,
            status_code=HTTPStatus.NOT_FOUND,
            error_code="USER_NOT_FOUND",
        )


class InvalidPassword(ApplicationException):

    def __init__(self, message="Invalid password."):
        super().__init__(
            message=message,
            status_code=HTTPStatus.BAD_REQUEST,
            error_code="INVALID_PASSWORD",
        )
