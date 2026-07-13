from sqlmodel import SQLModel, Field


class ManagerRoster(SQLModel, table=True):
    manager_id: int = Field(foreign_key="user.id", primary_key=True)
    celebrity_id: int = Field(foreign_key="celebrityprofile.id", primary_key=True)
