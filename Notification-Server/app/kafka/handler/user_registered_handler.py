import logging
from app.email import user_register_via_email_template
from app.utils import email_verification_string_gen
from app.core.config import settings

logger = logging.getLogger(__name__)

class UserRegisteredHandler:

    def __init__(self, email_service):
        self.email_service = email_service

    def handle(self, event):

        logger.info(
            "Processing event %s",
            event
        )
        
        username = event.get("username")
        to = event.get("email")
        user_id = event.get("user_id")
        otp = event.get("otp")
        
        verification_string = email_verification_string_gen.generate_verification_url(user_id, otp)
        
        email_subject, email_body = user_register_via_email_template.return_tempate(
            verification_string,
            username
        )
        
        self.email_service.send_email(to, email_subject, email_body)\
        
        logger.debug("verification email send.")