import json
import logging
import time
from typing import AsyncGenerator

from app.core.memory import get_history, save_turn
from app.services.retriever import retrieve_chunks
from app.services.llm import stream_answer

logger = logging.getLogger(__name__)

class ChatService:
    @staticmethod
    def format_sse(event: str, data: any) -> str:
        """Format a Server-Sent Event frame. Always JSON-encode data for consistency."""
        json_data = json.dumps(data, ensure_ascii=False)
        return f"event: {event}\ndata: {json_data}\n\n"

    @staticmethod
    async def rag_stream(
        repo_id: str,
        question: str,
        session_id: str,
        chroma_client,
        user_id: int
    ) -> AsyncGenerator[str, None]:
        """Full RAG pipeline as SSE stream."""
        start_time = time.time()
        
        try:
            # 1. Retrieve
            yield ChatService.format_sse("status", {"step": "retrieving", "message": "Searching code..."})
            chunks = retrieve_chunks(chroma_client, repo_id, question)
            
            if not chunks:
                yield ChatService.format_sse("error", {"code": "NO_RESULTS", "message": "No relevant code found."})
                return

            source_files = list(dict.fromkeys(c["metadata"].get("file_path", "unknown") for c in chunks))
            
            # 2. History
            history = get_history(session_id)
            
            # 3. Generate
            yield ChatService.format_sse("status", {"step": "generating", "message": f"Answering from {len(chunks)} chunks..."})
            
            full_answer = ""
            async for token in stream_answer(question, chunks, history):
                full_answer += token
                yield ChatService.format_sse("token", token)
                
            # 4. Save
            save_turn(session_id, question, full_answer, repo_id=repo_id, user_id=user_id)
            
            # 5. Done
            elapsed = round(time.time() - start_time, 2)
            yield ChatService.format_sse("done", {
                "session_id": session_id,
                "sources": source_files,
                "elapsed": elapsed
            })
            
        except Exception as e:
            logger.error(f"Chat stream error: {e}")
            yield ChatService.format_sse("error", {"code": "STREAM_ERROR", "message": str(e)})
