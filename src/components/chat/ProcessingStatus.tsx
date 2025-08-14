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
        <div className="max-w-[48rem] mx-auto py-4 px-6">
          <div className="flex items-center gap-3">
            {/* Animated Icon */}
            <div className="relative">
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
                  className="mt-1"
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

            {/* Progress Indicator */}
            <div className="flex gap-1">
              {['search', 'generating', 'finalizing'].map((stage, idx) => (
                <motion.div
                  key={stage}
                  className={`w-1.5 h-1.5 rounded-full ${
                    currentStage === stage 
                      ? 'bg-primary' 
                      : stageCompleted(currentStage, stage) 
                        ? 'bg-primary/50' 
                        : 'bg-white/20'
                  }`}
                  animate={
                    currentStage === stage 
                      ? { scale: [1, 1.3, 1] } 
                      : {}
                  }
                  transition={{ duration: 1, repeat: Infinity }}
                />
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// Helper function to check if a stage is completed
function stageCompleted(currentStage: string, checkStage: string): boolean {
  const stageOrder = ['initializing', 'context', 'search', 'search_complete', 'generating', 'finalizing'];
  const currentIndex = stageOrder.indexOf(currentStage);
  const checkIndex = stageOrder.indexOf(checkStage);
  return currentIndex > checkIndex;
}