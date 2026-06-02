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
*   **Task Queue**: Celery with Redis for asynchronous background processing and reliable job management.

---

## 3. Backend Architecture

The backend is structured into **Routers** (API layer) and **Services** (logic layer), ensuring a clean separation of concerns.

### 3.1. API Layer (Routers)
*   **Ingestion (`/ingest`)**:
    *   `POST /ingest`: Enqueues a Celery task for background ingestion of a GitHub repository.
    *   `DELETE /ingest/{repo_id}`: Deletes an indexed repository's collection and data.
*   **Chat (`/chat`)**:
    *   `POST /chat`: Initiates a RAG-based chat session, returning an SSE stream.
*   **Evaluation (`/evaluate`)**:
    *   `POST /evaluate`: Triggers a Ragas evaluation pipeline to measure RAG quality.

### 3.2. Core Services
*   **Ingestion Service**: Coordinates the pipeline: Clone → Chunk → Embed → Store. Now runs as a distributed Celery task.
*   **Evaluator Service**: Generates synthetic testsets and runs Ragas metrics (Faithfulness, Relevancy, etc.).
*   **Chunker Service**: AST-aware Python code splitter for better semantic preservation.
*   **Vector Store Service**: Managed abstraction for ChromaDB operations.

---

## 4. Data Flow

### 4.1. Ingestion Pipeline
1.  **Request**: User submits a GitHub URL.
2.  **Task Queuing**: API enqueues a `run_ingestion_task` in Redis and returns a `task_id`.
3.  **Processing**: Celery workers pick up the task, perform cloning, chunking, and embedding.
4.  **Storage**: Embeddings are stored in ChromaDB, and job status is updated in Redis.

---

## 5. Technology Stack

| Component | Technology |
| :--- | :--- |
| **Backend Framework** | FastAPI (Python 3.13+) |
| **Web Server** | Uvicorn |
| **Vector Database** | ChromaDB |
| **Task Queue** | Celery + Redis |
| **AI Orchestration** | LangChain / NVIDIA AI Endpoints |
| **LLM & Embeddings** | NVIDIA NIM (Nemotron-3-Nano) |
| **RAG Evaluation** | RAGAS |
| **Frontend Framework** | React 19 (Vite) |

---

## 6. Scaling & Reliability

### 6.1. Distributed Task Queue
The transition to **Celery + Redis** enables horizontal scaling. Multiple workers can process heavy ingestion jobs in parallel without affecting API responsiveness.

### 6.2. Failure Recovery
*   **Exponential Backoff**: Tasks automatically retry on transient API failures (like rate limits).
*   **Job Persistence**: Ingestion state is stored in Redis, ensuring visibility even across server restarts.

---

## 7. Development & Deployment
*   **Backend**: Requires `NVIDIA_API_KEY` and a running **Redis** instance.
*   **ChromaDB**: Persists data in `./chroma_data`.
