import os
import logging
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional, Literal
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

class FileNode(BaseModel):
    name: str
    path: str
    type: Literal["file", "directory"]
    children: Optional[List["FileNode"]] = None

FileNode.update_forward_refs()

def build_tree(root_dir: str, current_dir: str) -> List[FileNode]:
    tree = []
    try:
        items = sorted(os.listdir(current_dir))
        for item in items:
            if item.startswith('.') or item == "__pycache__":
                continue
            
            full_path = os.path.join(current_dir, item)
            rel_path = os.path.relpath(full_path, root_dir)
            
            if os.path.isdir(full_path):
                tree.append(FileNode(
                    name=item,
                    path=rel_path,
                    type="directory",
                    children=build_tree(root_dir, full_path)
                ))
            else:
                tree.append(FileNode(
                    name=item,
                    path=rel_path,
                    type="file"
                ))
    except Exception as e:
        logger.error(f"Error building tree for {current_dir}: {e}")
    return tree

@router.get("/{repo_id}/files")
async def get_repo_files(repo_id: str):
    repo_path = os.path.join(settings.TMP_REPOS_DIR, repo_id)
    if not os.path.exists(repo_path):
        raise HTTPException(status_code=404, detail="Repository files not found on disk.")
    
    return build_tree(repo_path, repo_path)

@router.get("/{repo_id}/file-content")
async def get_file_content(repo_id: str, path: str):
    repo_path = os.path.join(settings.TMP_REPOS_DIR, repo_id)
    file_path = os.path.join(repo_path, path)
    
    # Security check: ensure the path is within the repo directory
    if not os.path.abspath(file_path).startswith(os.path.abspath(repo_path)):
        raise HTTPException(status_code=403, detail="Forbidden path")

    if not os.path.exists(file_path) or os.path.isdir(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        return {"content": content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading file: {str(e)}")
