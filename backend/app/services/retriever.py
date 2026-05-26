import logging
import chromadb
from app.core.config import settings
from langchain_nvidia_ai_endpoints import NVIDIAEmbeddings
from app.services.reranker import get_reranker

logger = logging.getLogger(__name__)

class RetrieverError(Exception):
    pass

def retrieve_chunks(client: chromadb.ClientAPI, repo_id: str, query: str) -> list[dict]:
    """
    Retrieves relevant code chunks for a given query from ChromaDB and re-ranks them.
    """
    try:
        # We need to embed the query first to search in Chroma
        embedder = NVIDIAEmbeddings(
            model=settings.EMBED_MODEL,
            nvidia_api_key=settings.NVIDIA_API_KEY,
            base_url=settings.NVIDIA_BASE_URL,
        )
        query_embedding = embedder.embed_query(query)
        
        collection = client.get_collection(name=repo_id)
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=settings.RETRIEVAL_CANDIDATES,
        )
        
        chunks = []
        if results["documents"]:
            for i in range(len(results["documents"][0])):
                chunks.append({
                    "content": results["documents"][0][i],
                    "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                    "distance": results["distances"][0][i] if results["distances"] else 0
                })
        
        # Two-stage retrieval: Re-rank the candidates
        if chunks:
            logger.info(f"Re-ranking {len(chunks)} candidates for query: {query}")
            reranker = get_reranker()
            chunks = reranker.rerank(query, chunks)
            
        return chunks
    except Exception as e:
        logger.error(f"Error during retrieval: {e}")
        raise RetrieverError(f"Failed to retrieve relevant code: {e}")
