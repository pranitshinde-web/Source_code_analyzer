import os
import shutil
import git
import logging
from app.core.config import settings

logger = logging.getLogger(__name__)

class CloneError(Exception):
    pass

def clone_repo(repo_url: str, repo_id: str) -> tuple[str, list[str]]:
    """
    Clones a GitHub repository to a temporary directory and returns the path
    and a list of all Python files.
    """
    target_dir = os.path.join(settings.TMP_REPOS_DIR, repo_id)
    
    # Clean up if exists
    if os.path.exists(target_dir):
        shutil.rmtree(target_dir)
        
    try:
        logger.info(f"Cloning {repo_url} into {target_dir}")
        git.Repo.clone_from(repo_url, target_dir, depth=1)
        
        py_files = []
        for root, _, files in os.walk(target_dir):
            for file in files:
                if file.endswith(".py"):
                    py_files.append(os.path.join(root, file))
                    
        return target_dir, py_files
    except Exception as e:
        logger.error(f"Failed to clone repo: {e}")
        raise CloneError(f"Failed to clone repository: {e}")
