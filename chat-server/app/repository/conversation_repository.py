import uuid
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.conversation import Conversation


class ConversationRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_conversation_by_users(self, u1: uuid.UUID, u2: uuid.UUID) -> Conversation | None:
        """
        Fetch conversation between two user IDs.
        """
        stmt = select(Conversation).where(
            and_(
                Conversation.user_one_id == u1,
                Conversation.user_two_id == u2
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def create_conversation(self, u1: uuid.UUID, u2: uuid.UUID) -> Conversation:
        """
        Create and persist a new conversation.
        """
        new_conv = Conversation(
            user_one_id=u1,
            user_two_id=u2
        )
        self.session.add(new_conv)
        await self.session.commit()
        await self.session.refresh(new_conv)
        return new_conv

    async def get_user_conversations(self, user_id: uuid.UUID) -> list[Conversation]:
        """
        Get all conversations for a user ordered by last update.
        """
        from sqlalchemy import or_
        stmt = select(Conversation).where(
            or_(
                Conversation.user_one_id == user_id,
                Conversation.user_two_id == user_id
            )
        ).order_by(Conversation.updated_at.desc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_conversation_messages(self, conversation_id: uuid.UUID) -> list[Message]:
        """
        Get all messages for a specific conversation.
        """
        from app.models.message import Message
        stmt = select(Message).where(
            Message.conversation_id == conversation_id
        ).order_by(Message.created_at.asc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
