import logging
import uuid
import asyncio
from app.core.database import db
from app.models.notification import Notification

logger = logging.getLogger(__name__)


class BaseNotificationHandler:
    main_loop = None

    def _run_coroutine(self, coro):
        if BaseNotificationHandler.main_loop and BaseNotificationHandler.main_loop.is_running():
            asyncio.run_coroutine_threadsafe(coro, BaseNotificationHandler.main_loop)
        else:
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    loop.create_task(coro)
                else:
                    loop.run_until_complete(coro)
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                loop.run_until_complete(coro)

    async def _save_notification(self, receiver_id: str, actor_id: str, notif_type: str, reference_id: str, message: str):
        if receiver_id == actor_id:
            # Do not notify self
            return

        try:
            async with db.session_factory() as session:
                notif = Notification(
                    receiver_id=uuid.UUID(receiver_id),
                    actor_id=uuid.UUID(actor_id),
                    type=notif_type,
                    reference_id=uuid.UUID(reference_id) if reference_id else None,
                    message=message,
                    is_read=False
                )
                session.add(notif)
                await session.commit()
                logger.info("Saved notification of type %s for receiver %s", notif_type, receiver_id)
        except Exception as e:
            logger.error("Failed to save notification: %s", str(e))


class PostLikedNotificationHandler(BaseNotificationHandler):

    def handle(self, event: dict):
        logger.info("Handling post.liked event: %s", event)
        post_id = event.get("post_id")
        user_id = event.get("user_id")
        post_owner_id = event.get("post_owner_id")

        if not all([post_id, user_id, post_owner_id]):
            logger.error("Missing fields in post.liked event: %s", event)
            return

        self._run_coroutine(self._save_notification(
            receiver_id=post_owner_id,
            actor_id=user_id,
            notif_type="like",
            reference_id=post_id,
            message="Someone liked your post."
        ))


class PostCommentedNotificationHandler(BaseNotificationHandler):

    def handle(self, event: dict):
        logger.info("Handling post.commented event: %s", event)
        comment_id = event.get("comment_id")
        post_id = event.get("post_id")
        user_id = event.get("user_id")
        post_owner_id = event.get("post_owner_id")
        content = event.get("content", "")

        if not all([comment_id, post_id, user_id, post_owner_id]):
            logger.error("Missing fields in post.commented event: %s", event)
            return

        self._run_coroutine(self._save_notification(
            receiver_id=post_owner_id,
            actor_id=user_id,
            notif_type="comment",
            reference_id=comment_id,
            message=f"Someone commented on your post: {content}"
        ))


class CommentRepliedNotificationHandler(BaseNotificationHandler):

    def handle(self, event: dict):
        logger.info("Handling comment.replied event: %s", event)
        comment_id = event.get("comment_id")
        user_id = event.get("user_id")
        parent_comment_owner_id = event.get("parent_comment_owner_id")
        content = event.get("content", "")

        if not all([comment_id, user_id, parent_comment_owner_id]):
            logger.error("Missing fields in comment.replied event: %s", event)
            return

        self._run_coroutine(self._save_notification(
            receiver_id=parent_comment_owner_id,
            actor_id=user_id,
            notif_type="reply",
            reference_id=comment_id,
            message=f"Someone replied to your comment: {content}"
        ))
