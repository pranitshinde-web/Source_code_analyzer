import React, { useState } from 'react';
import { Folder, File, ChevronRight, ChevronDown } from 'lucide-react';
import { FileNode } from '../../services/api';

interface FileTreeItemProps {
  node: FileNode;
  level: number;
  onFileClick: (path: string) => void;
}

const FileTreeItem: React.FC<FileTreeItemProps> = ({ node, level, onFileClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isDirectory = node.type === 'directory';

  const handleClick = () => {
    if (isDirectory) {
      setIsOpen(!isOpen);
    } else {
      onFileClick(node.path);
    }
  };

  return (
    <div>
      <div
        className="flex items-center gap-1 py-1 px-2 hover:bg-gray-800 cursor-pointer text-sm text-gray-400 hover:text-white"
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
      >
        {isDirectory ? (
          <>
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <Folder size={14} className="text-blue-400" />
          </>
        ) : (
          <>
            <div className="w-[14px]" />
            <File size={14} className="text-gray-500" />
          </>
        )}
        <span className="truncate">{node.name}</span>
      </div>
      {isDirectory && isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              level={level + 1}
              onFileClick={onFileClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface FileExplorerProps {
  files: FileNode[];
  onFileClick: (path: string) => void;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({ files, onFileClick }) => {
  return (
    <div className="py-2">
      {files.map((node) => (
        <FileTreeItem
          key={node.path}
          node={node}
          level={0}
          onFileClick={onFileClick}
        />
      ))}
    </div>
  );
};
