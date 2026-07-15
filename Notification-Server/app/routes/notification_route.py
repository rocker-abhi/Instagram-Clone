import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.routes.dependencies import get_db, get_current_user_id
from app.models.notification import Notification
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class NotificationResponse(BaseModel):
    id: uuid.UUID
    receiver_id: uuid.UUID
    actor_id: uuid.UUID
    type: str
    reference_id: uuid.UUID | None
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("", response_model=list[NotificationResponse])
async def get_notifications(
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Fetch all notifications for the current authenticated user.
    """
    stmt = (
        select(Notification)
        .where(Notification.receiver_id == current_user_id)
        .order_by(Notification.created_at.desc())
    )
    result = await db_session.execute(stmt)
    notifications = result.scalars().all()
    return notifications


@router.put("/{notification_id}/read")
async def mark_as_read(
    notification_id: uuid.UUID,
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Mark a single notification as read.
    """
    stmt = (
        select(Notification)
        .where(Notification.id == notification_id)
    )
    result = await db_session.execute(stmt)
    notification = result.scalar_one_or_none()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    if notification.receiver_id != current_user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    notification.is_read = True
    await db_session.commit()
    return {"success": True, "message": "Notification marked as read."}


@router.put("/read-all")
async def mark_all_as_read(
    current_user_id: uuid.UUID = Depends(get_current_user_id),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Mark all notifications for the current user as read.
    """
    stmt = (
        update(Notification)
        .where(Notification.receiver_id == current_user_id)
        .values(is_read=True)
    )
    await db_session.execute(stmt)
    await db_session.commit()
    return {"success": True, "message": "All notifications marked as read."}
