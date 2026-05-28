"""Alembic round-trip + metadata drift tests.

Catches:
- Migration that fails to upgrade
- Migration with broken downgrade
- Schema drift between SQLModel.metadata and migrations

**Why a file-based SQLite DB (not :memory:)**: alembic is invoked as a
subprocess for each command. With `sqlite:///:memory:`, every subprocess
gets a brand-new database, so round-trip and drift tests would never
exercise persisted state. We use a `tmp_path` SQLite file per test so
all `_run_alembic` calls inside one test share the same database.

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


def _run_alembic(args: list[str], db_url: str) -> subprocess.CompletedProcess:
    """Invoke `alembic <args>` against an explicit DATABASE_URL.

    Caller MUST pass a db_url so the test author owns persistence
    semantics (file vs in-memory). No default — :memory: produces
    surprising results across multiple subprocess invocations.
    """
    env = {**os.environ, "DATABASE_URL": db_url}
    return subprocess.run(
        ["uv", "run", "alembic"] + args,
        cwd=BACKEND_DIR,
        env=env,
        capture_output=True,
        text=True,
    )


@pytest.fixture
def sqlite_url(tmp_path: Path) -> str:
    """File-based SQLite URL with schema pre-created via
    SQLModel.metadata.create_all + stamped at baseline.

    This mirrors the prod scenario: existing deployments already have
    their schema (via create_all). alembic baseline (0001) is no-op,
    so subsequent migrations (e.g. 0002 ALTER asset) require the
    asset table to already exist. We bootstrap by calling create_all
    and then `alembic stamp 0001_baseline` so the migration history
    starts where prod starts.
    """
    db_path = tmp_path / "alembic_test.db"
    db_url = f"sqlite:///{db_path}"

    # Create schema via SQLModel.metadata (matches prod create_all path)
    from sqlalchemy import create_engine
    from sqlmodel import SQLModel
    from src.snowball.adapters.db.models import (  # noqa: F401  registers models
        UserModel,
        AccountModel,
        AssetModel,
    )

    engine = create_engine(db_url)
    SQLModel.metadata.create_all(engine)
    engine.dispose()

    # Stamp baseline so alembic considers the schema "already migrated"
    stamp = _run_alembic(["stamp", "0001_baseline"], db_url)
    assert stamp.returncode == 0, stamp.stderr

    return db_url


def test_alembic_upgrade_head_succeeds(sqlite_url):
    # [Happy] alembic upgrade head — all migrations apply cleanly
    result = _run_alembic(["upgrade", "head"], sqlite_url)
    assert result.returncode == 0, (
        f"upgrade head failed:\nstdout={result.stdout}\nstderr={result.stderr}"
    )


def test_alembic_round_trip_upgrade_downgrade_upgrade(sqlite_url):
    # [Boundary] upgrade head → downgrade -1 → upgrade head against
    # the SAME database file. Validates every migration has a working
    # downgrade() that round-trips cleanly with the same persisted state.
    #
    # Works even with a single baseline revision: after upgrade the DB
    # is stamped at 0001_baseline, so `downgrade -1` walks back to base
    # (no-op for baseline) and `upgrade head` re-stamps.
    r1 = _run_alembic(["upgrade", "head"], sqlite_url)
    assert r1.returncode == 0, r1.stderr
    r2 = _run_alembic(["downgrade", "-1"], sqlite_url)
    assert r2.returncode == 0, r2.stderr
    r3 = _run_alembic(["upgrade", "head"], sqlite_url)
    assert r3.returncode == 0, r3.stderr


def test_alembic_downgrade_to_base_succeeds(sqlite_url):
    # [Boundary] upgrade head + downgrade base against the SAME
    # database file. Without sharing state, "downgrade base" on an
    # empty DB would trivially succeed and prove nothing.
    r1 = _run_alembic(["upgrade", "head"], sqlite_url)
    assert r1.returncode == 0, r1.stderr
    result = _run_alembic(["downgrade", "base"], sqlite_url)
    assert result.returncode == 0, (
        f"downgrade base failed:\nstdout={result.stdout}\nstderr={result.stderr}"
    )


def test_existing_env_stamp_baseline_then_upgrade_applies_0002(tmp_path: Path):
    # [Boundary] Regression for Codex stop-hook finding: "Alembic deployment
    # path can skip or fail 0002". The correct prod path for an existing
    # environment is `alembic stamp 0001_baseline` (NOT head) followed by
    # `alembic upgrade head` so 0002 actually runs.
    #
    # This test asserts that path produces the CHECK constraint + partial
    # unique index. The wrong path (`stamp head`) would skip 0002 silently;
    # this test would fail if we ever regress to that behavior.
    from sqlalchemy import create_engine, inspect
    from sqlmodel import SQLModel
    from src.snowball.adapters.db.models import (  # noqa: F401
        UserModel, AccountModel, AssetModel,
    )

    db_path = tmp_path / "existing_env.db"
    db_url = f"sqlite:///{db_path}"

    # Existing environment: schema already created via create_all (no alembic yet)
    engine = create_engine(db_url)
    SQLModel.metadata.create_all(engine)

    # Correct phase 1: stamp baseline (NOT head)
    r1 = _run_alembic(["stamp", "0001_baseline"], db_url)
    assert r1.returncode == 0, r1.stderr

    # Correct phase 2: upgrade head → 0002 actually runs
    r2 = _run_alembic(["upgrade", "head"], db_url)
    assert r2.returncode == 0, r2.stderr

    # Verify 0002's index actually exists (would be absent if stamped at head)
    inspector = inspect(engine)
    asset_indexes = {idx["name"] for idx in inspector.get_indexes("asset")}
    assert "uq_asset_account_code" in asset_indexes, (
        "0002_asset_constraints must add uq_asset_account_code partial unique index. "
        "If this assertion fails, deployment path likely silently skipped 0002."
    )

    # Verify current alembic revision is at head (0002)
    r3 = _run_alembic(["current"], db_url)
    assert r3.returncode == 0, r3.stderr
    assert "0002_asset_constraints" in r3.stdout, (
        f"Expected current revision 0002_asset_constraints, got: {r3.stdout}"
    )
    engine.dispose()


def test_alembic_check_no_drift(sqlite_url):
    # [Error] alembic check against the SAME database the migrations
    # were applied to. Catches phantom-migration risk: zero diff
    # between SQLModel.metadata and the actual schema after upgrade.
    #
    # baseline (0001) is no-op, so the schema is created by
    # SQLModel.metadata.create_all at first model touch. The 0002
    # constraint migration is applied on top. We don't expect drift
    # because no NEW tables were declared after the migration history
    # is in place — Plan A only constrains existing columns.
    r1 = _run_alembic(["upgrade", "head"], sqlite_url)
    assert r1.returncode == 0, r1.stderr
    result = _run_alembic(["check"], sqlite_url)
    assert result.returncode == 0, (
        "Schema drift between SQLModel.metadata and migrations:\n"
        f"stdout={result.stdout}\nstderr={result.stderr}"
    )
