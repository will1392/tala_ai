import React, { useEffect } from 'react';
import { 
  Cpu, 
  Database, 
  Search, 
  Brain, 
  Sparkles, 
  CheckCircle,
  Upload,
  FileText
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import { announceChatStatus } from '../../utils/announceToScreenReader';

/**
 * Define the stages in order with icons and descriptions
 */
const STAGES = [
  { 
    id: 'initializing', 
    label: 'Initializing', 
    icon: Cpu,
    description: 'Setting up AI systems'
  },
  { 
    id: 'context', 
    label: 'Context', 
    icon: Database,
    description: 'Loading conversation history'
  },
  { 
    id: 'searching', 
    label: 'Searching', 
    icon: Search,
    description: 'Searching knowledge base'
  },
  { 
    id: 'analyzing', 
    label: 'Analyzing', 
    icon: Brain,
    description: 'Processing information'
  },
  { 
    id: 'generating', 
    label: 'Generating', 
    icon: Sparkles,
    description: 'Creating response'
  },
  { 
    id: 'complete', 
    label: 'Complete', 
    icon: CheckCircle,
    description: 'Ready'
  }
] as const;

type Stage = (typeof STAGES)[number]['id'];

export type { Stage };

interface StatusProgressProps {
  currentStage: Stage;
  details?: {
    resultsFound?: number;
    topResult?: string;
    model?: string;
  };
  isProcessing: boolean;
}

function StatusProgress({ 
  currentStage, 
  details,
  isProcessing 
}: StatusProgressProps) {
  const currentIndex = STAGES.findIndex(s => s.id === currentStage);
  
  // Announce stage changes to screen readers
  useEffect(() => {
    if (currentStage && isProcessing) {
      announceChatStatus(currentStage);
    }
  }, [currentStage, isProcessing]);
  
  if (!isProcessing && currentStage !== 'complete') return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-secondary-700/50 backdrop-blur-sm border-t border-white/10 px-6 py-4"
      role="status"
      aria-live="polite"
      aria-label="Processing status"
    >
      <div className="max-w-[48rem] mx-auto">
        {/* Progress Bar */}
        <div className="relative mb-4">
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-white/10" />
          <motion.div 
            className="absolute top-5 left-0 h-0.5 bg-primary"
            initial={{ width: '0%' }}
            animate={{ 
              width: `${((currentIndex + 1) / STAGES.length) * 100}%` 
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
          
          {/* Stage Indicators */}
          <div className="relative flex justify-between">
            {STAGES.map((stage, idx) => {
              const Icon = stage.icon;
              const isActive = idx <= currentIndex;
              const isCurrent = idx === currentIndex;
              
              return (
                <div 
                  key={stage.id} 
                  className="flex flex-col items-center"
                  style={{ flex: idx === 0 || idx === STAGES.length - 1 ? '0 0 auto' : 1 }}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {/* Circle with Icon */}
                  <motion.div
                    className={cn(
                      "relative w-10 h-10 rounded-full flex items-center justify-center transition-all",
                      isActive 
                        ? "bg-primary text-white shadow-lg shadow-primary/30" 
                        : "bg-gray-200 dark:bg-secondary-600 text-gray-400 dark:text-white/40 border border-gray-300 dark:border-white/10"
                    )}
                    initial={{ scale: 1 }}
                    animate={{ 
                      scale: isCurrent ? [1, 1.1, 1] : 1,
                    }}
                    transition={{ 
                      duration: 1.5,
                      repeat: isCurrent ? Infinity : 0,
                      ease: "easeInOut"
                    }}
                  >
                    <Icon className="w-5 h-5" aria-hidden="true" />
                    {isCurrent && isProcessing && (
                      <motion.div
                        className="absolute inset-0 rounded-full bg-primary/30"
                        initial={{ scale: 1, opacity: 0.5 }}
                        animate={{ scale: 2, opacity: 0 }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    )}
                  </motion.div>
                  
                  {/* Label */}
                  <div className="mt-2 text-center">
                    <div className={cn(
                      "text-xs font-medium transition-colors",
                      isActive ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-white/40"
                    )}
                    aria-label={`${stage.label}: ${isActive ? 'completed' : 'pending'}`}
                    >
                      {stage.label}
                    </div>
                    {isCurrent && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-xs text-gray-600 dark:text-white/60 mt-0.5"
                      >
                        {stage.description}
                      </motion.div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Details Section */}
        {details && currentIndex >= 2 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3 pt-3 border-t border-gray-200 dark:border-white/5"
          >
            <div className="flex flex-wrap gap-4 text-xs">
              {details.resultsFound !== undefined && (
                <div className="flex items-center gap-2" role="status">
                  <FileText className="w-3 h-3 text-primary" aria-hidden="true" />
                  <span className="text-gray-600 dark:text-white/60">
                    Found <span className="text-gray-900 dark:text-white font-medium">{details.resultsFound}</span> sources
                  </span>
                </div>
              )}
              {details.topResult && (
                <div className="flex items-center gap-2" role="status">
                  <CheckCircle className="w-3 h-3 text-green-400" aria-hidden="true" />
                  <span className="text-gray-600 dark:text-white/60">
                    Top: <span className="text-gray-900 dark:text-white font-medium">{details.topResult}</span>
                  </span>
                </div>
              )}
              {details.model && (
                <div className="flex items-center gap-2" role="status">
                  <Brain className="w-3 h-3 text-purple-400" aria-hidden="true" />
                  <span className="text-gray-600 dark:text-white/60">
                    Using <span className="text-gray-900 dark:text-white font-medium">{details.model}</span>
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

export default StatusProgress;