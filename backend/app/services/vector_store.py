import logging
import uuid
import chromadb
from chromadb.api.models.Collection import Collection

logger = logging.getLogger(__name__)

class VectorStoreError(Exception):
    pass

def collection_exists(client: chromadb.ClientAPI, repo_id: str) -> bool:
    """Check if a collection exists for the given repo_id."""
    try:
        collections = client.list_collections()
        return any(c.name == repo_id for c in collections)
    except Exception as e:
        logger.error(f"Error checking collection existence: {e}")
        raise VectorStoreError(f"Vector store error: {e}")

def upsert_chunks(client: chromadb.ClientAPI, repo_id: str, embedded_chunks: list[dict]):
    """Insert or update chunks in the vector database."""
    try:
        collection = client.get_or_create_collection(name=repo_id)
        
        ids = [str(uuid.uuid4()) for _ in embedded_chunks]
        documents = [c["content"] for c in embedded_chunks]
        metadatas = [c["metadata"] for c in embedded_chunks]
        embeddings = [c["embedding"] for c in embedded_chunks]
        
        # Batch size limit might be an issue for very large repos, but keeping it simple for now
        collection.add(
            ids=ids,
            embeddings=embeddings,
            metadatas=metadatas,
            documents=documents
        )
    except Exception as e:
        logger.error(f"Error upserting chunks: {e}")
        raise VectorStoreError(f"Failed to store vectors: {e}")

def delete_collection(client: chromadb.ClientAPI, repo_id: str):
    """Delete a collection from the vector database."""
    try:
        client.delete_collection(name=repo_id)
    except Exception as e:
        logger.error(f"Error deleting collection: {e}")
        raise VectorStoreError(f"Failed to delete collection: {e}")
