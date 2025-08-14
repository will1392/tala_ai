import React from 'react';
import { motion } from 'framer-motion';

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
  progress: number;
}

const OnboardingProgress: React.FC<OnboardingProgressProps> = ({
  currentStep,
  totalSteps,
  progress
}) => {
  return (
    <div className="px-8 py-4 bg-gray-50 dark:bg-gray-900/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Question {currentStep} of {totalSteps}
        </span>
        <span className="text-sm font-medium text-primary">
          {Math.round(progress)}% Complete
        </span>
      </div>
      
      <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-purple-600 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        />
        
        {/* Progress dots */}
        <div className="absolute inset-0 flex items-center justify-between px-1">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <div
              key={index}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                index < currentStep
                  ? 'bg-white'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default OnboardingProgress;