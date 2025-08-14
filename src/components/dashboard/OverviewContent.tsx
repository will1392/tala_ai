import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity,
  CheckCircle,
  CheckSquare,
  TrendingUp,
  Users,
  FileText,
  Mail,
  MessageSquare,
  Clock,
  Calendar,
  Target,
  DollarSign,
  BarChart3
} from 'lucide-react';
import { GlassCard } from '../layout/GlassCard';
import { Button } from '../shared/Button';
import { Progress } from '../shared/Progress';
import { cn } from '../../utils/cn';
import type { Task } from '../../services/taskService';
import taskService from '../../services/taskService';

// Animation variants
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
};

export const OverviewContent = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [stats, setStats] = useState({
    activeTasks: 0,
    completedThisMonth: 0,
    emailsProcessed: 0,
    campaignsActive: 0,
    conversionRate: 0,
    revenue: 0,
    previousMonth: {
      activeTasks: 0,
      completedTasks: 0,
      revenue: 0
    }
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoadingTasks(true);
    try {
      // Load tasks
      const upcomingTasks = await taskService.getUpcomingTasks(5);
      setTasks(upcomingTasks);

      // Load completed tasks for stats
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const completed = await taskService.getTasks({
        status: 'completed',
        limit: 50
      });

      const thisMonthCompleted = completed.filter(task => {
        if (!task.updatedAt) return false;
        const completedDate = new Date(task.updatedAt);
        return completedDate >= firstDay;
      });

      setStats(prev => ({
        ...prev,
        activeTasks: upcomingTasks.length,
        completedThisMonth: thisMonthCompleted.length,
        emailsProcessed: Math.floor(Math.random() * 150) + 50,
        campaignsActive: Math.floor(Math.random() * 5) + 2,
        conversionRate: Math.random() * 5 + 2,
        revenue: Math.floor(Math.random() * 50000) + 10000
      }));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? '+100%' : '0%';
    const change = ((current - previous) / previous) * 100;
    const sign = change >= 0 ? '+' : '';
    return `${sign}${Math.round(change)}%`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {[
          { 
            label: 'Active Tasks', 
            value: stats.activeTasks.toString(), 
            icon: Activity, 
            trend: calculatePercentageChange(stats.activeTasks, stats.previousMonth.activeTasks),
            color: 'text-cyan-400',
            bgColor: 'bg-cyan-500/20'
          },
          { 
            label: 'Completed This Month', 
            value: stats.completedThisMonth.toString(), 
            icon: CheckCircle, 
            trend: calculatePercentageChange(stats.completedThisMonth, stats.previousMonth.completedTasks),
            color: 'text-green-400',
            bgColor: 'bg-green-500/20'
          },
          { 
            label: 'Active Campaigns', 
            value: stats.campaignsActive.toString(), 
            icon: Target, 
            trend: '+15%',
            color: 'text-purple-400',
            bgColor: 'bg-purple-500/20'
          },
          { 
            label: 'Revenue', 
            value: formatCurrency(stats.revenue), 
            icon: DollarSign, 
            trend: calculatePercentageChange(stats.revenue, stats.previousMonth.revenue),
            color: 'text-amber-400',
            bgColor: 'bg-amber-500/20'
          },
        ].map((stat) => (
          <motion.div key={stat.label} variants={item}>
            <GlassCard glow className="hover:scale-105 transition-transform cursor-pointer">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white/60 text-sm">{stat.label}</p>
                  <p className="text-3xl font-bold mt-2">{stat.value}</p>
                  <p className={cn('text-sm mt-1 flex items-center gap-1', stat.color)}>
                    <TrendingUp size={16} />
                    {stat.trend}
                  </p>
                </div>
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', stat.bgColor)}>
                  <stat.icon className={stat.color} size={24} />
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tasks */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2"
        >
          <GlassCard>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <CheckSquare className="text-primary" size={20} />
              Recent Tasks
            </h2>
            <div className="space-y-3">
              {isLoadingTasks ? (
                <div className="text-center py-8">
                  <div className="animate-pulse">
                    <div className="h-4 bg-white/10 rounded w-3/4 mx-auto mb-2"></div>
                    <div className="h-4 bg-white/10 rounded w-1/2 mx-auto"></div>
                  </div>
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-8 text-white/50">
                  <CheckCircle size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No active tasks</p>
                  <p className="text-sm mt-1">Create tasks from emails or add them manually</p>
                </div>
              ) : (
                tasks.map((task) => (
                  <div 
                    key={task.id} 
                    className="glass rounded-lg p-3 hover:bg-white/10 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium">{task.title}</p>
                        {task.description && (
                          <p className="text-sm text-white/50 mt-1 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <p className="text-sm text-white/60 flex items-center gap-1">
                            <Clock size={12} />
                            Due {formatDueDate(task.dueDate)}
                          </p>
                          {task.source === 'email' && (
                            <span className="text-xs text-blue-400 flex items-center gap-1">
                              <Mail size={12} />
                              Email
                            </span>
                          )}
                          {task.source === 'chat' && (
                            <span className="text-xs text-purple-400 flex items-center gap-1">
                              <MessageSquare size={12} />
                              Chat
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'px-2 py-1 rounded-full text-xs',
                          getPriorityColor(task.priority)
                        )}>
                          {task.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {tasks.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <Button variant="ghost" size="sm" className="w-full">
                  View All Tasks
                </Button>
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-6"
        >
          {/* Campaign Performance */}
          <GlassCard>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="text-primary" size={18} />
              Campaign Performance
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white/60">Email Open Rate</span>
                  <span className="text-sm font-medium">68%</span>
                </div>
                <Progress value={68} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white/60">Click Rate</span>
                  <span className="text-sm font-medium">24%</span>
                </div>
                <Progress value={24} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white/60">Conversion Rate</span>
                  <span className="text-sm font-medium">{stats.conversionRate.toFixed(1)}%</span>
                </div>
                <Progress value={stats.conversionRate} className="h-2" />
              </div>
            </div>
          </GlassCard>

          {/* Recent Activity */}
          <GlassCard>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Activity className="text-primary" size={18} />
              Recent Activity
            </h3>
            <div className="space-y-3">
              {[
                { icon: Mail, text: 'Email campaign sent', time: '2 min ago', color: 'text-blue-400' },
                { icon: FileText, text: 'New document uploaded', time: '15 min ago', color: 'text-green-400' },
                { icon: MessageSquare, text: 'Chat session completed', time: '1 hour ago', color: 'text-purple-400' },
                { icon: Target, text: 'Campaign goal reached', time: '2 hours ago', color: 'text-amber-400' }
              ].map((activity, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={cn('w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0', activity.color)}>
                    <activity.icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{activity.text}</p>
                    <p className="text-xs text-white/50">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Upcoming Events */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <GlassCard>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Calendar className="text-primary" size={20} />
            Upcoming Marketing Events
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { 
                title: 'Summer Campaign Launch',
                date: 'June 15, 2025',
                type: 'Campaign',
                color: 'bg-blue-500/20 text-blue-400'
              },
              { 
                title: 'Email Newsletter',
                date: 'June 20, 2025',
                type: 'Email',
                color: 'bg-green-500/20 text-green-400'
              },
              { 
                title: 'Social Media Review',
                date: 'June 25, 2025',
                type: 'Meeting',
                color: 'bg-purple-500/20 text-purple-400'
              }
            ].map((event, i) => (
              <div key={i} className="glass rounded-xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium">{event.title}</h4>
                  <span className={cn('px-2 py-1 rounded-full text-xs', event.color)}>
                    {event.type}
                  </span>
                </div>
                <p className="text-sm text-white/60 flex items-center gap-1">
                  <Calendar size={14} />
                  {event.date}
                </p>
              </div>
            ))}
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
};

// Helper functions
const formatDueDate = (dateString?: string) => {
  if (!dateString) return 'No due date';
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffHours < 0) {
    return 'Overdue';
  } else if (diffHours < 24) {
    return `in ${diffHours}h`;
  } else if (diffDays < 7) {
    return `in ${diffDays} days`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'bg-red-500/20 text-red-400';
    case 'high': return 'bg-orange-500/20 text-orange-400';
    case 'medium': return 'bg-yellow-500/20 text-yellow-400';
    case 'low': return 'bg-green-500/20 text-green-400';
    default: return 'bg-primary/20 text-primary';
  }
};