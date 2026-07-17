import logging
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages active WebSocket connections per user ID.
    Supports multiple connections per user (e.g. multi-tab sessions).
    """

    def __init__(self):
        # Maps user_id (str) to a list of active WebSocket connections
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket) -> None:
        """
        Accept a WebSocket connection and register it under the user's ID.
        """
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        logger.info(
            "WebSocket connected for user %s. Active connections: %d",
            user_id,
            len(self.active_connections[user_id]),
        )

    def disconnect(self, user_id: str, websocket: WebSocket) -> None:
        """
        Remove a WebSocket connection for a given user.
        """
        if user_id in self.active_connections:
            try:
                self.active_connections[user_id].remove(websocket)
                logger.info(
                    "WebSocket disconnected for user %s. Remaining: %d",
                    user_id,
                    len(self.active_connections[user_id]),
                )
                if not self.active_connections[user_id]:
                    del self.active_connections[user_id]
            except ValueError:
                pass

    async def send_personal_message(self, message: dict, user_id: str) -> None:
        """
        Send a JSON message to all active WebSockets of a specific user.
        """
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(
                        "Error sending message to user %s: %s", user_id, str(e)
                    )

    async def broadcast(self, message: dict) -> None:
        """
        Broadcast a JSON message to all active WebSocket connections across all users.
        """
        for user_id, connections in list(self.active_connections.items()):
            for connection in connections:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(
                        "Error broadcasting message to user %s: %s",
                        user_id,
                        str(e),
                    )


# Singleton connection manager instance
manager = ConnectionManager()
