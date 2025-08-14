import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Sparkles, TrendingUp, Mail, Hash, Target, Send, Brain, Search, FileText, BarChart3, Megaphone } from 'lucide-react';
import { cn } from '../../utils/cn';

export type MarketingMode = 
  | 'general' 
  | 'seo' 
  | 'email' 
  | 'social' 
  | 'ads' 
  | 'direct-mail' 
  | 'content' 
  | 'analytics'
  | 'strategy';

export type ChatMode = 'marketing' | 'research';

interface ModeOption {
  id: MarketingMode;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const marketingModes: ModeOption[] = [
  {
    id: 'general',
    label: 'General Marketing',
    description: 'All-purpose marketing assistant',
    icon: <Sparkles className="w-4 h-4" />,
    color: 'bg-gradient-to-r from-purple-500 to-pink-500'
  },
  {
    id: 'seo',
    label: 'SEO Optimization',
    description: 'Search engine optimization & keywords',
    icon: <Search className="w-4 h-4" />,
    color: 'bg-gradient-to-r from-green-500 to-emerald-500'
  },
  {
    id: 'email',
    label: 'Email Marketing',
    description: 'Email campaigns & automation',
    icon: <Mail className="w-4 h-4" />,
    color: 'bg-gradient-to-r from-blue-500 to-cyan-500'
  },
  {
    id: 'social',
    label: 'Social Media',
    description: 'Social media strategy & content',
    icon: <Hash className="w-4 h-4" />,
    color: 'bg-gradient-to-r from-pink-500 to-rose-500'
  },
  {
    id: 'ads',
    label: 'Paid Advertising',
    description: 'PPC, display & social ads',
    icon: <Target className="w-4 h-4" />,
    color: 'bg-gradient-to-r from-orange-500 to-red-500'
  },
  {
    id: 'direct-mail',
    label: 'Direct Mail',
    description: 'Physical mail campaigns',
    icon: <Send className="w-4 h-4" />,
    color: 'bg-gradient-to-r from-indigo-500 to-purple-500'
  },
  {
    id: 'content',
    label: 'Content Strategy',
    description: 'Content planning & creation',
    icon: <FileText className="w-4 h-4" />,
    color: 'bg-gradient-to-r from-teal-500 to-green-500'
  },
  {
    id: 'analytics',
    label: 'Analytics & Insights',
    description: 'Performance tracking & reporting',
    icon: <BarChart3 className="w-4 h-4" />,
    color: 'bg-gradient-to-r from-yellow-500 to-orange-500'
  },
  {
    id: 'strategy',
    label: 'Marketing Strategy',
    description: 'High-level planning & consulting',
    icon: <Brain className="w-4 h-4" />,
    color: 'bg-gradient-to-r from-purple-600 to-indigo-600'
  }
];

interface ClaudeStyleModeSelectorProps {
  currentMode: ChatMode;
  currentMarketingMode: MarketingMode;
  onModeChange: (mode: ChatMode) => void;
  onMarketingModeChange: (mode: MarketingMode) => void;
  className?: string;
}

export const ClaudeStyleModeSelector: React.FC<ClaudeStyleModeSelectorProps> = ({
  currentMode,
  currentMarketingMode,
  onModeChange,
  onMarketingModeChange,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const currentModeOption = marketingModes.find(m => m.id === currentMarketingMode) || marketingModes[0];

  // Handle click outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn("relative inline-block", className)}>
      {/* Main Mode Toggle - Claude Style */}
      <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <button
          onClick={() => onModeChange('marketing')}
          className={cn(
            "px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
            currentMode === 'marketing'
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          )}
        >
          Marketing
        </button>
        <button
          onClick={() => onModeChange('research')}
          className={cn(
            "px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
            currentMode === 'research'
              ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          )}
        >
          Research
        </button>
      </div>

      {/* Marketing Mode Selector - Only show when in marketing mode */}
      {currentMode === 'marketing' && (
        <div className="mt-2" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200",
              "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700",
              "hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm",
              "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            )}
          >
            <div className={cn("w-5 h-5 rounded-md flex items-center justify-center text-white", currentModeOption.color)}>
              {currentModeOption.icon}
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {currentModeOption.label}
            </span>
            <ChevronDown className={cn(
              "w-4 h-4 text-gray-500 transition-transform duration-200",
              isOpen && "rotate-180"
            )} />
          </button>

          {/* Dropdown Menu */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  "absolute mt-2 w-72 rounded-lg shadow-lg overflow-hidden z-50",
                  "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                )}
              >
                <div className="py-1 max-h-96 overflow-y-auto">
                  {marketingModes.map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => {
                        onMarketingModeChange(mode.id);
                        setIsOpen(false);
                      }}
                      className={cn(
                        "w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors",
                        currentMarketingMode === mode.id && "bg-gray-50 dark:bg-gray-700"
                      )}
                    >
                      <div className={cn("w-5 h-5 rounded-md flex items-center justify-center text-white mt-0.5", mode.color)}>
                        {mode.icon}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {mode.label}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {mode.description}
                        </div>
                      </div>
                      {currentMarketingMode === mode.id && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-2 h-2 rounded-full bg-blue-500 mt-1.5"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Mode Description */}
      <div className="mt-2">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {currentMode === 'marketing' 
            ? `${currentModeOption.description}`
            : 'Search and analyze your knowledge base'
          }
        </p>
      </div>
    </div>
  );
};