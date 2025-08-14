import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../shared/Button';
import { Calendar, Clock, AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { Task, CreateTaskInput } from '../../services/taskService';

interface TaskEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Array<Task | CreateTaskInput>;
  onSave: (tasks: CreateTaskInput[]) => void;
  mode?: 'edit' | 'create';
}

export const TaskEditModal = ({ 
  isOpen, 
  onClose, 
  tasks: initialTasks, 
  onSave,
  mode = 'edit' 
}: TaskEditModalProps) => {
  const [editedTasks, setEditedTasks] = useState<CreateTaskInput[]>([]);

  useEffect(() => {
    if (isOpen && initialTasks.length > 0) {
      setEditedTasks(initialTasks.map(task => ({
        title: task.title,
        description: task.description,
        priority: task.priority,
        dueDate: task.dueDate,
        assignee: task.assignee,
        tags: task.tags || [],
        source: 'source' in task ? task.source : 'manual',
        sourceId: 'sourceId' in task ? task.sourceId : undefined
      })));
    }
  }, [isOpen, initialTasks]);

  const handleTaskChange = (index: number, field: keyof CreateTaskInput, value: any) => {
    const updated = [...editedTasks];
    // Special handling for dueDate to preserve local time
    if (field === 'dueDate' && value) {
      // The datetime-local input gives us a string like "2024-03-20T14:30"
      // We want to store this as-is without timezone conversion
      updated[index] = { ...updated[index], [field]: value };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setEditedTasks(updated);
  };


  const handleSave = () => {
    onSave(editedTasks);
    onClose();
  };

  const priorityOptions = [
    { value: 'low', label: 'Low', color: 'bg-green-500/20 text-green-400' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-500/20 text-yellow-400' },
    { value: 'high', label: 'High', color: 'bg-orange-500/20 text-orange-400' },
    { value: 'urgent', label: 'Urgent', color: 'bg-red-500/20 text-red-400' }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'edit' ? 'Edit Tasks' : 'Create Tasks'}
      size="lg"
    >
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
        {editedTasks.map((task, index) => (
          <div key={index} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3 border border-gray-200 dark:border-gray-700">
            {/* Title */}
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Title</label>
              <input
                type="text"
                value={task.title}
                onChange={(e) => handleTaskChange(index, 'title', e.target.value)}
                className="w-full bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:bg-white dark:focus:bg-gray-600 transition-colors outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Task title..."
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block">Description</label>
              <textarea
                value={task.description || ''}
                onChange={(e) => handleTaskChange(index, 'description', e.target.value)}
                className="w-full bg-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:bg-gray-600 transition-colors outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                rows={2}
                placeholder="Task description..."
              />
            </div>

            {/* Priority and Due Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block flex items-center gap-1">
                  <AlertCircle size={14} />
                  Priority
                </label>
                <select
                  value={task.priority}
                  onChange={(e) => handleTaskChange(index, 'priority', e.target.value)}
                  className="w-full bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:bg-white dark:focus:bg-gray-600 transition-colors outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {priorityOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400 mb-1 block flex items-center gap-1">
                  <Calendar size={14} />
                  Due Date
                </label>
                <input
                  type="datetime-local"
                  value={(() => {
                    if (!task.dueDate) return '';
                    try {
                      // If dueDate is already in datetime-local format (YYYY-MM-DDTHH:mm), use it as-is
                      if (task.dueDate.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
                        return task.dueDate;
                      }
                      // Otherwise, convert to local datetime string
                      const date = new Date(task.dueDate);
                      if (isNaN(date.getTime())) return '';
                      
                      // Convert to local time in datetime-local format
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      const hours = String(date.getHours()).padStart(2, '0');
                      const minutes = String(date.getMinutes()).padStart(2, '0');
                      
                      return `${year}-${month}-${day}T${hours}:${minutes}`;
                    } catch {
                      return '';
                    }
                  })()}
                  onChange={(e) => handleTaskChange(index, 'dueDate', e.target.value)}
                  className="w-full bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:bg-white dark:focus:bg-gray-600 transition-colors outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>


            {/* Priority indicator */}
            <div className="flex items-center justify-between pt-2">
              <span className={cn(
                'px-3 py-1 rounded-full text-sm',
                priorityOptions.find(p => p.value === task.priority)?.color
              )}>
                {priorityOptions.find(p => p.value === task.priority)?.label} Priority
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex gap-3 mt-6">
        <Button variant="secondary" onClick={onClose} className="flex-1">
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave} className="flex-1">
          Save Changes
        </Button>
      </div>
    </Modal>
  );
};