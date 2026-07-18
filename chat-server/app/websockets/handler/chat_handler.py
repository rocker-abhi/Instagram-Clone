import uuid
import logging
import asyncio
from datetime import datetime, timezone
from sqlalchemy import select
from app.core.database import db
from app.core.websocket_manager import manager
from app.models.conversation import Conversation
from app.models.message import Message
from app.websockets.schemas.chat_message import ChatMessageSchema

logger = logging.getLogger(__name__)


class ChatHandler:
    """
    Handles chat.message events. Saves the message to the database,
    checks receiver presence, and routes the message accordingly.
    """

    def __init__(self):
        pass

    async def handle(self, sender_id: uuid.UUID, payload: ChatMessageSchema) -> None:
        """
        Handle a sent chat message.
        """
        async with db.session_factory() as session:
            # 1. Fetch conversation
            stmt = select(Conversation).where(Conversation.id == payload.conversation_id)
            result = await session.execute(stmt)
            conversation = result.scalar_one_or_none()

            if not conversation:
                logger.error("Conversation %s not found.", payload.conversation_id)
                return

            # 2. Verify sender participation and resolve receiver_id
            if sender_id == conversation.user_one_id:
                receiver_id = conversation.user_two_id
            elif sender_id == conversation.user_two_id:
                receiver_id = conversation.user_one_id
            else:
                logger.error("User %s is not a participant in conversation %s", sender_id, payload.conversation_id)
                return

            # 3. Save message to PostgreSQL
            message = Message(
                conversation_id=payload.conversation_id,
                sender_id=sender_id,
                message_type=payload.message_type,
                content=payload.content,
                reply_to_message_id=payload.reply_to_message_id,
            )
            session.add(message)
            await session.commit()

            # Update conversation last message id
            conversation.last_message_id = message.id
            await session.commit()

            # Refresh message object
            await session.refresh(message)

        # 4. Construct payload for recipient/event
        event_payload = {
            "id": str(message.id),
            "conversation_id": str(message.conversation_id),
            "sender_id": str(message.sender_id),
            "message_type": message.message_type,
            "content": message.content,
            "reply_to_message_id": str(message.reply_to_message_id) if message.reply_to_message_id else None,
            "created_at": message.created_at.isoformat(),
            "is_edited": message.is_edited,
        }

        ws_message = {
            "event_type": "chat.message",
            "data": event_payload
        }

        # 5. Route message depending on recipient presence
        receiver_id_str = str(receiver_id)
        is_receiver_online = receiver_id_str in manager.active_connections

        if is_receiver_online:
            # Send message directly via Websockets
            await manager.send_personal_message(ws_message, receiver_id_str)
            logger.info("Routed message %s directly to online user %s", message.id, receiver_id_str)
        else:
            logger.info("User %s is offline. Message %s saved to DB.", receiver_id_str, message.id)
