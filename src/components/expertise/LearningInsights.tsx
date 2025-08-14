/**
 * Learning Insights Component
 * Displays user learning progress and adjustment suggestions
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Award, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  Lightbulb
} from 'lucide-react';
import { LearningInsights } from '../../services/expertiseLearningService';

interface LearningInsightsProps {
  insights: LearningInsights | null;
  adjustmentSuggestion?: any;
  onApplyAdjustment?: (adjustment: any) => void;
  onDismissAdjustment?: () => void;
  loading?: boolean;
}

export const LearningInsightsComponent: React.FC<LearningInsightsProps> = ({
  insights,
  adjustmentSuggestion,
  onApplyAdjustment,
  onDismissAdjustment,
  loading = false
}) => {
  const [showDetails, setShowDetails] = useState(false);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
          </div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!insights?.hasData) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="text-center">
          <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Building Your Learning Profile
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Continue using Tala CMO to build your personalized learning insights.
          </p>
        </div>
      </div>
    );
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'text-green-600 bg-green-100 dark:bg-green-900';
      case 'intermediate': return 'text-blue-600 bg-blue-100 dark:bg-blue-900';
      case 'advanced': return 'text-purple-600 bg-purple-100 dark:bg-purple-900';
      case 'expert': return 'text-red-600 bg-red-100 dark:bg-red-900';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-700';
    }
  };

  const getAdjustmentIcon = (suggestion: string) => {
    switch (suggestion) {
      case 'increase': return <TrendingUp className="w-5 h-5 text-green-600" />;
      case 'decrease': return <TrendingDown className="w-5 h-5 text-orange-600" />;
      default: return <Target className="w-5 h-5 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Adjustment Suggestion Banner */}
      {adjustmentSuggestion?.needed && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 
                     border border-blue-200 dark:border-blue-800 rounded-lg p-4"
        >
          <div className="flex items-start gap-3">
            {getAdjustmentIcon(adjustmentSuggestion.suggestion)}
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Expertise Level Adjustment Suggested
              </h4>
              <p className="text-blue-700 dark:text-blue-300 text-sm mb-3">
                {adjustmentSuggestion.reason}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mb-4">
                {adjustmentSuggestion.recommendedAction}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => onApplyAdjustment?.(adjustmentSuggestion)}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 
                           transition-colors"
                >
                  Apply Adjustment
                </button>
                <button
                  onClick={onDismissAdjustment}
                  className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 
                           text-sm rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Main Insights Panel */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8 text-indigo-600" />
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Learning Insights
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your personalized learning profile
              </p>
            </div>
          </div>
          
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getLevelColor(insights.currentLevel)}`}>
            {insights.currentLevel.charAt(0).toUpperCase() + insights.currentLevel.slice(1)}
          </div>
        </div>

        {/* Metrics Overview */}
        {insights.metrics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-gray-900 dark:text-white">
                  Interactions
                </span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {insights.metrics.totalInteractions || 0}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Last 30 days
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-gray-900 dark:text-white">
                  Success Rate
                </span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {Math.round((insights.metrics.successRate || 0) * 100)}%
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Task completion
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-purple-600" />
                <span className="font-medium text-gray-900 dark:text-white">
                  Topics
                </span>
              </div>
              <div className="text-2xl font-bold text-purple-600">
                {insights.metrics.topicsEngaged || 0}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Areas explored
              </p>
            </div>
          </div>
        )}

        {/* Strengths and Weaknesses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Strengths */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-500" />
              Your Strengths
            </h4>
            {insights.strengths.length > 0 ? (
              <div className="space-y-2">
                {insights.strengths.map((strength, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 
                                            rounded-lg border border-green-200 dark:border-green-800">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-green-800 dark:text-green-200 capitalize">
                        {strength.topic}
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        {strength.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Keep learning to identify your strengths!
              </p>
            )}
          </div>

          {/* Areas for Improvement */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Growth Areas
            </h4>
            {insights.weaknesses.length > 0 ? (
              <div className="space-y-2">
                {insights.weaknesses.map((weakness, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 
                                            rounded-lg border border-orange-200 dark:border-orange-800">
                    <XCircle className="w-4 h-4 text-orange-600 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-orange-800 dark:text-orange-200 capitalize">
                        {weakness.topic}
                      </p>
                      <p className="text-sm text-orange-600 dark:text-orange-400">
                        {weakness.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                No specific areas for improvement identified yet.
              </p>
            )}
          </div>
        </div>

        {/* Recommendations */}
        {insights.recommendations.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-blue-500" />
              Recommendations
            </h4>
            <div className="space-y-2">
              {insights.recommendations.map((rec, index) => (
                <div key={index} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg 
                                          border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-blue-800 dark:text-blue-200 text-sm">
                      {rec.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Toggle Details */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 
                     dark:hover:text-indigo-300 transition-colors"
          >
            {showDetails ? 'Hide' : 'Show'} Technical Details
          </button>
          
          {showDetails && insights.metrics && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="font-medium text-gray-700 dark:text-gray-300">Confusion Rate</p>
                  <p className="text-red-600">{Math.round((insights.metrics.confusionRate || 0) * 100)}%</p>
                </div>
                <div>
                  <p className="font-medium text-gray-700 dark:text-gray-300">Mastery Rate</p>
                  <p className="text-green-600">{Math.round((insights.metrics.masteryRate || 0) * 100)}%</p>
                </div>
                <div>
                  <p className="font-medium text-gray-700 dark:text-gray-300">Adjustments</p>
                  <p className="text-blue-600">{insights.adjustmentHistory.length}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-700 dark:text-gray-300">Trend</p>
                  <p className="text-purple-600 capitalize">{insights.metrics.recentTrend || 'Stable'}</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};