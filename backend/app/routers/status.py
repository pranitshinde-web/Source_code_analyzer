import logging
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import Literal, List

from app.services.ingestion import IngestionService
from app.services.deps import get_chroma_client

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
async def get_status(repo_id: str):
    try:
        repo_id = repo_id.lower()
        job = IngestionService.get_job(repo_id)
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail=f"No job found for {repo_id}"
            )
            
        return StatusResponse(repo_id=repo_id, **job)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Status error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("", response_model=List[StatusResponse])
async def list_all_jobs(chroma_client = Depends(get_chroma_client)):
    try:
        jobs = IngestionService.list_jobs(chroma_client)
        return [StatusResponse(repo_id=rid, **job) for rid, job in jobs.items()]
    except Exception as e:
        logger.error(f"List jobs error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
