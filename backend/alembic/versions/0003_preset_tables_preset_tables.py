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


def _preset_item_has_category_check() -> bool:
    """True iff preset_item already has ck_preset_item_category_enum.

    SQLite Inspector.get_check_constraints is unreliable, so read
    sqlite_master.sql directly there. Postgres works fine via inspector.
    """
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        row = bind.execute(
            sa.text(
                "SELECT sql FROM sqlite_master "
                "WHERE type='table' AND name='preset_item'"
            )
        ).first()
        if row is None:
            return False
        return "ck_preset_item_category_enum" in (row[0] or "")

    inspector = sa.inspect(bind)
    try:
        existing = {
            cc.get("name") for cc in inspector.get_check_constraints("preset_item")
        }
    except sa.exc.NoSuchTableError:
        return False
    return "ck_preset_item_category_enum" in existing


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
    elif not _preset_item_has_category_check():
        # Repair scenario: existing preset_item is missing the CHECK
        # constraint (lifespan create_all ran before PresetItemModel
        # gained __table_args__ CHECK, or a buggy intermediate build).
        # This migration MUST install it.
        #
        # CRITICAL — dirty-data safety: legacy rows may already contain
        # values outside _CATEGORY_VALUES. Blindly adding a CHECK would
        # crash mid-deploy (Postgres: ALTER fails; SQLite: batch_alter
        # table-copy fails). We pre-audit and fail fast with a clear
        # actionable error so the operator backfills BEFORE retrying.
        _audit_preset_item_category_or_raise()
        with op.batch_alter_table("preset_item") as batch_op:
            batch_op.create_check_constraint(
                "ck_preset_item_category_enum",
                f"category IN ({values_sql})",
            )


def _audit_preset_item_category_or_raise() -> None:
    """Pre-flight check before installing ck_preset_item_category_enum
    on an existing table. Raises a RuntimeError with a remediation
    runbook if dirty rows exist.

    Mirrors the asset.category audit policy from Plan A2.1 — never
    silently shift bad data into a state where a later ADD CONSTRAINT
    would crash.
    """
    bind = op.get_bind()
    values_sql = ", ".join(f"'{v}'" for v in _CATEGORY_VALUES)
    # COUNT rows that would violate the new CHECK
    invalid_count_row = bind.execute(
        sa.text(
            f"SELECT COUNT(*) FROM preset_item "
            f"WHERE category IS NULL OR category NOT IN ({values_sql})"
        )
    ).first()
    invalid_count = int(invalid_count_row[0]) if invalid_count_row else 0
    if invalid_count == 0:
        return

    # Surface a sample of bad values (capped) to aid backfill decisions
    sample_rows = bind.execute(
        sa.text(
            f"SELECT DISTINCT category FROM preset_item "
            f"WHERE category IS NULL OR category NOT IN ({values_sql}) "
            f"LIMIT 10"
        )
    ).fetchall()
    samples = ", ".join(repr(r[0]) for r in sample_rows)
    raise RuntimeError(
        f"0003 repair branch refused to add ck_preset_item_category_enum: "
        f"{invalid_count} preset_item row(s) have category outside "
        f"{list(_CATEGORY_VALUES)}. Sample values: [{samples}].\n"
        f"Backfill these rows (or extend AssetCategory + this migration's "
        f"_CATEGORY_VALUES) before re-running `alembic upgrade head`. See "
        f"backend/docs/alembic-runbook.md and audit-results template."
    )


def downgrade() -> None:
    # Drop in reverse-FK order
    if _table_exists("preset_item"):
        op.drop_index("ix_preset_item_preset_id", table_name="preset_item")
        op.drop_table("preset_item")
    if _table_exists("preset"):
        op.drop_index("ix_preset_user_id", table_name="preset")
        op.drop_table("preset")
