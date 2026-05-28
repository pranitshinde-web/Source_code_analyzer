from sqlalchemy import Column, String, DateTime, JSON, Integer
from datetime import datetime
from app.core.database import Base

class ChatSession(Base):
    __tablename__ = "chat_sessions"

    session_id = Column(String, primary_key=True, index=True)
    repo_id = Column(String, index=True)
    user_id = Column(Integer, index=True)
    title = Column(String)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    messages = Column(JSON)  # Store list of LangChain message dicts
