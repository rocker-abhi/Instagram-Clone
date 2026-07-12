from app.exceptions.base_exception import ApplicationException
from http import HTTPStatus

class InfrastructureException(ApplicationException):

    def __init__(
        self,
        service: str,
        message="Service temporarily unavailable."
    ):
        super().__init__(
            message=message,
            status_code=HTTPStatus.SERVICE_UNAVAILABLE,
            error_code="SERVER_001"
        )

        self.service = service
