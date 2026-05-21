# Project Documentation & System Architecture: Source Code Analyzer

## 1. Executive Summary
The **Source Code Analyzer** is a RAG (Retrieval-Augmented Generation) based system designed to index GitHub repositories and provide a natural language interface for developers to ask questions about the codebase. It leverages **NVIDIA NIM** for high-performance embeddings and LLM responses, and **ChromaDB** as a persistent vector store.

---

## 2. System Architecture Overview
The system follows a decoupled client-server architecture:

*   **Frontend**: A React application (Vite-based) providing the user interface for repository ingestion and chat interaction.
*   **Backend**: A FastAPI application that orchestrates the ingestion pipeline and the RAG-powered chat system.
*   **Vector Database**: ChromaDB for persistent storage of code embeddings and metadata.
*   **AI Endpoints**: NVIDIA NIM (accessed via LangChain) for generating embeddings and streaming LLM responses.

---

## 3. Backend Architecture

The backend is structured into **Routers** (API layer) and **Services** (logic layer), ensuring a clean separation of concerns.

### 3.1. API Layer (Routers)
*   **Ingestion (`/ingest`)**:
    *   `POST /ingest`: Triggers the background ingestion of a GitHub repository.
    *   `DELETE /ingest/{repo_id}`: Deletes an indexed repository's collection from ChromaDB.
*   **Chat (`/chat`)**:
    *   `POST /chat`: Initiates a RAG-based chat session, returning a Server-Sent Events (SSE) stream of the LLM's response.
    *   `DELETE /chat/session/{session_id}`: Clears the conversation history for a specific session.
*   **Status (`/status`)**:
    *   `GET /status/{repo_id}`: Retrieves the real-time progress of a repository ingestion job.
    *   `GET /status`: Lists all current and past ingestion jobs.
*   **Health (`/health`)**: A simple liveness probe for monitoring system uptime.

### 3.2. Core Services
*   **Ingestion Service**: Orchestrates the multi-stage pipeline: Clone → Chunk → Embed → Store. It manages job states (queued, processing, done, error).
*   **Chat Service**: Coordinates the RAG workflow, including context retrieval, history management, and formatting SSE frames.
*   **Cloner Service**: Uses `GitPython` to perform shallow clones of repositories and extracts Python source files.
*   **Chunker Service**: Splits code files into manageable snippets using `RecursiveCharacterTextSplitter`, preserving file paths and line numbers as metadata.
*   **Embedder Service**: Interfaces with NVIDIA's embedding models to convert text chunks into high-dimensional vectors.
*   **Vector Store Service**: Managed abstraction for ChromaDB operations, including collection management and upserts.
*   **Retriever Service**: Performs semantic similarity searches to find the most relevant code chunks for a user's query.
*   **LLM Service**: Generates context-aware answers using NVIDIA NIM models, incorporating repository context and session history.

---

## 4. Data Flow

### 4.1. Ingestion Pipeline
1.  **Request**: User submits a GitHub URL via the frontend.
2.  **Job Queuing**: Backend generates a `repo_id` and queues a background task.
3.  **Cloning**: Repository is cloned to a temporary directory.
4.  **Chunking**: Python files are parsed and split into chunks (default 1000 chars) with metadata.
5.  **Embedding**: Chunks are sent to NVIDIA NIM to generate vector embeddings.
6.  **Storage**: Chunks, metadata, and embeddings are indexed in ChromaDB.

### 4.2. Chat / RAG Pipeline
1.  **Query**: User asks a question (e.g., "How is authentication implemented?").
2.  **Retrieval**: The query is embedded and used to search ChromaDB for the top-K (default 6) relevant code chunks.
3.  **Context Construction**: Retrieved chunks and previous chat turns (sliding window) are injected into a system prompt.
4.  **Generation**: The LLM generates a response based **strictly** on the provided codebase context.
5.  **Streaming**: The answer is streamed to the frontend in real-time via SSE.

---

## 5. Technology Stack

| Component | Technology |
| :--- | :--- |
| **Backend Framework** | FastAPI (Python 3.13+) |
| **Web Server** | Uvicorn |
| **Vector Database** | ChromaDB |
| **AI Orchestration** | LangChain / LangChain NVIDIA AI Endpoints |
| **LLM & Embeddings** | NVIDIA NIM (Nemotron-3-Nano or similar) |
| **Frontend Framework** | React 19 (Vite) |
| **API Client** | Axios |
| **Task Management** | FastAPI BackgroundTasks (In-memory) |

---

## 6. Key Configuration Parameters
Located in `backend/app/core/config.py`:
*   `CHUNK_SIZE`: 1000 characters.
*   `CHUNK_OVERLAP`: 200 characters.
*   `RETRIEVAL_TOP_K`: 6 chunks.
*   `MEMORY_WINDOW_SIZE`: 5 conversation turns.
*   `CHAT_MODEL`: `nvidia/nemotron-3-nano-30b-a3b`.

---

## 7. Development & Deployment
*   **Backend**: Requires `NVIDIA_API_KEY` in a `.env` file. Run with `uvicorn app.main:app`.
*   **Frontend**: Built with Vite, communicates with backend via defined `CORS_ORIGIN`.
*   **Storage**: ChromaDB persists data in the `./chroma_data` directory by default.
