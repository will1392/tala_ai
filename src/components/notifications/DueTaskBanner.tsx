import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import taskService from '../../services/taskService';
import type { Task } from '../../services/taskService';
import { featureConfig } from '../../config/features';

export const DueTaskBanner = () => {
  const [dueTasks, setDueTasks] = useState<Task[]>([]);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  // Check for due tasks every minute
  useEffect(() => {
    // Only check tasks if feature is enabled
    if (!featureConfig.tasks.enabled || !featureConfig.tasks.showBanner) {
      return;
    }
    
    checkDueTasks();
    const interval = setInterval(checkDueTasks, featureConfig.tasks.checkInterval);
    
    return () => clearInterval(interval);
  }, []);

  const checkDueTasks = async () => {
    try {
      const tasks = await taskService.getTasks({ 
        status: 'pending',
        limit: 20 
      });
      
      const now = new Date();
      const overdueTasks = tasks.filter(task => {
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        return dueDate <= now;
      });
      
      setDueTasks(overdueTasks);
      setIsVisible(overdueTasks.length > 0);
    } catch (error) {
      // Silently handle errors - task service may not be running
      // This is non-critical UI functionality
      setDueTasks([]);
      setIsVisible(false);
    }
  };

  const handleClick = () => {
    if (dueTasks.length > 0) {
      // Navigate to dashboard with task highlighted
      navigate('/dashboard', { 
        state: { highlightTaskId: dueTasks[currentTaskIndex].id } 
      });
    }
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(false);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentTaskIndex((prev) => (prev + 1) % dueTasks.length);
  };

  // Don't render if feature is disabled
  if (!featureConfig.tasks.enabled || !featureConfig.tasks.showBanner) return null;
  
  if (!isVisible || dueTasks.length === 0) return null;

  const currentTask = dueTasks[currentTaskIndex];
  const timeOverdue = () => {
    const now = new Date();
    const dueDate = new Date(currentTask.dueDate!);
    const diffMs = now.getTime() - dueDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} overdue`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} overdue`;
    return 'Due now';
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg cursor-pointer"
          onClick={handleClick}
        >
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="animate-pulse" size={20} />
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Task Overdue:</span>
                  <span className="font-medium">{currentTask.title}</span>
                  <span className="text-red-200 text-sm flex items-center gap-1">
                    <Clock size={14} />
                    {timeOverdue()}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {dueTasks.length > 1 && (
                  <button
                    onClick={handleNext}
                    className="text-sm bg-red-700/50 hover:bg-red-700 px-3 py-1 rounded-lg transition-colors"
                  >
                    {currentTaskIndex + 1} of {dueTasks.length} • Next →
                  </button>
                )}
                <button
                  onClick={handleDismiss}
                  className="hover:bg-red-700/50 p-1 rounded-lg transition-colors"
                  title="Dismiss"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};