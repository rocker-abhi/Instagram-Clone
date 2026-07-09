from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import db

async def get_db():
    session: AsyncSession = db.session_factory()
    try:
        yield session
    finally:
        await session.close()