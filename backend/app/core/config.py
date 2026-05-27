from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables / .env file.
    All fields map 1-to-1 with the keys in backend/.env
    """

    NVIDIA_API_KEY: str
    NVIDIA_BASE_URL: str = "https://integrate.api.nvidia.com/v1"
    CHAT_MODEL: str = "nvidia/nemotron-3-nano-30b-a3b"
    EMBED_MODEL: str = "nvidia/nv-embedqa-e5-v5"
    LLM_TEMPERATURE: float = 0.2
    LLM_MAX_TOKENS: int = 2048
    CHUNK_SIZE: int = 300
    CHUNK_OVERLAP: int = 30
    MEMORY_WINDOW_SIZE: int = 5
    RETRIEVAL_TOP_K: int = 6
    RETRIEVAL_CANDIDATES: int = 20
    RERANK_TOP_K: int = 3
    CROSS_ENCODER_MODEL: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    CHROMA_PERSIST_DIR: str = "./chroma_data"
    TMP_REPOS_DIR: str = "./tmp_repos"
    CORS_ORIGIN: str = "http://localhost:5174"

    model_config = SettingsConfigDict(
        env_file=".env",          # load from backend/.env
        env_file_encoding="utf-8",
        case_sensitive=True,      # NVIDIA_API_KEY ≠ nvidia_api_key
        extra="ignore",           # silently ignore unknown env vars
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """
    Return a cached Settings singleton.
    Using lru_cache means the .env file is read only once at startup,
    not on every import.  Call get_settings() anywhere you need config.
    """
    return Settings()

settings: Settings = get_settings()