import logging
import time
import uuid
from fastapi import FastAPI, Request, Response
from app.core.config import settings

logger = logging.getLogger(__name__)


def register_middleware(app: FastAPI) -> None:

    @app.middleware("http")
    async def request_middleware(request: Request, call_next) -> Response:
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id

        start_time = time.perf_counter()

        logger.info(
            "Incoming Request | ID: %s | %s %s",
            request_id,
            request.method,
            request.url.path,
        )

        try:
            response = await call_next(request)

            process_time = time.perf_counter() - start_time

            logger.info(
                "Outgoing Response | ID: %s | Status: %s | Time: %.4fs",
                request_id,
                response.status_code,
                process_time,
            )

            response.headers["X-Process-Time"] = f"{process_time:.4f}"
            response.headers["X-Service-Name"] = settings.SERVICE_NAME
            response.headers["X-Request-ID"] = request_id

            return response

        finally:
            logger.info(
                "Request Finished | ID: %s | %s %s",
                request_id,
                request.method,
                request.url.path,
            )
