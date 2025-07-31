import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, TrendingDown, Trophy, Target, AlertTriangle, Eye, Share2, DollarSign, BarChart2, Activity } from 'lucide-react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../utils/cn';

interface CompetitorComparisonProps {
  data: any;
  competitors: string[];
  metrics?: string[];
  onStrategyRecommendation?: (strategy: any) => void;
}

interface CompetitorMetric {
  name: string;
  value: number;
  trend: number;
  benchmark: number;
}

interface CompetitivePosition {
  overall: 'leader' | 'challenger' | 'follower' | 'niche';
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

interface StrategyRecommendation {
  id: string;
  type: 'offensive' | 'defensive' | 'flanking' | 'guerrilla';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  tactics: string[];
  expectedImpact: string;
  timeframe: string;
  resources: string[];
}

export const CompetitorComparison: React.FC<CompetitorComparisonProps> = ({
  data,
  competitors,
  metrics = ['Traffic', 'Engagement', 'Conversions', 'Market Share', 'Brand Sentiment'],
  onStrategyRecommendation
}) => {
  const [selectedCompetitor, setSelectedCompetitor] = useState<string | 'all'>('all');
  const [comparisonView, setComparisonView] = useState<'overview' | 'detailed' | 'swot' | 'strategy'>('overview');
  const [timeRange, setTimeRange] = useState<'1m' | '3m' | '6m' | '1y'>('3m');
  const [competitivePosition, setCompetitivePosition] = useState<CompetitivePosition>({
    overall: 'challenger',
    strengths: [],
    weaknesses: [],
    opportunities: [],
    threats: []
  });
  const [strategyRecommendations, setStrategyRecommendations] = useState<StrategyRecommendation[]>([]);
  const [processedData, setProcessedData] = useState<any>({});

  useEffect(() => {
    if (data) {
      processCompetitorData();
      analyzeCompetitivePosition();
      generateStrategyRecommendations();
    }
  }, [data, timeRange]);

  // Process competitor data
  const processCompetitorData = () => {
    const processed: any = {
      comparison: [],
      trends: [],
      gaps: [],
      performance: {}
    };

    // Process comparison data
    metrics.forEach(metric => {
      const comparisonItem: any = {
        metric,
        'Your Brand': getMetricValue(data.ourData, metric),
      };

      competitors.forEach(competitor => {
        comparisonItem[competitor] = getMetricValue(data.competitorData?.[competitor], metric);
      });

      processed.comparison.push(comparisonItem);
    });

    // Process trend data
    if (data.trendData) {
      processed.trends = data.trendData;
    }

    // Calculate competitive gaps
    processed.gaps = calculateCompetitiveGaps(processed.comparison);

    // Performance scores
    processed.performance = calculatePerformanceScores(processed.comparison);

    setProcessedData(processed);
  };

  // Get metric value from data
  const getMetricValue = (data: any, metric: string): number => {
    if (!data) return 0;
    
    // Try different possible field names
    const value = data[metric] || 
                  data[metric.toLowerCase()] || 
                  data[metric.replace(/\s+/g, '_').toLowerCase()] ||
                  0;
    
    return typeof value === 'number' ? value : parseFloat(value) || 0;
  };

  // Calculate competitive gaps
  const calculateCompetitiveGaps = (comparisonData: any[]): any[] => {
    return comparisonData.map(item => {
      const ourValue = item['Your Brand'] || 0;
      const avgCompetitorValue = competitors.reduce((sum, comp) => 
        sum + (item[comp] || 0), 0
      ) / competitors.length;
      
      return {
        metric: item.metric,
        ourValue,
        competitorAvg: avgCompetitorValue,
        gap: ourValue - avgCompetitorValue,
        gapPercentage: avgCompetitorValue > 0 ? 
          ((ourValue - avgCompetitorValue) / avgCompetitorValue) * 100 : 0
      };
    });
  };

  // Calculate performance scores
  const calculatePerformanceScores = (comparisonData: any[]): any => {
    const scores: any = {
      'Your Brand': 0
    };

    competitors.forEach(comp => {
      scores[comp] = 0;
    });

    comparisonData.forEach(item => {
      const maxValue = Math.max(
        item['Your Brand'] || 0,
        ...competitors.map(comp => item[comp] || 0)
      );

      if (maxValue > 0) {
        scores['Your Brand'] += (item['Your Brand'] || 0) / maxValue;
        competitors.forEach(comp => {
          scores[comp] += (item[comp] || 0) / maxValue;
        });
      }
    });

    // Normalize scores
    Object.keys(scores).forEach(key => {
      scores[key] = (scores[key] / comparisonData.length) * 100;
    });

    return scores;
  };

  // Analyze competitive position
  const analyzeCompetitivePosition = () => {
    const position: CompetitivePosition = {
      overall: 'challenger',
      strengths: [],
      weaknesses: [],
      opportunities: [],
      threats: []
    };

    // Determine overall position
    const performanceScore = processedData.performance?.['Your Brand'] || 0;
    if (performanceScore >= 80) {
      position.overall = 'leader';
    } else if (performanceScore >= 60) {
      position.overall = 'challenger';
    } else if (performanceScore >= 40) {
      position.overall = 'follower';
    } else {
      position.overall = 'niche';
    }

    // Analyze strengths and weaknesses
    processedData.gaps?.forEach((gap: any) => {
      if (gap.gapPercentage > 20) {
        position.strengths.push(`Strong ${gap.metric} performance (+${gap.gapPercentage.toFixed(0)}%)`);
      } else if (gap.gapPercentage < -20) {
        position.weaknesses.push(`${gap.metric} below competitors (${gap.gapPercentage.toFixed(0)}%)`);
      }
    });

    // Identify opportunities and threats
    // This would ideally use more sophisticated analysis
    position.opportunities = [
      'Expand into underserved market segments',
      'Leverage technology for competitive advantage',
      'Form strategic partnerships'
    ];

    position.threats = [
      'New market entrants with innovative solutions',
      'Changing customer preferences',
      'Economic uncertainties'
    ];

    setCompetitivePosition(position);
  };

  // Generate strategy recommendations
  const generateStrategyRecommendations = () => {
    const recommendations: StrategyRecommendation[] = [];

    // Based on competitive position
    switch (competitivePosition.overall) {
      case 'leader':
        recommendations.push({
          id: 'maintain-leadership',
          type: 'defensive',
          priority: 'high',
          title: 'Maintain Market Leadership',
          description: 'Strengthen your dominant position through innovation and customer loyalty.',
          tactics: [
            'Increase R&D investment',
            'Enhance customer experience',
            'Build stronger brand moat'
          ],
          expectedImpact: '10-15% market share growth',
          timeframe: '6-12 months',
          resources: ['Product team', 'Marketing budget increase', 'Customer success expansion']
        });
        break;

      case 'challenger':
        recommendations.push({
          id: 'attack-weakness',
          type: 'offensive',
          priority: 'high',
          title: 'Target Competitor Weaknesses',
          description: 'Focus resources on areas where competitors are vulnerable.',
          tactics: [
            'Launch targeted campaigns',
            'Improve product features',
            'Aggressive pricing strategy'
          ],
          expectedImpact: '5-10% market share gain',
          timeframe: '3-6 months',
          resources: ['Competitive intelligence', 'Product development', 'Marketing campaigns']
        });
        break;

      case 'follower':
        recommendations.push({
          id: 'differentiation',
          type: 'flanking',
          priority: 'high',
          title: 'Create Unique Value Proposition',
          description: 'Differentiate through specialized offerings or niche targeting.',
          tactics: [
            'Focus on specific customer segments',
            'Develop unique features',
            'Build strategic partnerships'
          ],
          expectedImpact: '3-5% market share improvement',
          timeframe: '6-9 months',
          resources: ['Market research', 'Product innovation', 'Partnership team']
        });
        break;

      case 'niche':
        recommendations.push({
          id: 'guerrilla-tactics',
          type: 'guerrilla',
          priority: 'high',
          title: 'Guerrilla Marketing Tactics',
          description: 'Use creative, low-cost strategies to compete with larger players.',
          tactics: [
            'Viral marketing campaigns',
            'Community building',
            'Strategic alliances'
          ],
          expectedImpact: '2-3% market visibility increase',
          timeframe: '3-6 months',
          resources: ['Creative team', 'Community management', 'Limited budget optimization']
        });
        break;
    }

    // Add specific recommendations based on gaps
    processedData.gaps?.forEach((gap: any) => {
      if (gap.gapPercentage < -30) {
        recommendations.push({
          id: `improve-${gap.metric.toLowerCase().replace(/\s+/g, '-')}`,
          type: 'offensive',
          priority: gap.gapPercentage < -50 ? 'high' : 'medium',
          title: `Improve ${gap.metric} Performance`,
          description: `Current performance is ${Math.abs(gap.gapPercentage).toFixed(0)}% below competitors.`,
          tactics: [
            `Audit current ${gap.metric.toLowerCase()} strategies`,
            'Benchmark best practices',
            'Implement improvement plan'
          ],
          expectedImpact: `${Math.abs(gap.gapPercentage / 2).toFixed(0)}% improvement`,
          timeframe: '2-4 months',
          resources: ['Analytics team', 'Strategy consultant', 'Implementation budget']
        });
      }
    });

    setStrategyRecommendations(recommendations);
  };

  // Render overview
  const renderOverview = () => {
    return (
      <div className="space-y-6">
        {/* Performance Scores */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Overall Performance Scores</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(processedData.performance || {}).map(([brand, score]) => (
              <motion.div
                key={brand}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <div className={cn(
                  "text-3xl font-bold mb-2",
                  brand === 'Your Brand' ? 'text-primary' : 'text-gray-600'
                )}>
                  {(score as number).toFixed(0)}%
                </div>
                <div className="text-sm font-medium">{brand}</div>
                {brand === 'Your Brand' && (
                  <div className={cn(
                    "text-xs mt-1",
                    competitivePosition.overall === 'leader' ? 'text-green-600' :
                    competitivePosition.overall === 'challenger' ? 'text-blue-600' :
                    competitivePosition.overall === 'follower' ? 'text-yellow-600' :
                    'text-gray-600'
                  )}>
                    Market {competitivePosition.overall}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Radar Chart Comparison */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Multi-Metric Comparison</h3>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={processedData.comparison || []}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar
                name="Your Brand"
                dataKey="Your Brand"
                stroke="#3B82F6"
                fill="#3B82F6"
                fillOpacity={0.6}
              />
              {selectedCompetitor === 'all' ? (
                competitors.map((competitor, index) => (
                  <Radar
                    key={competitor}
                    name={competitor}
                    dataKey={competitor}
                    stroke={CHART_COLORS[index + 1]}
                    fill={CHART_COLORS[index + 1]}
                    fillOpacity={0.3}
                  />
                ))
              ) : selectedCompetitor !== 'all' && (
                <Radar
                  name={selectedCompetitor}
                  dataKey={selectedCompetitor}
                  stroke="#EF4444"
                  fill="#EF4444"
                  fillOpacity={0.6}
                />
              )}
              <Tooltip />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Competitive Gaps */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Competitive Gaps Analysis</h3>
          <div className="space-y-4">
            {processedData.gaps?.map((gap: any) => (
              <div key={gap.metric} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{gap.metric}</span>
                    <span className={cn(
                      "text-sm font-bold",
                      gap.gapPercentage > 0 ? 'text-green-600' : 'text-red-600'
                    )}>
                      {gap.gapPercentage > 0 ? '+' : ''}{gap.gapPercentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={cn(
                          "h-2 rounded-full",
                          gap.gapPercentage > 0 ? 'bg-green-600' : 'bg-red-600'
                        )}
                        style={{
                          width: `${Math.min(100, Math.abs(gap.gapPercentage))}%`,
                          marginLeft: gap.gapPercentage < 0 ? 'auto' : 0
                        }}
                      />
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 w-32 text-right">
                      You: {gap.ourValue.toFixed(0)} | Avg: {gap.competitorAvg.toFixed(0)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Render detailed comparison
  const renderDetailedComparison = () => {
    return (
      <div className="space-y-6">
        {/* Metric by metric comparison */}
        {metrics.map(metric => (
          <div key={metric} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold mb-4">{metric} Comparison</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={[
                  {
                    name: metric,
                    'Your Brand': getMetricValue(data.ourData, metric),
                    ...competitors.reduce((acc, comp) => ({
                      ...acc,
                      [comp]: getMetricValue(data.competitorData?.[comp], metric)
                    }), {})
                  }
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Your Brand" fill="#3B82F6" />
                {competitors.map((comp, index) => (
                  <Bar key={comp} dataKey={comp} fill={CHART_COLORS[index + 1]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
            
            {/* Insights for this metric */}
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h4 className="font-medium mb-2">Key Insights</h4>
              <ul className="space-y-1 text-sm">
                {generateMetricInsights(metric).map((insight, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Generate metric-specific insights
  const generateMetricInsights = (metric: string): string[] => {
    const gap = processedData.gaps?.find((g: any) => g.metric === metric);
    if (!gap) return [];

    const insights: string[] = [];
    
    if (gap.gapPercentage > 20) {
      insights.push(`Strong performance advantage of ${gap.gapPercentage.toFixed(0)}% over competitors`);
      insights.push('Consider leveraging this strength in marketing messages');
    } else if (gap.gapPercentage < -20) {
      insights.push(`Performance gap of ${Math.abs(gap.gapPercentage).toFixed(0)}% behind competitors`);
      insights.push('Priority area for improvement and investment');
    } else {
      insights.push('Performance is on par with competitors');
      insights.push('Look for differentiation opportunities');
    }

    return insights;
  };

  // Render SWOT analysis
  const renderSWOTAnalysis = () => {
    const swotData = [
      { category: 'Strengths', items: competitivePosition.strengths, icon: Trophy, color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
      { category: 'Weaknesses', items: competitivePosition.weaknesses, icon: AlertTriangle, color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
      { category: 'Opportunities', items: competitivePosition.opportunities, icon: Target, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
      { category: 'Threats', items: competitivePosition.threats, icon: TrendingDown, color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' }
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {swotData.map(({ category, items, icon: Icon, color }) => (
          <div key={category} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className={cn("p-2 rounded-lg", color)}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold">{category}</h3>
            </div>
            <ul className="space-y-2">
              {items.map((item, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-gray-400 mt-1">•</span>
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  };

  // Render strategy recommendations
  const renderStrategyRecommendations = () => {
    const priorityColors = {
      high: 'border-red-500 bg-red-50 dark:bg-red-900/20',
      medium: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
      low: 'border-green-500 bg-green-50 dark:bg-green-900/20'
    };

    const typeIcons = {
      offensive: Target,
      defensive: Trophy,
      flanking: Share2,
      guerrilla: Zap
    };

    return (
      <div className="space-y-4">
        {strategyRecommendations.map((strategy) => {
          const TypeIcon = typeIcons[strategy.type];
          
          return (
            <motion.div
              key={strategy.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                "border-l-4 rounded-lg p-6 shadow-sm",
                priorityColors[strategy.priority]
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <TypeIcon className="w-6 h-6" />
                  <div>
                    <h3 className="font-semibold">{strategy.title}</h3>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {strategy.type} strategy
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {strategy.timeframe}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => onStrategyRecommendation?.(strategy)}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  Implement
                </button>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {strategy.description}
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Key Tactics</h4>
                  <ul className="space-y-1">
                    {strategy.tactics.map((tactic, index) => (
                      <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                        <span className="text-primary">→</span>
                        <span>{tactic}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Expected Impact</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {strategy.expectedImpact}
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Resources Needed</h4>
                  <ul className="space-y-1">
                    {strategy.resources.map((resource, index) => (
                      <li key={index} className="text-sm text-gray-600 dark:text-gray-400">
                        • {resource}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  };

  const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold mb-4">Competitor Analysis</h2>
        
        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {['overview', 'detailed', 'swot', 'strategy'].map((view) => (
              <button
                key={view}
                onClick={() => setComparisonView(view as any)}
                className={cn(
                  "px-4 py-2 rounded-lg capitalize",
                  comparisonView === view
                    ? "bg-primary text-white"
                    : "bg-gray-200 dark:bg-gray-700"
                )}
              >
                {view}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-4">
            <select
              value={selectedCompetitor}
              onChange={(e) => setSelectedCompetitor(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
            >
              <option value="all">All Competitors</option>
              {competitors.map(comp => (
                <option key={comp} value={comp}>{comp}</option>
              ))}
            </select>
            
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
            >
              <option value="1m">Last month</option>
              <option value="3m">Last 3 months</option>
              <option value="6m">Last 6 months</option>
              <option value="1y">Last year</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Competitive Position Badge */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Trophy className={cn(
              "w-8 h-8",
              competitivePosition.overall === 'leader' ? 'text-yellow-500' :
              competitivePosition.overall === 'challenger' ? 'text-blue-500' :
              competitivePosition.overall === 'follower' ? 'text-gray-500' :
              'text-purple-500'
            )} />
            <div>
              <h3 className="font-semibold">Your Competitive Position</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Market {competitivePosition.overall} with {competitivePosition.strengths.length} key strengths
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">
              #{Object.keys(processedData.performance || {}).findIndex(key => key === 'Your Brand') + 1}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Market Rank</div>
          </div>
        </div>
      </div>
      
      {/* Content based on view */}
      <AnimatePresence mode="wait">
        <motion.div
          key={comparisonView}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          {comparisonView === 'overview' && renderOverview()}
          {comparisonView === 'detailed' && renderDetailedComparison()}
          {comparisonView === 'swot' && renderSWOTAnalysis()}
          {comparisonView === 'strategy' && renderStrategyRecommendations()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};