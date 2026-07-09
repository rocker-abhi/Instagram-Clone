from sqlalchemy import select
from app.exceptions.infrastructure_exception import InfrastructureException
from app.models.user import User


class UserRepository:

    def __init__(self, session):
        self.session = session

    async def get_user(self, identifier: str) -> User | None:
        try:
            stmt = select(User).where(User.username.ilike(f"%{identifier}%"))
            result = await self.session.execute(stmt)
            return result.scalar_one_or_none()
        except Exception as e:
            raise InfrastructureException(service="Database") from e