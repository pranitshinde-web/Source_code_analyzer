import React from 'react';
import { User, Bot } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { cn } from "../../utils/cn";

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ role, content }) => {
  const isUser = role === "user";
  
  // Clean the content: replace literal "\n" strings with actual newline characters
  const formattedContent = content.replace(/\\n/g, '\n');

  return (
    <div className={cn(
      "flex w-full px-4 py-8 group transition-colors duration-200",
      isUser ? "bg-white dark:bg-zinc-900" : "bg-zinc-50/50 dark:bg-zinc-800/30"
    )}>
      <div className="max-w-3xl mx-auto flex gap-6 w-full">
        <div className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm border transition-transform group-hover:scale-105",
          isUser 
            ? "bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400" 
            : "bg-blue-600 border-blue-500 text-white shadow-blue-500/20"
        )}>
          {isUser ? <User size={20} /> : <Bot size={20} />}
        </div>
        
        <div className="flex-1 space-y-2 overflow-hidden">
          <div className="flex items-center gap-2">
             <span className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
               {isUser ? "You" : "Assistant"}
             </span>
          </div>
          
          <div className="prose prose-zinc dark:prose-invert max-w-none leading-relaxed text-zinc-800 dark:text-zinc-200">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <div className="relative my-6 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 shadow-sm">
                      <div className="bg-zinc-100 dark:bg-zinc-800 px-4 py-2 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{match[1]}</span>
                        <button className="text-[10px] font-bold text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors uppercase tracking-wider">Copy</button>
                      </div>
                      <SyntaxHighlighter
                        style={oneDark}
                        language={match[1]}
                        PreTag="div"
                        customStyle={{ margin: 0, padding: '1.5rem', fontSize: '13px', background: 'transparent' }}
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    </div>
                  ) : (
                    <code className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400 font-medium before:content-none after:content-none" {...props}>
                      {children}
                    </code>
                  );
                },
                p: ({children}) => <p className="mb-4 last:mb-0">{children}</p>,
                ul: ({children}) => <ul className="list-disc pl-6 mb-4 space-y-2">{children}</ul>,
                ol: ({children}) => <ol className="list-decimal pl-6 mb-4 space-y-2">{children}</ol>,
                li: ({children}) => <li className="pl-1">{children}</li>,
                h1: ({children}) => <h1 className="text-2xl font-bold mb-4 mt-6 text-zinc-900 dark:text-zinc-100">{children}</h1>,
                h2: ({children}) => <h2 className="text-xl font-bold mb-3 mt-5 text-zinc-900 dark:text-zinc-100">{children}</h2>,
                h3: ({children}) => <h3 className="text-lg font-bold mb-2 mt-4 text-zinc-900 dark:text-zinc-100">{children}</h3>,
              }}
            >
              {formattedContent}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
};
