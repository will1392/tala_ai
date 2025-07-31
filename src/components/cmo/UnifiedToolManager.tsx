import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { 
  Search, X, Command, ChevronLeft, ChevronRight, 
  Info, BookOpen, Keyboard, TrendingUp, Clock,
  Star, Grid, List, Minimize2, Maximize2
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useCMOTools } from '../../hooks/useCMOTools';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useLocalStorage } from '../../hooks/useLocalStorage';

// Import all tool components
import TitleTagTester from './tools/TitleTagTester';
import MetaDescriptionOptimizer from './tools/MetaDescriptionOptimizer';
import KeywordDensityAnalyzer from './tools/KeywordDensityAnalyzer';
import BacklinkChecker from './tools/BacklinkChecker';
import SchemaMarkupGenerator from './tools/SchemaMarkupGenerator';
import PageSpeedAnalyzer from './tools/PageSpeedAnalyzer';
import SocialPreviewTool from './tools/SocialPreviewTool';
import HashtagGenerator from './tools/HashtagGenerator';
import ContentCalendar from './tools/ContentCalendar';
import EngagementCalculator from './tools/EngagementCalculator';
import InfluencerFinder from './tools/InfluencerFinder';
import TrendAnalyzer from './tools/TrendAnalyzer';
import EmailSubjectTester from './tools/EmailSubjectTester';
import CampaignBuilder from './tools/CampaignBuilder';
import ABTestCalculator from './tools/ABTestCalculator';
import UTMBuilder from './tools/UTMBuilder';
import ConversionOptimizer from './tools/ConversionOptimizer';
import CompetitorAnalyzer from './tools/CompetitorAnalyzer';
import BrandVoiceAnalyzer from './tools/BrandVoiceAnalyzer';
import ContentIdeaGenerator from './tools/ContentIdeaGenerator';
import PersonaBuilder from './tools/PersonaBuilder';
import CreativeAssetLibrary from './tools/CreativeAssetLibrary';

// Tool component mapping
const TOOL_COMPONENTS: Record<string, React.ComponentType<any>> = {
  'title-tag-tester': TitleTagTester,
  'meta-description-optimizer': MetaDescriptionOptimizer,
  'keyword-density-analyzer': KeywordDensityAnalyzer,
  'backlink-checker': BacklinkChecker,
  'schema-markup-generator': SchemaMarkupGenerator,
  'page-speed-analyzer': PageSpeedAnalyzer,
  'social-preview-tool': SocialPreviewTool,
  'hashtag-generator': HashtagGenerator,
  'content-calendar': ContentCalendar,
  'engagement-calculator': EngagementCalculator,
  'influencer-finder': InfluencerFinder,
  'trend-analyzer': TrendAnalyzer,
  'email-subject-tester': EmailSubjectTester,
  'campaign-builder': CampaignBuilder,
  'ab-test-calculator': ABTestCalculator,
  'utm-builder': UTMBuilder,
  'conversion-optimizer': ConversionOptimizer,
  'competitor-analyzer': CompetitorAnalyzer,
  'brand-voice-analyzer': BrandVoiceAnalyzer,
  'content-idea-generator': ContentIdeaGenerator,
  'persona-builder': PersonaBuilder,
  'creative-asset-library': CreativeAssetLibrary
};

interface UnifiedToolManagerProps {
  onToolChange?: (toolId: string) => void;
  initialTool?: string;
  className?: string;
}

interface ToolState {
  [toolId: string]: any;
}

export const UnifiedToolManager: React.FC<UnifiedToolManagerProps> = ({
  onToolChange,
  initialTool,
  className
}) => {
  const [activeTool, setActiveTool] = useState<string | null>(initialTool || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isMinimized, setIsMinimized] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [toolStates, setToolStates] = useLocalStorage<ToolState>('cmo-tool-states', {});
  const [recentTools, setRecentTools] = useLocalStorage<string[]>('cmo-recent-tools', []);
  const [favoriteTools, setFavoriteTools] = useLocalStorage<string[]>('cmo-favorite-tools', []);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const { 
    tools, 
    activeTools, 
    suggestedTools,
    activateTool,
    deactivateTool,
    trackToolUsage,
    getToolAnalytics
  } = useCMOTools();

  // Filter tools based on search
  const filteredTools = tools.filter(tool => 
    tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Handle tool activation
  const handleToolActivation = useCallback((toolId: string) => {
    setActiveTool(toolId);
    activateTool(toolId);
    trackToolUsage(toolId, 'opened');
    
    // Update recent tools
    setRecentTools(prev => {
      const updated = [toolId, ...prev.filter(id => id !== toolId)].slice(0, 5);
      return updated;
    });
    
    onToolChange?.(toolId);
  }, [activateTool, trackToolUsage, onToolChange, setRecentTools]);

  // Handle tool state updates
  const updateToolState = useCallback((toolId: string, state: any) => {
    setToolStates(prev => ({
      ...prev,
      [toolId]: { ...prev[toolId], ...state }
    }));
  }, [setToolStates]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    'cmd+k': () => searchInputRef.current?.focus(),
    'cmd+/': () => setShowTutorial(!showTutorial),
    'esc': () => {
      if (activeTool) {
        setActiveTool(null);
        deactivateTool(activeTool);
      }
    },
    'cmd+1': () => handleToolActivation(filteredTools[0]?.id),
    'cmd+2': () => handleToolActivation(filteredTools[1]?.id),
    'cmd+3': () => handleToolActivation(filteredTools[2]?.id),
    'cmd+4': () => handleToolActivation(filteredTools[3]?.id),
    'cmd+5': () => handleToolActivation(filteredTools[4]?.id),
  });

  // Toggle favorite
  const toggleFavorite = useCallback((toolId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavoriteTools(prev => 
      prev.includes(toolId) 
        ? prev.filter(id => id !== toolId)
        : [...prev, toolId]
    );
  }, [setFavoriteTools]);

  // Render tool grid
  const renderToolGrid = () => {
    const sortedTools = [...filteredTools].sort((a, b) => {
      // Favorites first
      const aFav = favoriteTools.includes(a.id);
      const bFav = favoriteTools.includes(b.id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      
      // Then by usage
      const aUsage = getToolAnalytics(a.id)?.totalUses || 0;
      const bUsage = getToolAnalytics(b.id)?.totalUses || 0;
      return bUsage - aUsage;
    });

    return (
      <div className={cn(
        "grid gap-4",
        viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" : "grid-cols-1"
      )}>
        {sortedTools.map((tool) => {
          const isActive = activeTools.includes(tool.id);
          const isFavorite = favoriteTools.includes(tool.id);
          const analytics = getToolAnalytics(tool.id);
          
          return (
            <motion.div
              key={tool.id}
              layoutId={`tool-${tool.id}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleToolActivation(tool.id)}
              className={cn(
                "relative bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer",
                isActive && "ring-2 ring-primary",
                viewMode === 'list' ? "p-4" : "p-6"
              )}
            >
              {/* Favorite button */}
              <button
                onClick={(e) => toggleFavorite(tool.id, e)}
                className="absolute top-2 right-2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Star className={cn(
                  "w-4 h-4",
                  isFavorite ? "fill-yellow-400 text-yellow-400" : "text-gray-400"
                )} />
              </button>

              {/* Tool content */}
              <div className={viewMode === 'list' ? "flex items-center gap-4" : "space-y-3"}>
                <div className={cn(
                  "flex items-center justify-center w-12 h-12 rounded-lg",
                  tool.color || "bg-primary/10"
                )}>
                  <tool.icon className="w-6 h-6 text-primary" />
                </div>
                
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">{tool.name}</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {tool.description}
                  </p>
                  
                  {viewMode === 'grid' && (
                    <div className="flex items-center gap-2 mt-3">
                      <span className="text-xs text-gray-500">
                        {analytics?.totalUses || 0} uses
                      </span>
                      {analytics?.lastUsed && (
                        <span className="text-xs text-gray-500">
                          • Last used {new Date(analytics.lastUsed).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Active indicator */}
              {isActive && (
                <div className="absolute bottom-2 left-2 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              )}
            </motion.div>
          );
        })}
      </div>
    );
  };

  // Render active tool
  const renderActiveTool = () => {
    if (!activeTool) return null;
    
    const tool = tools.find(t => t.id === activeTool);
    const ToolComponent = TOOL_COMPONENTS[activeTool];
    
    if (!tool || !ToolComponent) return null;

    return (
      <motion.div
        layoutId={`tool-${activeTool}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
        onClick={() => {
          setActiveTool(null);
          deactivateTool(activeTool);
        }}
      >
        <motion.div
          className={cn(
            "bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden",
            isMinimized && "max-w-md max-h-[60vh]"
          )}
          onClick={(e) => e.stopPropagation()}
          drag
          dragMomentum={false}
          dragElastic={0.1}
          whileDrag={{ scale: 0.95 }}
        >
          {/* Tool header */}
          <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-lg",
                tool.color || "bg-primary/10"
              )}>
                <tool.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">{tool.name}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {tool.description}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => {
                  setActiveTool(null);
                  deactivateTool(activeTool);
                  trackToolUsage(activeTool, 'closed');
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tool content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
            <ToolComponent 
              state={toolStates[activeTool] || {}}
              onStateChange={(state: any) => updateToolState(activeTool, state)}
              onClose={() => {
                setActiveTool(null);
                deactivateTool(activeTool);
              }}
            />
          </div>
        </motion.div>
      </motion.div>
    );
  };

  // Render tool discovery sidebar
  const renderDiscoverySidebar = () => {
    return (
      <motion.div
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        className="w-80 bg-white dark:bg-gray-800 border-r dark:border-gray-700 p-4 space-y-6"
      >
        {/* Recent tools */}
        {recentTools.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Recent Tools
            </h3>
            <div className="space-y-2">
              {recentTools.slice(0, 3).map(toolId => {
                const tool = tools.find(t => t.id === toolId);
                if (!tool) return null;
                
                return (
                  <button
                    key={toolId}
                    onClick={() => handleToolActivation(toolId)}
                    className="w-full text-left p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <tool.icon className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">{tool.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Suggested tools */}
        {suggestedTools.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Suggested for You
            </h3>
            <div className="space-y-2">
              {suggestedTools.slice(0, 5).map(suggestion => {
                const tool = tools.find(t => t.id === suggestion.toolId);
                if (!tool) return null;
                
                return (
                  <button
                    key={suggestion.toolId}
                    onClick={() => handleToolActivation(suggestion.toolId)}
                    className="w-full text-left p-3 rounded border dark:border-gray-700 hover:border-primary transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <tool.icon className="w-5 h-5 text-primary" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{tool.name}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {suggestion.reason}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Keyboard shortcuts */}
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Keyboard className="w-4 h-4" />
            Keyboard Shortcuts
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Search tools</span>
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">⌘K</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Show tutorial</span>
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">⌘/</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Close tool</span>
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">ESC</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Quick open 1-5</span>
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">⌘1-5</kbd>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className={cn("flex h-full", className)}>
      {/* Discovery sidebar */}
      {!activeTool && renderDiscoverySidebar()}

      {/* Main content */}
      <div className="flex-1 p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">CMO Marketing Tools</h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setShowTutorial(true)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <BookOpen className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tools... (⌘K)"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Tool grid */}
        {renderToolGrid()}
      </div>

      {/* Active tool modal */}
      <AnimatePresence>
        {activeTool && renderActiveTool()}
      </AnimatePresence>

      {/* Tutorial overlay */}
      <AnimatePresence>
        {showTutorial && (
          <ToolTutorial onClose={() => setShowTutorial(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

// Tool tutorial component
const ToolTutorial: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [step, setStep] = useState(0);
  
  const tutorialSteps = [
    {
      title: "Welcome to CMO Marketing Tools",
      content: "Discover powerful tools to enhance your marketing workflow.",
      highlight: null
    },
    {
      title: "Search and Discovery",
      content: "Use ⌘K to quickly search for tools or browse by category.",
      highlight: "search"
    },
    {
      title: "Tool Organization",
      content: "Star your favorite tools and access recent ones from the sidebar.",
      highlight: "sidebar"
    },
    {
      title: "Keyboard Shortcuts",
      content: "Use ⌘1-5 to quickly open your most used tools.",
      highlight: "shortcuts"
    },
    {
      title: "Tool State",
      content: "Your work is automatically saved and restored when you return.",
      highlight: "state"
    }
  ];

  const currentStep = tutorialSteps[step];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">{currentStep.title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {currentStep.content}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {tutorialSteps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-2 h-2 rounded-full",
                  i === step ? "bg-primary" : "bg-gray-300 dark:bg-gray-600"
                )}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Previous
              </button>
            )}
            {step < tutorialSteps.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="px-4 py-2 text-sm bg-primary text-white rounded hover:bg-primary/90"
              >
                Next
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm bg-primary text-white rounded hover:bg-primary/90"
              >
                Get Started
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default UnifiedToolManager;