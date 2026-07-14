import sys
import os
import uuid
import logging
import grpc

# Add stubs to sys.path
stubs_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "generated"))
if stubs_path not in sys.path:
    sys.path.append(stubs_path)

import user_pb2
import user_pb2_grpc

from app.core.database import db
from app.service.auth_grpc_service import AuthGrpcService
from app.enums.account_visibility import AccountVisibility
from app.exceptions.infrastructure_exception import InfrastructureException

logger = logging.getLogger(__name__)


class UserGrpcService(user_pb2_grpc.UserServiceServicer):
    """
    gRPC Servicer handling operations from Auth Service.
    """

    async def CreateUserProfile(self, request, context):
        logger.info("gRPC CreateUserProfile received: user_id=%s, username=%s", request.user_id, request.username)
        try:
            user_uuid = uuid.UUID(request.user_id)
        except ValueError:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "Invalid user_id format")

        try:
            async with db.session_factory() as session:
                service = AuthGrpcService(session)
                await service.create_profile(user_uuid, request.username)
        except InfrastructureException as e:
            logger.error("Database infrastructure error in CreateUserProfile: %s", str(e))
            context.abort(grpc.StatusCode.UNAVAILABLE, f"User database error: {e.message}")
        except Exception as e:
            logger.error("Unexpected error in CreateUserProfile: %s", str(e))
            context.abort(grpc.StatusCode.INTERNAL, f"Internal gRPC server error: {str(e)}")

        logger.info("Successfully processed CreateUserProfile for user_id=%s", request.user_id)
        return user_pb2.CreateUserProfileResponse(success=True, message="Profile created successfully")

    async def GetUserProfile(self, request, context):
        logger.info("gRPC GetUserProfile received: user_id=%s", request.user_id)
        try:
            user_uuid = uuid.UUID(request.user_id)
        except ValueError:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "Invalid user_id format")

        try:
            async with db.session_factory() as session:
                service = AuthGrpcService(session)
                profile, privacy = await service.get_profile(user_uuid)
        except ValueError as e:
            logger.warning("Profile not found: %s", str(e))
            context.abort(grpc.StatusCode.NOT_FOUND, str(e))
        except InfrastructureException as e:
            logger.error("Database infrastructure error in GetUserProfile: %s", str(e))
            context.abort(grpc.StatusCode.UNAVAILABLE, f"User database error: {e.message}")
        except Exception as e:
            logger.error("Unexpected error in GetUserProfile: %s", str(e))
            context.abort(grpc.StatusCode.INTERNAL, f"Internal gRPC server error: {str(e)}")

        is_private = False
        if privacy:
            is_private = (privacy.account_visibility == AccountVisibility.PRIVATE)

        return user_pb2.UserProfileResponse(
            user_id=str(profile.user_id),
            username=profile.username,
            display_name=profile.display_name or "",
            bio=profile.bio or "",
            profile_picture=profile.profile_picture_url or "",
            is_private=is_private
        )

    async def GetUserIdByUsername(self, request, context):
        logger.info("gRPC GetUserIdByUsername received: username=%s", request.username)
        try:
            async with db.session_factory() as session:
                service = AuthGrpcService(session)
                user_id = await service.get_user_id_by_username(request.username)
        except InfrastructureException as e:
            logger.error("Database infrastructure error in GetUserIdByUsername: %s", str(e))
            context.abort(grpc.StatusCode.UNAVAILABLE, f"User database error: {e.message}")
        except Exception as e:
            logger.error("Unexpected error in GetUserIdByUsername: %s", str(e))
            context.abort(grpc.StatusCode.INTERNAL, f"Internal gRPC server error: {str(e)}")

        if user_id:
            return user_pb2.GetUserIdByUsernameResponse(user_id=str(user_id), exists=True)
        return user_pb2.GetUserIdByUsernameResponse(user_id="", exists=False)
