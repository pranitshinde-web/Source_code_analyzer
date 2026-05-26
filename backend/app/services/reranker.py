import logging
from functools import lru_cache
from sentence_transformers import CrossEncoder
from app.core.config import settings

logger = logging.getLogger(__name__)

class Reranker:
    def __init__(self):
        logger.info(f"Loading CrossEncoder model: {settings.CROSS_ENCODER_MODEL}")
        try:
            self.model = CrossEncoder(settings.CROSS_ENCODER_MODEL)
        except Exception as e:
            logger.error(f"Failed to load CrossEncoder model: {e}")
            self.model = None

    def rerank(self, query: str, chunks: list[dict]) -> list[dict]:
        """
        Re-ranks chunks based on their relevance to the query using a cross-encoder.
        """
        if not self.model or not chunks:
            return chunks[:settings.RERANK_TOP_K]

        try:
            # Prepare pairs for the cross-encoder
            pairs = [[query, chunk["content"]] for chunk in chunks]
            
            # Predict relevance scores
            scores = self.model.predict(pairs)
            
            # Attach scores to chunks
            for i, score in enumerate(scores):
                chunks[i]["rerank_score"] = float(score)
            
            # Sort by rerank_score in descending order
            ranked_chunks = sorted(chunks, key=lambda x: x["rerank_score"], reverse=True)
            
            return ranked_chunks[:settings.RERANK_TOP_K]
        except Exception as e:
            logger.error(f"Error during re-ranking: {e}")
            return chunks[:settings.RERANK_TOP_K]

@lru_cache(maxsize=1)
def get_reranker() -> Reranker:
    """Returns a singleton instance of the Reranker."""
    return Reranker()
