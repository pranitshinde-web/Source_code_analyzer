import { useState } from "react";
import { api } from "../../services/api";

export const Auth = ({ onAuthSuccess }: { onAuthSuccess: () => void }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (isLogin) {
        const res = await api.login({ username, password });
        localStorage.setItem("access_token", res.data.access_token);
        localStorage.setItem("refresh_token", res.data.refresh_token);
      } else {
        await api.register({ username, password });
        // Automatically login after registration or just switch to login mode
        setIsLogin(true);
        setError("Registration successful! Please login.");
        return;
      }
      onAuthSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Authentication failed");
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="p-8 bg-white rounded shadow-md w-96">
        <h2 className="text-2xl mb-4">{isLogin ? "Login" : "Register"}</h2>
        {error && <p className="text-red-500 mb-2">{error}</p>}
        <input
          className="w-full p-2 mb-4 border rounded"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          className="w-full p-2 mb-4 border rounded"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button className="w-full p-2 bg-blue-500 text-white rounded">
          {isLogin ? "Login" : "Register"}
        </button>
        <p className="mt-4 text-sm cursor-pointer text-blue-500" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "Need an account? Register" : "Already have an account? Login"}
        </p>
      </form>
    </div>
  );
};
