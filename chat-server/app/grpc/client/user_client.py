import grpc
import logging
import sys
import os
from typing import Optional

# Add generated stubs to sys.path so user_pb2_grpc can import user_pb2 correctly
stubs_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "generated"))
if stubs_path not in sys.path:
    sys.path.append(stubs_path)

import user_pb2
import user_pb2_grpc

from app.core.config import settings

logger = logging.getLogger(__name__)


class UserServiceClient:
    """
    gRPC client for the User-Service.
    The chat-server uses this to resolve user profiles (username, display_name,
    profile_picture) for conversation participants without making HTTP calls.
    """

    def __init__(self):
        self.host = settings.USER_SERVICE_HOST_GRPC
        self.port = settings.USER_SERVICE_PORT_GRPC
        self.target = f"{self.host}:{self.port}"

    def get_user_profile(self, user_id: str, token: str) -> Optional[user_pb2.UserProfileResponse]:
        """
        Call GetUserProfile RPC on the User-Service.

        Args:
            user_id: String UUID of the target user.
            token:   The caller's JWT access token — forwarded as gRPC metadata
                     so the User-Service AuthInterceptor can validate the request.

        Returns:
            UserProfileResponse with username, display_name, profile_picture fields,
            or None if the call fails.
        """
        logger.info("Calling GetUserProfile for user_id=%s via gRPC", user_id)
        metadata = (("authorization", f"Bearer {token}"),)
        try:
            with grpc.insecure_channel(self.target) as channel:
                stub = user_pb2_grpc.UserServiceStub(channel)
                request = user_pb2.GetUserProfileRequest(user_id=user_id)
                response = stub.GetUserProfile(request, metadata=metadata, timeout=5.0)
                return response
        except grpc.RpcError as e:
            logger.error(
                "gRPC GetUserProfile failed for user_id=%s: %s",
                user_id,
                e.details() if hasattr(e, "details") else str(e),
            )
            return None
        except Exception as e:
            logger.error("Unexpected error in gRPC GetUserProfile: %s", str(e))
            return None

