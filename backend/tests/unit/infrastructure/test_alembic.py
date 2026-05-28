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
    """File-based SQLite URL persisted across alembic subprocess calls
    within one test. Cleaned up automatically by pytest tmp_path.
    """
    return f"sqlite:///{tmp_path / 'alembic_test.db'}"


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


@pytest.mark.xfail(
    reason=(
        "A1-A2: baseline is no-op while SQLModel.metadata already declares "
        "user/account/asset tables. xfail marker is removed in A3.10 when "
        "the schema-creating migrations land."
    ),
    strict=False,
)
def test_alembic_check_no_drift(sqlite_url):
    # [Error] alembic check against the SAME database the migrations
    # were applied to. Catches phantom-migration risk: zero diff
    # between SQLModel.metadata and the actual schema after upgrade.
    r1 = _run_alembic(["upgrade", "head"], sqlite_url)
    assert r1.returncode == 0, r1.stderr
    result = _run_alembic(["check"], sqlite_url)
    assert result.returncode == 0, (
        "Schema drift between SQLModel.metadata and migrations:\n"
        f"stdout={result.stdout}\nstderr={result.stderr}"
    )
