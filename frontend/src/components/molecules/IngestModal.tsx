import React, { useState } from "react";
import { X } from "lucide-react";
import { Button } from "../atoms/Button";
import { Input } from "../atoms/Input";

interface IngestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIngest: (url: string) => void;
}

export const IngestModal: React.FC<IngestModalProps> = ({ isOpen, onClose, onIngest }) => {
  const [url, setUrl] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onIngest(url);
      setUrl("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold">Index New Repository</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
              GitHub Repository URL
            </label>
            <Input 
              placeholder="https://github.com/owner/repo" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              autoFocus
            />
            <p className="mt-2 text-xs text-gray-500">
              The system will clone, chunk, and index the repository files.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!url.trim()}>
              Start Indexing
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
