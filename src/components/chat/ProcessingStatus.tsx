import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Database,
  Brain,
  Sparkles,
  CheckCircle,
  Loader2,
  FileText,
  Cpu
} from 'lucide-react';
import { cn } from '../../utils/cn';

interface ProcessingStatusProps {
  requestId?: string;
  isProcessing: boolean;
}

interface StatusUpdate {
  type: 'connected' | 'status' | 'progress' | 'complete';
  status?: string;
  stage?: string;
  details?: any;
  timestamp: string;
}

const stageIcons: Record<string, React.ReactNode> = {
  'initializing': <Cpu className="w-4 h-4" />,
  'context': <Database className="w-4 h-4" />,
  'search': <Search className="w-4 h-4" />,
  'search_complete': <CheckCircle className="w-4 h-4" />,
  'generating': <Brain className="w-4 h-4" />,
  'finalizing': <Sparkles className="w-4 h-4" />
};

const stageMessages: Record<string, string> = {
  'initializing': 'Initializing Tala AI systems',
  'context': 'Loading conversation context',
  'search': 'Searching knowledge base',
  'search_complete': 'Found relevant information',
  'generating': 'Analyzing and generating response',
  'finalizing': 'Finalizing response'
};

const knowledgeSearchSteps = [
  {
    id: 'analyze',
    title: 'Understanding your request',
    description: 'Identifying destinations, suppliers, and intent from your question.',
    icon: Brain
  },
  {
    id: 'scan',
    title: 'Scanning saved intelligence',
    description: 'Searching documents, briefs, and playbooks for relevant matches.',
    icon: Database
  },
  {
    id: 'rank',
    title: 'Ranking best matches',
    description: 'Scoring sources by freshness, relevance, and usefulness.',
    icon: Search
  },
  {
    id: 'assemble',
    title: 'Preparing highlights',
    description: 'Collecting key insights to send back to Tala.',
    icon: Sparkles
  }
] as const;

export const ProcessingStatus: React.FC<ProcessingStatusProps> = ({
  requestId,
  isProcessing
}) => {
  const [currentStatus, setCurrentStatus] = useState<string>('Initializing...');
  const [currentStage, setCurrentStage] = useState<string>('initializing');
  const [details, setDetails] = useState<any>(null);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  useEffect(() => {
    if (!requestId || !isProcessing) {
      if (eventSource) {
        eventSource.close();
        setEventSource(null);
      }
      return;
    }

    // Connect to SSE endpoint
    const source = new EventSource(`http://localhost:3001/api/chat/status/stream/${requestId}`);
    
    source.onmessage = (event) => {
      try {
        const data: StatusUpdate = JSON.parse(event.data);
        
        switch (data.type) {
          case 'status':
            setCurrentStatus(data.status || 'Processing...');
            break;
          case 'progress':
            if (data.stage) {
              setCurrentStage(data.stage);
              setCurrentStatus(stageMessages[data.stage] || data.status || 'Processing...');
            }
            if (data.details) {
              setDetails(data.details);
            }
            break;
          case 'complete':
            source.close();
            break;
        }
      } catch (error) {
        console.error('Failed to parse status update:', error);
      }
    };

    source.onerror = (error) => {
      console.error('SSE connection error:', error);
      source.close();
    };

    setEventSource(source);

    return () => {
      source.close();
    };
  }, [requestId, isProcessing]);

  if (!isProcessing) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="bg-secondary-700 border-t border-white/10"
      >
        <div className="max-w-[48rem] mx-auto py-4 px-6 space-y-4">
          <div className="flex items-start gap-3">
            {/* Animated Icon */}
            <div className="relative mt-0.5">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="text-primary"
              >
                {stageIcons[currentStage] || <Loader2 className="w-4 h-4" />}
              </motion.div>
            </div>

            {/* Status Text */}
            <div className="flex-1">
              <motion.p
                key={currentStatus}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-gray-900/90 dark:text-white/90 text-sm font-medium"
              >
                {currentStatus}
              </motion.p>

              {/* Additional Details */}
              {details && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-1 space-y-1"
                >
                  {details.resultsFound !== undefined && (
                    <p className="text-gray-600 dark:text-white/60 text-xs">
                      Found {details.resultsFound} relevant sources
                      {details.topResult && ` • Top: ${details.topResult}`}
                    </p>
                  )}
                  {details.query && (
                    <p className="text-gray-600 dark:text-white/60 text-xs">
                      Query: "{details.query}"
                    </p>
                  )}
                  {details.model && (
                    <p className="text-gray-600 dark:text-white/60 text-xs">
                      Using {details.model} model
                    </p>
                  )}
                </motion.div>
              )}
            </div>
          </div>

          <KnowledgeSearchAnimation stage={currentStage} details={details} />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

interface KnowledgeSearchAnimationProps {
  stage: string;
  details?: {
    resultsFound?: number;
    topResult?: string;
  } | null;
}

const KnowledgeSearchAnimation: React.FC<KnowledgeSearchAnimationProps> = ({
  stage,
  details
}) => {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];

    if (stage === 'search') {
      setActiveStep(0);
      knowledgeSearchSteps.forEach((_step, index) => {
        if (index === 0) return;
        const timeout = setTimeout(() => {
          setActiveStep(index);
        }, index * 900 + 400);
        timeouts.push(timeout);
      });
    } else if (stage === 'search_complete') {
      setActiveStep(knowledgeSearchSteps.length - 1);
    } else {
      setActiveStep(0);
    }

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [stage]);

  if (stage !== 'search' && stage !== 'search_complete') {
    return null;
  }

  const progress = knowledgeSearchSteps.length > 1
    ? Math.min(100, (activeStep / (knowledgeSearchSteps.length - 1)) * 100)
    : 100;

  return (
    <motion.div
      key="knowledge-search-animation"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
    >
      <div className="flex flex-col gap-4">
        <div className="relative h-1.5 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-primary via-primary/70 to-primary/40"
            animate={{ width: `${stage === 'search_complete' ? 100 : progress}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
          <motion.div
            className="absolute left-0 top-0 h-full w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent"
            animate={{ x: ['-50%', '120%'] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {knowledgeSearchSteps.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index === activeStep;
            const isComplete = index < activeStep || (stage === 'search_complete' && index === knowledgeSearchSteps.length - 1);

            return (
              <motion.div
                key={step.id}
                className={cn(
                  'relative flex items-start gap-3 rounded-xl border p-3 transition-colors',
                  isActive
                    ? 'border-primary/60 bg-primary/10'
                    : isComplete
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-white/10 bg-white/5'
                )}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div
                  className={cn(
                    'relative mt-1 flex h-10 w-10 items-center justify-center rounded-full border',
                    isActive || isComplete
                      ? 'border-primary/60 bg-primary/15 text-primary'
                      : 'border-white/10 bg-white/5 text-white/50'
                  )}
                >
                  <StepIcon className="h-5 w-5" />
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-primary/40"
                      initial={{ scale: 1, opacity: 0.6 }}
                      animate={{ scale: 1.8, opacity: 0 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                    />
                  )}
                </div>
                <div className="flex-1">
                  <p
                    className={cn(
                      'text-sm font-semibold',
                      isActive ? 'text-white' : isComplete ? 'text-white/80' : 'text-white/65'
                    )}
                  >
                    {step.title}
                  </p>
                  <p
                    className={cn(
                      'text-xs leading-relaxed',
                      isActive ? 'text-white/80' : 'text-white/60'
                    )}
                  >
                    {step.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {stage === 'search_complete' && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/5 p-3 text-sm"
          >
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-white">Knowledge search complete</p>
              {details?.resultsFound !== undefined ? (
                <p className="text-xs text-white/70">
                  Found {details.resultsFound} {details.resultsFound === 1 ? 'match' : 'matches'}
                  {details?.topResult ? ` • Top source: ${details.topResult}` : ''}
                </p>
              ) : (
                <p className="text-xs text-white/70">
                  Relevant documents are ready to be summarized in your answer.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};