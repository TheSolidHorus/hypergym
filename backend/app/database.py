from sqlmodel import SQLModel, create_engine, Session
from typing import Generator
import os

DATABASE_URL = "sqlite:///./hypergym.db"

engine = create_engine(
    DATABASE_URL, 
    echo=True, 
    connect_args={"check_same_thread": False} # Needed for SQLite
)

def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session

def init_db():
    SQLModel.metadata.create_all(engine)
