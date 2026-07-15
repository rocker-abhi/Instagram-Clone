import logging
import asyncio
import uuid
from app.core.database import db
from app.models.notification import Notification

logger = logging.getLogger(__name__)


class NotificationCreatedHandler:

    def handle(self, event):
        """
        Synchronous handler method entrypoint called by consumer.
        Dispatches async persist handler.
        """
        logger.info("Processing event: %s", event)
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(self._async_handle(event))
        except RuntimeError:
            # Fallback if no event loop is running in current thread
            asyncio.run(self._async_handle(event))

    async def _async_handle(self, event):
        """
        Asynchronously creates and persists a notification model from event.
        """
        try:
            receiver_id_str = event.get("receiver_id")
            actor_id_str = event.get("actor_id")
            type_ = event.get("type") or event.get("notification_type") or "general"
            reference_id_str = event.get("reference_id")
            message = event.get("message") or ""

            if not receiver_id_str or not actor_id_str:
                logger.warning("Event missing receiver_id or actor_id: %s", event)
                return

            async with db.session_factory() as session:
                notification = Notification(
                    receiver_id=uuid.UUID(receiver_id_str),
                    actor_id=uuid.UUID(actor_id_str),
                    type=type_,
                    reference_id=uuid.UUID(reference_id_str) if reference_id_str else None,
                    message=message,
                    is_read=False
                )
                session.add(notification)
                await session.commit()
                logger.info("Notification successfully persisted for receiver: %s", receiver_id_str)
        except Exception as e:
            logger.error("Failed to persist notification entry: %s", str(e))
