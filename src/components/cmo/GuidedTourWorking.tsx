import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import { useLocalStorage } from '../../hooks/useLocalStorage';

interface GuidedTourProps {
  onComplete?: () => void;
  onSkip?: () => void;
}

export const GuidedTour: React.FC<GuidedTourProps> = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [tourCompleted, setTourCompleted] = useLocalStorage('cmo-tour-completed', false);

  const steps = [
    {
      title: 'Welcome to the CMO Dashboard!',
      content: 'This is your marketing command center. Let me show you around the key features.',
      position: 'center'
    },
    {
      title: 'Marketing Metrics',
      content: 'Here you can see your key performance indicators including campaigns, reach, engagement, and conversions.',
      position: 'top-center'
    },
    {
      title: 'Control Buttons',
      content: 'Use these buttons to access achievements, help, tours, and onboarding anytime.',
      position: 'bottom-right'
    },
    {
      title: 'Quick Actions',
      content: 'Access frequently used actions and reset options from this panel.',
      position: 'bottom-left'
    },
    {
      title: 'You\'re All Set!',
      content: 'That\'s the basics of CMO Mode. Start exploring and make the most of your marketing dashboard!',
      position: 'center'
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setTourCompleted(true);
    onComplete?.();
  };

  const handleSkipTour = () => {
    setTourCompleted(true);
    onSkip?.();
  };

  const getPositionStyles = (position: string) => {
    switch (position) {
      case 'center':
        return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
      case 'top-center':
        return 'top-32 left-1/2 -translate-x-1/2';
      case 'bottom-right':
        return 'bottom-32 right-8';
      case 'bottom-left':
        return 'bottom-32 left-8';
      default:
        return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
    }
  };

  const currentStepData = steps[currentStep];

  return (
    <>
      {/* Dark overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-40"
        onClick={handleSkipTour}
      />

      {/* Tour card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className={`fixed z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-md ${getPositionStyles(currentStepData.position)}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white pr-4">
            {currentStepData.title}
          </h3>
          <button
            onClick={handleSkipTour}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Skip tour"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          {currentStepData.content}
        </p>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1 mb-6">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 w-2 rounded-full transition-all ${
                index === currentStep
                  ? 'w-8 bg-teal-500'
                  : index < currentStep
                  ? 'bg-teal-300'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              currentStep === 0
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </button>

          <span className="text-sm text-gray-500 dark:text-gray-400">
            {currentStep + 1} of {steps.length}
          </span>

          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors"
          >
            {currentStep === steps.length - 1 ? (
              <>
                Complete
                <CheckCircle className="w-4 h-4" />
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </>
  );
};

// Export the tour configuration for compatibility
export const CMO_TOURS = {
  dashboard: {
    id: 'dashboard',
    name: 'Dashboard Tour',
    description: 'Learn how to use the CMO dashboard',
    steps: [] // Not used in this simplified version
  }
};