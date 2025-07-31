import React from 'react';
import { motion } from 'framer-motion';
import { HelpCircle, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ContextFeedbackPromptProps {
  detectedContext: string;
  confidence: number;
  possibleContexts?: Array<{ label: string; value: string }>;
  onConfirm: () => void;
  onCorrect: (actualContext: string) => void;
  onDismiss: () => void;
  className?: string;
}

export const ContextFeedbackPrompt: React.FC<ContextFeedbackPromptProps> = ({
  detectedContext,
  confidence,
  possibleContexts,
  onConfirm,
  onCorrect,
  onDismiss,
  className = ''
}) => {
  const getContextLabel = (context: string) => {
    const labels: Record<string, string> = {
      seo: 'SEO / Search Marketing',
      email: 'Email Marketing',
      social: 'Social Media Marketing',
      directMail: 'Direct Mail Marketing',
      ads: 'Paid Advertising'
    };
    return labels[context] || context;
  };

  // High confidence - simple confirmation
  if (confidence >= 0.7) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={cn(
          "bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4",
          "border border-blue-200 dark:border-blue-800",
          className
        )}
      >
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              I understood you're asking about <strong>{getContextLabel(detectedContext)}</strong>. 
              Is that correct?
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={onConfirm}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
              >
                <CheckCircle className="w-4 h-4" />
                Yes, correct
              </button>
              <button
                onClick={() => onCorrect('')}
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm"
              >
                <XCircle className="w-4 h-4" />
                No, different topic
              </button>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            ×
          </button>
        </div>
      </motion.div>
    );
  }

  // Low confidence or ambiguous - show options
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 mb-4",
        "border border-yellow-200 dark:border-yellow-800",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <HelpCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
            I'm not sure which marketing channel you're asking about. Could you clarify?
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {possibleContexts ? (
              possibleContexts.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onCorrect(option.value)}
                  className={cn(
                    "px-3 py-2 text-sm rounded-md text-left",
                    "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700",
                    "hover:bg-primary/10 hover:border-primary transition-colors",
                    detectedContext === option.value && "border-primary bg-primary/10"
                  )}
                >
                  {option.label}
                </button>
              ))
            ) : (
              <>
                <button
                  onClick={() => onCorrect('seo')}
                  className="px-3 py-2 text-sm rounded-md text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-primary/10 hover:border-primary transition-colors"
                >
                  SEO / Search Marketing
                </button>
                <button
                  onClick={() => onCorrect('email')}
                  className="px-3 py-2 text-sm rounded-md text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-primary/10 hover:border-primary transition-colors"
                >
                  Email Marketing
                </button>
                <button
                  onClick={() => onCorrect('social')}
                  className="px-3 py-2 text-sm rounded-md text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-primary/10 hover:border-primary transition-colors"
                >
                  Social Media Marketing
                </button>
                <button
                  onClick={() => onCorrect('ads')}
                  className="px-3 py-2 text-sm rounded-md text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-primary/10 hover:border-primary transition-colors"
                >
                  Paid Advertising
                </button>
                <button
                  onClick={() => onCorrect('directMail')}
                  className="px-3 py-2 text-sm rounded-md text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-primary/10 hover:border-primary transition-colors"
                >
                  Direct Mail Marketing
                </button>
                <button
                  onClick={() => onCorrect('general')}
                  className="px-3 py-2 text-sm rounded-md text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-primary/10 hover:border-primary transition-colors"
                >
                  General Marketing
                </button>
              </>
            )}
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          ×
        </button>
      </div>
    </motion.div>
  );
};