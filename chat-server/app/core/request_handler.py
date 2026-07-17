import logging
import time
import uuid
from fastapi import FastAPI
from starlette.types import ASGIApp, Scope, Receive, Send
from app.core.config import settings

logger = logging.getLogger(__name__)


class HTTPLoggingMiddleware:
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        # Completely bypass non-HTTP (e.g. websocket) requests
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_id = str(uuid.uuid4())
        start_time = time.perf_counter()
        
        path = scope.get("path", "")
        method = scope.get("method", "GET")

        logger.info(
            "Incoming Request | ID: %s | %s %s",
            request_id,
            method,
            path,
        )

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                process_time = time.perf_counter() - start_time
                headers.append((b"x-process-time", f"{process_time:.4f}".encode()))
                headers.append((b"x-service-name", settings.SERVICE_NAME.encode()))
                headers.append((b"x-request-id", request_id.encode()))
                message["headers"] = headers
                
                logger.info(
                    "Outgoing Response | ID: %s | Status: %s | Time: %.4fs",
                    request_id,
                    message.get("status"),
                    process_time,
                )
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            logger.info(
                "Request Finished | ID: %s | %s %s",
                request_id,
                method,
                path,
            )


def register_middleware(app: FastAPI) -> None:
    app.add_middleware(HTTPLoggingMiddleware)

