import logging
import time
import traceback
import json
import redis
from typing import Dict, Any, Optional

from app.services.cloner import clone_repo, CloneError
from app.services.chunker import chunk_python_files, ChunkError
from app.services.embedder import embed_chunks, EmbedError
from app.services.vector_store import upsert_chunks, VectorStoreError
from app.core.config import settings
from app.core.celery_app import celery_app

logger = logging.getLogger(__name__)

# Redis client for job status tracking
redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)

class IngestionService:
    @staticmethod
    def build_repo_id(repo_url: str) -> str:
        """
        Derive a deterministic, filesystem-safe collection name from the URL.
        """
        clean = repo_url.rstrip("/").rstrip(".git")
        parts = clean.split("/")
        owner = parts[-2].lower().replace("-", "_").replace(".", "_")
        repo  = parts[-1].lower().replace("-", "_").replace(".", "_")
        return f"{owner}__{repo}"

    @staticmethod
    def update_job(
        repo_id: str,
        *,
        status: str,
        stage: str,
        detail: str,
        progress: int,
        **extra,
    ) -> None:
        job_data = {
            "status": status,
            "stage": stage,
            "detail": detail,
            "progress": progress,
            "updated_at": time.time(),
            **extra,
        }
        redis_client.set(f"job:{repo_id}", json.dumps(job_data))

    @staticmethod
    def get_job(repo_id: str) -> Optional[Dict[str, Any]]:
        data = redis_client.get(f"job:{repo_id}")
        if data:
            return json.loads(data)
        return None

    @staticmethod
    def list_jobs(chroma_client=None) -> Dict[str, Dict[str, Any]]:
        """
        Return the list of current jobs from Redis.
        """
        jobs = {}
        keys = redis_client.keys("job:*")
        for key in keys:
            repo_id = key.split("job:")[-1]
            data = redis_client.get(key)
            if data:
                jobs[repo_id] = json.loads(data)
        
        if chroma_client:
            try:
                collections = chroma_client.list_collections()
                for c in collections:
                    if c.name not in jobs:
                        jobs[c.name] = {
                            "status": "done",
                            "stage": "complete",
                            "detail": "Restored from persistent storage",
                            "progress": 100,
                            "updated_at": time.time(),
                        }
            except Exception as e:
                logger.error(f"Error discovering collections: {e}")
        
        return jobs

@celery_app.task(bind=True, max_retries=3, default_retry_delay=60)
def run_ingestion_task(self, repo_id: str, repo_url: str) -> None:
    """
    Celery task that runs the full ingestion pipeline.
    """
    import chromadb
    chroma_client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIR)
    
    start = time.time()
    logger.info(f"[ingest:{repo_id}] Pipeline started for {repo_url}")

    try:
        # 1. Clone
        IngestionService.update_job(
            repo_id, status="processing", stage="cloning",
            detail=f"Cloning repository: {repo_url}", progress=5
        )
        _, py_files = clone_repo(repo_url, repo_id)
        
        if not py_files:
            IngestionService.update_job(
                repo_id, status="error", stage="cloning",
                detail="No Python files found in repository.", progress=0
            )
            return

        # 2. Chunk
        IngestionService.update_job(
            repo_id, status="processing", stage="chunking",
            detail=f"Found {len(py_files)} Python files. Chunking...", progress=30
        )
        chunks = chunk_python_files(py_files, repo_url=repo_url)
        
        if not chunks:
            IngestionService.update_job(
                repo_id, status="error", stage="chunking",
                detail="No chunks produced from files.", progress=0
            )
            return

        # 3. Embed
        IngestionService.update_job(
            repo_id, status="processing", stage="embedding",
            detail=f"Generated {len(chunks)} chunks. Embedding...", progress=50
        )
        embedded = embed_chunks(chunks)

        # 4. Store
        IngestionService.update_job(
            repo_id, status="processing", stage="storing",
            detail="Writing to vector store...", progress=85
        )
        upsert_chunks(chroma_client, repo_id, embedded)

        elapsed = round(time.time() - start, 1)
        IngestionService.update_job(
            repo_id, status="done", stage="complete",
            detail=f"Indexed {len(py_files)} files in {elapsed}s.",
            progress=100, py_files=len(py_files), chunks=len(chunks),
            elapsed_seconds=elapsed
        )

    except Exception as e:
        logger.error(f"[ingest:{repo_id}] Failed: {e}")
        # Retry logic for potentially transient errors (e.g. NIM API)
        if "NVIDIA" in str(e) or "connection" in str(e).lower():
            try:
                raise self.retry(exc=e)
            except Exception:
                pass # Celery handles the retry raise

        IngestionService.update_job(
            repo_id, status="error", stage="failed",
            detail=str(e), progress=0, traceback=traceback.format_exc()
        )
