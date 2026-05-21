# Source Code Analyzer

A powerful RAG-based tool that indexes GitHub repositories to provide context-aware AI analysis and code navigation.

## 🚀 Features
- **Smart RAG Pipeline**: Clones, chunks, and embeds repositories using NVIDIA NIM.
- **Persistent Storage**: Uses ChromaDB to store and query code embeddings.
- **Interactive File Explorer**: A VS Code-like interface to browse repository files.
- **Streaming Chat**: Real-time code analysis with syntax highlighting.
- **Type-Safe Frontend**: Modern React + TypeScript + Tailwind UI.

## 🛠 Tech Stack
- **Backend**: FastAPI, LangChain, ChromaDB, NVIDIA NIM.
- **Frontend**: React, TypeScript, Tailwind CSS, Lucide React, React Markdown.

## 🏗 Setup

### Prerequisites
- Python 3.13+
- Node.js 22+
- NVIDIA API Key

### Backend
1. `cd backend`
2. `python -m venv venv`
3. `./venv/bin/pip install -r requirements.txt`
4. Create `.env` with `NVIDIA_API_KEY`.
5. Run: `./venv/bin/python -m uvicorn app.main:app --port 8000`

### Frontend
1. `cd frontend`
2. `npm install`
3. Run: `npm run dev`

## 📁 Project Structure
- `/backend`: FastAPI service.
- `/frontend`: React/TypeScript application.
- `/chroma_data`: Persistent vector storage.
- `/tmp_repos`: Cloned repository workspace.
