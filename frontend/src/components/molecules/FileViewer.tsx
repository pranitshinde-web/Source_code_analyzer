import React from 'react';
import { X, FileCode2 } from 'lucide-react';
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
    <div className="absolute inset-0 z-50 bg-white dark:bg-zinc-950 flex flex-col animate-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
            <FileCode2 size={16} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{path.split('/').pop()}</span>
            <span className="text-[11px] text-zinc-500 font-mono">{path}</span>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
        >
          <X size={20} />
        </button>
      </div>

      {/* Editor Area */}
      <div className="flex-1 overflow-auto bg-[#282c34] custom-scrollbar">
        <SyntaxHighlighter
          language={extension}
          style={oneDark}
          customStyle={{
            margin: 0,
            padding: '24px',
            fontSize: '13px',
            lineHeight: '1.6',
            backgroundColor: 'transparent',
            minHeight: '100%'
          }}
          showLineNumbers={true}
          lineNumberStyle={{ minWidth: '2.5em', paddingRight: '1em', color: '#636d83', textAlign: 'right' }}
        >
          {content}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};
