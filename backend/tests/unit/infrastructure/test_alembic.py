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


def _asset_has_category_check_constraint(db_url: str) -> bool:
    """Return True iff `asset` table has the ck_asset_category_enum CHECK
    constraint. Reads sqlite_master directly because SQLite Inspector's
    get_check_constraints is unreliable across versions.

    This constraint is ONLY created by 0002_asset_constraints.upgrade().
    SQLModel.metadata.create_all does NOT emit it (no CheckConstraint in
    AssetModel.__table_args__). So presence/absence cleanly distinguishes
    "0002 ran" from "0002 was silently skipped".
    """
    return _table_sql_contains(db_url, "asset", "ck_asset_category_enum")


def _table_sql_contains(db_url: str, table: str, needle: str) -> bool:
    from sqlalchemy import create_engine, text

    engine = create_engine(db_url)
    try:
        with engine.connect() as conn:
            row = conn.execute(
                text("SELECT sql FROM sqlite_master WHERE type='table' AND name=:t"),
                {"t": table},
            ).first()
        if row is None:
            return False
        return needle in (row[0] or "")
    finally:
        engine.dispose()


def test_correct_path_stamp_baseline_then_upgrade_creates_check_constraint(tmp_path: Path):
    # [Happy] Regression for Codex stop-hook finding: "Alembic deployment
    # path can skip or fail 0002". The correct prod path is:
    #   stamp 0001_baseline → upgrade head
    # which actually runs 0002 and emits the CHECK constraint.
    from sqlalchemy import create_engine
    from sqlmodel import SQLModel
    from src.snowball.adapters.db.models import (  # noqa: F401
        UserModel, AccountModel, AssetModel,
    )

    db_url = f"sqlite:///{tmp_path / 'correct_path.db'}"

    # Existing environment: schema pre-created via create_all
    engine = create_engine(db_url)
    SQLModel.metadata.create_all(engine)
    engine.dispose()

    # Correct phase 1: stamp baseline (NOT head)
    r1 = _run_alembic(["stamp", "0001_baseline"], db_url)
    assert r1.returncode == 0, r1.stderr

    # Correct phase 2: upgrade head → 0002 actually runs
    r2 = _run_alembic(["upgrade", "head"], db_url)
    assert r2.returncode == 0, r2.stderr

    # CHECK constraint is the discriminating artifact:
    # only present when 0002 actually executed. (Head revision name
    # check is intentionally omitted — `head` changes whenever a new
    # migration is added, and the real guard is whether 0002's
    # constraint exists, not what revision label is current.)
    assert _asset_has_category_check_constraint(db_url), (
        "Correct path must create ck_asset_category_enum CHECK constraint. "
        "If absent, 0002_asset_constraints did not actually run."
    )


def test_preset_item_check_constraint_present_when_create_all_runs_first(tmp_path: Path):
    # [Boundary] Regression for Codex stop-hook finding:
    # "0003 can ship without the preset_item category CHECK constraint".
    #
    # If SQLModel.metadata.create_all runs FIRST (prod scenario where B1.3
    # model code deploys before 0003 alembic runs), then 0003's
    # `if not _table_exists("preset_item")` short-circuits the create_table
    # call. CHECK constraint must still be in place — proven by declaring
    # it in PresetItemModel.__table_args__ so create_all emits it too.
    from sqlalchemy import create_engine
    from sqlmodel import SQLModel
    from src.snowball.adapters.db.models import (  # noqa: F401
        UserModel, AccountModel, AssetModel, PresetModel, PresetItemModel,
    )

    db_url = f"sqlite:///{tmp_path / 'create_all_first.db'}"

    # Phase 0: lifespan-style bootstrap — schema via create_all
    engine = create_engine(db_url)
    SQLModel.metadata.create_all(engine)
    engine.dispose()

    # Phase 1+2: stamp baseline then upgrade — 0003 short-circuits the
    # preset_item create_table because the table already exists
    r1 = _run_alembic(["stamp", "0001_baseline"], db_url)
    assert r1.returncode == 0, r1.stderr
    r2 = _run_alembic(["upgrade", "head"], db_url)
    assert r2.returncode == 0, r2.stderr

    # Even though 0003 skipped create_table, create_all emitted the
    # CHECK constraint (PresetItemModel.__table_args__) — so the
    # invariant holds via either deployment path.
    assert _table_sql_contains(db_url, "preset_item", "ck_preset_item_category_enum"), (
        "preset_item must have ck_preset_item_category_enum CHECK regardless "
        "of whether create_all or 0003.create_table emitted the table. "
        "If absent, prod could persist invalid category values."
    )


def test_0003_repairs_preset_item_missing_check_constraint(tmp_path: Path):
    # [Error/Boundary] Regression for Codex stop-hook finding:
    # "migration still does not repair the skipped CHECK path".
    #
    # Scenario: a prior buggy environment created preset_item WITHOUT
    # the ck_preset_item_category_enum CHECK (e.g. via lifespan
    # create_all before PresetItemModel.__table_args__ shipped the
    # constraint). When 0003 runs, its `if not _table_exists` short-
    # circuit would skip create_table — and without repair logic, the
    # CHECK would never be installed. The migration MUST detect and
    # repair this state.
    from sqlalchemy import create_engine, text

    db_url = f"sqlite:///{tmp_path / 'repair_check.db'}"

    # 1. Bootstrap user table (FK target) + a preset_item table that
    #    deliberately lacks the CHECK constraint, simulating a buggy
    #    pre-fix environment.
    engine = create_engine(db_url)
    with engine.begin() as conn:
        conn.execute(text(
            "CREATE TABLE user ("
            "  id BLOB PRIMARY KEY, email VARCHAR UNIQUE, "
            "  password_hash VARCHAR, created_at DATETIME, updated_at DATETIME"
            ")"
        ))
        conn.execute(text(
            "CREATE TABLE account ("
            "  id INTEGER PRIMARY KEY, name VARCHAR, cash FLOAT, "
            "  user_id BLOB, FOREIGN KEY(user_id) REFERENCES user(id)"
            ")"
        ))
        conn.execute(text(
            "CREATE TABLE asset ("
            "  id INTEGER PRIMARY KEY, account_id INTEGER, name VARCHAR, "
            "  code VARCHAR, category VARCHAR NOT NULL DEFAULT '주식', "
            "  target_weight FLOAT, current_price FLOAT, avg_price FLOAT, quantity FLOAT, "
            "  FOREIGN KEY(account_id) REFERENCES account(id)"
            ")"
        ))
        conn.execute(text(
            "CREATE TABLE preset ("
            "  id INTEGER PRIMARY KEY, name VARCHAR, user_id BLOB, created_at DATETIME, "
            "  FOREIGN KEY(user_id) REFERENCES user(id)"
            ")"
        ))
        # Critical: NO CHECK constraint on category
        conn.execute(text(
            "CREATE TABLE preset_item ("
            "  id INTEGER PRIMARY KEY, preset_id INTEGER, name VARCHAR, "
            "  code VARCHAR, category VARCHAR NOT NULL DEFAULT '주식', target_weight FLOAT, "
            "  FOREIGN KEY(preset_id) REFERENCES preset(id)"
            ")"
        ))
    engine.dispose()

    # Confirm starting state: CHECK is ABSENT
    assert not _table_sql_contains(db_url, "preset_item", "ck_preset_item_category_enum"), (
        "Test setup precondition failed — preset_item should start without CHECK."
    )

    # 2. Run alembic up to 0003 — repair branch must install CHECK
    r1 = _run_alembic(["stamp", "0002_asset_constraints"], db_url)
    assert r1.returncode == 0, r1.stderr
    r2 = _run_alembic(["upgrade", "head"], db_url)
    assert r2.returncode == 0, r2.stderr

    # 3. Assert: CHECK is now PRESENT after 0003 ran its repair branch
    assert _table_sql_contains(db_url, "preset_item", "ck_preset_item_category_enum"), (
        "0003 must REPAIR existing preset_item missing the CHECK constraint "
        "(elif branch of upgrade()). If absent, prod can still persist invalid "
        "category values even after this migration runs."
    )


def test_wrong_path_stamp_head_silently_skips_0002_check_constraint(tmp_path: Path):
    # [Error] Negative regression: the documented footgun `alembic stamp head`
    # on an existing environment marks 0002 as already applied without
    # actually running it. CHECK constraint must be ABSENT, demonstrating
    # the silent skip the runbook warns about.
    #
    # If this test ever fails (CHECK appears after `stamp head`), our
    # mental model is wrong and the runbook + warnings need revisiting.
    from sqlalchemy import create_engine
    from sqlmodel import SQLModel
    from src.snowball.adapters.db.models import (  # noqa: F401
        UserModel, AccountModel, AssetModel,
    )

    db_url = f"sqlite:///{tmp_path / 'wrong_path.db'}"

    engine = create_engine(db_url)
    SQLModel.metadata.create_all(engine)
    engine.dispose()

    # Wrong path: stamp head (= 0002) directly, skipping the actual SQL
    r1 = _run_alembic(["stamp", "head"], db_url)
    assert r1.returncode == 0, r1.stderr

    # CHECK constraint must NOT exist — proves the documented footgun.
    # (Note: as more migrations land — e.g. 0003_preset_tables — `head`
    # advances, but the silent-skip claim is specifically about 0002's
    # CHECK constraint. That guarantee is what we assert.)
    assert not _asset_has_category_check_constraint(db_url), (
        "stamp head should silently skip 0002's CHECK constraint. "
        "If this assertion fails, the footgun warned about in the runbook "
        "no longer reproduces — re-evaluate the deployment guidance."
    )


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
