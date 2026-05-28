"""Alembic round-trip + metadata drift tests.

Catches:
- Migration that fails to upgrade
- Migration with broken downgrade
- Schema drift between SQLModel.metadata and migrations

The drift test (`test_alembic_check_no_drift`) is intentionally xfail
during Plan A1-A2: baseline is no-op so SQLModel.metadata has tables
that the migration history doesn't yet create. The xfail marker is
removed in A3.10 when the schema-creating migrations are added.
"""
import os
import subprocess
from pathlib import Path

import pytest


BACKEND_DIR = Path(__file__).resolve().parents[3]


def _run_alembic(
    args: list[str],
    db_url: str = "sqlite:///:memory:",
) -> subprocess.CompletedProcess:
    env = {**os.environ, "DATABASE_URL": db_url}
    return subprocess.run(
        ["uv", "run", "alembic"] + args,
        cwd=BACKEND_DIR,
        env=env,
        capture_output=True,
        text=True,
    )


def test_alembic_upgrade_head_succeeds():
    # [Happy] alembic upgrade head — all migrations apply cleanly
    result = _run_alembic(["upgrade", "head"])
    assert result.returncode == 0, (
        f"upgrade head failed:\nstdout={result.stdout}\nstderr={result.stderr}"
    )


@pytest.mark.xfail(
    reason=(
        "A1-A2: baseline is the only revision so `downgrade -1` cannot "
        "produce a migration. xfail is removed in A3.10 when subsequent "
        "migrations land and per-step downgrade becomes meaningful."
    ),
    strict=False,
)
def test_alembic_round_trip_upgrade_downgrade_upgrade():
    # [Boundary] upgrade head → downgrade -1 → upgrade head
    # Validates every migration has a working downgrade()
    r1 = _run_alembic(["upgrade", "head"])
    assert r1.returncode == 0, r1.stderr
    r2 = _run_alembic(["downgrade", "-1"])
    assert r2.returncode == 0, r2.stderr
    r3 = _run_alembic(["upgrade", "head"])
    assert r3.returncode == 0, r3.stderr


def test_alembic_downgrade_to_base_succeeds():
    # [Boundary] downgrade base — full reverse possible, validates
    # cross-migration assumptions
    _run_alembic(["upgrade", "head"])
    result = _run_alembic(["downgrade", "base"])
    assert result.returncode == 0, (
        f"downgrade base failed:\nstdout={result.stdout}\nstderr={result.stderr}"
    )


@pytest.mark.xfail(
    reason=(
        "A1-A2: baseline is no-op while SQLModel.metadata already declares "
        "user/account/asset tables. xfail marker is removed in A3.10 when "
        "the schema-creating migrations land."
    ),
    strict=False,
)
def test_alembic_check_no_drift():
    # [Error] alembic check — zero diff between SQLModel.metadata
    # and current migration head. Catches phantom-migration risk.
    _run_alembic(["upgrade", "head"])
    result = _run_alembic(["check"])
    assert result.returncode == 0, (
        "Schema drift between SQLModel.metadata and migrations:\n"
        f"stdout={result.stdout}\nstderr={result.stderr}"
    )
