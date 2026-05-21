import React from 'react';
import { X } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface FileViewerProps {
  path: string;
  content: string;
  onClose: () => void;
}

export const FileViewer: React.FC<FileViewerProps> = ({ path, content, onClose }) => {
  const extension = path.split('.').pop() || 'text';

  return (
    <div className="absolute inset-0 z-10 bg-white dark:bg-gray-900 flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-sm font-mono text-gray-500 truncate">{path}</span>
        </div>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
        >
          <X size={18} />
        </button>
      </div>
      <div className="flex-1 overflow-auto bg-[#282c34]">
        <SyntaxHighlighter
          language={extension}
          style={oneDark}
          customStyle={{
            margin: 0,
            padding: '20px',
            fontSize: '14px',
            lineHeight: '1.5',
            backgroundColor: 'transparent',
          }}
          showLineNumbers={true}
        >
          {content}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};
