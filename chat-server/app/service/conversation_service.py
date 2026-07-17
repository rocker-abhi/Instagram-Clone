import uuid
import asyncio
import logging

from app.repository.conversation_repository import ConversationRepository
from app.schemas.conversation_schema import ConversationResponse, MessageResponse
from app.schemas.common_schema import APIResponse
from app.exceptions.business_exception import SelfConversationException, ConversationNotFoundException
from app.exceptions.infrastructure_exception import InfrastructureException
from app.grpc.client.user_client import UserServiceClient

logger = logging.getLogger(__name__)


def _enrich_conversation(conv_response: ConversationResponse, current_user_id: uuid.UUID, token: str) -> ConversationResponse:
    """
    Determine the partner UUID (the user who is NOT current_user_id) and
    fetch their profile via gRPC, returning an enriched ConversationResponse.
    Runs synchronously inside asyncio.to_thread so it doesn't block the event loop.
    """
    partner_id = (
        conv_response.user_two_id
        if conv_response.user_one_id == current_user_id
        else conv_response.user_one_id
    )

    client = UserServiceClient()
    profile = client.get_user_profile(str(partner_id), token)

    conv_response.partner_id = partner_id
    if profile:
        conv_response.partner_username = profile.username or None
        conv_response.partner_display_name = profile.display_name or None
        conv_response.partner_profile_picture = profile.profile_picture or None

    return conv_response


class ConversationService:
    def __init__(self, repository: ConversationRepository):
        self.repository = repository

    async def create_conversation(
        self, current_user_id: uuid.UUID, user_two_id: uuid.UUID, token: str
    ) -> APIResponse[ConversationResponse]:
        """
        Business logic to create or retrieve a 1-to-1 conversation.
        """
        if current_user_id == user_two_id:
            raise SelfConversationException()

        u1, u2 = sorted([current_user_id, user_two_id])

        existing_conv = await self.repository.get_conversation_by_users(u1, u2)
        if existing_conv:
            base = ConversationResponse.model_validate(existing_conv)
            enriched = await asyncio.to_thread(_enrich_conversation, base, current_user_id, token)
            return APIResponse(
                success=True,
                message="Conversation retrieved successfully.",
                data=enriched
            )

        try:
            new_conv = await self.repository.create_conversation(u1, u2)
            base = ConversationResponse.model_validate(new_conv)
            enriched = await asyncio.to_thread(_enrich_conversation, base, current_user_id, token)
            return APIResponse(
                success=True,
                message="Conversation created successfully.",
                data=enriched
            )
        except Exception as e:
            raise InfrastructureException(
                service="PostgreSQL Database",
                message="Failed to create conversation in database."
            )

    async def list_user_conversations(
        self, user_id: uuid.UUID, token: str
    ) -> APIResponse[list[ConversationResponse]]:
        """
        Get all conversations for the user, enriched with partner profile data via gRPC.
        All gRPC calls run concurrently.
        """
        try:
            convs = await self.repository.get_user_conversations(user_id)
            base_list = [ConversationResponse.model_validate(c) for c in convs]

            enriched_list = await asyncio.gather(*[
                asyncio.to_thread(_enrich_conversation, base, user_id, token)
                for base in base_list
            ])

            return APIResponse(
                success=True,
                message="Conversations list retrieved successfully.",
                data=list(enriched_list)
            )
        except Exception as e:
            logger.error("Failed to list conversations: %s", str(e))
            raise InfrastructureException(
                service="PostgreSQL Database",
                message=f"Failed to retrieve conversations: {str(e)}"
            )

    async def list_conversation_messages(
        self, conversation_id: uuid.UUID, user_id: uuid.UUID
    ) -> APIResponse[list[MessageResponse]]:
        """
        Get message history for a conversation after validating user membership.
        """
        try:
            convs = await self.repository.get_user_conversations(user_id)
            conv = next((c for c in convs if c.id == conversation_id), None)
            if not conv:
                raise ConversationNotFoundException()

            messages = await self.repository.get_conversation_messages(conversation_id)
            data = [MessageResponse.model_validate(m) for m in messages]
            return APIResponse(
                success=True,
                message="Messages retrieved successfully.",
                data=data
            )
        except ConversationNotFoundException:
            raise
        except Exception as e:
            raise InfrastructureException(
                service="PostgreSQL Database",
                message=f"Failed to retrieve messages: {str(e)}"
            )
