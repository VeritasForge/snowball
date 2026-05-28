"""baseline (no-op)

Existing schema is assumed already created via SQLModel.metadata.create_all
in prior deployments. This baseline records the starting point so future
migrations can be linearized. On existing prod/staging DBs, run
`alembic stamp head` once after deploying this revision so subsequent
migrations apply cleanly.

Revision ID: 0001_baseline
Revises:
Create Date: 2026-05-28 23:58:37.784355

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes  # noqa: F401


# revision identifiers, used by Alembic.
revision: str = '0001_baseline'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
