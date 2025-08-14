import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bug, 
  Zap, 
  BarChart3, 
  AlertCircle, 
  CheckCircle,
  Clock,
  Database,
  TrendingUp,
  X
} from 'lucide-react';
import { cn } from '../../utils/cn';

interface ContextDebugInfo {
  query: string;
  primaryContext: string;
  confidence: number;
  secondaryContexts: Array<{ context: string; confidence: number }>;
  intent: string;
  entities: any[];
  keywords: string[];
  isMultiChannel: boolean;
  isAmbiguous?: boolean;
  suggestedClarification?: string;
  timing?: string;
  method?: string;
}

interface ContextDebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
  debugInfo: ContextDebugInfo | null;
  performanceStats?: any;
  className?: string;
}

export const ContextDebugPanel: React.FC<ContextDebugPanelProps> = ({
  isOpen,
  onClose,
  debugInfo,
  performanceStats,
  className = ''
}) => {
  const [showPerformance, setShowPerformance] = useState(false);
  const [recentHistory, setRecentHistory] = useState<ContextDebugInfo[]>([]);

  useEffect(() => {
    if (debugInfo) {
      setRecentHistory(prev => [debugInfo, ...prev.slice(0, 9)]);
    }
  }, [debugInfo]);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-500';
    if (confidence >= 0.5) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.5) return 'Medium';
    return 'Low';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          className={cn(
            "fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-900 shadow-2xl z-50",
            "border-l border-gray-200 dark:border-gray-700",
            className
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Bug className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Context Debug Panel</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto h-full pb-20">
            {debugInfo ? (
              <div className="p-4 space-y-4">
                {/* Current Detection */}
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Current Detection
                  </h4>
                  
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Query:</span>
                      <p className="text-gray-600 dark:text-gray-400 mt-1">"{debugInfo.query}"</p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Primary Context:</span>
                      <span className="font-mono bg-primary/10 px-2 py-1 rounded">
                        {debugInfo.primaryContext}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Confidence:</span>
                      <span className={cn("font-mono", getConfidenceColor(debugInfo.confidence))}>
                        {(debugInfo.confidence * 100).toFixed(0)}% ({getConfidenceLabel(debugInfo.confidence)})
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Intent:</span>
                      <span className="font-mono text-blue-600 dark:text-blue-400">
                        {debugInfo.intent}
                      </span>
                    </div>
                    
                    {debugInfo.timing && (
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Detection Time:</span>
                        <span className="font-mono text-gray-600 dark:text-gray-400">
                          {debugInfo.timing}
                        </span>
                      </div>
                    )}
                    
                    {debugInfo.method && (
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Method:</span>
                        <span className="font-mono text-purple-600 dark:text-purple-400">
                          {debugInfo.method}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Secondary Contexts */}
                {debugInfo.secondaryContexts.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h4 className="font-medium mb-3">Secondary Contexts</h4>
                    <div className="space-y-1">
                      {debugInfo.secondaryContexts.map((ctx, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="font-mono">{ctx.context}</span>
                          <span className={cn("font-mono", getConfidenceColor(ctx.confidence))}>
                            {(ctx.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Keywords Detected */}
                {debugInfo.keywords.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <h4 className="font-medium mb-3">Keywords Detected</h4>
                    <div className="flex flex-wrap gap-2">
                      {debugInfo.keywords.map((keyword, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Flags */}
                <div className="flex gap-4">
                  {debugInfo.isMultiChannel && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Multi-channel</span>
                    </div>
                  )}
                  {debugInfo.isAmbiguous && (
                    <div className="flex items-center gap-2 text-sm">
                      <AlertCircle className="w-4 h-4 text-yellow-500" />
                      <span>Ambiguous</span>
                    </div>
                  )}
                </div>

                {/* Clarification */}
                {debugInfo.suggestedClarification && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                    <h4 className="font-medium mb-2 flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                      <AlertCircle className="w-4 h-4" />
                      Suggested Clarification
                    </h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      {debugInfo.suggestedClarification}
                    </p>
                  </div>
                )}

                {/* Performance Stats Toggle */}
                <button
                  onClick={() => setShowPerformance(!showPerformance)}
                  className="w-full flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <span className="flex items-center gap-2 font-medium">
                    <BarChart3 className="w-4 h-4" />
                    Performance Stats
                  </span>
                  <span className="text-gray-500">
                    {showPerformance ? '−' : '+'}
                  </span>
                </button>

                {/* Performance Stats */}
                {showPerformance && performanceStats && (
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total Detections:</span>
                      <span className="font-mono">{performanceStats.totalDetections}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg Detection Time:</span>
                      <span className="font-mono">{performanceStats.avgTime}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cache Hit Rate:</span>
                      <span className="font-mono text-green-600 dark:text-green-400">
                        {performanceStats.cacheHitRate}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Context Switch Rate:</span>
                      <span className="font-mono">{performanceStats.contextSwitchRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Ambiguity Rate:</span>
                      <span className="font-mono text-yellow-600 dark:text-yellow-400">
                        {performanceStats.ambiguityRate}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Recent History */}
                <div className="mt-6">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Recent History
                  </h4>
                  <div className="space-y-2">
                    {recentHistory.slice(1).map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 dark:text-gray-400 truncate flex-1">
                            "{item.query}"
                          </span>
                          <span className="font-mono ml-2">
                            {item.primaryContext}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                <Bug className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No context detection data yet</p>
                <p className="text-sm mt-1">Send a message to see debug info</p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};