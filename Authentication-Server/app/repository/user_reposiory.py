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

    async def get_user_by_email(self, email: str) -> User | None:
        try:
            stmt = select(User).where(User.email == email)
            result = await self.session.execute(stmt)
            return result.scalar_one_or_none()
        except Exception as e:
            raise InfrastructureException(service="Database") from e

    async def get_user_by_phone(self, phone: str) -> User | None:
        try:
            stmt = select(User).where(User.phone == phone)
            result = await self.session.execute(stmt)
            return result.scalar_one_or_none()
        except Exception as e:
            raise InfrastructureException(service="Database") from e

    async def get_user_by_username(self, username: str) -> User | None:
        try:
            stmt = select(User).where(User.username == username)
            result = await self.session.execute(stmt)
            return result.scalar_one_or_none()
        except Exception as e:
            raise InfrastructureException(service="Database") from e

    async def create_user(self, user: User) -> User:
        try:
            self.session.add(user)
            await self.session.commit()
            await self.session.refresh(user)
            return user
        except Exception as e:
            raise InfrastructureException(service="Database") from e