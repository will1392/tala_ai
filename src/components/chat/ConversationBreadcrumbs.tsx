import React from 'react';
import { ChevronRight, Home, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Breadcrumb {
  label: string;
  topic: string;
  timestamp: Date;
}

interface ConversationBreadcrumbsProps {
  breadcrumbs: Breadcrumb[];
  onNavigate: (index: number) => void;
  onGoBack: () => void;
  className?: string;
}

export const ConversationBreadcrumbs: React.FC<ConversationBreadcrumbsProps> = ({
  breadcrumbs,
  onNavigate,
  onGoBack,
  className = ''
}) => {
  if (!breadcrumbs || breadcrumbs.length === 0) return null;

  return (
    <div className={`flex items-center space-x-2 text-sm ${className}`}>
      {/* Back button */}
      <button
        onClick={onGoBack}
        className="flex items-center space-x-1 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title="Go back"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Back</span>
      </button>

      <div className="flex-1 flex items-center space-x-1 overflow-x-auto scrollbar-hide">
        {/* Home/Start */}
        <button
          onClick={() => onNavigate(0)}
          className="flex items-center space-x-1 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
        >
          <Home className="w-4 h-4" />
          <span className="hidden sm:inline">Start</span>
        </button>

        {/* Breadcrumb items */}
        <AnimatePresence mode="popLayout">
          {breadcrumbs.map((breadcrumb, index) => (
            <React.Fragment key={`${breadcrumb.topic}-${index}`}>
              <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <motion.button
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                onClick={() => onNavigate(index + 1)}
                className={`
                  px-3 py-1 rounded-md transition-all flex-shrink-0
                  ${index === breadcrumbs.length - 1
                    ? 'bg-primary text-white'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }
                `}
                title={`Go to ${breadcrumb.label}`}
              >
                {breadcrumb.label}
              </motion.button>
            </React.Fragment>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};