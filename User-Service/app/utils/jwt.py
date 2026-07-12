import jwt
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)


def decode_token(token: str) -> dict:
    """
    Decode and validate a JWT access token.
    """
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("Token expired")
        raise ValueError("Token has expired")
    except jwt.InvalidTokenError as e:
        logger.warning("Invalid token: %s", str(e))
        raise ValueError("Invalid token")
