import React, { useEffect, useState } from 'react';
import { Plus, Terminal, ChevronDown, ChevronRight, Files } from "lucide-react";
import { Button } from "../atoms/Button";
import { api, FileNode } from "../../services/api";
import { FileExplorer } from "./FileExplorer";

interface Repo {
  repo_id: string;
  status: string;
}

interface SidebarProps {
  onNewIngest: () => void;
  repos: Repo[];
  activeRepo: string | null;
  onSelectRepo: (repoId: string) => void;
  onFileClick: (path: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNewIngest, repos, activeRepo, onSelectRepo, onFileClick }) => {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (activeRepo) {
      api.getFiles(activeRepo).then(res => {
        setFiles(res.data);
      }).catch(err => {
        console.error("Failed to fetch files", err);
        setFiles([]);
      });
    }
  }, [activeRepo]);

  const handleRepoClick = (repoId: string) => {
    if (activeRepo === repoId) {
      setIsExpanded(!isExpanded);
    } else {
      onSelectRepo(repoId);
      setIsExpanded(true);
    }
  };

  return (
    <div className="w-[260px] h-screen bg-gray-900 text-white flex flex-col border-r border-gray-800">
      <div className="p-3 shrink-0">
        <Button 
          variant="ghost" 
          className="w-full flex items-center justify-start gap-3 border border-gray-700 hover:bg-gray-800 text-sm py-3"
          onClick={onNewIngest}
        >
          <Plus size={16} />
          New Repository
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        <div>
          <div className="text-xs font-semibold text-gray-500 px-3 py-2 uppercase tracking-wider">
            Repositories
          </div>
          <div className="space-y-1">
            {repos.map((repo) => (
              <div key={repo.repo_id}>
                <button
                  onClick={() => handleRepoClick(repo.repo_id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                    activeRepo === repo.repo_id ? "bg-gray-800 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  {isExpanded && activeRepo === repo.repo_id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <Terminal size={14} />
                  <span className="truncate">{repo.repo_id}</span>
                </button>
                
                {isExpanded && activeRepo === repo.repo_id && (
                  <div className="mt-1 ml-4 border-l border-gray-800 overflow-hidden">
                    <FileExplorer files={files} onFileClick={onFileClick} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>


      <div className="p-3 border-t border-gray-800">
        <div className="flex items-center gap-3 px-3 py-2 text-sm text-gray-300">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold">
            PS
          </div>
          <span>Pranit S.</span>
        </div>
      </div>
    </div>
  );
};
