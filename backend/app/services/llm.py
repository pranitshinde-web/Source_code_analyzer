from typing import AsyncGenerator
import logging
from langchain_nvidia_ai_endpoints import ChatNVIDIA
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from app.core.config import settings

logger = logging.getLogger(__name__)

class LLMError(Exception):
    pass

async def stream_answer(
    question: str, 
    chunks: list[dict], 
    history: list = None
) -> AsyncGenerator[str, None]:
    """
    Streams an answer from the NVIDIA LLM based on provided code chunks and history.
    """
    try:
        llm = ChatNVIDIA(
            model=settings.CHAT_MODEL,
            nvidia_api_key=settings.NVIDIA_API_KEY,
            base_url=settings.NVIDIA_BASE_URL,
            temperature=settings.LLM_TEMPERATURE,
            max_tokens=settings.LLM_MAX_TOKENS,
        )
        
        # Build context from chunks
        context = "\n\n".join([
            f"--- File: {c['metadata'].get('file_path', 'unknown')} ---\n{c['content']}"
            for c in chunks
        ])
        
        system_prompt = (
            "You are an expert software engineer assistant. Answer the user's question "
            "based ONLY on the provided code snippets from their repository. "
            "If the answer is not in the code, say you don't know. "
            "Provide code examples where relevant. Be concise and accurate.\n\n"
            f"CONTEXT FROM CODEBASE:\n{context}"
        )
        
        messages = [SystemMessage(content=system_prompt)]
        
        if history:
            messages.extend(history)
            
        messages.append(HumanMessage(content=question))
        
        async for chunk in llm.astream(messages):
            yield chunk.content
            
    except Exception as e:
        logger.error(f"LLM streaming error: {e}")
        raise LLMError(f"Failed to generate answer from LLM: {e}")
