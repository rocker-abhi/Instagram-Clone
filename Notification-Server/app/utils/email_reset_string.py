import urllib.parse
from app.core.config import settings


def generate_reset_url(user_id: str, token: str) -> str:
    """
    Generate the password reset URL with user_id and token as query parameters.
    """
    base_url = settings.FRONTEND_URL
    params = {"user_id": str(user_id), "code": str(token)}
    query_string = urllib.parse.urlencode(params)
    return f"{base_url}/reset-password?{query_string}"
