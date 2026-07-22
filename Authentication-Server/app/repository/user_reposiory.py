from sqlalchemy import select, text
from app.exceptions.infrastructure_exception import InfrastructureException
from app.models.user import User
from app.models.password_history import PasswordHistory
import uuid
import asyncio
from app.grpc.client.user_client import UserServiceClient
from app.utils.jwt import create_access_token
from datetime import timedelta


class UserRepository:

    def __init__(self, session):
        self.session = session

    async def get_user_id_by_username(self, username: str) -> uuid.UUID | None:
        try:
            system_token = create_access_token({"sub": "system"}, expires_delta=timedelta(minutes=1))
            user_client = UserServiceClient()
            response = await asyncio.to_thread(user_client.get_user_id_by_username, username, system_token)
            if response.exists:
                return uuid.UUID(response.user_id)
            return None
        except Exception as e:
            raise InfrastructureException(service="gRPC") from e

    async def get_user(self, identifier: str) -> User | None:
        try:
            stmt = select(User).where((User.email == identifier) | (User.phone == identifier))
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

    async def get_user_by_id(self, user_id: str) -> User | None:
        try:
            stmt = select(User).where(User.id == user_id)
            result = await self.session.execute(stmt)
            return result.scalar_one_or_none()
        except Exception as e:
            raise InfrastructureException(service="Database") from e

    async def create_user(self, user: User, commit: bool = True) -> User:
        try:
            self.session.add(user)
            await self.session.flush()

            # Add to password history in the same transaction
            history = PasswordHistory(
                user_id=user.id,
                password_hash=user.password_hash
            )
            self.session.add(history)

            if commit:
                await self.session.commit()
                await self.session.refresh(user)
            return user
        except Exception as e:
            if commit:
                await self.session.rollback()
            raise InfrastructureException(service="Database") from e

    async def get_password_history(self, user_id) -> list[PasswordHistory]:
        try:
            stmt = (
                select(PasswordHistory)
                .where(PasswordHistory.user_id == user_id)
                .order_by(PasswordHistory.changed_at.desc())
            )
            result = await self.session.execute(stmt)
            return list(result.scalars().all())
        except Exception as e:
            raise InfrastructureException(service="Database") from e

    async def update_password_with_history(self, user: User, new_pwd_hash: str, old_records_to_delete: list[PasswordHistory]) -> None:
        try:
            user.password_hash = new_pwd_hash
            
            # Add new password to history
            history = PasswordHistory(
                user_id=user.id,
                password_hash=new_pwd_hash
            )
            self.session.add(history)

            # Delete old records exceeding limit
            for record in old_records_to_delete:
                await self.session.delete(record)

            await self.session.commit()
        except Exception as e:
            await self.session.rollback()
            raise InfrastructureException(service="Database") from e