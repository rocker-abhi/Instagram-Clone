import uuid
from fastapi import APIRouter, Depends, status

from app.routes.dependencies import get_current_user_id, get_conversation_service
from app.schemas.conversation_schema import ConversationCreateRequest, ConversationResponse, MessageResponse
from app.schemas.common_schema import APIResponse
from app.service.conversation_service import ConversationService

router = APIRouter(prefix="/conversations", tags=["Conversations"])


@router.post("", response_model=APIResponse[ConversationResponse], status_code=status.HTTP_201_CREATED)
async def create_conversation(
    payload: ConversationCreateRequest,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    service: ConversationService = Depends(get_conversation_service)
):
    """
    Create a new 1-to-1 conversation between the authenticated user and another user.
    Ensures no duplicate conversation can exist between the same pair.
    """
    return await service.create_conversation(current_user_id, payload.user_two_id)


@router.get("", response_model=APIResponse[list[ConversationResponse]])
async def list_conversations(
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    service: ConversationService = Depends(get_conversation_service)
):
    """
    Retrieve all conversations for the authenticated user.
    """
    return await service.list_user_conversations(current_user_id)


@router.get("/{conversation_id}/messages", response_model=APIResponse[list[MessageResponse]])
async def get_messages(
    conversation_id: uuid.UUID,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    service: ConversationService = Depends(get_conversation_service)
):
    """
    Retrieve message history for a specific conversation.
    """
    return await service.list_conversation_messages(conversation_id, current_user_id)

