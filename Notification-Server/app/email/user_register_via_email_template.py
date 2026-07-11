from app.core.config import settings


def return_tempate(verification_url: str, username: str) -> tuple:
    application_name = "Instagram-clone"
    expiry_minutes = settings.EMAIL_VERIFICATION_TTL // 60

    body = f"""Hi {username},

Thank you for creating an account with {application_name}.

To complete your registration, please verify your email address by clicking the link below or copying it into your browser:

{verification_url}

For your security, this verification link will expire in {expiry_minutes} minutes.

If you did not create an account with {application_name}, you can safely ignore this email. No further action is required.

Regards,
The {application_name} Team
"""
    subject = "Complete Your Email Verification"
    return (subject, body)
