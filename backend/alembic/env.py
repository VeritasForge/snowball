"""Alembic environment configuration for snowball.

SQLModel + Alembic recipe:
- Import all model modules so metadata is populated before target_metadata
- target_metadata = SQLModel.metadata
- user_module_prefix = sqlmodel.sql.sqltypes. (renders AutoString etc. in migrations)
- render_as_batch=True (SQLite ALTER limitations)
- compare_type=True, compare_server_default=True (catch column type/default changes)

DATABASE_URL is read from env so alembic.ini stays free of secrets.
"""
import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from sqlmodel import SQLModel

from alembic import context

# Import all model modules so they register with SQLModel.metadata.
# This MUST happen before target_metadata is referenced.
import sqlmodel.sql.sqltypes  # noqa: F401
from src.snowball.adapters.db.models import (  # noqa: F401
    UserModel,
    AccountModel,
    AssetModel,
)

config = context.config

# Inject sqlalchemy.url from DATABASE_URL environment variable
db_url = os.environ.get("DATABASE_URL")
if db_url:
    config.set_main_option("sqlalchemy.url", db_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = SQLModel.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        user_module_prefix="sqlmodel.sql.sqltypes.",
        render_as_batch=True,
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            user_module_prefix="sqlmodel.sql.sqltypes.",
            render_as_batch=True,
            compare_type=True,
            compare_server_default=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
