import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Wrench,
  BarChart3,
  Zap,
  Hash,
  Type,
  Search,
  Pin,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useMode } from '../../hooks/useMode';
import { TitleTagTester } from './tools/TitleTagTester';
import { SubjectLineTester } from './tools/SubjectLineTester';
import { HashtagGenerator } from './tools/HashtagGenerator';
import { CharacterCounter } from './tools/CharacterCounter';
import { KeywordDensityChecker } from './tools/KeywordDensityChecker';

interface Tool {
  id: string;
  name: string;
  icon: React.ElementType;
  component: React.ComponentType<any>;
  contexts: string[];
  description: string;
  category: 'analysis' | 'generator' | 'optimizer' | 'universal';
  isPinned?: boolean;
}

interface ContextualToolbarProps {
  currentContext: string | null;
  onToolUse?: (toolId: string, data: any) => void;
  className?: string;
  defaultExpanded?: boolean;
  position?: 'left' | 'right';
}

// Tool registry
const TOOLS: Tool[] = [
  {
    id: 'title-tag-tester',
    name: 'Title Tag Tester',
    icon: Type,
    component: TitleTagTester,
    contexts: ['seo'],
    description: 'Test and optimize title tags for SEO',
    category: 'optimizer'
  },
  {
    id: 'subject-line-tester',
    name: 'Subject Line Tester',
    icon: Zap,
    component: SubjectLineTester,
    contexts: ['email'],
    description: 'Analyze email subject lines for effectiveness',
    category: 'analysis'
  },
  {
    id: 'hashtag-generator',
    name: 'Hashtag Generator',
    icon: Hash,
    component: HashtagGenerator,
    contexts: ['social'],
    description: 'Generate relevant and trending hashtags',
    category: 'generator'
  },
  {
    id: 'character-counter',
    name: 'Character Counter',
    icon: BarChart3,
    component: CharacterCounter,
    contexts: ['all'], // Universal tool
    description: 'Count characters for any platform',
    category: 'universal'
  },
  {
    id: 'keyword-density',
    name: 'Keyword Density Checker',
    icon: Search,
    component: KeywordDensityChecker,
    contexts: ['seo', 'email'],
    description: 'Analyze keyword usage and density',
    category: 'analysis'
  }
];

export const ContextualToolbar: React.FC<ContextualToolbarProps> = ({
  currentContext,
  onToolUse,
  className = '',
  defaultExpanded = true,
  position = 'right'
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [pinnedTools, setPinnedTools] = useState<string[]>([]);
  const [toolData, setToolData] = useState<Record<string, any>>({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
  
  // Get tools for current context
  const availableTools = TOOLS.filter(tool => 
    tool.contexts.includes('all') || 
    (currentContext && tool.contexts.includes(currentContext)) ||
    pinnedTools.includes(tool.id)
  );

  // Load saved preferences
  useEffect(() => {
    const saved = localStorage.getItem('cmo-toolbar-prefs');
    if (saved) {
      const prefs = JSON.parse(saved);
      setPinnedTools(prefs.pinnedTools || []);
      setIsExpanded(prefs.expanded ?? defaultExpanded);
    }
  }, [defaultExpanded]);

  // Save preferences
  useEffect(() => {
    const prefs = {
      pinnedTools,
      expanded: isExpanded
    };
    localStorage.setItem('cmo-toolbar-prefs', JSON.stringify(prefs));
  }, [pinnedTools, isExpanded]);

  // Track tool usage
  const handleToolClick = (toolId: string) => {
    setActiveTool(activeTool === toolId ? null : toolId);
    
    // Track usage
    if (onToolUse && activeTool !== toolId) {
      onToolUse(toolId, { action: 'open', context: currentContext });
    }
  };

  const handleToolResult = (toolId: string, result: any) => {
    setToolData(prev => ({
      ...prev,
      [toolId]: result
    }));
    
    if (onToolUse) {
      onToolUse(toolId, { 
        action: 'result', 
        context: currentContext,
        data: result 
      });
    }
  };

  const togglePin = (toolId: string) => {
    setPinnedTools(prev => 
      prev.includes(toolId) 
        ? prev.filter(id => id !== toolId)
        : [...prev, toolId]
    );
  };

  const ActiveToolComponent = activeTool 
    ? TOOLS.find(t => t.id === activeTool)?.component 
    : null;

  return (
    <motion.div
      ref={toolbarRef}
      initial={{ x: position === 'right' ? 100 : -100, opacity: 0 }}
      animate={{ 
        x: 0, 
        opacity: 1,
        width: isFullscreen ? '100vw' : isExpanded ? 'auto' : '48px',
        height: isFullscreen ? '100vh' : 'auto'
      }}
      transition={{ type: 'spring', damping: 20 }}
      className={cn(
        "fixed z-40 bg-white dark:bg-gray-900 shadow-xl",
        "border border-gray-200 dark:border-gray-700",
        "flex flex-col",
        position === 'right' ? 'right-4' : 'left-4',
        "top-24",
        isFullscreen ? 'inset-0 !top-0 !left-0 !right-0' : 'rounded-lg max-h-[calc(100vh-8rem)]',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        {isExpanded ? (
          <>
            <div className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Marketing Tools</h3>
              {currentContext && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  ({currentContext})
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Collapse toolbar"
              >
                {position === 'right' ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={() => setIsExpanded(true)}
            className="p-2 w-full flex justify-center hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Expand toolbar"
          >
            <Wrench className="w-5 h-5 text-primary" />
          </button>
        )}
      </div>

      {/* Tools Grid */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="flex-1 overflow-hidden"
          >
            <div className={cn(
              "p-4",
              isFullscreen ? "flex gap-4 h-full" : ""
            )}>
              {/* Tool buttons */}
              <div className={cn(
                "space-y-3",
                isFullscreen ? "w-64 overflow-y-auto" : ""
              )}>
                {availableTools.length > 0 ? (
                  <>
                    {/* Pinned tools */}
                    {pinnedTools.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase">
                          Pinned
                        </h4>
                        <div className="space-y-2">
                          {availableTools
                            .filter(tool => pinnedTools.includes(tool.id))
                            .map(tool => (
                              <ToolButton
                                key={tool.id}
                                tool={tool}
                                isActive={activeTool === tool.id}
                                isPinned={true}
                                onClick={() => handleToolClick(tool.id)}
                                onTogglePin={() => togglePin(tool.id)}
                              />
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Context tools */}
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase">
                        {currentContext ? `${currentContext} Tools` : 'Universal Tools'}
                      </h4>
                      <div className="space-y-2">
                        {availableTools
                          .filter(tool => !pinnedTools.includes(tool.id))
                          .map(tool => (
                            <ToolButton
                              key={tool.id}
                              tool={tool}
                              isActive={activeTool === tool.id}
                              isPinned={false}
                              onClick={() => handleToolClick(tool.id)}
                              onTogglePin={() => togglePin(tool.id)}
                            />
                          ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Wrench className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No tools available</p>
                    <p className="text-xs mt-1">Select a marketing context</p>
                  </div>
                )}
              </div>

              {/* Active tool panel */}
              {activeTool && ActiveToolComponent && (
                <div className={cn(
                  "border-gray-200 dark:border-gray-700",
                  isFullscreen ? "flex-1 border-l pl-4" : "mt-4 pt-4 border-t"
                )}>
                  <ActiveToolComponent
                    onResult={(result: any) => handleToolResult(activeTool, result)}
                    initialData={toolData[activeTool]}
                    isFullscreen={isFullscreen}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Tool button component
interface ToolButtonProps {
  tool: Tool;
  isActive: boolean;
  isPinned: boolean;
  onClick: () => void;
  onTogglePin: () => void;
}

const ToolButton: React.FC<ToolButtonProps> = ({
  tool,
  isActive,
  isPinned,
  onClick,
  onTogglePin
}) => {
  const Icon = tool.icon;
  
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-3 rounded-lg transition-all",
        "border border-gray-200 dark:border-gray-700",
        "hover:border-primary hover:shadow-sm",
        "group relative",
        isActive && "bg-primary/10 border-primary"
      )}
    >
      <Icon className={cn(
        "w-5 h-5",
        isActive ? "text-primary" : "text-gray-600 dark:text-gray-400"
      )} />
      <div className="flex-1 text-left">
        <div className="font-medium text-sm">{tool.name}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {tool.description}
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onTogglePin();
        }}
        className={cn(
          "opacity-0 group-hover:opacity-100 transition-opacity",
          "p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800",
          isPinned && "opacity-100"
        )}
        title={isPinned ? "Unpin tool" : "Pin tool"}
      >
        <Pin className={cn(
          "w-3 h-3",
          isPinned ? "text-primary fill-primary" : "text-gray-400"
        )} />
      </button>
    </motion.button>
  );
};

export default ContextualToolbar;