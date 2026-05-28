import logging
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.services.chat import ChatService
from app.services.deps import get_chroma_client, get_current_user
from app.services.vector_store import collection_exists
from app.core.memory import clear_session, list_sessions, get_session_full_history
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()

class ChatRequest(BaseModel):
    repo_id: str = Field(..., examples=["owner__repo"])
    question: str = Field(..., examples=["How does X work?"])
    session_id: str = Field(..., examples=["uuid-string"])

@router.post("")
async def chat(
    body: ChatRequest,
    chroma_client = Depends(get_chroma_client),
    current_user: User = Depends(get_current_user)
):
    try:
        # Prepend user_id if not already present
        prefix = f"user_{current_user.id}__"
        repo_id = body.repo_id.lower()
        scoped_repo_id = repo_id if repo_id.startswith(prefix) else f"{prefix}{repo_id}"
        
        # Check if repo exists
        if not collection_exists(chroma_client, scoped_repo_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Repository '{body.repo_id}' is not indexed or ingestion failed. Please re-ingest."
            )
            
        return StreamingResponse(
            ChatService.rag_stream(
                repo_id=scoped_repo_id,
                question=body.question,
                session_id=body.session_id,
                chroma_client=chroma_client,
                user_id=current_user.id
            ),
            media_type="text/event-stream"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/sessions")
async def get_sessions(current_user: User = Depends(get_current_user)):
    """List all chat sessions for the current user."""
    try:
        return list_sessions(user_id=current_user.id)
    except Exception as e:
        logger.error(f"List sessions error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/sessions/{session_id}")
async def get_session_history(session_id: str, current_user: User = Depends(get_current_user)):
    """Get full history for a session."""
    try:
        # Ideally, we should also verify this session belongs to the user
        return get_session_full_history(session_id)
    except Exception as e:
        logger.error(f"Get session history error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.delete("/session/{session_id}")
async def clear_chat(session_id: str, current_user: User = Depends(get_current_user)):
    try:
        success = clear_session(session_id)
        if not success:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
        return {"message": "Session cleared."}
    except Exception as e:
        logger.error(f"Clear session error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
