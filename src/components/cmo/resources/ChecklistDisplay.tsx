import React, { useState, useEffect } from 'react';
import { CheckSquare, Square, Star, RotateCcw, Target, Clock, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../utils/cn';

interface ChecklistDisplayProps {
  context: string | null;
  resources: any[];
  favorites: string[];
  recentlyUsed: any[];
  onSelect: (resource: any) => void;
  onToggleFavorite: (resourceId: string) => void;
  trackUsage: (resourceId: string, action: string) => void;
  searchQuery?: string;
}

interface Checklist {
  id: string;
  title: string;
  description: string;
  category: string;
  items: ChecklistItem[];
  tags: string[];
  priority?: 'high' | 'medium' | 'low';
  estimatedTime?: string;
}

interface ChecklistItem {
  id: string;
  text: string;
  description?: string;
  required?: boolean;
  tips?: string[];
  resources?: string[];
}

interface ChecklistProgress {
  [checklistId: string]: {
    [itemId: string]: boolean;
  };
}

export const ChecklistDisplay: React.FC<ChecklistDisplayProps> = ({
  context,
  resources,
  favorites,
  recentlyUsed,
  onSelect,
  onToggleFavorite,
  trackUsage,
  searchQuery
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [expandedChecklist, setExpandedChecklist] = useState<string | null>(null);
  const [checklistProgress, setChecklistProgress] = useState<ChecklistProgress>({});
  const [showTips, setShowTips] = useState<Record<string, boolean>>({});

  // Load saved progress
  useEffect(() => {
    const saved = localStorage.getItem('cmo-checklist-progress');
    if (saved) {
      setChecklistProgress(JSON.parse(saved));
    }
  }, []);

  // Save progress
  useEffect(() => {
    localStorage.setItem('cmo-checklist-progress', JSON.stringify(checklistProgress));
  }, [checklistProgress]);

  // Filter resources to checklists
  const checklists = resources.filter(r => r.type === 'checklist') as Checklist[];

  // Calculate completion for each checklist
  const getChecklistCompletion = (checklist: Checklist): number => {
    const progress = checklistProgress[checklist.id] || {};
    const completed = Object.values(progress).filter(Boolean).length;
    return Math.round((completed / checklist.items.length) * 100);
  };

  // Apply filters
  let filteredChecklists = checklists;
  if (selectedFilter === 'active') {
    filteredChecklists = filteredChecklists.filter(c => {
      const completion = getChecklistCompletion(c);
      return completion > 0 && completion < 100;
    });
  } else if (selectedFilter === 'completed') {
    filteredChecklists = filteredChecklists.filter(c => 
      getChecklistCompletion(c) === 100
    );
  }

  // Sort by priority and completion
  filteredChecklists.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const aPriority = priorityOrder[a.priority || 'medium'];
    const bPriority = priorityOrder[b.priority || 'medium'];
    
    if (aPriority !== bPriority) return aPriority - bPriority;
    
    // Then by completion (less completed first)
    return getChecklistCompletion(a) - getChecklistCompletion(b);
  });

  // Toggle item completion
  const toggleItem = (checklistId: string, itemId: string) => {
    setChecklistProgress(prev => ({
      ...prev,
      [checklistId]: {
        ...prev[checklistId],
        [itemId]: !prev[checklistId]?.[itemId]
      }
    }));
    trackUsage(checklistId, 'check-item');
  };

  // Reset checklist
  const resetChecklist = (checklistId: string) => {
    setChecklistProgress(prev => ({
      ...prev,
      [checklistId]: {}
    }));
    trackUsage(checklistId, 'reset');
  };

  // Handle checklist click
  const handleChecklistClick = (checklist: Checklist) => {
    if (expandedChecklist === checklist.id) {
      setExpandedChecklist(null);
    } else {
      setExpandedChecklist(checklist.id);
      trackUsage(checklist.id, 'view');
      onSelect(checklist);
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
      case 'low': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
      default: return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800';
    }
  };

  if (checklists.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No checklists available</p>
        {context && (
          <p className="text-sm mt-2">
            Checklists for {context} will be added soon
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Filters */}
      <div className="flex gap-2">
        <button
          onClick={() => setSelectedFilter('all')}
          className={cn(
            "px-3 py-1.5 text-sm rounded-lg transition-all",
            selectedFilter === 'all'
              ? "bg-primary text-white"
              : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
          )}
        >
          All Checklists
        </button>
        <button
          onClick={() => setSelectedFilter('active')}
          className={cn(
            "px-3 py-1.5 text-sm rounded-lg transition-all",
            selectedFilter === 'active'
              ? "bg-primary text-white"
              : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
          )}
        >
          In Progress
        </button>
        <button
          onClick={() => setSelectedFilter('completed')}
          className={cn(
            "px-3 py-1.5 text-sm rounded-lg transition-all",
            selectedFilter === 'completed'
              ? "bg-primary text-white"
              : "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
          )}
        >
          Completed
        </button>
      </div>

      {/* Checklists */}
      <div className="space-y-3">
        {filteredChecklists.map((checklist) => {
          const completion = getChecklistCompletion(checklist);
          const progress = checklistProgress[checklist.id] || {};
          const completedCount = Object.values(progress).filter(Boolean).length;
          
          return (
            <motion.div
              key={checklist.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Checklist header */}
              <div
                className="p-4 cursor-pointer"
                onClick={() => handleChecklistClick(checklist)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{checklist.title}</h4>
                      {completion === 100 && (
                        <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                          Completed
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {checklist.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(checklist.id);
                      }}
                      className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <Star
                        className={cn(
                          "w-4 h-4",
                          favorites.includes(checklist.id)
                            ? "text-yellow-500 fill-yellow-500"
                            : "text-gray-400"
                        )}
                      />
                    </button>
                    {completion > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          resetChecklist(checklist.id);
                        }}
                        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        title="Reset checklist"
                      >
                        <RotateCcw className="w-4 h-4 text-gray-400" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex items-center gap-3 mt-3">
                  {checklist.priority && (
                    <span className={cn(
                      "px-2 py-0.5 text-xs rounded-full flex items-center gap-1",
                      getPriorityColor(checklist.priority)
                    )}>
                      <Target className="w-3 h-3" />
                      {checklist.priority} priority
                    </span>
                  )}
                  {checklist.estimatedTime && (
                    <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {checklist.estimatedTime}
                    </span>
                  )}
                  <div className="flex-1" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {completedCount}/{checklist.items.length} completed
                  </span>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="relative w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${completion}%` }}
                      className={cn(
                        "absolute h-full rounded-full",
                        completion === 100
                          ? "bg-green-500"
                          : completion > 50
                          ? "bg-blue-500"
                          : "bg-gray-400"
                      )}
                    />
                  </div>
                </div>
              </div>

              {/* Expanded content */}
              <AnimatePresence>
                {expandedChecklist === checklist.id && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700">
                      {/* Checklist items */}
                      <div className="space-y-2 mt-4">
                        {checklist.items.map((item) => {
                          const isChecked = progress[item.id] || false;
                          const showItemTips = showTips[item.id] || false;
                          
                          return (
                            <div key={item.id} className="space-y-2">
                              <div className="flex items-start gap-3">
                                <button
                                  onClick={() => toggleItem(checklist.id, item.id)}
                                  className="mt-0.5 flex-shrink-0"
                                >
                                  {isChecked ? (
                                    <CheckSquare className="w-5 h-5 text-primary" />
                                  ) : (
                                    <Square className="w-5 h-5 text-gray-400 hover:text-primary transition-colors" />
                                  )}
                                </button>
                                <div className="flex-1">
                                  <div className={cn(
                                    "text-sm",
                                    isChecked && "line-through text-gray-500"
                                  )}>
                                    {item.text}
                                    {item.required && (
                                      <span className="ml-1 text-red-500">*</span>
                                    )}
                                  </div>
                                  {item.description && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      {item.description}
                                    </p>
                                  )}
                                  {item.tips && item.tips.length > 0 && (
                                    <button
                                      onClick={() => setShowTips(prev => ({
                                        ...prev,
                                        [item.id]: !prev[item.id]
                                      }))}
                                      className="text-xs text-primary hover:underline mt-1"
                                    >
                                      {showItemTips ? 'Hide tips' : `Show ${item.tips.length} tips`}
                                    </button>
                                  )}
                                </div>
                              </div>
                              
                              {/* Item tips */}
                              <AnimatePresence>
                                {showItemTips && item.tips && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="ml-8 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                                  >
                                    <div className="flex items-center gap-2 mb-2">
                                      <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                        Tips
                                      </span>
                                    </div>
                                    <ul className="space-y-1">
                                      {item.tips.map((tip, idx) => (
                                        <li key={idx} className="text-sm text-blue-700 dark:text-blue-300">
                                          • {tip}
                                        </li>
                                      ))}
                                    </ul>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>

                      {/* Required items note */}
                      {checklist.items.some(item => item.required) && (
                        <div className="mt-4 text-xs text-gray-500">
                          <span className="text-red-500">*</span> Required items
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* No results */}
      {filteredChecklists.length === 0 && (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No checklists match your filter</p>
          <button
            onClick={() => setSelectedFilter('all')}
            className="mt-3 text-sm text-primary hover:underline"
          >
            View all checklists
          </button>
        </div>
      )}
    </div>
  );
};