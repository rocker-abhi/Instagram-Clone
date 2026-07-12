import grpc
import logging
from app.utils.jwt import decode_token

logger = logging.getLogger(__name__)


class AuthInterceptor(grpc.aio.ServerInterceptor):
    """
    gRPC Server Interceptor to validate JWT tokens.
    """

    def __init__(self):
        def abort(details):
            async def terminate(ignored_request, context):
                await context.abort(grpc.StatusCode.UNAUTHENTICATED, details)
            return grpc.unary_unary_rpc_method_handler(terminate)
        self._abort = abort

    async def intercept_service(self, continuation, handler_call_details):
        metadata = dict(handler_call_details.invocation_metadata)
        auth_header = metadata.get("authorization") or metadata.get("access-token")

        if not auth_header:
            logger.warning("Unauthenticated gRPC request: Missing metadata")
            return self._abort("Missing authorization metadata")

        # Extract token
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]
        else:
            token = auth_header

        try:
            decode_token(token)
        except Exception as e:
            logger.warning("Unauthenticated gRPC request: %s", str(e))
            return self._abort(f"Invalid token: {str(e)}")

        return await continuation(handler_call_details)
