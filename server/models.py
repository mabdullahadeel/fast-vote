from datetime import datetime
from typing import Optional, List
from uuid import uuid4 as uuid
from sqlmodel import Field, SQLModel, create_engine, Relationship

sql_file_name = "database.db"
sqlite_url = f"sqlite:///{sql_file_name}"

engine = create_engine(sqlite_url, echo=True)


def create_db_and_tables():
    SQLModel.metadata.create_all(engine)


def get_defult_uuid():
    return str(uuid())


class Vote(SQLModel, table=True):
    id: Optional[str] = Field(
        default_factory=get_defult_uuid, primary_key=True
        )
    user_id: str = Field(default=None, nullable=False)
    option_id: str = Field(
        default=None,
        foreign_key="option.id",
        nullable=False
    )
    option: "Option" = Relationship(
        back_populates="votes"
        )


class Option(SQLModel, table=True):
    id: Optional[str] = Field(
        default_factory=get_defult_uuid, primary_key=True
        )
    option_text: str
    poll_id: str = Field(
        foreign_key="poll.id",
        default=None,
    )
    poll: "Poll" = Relationship(
        back_populates="options",
        )
    votes: Optional[Vote] = Relationship(
        back_populates="option",
        sa_relationship_kwargs={"cascade": "all,delete-orphan,delete"}
        )


class Poll(SQLModel, table=True):
    id: Optional[str] = Field(
        default_factory=get_defult_uuid,
        primary_key=True,
    )
    poll_text: str = Field(default=None, min_length=1, max_length=255)
    pub_date: datetime = Field(default_factory=datetime.now)
    user_id: str = Field(default=None, nullable=False)
    options: List[Option] = Relationship(
        back_populates="poll",
        sa_relationship_kwargs={"cascade": "all,delete-orphan,delete"}
        )


class PollCreateBody(SQLModel):
    poll: str = Field(default=None, min_length=1, max_length=255)
    options: List[str] = Field(
        default=None,
        min_length=1,
        max_length=255,
        min_items=2,
        max_items=5
    )

    class Config:
        schema_extra = {
            "example": {
                "poll": "What is your favorite color?",
                "options": ["Red", "Blue", "Green", "Yellow", "Orange"]
            }
        }
