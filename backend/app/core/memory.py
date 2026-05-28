import logging
from datetime import datetime
from langchain_core.messages import BaseMessage, message_to_dict, messages_from_dict, HumanMessage, AIMessage
from app.core.config import settings
from app.core.database import SessionLocal
from app.models.history import ChatSession

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Database-backed session store
# ---------------------------------------------------------------------------

def get_history(session_id: str) -> list[BaseMessage]:
    """Retrieves session history from SQLite and returns LangChain message objects."""
    db = SessionLocal()
    try:
        session = db.query(ChatSession).filter(ChatSession.session_id == session_id).first()
        if session and session.messages:
            try:
                # session.messages is already a list of dicts thanks to JSON column type
                messages = messages_from_dict(session.messages)
                window_size = settings.MEMORY_WINDOW_SIZE * 2
                return messages[-window_size:]
            except Exception as e:
                logger.error(f"Failed to deserialize messages for session {session_id}: {e}")
                return []
        return []
    finally:
        db.close()

def save_turn(session_id: str, human_msg: str, ai_msg: str, repo_id: str = "unknown", user_id: int = 0) -> None:
    """Saves a single Q&A turn to SQLite."""
    db = SessionLocal()
    try:
        session = db.query(ChatSession).filter(ChatSession.session_id == session_id).first()
        
        if not session:
            title = human_msg[:50] + ("..." if len(human_msg) > 50 else "")
            session = ChatSession(
                session_id=session_id,
                repo_id=repo_id,
                user_id=user_id,
                title=title,
                messages=[]
            )
            db.add(session)
            db.flush()
        
        # Prepare new messages
        new_msgs = [HumanMessage(content=human_msg), AIMessage(content=ai_msg)]
        serialized_new = [message_to_dict(m) for m in new_msgs]
        
        # Update messages list
        current_messages = list(session.messages or [])
        session.messages = current_messages + serialized_new
        
        # Ensure updated_at is refreshed
        session.updated_at = datetime.utcnow()
        
        db.commit()
    except Exception as e:
        logger.error(f"Failed to save turn for session {session_id}: {e}")
        db.rollback()
    finally:
        db.close()

def clear_session(session_id: str) -> bool:
    db = SessionLocal()
    try:
        session = db.query(ChatSession).filter(ChatSession.session_id == session_id).first()
        if session:
            db.delete(session)
            db.commit()
            return True
        return False
    finally:
        db.close()

def list_sessions(user_id: int) -> list[dict]:
    db = SessionLocal()
    try:
        sessions = db.query(ChatSession).filter(ChatSession.user_id == user_id).order_by(ChatSession.updated_at.desc()).all()
        result = []
        for s in sessions:
            # Handle potential string type from SQLite
            u_at = s.updated_at
            if isinstance(u_at, str):
                try:
                    # Try to parse it if it's a string, or just use it as is if it's already ISO
                    u_at_str = u_at
                except:
                    u_at_str = datetime.utcnow().isoformat()
            elif isinstance(u_at, datetime):
                u_at_str = u_at.isoformat()
            else:
                u_at_str = datetime.utcnow().isoformat()

            result.append({
                "session_id": s.session_id,
                "repo_id": s.repo_id,
                "title": s.title,
                "updated_at": u_at_str
            })
        return result
    except Exception as e:
        logger.error(f"Failed to list sessions: {e}")
        return []
    finally:
        db.close()

def get_session_full_history(session_id: str) -> list[dict]:
    db = SessionLocal()
    try:
        session = db.query(ChatSession).filter(ChatSession.session_id == session_id).first()
        if session and session.messages:
            return session.messages
        return []
    finally:
        db.close()
