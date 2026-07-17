from pydantic import BaseModel
from uuid import UUID


class ReadReceiptSchema(BaseModel):
    message_id: UUID
