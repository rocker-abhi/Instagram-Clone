import jwt
import logging
from app.core.config import settings

from app.exceptions.business_exception import TokenExpiredException, InvalidTokenException

logger = logging.getLogger(__name__)

# Load public key
with open(settings.JWT_PUBLIC_KEY_PATH, "r") as f:
    PUBLIC_KEY = f.read()


def decode_token(token: str) -> dict:
    """
    Decode and validate a JWT access token.
    """
    try:
        payload = jwt.decode(token, PUBLIC_KEY, algorithms=["RS256"])
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("Token expired")
        raise TokenExpiredException()
    except jwt.InvalidTokenError as e:
        logger.warning("Invalid token: %s", str(e))
        raise InvalidTokenException(str(e))
