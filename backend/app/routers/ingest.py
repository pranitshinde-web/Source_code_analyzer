import logging
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel, HttpUrl, Field
from typing import Literal

from app.services.ingestion import IngestionService
from app.services.deps import get_chroma_client
from app.services.vector_store import collection_exists, delete_collection

logger = logging.getLogger(__name__)

router = APIRouter()

class IngestRequest(BaseModel):
    repo_url: HttpUrl = Field(..., examples=["https://github.com/owner/repo"])

class IngestResponse(BaseModel):
    repo_id: str
    status: Literal["queued", "already_indexed"]
    message: str

@router.post("", response_model=IngestResponse, status_code=status.HTTP_202_ACCEPTED)
async def ingest_repo(
    body: IngestRequest,
    background_tasks: BackgroundTasks,
    chroma_client = Depends(get_chroma_client)
):
    try:
        repo_url = str(body.repo_url).rstrip("/")
        repo_id = IngestionService.build_repo_id(repo_url)
        
        # Check if already indexed
        if collection_exists(chroma_client, repo_id):
            return IngestResponse(
                repo_id=repo_id,
                status="already_indexed",
                message="Repository is already indexed."
            )
            
        # Check if already running
        existing_job = IngestionService.get_job(repo_id)
        if existing_job and existing_job["status"] in ("queued", "processing"):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Ingestion already in progress.")
            
        # Queue background task
        IngestionService.update_job(repo_id, status="queued", stage="waiting", detail="Job queued", progress=0)
        background_tasks.add_task(IngestionService.run_ingestion, repo_id, repo_url, chroma_client)
        
        return IngestResponse(repo_id=repo_id, status="queued", message="Ingestion started.")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ingest error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.delete("/{repo_id}")
async def delete_repo_index(repo_id: str, chroma_client = Depends(get_chroma_client)):
    try:
        repo_id = repo_id.lower()
        if not collection_exists(chroma_client, repo_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repo not found.")
            
        delete_collection(chroma_client, repo_id)
        return {"message": f"Deleted index for {repo_id}"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
