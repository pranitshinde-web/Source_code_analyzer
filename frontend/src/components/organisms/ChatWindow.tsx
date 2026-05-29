import React, { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { ChatMessage } from "../molecules/ChatMessage";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatWindowProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  isLoading: boolean;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ messages, onSendMessage, isLoading }) => {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput("");
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 overflow-hidden">
      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto scroll-smooth pb-4"
      >
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center p-6">
            <div className="max-w-2xl w-full text-center space-y-12">
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/20 rotate-3">
                  <Bot size={32} className="text-white" />
                </div>
                <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">
                  Source Code Analyzer
                </h1>
                <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                  Your RAG-powered technical assistant. Ask questions, explore logic, and dive deep into your repository.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
                {[
                  "How does the authentication flow work?",
                  "Explain the vector store implementation.",
                  "Where are the API routes defined?",
                  "Show me the database schema."
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all text-sm text-zinc-600 dark:text-zinc-400 font-medium active:scale-[0.98]"
                  >
                    "{suggestion}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col">
            {messages.map((msg, i) => (
              <ChatMessage key={i} role={msg.role} content={msg.content} />
            ))}
            {isLoading && (
              <div className="px-4 py-8 bg-zinc-50/50 dark:bg-zinc-800/30">
                <div className="max-w-3xl mx-auto flex gap-6 w-full">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20 animate-pulse">
                    <Bot size={20} className="text-white" />
                  </div>
                  <div className="flex items-center gap-1.5 py-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-400 dark:bg-zinc-500 animate-bounce"></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="px-4 pb-6 pt-2">
        <div className="max-w-3xl mx-auto relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl blur opacity-10 group-focus-within:opacity-25 transition duration-500"></div>
          <form 
            onSubmit={handleSubmit}
            className="relative flex items-center bg-white dark:bg-zinc-950 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-lg px-4 py-2"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Ask a question..."
              className="flex-1 bg-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none resize-none min-h-[24px] max-h-[120px] text-[15px] leading-relaxed py-1"
              rows={1}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="ml-2 p-1.5 rounded-xl bg-blue-600 text-white disabled:bg-zinc-100 dark:disabled:bg-zinc-900 disabled:text-zinc-400 dark:disabled:text-zinc-700 transition-all hover:bg-blue-700 active:scale-95 flex items-center justify-center shadow-md shadow-blue-600/10 shrink-0"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
        <p className="text-center text-[11px] font-medium text-zinc-500 mt-3 tracking-tight">
          Experimental AI Assistant · <span className="text-zinc-400">Context is scoped to active repository</span>
        </p>
      </div>
    </div>
  );
};

import { Bot } from "lucide-react";
