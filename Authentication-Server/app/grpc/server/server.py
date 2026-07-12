import logging
import grpc

from app.core.config import settings

logger = logging.getLogger(__name__)


_server = None


async def start_grpc():
    """
    Start the async gRPC Server for Authentication Service.
    """
    global _server
    _server = grpc.aio.server()

    # Bind port
    listen_addr = f"0.0.0.0:{settings.AUTH_SERVICE_PORT_GRPC}"
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

