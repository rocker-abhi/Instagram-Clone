import uuid

from app.repository.conversation_repository import ConversationRepository
from app.schemas.conversation_schema import ConversationResponse, MessageResponse
from app.schemas.common_schema import APIResponse
from app.exceptions.business_exception import SelfConversationException, ConversationNotFoundException
from app.exceptions.infrastructure_exception import InfrastructureException


class ConversationService:
    def __init__(self, repository: ConversationRepository):
        self.repository = repository

    async def create_conversation(
        self, current_user_id: uuid.UUID, user_two_id: uuid.UUID
    ) -> APIResponse[ConversationResponse]:
        """
        Business logic to create or retrieve a 1-to-1 conversation.
        """
        if current_user_id == user_two_id:
            raise SelfConversationException()

        # Sort user IDs to match unique constraint (user_one_id, user_two_id)
        u1, u2 = sorted([current_user_id, user_two_id])

        # Check existing conversation
        existing_conv = await self.repository.get_conversation_by_users(u1, u2)
        if existing_conv:
            return APIResponse(
                success=True,
                message="Conversation retrieved successfully.",
                data=ConversationResponse.model_validate(existing_conv)
            )

        # Create new conversation
        try:
            new_conv = await self.repository.create_conversation(u1, u2)
            return APIResponse(
                success=True,
                message="Conversation created successfully.",
                data=ConversationResponse.model_validate(new_conv)
            )
        except Exception as e:
            raise InfrastructureException(
                service="PostgreSQL Database",
                message="Failed to create conversation in database."
            )

    async def list_user_conversations(self, user_id: uuid.UUID) -> APIResponse[list[ConversationResponse]]:
        """
        Get all conversations for the user.
        """
        try:
            convs = await self.repository.get_user_conversations(user_id)
            data = [ConversationResponse.model_validate(c) for c in convs]
            return APIResponse(
                success=True,
                message="Conversations list retrieved successfully.",
                data=data
            )
        except Exception as e:
            raise InfrastructureException(
                service="PostgreSQL Database",
                message=f"Failed to retrieve conversations: {str(e)}"
            )

    async def list_conversation_messages(self, conversation_id: uuid.UUID, user_id: uuid.UUID) -> APIResponse[list[MessageResponse]]:
        """
        Get message history for a conversation after validating user membership.
        """
        # Retrieve the conversation to verify ownership
        # Note: We can add an fast check or repository call
        try:
            convs = await self.repository.get_user_conversations(user_id)
            # Find the conversation
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

