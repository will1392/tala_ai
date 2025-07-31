import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity, Zap, AlertCircle, Calendar, Filter, Eye, Clock, BarChart3 } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../../utils/cn';

interface TrendIdentifierProps {
  data: any;
  dataType: 'marketing' | 'social' | 'seo' | 'email' | 'mixed';
  onTrendAction?: (trend: Trend, action: string) => void;
}

interface Trend {
  id: string;
  type: 'emerging' | 'growing' | 'declining' | 'seasonal' | 'anomaly';
  category: string;
  name: string;
  description: string;
  metrics: {
    current: number;
    previous: number;
    change: number;
    velocity: number;
    acceleration: number;
  };
  timeframe: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  recommendations: string[];
  dataPoints: any[];
  forecast?: {
    direction: 'up' | 'down' | 'stable';
    magnitude: number;
    timeToImpact: string;
  };
}

interface TrendPattern {
  name: string;
  pattern: 'linear' | 'exponential' | 'cyclical' | 'step' | 'irregular';
  strength: number;
  direction: 'positive' | 'negative' | 'neutral';
}

interface SeasonalPattern {
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  peakTimes: string[];
  lowTimes: string[];
  amplitude: number;
}

export const TrendIdentifier: React.FC<TrendIdentifierProps> = ({
  data,
  dataType,
  onTrendAction
}) => {
  const [identifiedTrends, setIdentifiedTrends] = useState<Trend[]>([]);
  const [selectedTrend, setSelectedTrend] = useState<Trend | null>(null);
  const [trendView, setTrendView] = useState<'all' | 'emerging' | 'declining' | 'seasonal' | 'anomalies'>('all');
  const [timeWindow, setTimeWindow] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [trendPatterns, setTrendPatterns] = useState<TrendPattern[]>([]);
  const [seasonalPatterns, setSeasonalPatterns] = useState<SeasonalPattern[]>([]);

  useEffect(() => {
    if (data) {
      analyzeTrends();
    }
  }, [data, timeWindow]);

  // Main trend analysis function
  const analyzeTrends = async () => {
    setIsAnalyzing(true);
    
    try {
      // Identify different types of trends
      const emerging = identifyEmergingTrends(data);
      const declining = identifyDecliningTrends(data);
      const seasonal = identifySeasonalTrends(data);
      const anomalies = identifyAnomalies(data);
      
      // Combine and prioritize trends
      const allTrends = [...emerging, ...declining, ...seasonal, ...anomalies];
      const prioritizedTrends = prioritizeTrends(allTrends);
      
      setIdentifiedTrends(prioritizedTrends);
      
      // Analyze patterns
      const patterns = analyzePatterns(data);
      setTrendPatterns(patterns);
      
      // Identify seasonal patterns
      const seasonals = detectSeasonalPatterns(data);
      setSeasonalPatterns(seasonals);
    } catch (error) {
      console.error('Trend analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Extract metrics from data
  const extractMetrics = (data: any[]): any[] => {
    if (!Array.isArray(data) || data.length === 0) return [];
    
    const metrics: any[] = [];
    const firstItem = data[0];
    
    Object.keys(firstItem).forEach(key => {
      if (typeof firstItem[key] === 'number' && key !== 'date' && key !== 'timestamp') {
        metrics.push({
          name: key,
          category: categorizeMetric(key),
          values: data.map(item => ({
            date: item.date || item.timestamp,
            value: item[key] || 0
          }))
        });
      }
    });
    
    return metrics;
  };

  // Categorize metric based on name
  const categorizeMetric = (metricName: string): string => {
    const name = metricName.toLowerCase();
    if (name.includes('click') || name.includes('ctr')) return 'Engagement';
    if (name.includes('conversion') || name.includes('sale')) return 'Conversion';
    if (name.includes('cost') || name.includes('spend')) return 'Cost';
    if (name.includes('impression') || name.includes('view')) return 'Reach';
    if (name.includes('follower') || name.includes('subscriber')) return 'Audience';
    return 'Other';
  };

  // Analyze metric trend
  const analyzeMetricTrend = (values: any[]): any => {
    if (values.length < 3) return { velocity: 0, acceleration: 0, change: 0 };
    
    const recent = values.slice(-Math.ceil(values.length / 3));
    const previous = values.slice(0, Math.floor(values.length / 3));
    
    const recentAvg = recent.reduce((sum, v) => sum + v.value, 0) / recent.length;
    const previousAvg = previous.reduce((sum, v) => sum + v.value, 0) / previous.length;
    
    const change = (recentAvg - previousAvg) / previousAvg;
    const velocity = change / values.length;
    
    // Calculate acceleration (rate of change of velocity)
    const midpoint = Math.floor(values.length / 2);
    const firstHalfChange = (values[midpoint].value - values[0].value) / values[0].value;
    const secondHalfChange = (values[values.length - 1].value - values[midpoint].value) / values[midpoint].value;
    const acceleration = (secondHalfChange - firstHalfChange) / values.length;
    
    return {
      current: values[values.length - 1].value,
      previous: values[0].value,
      change,
      velocity,
      acceleration
    };
  };

  // Identify emerging trends
  const identifyEmergingTrends = (data: any[]): Trend[] => {
    const trends: Trend[] = [];
    const metrics = extractMetrics(data);
    
    metrics.forEach(metric => {
      const analysis = analyzeMetricTrend(metric.values);
      
      if (analysis.velocity > 0.1 && analysis.acceleration > 0) {
        trends.push({
          id: `emerging-${metric.name}`,
          type: 'emerging',
          category: metric.category,
          name: `Rising ${metric.name}`,
          description: `${metric.name} is showing strong upward momentum with ${(analysis.change * 100).toFixed(1)}% growth`,
          metrics: {
            current: analysis.current,
            previous: analysis.previous,
            change: analysis.change,
            velocity: analysis.velocity,
            acceleration: analysis.acceleration
          },
          timeframe: getTimeframeDescription(timeWindow),
          confidence: calculateConfidence(analysis),
          impact: determineImpact(analysis),
          recommendations: generateRecommendations('emerging', metric, analysis),
          dataPoints: metric.values,
          forecast: generateForecast(analysis)
        });
      }
    });
    
    return trends;
  };

  // Identify declining trends
  const identifyDecliningTrends = (data: any[]): Trend[] => {
    const trends: Trend[] = [];
    const metrics = extractMetrics(data);
    
    metrics.forEach(metric => {
      const analysis = analyzeMetricTrend(metric.values);
      
      if (analysis.velocity < -0.1) {
        trends.push({
          id: `declining-${metric.name}`,
          type: 'declining',
          category: metric.category,
          name: `Declining ${metric.name}`,
          description: `${metric.name} is showing downward trend with ${(Math.abs(analysis.change) * 100).toFixed(1)}% decline`,
          metrics: {
            current: analysis.current,
            previous: analysis.previous,
            change: analysis.change,
            velocity: analysis.velocity,
            acceleration: analysis.acceleration
          },
          timeframe: getTimeframeDescription(timeWindow),
          confidence: calculateConfidence(analysis),
          impact: determineImpact(analysis),
          recommendations: generateRecommendations('declining', metric, analysis),
          dataPoints: metric.values,
          forecast: generateForecast(analysis)
        });
      }
    });
    
    return trends;
  };

  // Identify seasonal trends
  const identifySeasonalTrends = (data: any[]): Trend[] => {
    const trends: Trend[] = [];
    const metrics = extractMetrics(data);
    
    metrics.forEach(metric => {
      const seasonality = detectSeasonality(metric.values);
      
      if (seasonality.isSeasonal) {
        const analysis = analyzeMetricTrend(metric.values);
        trends.push({
          id: `seasonal-${metric.name}`,
          type: 'seasonal',
          category: metric.category,
          name: `${metric.name} Seasonal Pattern`,
          description: `${metric.name} shows ${seasonality.period} seasonal patterns with ${seasonality.strength.toFixed(0)}% variation`,
          metrics: {
            current: analysis.current,
            previous: analysis.previous,
            change: analysis.change,
            velocity: analysis.velocity,
            acceleration: analysis.acceleration
          },
          timeframe: getTimeframeDescription(timeWindow),
          confidence: seasonality.confidence,
          impact: determineImpact(analysis),
          recommendations: generateSeasonalRecommendations(metric, seasonality),
          dataPoints: metric.values,
          forecast: {
            direction: seasonality.nextPhase,
            magnitude: seasonality.expectedChange,
            timeToImpact: seasonality.timeToNext
          }
        });
      }
    });
    
    return trends;
  };

  // Identify anomalies
  const identifyAnomalies = (data: any[]): Trend[] => {
    const trends: Trend[] = [];
    const metrics = extractMetrics(data);
    
    metrics.forEach(metric => {
      const anomalies = detectAnomalies(metric.values);
      
      anomalies.forEach(anomaly => {
        trends.push({
          id: `anomaly-${metric.name}-${anomaly.index}`,
          type: 'anomaly',
          category: metric.category,
          name: `${metric.name} Anomaly`,
          description: `Unusual ${anomaly.deviation > 0 ? 'spike' : 'drop'} detected in ${metric.name} (${Math.abs(anomaly.deviation).toFixed(1)}σ deviation)`,
          metrics: {
            current: anomaly.value,
            previous: anomaly.expected,
            change: (anomaly.value - anomaly.expected) / anomaly.expected,
            velocity: 0,
            acceleration: 0
          },
          timeframe: anomaly.date,
          confidence: Math.min(99, 50 + Math.abs(anomaly.deviation) * 10),
          impact: Math.abs(anomaly.deviation) > 3 ? 'high' : Math.abs(anomaly.deviation) > 2 ? 'medium' : 'low',
          recommendations: generateAnomalyRecommendations(metric, anomaly),
          dataPoints: metric.values
        });
      });
    });
    
    return trends;
  };

  // Detect seasonality in data
  const detectSeasonality = (values: any[]): any => {
    if (values.length < 14) return { isSeasonal: false };
    
    // Simple seasonality detection using autocorrelation
    const data = values.map(v => v.value);
    const mean = data.reduce((sum, v) => sum + v, 0) / data.length;
    const detrended = data.map(v => v - mean);
    
    // Check for weekly patterns (7 days)
    const weeklyCorrelation = calculateAutocorrelation(detrended, 7);
    
    // Check for monthly patterns (30 days)
    const monthlyCorrelation = calculateAutocorrelation(detrended, 30);
    
    const isSeasonal = weeklyCorrelation > 0.5 || monthlyCorrelation > 0.5;
    const period = weeklyCorrelation > monthlyCorrelation ? 'weekly' : 'monthly';
    const strength = Math.max(weeklyCorrelation, monthlyCorrelation) * 100;
    
    return {
      isSeasonal,
      period,
      strength,
      confidence: strength,
      nextPhase: 'up',
      expectedChange: strength / 100,
      timeToNext: period === 'weekly' ? '3-4 days' : '10-15 days'
    };
  };

  // Calculate autocorrelation
  const calculateAutocorrelation = (data: number[], lag: number): number => {
    if (lag >= data.length) return 0;
    
    const n = data.length - lag;
    let correlation = 0;
    
    for (let i = 0; i < n; i++) {
      correlation += data[i] * data[i + lag];
    }
    
    return correlation / n;
  };

  // Detect anomalies using statistical methods
  const detectAnomalies = (values: any[]): any[] => {
    const anomalies: any[] = [];
    const data = values.map(v => v.value);
    
    // Calculate mean and standard deviation
    const mean = data.reduce((sum, v) => sum + v, 0) / data.length;
    const variance = data.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);
    
    // Detect outliers (values beyond 2 standard deviations)
    values.forEach((item, index) => {
      const deviation = (item.value - mean) / stdDev;
      if (Math.abs(deviation) > 2) {
        anomalies.push({
          index,
          date: item.date,
          value: item.value,
          expected: mean,
          deviation
        });
      }
    });
    
    return anomalies;
  };

  // Calculate confidence score
  const calculateConfidence = (analysis: any): number => {
    const factors = [
      Math.abs(analysis.change) * 100, // Change magnitude
      Math.abs(analysis.velocity) * 1000, // Velocity
      analysis.acceleration > 0 ? 20 : 0 // Positive acceleration
    ];
    
    return Math.min(99, factors.reduce((sum, f) => sum + f, 50));
  };

  // Determine impact level
  const determineImpact = (analysis: any): 'high' | 'medium' | 'low' => {
    const changePercent = Math.abs(analysis.change) * 100;
    if (changePercent > 50) return 'high';
    if (changePercent > 20) return 'medium';
    return 'low';
  };

  // Generate recommendations based on trend type
  const generateRecommendations = (type: string, metric: any, analysis: any): string[] => {
    const recommendations: string[] = [];
    
    if (type === 'emerging') {
      recommendations.push(`Capitalize on growing ${metric.name} by increasing investment`);
      recommendations.push('Analyze factors driving this growth');
      recommendations.push('Scale successful strategies before plateau');
      if (metric.category === 'Engagement') {
        recommendations.push('Create more content in this successful format');
      }
    } else if (type === 'declining') {
      recommendations.push(`Investigate root causes of ${metric.name} decline`);
      recommendations.push('A/B test new approaches to reverse trend');
      recommendations.push('Consider pivoting strategy if decline continues');
      if (metric.category === 'Conversion') {
        recommendations.push('Review and optimize conversion funnel');
      }
    }
    
    return recommendations;
  };

  // Generate seasonal recommendations
  const generateSeasonalRecommendations = (metric: any, seasonality: any): string[] => {
    return [
      `Plan campaigns around ${seasonality.period} peaks`,
      'Adjust budget allocation based on seasonal patterns',
      'Prepare content calendar aligned with cycles',
      'Build inventory/resources for high-demand periods'
    ];
  };

  // Generate anomaly recommendations
  const generateAnomalyRecommendations = (metric: any, anomaly: any): string[] => {
    const recommendations: string[] = [];
    
    if (anomaly.deviation > 0) {
      recommendations.push('Investigate what caused this positive spike');
      recommendations.push('Try to replicate successful conditions');
      recommendations.push('Document learnings for future campaigns');
    } else {
      recommendations.push('Check for technical issues or tracking problems');
      recommendations.push('Review any changes made around this time');
      recommendations.push('Implement safeguards to prevent recurrence');
    }
    
    return recommendations;
  };

  // Generate forecast
  const generateForecast = (analysis: any): any => {
    const direction = analysis.velocity > 0.05 ? 'up' : analysis.velocity < -0.05 ? 'down' : 'stable';
    const magnitude = Math.abs(analysis.velocity * 30); // 30-day projection
    
    return {
      direction,
      magnitude,
      timeToImpact: magnitude > 20 ? '1-2 weeks' : '3-4 weeks'
    };
  };

  // Get timeframe description
  const getTimeframeDescription = (window: string): string => {
    const descriptions = {
      '7d': 'Last 7 days',
      '30d': 'Last 30 days',
      '90d': 'Last 3 months',
      '1y': 'Last year'
    };
    return descriptions[window] || window;
  };

  // Prioritize trends
  const prioritizeTrends = (trends: Trend[]): Trend[] => {
    return trends.sort((a, b) => {
      // Priority based on impact and confidence
      const scoreA = (a.impact === 'high' ? 3 : a.impact === 'medium' ? 2 : 1) * a.confidence;
      const scoreB = (b.impact === 'high' ? 3 : b.impact === 'medium' ? 2 : 1) * b.confidence;
      return scoreB - scoreA;
    });
  };

  // Analyze patterns
  const analyzePatterns = (data: any[]): TrendPattern[] => {
    const patterns: TrendPattern[] = [];
    const metrics = extractMetrics(data);
    
    metrics.forEach(metric => {
      const pattern = detectPattern(metric.values);
      patterns.push({
        name: metric.name,
        pattern: pattern.type,
        strength: pattern.strength,
        direction: pattern.direction
      });
    });
    
    return patterns;
  };

  // Detect pattern type
  const detectPattern = (values: any[]): any => {
    const data = values.map(v => v.value);
    
    // Simple pattern detection
    const isLinear = checkLinearPattern(data);
    const isExponential = checkExponentialPattern(data);
    const isCyclical = checkCyclicalPattern(data);
    
    if (isLinear.strength > 0.8) {
      return { type: 'linear', strength: isLinear.strength, direction: isLinear.direction };
    } else if (isExponential.strength > 0.7) {
      return { type: 'exponential', strength: isExponential.strength, direction: isExponential.direction };
    } else if (isCyclical.strength > 0.6) {
      return { type: 'cyclical', strength: isCyclical.strength, direction: 'neutral' };
    } else {
      return { type: 'irregular', strength: 0.5, direction: 'neutral' };
    }
  };

  // Check for linear pattern
  const checkLinearPattern = (data: number[]): any => {
    // Simple linear regression
    const n = data.length;
    const sumX = data.reduce((sum, _, i) => sum + i, 0);
    const sumY = data.reduce((sum, y) => sum + y, 0);
    const sumXY = data.reduce((sum, y, i) => sum + i * y, 0);
    const sumX2 = data.reduce((sum, _, i) => sum + i * i, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate R-squared
    const yMean = sumY / n;
    const ssTotal = data.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
    const ssResidual = data.reduce((sum, y, i) => sum + Math.pow(y - (slope * i + intercept), 2), 0);
    const rSquared = 1 - (ssResidual / ssTotal);
    
    return {
      strength: Math.abs(rSquared),
      direction: slope > 0 ? 'positive' : 'negative'
    };
  };

  // Check for exponential pattern
  const checkExponentialPattern = (data: number[]): any => {
    // Transform to log scale and check linearity
    const logData = data.map(v => Math.log(Math.max(1, v)));
    return checkLinearPattern(logData);
  };

  // Check for cyclical pattern
  const checkCyclicalPattern = (data: number[]): any => {
    // Use autocorrelation to detect cycles
    const correlations = [];
    for (let lag = 1; lag < data.length / 2; lag++) {
      correlations.push(calculateAutocorrelation(data, lag));
    }
    
    const maxCorrelation = Math.max(...correlations);
    return { strength: maxCorrelation };
  };

  // Detect seasonal patterns in data
  const detectSeasonalPatterns = (data: any[]): SeasonalPattern[] => {
    const patterns: SeasonalPattern[] = [];
    
    // This is a simplified implementation
    // In production, use more sophisticated time series analysis
    patterns.push({
      period: 'weekly',
      peakTimes: ['Monday 10am', 'Wednesday 2pm', 'Friday 4pm'],
      lowTimes: ['Saturday', 'Sunday'],
      amplitude: 35
    });
    
    return patterns;
  };

  // Render trend card
  const renderTrendCard = (trend: Trend) => {
    const getTypeIcon = () => {
      switch (trend.type) {
        case 'emerging': return TrendingUp;
        case 'growing': return TrendingUp;
        case 'declining': return TrendingDown;
        case 'seasonal': return Calendar;
        case 'anomaly': return AlertCircle;
        default: return Activity;
      }
    };
    
    const getTypeColor = () => {
      switch (trend.type) {
        case 'emerging':
        case 'growing': return 'border-green-500 bg-green-50 dark:bg-green-900/20';
        case 'declining': return 'border-red-500 bg-red-50 dark:bg-red-900/20';
        case 'seasonal': return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
        case 'anomaly': return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
        default: return 'border-gray-500 bg-gray-50 dark:bg-gray-900/20';
      }
    };
    
    const TypeIcon = getTypeIcon();
    
    return (
      <motion.div
        key={trend.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "border-l-4 rounded-lg p-4 shadow-sm cursor-pointer transition-all",
          getTypeColor(),
          selectedTrend?.id === trend.id && "ring-2 ring-primary"
        )}
        onClick={() => setSelectedTrend(trend)}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <TypeIcon className="w-5 h-5" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {trend.category}
            </span>
            <span className={cn(
              "px-2 py-1 text-xs rounded-full",
              trend.impact === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
              trend.impact === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
              'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
            )}>
              {trend.impact} impact
            </span>
          </div>
          <div className="text-sm text-gray-500">
            {trend.confidence}% confidence
          </div>
        </div>
        
        <h3 className="font-semibold mb-1">{trend.name}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{trend.description}</p>
        
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <span className="text-gray-500">Change:</span>
            <span className={cn(
              "font-medium",
              trend.metrics.change > 0 ? "text-green-600" : "text-red-600"
            )}>
              {trend.metrics.change > 0 ? '+' : ''}{(trend.metrics.change * 100).toFixed(1)}%
            </span>
          </div>
          {trend.forecast && (
            <div className="flex items-center gap-1">
              <span className="text-gray-500">Forecast:</span>
              <span className="font-medium">
                {trend.forecast.direction === 'up' ? '↑' : trend.forecast.direction === 'down' ? '↓' : '→'}
                {trend.forecast.magnitude.toFixed(0)}% {trend.forecast.timeToImpact}
              </span>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  // Render trend details
  const renderTrendDetails = () => {
    if (!selectedTrend) return null;
    
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">{selectedTrend.name} - Detailed Analysis</h3>
        
        {/* Trend Chart */}
        <div className="mb-6">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={selectedTrend.dataPoints}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#3B82F6"
                fill="#3B82F6"
                fillOpacity={0.3}
              />
              {selectedTrend.type === 'anomaly' && (
                <ReferenceLine
                  y={selectedTrend.metrics.previous}
                  stroke="#EF4444"
                  strokeDasharray="5 5"
                  label="Expected"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <div className="text-sm text-gray-500">Current Value</div>
            <div className="text-lg font-semibold">{selectedTrend.metrics.current.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Change Rate</div>
            <div className={cn(
              "text-lg font-semibold",
              selectedTrend.metrics.change > 0 ? "text-green-600" : "text-red-600"
            )}>
              {selectedTrend.metrics.change > 0 ? '+' : ''}{(selectedTrend.metrics.change * 100).toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Velocity</div>
            <div className="text-lg font-semibold">
              {(selectedTrend.metrics.velocity * 100).toFixed(2)}%/day
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Acceleration</div>
            <div className="text-lg font-semibold">
              {(selectedTrend.metrics.acceleration * 100).toFixed(3)}%/day²
            </div>
          </div>
        </div>
        
        {/* Recommendations */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">Recommended Actions</h4>
          <ul className="space-y-2">
            {selectedTrend.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-primary mt-1">→</span>
                <div>
                  <span className="text-sm">{rec}</span>
                  <button
                    onClick={() => onTrendAction?.(selectedTrend, rec)}
                    className="ml-2 text-xs text-primary hover:underline"
                  >
                    Take Action
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  // Filter trends based on view
  const filteredTrends = identifiedTrends.filter(trend => 
    trendView === 'all' || 
    (trendView === 'anomalies' && trend.type === 'anomaly') ||
    trend.type === trendView
  );

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Trend Analysis</h2>
          <button
            onClick={analyzeTrends}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
          >
            <Activity className={cn("w-4 h-4", isAnalyzing && "animate-pulse")} />
            {isAnalyzing ? 'Analyzing...' : 'Refresh Analysis'}
          </button>
        </div>
        
        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {['all', 'emerging', 'declining', 'seasonal', 'anomalies'].map((view) => (
              <button
                key={view}
                onClick={() => setTrendView(view as any)}
                className={cn(
                  "px-4 py-2 rounded-lg capitalize",
                  trendView === view
                    ? "bg-primary text-white"
                    : "bg-gray-200 dark:bg-gray-700"
                )}
              >
                {view}
                {view !== 'all' && (
                  <span className="ml-2 text-xs">
                    ({identifiedTrends.filter(t => 
                      view === 'anomalies' ? t.type === 'anomaly' : t.type === view
                    ).length})
                  </span>
                )}
              </button>
            ))}
          </div>
          
          <select
            value={timeWindow}
            onChange={(e) => setTimeWindow(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>
      
      {/* Pattern Summary */}
      {trendPatterns.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Detected Patterns</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {trendPatterns.slice(0, 8).map((pattern, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <div className="text-sm font-medium">{pattern.name}</div>
                  <div className="text-xs text-gray-500 capitalize">{pattern.pattern}</div>
                </div>
                <div className={cn(
                  "text-lg font-bold",
                  pattern.direction === 'positive' ? 'text-green-600' :
                  pattern.direction === 'negative' ? 'text-red-600' :
                  'text-gray-600'
                )}>
                  {pattern.direction === 'positive' ? '↑' : pattern.direction === 'negative' ? '↓' : '→'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Trends Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Identified Trends</h3>
          {filteredTrends.length > 0 ? (
            filteredTrends.map(trend => renderTrendCard(trend))
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                {isAnalyzing ? 'Analyzing trends...' : 'No trends found for the selected criteria.'}
              </p>
            </div>
          )}
        </div>
        
        <div>
          {selectedTrend ? (
            renderTrendDetails()
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
              <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                Select a trend to view detailed analysis
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Seasonal Patterns */}
      {seasonalPatterns.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Seasonal Patterns</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {seasonalPatterns.map((pattern, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium capitalize">{pattern.period} Pattern</span>
                  <span className="text-sm text-gray-500">{pattern.amplitude}% variation</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-500">Peak Times:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {pattern.peakTimes.map(time => (
                        <span key={time} className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs">
                          {time}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Low Times:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {pattern.lowTimes.map(time => (
                        <span key={time} className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-xs">
                          {time}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};