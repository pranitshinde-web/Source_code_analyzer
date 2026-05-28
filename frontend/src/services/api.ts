import axios, { AxiosError } from "axios";

const API_BASE = "http://localhost:8001";

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
});

// Request interceptor: attach token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response interceptor: handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && originalRequest && !(originalRequest as any)._retry) {
      (originalRequest as any)._retry = true;
      try {
        const refreshToken = localStorage.getItem("refresh_token");
        const { data } = await axios.post(`${API_BASE}/auth/refresh`, { token: refreshToken });
        localStorage.setItem("access_token", data.access_token);
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

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

export interface ChatSessionMetadata {
  session_id: string;
  repo_id: string;
  title: string;
  updated_at: string;
}

export const api = {
  login: (data: any) => apiClient.post("/auth/login", data),
  register: (data: any) => apiClient.post("/auth/register", data),

  ingest: (repoUrl: string) => apiClient.post("/ingest", { repo_url: repoUrl }),
  getStatus: (repoId: string) => apiClient.get<RepoJob>(`/status/${repoId}`),
  listJobs: () => apiClient.get<RepoJob[]>(`/status`),
  deleteRepo: (repoId: string) => apiClient.delete(`/ingest/${repoId}`),

  getFiles: (repoId: string) => apiClient.get<FileNode[]>(`/repos/${repoId}/files`),
  getFileContent: (repoId: string, path: string) => 
    apiClient.get<{ content: string }>(`/repos/${repoId}/file-content`, { params: { path } }),

  listSessions: () => apiClient.get<ChatSessionMetadata[]>(`/chat/sessions`),
  getSessionHistory: (sessionId: string) => apiClient.get<any[]>(`/chat/sessions/${sessionId}`),
  clearSession: (sessionId: string) => apiClient.delete(`/chat/session/${sessionId}`),
  
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
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("access_token")}`
        },
        body: JSON.stringify({ repo_id: repoId, question, session_id: sessionId }),
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
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;

          if (trimmedLine.startsWith("event: ")) {
            eventType = trimmedLine.replace("event: ", "").trim();
          } else if (trimmedLine.startsWith("data: ")) {
            try {
              const rawData = trimmedLine.replace("data: ", "").trim();
              const data = JSON.parse(rawData);
              if (eventType === "token") onToken(data);
              else if (eventType === "done") onDone(data);
              else if (eventType === "error") onError(data);
              eventType = "";
            } catch (parseErr) {
              console.error("Failed to parse SSE data:", trimmedLine, parseErr);
            }
          }
        }
      }
    } catch (err) { onError(err); }
  }
};
