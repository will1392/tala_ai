/**
 * ExpertiseOnboarding - Main onboarding flow for expertise assessment
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, CheckCircle, Brain, Target, Settings } from 'lucide-react';
import { ExpertiseLevelSelector } from './ExpertiseLevelSelector';
import { ChannelExpertiseSelector } from './ChannelExpertiseSelector';
import { CommunicationPreferences } from './CommunicationPreferences';
import { ProgressBar } from './ProgressBar';

export interface ExpertiseProfile {
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  channels: Record<string, { level: number; confidence: number }>;
  preferences: {
    learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
    technicalComfort: number;
    detailPreference: 'high-level' | 'balanced' | 'detailed';
    pace: 'slow' | 'medium' | 'fast';
  };
  industries: string[];
  tools: string[];
  goals: string[];
}

interface ExpertiseOnboardingProps {
  onComplete: (profile: ExpertiseProfile) => void;
  onSkip?: () => void;
  initialData?: Partial<ExpertiseProfile>;
}

export const ExpertiseOnboarding: React.FC<ExpertiseOnboardingProps> = ({
  onComplete,
  onSkip,
  initialData = {}
}) => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<ExpertiseProfile>>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const steps = [
    {
      key: 'level',
      title: 'Your Marketing Experience',
      subtitle: 'Help us understand your current expertise level',
      icon: Brain,
      component: ExpertiseLevelSelector
    },
    {
      key: 'channels',
      title: 'Channel Expertise',
      subtitle: 'Which marketing channels are you most familiar with?',
      icon: Target,
      component: ChannelExpertiseSelector
    },
    {
      key: 'preferences',
      title: 'Communication Preferences',
      subtitle: 'How do you prefer to learn and receive information?',
      icon: Settings,
      component: CommunicationPreferences
    }
  ];

  const currentStep = steps[step];
  const isLastStep = step === steps.length - 1;
  const canGoBack = step > 0;
  const canGoNext = answers[currentStep.key] !== undefined;

  const handleStepComplete = useCallback((stepKey: string, data: any) => {
    setAnswers(prev => ({ ...prev, [stepKey]: data }));
    
    if (isLastStep) {
      handleComplete({ ...answers, [stepKey]: data } as ExpertiseProfile);
    } else {
      setStep(prev => prev + 1);
    }
  }, [answers, isLastStep]);

  const handleComplete = async (finalProfile: ExpertiseProfile) => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onComplete(finalProfile);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      setIsSubmitting(false);
    }
  };

  const buildCompleteProfile = (): ExpertiseProfile => {
    return {
      level: answers.level || 'beginner',
      channels: answers.channels || {},
      preferences: answers.preferences || {
        learningStyle: 'visual',
        technicalComfort: 3,
        detailPreference: 'balanced',
        pace: 'medium'
      },
      industries: answers.preferences?.industries || [],
      tools: answers.preferences?.tools || [],
      goals: answers.preferences?.goals || []
    };
  };

  const goBack = () => {
    if (canGoBack) {
      setStep(prev => prev - 1);
    }
  };

  const goNext = () => {
    if (canGoNext && !isLastStep) {
      setStep(prev => prev + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full my-4 flex flex-col min-h-[80vh] max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <currentStep.icon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Let's personalize your Tala CMO experience</h2>
                <p className="text-blue-100 mt-1">
                  Tell us about your marketing background so we can communicate at the right level
                </p>
              </div>
            </div>
            
            {onSkip && (
              <button
                onClick={onSkip}
                className="text-white/80 hover:text-white transition-colors p-2"
                title="Skip onboarding"
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>
          
          <div className="mt-6">
            <ProgressBar current={step + 1} total={steps.length} />
          </div>
        </div>

        {/* Step Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8">
            <div className="mb-8">
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                {currentStep.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {currentStep.subtitle}
              </p>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="pb-6"
              >
                <currentStep.component
                  onSelect={(data) => handleStepComplete(currentStep.key, data)}
                  onNext={goNext}
                  initialData={answers[currentStep.key]}
                  expertiseLevel={answers.level}
                  channels={answers.channels}
                  isSubmitting={isSubmitting}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="flex-shrink-0 bg-gray-50 dark:bg-gray-700 px-8 py-6 flex items-center justify-between border-t border-gray-200 dark:border-gray-600">
          <button
            onClick={goBack}
            disabled={!canGoBack}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              canGoBack
                ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Step {step + 1} of {steps.length}
            </span>
          </div>

          <button
            onClick={isLastStep && canGoNext ? () => handleComplete(buildCompleteProfile()) : goNext}
            disabled={!canGoNext || (isLastStep && isSubmitting)}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg transition-colors ${
              canGoNext && !isSubmitting
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              'Completing...'
            ) : isLastStep ? (
              'Complete'
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};