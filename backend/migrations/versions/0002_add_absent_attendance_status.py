"""Allow teachers to record absent students explicitly.

Revision ID: 0002_absent_status
"""
from alembic import op


revision = "0002_absent_status"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    if op.get_bind().dialect.name == "postgresql":
        op.execute("ALTER TYPE attendance_record_status ADD VALUE IF NOT EXISTS 'ABSENT'")


def downgrade() -> None:
    pass
