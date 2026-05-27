import ast
import logging
from typing import List, Dict, Any
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.core.config import settings

logger = logging.getLogger(__name__)

class ChunkError(Exception):
    pass

class PythonASTSplitter:
    """
    Splits Python files based on their Abstract Syntax Tree (AST).
    Extracts classes and functions as semantically meaningful units.
    If a unit is too large, it sub-splits it using recursive character splitting.
    """
    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 50):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.fallback_splitter = RecursiveCharacterTextSplitter.from_language(
            language="python",
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
        )

    def split_text(self, source_code: str, file_path: str) -> List[Dict[str, Any]]:
        """
        Parses source code and returns a list of chunks with metadata.
        """
        try:
            tree = ast.parse(source_code)
        except Exception as e:
            # Fallback for syntax errors or invalid python files
            logger.warning(f"AST parse failed for {file_path}, falling back to character split: {e}")
            sub_chunks = self.fallback_splitter.split_text(source_code)
            return [
                {
                    "content": c, 
                    "metadata": {
                        "name": "file_fallback",
                        "type": "module_fallback",
                        "start_line": -1,
                        "end_line": -1,
                        "docstring": ""
                    }
                } for c in sub_chunks
            ]

        chunks = []
        lines = source_code.splitlines()
        covered_lines = set()

        # 1. Process Class and Function Definitions
        for node in ast.iter_child_nodes(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                chunk_content = ast.get_source_segment(source_code, node)
                if not chunk_content:
                    chunk_content = "\n".join(lines[node.lineno - 1 : node.end_lineno])

                base_metadata = {
                    "name": getattr(node, "name", "unknown"),
                    "type": type(node).__name__.lower().replace("def", ""),
                    "start_line": node.lineno,
                    "end_line": node.end_lineno,
                    "docstring": ast.get_docstring(node) or ""
                }

                # If the AST block is too large, sub-split it
                if len(chunk_content) > self.chunk_size:
                    sub_chunks = self.fallback_splitter.split_text(chunk_content)
                    for sc in sub_chunks:
                        chunks.append({
                            "content": sc,
                            "metadata": base_metadata
                        })
                else:
                    chunks.append({
                        "content": chunk_content,
                        "metadata": base_metadata
                    })

                # Mark these lines as covered
                for i in range(node.lineno, node.end_lineno + 1):
                    covered_lines.add(i)

        # 2. Handle Top-Level Code (logic outside functions/classes)
        top_level_lines = []
        top_level_start = 1
        for i, line in enumerate(lines, 1):
            if i not in covered_lines:
                if not top_level_lines:
                    top_level_start = i
                top_level_lines.append(line)
            else:
                if top_level_lines:
                    self._add_top_level_chunks(chunks, top_level_lines, top_level_start)
                    top_level_lines = []
        
        if top_level_lines:
            self._add_top_level_chunks(chunks, top_level_lines, top_level_start)

        # Sort chunks by start_line for consistency
        chunks.sort(key=lambda x: (x["metadata"].get("start_line", 0), x["metadata"].get("name", "")))
        return chunks

    def _add_top_level_chunks(self, chunks: List[Dict[str, Any]], lines: List[str], start_line: int):
        """Helper to split and add non-AST code blocks."""
        text = "\n".join(lines).strip()
        if not text:
            return
            
        sub_chunks = self.fallback_splitter.split_text(text)
        for sc in sub_chunks:
            chunks.append({
                "content": sc,
                "metadata": {
                    "name": "module_level",
                    "type": "module",
                    "start_line": start_line,
                    "end_line": start_line + len(lines) - 1,
                    "docstring": ""
                }
            })

def chunk_python_files(file_paths: list[str], repo_url: str) -> list[dict]:
    """
    Reads Python files and splits them into smaller chunks using AST-aware logic.
    Ensures chunks do not exceed the model's token/character limits.
    """
    ast_splitter = PythonASTSplitter(
        chunk_size=settings.CHUNK_SIZE,
        chunk_overlap=settings.CHUNK_OVERLAP
    )
    
    all_chunks = []
    try:
        for path in file_paths:
            try:
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
            except UnicodeDecodeError:
                # Handle non-utf8 files gracefully
                logger.warning(f"Could not read {path} as UTF-8, skipping.")
                continue
                
            # path is absolute, make it relative to repo root
            rel_path = path.split(settings.TMP_REPOS_DIR)[-1].lstrip("/")
            rel_path = "/".join(rel_path.split("/")[1:])
            
            file_chunks = ast_splitter.split_text(content, rel_path)
            
            for i, chunk in enumerate(file_chunks):
                all_chunks.append({
                    "content": chunk["content"],
                    "metadata": {
                        "file_path": rel_path,
                        "chunk_index": i,
                        "repo_url": repo_url,
                        **chunk["metadata"]
                    }
                })
        return all_chunks
    except Exception as e:
        logger.error(f"Failed to chunk files: {e}")
        raise ChunkError(f"Failed to process source files: {e}")
