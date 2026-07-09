from sqlalchemy import select
from app.exceptions.infrastructure_exception import InfrastructureException
from app.models.user import User


class UserRepository:

    def __init__(self, session):
        self.session = session

    async def get_user(self, login_type: str, identifier: str) -> User | None:
        try:
            if login_type == "email":
                stmt = select(User).where(User.email == identifier)
            elif login_type == "phone":
                stmt = select(User).where(User.phone == identifier)
            else:
                stmt = select(User).where(User.username == identifier)

            result = await self.session.execute(stmt)
            return result.scalar_one_or_none()
        except Exception as e:
            raise InfrastructureException(
                service="Database", message=f"Failed to query database: {str(e)}"
            ) from e