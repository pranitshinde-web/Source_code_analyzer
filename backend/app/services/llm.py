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
            "You are an expert Senior Software Engineer and Architect. You are helping a developer "
            "understand a codebase by answering questions based on specific code snippets retrieved "
            "from their repository.\n\n"
            "Your goal is to provide accurate, insightful, and well-structured responses that resemble "
            "high-quality technical documentation or senior-level peer code reviews.\n\n"
            "### INSTRUCTIONS:\n"
            "1. **Analyze First**: Carefully examine the provided CONTEXT FROM CODEBASE. Identify key functions, "
            "classes, and architectural patterns relevant to the user's request.\n"
            "2. **Strict Adherence**: Base your answer ONLY on the provided snippets. If the code does not "
            "contain enough information to answer definitively, state clearly what you cannot confirm based "
            "on the available context.\n"
            "3. **Structure Your Response**:\n"
            "   - Use clear headings to organize your thoughts.\n"
            "   - Use bullet points for lists of features, steps, or components.\n"
            "   - Use bold text for emphasis on key terms, functions, or variable names.\n"
            "4. **Cite Your Sources**: When referring to specific logic, always mention the file name "
            "(e.g., `app/main.py`) provided in the context header.\n"
            "5. **Code Examples**: Provide concise, idiomatic code examples when they help clarify the "
            "explanation. Ensure they follow the style of the existing codebase.\n"
            "6. **Professional Tone**: Maintain a tone that is precise, objective, and helpful. Focus on "
            "technical clarity and actionable insights.\n\n"
            f"### CONTEXT FROM CODEBASE:\n{context}"
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
