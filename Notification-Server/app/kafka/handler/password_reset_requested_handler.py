import logging
from app.email import password_reset_request_template
from app.utils.email_reset_string import generate_reset_url

logger = logging.getLogger(__name__)


class PasswordResetRequestedHandler:

    def __init__(self, email_service):
        self.email_service = email_service

    def handle(self, event):
        logger.info("Processing password reset requested event: %s", event)
        to = event.get("email")
        username = event.get("username")
        user_id = event.get("user_id")
        token = event.get("token")

        # Generate the reset URL
        reset_url = generate_reset_url(user_id, token)

        email_subject, email_body = (
            password_reset_request_template.return_template(
                email=to, username=username, reset_url=reset_url
            )
        )

        self.email_service.send_email(to, email_subject, email_body)
        logger.info("Password reset request link email sent to %s", to)
