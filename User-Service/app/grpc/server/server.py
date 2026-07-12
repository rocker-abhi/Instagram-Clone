import sys
import os
import logging
import grpc

# Add stubs to sys.path
stubs_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "generated"))
if stubs_path not in sys.path:
    sys.path.append(stubs_path)

import user_pb2_grpc

from app.core.config import settings
from app.grpc.server.auth_service import UserGrpcService
from app.grpc.server.interceptor import AuthInterceptor

logger = logging.getLogger(__name__)


_server = None


async def start_grpc():
    """
    Start the async gRPC Server and register service handlers.
    """
    global _server
    interceptors = [AuthInterceptor()]

    _server = grpc.aio.server(
        interceptors=interceptors
    )

    user_pb2_grpc.add_UserServiceServicer_to_server(UserGrpcService(), _server)

    listen_addr = f"0.0.0.0:{settings.USER_SERVICE_PORT_GRPC}"
    _server.add_insecure_port(listen_addr)
    logger.info("Starting gRPC server on %s", listen_addr)

    await _server.start()


async def stop_grpc():
    """
    Stop the async gRPC Server.
    """
    global _server
    if _server:
        logger.info("Stopping gRPC server...")
        await _server.stop(grace=5.0)
        logger.info("gRPC server stopped.")

