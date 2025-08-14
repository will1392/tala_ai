import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, Users, Mail, Hash, Send, Target, 
  BarChart3, Activity, Clock, CheckCircle, 
  AlertCircle, Calendar, Zap, Award, ArrowRight, Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../utils/cn';
import { CMOLoadingState, CMOSkeleton } from '../components/cmo/CMOLoadingStates';
import { MetricIndicator, ActivityStatus, ContextHint } from '../components/cmo/VisualContextCues';
import { CMOProgressIndicator, useNotifications } from '../components/cmo/NotificationSystem';
import { toolAnalyticsService } from '../services/ToolAnalyticsService';
import { useAchievements } from '../components/cmo/AchievementDisplay';

interface DashboardMetrics {
  campaigns: { active: number; completed: number; performance: number };
  engagement: { rate: number; growth: number; reach: number };
  conversions: { rate: number; total: number; value: number };
  tools: { mostUsed: string[]; efficiency: number; suggestions: number };
}

interface RecentActivity {
  id: string;
  type: 'campaign' | 'analysis' | 'content' | 'optimization';
  title: string;
  timestamp: Date;
  status: 'completed' | 'in_progress' | 'pending';
  impact?: 'high' | 'medium' | 'low';
}

interface PendingTask {
  id: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  dueDate?: Date;
  category: string;
  progress: number;
}

const CMODashboardEnhanced: React.FC = () => {
  const navigate = useNavigate();
  const { addNotification } = useNotifications();
  const userId = 'user-123'; // This should come from your auth system
  const { trackAction } = useAchievements(userId);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [tasks, setTasks] = useState<PendingTask[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'quarter'>('month');

  useEffect(() => {
    loadDashboardData();
  }, [selectedTimeframe]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Simulate loading dashboard data
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock data - would come from API
      setMetrics({
        campaigns: { active: 12, completed: 45, performance: 87 },
        engagement: { rate: 4.2, growth: 12.5, reach: 125000 },
        conversions: { rate: 3.8, total: 1250, value: 125000 },
        tools: { mostUsed: ['Campaign Builder', 'SEO Analyzer', 'Email Tester'], efficiency: 92, suggestions: 5 }
      });

      setActivities([
        {
          id: '1',
          type: 'campaign',
          title: 'Summer Sale Email Campaign',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          status: 'completed',
          impact: 'high'
        },
        {
          id: '2',
          type: 'analysis',
          title: 'Q2 Performance Analysis',
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
          status: 'in_progress'
        },
        {
          id: '3',
          type: 'content',
          title: 'Blog Post SEO Optimization',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
          status: 'completed',
          impact: 'medium'
        }
      ]);

      setTasks([
        {
          id: '1',
          title: 'Review Email Campaign Performance',
          priority: 'high',
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          category: 'email',
          progress: 75
        },
        {
          id: '2',
          title: 'Update Social Media Calendar',
          priority: 'medium',
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          category: 'social',
          progress: 30
        },
        {
          id: '3',
          title: 'Optimize Landing Page SEO',
          priority: 'high',
          category: 'seo',
          progress: 50
        }
      ]);

      // Show welcome notification
      addNotification({
        type: 'info',
        title: 'Dashboard Updated',
        message: 'Your marketing metrics have been refreshed'
      });
      
      // Track dashboard visit achievement
      trackAction({
        type: 'dashboard_visit',
        data: { timestamp: new Date() }
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Failed to load dashboard',
        message: 'Please try refreshing the page'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <CMOLoadingState type="analysis" message="Loading your marketing dashboard..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Marketing Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Track your marketing performance and activities
              </p>
            </div>

            {/* Timeframe selector */}
            <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              {(['week', 'month', 'quarter'] as const).map((timeframe) => (
                <button
                  key={timeframe}
                  onClick={() => {
                    setSelectedTimeframe(timeframe);
                    addNotification({
                      type: 'info',
                      title: 'Timeframe Updated',
                      message: `Dashboard now showing ${timeframe}ly data`,
                      duration: 3000
                    });
                  }}
                  className={cn(
                    "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                    selectedTimeframe === timeframe
                      ? "bg-white dark:bg-gray-600 text-primary shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                  )}
                >
                  {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricIndicator
            label="Active Campaigns"
            value={metrics?.campaigns.active || 0}
            change={15}
            icon={Target}
          />
          <MetricIndicator
            label="Engagement Rate"
            value={`${metrics?.engagement.rate || 0}%`}
            change={metrics?.engagement.growth}
            icon={Activity}
          />
          <MetricIndicator
            label="Conversions"
            value={metrics?.conversions.total || 0}
            change={8.5}
            icon={TrendingUp}
          />
          <MetricIndicator
            label="Total Reach"
            value={`${(metrics?.engagement.reach || 0).toLocaleString()}`}
            change={12}
            icon={Users}
          />
        </div>

        {/* Performance Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Campaign Performance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Campaign Performance</h2>
              <button className="text-sm text-primary hover:underline">
                View Details
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Overall Performance Score
                  </span>
                  <span className="text-sm font-medium">
                    {metrics?.campaigns.performance}%
                  </span>
                </div>
                <CMOProgressIndicator
                  value={metrics?.campaigns.performance || 0}
                  max={100}
                  animated
                />
              </div>

              <div className="grid grid-cols-3 gap-4 mt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {metrics?.campaigns.completed}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Completed
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {metrics?.campaigns.active}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Active
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    {metrics?.tools.efficiency}%
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Efficiency
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Tool Usage */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            <h2 className="text-lg font-semibold mb-4">Most Used Tools</h2>
            
            <div className="space-y-3">
              {metrics?.tools.mostUsed.map((tool, index) => (
                <div key={tool} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      index === 0 ? "bg-primary/10 text-primary" :
                      index === 1 ? "bg-blue-100 text-blue-600" :
                      "bg-gray-100 text-gray-600"
                    )}>
                      <Zap className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium">{tool}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {95 - index * 10}%
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <span className="font-medium">{metrics?.tools.suggestions}</span> tool 
                suggestions available
              </p>
              <button className="text-sm text-blue-600 hover:underline mt-1">
                View Recommendations →
              </button>
            </div>
          </motion.div>
        </div>

        {/* Recent Activities & Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activities */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Recent Activities</h2>
              <ActivityStatus
                activities={[
                  { type: 'campaign', status: 'active', count: 3 },
                  { type: 'analysis', status: 'pending', count: 2 },
                  { type: 'content', status: 'complete', count: 5 }
                ]}
              />
            </div>

            <div className="space-y-3">
              {activities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>

            <button className="w-full mt-4 py-2 text-sm text-primary hover:bg-primary/5 rounded-lg transition-colors">
              View All Activities
            </button>
          </motion.div>

          {/* Pending Tasks */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Pending Tasks</h2>
              <span className="text-sm text-gray-500">
                {tasks.length} tasks
              </span>
            </div>

            <div className="space-y-3">
              {tasks.map((task) => (
                <TaskItem key={task.id} task={task} />
              ))}
            </div>

            <button 
              onClick={() => navigate('/tasks')}
              className="w-full mt-4 py-2 text-sm text-primary hover:bg-primary/5 rounded-lg transition-colors"
            >
              Manage All Tasks
            </button>
          </motion.div>
        </div>

        {/* Insights & Tips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8"
        >
          <ContextHint
            type="tip"
            message="Your email campaigns are performing 15% better than last month. Consider increasing your email frequency to capitalize on this engagement."
          />
        </motion.div>
      </div>
    </div>
  );
};

// Activity item component
const ActivityItem: React.FC<{ activity: RecentActivity }> = ({ activity }) => {
  const typeIcons = {
    campaign: Target,
    analysis: BarChart3,
    content: Mail,
    optimization: Zap
  };

  const statusColors = {
    completed: 'text-green-600',
    in_progress: 'text-blue-600',
    pending: 'text-orange-600'
  };

  const Icon = typeIcons[activity.type];
  const timeAgo = getTimeAgo(activity.timestamp);

  return (
    <div className="flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
      <div className={cn(
        "w-10 h-10 rounded-lg flex items-center justify-center",
        activity.type === 'campaign' ? "bg-purple-100 text-purple-600" :
        activity.type === 'analysis' ? "bg-blue-100 text-blue-600" :
        activity.type === 'content' ? "bg-green-100 text-green-600" :
        "bg-orange-100 text-orange-600"
      )}>
        <Icon className="w-5 h-5" />
      </div>

      <div className="flex-1">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium text-sm">{activity.title}</p>
            <p className="text-xs text-gray-500 mt-0.5">{timeAgo}</p>
          </div>
          {activity.impact && (
            <span className={cn(
              "text-xs px-2 py-1 rounded-full",
              activity.impact === 'high' ? "bg-red-100 text-red-700" :
              activity.impact === 'medium' ? "bg-orange-100 text-orange-700" :
              "bg-gray-100 text-gray-700"
            )}>
              {activity.impact} impact
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-2">
          <span className={cn(
            "text-xs font-medium",
            statusColors[activity.status]
          )}>
            {activity.status.replace('_', ' ')}
          </span>
        </div>
      </div>
    </div>
  );
};

// Task item component
const TaskItem: React.FC<{ task: PendingTask }> = ({ task }) => {
  const priorityColors = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-orange-100 text-orange-700',
    low: 'bg-gray-100 text-gray-700'
  };

  const categoryIcons = {
    email: Mail,
    social: Hash,
    seo: TrendingUp,
    directMail: Send
  };

  const Icon = categoryIcons[task.category as keyof typeof categoryIcons] || Target;

  return (
    <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-start gap-2">
          <Icon className="w-4 h-4 text-gray-400 mt-0.5" />
          <div>
            <p className="font-medium text-sm">{task.title}</p>
            {task.dueDate && (
              <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Due {new Date(task.dueDate).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
        <span className={cn(
          "text-xs px-2 py-1 rounded-full font-medium",
          priorityColors[task.priority]
        )}>
          {task.priority}
        </span>
      </div>

      <CMOProgressIndicator
        value={task.progress}
        max={100}
        size="sm"
        animated={false}
      />
    </div>
  );
};

// Helper function
const getTimeAgo = (date: Date): string => {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  
  return date.toLocaleDateString();
};

export default CMODashboardEnhanced;