import logging
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from fastapi.exceptions import RequestValidationError
from app.exceptions.base_exception import ApplicationException
from app.exceptions.business_exception import JWTException
from app.exceptions.infrastructure_exception import InfrastructureException

logger = logging.getLogger(__name__)


def register_exception_handlers(app: FastAPI):

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ):
        errors = []
        for error in exc.errors():
            loc = " -> ".join(str(x) for x in error.get("loc", []))
            msg = error.get("msg", "Unknown error")
            errors.append(f"{loc}: {msg}")

        error_msg = "; ".join(errors)
        logger.warning("Validation failed: %s", error_msg)

        return JSONResponse(
            status_code=422,
            content={
                "success": False,
                "message": f"Validation failed: {error_msg}",
                "data": {
                    "code": "VALIDATION_ERROR",
                    "details": exc.errors(),
                },
            },
        )

    # ------------------------------------------------------------------ #
    # JWT / Auth errors — must be registered BEFORE ApplicationException  #
    # so FastAPI resolves the more-specific subclass first.               #
    # ------------------------------------------------------------------ #
    @app.exception_handler(JWTException)
    async def jwt_exception_handler(
        request: Request, exc: JWTException
    ):
        logger.warning(
            "JWT auth failure [%s] on %s %s — %s",
            exc.error_code,
            request.method,
            request.url.path,
            exc.message,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "message": exc.message,
                "data": {"code": exc.error_code},
            },
        )

    # ------------------------------------------------------------------ #
    # General business-logic errors                                       #
    # ------------------------------------------------------------------ #
    @app.exception_handler(ApplicationException)
    async def application_exception_handler(
        request: Request, exc: ApplicationException
    ):
        logger.warning(
            "Business exception [%s] on %s %s — %s",
            exc.error_code,
            request.method,
            request.url.path,
            exc.message,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "message": exc.message,
                "data": {"code": exc.error_code},
            },
        )

    # ------------------------------------------------------------------ #
    # Infrastructure / dependency errors                                  #
    # ------------------------------------------------------------------ #
    @app.exception_handler(InfrastructureException)
    async def infrastructure_exception_handler(
        request: Request, exc: InfrastructureException
    ):
        logger.exception("Infrastructure error: %s", exc.service, exc_info=exc)
        return JSONResponse(
            status_code=503,
            content={
                "success": False,
                "message": "Service temporarily unavailable.",
                "data": {"code": "SERVER_001", "service": exc.service},
            },
        )

    # ------------------------------------------------------------------ #
    # Catch-all for anything else                                         #
    # ------------------------------------------------------------------ #
    @app.exception_handler(Exception)
    async def unexpected_exception_handler(request: Request, exc: Exception):
        logger.exception(
            "Unexpected error on %s %s: %s",
            request.method,
            request.url.path,
            str(exc),
        )
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "An unexpected error occurred.",
                "data": {"code": "INTERNAL_SERVER_ERROR"},
            },
        )
