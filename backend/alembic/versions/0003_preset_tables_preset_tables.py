"""preset tables (Plan B1.4)

Creates `preset` and `preset_item` tables with:
- FK ondelete=CASCADE on preset.user_id → user.id
- FK ondelete=CASCADE on preset_item.preset_id → preset.id
- CHECK constraint on preset_item.category (same enum values as asset.category)

Uses CREATE TABLE IF NOT EXISTS semantics via inspector check so that
prod environments bootstrapped with SQLModel.metadata.create_all (which
would have already created these tables once PresetModel/PresetItemModel
landed in src/snowball/adapters/db/models.py at B1.3) won't conflict.

Revision ID: 0003_preset_tables
Revises: 0002_asset_constraints
Create Date: 2026-05-29
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes  # noqa: F401


revision: str = '0003_preset_tables'
down_revision: Union[str, Sequence[str], None] = '0002_asset_constraints'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Membership list — must match domain.enums.AssetCategory values.
# Mirrors 0002_asset_constraints._CATEGORY_VALUES.
_CATEGORY_VALUES = ('주식', '해외주식', '채권', '원자재', '현금', '기타')


def _table_exists(table: str) -> bool:
    inspector = sa.inspect(op.get_bind())
    return table in inspector.get_table_names()


def upgrade() -> None:
    values_sql = ", ".join(f"'{v}'" for v in _CATEGORY_VALUES)

    if not _table_exists("preset"):
        op.create_table(
            "preset",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=100), nullable=False),
            sa.Column("user_id", sa.Uuid(), nullable=False),
            sa.Column(
                "created_at", sa.DateTime(), nullable=False,
                server_default=sa.func.now(),
            ),
            sa.ForeignKeyConstraint(
                ["user_id"], ["user.id"], ondelete="CASCADE",
            ),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            "ix_preset_user_id", "preset", ["user_id"], unique=False,
        )

    if not _table_exists("preset_item"):
        op.create_table(
            "preset_item",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("preset_id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=200), nullable=False),
            sa.Column("code", sa.String(length=20), nullable=True),
            sa.Column(
                "category", sa.String(), nullable=False,
                server_default=sa.text("'주식'"),
            ),
            sa.Column(
                "target_weight", sa.Float(), nullable=False,
                server_default=sa.text("0"),
            ),
            sa.ForeignKeyConstraint(
                ["preset_id"], ["preset.id"], ondelete="CASCADE",
            ),
            sa.CheckConstraint(
                f"category IN ({values_sql})",
                name="ck_preset_item_category_enum",
            ),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            "ix_preset_item_preset_id", "preset_item", ["preset_id"], unique=False,
        )


def downgrade() -> None:
    # Drop in reverse-FK order
    if _table_exists("preset_item"):
        op.drop_index("ix_preset_item_preset_id", table_name="preset_item")
        op.drop_table("preset_item")
    if _table_exists("preset"):
        op.drop_index("ix_preset_user_id", table_name="preset")
        op.drop_table("preset")
