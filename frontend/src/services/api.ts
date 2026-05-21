import axios from "axios";

const API_BASE = "http://localhost:8000";

export interface RepoJob {
  repo_id: string;
  status: 'queued' | 'processing' | 'done' | 'error' | 'failed';
  stage: string;
  detail: string;
  progress: number;
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export const api = {
  ingest: (repoUrl: string) => axios.post(`${API_BASE}/ingest`, { repo_url: repoUrl }),
  
  getStatus: (repoId: string) => axios.get<RepoJob>(`${API_BASE}/status/${repoId}`),
  
  listJobs: () => axios.get<RepoJob[]>(`${API_BASE}/status`),
  
  deleteRepo: (repoId: string) => axios.delete(`${API_BASE}/ingest/${repoId}`),

  getFiles: (repoId: string) => axios.get<FileNode[]>(`${API_BASE}/repos/${repoId}/files`),

  getFileContent: (repoId: string, path: string) => 
    axios.get<{ content: string }>(`${API_BASE}/repos/${repoId}/file-content`, { params: { path } }),
  
  chatStream: async (
    repoId: string, 
    question: string, 
    sessionId: string, 
    onToken: (token: string) => void, 
    onDone: (data: any) => void, 
    onError: (err: any) => void
  ) => {
    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo_id: repoId,
          question: question,
          session_id: sessionId,
        }),
      });

      if (!response.ok) throw new Error("Chat request failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Could not get stream reader");

      const decoder = new TextDecoder();
      let buffer = "";
      let eventType = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.replace("event: ", "").trim();
          } else if (line.startsWith("data: ")) {
            const data = line.replace("data: ", "").trim();
            if (eventType === "token") {
              onToken(data);
            } else if (eventType === "done") {
              onDone(JSON.parse(data));
            }
            eventType = ""; // Reset for next event
          }
        }
      }
    } catch (err) {
      onError(err);
    }
  }
};
