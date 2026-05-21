from langchain_nvidia_ai_endpoints import NVIDIAEmbeddings
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

class EmbedError(Exception):
    pass

def embed_chunks(chunks: list[dict]) -> list[dict]:
    """
    Generates embeddings for a list of chunks using NVIDIA NIM.
    """
    try:
        embedder = NVIDIAEmbeddings(
            model=settings.EMBED_MODEL,
            nvidia_api_key=settings.NVIDIA_API_KEY,
            base_url=settings.NVIDIA_BASE_URL,
        )
        
        texts = [c["content"] for c in chunks]
        embeddings = embedder.embed_documents(texts)
        
        for i, chunk in enumerate(chunks):
            chunk["embedding"] = embeddings[i]
            
        return chunks
    except Exception as e:
        logger.error(f"Failed to generate embeddings: {e}")
        raise EmbedError(f"NVIDIA API error during embedding: {e}")
