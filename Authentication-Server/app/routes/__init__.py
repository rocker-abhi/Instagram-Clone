from fastapi import APIRouter
from app.routes.auth_routes import auth_router
from app.routes.healthcheck import health_router

api_router = APIRouter()

# Include health_router within the auth_router prefix (/auth)
auth_router.include_router(health_router)

api_router.include_router(auth_router)
