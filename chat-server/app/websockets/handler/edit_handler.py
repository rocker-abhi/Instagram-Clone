import uuid
import logging
from datetime import datetime, timezone
from sqlalchemy import select
from app.core.database import db
from app.core.websocket_manager import manager
from app.models.conversation import Conversation
from app.models.message import Message
from app.websockets.schemas.message_edit import MessageEditSchema

logger = logging.getLogger(__name__)


class EditHandler:
    """
    Handles message.edit events. Updates the message content in database
    and broadcasts the updated content to conversation participants.
    """

    def __init__(self):
        pass

    async def handle(self, user_id: uuid.UUID, payload: MessageEditSchema) -> None:
        """
        Handle a message edit request.
        """
        async with db.session_factory() as session:
            # 1. Fetch message
            stmt = select(Message).where(Message.id == payload.message_id)
            result = await session.execute(stmt)
            message = result.scalar_one_or_none()

            if not message:
                logger.error("Message %s not found for editing.", payload.message_id)
                return

            # Verify that requesting user is the author
            if user_id != message.sender_id:
                logger.error("User %s tried to edit message %s but is not the author.", user_id, message.id)
                return

            # 2. Fetch conversation to verify participation
            stmt = select(Conversation).where(Conversation.id == message.conversation_id)
            result = await session.execute(stmt)
            conversation = result.scalar_one_or_none()

            if not conversation:
                logger.error("Conversation %s not found for message editing.", message.conversation_id)
                return

            # Verify participation and resolve partner_id
            if user_id == conversation.user_one_id:
                partner_id = conversation.user_two_id
            elif user_id == conversation.user_two_id:
                partner_id = conversation.user_one_id
            else:
                logger.error("User %s is not a participant in conversation %s", user_id, conversation.id)
                return

            # 3. Update message content
            message.content = payload.new_content
            message.is_edited = True
            message.updated_at = datetime.now(timezone.utc)
            await session.commit()

            # 4. Construct payload for participants
            event_payload = {
                "message_id": str(message.id),
                "conversation_id": str(message.conversation_id),
                "content": message.content,
                "is_edited": True,
                "updated_at": message.updated_at.isoformat()
            }
            ws_message = {
                "event_type": "message.edit",
                "data": event_payload
            }

            # Send to partner if online
            partner_id_str = str(partner_id)
            if partner_id_str in manager.active_connections:
                await manager.send_personal_message(ws_message, partner_id_str)
                logger.info("Broadcasted message.edit for message %s to partner %s", message.id, partner_id_str)

            # Send back to sender
            user_id_str = str(user_id)
            if user_id_str in manager.active_connections:
                await manager.send_personal_message(ws_message, user_id_str)
