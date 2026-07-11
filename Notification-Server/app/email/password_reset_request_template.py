from app.core.config import settings


def return_template(email: str, username: str, reset_url: str) -> tuple:
    application_name = settings.APP_NAME

    body = f"""Hi {username},

We received a request to reset the password for your {application_name} account associated with the email {email}.

To reset your password, please click on the link below:
{reset_url}

If you did not request this change, please ignore this email. Your password will remain unchanged.

Regards,
The {application_name} Team
"""
    subject = "Reset Your Password"
    return (subject, body)
