"""remove cached counts

Revision ID: c60f12280d7f
Revises: 40f06ddf158e
Create Date: 2026-07-19 00:29:19.937088

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c60f12280d7f'
down_revision: Union[str, Sequence[str], None] = '40f06ddf158e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_column('posts', 'like_count', schema='post_schema')
    op.drop_column('posts', 'comment_count', schema='post_schema')
    op.drop_column('posts', 'save_count', schema='post_schema')


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column('posts', sa.Column('like_count', sa.Integer(), nullable=False, server_default='0'), schema='post_schema')
    op.add_column('posts', sa.Column('comment_count', sa.Integer(), nullable=False, server_default='0'), schema='post_schema')
    op.add_column('posts', sa.Column('save_count', sa.Integer(), nullable=False, server_default='0'), schema='post_schema')
