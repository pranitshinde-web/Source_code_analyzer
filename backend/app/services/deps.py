from fastapi import Request, HTTPException, status
import logging

logger = logging.getLogger(__name__)

def get_chroma_client(request: Request):
    """
    Dependency to retrieve the ChromaDB client from the FastAPI app state.
    """
    client = getattr(request.app.state, "chroma_client", None)
    if client is None:
        logger.critical("ChromaDB client missing from app.state")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Vector store is not available. Please try again later.",
        )
    return client
