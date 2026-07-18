import uuid
import logging
from sqlalchemy import select, and_
from app.core.database import db
from app.core.websocket_manager import manager
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.deleted_message import DeletedMessage
from app.websockets.schemas.message_delete import MessageDeleteSchema

logger = logging.getLogger(__name__)


class DeleteHandler:
    """
    Handles message.delete events. Deletes messages either for everyone
    or just for the calling user, and notifies online participants.
    """

    def __init__(self):
        pass

    async def handle(self, user_id: uuid.UUID, payload: MessageDeleteSchema) -> None:
        """
        Handle a message delete request.
        """
        async with db.session_factory() as session:
            # 1. Fetch message
            stmt = select(Message).where(Message.id == payload.message_id)
            result = await session.execute(stmt)
            message = result.scalar_one_or_none()

            if not message:
                logger.error("Message %s not found for deletion.", payload.message_id)
                return

            # Reject deletion if the user is not the author of the message
            if user_id != message.sender_id:
                logger.error("User %s tried to delete message %s but is not the author.", user_id, message.id)
                return

            # 2. Fetch conversation to verify user participation
            stmt = select(Conversation).where(Conversation.id == message.conversation_id)
            result = await session.execute(stmt)
            conversation = result.scalar_one_or_none()

            if not conversation:
                logger.error("Conversation %s not found for message deletion.", message.conversation_id)
                return

            # Verify participation and resolve partner_id
            if user_id == conversation.user_one_id:
                partner_id = conversation.user_two_id
            elif user_id == conversation.user_two_id:
                partner_id = conversation.user_one_id
            else:
                logger.error("User %s is not a participant in conversation %s", user_id, conversation.id)
                return

            # 3. Handle deletion type
            if payload.delete_for_everyone:
                # Only the message sender can delete for everyone
                if user_id != message.sender_id:
                    logger.error("User %s tried to delete message %s for everyone but is not the sender.", user_id, message.id)
                    return

                # Mark as deleted for everyone
                message.deleted_for_everyone = True
                message.content = None
                await session.commit()

                # Notify both participants
                event_payload = {
                    "message_id": str(message.id),
                    "conversation_id": str(message.conversation_id),
                    "delete_for_everyone": True
                }
                ws_message = {
                    "event_type": "message.delete",
                    "data": event_payload
                }

                # Send to partner if online
                partner_id_str = str(partner_id)
                if partner_id_str in manager.active_connections:
                    await manager.send_personal_message(ws_message, partner_id_str)
                    logger.info("Broadcasted message.delete for message %s to partner %s", message.id, partner_id_str)

                # Send back to sender
                user_id_str = str(user_id)
                if user_id_str in manager.active_connections:
                    await manager.send_personal_message(ws_message, user_id_str)

            else:
                # Soft delete for self only: insert a DeletedMessage entry
                stmt = select(DeletedMessage).where(
                    and_(
                        DeletedMessage.message_id == message.id,
                        DeletedMessage.user_id == user_id
                    )
                )
                result = await session.execute(stmt)
                existing = result.scalar_one_or_none()

                if not existing:
                    del_record = DeletedMessage(
                        message_id=message.id,
                        user_id=user_id
                    )
                    session.add(del_record)
                    await session.commit()

                # Notify the deleting user so their UI can remove the message
                event_payload = {
                    "message_id": str(message.id),
                    "conversation_id": str(message.conversation_id),
                    "delete_for_everyone": False
                }
                ws_message = {
                    "event_type": "message.delete",
                    "data": event_payload
                }

                user_id_str = str(user_id)
                if user_id_str in manager.active_connections:
                    await manager.send_personal_message(ws_message, user_id_str)
                    logger.info("Sent message.delete confirmation for message %s to user %s", message.id, user_id_str)
