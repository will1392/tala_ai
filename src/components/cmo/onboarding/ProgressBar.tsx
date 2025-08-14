/**
 * ProgressBar - Component for showing onboarding progress
 */

import React from 'react';
import { motion } from 'framer-motion';

interface ProgressBarProps {
  current: number;
  total: number;
  showLabels?: boolean;
  variant?: 'default' | 'minimal';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  current,
  total,
  showLabels = false,
  variant = 'default'
}) => {
  const progress = (current / total) * 100;
  
  if (variant === 'minimal') {
    return (
      <div className="w-full bg-white/20 rounded-full h-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="bg-white h-2 rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        {showLabels && (
          <>
            <span className="text-sm font-medium text-white/90">
              Step {current} of {total}
            </span>
            <span className="text-sm text-white/70">
              {Math.round(progress)}% complete
            </span>
          </>
        )}
      </div>
      
      <div className="relative">
        <div className="w-full bg-white/20 rounded-full h-3">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="bg-white h-3 rounded-full relative overflow-hidden"
          >
            {/* Shimmer effect */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                repeatType: 'loop',
                ease: 'linear'
              }}
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            />
          </motion.div>
        </div>
        
        {/* Step indicators */}
        <div className="absolute top-0 left-0 w-full h-3 flex justify-between items-center px-1">
          {Array.from({ length: total }, (_, index) => {
            const stepNumber = index + 1;
            const isCompleted = stepNumber <= current;
            const isCurrent = stepNumber === current;
            
            return (
              <motion.div
                key={index}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className={`w-2 h-2 rounded-full border-2 ${
                  isCompleted
                    ? 'bg-white border-white'
                    : isCurrent
                    ? 'bg-white/50 border-white'
                    : 'bg-transparent border-white/50'
                }`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};