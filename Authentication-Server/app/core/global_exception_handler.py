import logging
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.exceptions.base_exception import ApplicationException
from app.exceptions.infrastructure_exception import InfrastructureException

logger = logging.getLogger(__name__)


def register_exception_handlers(app: FastAPI):

    @app.exception_handler(ApplicationException)
    async def application_exception_handler(
        request: Request, exc: ApplicationException
    ):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "error": {"code": exc.error_code, "message": exc.message},
            },
        )

    @app.exception_handler(InfrastructureException)
    async def infrastructure_exception_handler(
        request: Request, exc: InfrastructureException
    ):
        logger.exception("Infrastructure error: %s", exc.service, exc_info=exc)
        return JSONResponse(
            status_code=503,
            content={
                "success": False,
                "error": {
                    "code": "SERVER_001",
                    "message": "Service temporarily unavailable.",
                },
            },
        )

    @app.exception_handler(Exception)
    async def unexpected_exception_handler(request: Request, exc: Exception):
        logger.exception("Unexpected error occurred: %s", str(exc))
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "An unexpected error occurred.",
                },
            },
        )
