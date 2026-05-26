import React, { useEffect, useState } from 'react';
import { Plus, Terminal, ChevronDown, ChevronRight, MessageSquare, Trash2 } from "lucide-react";
import { Button } from "../atoms/Button";
import { api, FileNode, ChatSessionMetadata } from "../../services/api";
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
  sessions: ChatSessionMetadata[];
  activeSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onNewChat: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  onNewIngest, repos, activeRepo, onSelectRepo, onFileClick,
  sessions, activeSessionId, onSelectSession, onDeleteSession, onNewChat
}) => {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter sessions based on the selected repo
  const filteredSessions = sessions.filter(s => s.repo_id === activeRepo);

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
      <div className="p-3 shrink-0 flex flex-col gap-2">
        <Button 
          variant="ghost" 
          className="w-full flex items-center justify-start gap-3 border border-gray-700 hover:bg-gray-800 text-sm py-3"
          onClick={onNewChat}
        >
          <Plus size={16} />
          New Chat
        </Button>
        <Button 
          variant="ghost" 
          className="w-full flex items-center justify-start gap-3 border border-gray-700 hover:bg-gray-800 text-sm py-3 text-gray-400"
          onClick={onNewIngest}
        >
          <Plus size={16} />
          New Repository
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-6">
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

        <div>
          <div className="text-xs font-semibold text-gray-500 px-3 py-2 uppercase tracking-wider">
            Chat History {activeRepo && `— ${activeRepo}`}
          </div>
          <div className="space-y-1">
            {filteredSessions.map((session) => (
              <div key={session.session_id} className="group flex items-center gap-1">
                <button
                  onClick={() => onSelectSession(session.session_id)}
                  className={`flex-1 text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                    activeSessionId === session.session_id ? "bg-gray-800 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  <MessageSquare size={14} />
                  <span className="truncate flex-1">{session.title}</span>
                </button>
                <button 
                  onClick={() => onDeleteSession(session.session_id)}
                  className="opacity-0 group-hover:opacity-100 p-2 text-gray-500 hover:text-red-400 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            {filteredSessions.length === 0 && (
              <div className="px-3 py-2 text-xs text-gray-600 italic">
                {activeRepo ? "No chats for this repo" : "Select a repo to see history"}
              </div>
            )}
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
