from collections import deque
from threading import Lock

from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
from langchain_core.chat_history import InMemoryChatMessageHistory

from app.core.config import settings


# ---------------------------------------------------------------------------
# In-process session store
# ---------------------------------------------------------------------------
# Maps  session_id (str)  →  _Session  (history + sliding window deque)
# ---------------------------------------------------------------------------

class _Session:
    """
    Wraps InMemoryChatMessageHistory with a sliding window of k turn-pairs.
    A 'turn' is one HumanMessage + one AIMessage.
    """

    def __init__(self, window_size: int):
        self._window_size = window_size          # max turn-pairs to keep
        self._history = InMemoryChatMessageHistory()
        # deque tracks message counts per turn so we can evict oldest pairs
        self._turn_lengths: deque[int] = deque()

    def add_turn(self, human: str, ai: str) -> None:
        """Append a completed Q&A turn and evict the oldest if over the window."""
        self._history.add_user_message(human)
        self._history.add_ai_message(ai)
        self._turn_lengths.append(2)             # each turn = 2 messages

        # evict oldest turn if we exceed the window
        while len(self._turn_lengths) > self._window_size:
            drop = self._turn_lengths.popleft()
            for _ in range(drop):
                self._history.messages.pop(0)

    def get_messages(self) -> list[BaseMessage]:
        """Return all messages currently in the sliding window."""
        return list(self._history.messages)

    def clear(self) -> None:
        self._history.clear()
        self._turn_lengths.clear()


_sessions: dict[str, _Session] = {}
_lock = Lock()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_memory(session_id: str) -> _Session:
    """
    Return the _Session for the given session_id.
    Creates a new one if it does not exist yet.

    Parameters
    ----------
    session_id : str
        UUID generated client-side and sent with every /chat request.
    """
    with _lock:
        if session_id not in _sessions:
            _sessions[session_id] = _Session(
                window_size=settings.MEMORY_WINDOW_SIZE
            )
        return _sessions[session_id]


def save_turn(session_id: str, human_msg: str, ai_msg: str) -> None:
    """
    Append one completed Q&A turn to the session memory.

    Call this AFTER the LLM has finished streaming its full answer.

    Parameters
    ----------
    session_id : str
        Same UUID passed to get_memory().
    human_msg : str
        The user's question exactly as submitted.
    ai_msg : str
        The complete answer returned by the LLM.
    """
    get_memory(session_id).add_turn(human_msg, ai_msg)


def get_history(session_id: str) -> list[BaseMessage]:
    """
    Return the list of LangChain BaseMessage objects for the session.
    Used by the prompt builder to inject prior conversation turns.

    Returns an empty list if the session has no history yet.
    """
    return get_memory(session_id).get_messages()


def clear_session(session_id: str) -> bool:
    """
    Delete all memory for a session.
    Call this when the user clicks 'New Chat' on the frontend.

    Returns True if the session existed and was removed, False otherwise.
    """
    with _lock:
        if session_id in _sessions:
            del _sessions[session_id]
            return True
        return False


def list_sessions() -> list[str]:
    """Return all active session IDs — handy for debugging."""
    with _lock:
        return list(_sessions.keys())


def session_count() -> int:
    """Return how many active sessions are currently in memory."""
    return len(_sessions)


# ---------------------------------------------------------------------------
# Redis upgrade path (multi-worker / production)
# ---------------------------------------------------------------------------
# When scaling uvicorn to multiple workers (--workers 4) each worker has its
# own _sessions dict, so a user's second request may land on a different
# worker and lose history.
#
# To fix, swap _Session._history for RedisChatMessageHistory:
#
#   pip install redis langchain-community
#
#   from langchain_community.chat_message_histories import RedisChatMessageHistory
#
#   def _make_history(session_id: str) -> RedisChatMessageHistory:
#       return RedisChatMessageHistory(
#           session_id=session_id,
#           url="redis://localhost:6379",
#           ttl=3600,   # expire after 1 hour of inactivity
#       )
#
# Replace InMemoryChatMessageHistory() with _make_history(session_id) in
# _Session.__init__ and everything else stays identical.
# ---------------------------------------------------------------------------