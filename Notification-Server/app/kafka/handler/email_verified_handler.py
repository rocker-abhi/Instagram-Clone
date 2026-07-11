import logging
from app.email import email_successfuly_verified_template

logger = logging.getLogger(__name__)


class EmailVerifiedHandler:

    def __init__(self, email_service):
        self.email_service = email_service

    def handle(self, event):
        logger.info("Processing email verified event: %s", event)
        to = event.get("email")
        username = event.get("username")

        email_subject, email_body = (
            email_successfuly_verified_template.return_tempate(
                email=to, username=username
            )
        )

        self.email_service.send_email(to, email_subject, email_body)
        logger.info("Success email sent to %s", to)
