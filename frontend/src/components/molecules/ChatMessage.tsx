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
    <div className={cn("flex w-full py-6 px-4", isUser ? "bg-transparent" : "bg-gray-50 dark:bg-gray-800/50")}>
      <div className="max-w-3xl mx-auto flex gap-4 w-full">
        <div className={cn(
          "w-8 h-8 rounded-sm flex items-center justify-center shrink-0",
          isUser ? "bg-purple-600" : "bg-emerald-600"
        )}>
          {isUser ? <User size={20} className="text-white" /> : <Bot size={20} className="text-white" />}
        </div>
        <div className="prose dark:prose-invert max-w-none flex-1 overflow-hidden">
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={oneDark}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              }
            }}
          >
            {formattedContent}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};
