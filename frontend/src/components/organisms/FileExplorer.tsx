import React, { useEffect, useState } from 'react';
import { Folder, File, ChevronRight, ChevronDown, Loader2 } from 'lucide-react';
import { api, FileNode } from '../../services/api';

interface FileTreeItemProps {
  node: FileNode;
  level: number;
  onFileClick: (path: string) => void;
}

const FileTreeItem: React.FC<FileTreeItemProps> = ({ node, level, onFileClick }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isDirectory = node.type === 'directory';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDirectory) {
      setIsOpen(!isOpen);
    } else {
      onFileClick(node.path);
    }
  };

  return (
    <div>
      <div
        className="flex items-center gap-2 py-1.5 px-2 hover:bg-[#212121] cursor-pointer text-sm text-[#8e8e8e] hover:text-[#ececec] transition-colors rounded"
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
      >
        {isDirectory ? (
          <>
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <Folder size={14} className="text-[#5e5e5e]" />
          </>
        ) : (
          <>
            <div className="w-[14px]" />
            <File size={14} className="text-[#5e5e5e]" />
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
  repoId: string;
  onFileClick: (path: string) => void;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({ repoId, onFileClick }) => {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getFiles(repoId).then(res => {
      setFiles(res.data);
      setLoading(false);
    }).catch(err => {
      console.error("Failed to fetch files", err);
      setLoading(false);
    });
  }, [repoId]);

  if (loading) return <div className="p-4 text-[#8e8e8e] text-xs"><Loader2 className="animate-spin" size={16} /></div>;

  return (
    <div className="py-1">
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
