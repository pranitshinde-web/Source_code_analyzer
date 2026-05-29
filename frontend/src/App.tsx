import { useState, useEffect } from "react";
import { Sidebar } from "./components/organisms/Sidebar";
import { ChatWindow } from "./components/organisms/ChatWindow";
import { IngestModal } from "./components/molecules/IngestModal";
import { FileViewer } from "./components/molecules/FileViewer";
import { Auth } from "./components/organisms/Auth";
import { api, RepoJob, ChatSessionMetadata} from "./services/api";
import { v4 as uuidv4 } from "uuid";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem("access_token"));
  const [username, setUsername] = useState<string | null>(localStorage.getItem("username"));
  const [isInitialising, setIsInitialising] = useState(true);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [repos, setRepos] = useState<RepoJob[]>([]);
  const [activeRepoId, setActiveRepoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [sessionId, setSessionId] = useState(uuidv4());
  const [sessions, setSessions] = useState<ChatSessionMetadata[]>([]);
  
  const [viewingFile, setViewingFile] = useState<{ path: string; content: string } | null>(null);

  // Initial authentication verification and data fetch
  useEffect(() => {
    const checkAuth = async () => {
      if (isAuthenticated) {
        try {
          // Verify token by attempting to fetch repos
          const res = await api.listJobs();
          setRepos(res.data);
          if (res.data.length > 0 && !activeRepoId) {
            setActiveRepoId(res.data[0].repo_id);
          }
          await fetchSessions();
          setBackendError(null);
        } catch (err: any) {
          console.error("Initial auth check failed", err);
          if (err.response?.status === 401) {
            // Token is invalid, log out
            handleLogout();
          } else if (!err.response) {
            // Network error (backend likely down or starting up)
            setBackendError("Connecting to backend...");
            // We'll keep trying in the background or just wait
          }
        }
      }
      setIsInitialising(false);
    };

    checkAuth();
  }, []);

  // Polling for backend readiness if it's down
  useEffect(() => {
    let interval: number | undefined;
    if (backendError && isInitialising === false) {
      interval = window.setInterval(async () => {
        try {
          await api.listJobs();
          setBackendError(null);
          if (isAuthenticated) {
            fetchRepos();
            fetchSessions();
          }
        } catch (err) {
          // Still down
        }
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [backendError, isInitialising, isAuthenticated]);

  // Initial load: fetch existing repositories and sessions
  useEffect(() => {
    if (isAuthenticated && !isInitialising && !backendError) {
      fetchRepos();
      fetchSessions();
    }
  }, [isAuthenticated, isInitialising, backendError]);

  // Polling for repo status while any repo is in progress
  useEffect(() => {
    let interval: number | undefined;
    
    const hasActiveJobs = repos.some(r => r.status === 'queued' || r.status === 'processing');
    
    if (hasActiveJobs && isAuthenticated) {
      interval = window.setInterval(() => {
        fetchRepos();
      }, 3000); // Poll every 3 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [repos, isAuthenticated]);

  const fetchRepos = async () => {
    try {
      const res = await api.listJobs();
      setRepos(res.data);
      if (res.data.length > 0 && !activeRepoId) {
        setActiveRepoId(res.data[0].repo_id);
      }
    } catch (err) {
      console.error("FAILED to fetch repos", err);
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await api.listSessions();
      setSessions(res.data);
    } catch (err) {
      console.error("Failed to fetch sessions", err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("username");
    
    // Clear all user-specific state
    setRepos([]);
    setActiveRepoId(null);
    setMessages([]);
    setSessions([]);
    setSessionId(uuidv4());
    setViewingFile(null);
    setUsername(null);
    
    setIsAuthenticated(false);
  };

  if (isInitialising) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-sm font-medium animate-pulse">Initialising application...</p>
      </div>
    );
  }

  if (backendError && isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-6 rounded-xl max-w-md text-center">
          <h2 className="text-xl font-bold text-amber-800 dark:text-amber-400 mb-2">Backend Unavailable</h2>
          <p className="text-sm text-amber-700 dark:text-amber-500 mb-4">
            The application is having trouble connecting to the backend server. It might still be starting up.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-500">
            <div className="w-2 h-2 bg-amber-500 rounded-full animate-ping"></div>
            Retrying connection...
          </div>
          <button 
            onClick={handleLogout}
            className="mt-6 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline"
          >
            Logout and try different account
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Auth 
        onAuthSuccess={(user: string) => {
          setIsAuthenticated(true);
          setUsername(user);
          localStorage.setItem("username", user);
        }} 
      />
    );
  }

  const handleSelectSession = async (id: string) => {
    try {
      const res = await api.getSessionHistory(id);
      const history: Message[] = res.data.map((m: any) => ({
        role: m.type === 'human' ? 'user' : 'assistant',
        content: m.data?.content || m.content || ""
      }));
      
      setMessages(history);
      setSessionId(id);
      
      const sessionMeta = sessions.find(s => s.session_id === id);
      if (sessionMeta && sessionMeta.repo_id !== 'unknown') {
        setActiveRepoId(sessionMeta.repo_id);
      }
    } catch (err) {
      console.error("Failed to load session history", err);
    }
  };

  const handleNewChat = () => {
    setSessionId(uuidv4());
    setMessages([]);
  };

  const handleDeleteSession = async (id: string) => {
    try {
      await api.clearSession(id);
      if (id === sessionId) {
        handleNewChat();
      }
      fetchSessions();
    } catch (err) {
      console.error("Failed to delete session", err);
    }
  };

  const handleDeleteRepo = async (repoId: string) => {
    if (!window.confirm(`Are you sure you want to delete ${repoId}? This will remove all files, indices, and chat history.`)) {
      return;
    }
    try {
      await api.deleteRepo(repoId);
      if (activeRepoId === repoId) {
        setActiveRepoId(null);
        handleNewChat();
      }
      fetchRepos();
      fetchSessions();
    } catch (err) {
      console.error("Failed to delete repo", err);
      alert("Failed to delete repository.");
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!activeRepoId) return;

    const userMsg: Message = { role: "user", content };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    const aiMsg: Message = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, aiMsg]);

    try {
      await api.chatStream(
        activeRepoId,
        content,
        sessionId,
        (token) => {
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMsgIndex = newMessages.length - 1;
            const lastMsg = newMessages[lastMsgIndex];
            newMessages[lastMsgIndex] = { 
              ...lastMsg, 
              content: lastMsg.content + token 
            };
            return newMessages;
          });
        },
        () => {
          setIsLoading(false);
          fetchSessions();
        },
        (error) => {
          setIsLoading(false);
          console.error("Chat error", error);
        }
      );
    } catch (err) {
      setIsLoading(false);
      console.error("Failed to send message", err);
    }
  };

  const handleIngest = async (url: string) => {
    try {
      await api.ingest(url);
      setIsIngestModalOpen(false);
      fetchRepos(); 
    } catch (err: any) {
      alert("Failed to start ingestion: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleFileClick = async (path: string) => {
    if (!activeRepoId) return;
    try {
      const res = await api.getFileContent(activeRepoId, path);
      setViewingFile({ path, content: res.data.content });
    } catch (err) {
      console.error("Failed to fetch file content", err);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
      <Sidebar 
        repos={repos}
        activeRepo={activeRepoId}
        username={username || "User"}
        onSelectRepo={(id) => {
          setActiveRepoId(id);
          handleNewChat();
          setViewingFile(null);
        }}
        onNewIngest={() => setIsIngestModalOpen(true)}
        onFileClick={handleFileClick}
        sessions={sessions}
        activeSessionId={sessionId}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onDeleteRepo={handleDeleteRepo}
        onNewChat={handleNewChat}
        onLogout={handleLogout}
      />
      
      <main className="flex-1 relative overflow-hidden flex flex-col">
        <ChatWindow 
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
        />

        {viewingFile && (
          <FileViewer 
            path={viewingFile.path}
            content={viewingFile.content}
            onClose={() => setViewingFile(null)}
          />
        )}
      </main>

      <IngestModal 
        isOpen={isIngestModalOpen}
        onClose={() => setIsIngestModalOpen(false)}
        onIngest={handleIngest}
      />
    </div>
  );
}

export default App;
