from app.core.config import settings


def return_template(email: str, username: str) -> tuple:
    application_name = settings.APP_NAME

    body = f"""Hi {username},

This is a confirmation that the password for your {application_name} account associated with the email {email} has been successfully reset.

If you performed this action, you don't need to do anything else. You can now log in using your new password.

If you did not request this password reset, please contact our support team immediately to secure your account.

Regards,
The {application_name} Team
"""
    subject = "Your Password Has Been Successfully Reset"
    return (subject, body)
