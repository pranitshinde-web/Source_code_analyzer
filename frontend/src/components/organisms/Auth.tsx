import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { api } from "../../services/api";
import { Button } from "../atoms/Button";
import { Input } from "../atoms/Input";
import { cn } from "../../utils/cn";

export const Auth = ({ onAuthSuccess }: { onAuthSuccess: (username: string) => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isWaitingForServer, setIsWaitingForServer] = useState(false);

  // Automatic retry logic if backend is starting up
  useEffect(() => {
    let interval: number | undefined;
    
    if (isWaitingForServer && isLogin) {
      interval = window.setInterval(async () => {
        try {
          const res = await api.login({ username, password });
          localStorage.setItem("access_token", res.data.access_token);
          localStorage.setItem("refresh_token", res.data.refresh_token);
          setIsWaitingForServer(false);
          onAuthSuccess(username);
        } catch (err: any) {
          if (err.response) {
            // Server is up but credentials are wrong now
            setIsWaitingForServer(false);
            setLoading(false);
            setError(err.response?.data?.detail || "Authentication failed");
          }
          // If still no response, keep waiting/polling
        }
      }, 3000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isWaitingForServer, isLogin, username, password, onAuthSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    setIsWaitingForServer(false);

    try {
      if (isLogin) {
        const res = await api.login({ username, password });
        localStorage.setItem("access_token", res.data.access_token);
        localStorage.setItem("refresh_token", res.data.refresh_token);
      } else {
        await api.register({ username, password });
        setIsLogin(true);
        setError("Registration successful! Please login.");
        setLoading(false);
        return;
      }
      onAuthSuccess(username);
    } catch (err: any) {
      if (!err.response) {
        setError("Connecting to server, please wait...");
        setIsWaitingForServer(true);
      } else {
        setError(err.response?.data?.detail || "Authentication failed");
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-950 p-4 transition-colors">
      <div className="w-full max-w-md space-y-8 bg-white dark:bg-gray-900 p-8 rounded-xl border border-gray-200 dark:border-gray-800 shadow-xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            {isLogin ? "Welcome back" : "Create account"}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {isLogin ? "Sign in to your account" : "Join the source code analyzer"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {error && (
            <div className={cn(
              "p-4 text-sm rounded-lg flex items-center gap-3 transition-all animate-in fade-in slide-in-from-top-2 duration-300",
              error.includes("successful") 
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800"
                : error.includes("Connecting")
                ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-100 dark:border-blue-800"
                : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-100 dark:border-red-800"
            )}>
              {error.includes("Connecting") && (
                <Loader2 size={18} className="animate-spin text-blue-500 shrink-0" />
              )}
              <span className="font-medium">{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Username
              </label>
              <Input
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <Button 
            className="w-full py-3" 
            disabled={loading}
          >
            {loading ? "Processing..." : isLogin ? "Sign In" : "Register"}
          </Button>

          <div className="text-center">
            <button 
              type="button"
              className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 transition-colors"
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
            >
              {isLogin ? "Don't have an account? Register" : "Already have an account? Sign In"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
