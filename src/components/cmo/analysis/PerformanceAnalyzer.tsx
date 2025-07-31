import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Info, Target, Zap, DollarSign, Users, Calendar, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../utils/cn';

interface PerformanceAnalyzerProps {
  data: any;
  dataType: 'campaign' | 'social' | 'seo' | 'email' | 'overall';
  onInsightAction?: (action: string, data: any) => void;
}

interface PerformanceInsight {
  id: string;
  type: 'success' | 'warning' | 'opportunity' | 'trend';
  category: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  metrics: {
    current: number | string;
    previous?: number | string;
    change?: number;
    target?: number | string;
  };
  recommendations: string[];
  actionable: boolean;
  priority: number;
}

interface PerformanceScore {
  overall: number;
  efficiency: number;
  growth: number;
  engagement: number;
  roi: number;
}

export const PerformanceAnalyzer: React.FC<PerformanceAnalyzerProps> = ({
  data,
  dataType,
  onInsightAction
}) => {
  const [insights, setInsights] = useState<PerformanceInsight[]>([]);
  const [performanceScore, setPerformanceScore] = useState<PerformanceScore>({
    overall: 0,
    efficiency: 0,
    growth: 0,
    engagement: 0,
    roi: 0
  });
  const [selectedInsightType, setSelectedInsightType] = useState<'all' | 'success' | 'warning' | 'opportunity' | 'trend'>('all');
  const [analysisDepth, setAnalysisDepth] = useState<'basic' | 'advanced'>('basic');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (data) {
      analyzePerformance();
    }
  }, [data, analysisDepth]);

  // Main analysis function
  const analyzePerformance = async () => {
    setIsAnalyzing(true);
    
    try {
      // Calculate performance scores
      const scores = calculatePerformanceScores(data);
      setPerformanceScore(scores);
      
      // Generate insights based on data type
      const generatedInsights = await generateInsights(data, scores);
      
      // Sort by priority
      const sortedInsights = generatedInsights.sort((a, b) => b.priority - a.priority);
      setInsights(sortedInsights);
    } catch (error) {
      console.error('Analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Calculate performance scores
  const calculatePerformanceScores = (data: any): PerformanceScore => {
    switch (dataType) {
      case 'campaign':
        return calculateCampaignScores(data);
      case 'social':
        return calculateSocialScores(data);
      case 'seo':
        return calculateSEOScores(data);
      case 'email':
        return calculateEmailScores(data);
      default:
        return calculateOverallScores(data);
    }
  };

  // Calculate campaign performance scores
  const calculateCampaignScores = (data: any): PerformanceScore => {
    const avgCTR = data.reduce((sum: number, item: any) => sum + (item.ctr || 0), 0) / data.length;
    const avgConversionRate = data.reduce((sum: number, item: any) => sum + (item.conversionRate || 0), 0) / data.length;
    const avgROAS = data.reduce((sum: number, item: any) => sum + (item.roas || 0), 0) / data.length;
    
    return {
      overall: Math.min(100, (avgCTR * 10 + avgConversionRate * 5 + avgROAS * 10) / 3),
      efficiency: Math.min(100, avgCTR * 10),
      growth: calculateGrowthScore(data, 'conversions'),
      engagement: Math.min(100, avgCTR * 10),
      roi: Math.min(100, avgROAS * 20)
    };
  };

  // Calculate social media scores
  const calculateSocialScores = (data: any): PerformanceScore => {
    const avgEngagementRate = data.reduce((sum: number, item: any) => sum + (item.engagementRate || 0), 0) / data.length;
    const followerGrowth = calculateGrowthScore(data, 'followers');
    
    return {
      overall: Math.min(100, (avgEngagementRate * 10 + followerGrowth) / 2),
      efficiency: Math.min(100, avgEngagementRate * 10),
      growth: followerGrowth,
      engagement: Math.min(100, avgEngagementRate * 10),
      roi: calculateSocialROI(data)
    };
  };

  // Calculate SEO scores
  const calculateSEOScores = (data: any): PerformanceScore => {
    const avgPosition = data.reduce((sum: number, item: any) => sum + (item.position || 0), 0) / data.length;
    const avgCTR = data.reduce((sum: number, item: any) => sum + (item.ctr || 0), 0) / data.length;
    
    return {
      overall: Math.min(100, ((21 - avgPosition) * 5 + avgCTR * 10) / 2),
      efficiency: Math.min(100, avgCTR * 10),
      growth: calculateGrowthScore(data, 'clicks'),
      engagement: Math.min(100, avgCTR * 10),
      roi: calculateSEOROI(data)
    };
  };

  // Calculate email scores
  const calculateEmailScores = (data: any): PerformanceScore => {
    const avgOpenRate = data.reduce((sum: number, item: any) => sum + (item.openRate || 0), 0) / data.length;
    const avgClickRate = data.reduce((sum: number, item: any) => sum + (item.clickRate || 0), 0) / data.length;
    
    return {
      overall: Math.min(100, (avgOpenRate * 3 + avgClickRate * 10) / 2),
      efficiency: Math.min(100, avgClickRate * 10),
      growth: calculateGrowthScore(data, 'subscribers'),
      engagement: Math.min(100, (avgOpenRate * 3 + avgClickRate * 10) / 2),
      roi: calculateEmailROI(data)
    };
  };

  // Calculate overall scores
  const calculateOverallScores = (data: any): PerformanceScore => {
    return {
      overall: 75,
      efficiency: 70,
      growth: 65,
      engagement: 80,
      roi: 72
    };
  };

  // Calculate growth score
  const calculateGrowthScore = (data: any[], metric: string): number => {
    if (data.length < 2) return 50;
    
    const firstValue = data[0][metric] || 0;
    const lastValue = data[data.length - 1][metric] || 0;
    const growth = ((lastValue - firstValue) / firstValue) * 100;
    
    return Math.min(100, Math.max(0, 50 + growth));
  };

  // Calculate social ROI
  const calculateSocialROI = (data: any[]): number => {
    const totalEngagement = data.reduce((sum, item) => sum + (item.engagement || 0), 0);
    const totalCost = data.reduce((sum, item) => sum + (item.cost || 0), 0) || 1;
    const engagementValue = totalEngagement * 0.5; // Assume $0.50 per engagement
    
    return Math.min(100, (engagementValue / totalCost) * 20);
  };

  // Calculate SEO ROI
  const calculateSEOROI = (data: any[]): number => {
    const totalClicks = data.reduce((sum, item) => sum + (item.clicks || 0), 0);
    const clickValue = totalClicks * 2; // Assume $2 per organic click
    const estimatedCost = data.length * 100; // Assume $100 per month SEO cost
    
    return Math.min(100, (clickValue / estimatedCost) * 10);
  };

  // Calculate email ROI
  const calculateEmailROI = (data: any[]): number => {
    const totalConversions = data.reduce((sum, item) => sum + (item.conversions || 0), 0);
    const conversionValue = totalConversions * 50; // Assume $50 per conversion
    const totalCost = data.reduce((sum, item) => sum + (item.cost || 0), 0) || 1;
    
    return Math.min(100, (conversionValue / totalCost) * 10);
  };

  // Generate insights
  const generateInsights = async (data: any, scores: PerformanceScore): Promise<PerformanceInsight[]> => {
    const insights: PerformanceInsight[] = [];
    
    // Performance-based insights
    if (scores.overall >= 80) {
      insights.push({
        id: 'high-performance',
        type: 'success',
        category: 'Performance',
        title: 'Outstanding Overall Performance',
        description: 'Your campaigns are performing exceptionally well, exceeding industry benchmarks.',
        impact: 'high',
        metrics: {
          current: `${scores.overall.toFixed(0)}%`,
          target: '75%',
          change: scores.overall - 75
        },
        recommendations: [
          'Scale successful campaigns to maximize impact',
          'Document and replicate winning strategies',
          'Consider increasing budget allocation'
        ],
        actionable: true,
        priority: 9
      });
    } else if (scores.overall < 50) {
      insights.push({
        id: 'low-performance',
        type: 'warning',
        category: 'Performance',
        title: 'Performance Below Expectations',
        description: 'Current performance metrics indicate significant room for improvement.',
        impact: 'high',
        metrics: {
          current: `${scores.overall.toFixed(0)}%`,
          target: '75%',
          change: scores.overall - 75
        },
        recommendations: [
          'Review and optimize targeting parameters',
          'A/B test new creative variations',
          'Analyze competitor strategies for insights'
        ],
        actionable: true,
        priority: 10
      });
    }
    
    // Efficiency insights
    if (scores.efficiency < 60) {
      insights.push({
        id: 'low-efficiency',
        type: 'warning',
        category: 'Efficiency',
        title: 'Low Campaign Efficiency Detected',
        description: 'Your cost per acquisition is higher than optimal, impacting overall ROI.',
        impact: 'high',
        metrics: {
          current: `${scores.efficiency.toFixed(0)}%`,
          target: '70%'
        },
        recommendations: [
          'Refine audience targeting to reduce waste',
          'Optimize bid strategies for better efficiency',
          'Focus budget on high-performing segments'
        ],
        actionable: true,
        priority: 8
      });
    }
    
    // Growth insights
    if (scores.growth > 70) {
      insights.push({
        id: 'strong-growth',
        type: 'success',
        category: 'Growth',
        title: 'Strong Growth Trajectory',
        description: 'Your key metrics show consistent upward trends.',
        impact: 'medium',
        metrics: {
          current: `+${scores.growth.toFixed(0)}%`,
          previous: '0%'
        },
        recommendations: [
          'Maintain current growth strategies',
          'Explore additional growth channels',
          'Prepare infrastructure for scale'
        ],
        actionable: true,
        priority: 7
      });
    }
    
    // Data-specific insights
    switch (dataType) {
      case 'campaign':
        insights.push(...generateCampaignInsights(data, scores));
        break;
      case 'social':
        insights.push(...generateSocialInsights(data, scores));
        break;
      case 'seo':
        insights.push(...generateSEOInsights(data, scores));
        break;
      case 'email':
        insights.push(...generateEmailInsights(data, scores));
        break;
    }
    
    // Advanced insights
    if (analysisDepth === 'advanced') {
      insights.push(...generateAdvancedInsights(data, scores));
    }
    
    return insights;
  };

  // Generate campaign-specific insights
  const generateCampaignInsights = (data: any[], scores: PerformanceScore): PerformanceInsight[] => {
    const insights: PerformanceInsight[] = [];
    
    // CTR analysis
    const avgCTR = data.reduce((sum, item) => sum + (item.ctr || 0), 0) / data.length;
    if (avgCTR < 1.5) {
      insights.push({
        id: 'low-ctr',
        type: 'warning',
        category: 'Engagement',
        title: 'Below Average Click-Through Rate',
        description: 'Your CTR is below industry standards, indicating potential ad relevance issues.',
        impact: 'high',
        metrics: {
          current: `${avgCTR.toFixed(2)}%`,
          target: '2.0%'
        },
        recommendations: [
          'Test new ad copy variations',
          'Improve visual creative quality',
          'Refine keyword targeting'
        ],
        actionable: true,
        priority: 8
      });
    }
    
    // Budget optimization
    const costTrend = calculateTrend(data, 'cost');
    const conversionTrend = calculateTrend(data, 'conversions');
    if (costTrend > conversionTrend + 10) {
      insights.push({
        id: 'cost-efficiency',
        type: 'opportunity',
        category: 'Budget',
        title: 'Budget Optimization Opportunity',
        description: 'Costs are increasing faster than conversions, indicating inefficient spend.',
        impact: 'high',
        metrics: {
          current: `Cost trend: +${costTrend.toFixed(0)}%`,
          previous: `Conversion trend: +${conversionTrend.toFixed(0)}%`
        },
        recommendations: [
          'Shift budget to high-performing campaigns',
          'Implement dayparting strategies',
          'Review and optimize bid strategies'
        ],
        actionable: true,
        priority: 9
      });
    }
    
    return insights;
  };

  // Generate social media insights
  const generateSocialInsights = (data: any[], scores: PerformanceScore): PerformanceInsight[] => {
    const insights: PerformanceInsight[] = [];
    
    // Engagement rate analysis
    const avgEngagementRate = data.reduce((sum, item) => sum + (item.engagementRate || 0), 0) / data.length;
    if (avgEngagementRate < 2) {
      insights.push({
        id: 'low-engagement',
        type: 'warning',
        category: 'Engagement',
        title: 'Low Social Media Engagement',
        description: 'Engagement rates are below optimal levels for your follower count.',
        impact: 'medium',
        metrics: {
          current: `${avgEngagementRate.toFixed(2)}%`,
          target: '3.0%'
        },
        recommendations: [
          'Post more user-generated content',
          'Increase interactive content (polls, questions)',
          'Optimize posting times for audience'
        ],
        actionable: true,
        priority: 7
      });
    }
    
    // Best performing content
    const topPosts = data
      .sort((a, b) => b.engagement - a.engagement)
      .slice(0, 3);
    
    if (topPosts.length > 0) {
      insights.push({
        id: 'top-content',
        type: 'success',
        category: 'Content',
        title: 'High-Performing Content Identified',
        description: 'Several posts significantly outperformed averages.',
        impact: 'medium',
        metrics: {
          current: `Top engagement: ${topPosts[0].engagement}`,
          previous: `Average: ${avgEngagementRate.toFixed(0)}`
        },
        recommendations: [
          'Analyze common elements in top posts',
          'Create similar content variations',
          'Boost high-performing posts'
        ],
        actionable: true,
        priority: 6
      });
    }
    
    return insights;
  };

  // Generate SEO insights
  const generateSEOInsights = (data: any[], scores: PerformanceScore): PerformanceInsight[] => {
    const insights: PerformanceInsight[] = [];
    
    // Position improvements
    const positionImprovements = data.filter(item => 
      item.previousPosition && item.position < item.previousPosition
    );
    
    if (positionImprovements.length > 0) {
      insights.push({
        id: 'ranking-improvements',
        type: 'success',
        category: 'Rankings',
        title: 'Keyword Rankings Improving',
        description: `${positionImprovements.length} keywords have improved their search positions.`,
        impact: 'high',
        metrics: {
          current: `${positionImprovements.length} keywords`,
          change: positionImprovements.reduce((sum, item) => 
            sum + (item.previousPosition - item.position), 0
          )
        },
        recommendations: [
          'Continue current SEO strategies',
          'Update content for improved keywords',
          'Build more backlinks to ranking pages'
        ],
        actionable: true,
        priority: 8
      });
    }
    
    // Featured snippet opportunities
    const snippetOpportunities = data.filter(item => 
      item.position >= 2 && item.position <= 10 && item.ctr < 5
    );
    
    if (snippetOpportunities.length > 0) {
      insights.push({
        id: 'snippet-opportunities',
        type: 'opportunity',
        category: 'Optimization',
        title: 'Featured Snippet Opportunities',
        description: 'Keywords ranking on page 1 could potentially win featured snippets.',
        impact: 'high',
        metrics: {
          current: `${snippetOpportunities.length} keywords`,
          target: 'Position 0'
        },
        recommendations: [
          'Optimize content structure for snippets',
          'Add FAQ sections to target pages',
          'Use schema markup for better visibility'
        ],
        actionable: true,
        priority: 9
      });
    }
    
    return insights;
  };

  // Generate email insights
  const generateEmailInsights = (data: any[], scores: PerformanceScore): PerformanceInsight[] => {
    const insights: PerformanceInsight[] = [];
    
    // Open rate analysis
    const avgOpenRate = data.reduce((sum, item) => sum + (item.openRate || 0), 0) / data.length;
    if (avgOpenRate < 20) {
      insights.push({
        id: 'low-open-rate',
        type: 'warning',
        category: 'Engagement',
        title: 'Below Average Open Rates',
        description: 'Email open rates are below industry benchmarks.',
        impact: 'high',
        metrics: {
          current: `${avgOpenRate.toFixed(1)}%`,
          target: '25%'
        },
        recommendations: [
          'A/B test subject lines',
          'Improve sender name recognition',
          'Clean email list for better deliverability'
        ],
        actionable: true,
        priority: 8
      });
    }
    
    // Best performing emails
    const topEmails = data
      .sort((a, b) => (b.clickRate || 0) - (a.clickRate || 0))
      .slice(0, 3);
    
    if (topEmails.length > 0 && topEmails[0].clickRate > avgOpenRate * 1.5) {
      insights.push({
        id: 'top-emails',
        type: 'success',
        category: 'Content',
        title: 'High-Performing Email Templates',
        description: 'Some email campaigns significantly outperformed averages.',
        impact: 'medium',
        metrics: {
          current: `Best CTR: ${topEmails[0].clickRate?.toFixed(1)}%`,
          previous: `Average: ${(avgOpenRate * 0.2).toFixed(1)}%`
        },
        recommendations: [
          'Use winning templates as baseline',
          'Apply successful elements to other campaigns',
          'Create variations of top performers'
        ],
        actionable: true,
        priority: 7
      });
    }
    
    return insights;
  };

  // Generate advanced insights
  const generateAdvancedInsights = (data: any[], scores: PerformanceScore): PerformanceInsight[] => {
    const insights: PerformanceInsight[] = [];
    
    // Predictive insights
    const trend = calculateOverallTrend(data);
    if (Math.abs(trend) > 5) {
      insights.push({
        id: 'performance-prediction',
        type: 'trend',
        category: 'Predictive',
        title: `Performance Trending ${trend > 0 ? 'Upward' : 'Downward'}`,
        description: `Based on current patterns, performance is expected to ${trend > 0 ? 'improve' : 'decline'} by ${Math.abs(trend).toFixed(0)}% over the next period.`,
        impact: 'high',
        metrics: {
          current: `${trend > 0 ? '+' : ''}${trend.toFixed(0)}%`,
          target: '+10%'
        },
        recommendations: trend > 0 ? [
          'Maintain current strategies',
          'Consider scaling successful initiatives',
          'Monitor for plateaus'
        ] : [
          'Identify root causes of decline',
          'Implement corrective actions immediately',
          'Consider strategic pivots'
        ],
        actionable: true,
        priority: 9
      });
    }
    
    // Anomaly detection
    const anomalies = detectAnomalies(data);
    if (anomalies.length > 0) {
      insights.push({
        id: 'anomalies-detected',
        type: 'warning',
        category: 'Anomaly',
        title: 'Unusual Patterns Detected',
        description: 'Data shows unexpected variations that require investigation.',
        impact: 'medium',
        metrics: {
          current: `${anomalies.length} anomalies`,
          change: anomalies[0].deviation
        },
        recommendations: [
          'Investigate unusual data points',
          'Check for tracking issues',
          'Verify external factors impact'
        ],
        actionable: true,
        priority: 7
      });
    }
    
    return insights;
  };

  // Calculate trend
  const calculateTrend = (data: any[], metric: string): number => {
    if (data.length < 2) return 0;
    
    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, item) => sum + (item[metric] || 0), 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, item) => sum + (item[metric] || 0), 0) / secondHalf.length;
    
    return ((secondAvg - firstAvg) / firstAvg) * 100;
  };

  // Calculate overall trend
  const calculateOverallTrend = (data: any[]): number => {
    const metrics = ['clicks', 'conversions', 'engagement', 'revenue'];
    const trends = metrics.map(metric => calculateTrend(data, metric)).filter(t => !isNaN(t));
    
    return trends.length > 0 ? trends.reduce((sum, t) => sum + t, 0) / trends.length : 0;
  };

  // Detect anomalies
  const detectAnomalies = (data: any[]): any[] => {
    const anomalies: any[] = [];
    const metrics = ['clicks', 'conversions', 'cost', 'engagement'];
    
    metrics.forEach(metric => {
      const values = data.map(item => item[metric] || 0);
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const stdDev = Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length);
      
      values.forEach((value, index) => {
        const deviation = Math.abs(value - mean) / stdDev;
        if (deviation > 2) {
          anomalies.push({
            index,
            metric,
            value,
            deviation,
            date: data[index].date
          });
        }
      });
    });
    
    return anomalies;
  };

  // Render performance score
  const renderPerformanceScore = () => {
    const getScoreColor = (score: number) => {
      if (score >= 80) return 'text-green-600';
      if (score >= 60) return 'text-yellow-600';
      return 'text-red-600';
    };
    
    const getScoreIcon = (score: number) => {
      if (score >= 80) return CheckCircle;
      if (score >= 60) return AlertTriangle;
      return AlertTriangle;
    };
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        {Object.entries(performanceScore).map(([key, value]) => {
          const Icon = getScoreIcon(value);
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium capitalize">{key}</span>
                <Icon className={cn("w-5 h-5", getScoreColor(value))} />
              </div>
              <div className={cn("text-2xl font-bold", getScoreColor(value))}>
                {value.toFixed(0)}%
              </div>
              <div className="mt-2 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={cn("h-2 rounded-full", {
                    'bg-green-600': value >= 80,
                    'bg-yellow-600': value >= 60 && value < 80,
                    'bg-red-600': value < 60
                  })}
                  style={{ width: `${value}%` }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  // Render insight card
  const renderInsightCard = (insight: PerformanceInsight) => {
    const getTypeIcon = () => {
      switch (insight.type) {
        case 'success': return CheckCircle;
        case 'warning': return AlertTriangle;
        case 'opportunity': return Target;
        case 'trend': return TrendingUp;
        default: return Info;
      }
    };
    
    const getTypeColor = () => {
      switch (insight.type) {
        case 'success': return 'border-green-500 bg-green-50 dark:bg-green-900/20';
        case 'warning': return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
        case 'opportunity': return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
        case 'trend': return 'border-purple-500 bg-purple-50 dark:bg-purple-900/20';
        default: return 'border-gray-500 bg-gray-50 dark:bg-gray-900/20';
      }
    };
    
    const TypeIcon = getTypeIcon();
    
    return (
      <motion.div
        key={insight.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className={cn("border-l-4 rounded-lg p-4 shadow-sm", getTypeColor())}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <TypeIcon className="w-5 h-5" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {insight.category}
            </span>
            <span className={cn(
              "px-2 py-1 text-xs rounded-full",
              {
                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300': insight.impact === 'high',
                'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300': insight.impact === 'medium',
                'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300': insight.impact === 'low'
              }
            )}>
              {insight.impact} impact
            </span>
          </div>
          {insight.actionable && (
            <button
              onClick={() => onInsightAction?.('optimize', insight)}
              className="px-3 py-1 bg-primary text-white rounded-lg hover:bg-primary/90 text-sm"
            >
              Take Action
            </button>
          )}
        </div>
        
        <h3 className="font-semibold mb-2">{insight.title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{insight.description}</p>
        
        {/* Metrics */}
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Current:</span>
            <span className="font-medium">{insight.metrics.current}</span>
          </div>
          {insight.metrics.target && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Target:</span>
              <span className="font-medium">{insight.metrics.target}</span>
            </div>
          )}
          {insight.metrics.change !== undefined && (
            <div className="flex items-center gap-1">
              {insight.metrics.change > 0 ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
              <span className={cn(
                "font-medium",
                insight.metrics.change > 0 ? "text-green-600" : "text-red-600"
              )}>
                {insight.metrics.change > 0 ? '+' : ''}{insight.metrics.change.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
        
        {/* Recommendations */}
        {insight.recommendations.length > 0 && (
          <div className="border-t pt-3">
            <h4 className="text-sm font-medium mb-2">Recommendations:</h4>
            <ul className="space-y-1">
              {insight.recommendations.map((rec, index) => (
                <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </motion.div>
    );
  };

  // Filter insights
  const filteredInsights = insights.filter(insight => 
    selectedInsightType === 'all' || insight.type === selectedInsightType
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Performance Analysis</h2>
          <button
            onClick={analyzePerformance}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={cn("w-4 h-4", isAnalyzing && "animate-spin")} />
            {isAnalyzing ? 'Analyzing...' : 'Refresh Analysis'}
          </button>
        </div>
        
        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {['all', 'success', 'warning', 'opportunity', 'trend'].map((type) => (
              <button
                key={type}
                onClick={() => setSelectedInsightType(type as any)}
                className={cn(
                  "px-4 py-2 rounded-lg capitalize",
                  selectedInsightType === type
                    ? "bg-primary text-white"
                    : "bg-gray-200 dark:bg-gray-700"
                )}
              >
                {type}
                {type !== 'all' && (
                  <span className="ml-2 text-xs">
                    ({insights.filter(i => i.type === type).length})
                  </span>
                )}
              </button>
            ))}
          </div>
          
          <select
            value={analysisDepth}
            onChange={(e) => setAnalysisDepth(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
          >
            <option value="basic">Basic Analysis</option>
            <option value="advanced">Advanced Analysis</option>
          </select>
        </div>
      </div>
      
      {/* Performance Scores */}
      {renderPerformanceScore()}
      
      {/* Insights */}
      <div className="space-y-4">
        <AnimatePresence>
          {filteredInsights.length > 0 ? (
            filteredInsights.map(insight => renderInsightCard(insight))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center"
            >
              <Info className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                {isAnalyzing ? 'Analyzing your data...' : 'No insights available for the selected criteria.'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Summary Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Analysis Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-2xl font-bold text-green-600">{insights.filter(i => i.type === 'success').length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Successes</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600">{insights.filter(i => i.type === 'warning').length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Warnings</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{insights.filter(i => i.type === 'opportunity').length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Opportunities</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600">{insights.filter(i => i.actionable).length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Actionable Items</div>
          </div>
        </div>
      </div>
    </div>
  );
};