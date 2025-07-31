import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Activity, Calendar, DollarSign, Users, Eye, MousePointer } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../../utils/cn';

interface DataVisualizerProps {
  data: any;
  dataType: 'campaign' | 'social' | 'seo' | 'competitor' | 'custom';
  title?: string;
  description?: string;
}

interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter';
  dataKey: string;
  xAxisKey?: string;
  yAxisKey?: string;
  color?: string;
  name?: string;
}

const CHART_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316'  // Orange
];

export const DataVisualizer: React.FC<DataVisualizerProps> = ({
  data,
  dataType,
  title,
  description
}) => {
  const [selectedChart, setSelectedChart] = useState<'overview' | 'detailed' | 'comparison' | 'trends'>('overview');
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [metrics, setMetrics] = useState<any>({});
  const [processedData, setProcessedData] = useState<any[]>([]);

  useEffect(() => {
    if (data) {
      processData();
      calculateMetrics();
    }
  }, [data, timeRange]);

  // Process raw data based on type
  const processData = () => {
    switch (dataType) {
      case 'campaign':
        setProcessedData(processCampaignData(data));
        break;
      case 'social':
        setProcessedData(processSocialData(data));
        break;
      case 'seo':
        setProcessedData(processSEOData(data));
        break;
      case 'competitor':
        setProcessedData(processCompetitorData(data));
        break;
      default:
        setProcessedData(Array.isArray(data) ? data : []);
    }
  };

  // Process campaign performance data
  const processCampaignData = (rawData: any) => {
    if (!Array.isArray(rawData)) return [];
    
    return rawData.map(item => ({
      date: item.date || item.Date,
      impressions: parseInt(item.impressions || item.Impressions || 0),
      clicks: parseInt(item.clicks || item.Clicks || 0),
      conversions: parseInt(item.conversions || item.Conversions || 0),
      cost: parseFloat(item.cost || item.Cost || 0),
      ctr: parseFloat(item.ctr || item.CTR || ((item.clicks / item.impressions) * 100).toFixed(2)),
      conversionRate: parseFloat(item.conversionRate || ((item.conversions / item.clicks) * 100).toFixed(2)),
      cpc: parseFloat(item.cpc || item.CPC || (item.cost / item.clicks).toFixed(2)),
      roas: parseFloat(item.roas || item.ROAS || ((item.revenue || 0) / item.cost).toFixed(2))
    }));
  };

  // Process social media data
  const processSocialData = (rawData: any) => {
    if (!Array.isArray(rawData)) return [];
    
    return rawData.map(item => ({
      date: item.date || item.Date,
      platform: item.platform || item.Platform || 'Unknown',
      followers: parseInt(item.followers || item.Followers || 0),
      engagement: parseInt(item.engagement || item.Engagement || 0),
      reach: parseInt(item.reach || item.Reach || 0),
      impressions: parseInt(item.impressions || item.Impressions || 0),
      engagementRate: parseFloat(item.engagementRate || ((item.engagement / item.reach) * 100).toFixed(2)),
      posts: parseInt(item.posts || item.Posts || 0),
      shares: parseInt(item.shares || item.Shares || 0),
      comments: parseInt(item.comments || item.Comments || 0),
      likes: parseInt(item.likes || item.Likes || 0)
    }));
  };

  // Process SEO data
  const processSEOData = (rawData: any) => {
    if (!Array.isArray(rawData)) return [];
    
    return rawData.map(item => ({
      date: item.date || item.Date,
      keyword: item.keyword || item.Keyword,
      position: parseInt(item.position || item.Position || 0),
      volume: parseInt(item.volume || item.Volume || 0),
      difficulty: parseInt(item.difficulty || item.Difficulty || 0),
      clicks: parseInt(item.clicks || item.Clicks || 0),
      impressions: parseInt(item.impressions || item.Impressions || 0),
      ctr: parseFloat(item.ctr || item.CTR || ((item.clicks / item.impressions) * 100).toFixed(2)),
      url: item.url || item.URL || ''
    }));
  };

  // Process competitor data
  const processCompetitorData = (rawData: any) => {
    if (!Array.isArray(rawData)) return [];
    
    return rawData.map(item => ({
      competitor: item.competitor || item.Competitor || 'Unknown',
      metric: item.metric || item.Metric,
      ourValue: parseFloat(item.ourValue || item.OurValue || 0),
      theirValue: parseFloat(item.theirValue || item.TheirValue || 0),
      difference: parseFloat(item.difference || (item.ourValue - item.theirValue) || 0),
      percentDiff: parseFloat(item.percentDiff || (((item.ourValue - item.theirValue) / item.theirValue) * 100).toFixed(2)),
      date: item.date || item.Date || new Date().toISOString().split('T')[0]
    }));
  };

  // Calculate key metrics
  const calculateMetrics = () => {
    if (!processedData.length) return;
    
    const newMetrics: any = {};
    
    switch (dataType) {
      case 'campaign':
        newMetrics.totalImpressions = processedData.reduce((sum, item) => sum + item.impressions, 0);
        newMetrics.totalClicks = processedData.reduce((sum, item) => sum + item.clicks, 0);
        newMetrics.totalConversions = processedData.reduce((sum, item) => sum + item.conversions, 0);
        newMetrics.totalCost = processedData.reduce((sum, item) => sum + item.cost, 0);
        newMetrics.avgCTR = (newMetrics.totalClicks / newMetrics.totalImpressions * 100).toFixed(2);
        newMetrics.avgCPC = (newMetrics.totalCost / newMetrics.totalClicks).toFixed(2);
        newMetrics.avgConversionRate = (newMetrics.totalConversions / newMetrics.totalClicks * 100).toFixed(2);
        break;
        
      case 'social':
        newMetrics.totalFollowers = processedData[processedData.length - 1]?.followers || 0;
        newMetrics.totalEngagement = processedData.reduce((sum, item) => sum + item.engagement, 0);
        newMetrics.totalReach = processedData.reduce((sum, item) => sum + item.reach, 0);
        newMetrics.avgEngagementRate = (newMetrics.totalEngagement / newMetrics.totalReach * 100).toFixed(2);
        newMetrics.followerGrowth = processedData.length > 1 ? 
          ((processedData[processedData.length - 1].followers - processedData[0].followers) / processedData[0].followers * 100).toFixed(2) : 0;
        break;
        
      case 'seo':
        newMetrics.avgPosition = (processedData.reduce((sum, item) => sum + item.position, 0) / processedData.length).toFixed(1);
        newMetrics.totalClicks = processedData.reduce((sum, item) => sum + item.clicks, 0);
        newMetrics.totalImpressions = processedData.reduce((sum, item) => sum + item.impressions, 0);
        newMetrics.avgCTR = (newMetrics.totalClicks / newMetrics.totalImpressions * 100).toFixed(2);
        newMetrics.topKeywords = processedData.sort((a, b) => b.clicks - a.clicks).slice(0, 5);
        break;
    }
    
    setMetrics(newMetrics);
  };

  // Render metric cards
  const renderMetricCards = () => {
    const metricConfigs = {
      campaign: [
        { label: 'Total Impressions', value: metrics.totalImpressions?.toLocaleString(), icon: Eye, trend: '+12%', positive: true },
        { label: 'Total Clicks', value: metrics.totalClicks?.toLocaleString(), icon: MousePointer, trend: '+8%', positive: true },
        { label: 'Conversions', value: metrics.totalConversions?.toLocaleString(), icon: TrendingUp, trend: '+15%', positive: true },
        { label: 'Total Cost', value: `$${metrics.totalCost?.toLocaleString()}`, icon: DollarSign, trend: '-5%', positive: true },
        { label: 'Avg CTR', value: `${metrics.avgCTR}%`, icon: Activity, trend: '+2%', positive: true },
        { label: 'Avg CPC', value: `$${metrics.avgCPC}`, icon: DollarSign, trend: '-10%', positive: true }
      ],
      social: [
        { label: 'Total Followers', value: metrics.totalFollowers?.toLocaleString(), icon: Users, trend: `+${metrics.followerGrowth}%`, positive: true },
        { label: 'Total Engagement', value: metrics.totalEngagement?.toLocaleString(), icon: Activity, trend: '+20%', positive: true },
        { label: 'Total Reach', value: metrics.totalReach?.toLocaleString(), icon: Eye, trend: '+15%', positive: true },
        { label: 'Avg Engagement Rate', value: `${metrics.avgEngagementRate}%`, icon: TrendingUp, trend: '+3%', positive: true }
      ],
      seo: [
        { label: 'Avg Position', value: metrics.avgPosition, icon: TrendingUp, trend: '-2.3', positive: true },
        { label: 'Total Clicks', value: metrics.totalClicks?.toLocaleString(), icon: MousePointer, trend: '+25%', positive: true },
        { label: 'Total Impressions', value: metrics.totalImpressions?.toLocaleString(), icon: Eye, trend: '+30%', positive: true },
        { label: 'Avg CTR', value: `${metrics.avgCTR}%`, icon: Activity, trend: '+5%', positive: true }
      ]
    };

    const configs = metricConfigs[dataType] || [];

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {configs.map((metric, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <metric.icon className="w-5 h-5 text-gray-500" />
              <span className={cn(
                "text-xs flex items-center gap-1",
                metric.positive ? "text-green-600" : "text-red-600"
              )}>
                {metric.positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {metric.trend}
              </span>
            </div>
            <div className="text-2xl font-bold">{metric.value}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">{metric.label}</div>
          </motion.div>
        ))}
      </div>
    );
  };

  // Render overview charts
  const renderOverviewCharts = () => {
    switch (dataType) {
      case 'campaign':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Performance Over Time</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={processedData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="clicks" stroke={CHART_COLORS[0]} name="Clicks" />
                  <Line type="monotone" dataKey="conversions" stroke={CHART_COLORS[1]} name="Conversions" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Cost Analysis</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={processedData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="cost" stroke={CHART_COLORS[2]} fill={CHART_COLORS[2]} fillOpacity={0.6} name="Cost" />
                  <Area type="monotone" dataKey="roas" stroke={CHART_COLORS[3]} fill={CHART_COLORS[3]} fillOpacity={0.6} name="ROAS" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
        
      case 'social':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Engagement Trends</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={processedData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="engagement" stroke={CHART_COLORS[0]} name="Engagement" />
                  <Line type="monotone" dataKey="reach" stroke={CHART_COLORS[1]} name="Reach" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Platform Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={aggregateByPlatform()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {aggregateByPlatform().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
        
      case 'seo':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Keyword Rankings</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={processedData.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="keyword" angle={-45} textAnchor="end" height={100} />
                  <YAxis reversed />
                  <Tooltip />
                  <Bar dataKey="position" fill={CHART_COLORS[0]} name="Position" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Click Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="impressions" name="Impressions" />
                  <YAxis dataKey="clicks" name="Clicks" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter name="Keywords" data={processedData} fill={CHART_COLORS[1]} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  // Aggregate data by platform for pie chart
  const aggregateByPlatform = () => {
    const platformData: { [key: string]: number } = {};
    
    processedData.forEach(item => {
      const platform = item.platform || 'Unknown';
      platformData[platform] = (platformData[platform] || 0) + item.engagement;
    });
    
    return Object.entries(platformData).map(([name, value]) => ({ name, value }));
  };

  // Custom label for pie chart
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Render detailed analysis
  const renderDetailedAnalysis = () => {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Detailed Analysis</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-gray-700">
                {Object.keys(processedData[0] || {}).slice(0, 6).map((key) => (
                  <th key={key} className="text-left py-2 px-4 text-sm font-medium">
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {processedData.slice(0, 10).map((row, index) => (
                <tr key={index} className="border-b dark:border-gray-700">
                  {Object.values(row).slice(0, 6).map((value: any, idx) => (
                    <td key={idx} className="py-2 px-4 text-sm">
                      {typeof value === 'number' ? value.toLocaleString() : value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Render comparison view
  const renderComparisonView = () => {
    if (dataType !== 'competitor') {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <p className="text-gray-500">Comparison view is available for competitor data only.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Performance Comparison</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={processedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="metric" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="ourValue" fill={CHART_COLORS[0]} name="Our Performance" />
              <Bar dataKey="theirValue" fill={CHART_COLORS[1]} name="Competitor" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Competitive Gaps</h3>
          <div className="space-y-4">
            {processedData.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm font-medium">{item.metric}</span>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-sm font-bold",
                    item.percentDiff > 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {item.percentDiff > 0 ? '+' : ''}{item.percentDiff}%
                  </span>
                  {item.percentDiff > 0 ? 
                    <TrendingUp className="w-4 h-4 text-green-600" /> : 
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Render trends analysis
  const renderTrendsAnalysis = () => {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Trend Analysis</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={processedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            {Object.keys(processedData[0] || {})
              .filter(key => typeof processedData[0][key] === 'number' && key !== 'date')
              .slice(0, 4)
              .map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={CHART_COLORS[index]}
                  name={key.charAt(0).toUpperCase() + key.slice(1)}
                />
              ))
            }
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold mb-2">{title || 'Data Analysis'}</h2>
        {description && <p className="text-gray-600 dark:text-gray-400">{description}</p>}
        
        {/* Controls */}
        <div className="flex items-center justify-between mt-6">
          <div className="flex gap-2">
            {['overview', 'detailed', 'comparison', 'trends'].map((view) => (
              <button
                key={view}
                onClick={() => setSelectedChart(view as any)}
                className={cn(
                  "px-4 py-2 rounded-lg capitalize",
                  selectedChart === view
                    ? "bg-primary text-white"
                    : "bg-gray-200 dark:bg-gray-700"
                )}
              >
                {view}
              </button>
            ))}
          </div>
          
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>
      </div>
      
      {/* Metric Cards */}
      {renderMetricCards()}
      
      {/* Charts */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedChart}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          {selectedChart === 'overview' && renderOverviewCharts()}
          {selectedChart === 'detailed' && renderDetailedAnalysis()}
          {selectedChart === 'comparison' && renderComparisonView()}
          {selectedChart === 'trends' && renderTrendsAnalysis()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};