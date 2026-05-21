import logging
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.services.chat import ChatService
from app.services.deps import get_chroma_client
from app.services.vector_store import collection_exists
from app.core.memory import clear_session

logger = logging.getLogger(__name__)

router = APIRouter()

class ChatRequest(BaseModel):
    repo_id: str = Field(..., examples=["owner__repo"])
    question: str = Field(..., examples=["How does X work?"])
    session_id: str = Field(..., examples=["uuid-string"])

@router.post("")
async def chat(
    body: ChatRequest,
    chroma_client = Depends(get_chroma_client)
):
    try:
        repo_id = body.repo_id.lower()
        # Check if repo exists
        if not collection_exists(chroma_client, repo_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Repository not indexed."
            )
            
        return StreamingResponse(
            ChatService.rag_stream(
                repo_id=repo_id,
                question=body.question,
                session_id=body.session_id,
                chroma_client=chroma_client
            ),
            media_type="text/event-stream"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.delete("/session/{session_id}")
async def clear_chat(session_id: str):
    try:
        success = clear_session(session_id)
        if not success:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
        return {"message": "Session cleared."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Clear session error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
