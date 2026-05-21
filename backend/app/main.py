__import__("pysqlite3")
import sys

sys.modules["sqlite3"] = sys.modules.pop("pysqlite3")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import chromadb
import os
from dotenv import load_dotenv

from app.routers import ingest, chat, status, files
from app.core.config import settings

load_dotenv()


# ---------------------------------------------------------------------------
# Lifespan — runs once on startup and once on shutdown
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialise ChromaDB persistent client and attach to app state
    os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)
    os.makedirs(settings.TMP_REPOS_DIR, exist_ok=True)

    app.state.chroma_client = chromadb.PersistentClient(
        path=settings.CHROMA_PERSIST_DIR
    )
    print(f"[startup] ChromaDB initialised at: {settings.CHROMA_PERSIST_DIR}")
    print(f"[startup] Temp repo dir:            {settings.TMP_REPOS_DIR}")
    print(f"[startup] Chat model:               {settings.CHAT_MODEL}")
    print(f"[startup] Embedding model:          {settings.EMBED_MODEL}")

    yield  # application runs here
    # Shutdown: nothing special needed for ChromaDB PersistentClient
    print("[shutdown] Application shutting down.")

app = FastAPI(
    title="Source Code Analyzer",
    description=(
        "RAG-powered API that clones GitHub repositories, indexes Python "
        "source files into ChromaDB, and answers natural-language questions "
        "about the codebase using NVIDIA NIM."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.CORS_ORIGIN], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest.router,prefix="/ingest",tags=["Ingestion"])
app.include_router(chat.router,prefix="/chat",tags=["Chat"])
app.include_router(status.router, prefix="/status", tags=["Status"])
app.include_router(files.router, prefix="/repos", tags=["Files"])

@app.get("/health", tags=["Health"])
async def health_check():
    """Simple liveness probe — returns 200 when the server is up."""
    return {
        "status": "ok",
        "chat_model": settings.CHAT_MODEL,
        "embed_model": settings.EMBED_MODEL,
    }


@app.get("/", tags=["Health"])
async def root():
    """Redirect hint for developers hitting the bare root URL."""
    return {
        "message": "Source Code Analyzer API",
        "docs": "/docs",
        "health": "/health",
    }