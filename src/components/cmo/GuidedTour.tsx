import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ArrowRight, ArrowLeft, Target, 
  Sparkles, Info, CheckCircle 
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useLocalStorage } from '../../hooks/useLocalStorage';

interface TourStep {
  id: string;
  title: string;
  content: string;
  target: string; // CSS selector for target element
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  showArrow?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  highlight?: boolean;
  spotlightPadding?: number;
}

interface Tour {
  id: string;
  name: string;
  description: string;
  steps: TourStep[];
}

interface GuidedTourProps {
  tour: Tour;
  onComplete?: () => void;
  onSkip?: () => void;
  autoStart?: boolean;
}

export const GuidedTour: React.FC<GuidedTourProps> = ({
  tour,
  onComplete,
  onSkip,
  autoStart = true
}) => {
  const [isActive, setIsActive] = useState(autoStart);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState<Element | null>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const popoverRef = useRef<HTMLDivElement>(null);

  const currentStepData = tour.steps[currentStep];

  useEffect(() => {
    if (!isActive || !currentStepData) return;

    const findTarget = () => {
      const element = document.querySelector(currentStepData.target);
      if (element) {
        setTargetElement(element);
        if (currentStepData.highlight) {
          element.classList.add('tour-highlight');
        }
      }
    };

    // Try to find target immediately
    findTarget();

    // Set up observer for dynamic elements
    const observer = new MutationObserver(findTarget);
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => {
      observer.disconnect();
      if (targetElement) {
        targetElement.classList.remove('tour-highlight');
      }
    };
  }, [isActive, currentStep, currentStepData]);

  useEffect(() => {
    if (!targetElement || !popoverRef.current) return;

    const calculatePosition = () => {
      const targetRect = targetElement.getBoundingClientRect();
      const popoverRect = popoverRef.current!.getBoundingClientRect();
      const placement = currentStepData.placement || 'bottom';
      const padding = 10;

      let top = 0;
      let left = 0;

      switch (placement) {
        case 'top':
          top = targetRect.top - popoverRect.height - padding;
          left = targetRect.left + (targetRect.width - popoverRect.width) / 2;
          break;
        case 'bottom':
          top = targetRect.bottom + padding;
          left = targetRect.left + (targetRect.width - popoverRect.width) / 2;
          break;
        case 'left':
          top = targetRect.top + (targetRect.height - popoverRect.height) / 2;
          left = targetRect.left - popoverRect.width - padding;
          break;
        case 'right':
          top = targetRect.top + (targetRect.height - popoverRect.height) / 2;
          left = targetRect.right + padding;
          break;
        case 'center':
          top = window.innerHeight / 2 - popoverRect.height / 2;
          left = window.innerWidth / 2 - popoverRect.width / 2;
          break;
      }

      // Ensure popover stays within viewport
      top = Math.max(10, Math.min(window.innerHeight - popoverRect.height - 10, top));
      left = Math.max(10, Math.min(window.innerWidth - popoverRect.width - 10, left));

      setPosition({ top, left });
    };

    calculatePosition();
    window.addEventListener('resize', calculatePosition);
    window.addEventListener('scroll', calculatePosition);

    return () => {
      window.removeEventListener('resize', calculatePosition);
      window.removeEventListener('scroll', calculatePosition);
    };
  }, [targetElement, currentStepData.placement]);

  const handleNext = () => {
    if (currentStep < tour.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    setIsActive(false);
    onSkip?.();
  };

  const completeTour = () => {
    setIsActive(false);
    onComplete?.();
  };

  if (!isActive || !currentStepData) return null;

  return createPortal(
    <>
      {/* Backdrop with spotlight */}
      <AnimatePresence>
        {currentStepData.highlight && targetElement && (
          <Spotlight
            target={targetElement}
            padding={currentStepData.spotlightPadding || 8}
            onClick={handleSkip}
          />
        )}
      </AnimatePresence>

      {/* Tour popover */}
      <motion.div
        ref={popoverRef}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed z-[60] bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 max-w-sm"
        style={{ top: position.top, left: position.left }}
      >
        {/* Arrow */}
        {currentStepData.showArrow && targetElement && (
          <TourArrow placement={currentStepData.placement || 'bottom'} />
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold pr-2">{currentStepData.title}</h3>
          <button
            onClick={handleSkip}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {currentStepData.content}
        </p>

        {/* Progress */}
        <div className="flex items-center gap-1 mb-4">
          {tour.steps.map((_, index) => (
            <div
              key={index}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                index <= currentStep
                  ? "bg-primary"
                  : "bg-gray-200 dark:bg-gray-700"
              )}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {currentStep + 1} of {tour.steps.length}
          </span>
          
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            
            {currentStepData.actionLabel && currentStepData.onAction ? (
              <button
                onClick={() => {
                  currentStepData.onAction?.();
                  handleNext();
                }}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                {currentStepData.actionLabel}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 flex items-center gap-2"
              >
                {currentStep === tour.steps.length - 1 ? 'Finish' : 'Next'}
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </>,
    document.body
  );
};

// Spotlight component
const Spotlight: React.FC<{
  target: Element;
  padding: number;
  onClick: () => void;
}> = ({ target, padding, onClick }) => {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const updateRect = () => {
      setRect(target.getBoundingClientRect());
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect);

    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect);
    };
  }, [target]);

  if (!rect) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[55]"
      onClick={onClick}
    >
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={rect.left - padding}
              y={rect.top - padding}
              width={rect.width + padding * 2}
              height={rect.height + padding * 2}
              rx="8"
              fill="black"
            />
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.5)"
          mask="url(#spotlight-mask)"
        />
      </svg>
    </motion.div>
  );
};

// Tour arrow component
const TourArrow: React.FC<{ placement: string }> = ({ placement }) => {
  const arrowClass = cn(
    "absolute w-0 h-0",
    placement === 'top' && "bottom-full left-1/2 -translate-x-1/2 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[8px] border-b-white dark:border-b-gray-800",
    placement === 'bottom' && "top-full left-1/2 -translate-x-1/2 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-white dark:border-t-gray-800",
    placement === 'left' && "right-full top-1/2 -translate-y-1/2 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-r-[8px] border-r-white dark:border-r-gray-800",
    placement === 'right' && "left-full top-1/2 -translate-y-1/2 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent border-l-[8px] border-l-white dark:border-l-gray-800"
  );

  return <div className={arrowClass} />;
};

// Tour manager hook
export const useTourManager = () => {
  const [completedTours, setCompletedTours] = useLocalStorage<string[]>(
    'cmo-completed-tours',
    []
  );
  const [activeTour, setActiveTour] = useState<Tour | null>(null);

  const startTour = (tour: Tour) => {
    setActiveTour(tour);
  };

  const completeTour = (tourId: string) => {
    setCompletedTours(prev => [...new Set([...prev, tourId])]);
    setActiveTour(null);
  };

  const resetTour = (tourId: string) => {
    setCompletedTours(prev => prev.filter(id => id !== tourId));
  };

  const isTourCompleted = (tourId: string) => {
    return completedTours.includes(tourId);
  };

  return {
    activeTour,
    startTour,
    completeTour,
    resetTour,
    isTourCompleted,
    completedTours
  };
};

// Predefined tours
export const CMO_TOURS: Record<string, Tour> = {
  dashboard: {
    id: 'dashboard',
    name: 'Dashboard Tour',
    description: 'Learn how to use the CMO dashboard',
    steps: [
      {
        id: 'welcome',
        title: 'Welcome to Your Dashboard',
        content: 'This is your marketing command center. Let\'s explore the key features.',
        target: 'body',
        placement: 'center'
      },
      {
        id: 'header',
        title: 'Dashboard Header',
        content: 'View your dashboard title and switch between different time periods using the timeframe selector.',
        target: '[class*="Marketing Dashboard"]',
        placement: 'bottom',
        highlight: true,
        showArrow: true
      },
      {
        id: 'metrics',
        title: 'Key Metrics',
        content: 'Monitor your marketing performance with real-time metrics. Each card shows important KPIs with trend indicators.',
        target: '[class*="grid-cols-1 md:grid-cols-2 lg:grid-cols-4"]',
        placement: 'bottom',
        highlight: true,
        showArrow: true,
        spotlightPadding: 20
      },
      {
        id: 'performance',
        title: 'Campaign Performance',
        content: 'Track your overall campaign performance score and see completed vs active campaigns.',
        target: '[class*="Campaign Performance"]',
        placement: 'top',
        highlight: true,
        showArrow: true
      },
      {
        id: 'tools',
        title: 'Most Used Tools',
        content: 'See which marketing tools you use most frequently and get personalized recommendations.',
        target: '[class*="Most Used Tools"]',
        placement: 'left',
        highlight: true,
        showArrow: true
      },
      {
        id: 'activities',
        title: 'Recent Activities',
        content: 'Track all your marketing activities and their status in real-time.',
        target: '[class*="Recent Activities"]',
        placement: 'right',
        highlight: true,
        showArrow: true
      },
      {
        id: 'tasks',
        title: 'Pending Tasks',
        content: 'Manage your upcoming marketing tasks with priority levels and progress tracking.',
        target: '[class*="Pending Tasks"]',
        placement: 'left',
        highlight: true,
        showArrow: true
      },
      {
        id: 'help',
        title: 'Need Help?',
        content: 'Click the help button anytime to access FAQs, videos, and live chat support.',
        target: '[title="Take a guided tour"]',
        placement: 'left',
        highlight: true,
        showArrow: true
      }
    ]
  },
  tools: {
    id: 'tools',
    name: 'Tools Tour',
    description: 'Discover the marketing tools available',
    steps: [
      {
        id: 'tool-intro',
        title: 'Marketing Tools',
        content: 'CMO Mode provides 30+ specialized marketing tools at your fingertips.',
        target: 'body',
        placement: 'center'
      },
      {
        id: 'tool-search',
        title: 'Quick Tool Search',
        content: 'Press ⌘K (or Ctrl+K) anytime to search and access tools instantly.',
        target: 'body',
        placement: 'center',
        actionLabel: 'Try It',
        onAction: () => {
          document.dispatchEvent(new KeyboardEvent('keydown', { 
            key: 'k', 
            metaKey: true,
            ctrlKey: true,
            bubbles: true 
          }));
        }
      },
      {
        id: 'tool-usage',
        title: 'Tool Analytics',
        content: 'The dashboard tracks which tools you use most frequently to provide better recommendations.',
        target: '[class*="Most Used Tools"]',
        placement: 'left',
        highlight: true,
        showArrow: true
      }
    ]
  },
  workflow: {
    id: 'workflow',
    name: 'Workflow Tour',
    description: 'Learn the CMO mode workflow',
    steps: [
      {
        id: 'workflow-intro',
        title: 'CMO Mode Workflow',
        content: 'Let\'s learn how to use CMO Mode effectively for your marketing tasks.',
        target: 'body',
        placement: 'center'
      },
      {
        id: 'metrics-workflow',
        title: 'Start with Metrics',
        content: 'Check your key metrics to understand current performance and identify areas for improvement.',
        target: '[class*="grid-cols-1 md:grid-cols-2 lg:grid-cols-4"]',
        placement: 'bottom',
        highlight: true,
        showArrow: true
      },
      {
        id: 'activities-workflow',
        title: 'Review Activities',
        content: 'See what marketing activities are in progress and their current status.',
        target: '[class*="Recent Activities"]',
        placement: 'right',
        highlight: true,
        showArrow: true
      },
      {
        id: 'tasks-workflow',
        title: 'Manage Tasks',
        content: 'Prioritize and complete your marketing tasks. Click "Manage All Tasks" to see the full list.',
        target: '[class*="Pending Tasks"]',
        placement: 'left',
        highlight: true,
        showArrow: true
      },
      {
        id: 'insights',
        title: 'AI-Powered Insights',
        content: 'Get personalized tips and recommendations based on your marketing data.',
        target: '[class*="Your email campaigns"]',
        placement: 'top',
        highlight: true,
        showArrow: true
      }
    ]
  }
};

// Tour trigger component
export const TourTrigger: React.FC<{
  tourId: string;
  className?: string;
  children?: React.ReactNode;
}> = ({ tourId, className, children }) => {
  const { startTour, isTourCompleted } = useTourManager();
  const tour = CMO_TOURS[tourId];

  if (!tour) return null;

  return (
    <button
      onClick={() => startTour(tour)}
      className={cn(
        "inline-flex items-center gap-2 text-sm",
        className
      )}
    >
      {isTourCompleted(tourId) ? (
        <CheckCircle className="w-4 h-4 text-green-500" />
      ) : (
        <Info className="w-4 h-4 text-blue-500" />
      )}
      {children || 'Take Tour'}
    </button>
  );
};

// Add tour highlight styles
export const TourStyles = () => {
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .tour-highlight {
        position: relative;
        z-index: 56;
        animation: tour-pulse 2s ease-in-out infinite;
      }

      @keyframes tour-pulse {
        0% {
          box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4);
        }
        70% {
          box-shadow: 0 0 0 10px rgba(99, 102, 241, 0);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(99, 102, 241, 0);
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  return null;
};

export default GuidedTour;