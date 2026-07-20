from fastapi import APIRouter
from app.routes.post_routes import router as post_router

api_router = APIRouter()
api_router.include_router(post_router)

__all__ = ["api_router"]
