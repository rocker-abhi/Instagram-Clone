from pydantic import BaseModel
from uuid import UUID


class MessageEditSchema(BaseModel):
    message_id: UUID
    new_content: str
