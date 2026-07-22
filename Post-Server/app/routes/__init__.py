from fastapi import APIRouter
from app.routes.post_routes import router as post_router
from app.routes.story_routes import router as story_router

api_router = APIRouter()

api_router.include_router(post_router)
api_router.include_router(post_router, prefix="/posts")
api_router.include_router(story_router)
api_router.include_router(story_router, prefix="/posts")

__all__ = ["api_router"]
