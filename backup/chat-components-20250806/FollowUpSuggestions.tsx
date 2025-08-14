import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Lightbulb, TrendingUp, Search, Wrench } from 'lucide-react';

interface FollowUpSuggestion {
  text: string;
  intent: string;
  reason?: string;
  topic?: string;
}

interface FollowUpSuggestionsProps {
  suggestions: FollowUpSuggestion[];
  onSelect: (suggestion: FollowUpSuggestion) => void;
  isLoading?: boolean;
  className?: string;
}

const intentIcons: Record<string, React.ElementType> = {
  analyze: Search,
  optimize: TrendingUp,
  implement: Wrench,
  explore: Lightbulb,
  default: ArrowRight
};

export const FollowUpSuggestions: React.FC<FollowUpSuggestionsProps> = ({
  suggestions,
  onSelect,
  isLoading = false,
  className = ''
}) => {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
        <Lightbulb className="w-4 h-4" />
        <span className="font-medium">Suggested next steps:</span>
      </div>
      
      <AnimatePresence mode="popLayout">
        <div className="grid gap-2 sm:grid-cols-2">
          {suggestions.map((suggestion, index) => {
            const Icon = intentIcons[suggestion.intent] || intentIcons.default;
            
            return (
              <motion.button
                key={`${suggestion.text}-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                onClick={() => onSelect(suggestion)}
                disabled={isLoading}
                className={`
                  group relative flex items-start space-x-3 p-3 rounded-lg border
                  transition-all duration-200 text-left
                  ${isLoading 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:border-primary hover:shadow-sm cursor-pointer'
                  }
                  border-gray-200 dark:border-gray-700
                  bg-white dark:bg-gray-800
                  hover:bg-gray-50 dark:hover:bg-gray-750
                `}
              >
                <div className="flex-shrink-0 mt-0.5">
                  <Icon className="w-5 h-5 text-primary opacity-70 group-hover:opacity-100 transition-opacity" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {suggestion.text}
                  </p>
                  
                  {suggestion.reason && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {suggestion.reason}
                    </p>
                  )}
                  
                  {suggestion.topic && (
                    <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                      {suggestion.topic}
                    </span>
                  )}
                </div>
                
                <ArrowRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
              </motion.button>
            );
          })}
        </div>
      </AnimatePresence>
    </div>
  );
};