import logging
from app.email import password_reset_completed_template

logger = logging.getLogger(__name__)


class PasswordResetCompletedHandler:

    def __init__(self, email_service):
        self.email_service = email_service

    def handle(self, event):
        logger.info("Processing password reset completed event: %s", event)
        to = event.get("email")
        username = event.get("username")

        email_subject, email_body = (
            password_reset_completed_template.return_template(
                email=to, username=username
            )
        )

        self.email_service.send_email(to, email_subject, email_body)
        logger.info("Password reset completion notification email sent to %s", to)
