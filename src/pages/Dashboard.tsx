import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '../components/layout/GlassCard';
import { cn } from '../utils/cn';
import { 
  TrendingUp, 
  FileText, 
  Users, 
  MessageSquare,
  Activity,
  Calendar,
  Clock,
  CheckCircle
} from 'lucide-react';
import taskService from '../services/taskService';
import type { Task } from '../services/taskService';


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

export const Dashboard = () => {
  console.log('Dashboard component rendering...');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  
  useEffect(() => {
    loadTasks();
  }, []);
  
  const loadTasks = async () => {
    setIsLoadingTasks(true);
    try {
      const upcomingTasks = await taskService.getUpcomingTasks(10);
      setTasks(upcomingTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setIsLoadingTasks(false);
    }
  };
  
  const formatDueDate = (dateString?: string) => {
    if (!dateString) return 'No due date';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffHours < 0) return 'Overdue';
    if (diffHours < 24) return `Due in ${diffHours} hours`;
    if (diffDays === 1) return 'Due tomorrow';
    if (diffDays < 7) return `Due in ${diffDays} days`;
    
    return date.toLocaleDateString();
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
  
  // Update stats to show real task count
  const activeTaskCount = tasks.filter(t => t.status !== 'completed').length;
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-white/70">Welcome back! Here's your travel agency overview.</p>
      </div>

      {/* Stats Grid */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={container}
        initial="hidden"
        animate="show"
      >
        {[
          { label: 'Active Tasks', value: activeTaskCount.toString(), icon: Activity, trend: '+12%' },
          { label: 'Documents', value: '156', icon: FileText, trend: '+5%' },
          { label: 'Chat Sessions', value: '89', icon: MessageSquare, trend: '+23%' },
          { label: 'Active Clients', value: '45', icon: Users, trend: '+8%' },
        ].map((stat) => (
          <motion.div key={stat.label} variants={item}>
            <GlassCard glow className="hover:scale-105 transition-transform cursor-pointer">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-white/60 text-sm">{stat.label}</p>
                  <p className="text-3xl font-bold mt-2">{stat.value}</p>
                  <p className="text-primary text-sm mt-1 flex items-center gap-1">
                    <TrendingUp size={16} />
                    {stat.trend}
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center">
                  <stat.icon className="text-primary" size={24} />
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>

      {/* Recent Activity & Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <GlassCard>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Activity className="text-primary" size={20} />
              Recent Activity
            </h2>
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="glass rounded-lg p-3 hover:bg-white/10 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">New booking request</p>
                      <p className="text-sm text-white/60">Client: John Doe - Tokyo Trip</p>
                    </div>
                    <span className="text-xs text-white/50">2 min ago</span>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <GlassCard>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Calendar className="text-primary" size={20} />
              Upcoming Tasks
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
                  <p>No upcoming tasks</p>
                  <p className="text-sm mt-1">Create tasks from emails or add them manually</p>
                </div>
              ) : (
                tasks.slice(0, 4).map((task) => (
                  <div key={task.id} className="glass rounded-lg p-3 hover:bg-white/10 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{task.title}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <p className="text-sm text-white/60 flex items-center gap-1">
                            <Clock size={12} />
                            {formatDueDate(task.dueDate)}
                          </p>
                          {task.source === 'email' && (
                            <span className="text-xs text-blue-400">📧 From email</span>
                          )}
                        </div>
                      </div>
                      <span className={cn(
                        'px-2 py-1 rounded-full text-xs',
                        getPriorityColor(task.priority)
                      )}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
};