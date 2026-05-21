import { useState, useEffect } from "react";
import { Sidebar } from "./components/organisms/Sidebar";
import { ChatWindow } from "./components/organisms/ChatWindow";
import { IngestModal } from "./components/molecules/IngestModal";
import { FileViewer } from "./components/molecules/FileViewer";
import { api, RepoJob } from "./services/api";
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
  const [sessionId] = useState(uuidv4());
  
  const [viewingFile, setViewingFile] = useState<{ path: string; content: string } | null>(null);

  // Initial load: fetch existing repositories/jobs
  useEffect(() => {
    fetchRepos();
  }, []);

  const fetchRepos = async () => {
    console.log("Fetching repos from API...");
    try {
      const res = await api.listJobs();
      console.log("API Response received:", res.data);
      setRepos(res.data);
      console.log("Repos state updated with:", res.data.length, "items");
      if (res.data.length > 0 && !activeRepoId) {
        console.log("Setting active repo to:", res.data[0].repo_id);
        setActiveRepoId(res.data[0].repo_id);
      }
    } catch (err) {
      console.error("FAILED to fetch repos. Is the backend at http://localhost:8000 up?", err);
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
            
            // Create a new object for the message to trigger re-render
            newMessages[lastMsgIndex] = { 
              ...lastMsg, 
              content: lastMsg.content + token 
            };
            
            return newMessages;
          });
        },
        (doneData) => {
          setIsLoading(false);
          console.log("Chat done", doneData);
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
      fetchRepos(); // Refresh list to show new job
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
      alert("Failed to open file.");
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
      <Sidebar 
        repos={repos}
        activeRepo={activeRepoId}
        onSelectRepo={(id) => {
          setActiveRepoId(id);
          setMessages([]); // Clear chat when switching repos
          setViewingFile(null); // Clear file viewer
        }}
        onNewIngest={() => setIsIngestModalOpen(true)}
        onFileClick={handleFileClick}
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
