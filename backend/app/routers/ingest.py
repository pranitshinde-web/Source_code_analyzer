import logging
import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, HttpUrl, Field
from typing import Literal, Optional
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.history import ChatSession
from app.models.user import User
from app.services.ingestion import IngestionService, run_ingestion_task
from app.services.deps import get_chroma_client, get_current_user
from app.services.vector_store import collection_exists, delete_collection
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

class IngestRequest(BaseModel):
    repo_url: HttpUrl = Field(..., examples=["https://github.com/owner/repo"])

class IngestResponse(BaseModel):
    repo_id: str
    task_id: Optional[str] = None
    status: Literal["queued", "already_indexed", "processing"]
    message: str

@router.post("", response_model=IngestResponse, status_code=status.HTTP_202_ACCEPTED)
async def ingest_repo(
    body: IngestRequest,
    chroma_client = Depends(get_chroma_client),
    current_user: User = Depends(get_current_user)
):
    try:
        repo_url = str(body.repo_url).rstrip("/")
        repo_name = IngestionService.build_repo_id(repo_url)
        repo_id = f"user_{current_user.id}__{repo_name}"
        
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
            return IngestResponse(
                repo_id=repo_id,
                status="processing",
                message="Ingestion is already in progress."
            )
            
        # Queue Celery task
        IngestionService.update_job(repo_id, status="queued", stage="waiting", detail="Job queued", progress=0)
        task = run_ingestion_task.delay(repo_id, repo_url)
        
        # Update job with task_id
        IngestionService.update_job(
            repo_id, status="queued", stage="queued", 
            detail="Enqueued in Celery", progress=2, task_id=task.id
        )
        
        return IngestResponse(
            repo_id=repo_id, 
            task_id=task.id,
            status="queued", 
            message="Ingestion started."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ingest error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.delete("/{repo_id}")
async def delete_repo(
    repo_id: str, 
    chroma_client = Depends(get_chroma_client), 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        # Prepend user_id if not already present to ensure we only delete user's own collection
        prefix = f"user_{current_user.id}__"
        repo_id = repo_id.lower()
        scoped_repo_id = repo_id if repo_id.startswith(prefix) else f"{prefix}{repo_id}"
        
        # 1. Delete vector index
        if collection_exists(chroma_client, scoped_repo_id):
            collection = chroma_client.get_collection(name=scoped_repo_id)
            coll_id = collection.id
            
            # Delete from ChromaDB
            delete_collection(chroma_client, scoped_repo_id)
            
            # Explicitly delete the directory in chroma_data/
            coll_path = os.path.join(settings.CHROMA_PERSIST_DIR, str(coll_id))
            if os.path.exists(coll_path):
                shutil.rmtree(coll_path)
            
        # 2. Delete files on disk
        repo_path = os.path.join(settings.TMP_REPOS_DIR, scoped_repo_id)
        if os.path.exists(repo_path):
            shutil.rmtree(repo_path)
            
        # 3. Delete session history
        db.query(ChatSession).filter(ChatSession.repo_id == scoped_repo_id).delete()
        db.commit()
        
        return {"message": f"Successfully deleted all data for {repo_id}"}
    except Exception as e:
        logger.error(f"Delete error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
