from pydantic import BaseModel
from uuid import UUID


class PresenceSchema(BaseModel):
    user_id: UUID
