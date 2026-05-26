import { useState, useEffect } from "react";
import { Sidebar } from "./components/organisms/Sidebar";
import { ChatWindow } from "./components/organisms/ChatWindow";
import { IngestModal } from "./components/molecules/IngestModal";
import { FileViewer } from "./components/molecules/FileViewer";
import { api, RepoJob, ChatSessionMetadata, ChatMessage } from "./services/api";
import { v4 as uuidv4 } from "uuid";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function App() {
  const [repos, setRepos] = useState<RepoJob[]>([]);
  const [activeRepoId, setActiveRepoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [sessionId, setSessionId] = useState(uuidv4());
  const [sessions, setSessions] = useState<ChatSessionMetadata[]>([]);
  
  const [viewingFile, setViewingFile] = useState<{ path: string; content: string } | null>(null);

  // Initial load: fetch existing repositories and sessions
  useEffect(() => {
    fetchRepos();
    fetchSessions();
  }, []);

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
      console.log("Fetched sessions:", res.data);
      setSessions(res.data);
    } catch (err) {
      console.error("Failed to fetch sessions", err);
    }
  };

  const handleSelectSession = async (id: string) => {
    try {
      const res = await api.getSessionHistory(id);
      // Map database messages back to UI format
      // LangChain message_to_dict format: { type: 'human', data: { content: '...' } }
      const history: Message[] = res.data.map((m: any) => ({
        role: m.type === 'human' ? 'user' : 'assistant',
        content: m.data?.content || m.content || ""
      }));
      
      setMessages(history);
      setSessionId(id);
      
      // Also try to find and set the active repo if available in metadata
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

  const handleSendMessage = async (content: string) => {
    if (!activeRepoId) return;

    // Add user message immediately
    const userMsg: Message = { role: "user", content };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    // Prepare placeholder for AI response
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
        (doneData) => {
          setIsLoading(false);
          fetchSessions(); // Refresh list to show updated title/timestamp
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
        onSelectRepo={(id) => {
          setActiveRepoId(id);
          // When switching repos manually, we start a fresh chat context for that repo
          handleNewChat();
          setViewingFile(null);
        }}
        onNewIngest={() => setIsIngestModalOpen(true)}
        onFileClick={handleFileClick}
        sessions={sessions}
        activeSessionId={sessionId}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onNewChat={handleNewChat}
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
