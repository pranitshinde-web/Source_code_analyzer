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
  username: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  onNewIngest, repos, activeRepo, onSelectRepo, onFileClick,
  sessions, activeSessionId, onSelectSession, onDeleteSession, onDeleteRepo, onNewChat, onLogout,
  username
}) => {
  const [expandedRepos, setExpandedRepos] = useState<Record<string, boolean>>({});

  const filteredSessions = sessions.filter(s => s.repo_id === activeRepo);

  // Helper to make repo IDs pretty: user_1__owner__repo -> owner/repo
  const formatRepoId = (id: string) => {
    const parts = id.split("__");
    if (parts.length >= 2) {
      return parts.slice(1).join("/").replace(/__/g, "/");
    }
    return id;
  };

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  const toggleRepo = (e: React.MouseEvent, repoId: string, status: string) => {
    e.stopPropagation();
    setExpandedRepos(prev => ({ ...prev, [repoId]: !prev[repoId] }));
    if (status === 'done' && activeRepo !== repoId) {
      onSelectRepo(repoId);
    }
  };

  return (
    <div className="w-[280px] h-screen bg-zinc-950 text-zinc-300 flex flex-col border-r border-zinc-800 shadow-2xl">
      {/* Top Header/Action */}
      <div className="p-4">
        <Button 
          variant="ghost" 
          className="w-full flex items-center justify-between gap-3 border border-zinc-800 hover:bg-zinc-900 text-sm py-2.5 px-3 rounded-xl text-zinc-100 transition-all active:scale-[0.98]"
          onClick={onNewChat}
        >
          <span className="flex items-center gap-2.5 font-semibold">
            <Plus size={18} className="text-blue-500" /> New Chat
          </span>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-8 scrollbar-thin scrollbar-thumb-zinc-800">
        {/* Repositories */}
        <div>
          <div className="flex items-center justify-between px-2 mb-2 text-[11px] font-bold text-zinc-500 uppercase tracking-[0.1em]">
            Repositories
            <button 
              onClick={onNewIngest} 
              className="p-1 hover:text-white hover:bg-zinc-800 rounded-md transition-all"
              title="Add Repository"
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="space-y-1">
            {repos.map((repo) => (
              <div key={repo.repo_id} className="group">
                <div 
                  onClick={() => repo.status === 'done' && onSelectRepo(repo.repo_id)}
                  className={`flex items-center gap-2 px-2 py-2 rounded-lg text-sm cursor-pointer transition-all ${
                    activeRepo === repo.repo_id 
                      ? "bg-zinc-800 text-white shadow-sm" 
                      : "hover:bg-zinc-900/50 text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <button 
                    onClick={(e) => toggleRepo(e, repo.repo_id, repo.status)} 
                    className="p-0.5 hover:bg-zinc-700 rounded transition-colors"
                  >
                    {expandedRepos[repo.repo_id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>
                  
                  <div className="flex-1 flex items-center gap-2.5 truncate">
                    {repo.status === 'processing' 
                      ? <Loader2 size={14} className="animate-spin text-blue-500" /> 
                      : <FolderGit2 size={16} className={activeRepo === repo.repo_id ? "text-blue-400" : "text-zinc-500"} />
                    }
                    <span className="truncate font-medium">{formatRepoId(repo.repo_id)}</span>
                  </div>

                  <button 
                    onClick={(e) => { e.stopPropagation(); onDeleteRepo(repo.repo_id); }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 hover:text-red-400 rounded-md transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                
                {expandedRepos[repo.repo_id] && repo.status === 'done' && (
                  <div className="ml-3 pl-3 border-l border-zinc-800 mt-1 py-1">
                    <FileExplorer repoId={repo.repo_id} onFileClick={onFileClick} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Chat History */}
        <div>
          <div className="px-2 mb-2 text-[11px] font-bold text-zinc-500 uppercase tracking-[0.1em]">
            {activeRepo ? `History` : "History"}
          </div>
          <div className="space-y-1">
            {filteredSessions.length === 0 && activeRepo && (
              <div className="px-2 py-3 text-xs text-zinc-600 italic">No sessions yet</div>
            )}
            {filteredSessions.map((session) => (
              <div key={session.session_id} className="group flex items-center justify-between px-2 py-2 rounded-lg text-sm hover:bg-zinc-900/50 transition-all cursor-pointer">
                <div 
                  onClick={() => onSelectSession(session.session_id)}
                  className={`flex items-center gap-2.5 flex-1 truncate ${
                    activeSessionId === session.session_id 
                      ? "text-blue-400 font-medium" 
                      : "text-zinc-400 group-hover:text-zinc-200"
                  }`}
                >
                  <MessageSquare size={14} className={activeSessionId === session.session_id ? "text-blue-400" : "text-zinc-500"} />
                  <span className="truncate">{session.title}</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDeleteSession(session.session_id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 hover:text-red-400 rounded-md transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>


      <div className="p-4 border-t border-zinc-800 bg-zinc-950/50 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3 px-2 py-2 rounded-xl hover:bg-zinc-900 transition-colors">
          <div className="flex items-center gap-3">
             <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-900/20 text-xs">
               {getInitials(username)}
             </div>
             <div className="flex flex-col">
               <span className="text-sm font-semibold text-zinc-100 truncate max-w-[120px]">{username}</span>
             </div>
          </div>
          <button 
            onClick={onLogout} 
            className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
