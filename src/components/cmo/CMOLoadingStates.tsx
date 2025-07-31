import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Loader2, BarChart3, Target, Zap } from 'lucide-react';
import { cn } from '../../utils/cn';

interface LoadingStateProps {
  type?: 'default' | 'tool' | 'analysis' | 'generation' | 'search';
  message?: string;
  className?: string;
}

export const CMOLoadingState: React.FC<LoadingStateProps> = ({ 
  type = 'default', 
  message,
  className 
}) => {
  const loadingConfigs = {
    default: {
      icon: Loader2,
      text: 'Loading...',
      color: 'text-primary',
      animation: 'spin'
    },
    tool: {
      icon: Sparkles,
      text: 'Preparing tool...',
      color: 'text-purple-600',
      animation: 'pulse'
    },
    analysis: {
      icon: BarChart3,
      text: 'Analyzing data...',
      color: 'text-blue-600',
      animation: 'bounce'
    },
    generation: {
      icon: Zap,
      text: 'Generating content...',
      color: 'text-orange-600',
      animation: 'pulse'
    },
    search: {
      icon: Target,
      text: 'Searching...',
      color: 'text-green-600',
      animation: 'spin'
    }
  };

  const config = loadingConfigs[type];
  const Icon = config.icon;
  const displayMessage = message || config.text;

  return (
    <div className={cn("flex flex-col items-center justify-center p-8", className)}>
      <motion.div
        className="relative"
        animate={config.animation === 'spin' ? { rotate: 360 } : {}}
        transition={config.animation === 'spin' ? { 
          duration: 2, 
          repeat: Infinity, 
          ease: "linear" 
        } : {}}
      >
        <motion.div
          animate={config.animation === 'pulse' ? { 
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5]
          } : config.animation === 'bounce' ? {
            y: [0, -10, 0]
          } : {}}
          transition={{ 
            duration: config.animation === 'pulse' ? 2 : 1,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <Icon className={cn("w-12 h-12", config.color)} />
        </motion.div>

        {/* Orbiting dots */}
        {type === 'analysis' && (
          <>
            {[0, 1, 2].map((index) => (
              <motion.div
                key={index}
                className="absolute inset-0"
                animate={{ rotate: 360 }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "linear",
                  delay: index * 1
                }}
              >
                <div 
                  className={cn(
                    "absolute w-2 h-2 rounded-full",
                    index === 0 ? "bg-blue-400" : 
                    index === 1 ? "bg-purple-400" : 
                    "bg-green-400"
                  )}
                  style={{
                    top: -20,
                    left: '50%',
                    transform: 'translateX(-50%)'
                  }}
                />
              </motion.div>
            ))}
          </>
        )}
      </motion.div>

      <motion.p
        className={cn("mt-4 text-sm font-medium", config.color)}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {displayMessage}
      </motion.p>

      {/* Progress dots */}
      <motion.div className="flex gap-1 mt-4">
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            className={cn(
              "w-2 h-2 rounded-full",
              config.color.replace('text-', 'bg-')
            )}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: index * 0.3
            }}
          />
        ))}
      </motion.div>
    </div>
  );
};

// Skeleton loader for CMO components
interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'card' | 'chart' | 'tool';
}

export const CMOSkeleton: React.FC<SkeletonProps> = ({ 
  className, 
  variant = 'text' 
}) => {
  const baseClass = "animate-pulse bg-gray-200 dark:bg-gray-700 rounded";

  const variants = {
    text: "h-4 w-full",
    card: "h-32 w-full rounded-lg",
    chart: "h-64 w-full rounded-lg",
    tool: "h-48 w-full rounded-xl"
  };

  return (
    <div className={cn(baseClass, variants[variant], className)} />
  );
};

// Loading placeholder for tools
export const ToolLoadingPlaceholder: React.FC<{ toolName?: string }> = ({ toolName }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8"
    >
      <div className="flex items-center justify-between mb-6">
        <CMOSkeleton variant="text" className="w-48 h-6" />
        <CMOSkeleton className="w-8 h-8 rounded-full" />
      </div>

      <div className="space-y-4">
        <CMOSkeleton variant="text" className="w-full" />
        <CMOSkeleton variant="text" className="w-3/4" />
        <CMOSkeleton variant="text" className="w-1/2" />
      </div>

      <div className="mt-8">
        <CMOSkeleton variant="card" />
      </div>

      <div className="flex gap-4 mt-6">
        <CMOSkeleton className="h-10 w-32 rounded-lg" />
        <CMOSkeleton className="h-10 w-32 rounded-lg" />
      </div>
    </motion.div>
  );
};

// Animated loading dots
export const LoadingDots: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          className="inline-block w-1 h-1 bg-current rounded-full"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: index * 0.2
          }}
        />
      ))}
    </span>
  );
};

export default CMOLoadingState;