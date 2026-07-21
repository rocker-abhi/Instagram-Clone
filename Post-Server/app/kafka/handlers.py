import logging

logger = logging.getLogger(__name__)


class PostLikedHandler:
    """
    Handles 'post.liked' events.
    """
    def handle(self, event: dict):
        logger.info("PostLikedHandler received event: %s", event)
        # Add any business logic (e.g. database updates or statistics caching) here


class PostCommentedHandler:
    """
    Handles 'post.commented' events.
    """
    def handle(self, event: dict):
        logger.info("PostCommentedHandler received event: %s", event)


class CommentRepliedHandler:
    """
    Handles 'comment.replied' events.
    """
    def handle(self, event: dict):
        logger.info("CommentRepliedHandler received event: %s", event)
