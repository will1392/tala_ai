import { useState } from 'react';
import { FolderPlus } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Label } from '../ui/Label';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFolder: (folderName: string, description?: string) => Promise<void>;
}

export const CreateFolderModal = ({ isOpen, onClose, onCreateFolder }: CreateFolderModalProps) => {
  const [folderName, setFolderName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!folderName.trim()) {
      setError('Folder name is required');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      await onCreateFolder(folderName.trim(), description.trim() || undefined);
      setFolderName('');
      setDescription('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create folder');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (isCreating) return;
    setFolderName('');
    setDescription('');
    setError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Folder"
      size="md"
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-[var(--primary)]/20 rounded-lg flex items-center justify-center">
          <FolderPlus size={20} className="text-[var(--primary)]" />
        </div>
        <p className="text-sm text-[var(--muted)]">Organize your documents</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="folderName" required>
            Folder Name
          </Label>
          <Input
            id="folderName"
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="e.g., Destinations, Visa Policies..."
            disabled={isCreating}
            autoFocus
          />
        </div>

        <div>
          <Label htmlFor="description">
            Description (Optional)
          </Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of what this folder contains..."
            rows={3}
            disabled={isCreating}
          />
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isCreating}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!folderName.trim() || isCreating}
            className="flex-1"
          >
            {isCreating ? 'Creating...' : 'Create Folder'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};