import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.core.config import settings
from app.core.database import db
from app.routes.health import router as health_router
from app.routes.websockets_routes import router as ws_router
from app.routes.conversation_routes import router as conversation_router

from app.core.global_exception_handler import register_exception_handlers
from app.core.request_handler import register_middleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Chat Service...")
    yield
    logger.info("Shutting down Chat Service...")
    await db.close()


app = FastAPI(
    title=settings.APP_NAME,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_middleware(app)
register_exception_handlers(app)

app.include_router(health_router)
app.include_router(ws_router)
app.include_router(conversation_router)


@app.get("/")
def read_root():
    return {"message": "Welcome to Instagram Chat Service API"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
