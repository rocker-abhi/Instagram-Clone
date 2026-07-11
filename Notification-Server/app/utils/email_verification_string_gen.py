import urllib.parse


from app.core.config import settings

def generate_verification_url(user_id: str, verification_code: str) -> str:
    """
    Generate the email verification URL with user_id and verification code as query parameters.
    """
    base_url = settings.FRONTEND_URL
    params = {"user_id": str(user_id), "code": str(verification_code)}
    query_string = urllib.parse.urlencode(params)
    return f"{base_url}/verify-email?{query_string}"
