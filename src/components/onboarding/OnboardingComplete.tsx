import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Sparkles, ArrowRight, X } from 'lucide-react';
import { Button } from '../shared/Button';

interface OnboardingCompleteProps {
  userName?: string;
  userProfile?: any; // Accept userProfile for compatibility
  expertiseProfile?: any; // Accept expertiseProfile for compatibility
  onContinue?: () => void; // Make optional for compatibility
  onComplete?: () => void; // Accept both onContinue and onComplete
}

export const OnboardingComplete: React.FC<OnboardingCompleteProps> = ({ 
  userName, 
  userProfile,
  expertiseProfile,
  onContinue,
  onComplete
}) => {
  // Use onComplete if provided, otherwise use onContinue
  const handleClose = onComplete || onContinue || (() => {});
  
  // Extract name from userProfile if userName not provided
  const displayName = userName || userProfile?.name;
  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [handleClose]);

  // Handle clicking outside modal
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6"
        >
          <CheckCircle className="w-12 h-12 text-white" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Perfect! I'm Ready to Help {displayName ? `You, ${displayName}` : 'You'}
          </h2>
          
          <div className="space-y-4 mb-8">
            <p className="text-lg text-gray-600 dark:text-gray-300">
              I now have a solid understanding of your travel business and marketing expertise.
            </p>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 text-left max-w-lg mx-auto">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                Here's what I'll do for you:
              </h3>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Tailor my marketing advice to your experience level</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Focus on strategies that work for your client types</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Communicate in a way that matches your learning style</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span>Help you achieve your specific business goals</span>
                </li>
              </ul>
            </div>
            
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              You can update your profile and preferences anytime in Settings
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Button
              variant="primary"
              size="lg"
              onClick={handleClose}
              className="inline-flex items-center gap-2"
            >
              Let's Get Started
              <ArrowRight className="w-5 h-5" />
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};