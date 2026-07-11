import smtplib
from email.message import EmailMessage
from app.core.config import settings



class EmailService:

    def __init__(self):
        self.host = settings.SMTP_HOST
        self.port = settings.SMTP_PORT
        self.username = settings.SMTP_EMAIL
        self.password = settings.SMTP_PASSWORD
        self.smtp = None

    def connect(self) -> None:
        self.smtp = smtplib.SMTP(self.host, self.port)
        self.smtp.starttls()
        self.smtp.login(self.username, self.password)

    def disconnect(self) -> None:
        if self.smtp:
            self.smtp.quit()
            self.smtp = None

    def send_email(
        self,
        to_email: str,
        subject: str,
        body: str
    ) -> None:
        should_disconnect = False
        if not self.smtp:
            self.connect()
            should_disconnect = True

        try:
            message = EmailMessage()

            message["Subject"] = subject
            message["From"] = self.username
            message["To"] = to_email

            message.set_content(body)

            self.smtp.send_message(message)
        finally:
            if should_disconnect:
                self.disconnect()


email_service = EmailService()