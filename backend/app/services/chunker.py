from langchain_text_splitters import RecursiveCharacterTextSplitter
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

class ChunkError(Exception):
    pass

def chunk_python_files(file_paths: list[str], repo_url: str) -> list[dict]:
    """
    Reads Python files and splits them into smaller chunks.
    Returns a list of dictionaries containing content and metadata.
    """
    splitter = RecursiveCharacterTextSplitter.from_language(
        language="python",
        chunk_size=settings.CHUNK_SIZE,
        chunk_overlap=settings.CHUNK_OVERLAP,
    )
    
    chunks = []
    try:
        for path in file_paths:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
                
            file_chunks = splitter.split_text(content)
            
            # Create metadata for each chunk
            # path is absolute, make it relative to repo root for better display
            rel_path = path.split(settings.TMP_REPOS_DIR)[-1].lstrip("/")
            # remove the repo_id from the start of rel_path
            rel_path = "/".join(rel_path.split("/")[1:])
            
            for i, chunk_text in enumerate(file_chunks):
                chunks.append({
                    "content": chunk_text,
                    "metadata": {
                        "file_path": rel_path,
                        "chunk_index": i,
                        "repo_url": repo_url
                    }
                })
        return chunks
    except Exception as e:
        logger.error(f"Failed to chunk files: {e}")
        raise ChunkError(f"Failed to process source files: {e}")
