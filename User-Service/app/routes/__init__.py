from fastapi import APIRouter
from app.routes.user_profile_route import router as user_profile_router

api_router = APIRouter()

api_router.include_router(user_profile_router)
api_router.include_router(user_profile_router, prefix="/user-profile")


@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "user-service"}
