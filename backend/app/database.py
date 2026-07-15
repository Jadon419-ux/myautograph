from sqlalchemy import inspect, text
from sqlmodel import SQLModel, Session, create_engine

from app.config import settings

database_url = settings.database_url
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
engine = create_engine(database_url, connect_args=connect_args)


def _add_missing_columns() -> None:
    """Lightweight auto-migration: add any new nullable columns to existing tables.

    No Alembic is set up yet, so this covers additive schema changes (e.g. a new
    optional field) without wiping persisted data.
    """
    inspector = inspect(engine)
    with engine.connect() as conn:
        for table_name, table in SQLModel.metadata.tables.items():
            if not inspector.has_table(table_name):
                continue
            existing_columns = {col["name"] for col in inspector.get_columns(table_name)}
            for column in table.columns:
                if column.name not in existing_columns:
                    col_type = column.type.compile(engine.dialect)
                    conn.execute(
                        text(f"ALTER TABLE {table_name} ADD COLUMN {column.name} {col_type}")
                    )
        conn.commit()


def create_db_and_tables() -> None:
    SQLModel.metadata.create_all(engine)
    _add_missing_columns()


def get_session():
    with Session(engine) as session:
        yield session
