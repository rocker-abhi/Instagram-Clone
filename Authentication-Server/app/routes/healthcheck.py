from fastapi import APIRouter
from app.core.config import settings

health_router = APIRouter()


@health_router.get("/health")
async def health():
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
    }
