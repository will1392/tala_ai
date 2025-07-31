import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  Lightbulb,
  FileText,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Search,
  Star,
  Clock,
  TrendingUp,
  X
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { QuickReference } from './resources/QuickReference';
import { ExampleLibrary } from './resources/ExampleLibrary';
import { TemplateSelector } from './resources/TemplateSelector';
import { ChecklistDisplay } from './resources/ChecklistDisplay';
import { useResourceIntelligence } from '../../hooks/useResourceIntelligence';

interface ResourcePanelProps {
  currentContext: string | null;
  conversation?: any[];
  className?: string;
  defaultExpanded?: boolean;
  position?: 'left' | 'right';
  onResourceSelect?: (resource: any) => void;
}

interface Tab {
  id: string;
  name: string;
  icon: React.ElementType;
  component: React.ComponentType<any>;
  badge?: number;
}

const TABS: Tab[] = [
  {
    id: 'quick-reference',
    name: 'Quick Ref',
    icon: BookOpen,
    component: QuickReference
  },
  {
    id: 'examples',
    name: 'Examples',
    icon: Lightbulb,
    component: ExampleLibrary
  },
  {
    id: 'templates',
    name: 'Templates',
    icon: FileText,
    component: TemplateSelector
  },
  {
    id: 'checklist',
    name: 'Checklist',
    icon: CheckSquare,
    component: ChecklistDisplay
  }
];

export const ResourcePanel: React.FC<ResourcePanelProps> = ({
  currentContext,
  conversation = [],
  className = '',
  defaultExpanded = true,
  position = 'right',
  onResourceSelect
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [activeTab, setActiveTab] = useState('quick-reference');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  
  // Use resource intelligence hook
  const {
    resources,
    recommendations,
    recentlyUsed,
    loading,
    trackUsage,
    getRelevantResources
  } = useResourceIntelligence(currentContext, conversation);

  // Load saved preferences
  useEffect(() => {
    const saved = localStorage.getItem('cmo-resource-panel-prefs');
    if (saved) {
      const prefs = JSON.parse(saved);
      setFavorites(prefs.favorites || []);
      setIsExpanded(prefs.expanded ?? defaultExpanded);
      setActiveTab(prefs.lastTab || 'quick-reference');
    }
  }, [defaultExpanded]);

  // Save preferences
  useEffect(() => {
    const prefs = {
      favorites,
      expanded: isExpanded,
      lastTab: activeTab
    };
    localStorage.setItem('cmo-resource-panel-prefs', JSON.stringify(prefs));
  }, [favorites, isExpanded, activeTab]);

  // Handle resource selection
  const handleResourceSelect = (resource: any) => {
    trackUsage(resource.id, 'select');
    if (onResourceSelect) {
      onResourceSelect(resource);
    }
  };

  // Toggle favorite
  const toggleFavorite = (resourceId: string) => {
    setFavorites(prev => 
      prev.includes(resourceId)
        ? prev.filter(id => id !== resourceId)
        : [...prev, resourceId]
    );
  };

  // Get active tab component
  const ActiveTabComponent = TABS.find(tab => tab.id === activeTab)?.component;

  // Filter resources based on search
  const filteredResources = searchQuery
    ? resources.filter(r => 
        r.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : resources;

  return (
    <motion.div
      initial={{ x: position === 'right' ? 100 : -100, opacity: 0 }}
      animate={{ 
        x: 0, 
        opacity: 1,
        width: isExpanded ? '380px' : '48px'
      }}
      transition={{ type: 'spring', damping: 20 }}
      className={cn(
        "fixed z-30 bg-white dark:bg-gray-900 shadow-xl",
        "border border-gray-200 dark:border-gray-700",
        "flex flex-col h-[calc(100vh-8rem)]",
        position === 'right' ? 'right-4' : 'left-4',
        "top-24 rounded-lg",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        {isExpanded ? (
          <>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Resources</h3>
              {currentContext && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  ({currentContext})
                </span>
              )}
            </div>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Collapse panel"
            >
              {position === 'right' ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </>
        ) : (
          <button
            onClick={() => setIsExpanded(true)}
            className="p-2 w-full flex justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Expand panel"
          >
            <BookOpen className="w-5 h-5 text-primary" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            {/* Search Bar */}
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search resources..."
                  className={cn(
                    "w-full pl-10 pr-8 py-2",
                    "border border-gray-300 dark:border-gray-600 rounded-lg",
                    "bg-white dark:bg-gray-800",
                    "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
                    "text-sm"
                  )}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            {recommendations.length > 0 && !searchQuery && (
              <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    Recommended for you
                  </span>
                </div>
                <div className="space-y-1">
                  {recommendations.slice(0, 3).map((rec, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleResourceSelect(rec)}
                      className="w-full text-left p-2 text-sm rounded hover:bg-blue-100 dark:hover:bg-blue-800/30 transition-colors"
                    >
                      <div className="font-medium text-blue-700 dark:text-blue-300">
                        {rec.title}
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400">
                        {rec.type} • {rec.relevanceScore}% match
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              {TABS.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1 px-3 py-2.5",
                      "text-sm font-medium transition-all",
                      "border-b-2",
                      activeTab === tab.id
                        ? "border-primary text-primary"
                        : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.name}</span>
                    {tab.badge && (
                      <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-white rounded-full">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">
              {ActiveTabComponent && (
                <ActiveTabComponent
                  context={currentContext}
                  resources={filteredResources}
                  favorites={favorites}
                  recentlyUsed={recentlyUsed}
                  onSelect={handleResourceSelect}
                  onToggleFavorite={toggleFavorite}
                  trackUsage={trackUsage}
                  searchQuery={searchQuery}
                />
              )}
            </div>

            {/* Recently Used Footer */}
            {recentlyUsed.length > 0 && !searchQuery && (
              <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Recently Used
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentlyUsed.slice(0, 4).map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleResourceSelect(item)}
                      className={cn(
                        "px-2 py-1 text-xs rounded-full",
                        "bg-gray-200 dark:bg-gray-700",
                        "hover:bg-gray-300 dark:hover:bg-gray-600",
                        "transition-colors"
                      )}
                    >
                      {item.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ResourcePanel;