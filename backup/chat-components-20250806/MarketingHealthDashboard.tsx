import React from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertCircle, 
  CheckCircle,
  Target,
  Zap,
  Calendar,
  BarChart3,
  ArrowRight
} from 'lucide-react';

interface HealthScore {
  score: number;
  status: string;
  label: string;
  color: string;
  metrics?: any;
  issues?: string[];
  strengths?: string[];
}

interface MarketingHealthData {
  summary: {
    overallHealth: {
      score: number;
      status: string;
      label: string;
      activeChannels: number;
      totalChannels: number;
      coverage: number;
      summary: string;
    };
    assessmentDate: Date;
    channelsAnalyzed: string[];
  };
  health: Record<string, HealthScore>;
  gaps: Array<{
    type: string;
    channel?: string;
    severity: string;
    description: string;
    recommendation: string;
  }>;
  opportunities: Array<{
    type: string;
    title: string;
    priority: string;
    description?: string;
    channels?: string[];
  }>;
  crossChannelInsights: Array<{
    type: string;
    insight: string;
    actions: string[];
    priority: string;
  }>;
  recommendations: {
    immediate: any[];
    shortTerm: any[];
    longTerm: any[];
  };
  progress?: {
    overall: {
      trend: string;
      improvements: number;
      regressions: number;
    };
  };
}

interface MarketingHealthDashboardProps {
  healthData: MarketingHealthData | null;
  isLoading?: boolean;
  onChannelClick?: (channel: string) => void;
  onRecommendationClick?: (recommendation: any) => void;
  className?: string;
}

const channelIcons: Record<string, React.ElementType> = {
  seo: BarChart3,
  email: Target,
  social: Zap,
  directMail: Calendar,
  ads: Target
};

const channelLabels: Record<string, string> = {
  seo: 'SEO',
  email: 'Email',
  social: 'Social Media',
  directMail: 'Direct Mail',
  ads: 'Paid Ads'
};

export const MarketingHealthDashboard: React.FC<MarketingHealthDashboardProps> = ({
  healthData,
  isLoading = false,
  onChannelClick,
  onRecommendationClick,
  className = ''
}) => {
  if (isLoading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!healthData) return null;

  const { summary, health, gaps, opportunities, crossChannelInsights, recommendations, progress } = healthData;

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'declining': return <TrendingDown className="w-4 h-4 text-red-500" />;
      default: return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-blue-500';
    if (score >= 40) return 'text-yellow-500';
    if (score >= 20) return 'text-orange-500';
    return 'text-red-500';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-500 bg-red-50 dark:bg-red-900/20';
      case 'medium': return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      default: return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overall Health Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Marketing Health Score</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {new Date(summary.assessmentDate).toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${getScoreColor(summary.overallHealth.score)}`}>
              {summary.overallHealth.score}%
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {summary.overallHealth.label}
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-semibold">{summary.overallHealth.activeChannels}</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Active Channels</div>
          </div>
          <div>
            <div className="text-2xl font-semibold">{summary.overallHealth.coverage}%</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">Coverage</div>
          </div>
          <div className="flex items-center justify-center">
            {progress && getTrendIcon(progress.overall.trend)}
            <div className="ml-2">
              <div className="text-sm font-medium">
                +{progress?.overall.improvements || 0} / -{progress?.overall.regressions || 0}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Changes</div>
            </div>
          </div>
        </div>
        
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          {summary.overallHealth.summary}
        </p>
      </div>

      {/* Channel Health Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(health).map(([channel, data]) => {
          const Icon = channelIcons[channel] || BarChart3;
          
          return (
            <motion.button
              key={channel}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onChannelClick?.(channel)}
              className={`
                relative p-4 rounded-lg border transition-all
                ${data.status === 'not_started' 
                  ? 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700' 
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-primary'
                }
              `}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-5 h-5 ${data.status === 'not_started' ? 'text-gray-400' : 'text-primary'}`} />
                {data.status !== 'not_started' && (
                  <div className={`text-lg font-bold ${getScoreColor(data.score)}`}>
                    {data.score}
                  </div>
                )}
              </div>
              
              <div className="text-sm font-medium">{channelLabels[channel]}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {data.label}
              </div>
              
              {data.issues && data.issues.length > 0 && (
                <div className="absolute top-2 right-2">
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                </div>
              )}
              
              {data.strengths && data.strengths.length > 0 && (
                <div className="absolute bottom-2 right-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Critical Gaps */}
      {gaps.filter(g => g.severity === 'high').length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
          <h4 className="font-medium text-red-800 dark:text-red-200 mb-2 flex items-center">
            <AlertCircle className="w-4 h-4 mr-2" />
            Critical Gaps to Address
          </h4>
          <div className="space-y-2">
            {gaps.filter(g => g.severity === 'high').slice(0, 3).map((gap, index) => (
              <div key={index} className="text-sm">
                <p className="text-red-700 dark:text-red-300">{gap.description}</p>
                <p className="text-red-600 dark:text-red-400 text-xs mt-1">
                  → {gap.recommendation}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Opportunities */}
      {opportunities.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <h4 className="font-medium mb-3">Top Opportunities</h4>
          <div className="space-y-2">
            {opportunities.slice(0, 3).map((opp, index) => (
              <div 
                key={index} 
                className="flex items-start space-x-3 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => onRecommendationClick?.(opp)}
              >
                <div className={`
                  px-2 py-1 rounded text-xs font-medium
                  ${opp.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                    opp.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  }
                `}>
                  {opp.priority}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{opp.title}</p>
                  {opp.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {opp.description}
                    </p>
                  )}
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cross-Channel Insights */}
      {crossChannelInsights.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2 flex items-center">
            <Zap className="w-4 h-4 mr-2" />
            Cross-Channel Insights
          </h4>
          <div className="space-y-2">
            {crossChannelInsights.slice(0, 2).map((insight, index) => (
              <div key={index} className="text-sm">
                <p className="text-blue-700 dark:text-blue-300">{insight.insight}</p>
                <ul className="mt-1 space-y-1">
                  {insight.actions.slice(0, 2).map((action, idx) => (
                    <li key={idx} className="text-blue-600 dark:text-blue-400 text-xs pl-4">
                      • {action}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Priority Recommendations */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
        <h4 className="font-medium mb-3">Recommended Actions</h4>
        <div className="space-y-4">
          {/* Immediate Actions */}
          {recommendations.immediate.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                Do This Week
              </h5>
              <div className="space-y-2">
                {recommendations.immediate.map((rec, index) => (
                  <div 
                    key={rec.id || index}
                    className="flex items-center space-x-3 p-2 bg-green-50 dark:bg-green-900/20 rounded cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/30"
                    onClick={() => onRecommendationClick?.(rec)}
                  >
                    <Target className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <div className="flex-1">
                      <p className="text-sm">{rec.title}</p>
                    </div>
                    <div className="text-xs text-green-600 dark:text-green-400">
                      Quick Win
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Short Term Actions */}
          {recommendations.shortTerm.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                This Month
              </h5>
              <div className="space-y-2">
                {recommendations.shortTerm.map((rec, index) => (
                  <div 
                    key={rec.id || index}
                    className="flex items-center space-x-3 p-2 bg-gray-50 dark:bg-gray-700 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
                    onClick={() => onRecommendationClick?.(rec)}
                  >
                    <Calendar className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <div className="flex-1">
                      <p className="text-sm">{rec.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};