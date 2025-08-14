import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ToggleLeft, ToggleRight, TrendingUp, Zap, BarChart3 } from 'lucide-react';
import { useContextAwareMode } from '../../hooks/useContextAwareMode';
import { Button } from '../shared/Button';

export const ContextAwareSettings: React.FC = () => {
  const {
    autoSwitchEnabled,
    setAutoSwitchEnabled,
    contextInsights,
    clearContextHistory
  } = useContextAwareMode();

  return (
    <div className="glass-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Smart Context Detection</h3>
        </div>
      </div>

      {/* Auto-switch toggle */}
      <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
        <div className="flex-1">
          <p className="text-sm font-medium">Auto-Switch Mode</p>
          <p className="text-xs text-white/60 mt-1">
            Automatically switch to the most relevant marketing mode
          </p>
        </div>
        <button
          onClick={() => setAutoSwitchEnabled(!autoSwitchEnabled)}
          className="p-2 transition-colors"
        >
          {autoSwitchEnabled ? (
            <ToggleRight className="w-6 h-6 text-primary" />
          ) : (
            <ToggleLeft className="w-6 h-6 text-white/40" />
          )}
        </button>
      </div>

      {/* Context insights */}
      {contextInsights && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            <h4 className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Context Insights
            </h4>

            {contextInsights.dominantContext && (
              <div className="p-3 bg-primary/10 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Dominant Context</span>
                  <span className="text-sm font-medium capitalize">
                    {contextInsights.dominantContext}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-3 h-3 text-yellow-400" />
                  <span className="text-xs text-white/60">Switches</span>
                </div>
                <p className="text-lg font-semibold">{contextInsights.contextSwitches}</p>
              </div>

              <div className="p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-3 h-3 text-green-400" />
                  <span className="text-xs text-white/60">Confidence</span>
                </div>
                <p className="text-lg font-semibold">
                  {Math.round(contextInsights.averageConfidence * 100)}%
                </p>
              </div>
            </div>

            {contextInsights.recentTrend && (
              <div className="p-3 bg-white/5 rounded-lg">
                <span className="text-xs text-white/60">Recent Trend</span>
                <p className="text-sm font-medium capitalize mt-1">
                  {contextInsights.recentTrend} focused
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Clear history button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={clearContextHistory}
        className="w-full"
      >
        Clear Context History
      </Button>
    </div>
  );
};