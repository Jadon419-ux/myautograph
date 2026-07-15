from sqlalchemy import text
from sqlmodel import SQLModel, Session, create_engine

from app.config import settings

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
)


def _add_missing_columns() -> None:
    """Lightweight auto-migration: add any new nullable columns to existing tables.

    No Alembic is set up yet, so this covers additive schema changes (e.g. a new
    optional field) without wiping locally persisted dev data.
    """
    with engine.connect() as conn:
        for table_name, table in SQLModel.metadata.tables.items():
            existing_columns = {
                row[1] for row in conn.execute(text(f"PRAGMA table_info({table_name})"))
            }
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
