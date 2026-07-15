from datetime import datetime

from sqlmodel import SQLModel, Field


class AutographTransfer(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    autograph_id: int = Field(foreign_key="autograph.id")
    from_user_id: int | None = Field(default=None, foreign_key="user.id")
    to_user_id: int = Field(foreign_key="user.id")
    note: str = ""
    transferred_at: datetime = Field(default_factory=datetime.utcnow)
