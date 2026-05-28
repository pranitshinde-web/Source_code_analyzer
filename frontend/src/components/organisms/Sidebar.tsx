import React, { useState } from 'react';
import { Plus, FolderGit2, MessageSquare, Trash2, ChevronDown, ChevronRight, Loader2, LogOut } from "lucide-react";
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
  onDeleteRepo: (repoId: string) => void;
  onNewChat: () => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  onNewIngest, repos, activeRepo, onSelectRepo, onFileClick,
  sessions, activeSessionId, onSelectSession, onDeleteSession, onDeleteRepo, onNewChat, onLogout
}) => {
  const [expandedRepos, setExpandedRepos] = useState<Record<string, boolean>>({});

  const filteredSessions = sessions.filter(s => s.repo_id === activeRepo);

  const toggleRepo = (e: React.MouseEvent, repoId: string) => {
    e.stopPropagation();
    setExpandedRepos(prev => ({ ...prev, [repoId]: !prev[repoId] }));
  };

  return (
    <div className="w-[280px] h-screen bg-gray-900 text-gray-200 flex flex-col border-r border-gray-700 shadow-xl">
      {/* Top Header/Action */}
      <div className="p-3">
        <Button 
          variant="ghost" 
          className="w-full flex items-center justify-between gap-3 border border-gray-700 hover:bg-gray-800 text-sm py-2 px-3 rounded-lg text-gray-100"
          onClick={onNewChat}
        >
          <span className="flex items-center gap-2 font-medium">
            <Plus size={18} /> New chat
          </span>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-1 scrollbar-thin scrollbar-thumb-gray-700">
        {/* Repositories */}
        <div className="mb-6">
          <div className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Repositories
            <button onClick={onNewIngest} className="hover:text-white transition-colors">
              <Plus size={14} />
            </button>
          </div>
          <div className="space-y-0.5">
            {repos.map((repo) => (
              <div key={repo.repo_id} className="group">
                <div 
                  onClick={() => repo.status === 'done' && onSelectRepo(repo.repo_id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                    activeRepo === repo.repo_id ? "bg-gray-800" : "hover:bg-gray-800"
                  }`}
                >
                  <button onClick={(e) => toggleRepo(e, repo.repo_id)} className="text-gray-400">
                    {expandedRepos[repo.repo_id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                  
                  <div className="flex-1 flex items-center gap-2 truncate">
                    {repo.status === 'processing' ? <Loader2 size={14} className="animate-spin text-blue-500" /> : <FolderGit2 size={14} className="text-gray-400" />}
                    <span className="truncate">{repo.repo_id}</span>
                  </div>

                  <button 
                    onClick={(e) => { e.stopPropagation(); onDeleteRepo(repo.repo_id); }}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                
                {expandedRepos[repo.repo_id] && repo.status === 'done' && (
                  <div className="pl-6 py-1">
                    <FileExplorer repoId={repo.repo_id} onFileClick={onFileClick} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Chat History */}
        <div>
          <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {activeRepo ? `History — ${activeRepo}` : "History"}
          </div>
          <div className="space-y-0.5">
            {filteredSessions.map((session) => (
              <div key={session.session_id} className="group flex items-center justify-between px-3 py-2 rounded-lg text-sm hover:bg-gray-800 transition-colors cursor-pointer">
                <div 
                  onClick={() => onSelectSession(session.session_id)}
                  className={`flex items-center gap-2 flex-1 truncate ${activeSessionId === session.session_id ? "text-white font-medium" : "text-gray-400"}`}
                >
                  <MessageSquare size={14} />
                  <span className="truncate">{session.title}</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDeleteSession(session.session_id); }}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>


      <div className="p-3 border-t border-gray-800">
        <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm text-gray-300">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold">
               PS
             </div>
             <span>Pranit S.</span>
          </div>
          <button onClick={onLogout} className="hover:text-red-400 transition-colors">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
