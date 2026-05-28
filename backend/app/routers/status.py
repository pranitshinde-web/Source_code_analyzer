import logging
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import Literal, List

from app.services.ingestion import IngestionService
from app.services.deps import get_chroma_client, get_current_user
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()

class StatusResponse(BaseModel):
    repo_id: str
    status: Literal["queued", "processing", "done", "error", "failed"]
    stage: str
    detail: str
    progress: int
    py_files: int | None = None
    chunks: int | None = None

@router.get("/{repo_id}", response_model=StatusResponse)
async def get_status(repo_id: str, current_user: User = Depends(get_current_user)):
    try:
        # Ensure repo_id is scoped to the user
        prefix = f"user_{current_user.id}__"
        repo_id = repo_id.lower()
        scoped_repo_id = repo_id if repo_id.startswith(prefix) else f"{prefix}{repo_id}"
        
        job = IngestionService.get_job(scoped_repo_id)
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail=f"No job found for {repo_id}"
            )
            
        return StatusResponse(repo_id=scoped_repo_id, **job)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Status error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("", response_model=List[StatusResponse])
async def list_all_jobs(
    chroma_client = Depends(get_chroma_client),
    current_user: User = Depends(get_current_user)
):
    try:
        jobs = IngestionService.list_jobs(chroma_client)
        # Filter jobs by user prefix
        prefix = f"user_{current_user.id}__"
        user_jobs = {rid: job for rid, job in jobs.items() if rid.startswith(prefix)}
        return [StatusResponse(repo_id=rid, **job) for rid, job in user_jobs.items()]
    except Exception as e:
        logger.error(f"List jobs error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
