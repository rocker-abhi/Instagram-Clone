from fastapi import APIRouter
from app.routes.conversation_routes import router as conversation_router
from app.routes.websockets_routes import router as ws_router
from app.routes.health import router as health_router

api_router = APIRouter()

# Register health router
api_router.include_router(health_router)

# Register conversation router normally and with prefix /chat to support double prefixing from gateway
api_router.include_router(conversation_router)
api_router.include_router(conversation_router, prefix="/chat")

# Register websocket router normally
api_router.include_router(ws_router)
api_router.include_router(ws_router, prefix="/chat")

__all__ = ["api_router"]
