"""rename_profile_picture_url_to_profile_picture_key

Revision ID: b1c2d3e4f567
Revises: ae0a481e7f66
Create Date: 2026-07-14

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b1c2d3e4f567'
down_revision: Union[str, Sequence[str], None] = 'ae0a481e7f66'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Rename profile_picture_url → profile_picture_key to reflect that the column
    now stores the MinIO object key, not a full URL."""
    op.alter_column(
        table_name='user_profiles',
        column_name='profile_picture_url',
        new_column_name='profile_picture_key',
        existing_type=sa.String(length=1000),
        existing_nullable=True,
        comment='MinIO object key for the user avatar image (e.g. users/{uuid}/avatar.jpg)',
        schema='user_schema',
    )


def downgrade() -> None:
    """Revert profile_picture_key → profile_picture_url."""
    op.alter_column(
        table_name='user_profiles',
        column_name='profile_picture_key',
        new_column_name='profile_picture_url',
        existing_type=sa.String(length=1000),
        existing_nullable=True,
        comment='URL path pointing to avatar image assets stored in MinIO storage',
        schema='user_schema',
    )
