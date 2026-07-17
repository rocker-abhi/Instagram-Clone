import logging
from fastapi import WebSocket, HTTPException
from app.utils.jwt import decode_token
from app.exceptions.business_exception import (
    TokenExpiredException,
    InvalidTokenException,
    MissingTokenPayloadException
)

logger = logging.getLogger(__name__)


class WebSocketAuthenticator:

    async def authenticate(self, websocket: WebSocket) -> str:
        token = websocket.query_params.get("token")
        if not token:
            logger.warning("WebSocket authentication failed: Token missing query parameter")
            raise HTTPException(status_code=400, detail="Token missing")

        try:
            payload = decode_token(token)
            user_id = payload.get("sub") or payload.get("user_id")
            if not user_id:
                raise MissingTokenPayloadException()
            return str(user_id)
        except TokenExpiredException as e:
            logger.warning("WebSocket authentication failed: Token Expired")
            raise HTTPException(status_code=401, detail=e.message)
        except InvalidTokenException as e:
            logger.warning("WebSocket authentication failed: Invalid Token")
            raise HTTPException(status_code=401, detail=e.message)
        except MissingTokenPayloadException as e:
            logger.warning("WebSocket authentication failed: Missing payload identifier")
            raise HTTPException(status_code=400, detail=e.message)
        except Exception as e:
            logger.warning("WebSocket authentication failed: %s", str(e))
            raise HTTPException(status_code=403, detail="Invalid token")
