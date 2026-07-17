from pydantic import BaseModel
from uuid import UUID


class MessageDeleteSchema(BaseModel):
    message_id: UUID
    delete_for_everyone: bool = False
