import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.websocket_manager import manager
from app.websockets.interceptor import WebSocketAuthenticator

import uuid
from app.websockets.event_type import EventType
from app.websockets.schemas.chat_message import ChatMessageSchema
from app.websockets.schemas.message_delete import MessageDeleteSchema
from app.websockets.schemas.message_edit import MessageEditSchema
from app.websockets.handler.chat_handler import ChatHandler
from app.websockets.handler.delete_handler import DeleteHandler
from app.websockets.handler.edit_handler import EditHandler

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Chat WebSockets"])
authenticator = WebSocketAuthenticator()
chat_handler = ChatHandler()
delete_handler = DeleteHandler()
edit_handler = EditHandler()


@router.websocket("/ws")
async def websocket_chat_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for handling real-time chat communication.
    Accepts connections, authenticates using query token parameter,
    and listens for incoming messages.
    """
    user_id = None
    user_id_str = None
    try:
        # Authenticate the incoming connection
        user_id_str = await authenticator.authenticate(websocket)
        user_id = uuid.UUID(user_id_str)
        
        # Register the connection with the manager
        await manager.connect(user_id_str, websocket)
        
        # Keep connection open and process incoming messages
        while True:
            # Receive data from client (typically JSON)
            data = await websocket.receive_json()
            
            # Simple log of received message
            logger.info("Received WebSocket data from user %s: %s", user_id_str, data)
            
            event_type = data.get("event_type")
            event_data = data.get("data")
            
            if event_type == EventType.CHAT_MESSAGE:
                try:
                    payload = ChatMessageSchema(**event_data)
                    await chat_handler.handle(user_id, payload)
                except Exception as ex:
                    logger.error("Failed to process chat message payload: %s", str(ex))
                    await websocket.send_json({
                        "error": "Invalid event data format",
                        "detail": str(ex)
                    })
            elif event_type == EventType.MESSAGE_DELETE:
                try:
                    payload = MessageDeleteSchema(**event_data)
                    await delete_handler.handle(user_id, payload)
                except Exception as ex:
                    logger.error("Failed to process message delete payload: %s", str(ex))
                    await websocket.send_json({
                        "error": "Invalid message delete data format",
                        "detail": str(ex)
                    })
            elif event_type == EventType.MESSAGE_EDIT:
                try:
                    payload = MessageEditSchema(**event_data)
                    await edit_handler.handle(user_id, payload)
                except Exception as ex:
                    logger.error("Failed to process message edit payload: %s", str(ex))
                    await websocket.send_json({
                        "error": "Invalid message edit data format",
                        "detail": str(ex)
                    })
            else:
                # Echo other message back or discard
                await websocket.send_json({
                    "status": "received",
                    "echo": data
                })

    except WebSocketDisconnect:
        logger.info("WebSocket connection disconnected for user: %s", user_id_str)
    except Exception as e:
        logger.error("Error in WebSocket handler for user %s: %s", user_id_str, str(e))
        try:
            await websocket.close(code=1008)
        except Exception:
            pass
    finally:
        if user_id_str:
            await manager.disconnect(user_id_str, websocket)

