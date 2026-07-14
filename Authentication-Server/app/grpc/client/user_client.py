import grpc
import logging
import sys
import os
from typing import Tuple

# Add generated stubs path to sys.path to allow user_pb2_grpc to import user_pb2 correctly
stubs_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "generated"))
if stubs_path not in sys.path:
    sys.path.append(stubs_path)

import user_pb2
import user_pb2_grpc

from app.core.config import settings
from app.exceptions.infrastructure_exception import InfrastructureException

logger = logging.getLogger(__name__)


class UserServiceClient:
    """
    gRPC Client to communicate with the User Service.
    """

    def __init__(self):
        self.host = settings.USER_SERVICE_HOST_GRPC
        self.port = settings.USER_SERVICE_PORT_GRPC
        self.target = f"{self.host}:{self.port}"

    def _get_metadata(self, token: str) -> Tuple[Tuple[str, str], ...]:
        """
        Build metadata containing the Bearer access token.
        """
        return (
            ("authorization", f"Bearer {token}"),
            ("access_token", token),  # fallback support
        )

    def create_user_profile(self, user_id: str, username: str, token: str) -> user_pb2.CreateUserProfileResponse:
        """
        Call CreateUserProfile RPC.
        """
        logger.info("Calling CreateUserProfile for user_id=%s via gRPC", user_id)
        metadata = self._get_metadata(token)

        try:
            with grpc.insecure_channel(self.target) as channel:
                stub = user_pb2_grpc.UserServiceStub(channel)
                request = user_pb2.CreateUserProfileRequest(user_id=user_id, username=username)
                response = stub.CreateUserProfile(request, metadata=metadata, timeout=5.0)
                return response
        except grpc.RpcError as e:
            logger.error("gRPC CreateUserProfile failed: %s", e.details() or str(e))
            raise InfrastructureException(service="gRPC : User", message=f"CreateUserProfile failed: {e.details() or str(e)}")

    def get_user_profile(self, user_id: str, token: str) -> user_pb2.UserProfileResponse:
        """
        Call GetUserProfile RPC.
        """
        logger.info("Calling GetUserProfile for user_id=%s via gRPC", user_id)
        metadata = self._get_metadata(token)

        try:
            with grpc.insecure_channel(self.target) as channel:
                stub = user_pb2_grpc.UserServiceStub(channel)
                request = user_pb2.GetUserProfileRequest(user_id=user_id)
                response = stub.GetUserProfile(request, metadata=metadata, timeout=5.0)
                return response
        except grpc.RpcError as e:
            logger.error("gRPC GetUserProfile failed: %s", e.details() or str(e))
            raise InfrastructureException(service="gRPC : User", message=f"GetUserProfile failed: {e.details() or str(e)}")

    def get_user_id_by_username(self, username: str, token: str) -> user_pb2.GetUserIdByUsernameResponse:
        """
        Call GetUserIdByUsername RPC.
        """
        logger.info("Calling GetUserIdByUsername for username=%s via gRPC", username)
        metadata = self._get_metadata(token)

        try:
            with grpc.insecure_channel(self.target) as channel:
                stub = user_pb2_grpc.UserServiceStub(channel)
                request = user_pb2.GetUserIdByUsernameRequest(username=username)
                response = stub.GetUserIdByUsername(request, metadata=metadata, timeout=5.0)
                return response
        except grpc.RpcError as e:
            logger.error("gRPC GetUserIdByUsername failed: %s", e.details() or str(e))
            raise InfrastructureException(service="gRPC : User", message=f"GetUserIdByUsername failed: {e.details() or str(e)}")
