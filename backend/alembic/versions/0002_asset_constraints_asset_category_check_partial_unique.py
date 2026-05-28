"""asset category check + partial unique (account_id, code)

Plan A3.10 — add data integrity constraints:
- CHECK constraint enforcing asset.category ∈ AssetCategory values
- partial UNIQUE index on (account_id, code) where code IS NOT NULL,
  matching the .claude/rules/snowball-domain.md invariant "ticker는
  account 내에서 유일"

Prerequisite: A2.1 audit (USER-ACTION) must verify prod data is clean
(no NULL/whitespace/empty category, no duplicate (account_id, code))
before applying this migration to prod. See audit-results-2026-05-29.md.

Revision ID: 0002_asset_constraints
Revises: 0001_baseline
Create Date: 2026-05-29
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel.sql.sqltypes  # noqa: F401


revision: str = '0002_asset_constraints'
down_revision: Union[str, Sequence[str], None] = '0001_baseline'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Membership list — must match domain.enums.AssetCategory values.
# Update this list AND the enum together if A2.1 audit surfaces new values.
_CATEGORY_VALUES = ('주식', '해외주식', '채권', '원자재', '현금', '기타')


def upgrade() -> None:
    bind = op.get_bind()
    is_sqlite = bind.dialect.name == 'sqlite'

    # CHECK constraint
    values_sql = ", ".join(f"'{v}'" for v in _CATEGORY_VALUES)
    if is_sqlite:
        # SQLite: use batch mode for ALTER (CHECK adds via table copy)
        with op.batch_alter_table("asset") as batch_op:
            batch_op.create_check_constraint(
                "ck_asset_category_enum",
                f"category IN ({values_sql})",
            )
    else:
        op.create_check_constraint(
            "ck_asset_category_enum",
            "asset",
            f"category IN ({values_sql})",
        )

    # Partial unique index — code IS NOT NULL only.
    # IF NOT EXISTS avoids conflict when prod was bootstrapped with
    # SQLModel.metadata.create_all (which also reads __table_args__ in
    # AssetModel and creates the same index). After this migration,
    # both code paths converge on the identical index definition.
    if is_sqlite:
        op.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_asset_account_code "
            "ON asset (account_id, code) WHERE code IS NOT NULL"
        )
    else:
        op.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_asset_account_code "
            "ON asset (account_id, code) WHERE code IS NOT NULL"
        )


def downgrade() -> None:
    bind = op.get_bind()
    is_sqlite = bind.dialect.name == 'sqlite'

    op.drop_index("uq_asset_account_code", table_name="asset")

    if is_sqlite:
        with op.batch_alter_table("asset") as batch_op:
            batch_op.drop_constraint("ck_asset_category_enum", type_="check")
    else:
        op.drop_constraint("ck_asset_category_enum", "asset", type_="check")
