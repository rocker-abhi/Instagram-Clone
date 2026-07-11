from app.core.config import settings


def return_tempate(email: str, username: str) -> tuple:
    application_name = settings.APP_NAME

    body = f"""Hi {username},

Congratulations! Your email address ({email}) has been successfully verified.

Your account on {application_name} is now fully activated. You can now log in, share photos and videos, and connect with friends and family.

Thank you for verifying your email!

Regards,
The {application_name} Team
"""
    subject = "Email Successfully Verified!"
    return (subject, body)
