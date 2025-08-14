import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
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
import { ExpertiseOnboarding, type ExpertiseProfile } from '../components/cmo/onboarding/ExpertiseOnboarding';
import { UserProfileOnboarding, type UserProfile } from '../components/onboarding/UserProfileOnboarding';
import { OnboardingComplete } from '../components/onboarding/OnboardingComplete';


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
  const location = useLocation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isLoadingCompletedTasks, setIsLoadingCompletedTasks] = useState(true);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  
  // User profile onboarding state
  const [showUserProfileOnboarding, setShowUserProfileOnboarding] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [hasCheckedProfile, setHasCheckedProfile] = useState(false);
  
  // Expertise onboarding state
  const [showExpertiseOnboarding, setShowExpertiseOnboarding] = useState(false);
  const [expertiseProfile, setExpertiseProfile] = useState<ExpertiseProfile | null>(null);
  const [hasCheckedExpertise, setHasCheckedExpertise] = useState(false);
  
  // Completion screen state
  const [showCompletionScreen, setShowCompletionScreen] = useState(false);
  const [stats, setStats] = useState({
    activeTasks: 0,
    completedThisMonth: 0,
    totalDocuments: 0,
    activeSessions: 0,
    activeClients: 0,
    previousMonth: {
      activeTasks: 0,
      completedTasks: 0
    }
  });
  
  useEffect(() => {
    loadTasks();
    loadCompletedTasks();
    loadPreviousMonthStats();
    checkUserProfile();
    
    // Check if we should highlight a task from navigation
    if (location.state?.highlightTaskId) {
      setHighlightedTaskId(location.state.highlightTaskId);
      // Clear highlight after 3 seconds
      setTimeout(() => setHighlightedTaskId(null), 3000);
    }
  }, [location]);
  
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
  
  const loadCompletedTasks = async () => {
    setIsLoadingCompletedTasks(true);
    try {
      // Get first and last day of current month
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      // Get completed tasks for the current month
      const completed = await taskService.getTasks({
        status: 'completed',
        limit: 50
      });
      
      // Filter to only show tasks completed this month
      const thisMonthCompleted = completed.filter(task => {
        if (!task.updatedAt) return false;
        const completedDate = new Date(task.updatedAt);
        return completedDate >= firstDay && completedDate <= lastDay;
      });
      
      setCompletedTasks(thisMonthCompleted);
      
      // Update stats
      setStats(prev => ({
        ...prev,
        completedThisMonth: thisMonthCompleted.length
      }));
    } catch (error) {
      console.error('Error loading completed tasks:', error);
    } finally {
      setIsLoadingCompletedTasks(false);
    }
  };
  
  const loadPreviousMonthStats = async () => {
    try {
      // Get first and last day of previous month
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      
      // Get all tasks to calculate previous month stats
      const allTasks = await taskService.getTasks({ limit: 100 });
      
      // Count tasks that were active last month
      const activeLastMonth = allTasks.filter(task => {
        const createdDate = new Date(task.createdAt);
        return createdDate <= lastDay && task.status !== 'completed';
      }).length;
      
      // Count tasks completed last month
      const completedLastMonth = allTasks.filter(task => {
        if (!task.updatedAt || task.status !== 'completed') return false;
        const completedDate = new Date(task.updatedAt);
        return completedDate >= firstDay && completedDate <= lastDay;
      }).length;
      
      setStats(prev => ({
        ...prev,
        previousMonth: {
          activeTasks: activeLastMonth,
          completedTasks: completedLastMonth
        }
      }));
    } catch (error) {
      console.error('Error loading previous month stats:', error);
    }
  };
  
  const completeTask = async (taskId: string) => {
    setCompletingTaskId(taskId);
    try {
      const updatedTask = await taskService.updateTask(taskId, { status: 'completed' });
      if (updatedTask) {
        // Remove the completed task from the list with a small delay for animation
        setTimeout(() => {
          setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
          // Add to completed tasks if it's from this month
          const now = new Date();
          const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
          if (new Date(updatedTask.updatedAt) >= firstDay) {
            setCompletedTasks(prev => [updatedTask, ...prev]);
          }
          setCompletingTaskId(null);
        }, 300);
      } else {
        setCompletingTaskId(null);
      }
    } catch (error) {
      console.error('Error completing task:', error);
      setCompletingTaskId(null);
    }
  };

  // User profile onboarding functions
  const checkUserProfile = async () => {
    if (hasCheckedProfile) return;
    
    try {
      // In development, check localStorage first
      const isDev = process.env.NODE_ENV === 'development';
      
      if (isDev) {
        const hasCompletedUserProfile = localStorage.getItem('tala_user_profile_completed');
        if (!hasCompletedUserProfile) {
          console.log('🎯 Dev mode: Showing user profile onboarding for testing');
          setShowUserProfileOnboarding(true);
          setHasCheckedProfile(true);
          return;
        }
        
        // Load stored profile for development
        const storedProfile = localStorage.getItem('tala_user_profile');
        if (storedProfile) {
          setUserProfile(JSON.parse(storedProfile));
        }
        
        // After user profile is complete, check expertise
        checkExpertiseProfile();
        setHasCheckedProfile(true);
        return;
      }

      // Production logic would check the API
      const userId = 'test_user_123'; // This would come from auth context
      const response = await fetch(`/api/user-profile/check/${userId}`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.hasProfile && result.isComplete) {
          // Profile exists and is complete, load it
          const profileResponse = await fetch(`/api/user-profile/${userId}`);
          if (profileResponse.ok) {
            const profile = await profileResponse.json();
            setUserProfile(profile);
          }
          // Check expertise after user profile is confirmed
          checkExpertiseProfile();
        } else {
          // No complete profile, show user profile onboarding
          setShowUserProfileOnboarding(true);
        }
      } else {
        // API error, show onboarding to be safe
        setShowUserProfileOnboarding(true);
      }
    } catch (error) {
      console.error('Error checking user profile:', error);
      // On error, show onboarding to be safe
      setShowUserProfileOnboarding(true);
    } finally {
      setHasCheckedProfile(true);
    }
  };

  const handleUserProfileComplete = async (profile: UserProfile) => {
    console.log('🎯 User profile onboarding completed:', profile);
    
    try {
      // In development, just store in localStorage
      if (process.env.NODE_ENV === 'development') {
        localStorage.setItem('tala_user_profile_completed', 'true');
        localStorage.setItem('tala_user_profile', JSON.stringify(profile));
        setUserProfile(profile);
        setShowUserProfileOnboarding(false);
        
        // Now check for expertise onboarding
        setTimeout(() => {
          checkExpertiseProfile();
        }, 500);
        
        console.log('✅ User profile saved for development testing');
        return;
      }

      // Production logic would save to API
      const userId = 'test_user_123'; // This would come from auth context
      const response = await fetch('/api/user-profile/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify(profile)
      });

      if (response.ok) {
        const result = await response.json();
        setUserProfile(result.profile);
        setShowUserProfileOnboarding(false);
        
        // Now check for expertise onboarding
        setTimeout(() => {
          checkExpertiseProfile();
        }, 500);
        
        console.log('✅ User profile saved successfully');
      } else {
        console.error('Failed to save user profile');
      }
    } catch (error) {
      console.error('Error saving user profile:', error);
    }
  };

  const handleUserProfileSkip = () => {
    console.log('🎯 User profile onboarding skipped');
    
    // In development, mark as completed so it doesn't show again
    if (process.env.NODE_ENV === 'development') {
      localStorage.setItem('tala_user_profile_completed', 'true');
    }
    
    setShowUserProfileOnboarding(false);
    
    // Still check for expertise onboarding
    setTimeout(() => {
      checkExpertiseProfile();
    }, 500);
  };

  // Expertise onboarding functions
  const checkExpertiseProfile = async () => {
    if (hasCheckedExpertise) return;
    
    try {
      // In development, always show onboarding for testing
      const isDev = process.env.NODE_ENV === 'development';
      
      if (isDev) {
        // Check localStorage to see if we've already completed onboarding in this session
        const hasCompletedOnboarding = localStorage.getItem('tala_expertise_onboarding_completed');
        if (!hasCompletedOnboarding) {
          console.log('🎯 Dev mode: Showing expertise onboarding for testing');
          setShowExpertiseOnboarding(true);
        }
        setHasCheckedExpertise(true);
        return;
      }

      // Production logic would check the API
      const userId = 'test_user_123'; // This would come from auth context
      const response = await fetch(`/api/expertise/user/${userId}`);
      
      if (response.ok) {
        const profile = await response.json();
        if (profile) {
          setExpertiseProfile(profile);
        } else {
          setShowExpertiseOnboarding(true);
        }
      } else {
        // No profile found, show onboarding
        setShowExpertiseOnboarding(true);
      }
    } catch (error) {
      console.error('Error checking expertise profile:', error);
      // On error, show onboarding to be safe
      setShowExpertiseOnboarding(true);
    } finally {
      setHasCheckedExpertise(true);
    }
  };

  const handleExpertiseComplete = async (profile: ExpertiseProfile) => {
    console.log('🎯 Expertise onboarding completed:', profile);
    
    try {
      // In development, just store in localStorage and close modal
      if (process.env.NODE_ENV === 'development') {
        localStorage.setItem('tala_expertise_onboarding_completed', 'true');
        localStorage.setItem('tala_expertise_profile', JSON.stringify(profile));
        setExpertiseProfile(profile);
        setShowExpertiseOnboarding(false);
        
        // Show completion screen
        setShowCompletionScreen(true);
        console.log('✅ Expertise profile saved for development testing');
        return;
      }

      // Production logic would save to API
      const userId = 'test_user_123'; // This would come from auth context
      const response = await fetch('/api/expertise/profile/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({ assessment: profile })
      });

      if (response.ok) {
        setExpertiseProfile(profile);
        setShowExpertiseOnboarding(false);
        setShowCompletionScreen(true);
        console.log('✅ Expertise profile saved successfully');
      } else {
        console.error('Failed to save expertise profile');
      }
    } catch (error) {
      console.error('Error saving expertise profile:', error);
    }
  };

  const handleExpertiseSkip = () => {
    console.log('🎯 Expertise onboarding skipped');
    
    // In development, mark as completed so it doesn't show again
    if (process.env.NODE_ENV === 'development') {
      localStorage.setItem('tala_expertise_onboarding_completed', 'true');
    }
    
    setShowExpertiseOnboarding(false);
  };

  // Dev function to reset onboarding (for testing)
  const resetOnboarding = () => {
    // Reset user profile onboarding
    localStorage.removeItem('tala_user_profile_completed');
    localStorage.removeItem('tala_user_profile');
    setUserProfile(null);
    setHasCheckedProfile(false);
    setShowUserProfileOnboarding(true);
    
    // Reset expertise onboarding
    localStorage.removeItem('tala_expertise_onboarding_completed');
    localStorage.removeItem('tala_expertise_profile');
    setExpertiseProfile(null);
    setHasCheckedExpertise(false);
    setShowExpertiseOnboarding(false); // Will be triggered after user profile
  };
  
  const formatDueDate = (dateString?: string) => {
    if (!dateString) return 'No due date';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    // Format date and time
    const dateOptions: Intl.DateTimeFormatOptions = {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    
    // Add year if it's not the current year
    if (date.getFullYear() !== now.getFullYear()) {
      dateOptions.year = 'numeric';
    }
    
    const formattedDate = date.toLocaleString('en-US', dateOptions);
    
    // Add relative time indicator for near-future tasks
    if (diffHours < 0) {
      return `Overdue - ${formattedDate}`;
    } else if (diffHours < 24) {
      return `${formattedDate} (${diffHours}h)`;
    } else {
      return formattedDate;
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
  
  // Determine effective priority based on due date
  const getEffectivePriority = (task: Task): string => {
    if (!task.dueDate) return task.priority;
    
    const date = new Date(task.dueDate);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    // If due within 24 hours and not already urgent, show as urgent
    if (diffHours <= 24 && diffHours >= 0 && task.priority !== 'urgent') {
      return 'urgent';
    }
    
    return task.priority;
  };
  
  // Update stats to show real task count
  const activeTaskCount = tasks.filter(t => t.status !== 'completed').length;
  const completedThisMonth = completedTasks.length;
  
  // Calculate percentage changes
  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? '+100%' : '0%';
    const change = ((current - previous) / previous) * 100;
    const sign = change >= 0 ? '+' : '';
    return `${sign}${Math.round(change)}%`;
  };
  
  // Update stats when tasks change
  useEffect(() => {
    setStats(prev => ({
      ...prev,
      activeTasks: activeTaskCount
    }));
  }, [activeTaskCount]);
  
  // Format completed date
  const formatCompletedDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-[var(--muted)]">Welcome back! Here's your travel agency overview.</p>
      </div>

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
            value: activeTaskCount.toString(), 
            icon: Activity, 
            trend: calculatePercentageChange(activeTaskCount, stats.previousMonth.activeTasks)
          },
          { 
            label: 'Completed This Month', 
            value: completedThisMonth.toString(), 
            icon: CheckCircle, 
            trend: calculatePercentageChange(completedThisMonth, stats.previousMonth.completedTasks)
          },
          { 
            label: 'Documents', 
            value: '0', 
            icon: FileText, 
            trend: '0%' 
          },
          { 
            label: 'Chats Created', 
            value: '0', 
            icon: MessageSquare, 
            trend: '0%' 
          },
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
                <div className="w-12 h-12 bg-[#0ec6c6]/20 rounded-xl flex items-center justify-center">
                  <stat.icon className="text-[#0ec6c6]" size={24} />
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="text-[var(--primary)]" size={20} />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { id: 'activity-1', title: 'New booking request', client: 'John Doe - Tokyo Trip', time: '2 min ago' },
                  { id: 'activity-2', title: 'Document uploaded', client: 'Sarah Smith - Visa Application', time: '15 min ago' },
                  { id: 'activity-3', title: 'Chat session started', client: 'Mike Johnson - Europe Tour', time: '1 hour ago' },
                  { id: 'activity-4', title: 'Task completed', client: 'Emma Wilson - Flight Booking', time: '2 hours ago' }
                ].map((activity) => (
                  <div key={activity.id} className="border border-[var(--border)] rounded-lg p-3 hover:bg-[var(--muted)] transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{activity.title}</p>
                        <p className="text-sm text-[var(--muted)]">Client: {activity.client}</p>
                      </div>
                      <span className="text-xs text-[var(--muted)]">{activity.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="text-[var(--primary)]" size={20} />
                Upcoming Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
              {isLoadingTasks ? (
                <div className="text-center py-8">
                  <div className="animate-pulse">
                    <div className="h-4 bg-[var(--muted)] rounded w-3/4 mx-auto mb-2"></div>
                    <div className="h-4 bg-[var(--muted)] rounded w-1/2 mx-auto"></div>
                  </div>
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-8 text-[var(--muted)]">
                  <CheckCircle size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No upcoming tasks</p>
                  <p className="text-sm mt-1">Create tasks from emails or add them manually</p>
                </div>
              ) : (
                tasks.slice(0, 4).map((task) => (
                  <div 
                    key={task.id} 
                    className={cn(
                      "border border-[var(--border)] rounded-lg p-3 hover:bg-[var(--muted)] transition-all group",
                      highlightedTaskId === task.id && "ring-2 ring-red-500 bg-red-500/10 animate-pulse"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium">{task.title}</p>
                        {task.description && (
                          <p className="text-sm text-[var(--muted)] mt-1 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <p className="text-sm text-[var(--muted)] flex items-center gap-1">
                            <Clock size={12} />
                            {formatDueDate(task.dueDate)}
                          </p>
                          {task.source === 'email' && (
                            <span className="text-xs text-blue-400">📧 From email</span>
                          )}
                          {task.source === 'chat' && (
                            <span className="text-xs text-purple-400">💬 From chat</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'px-2 py-1 rounded-full text-xs',
                          getPriorityColor(getEffectivePriority(task))
                        )}>
                          {getEffectivePriority(task)}
                        </span>
                        <button
                          onClick={() => completeTask(task.id)}
                          className={cn(
                            "p-1.5 hover:bg-white/10 rounded-lg transition-all",
                            completingTaskId === task.id 
                              ? "opacity-100" 
                              : "opacity-0 group-hover:opacity-100"
                          )}
                          disabled={completingTaskId === task.id}
                          title="Mark as completed"
                        >
                          <CheckCircle 
                            size={18} 
                            className={cn(
                              "transition-colors",
                              completingTaskId === task.id 
                                ? "text-green-400 animate-pulse" 
                                : "text-green-400"
                            )}
                          />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Completed Tasks This Month */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="text-[var(--primary)]" size={20} />
                Completed This Month
              </CardTitle>
              <span className="text-sm text-[var(--muted)]">
                {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
            {isLoadingCompletedTasks ? (
              <div className="text-center py-8">
                <div className="animate-pulse">
                  <div className="h-4 bg-[var(--muted)] rounded w-3/4 mx-auto mb-2"></div>
                  <div className="h-4 bg-[var(--muted)] rounded w-1/2 mx-auto"></div>
                </div>
              </div>
            ) : completedTasks.length === 0 ? (
              <div className="text-center py-8 text-[var(--muted)]">
                <CheckCircle size={32} className="mx-auto mb-2 opacity-50" />
                <p>No tasks completed this month yet</p>
                <p className="text-sm mt-1">Complete tasks to see them here</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {completedTasks.slice(0, 10).map((task) => (
                  <div key={task.id} className="glass rounded-lg p-3 flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <CheckCircle size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium line-through text-white/70">{task.title}</p>
                        {task.description && (
                          <p className="text-sm text-white/40 mt-1 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        <p className="text-sm text-white/50 mt-1">
                          Completed {formatCompletedDate(task.updatedAt)}
                        </p>
                      </div>
                    </div>
                    <span className={cn(
                      'px-2 py-1 rounded-full text-xs opacity-60',
                      getPriorityColor(task.priority)
                    )}>
                      {task.priority}
                    </span>
                  </div>
                ))}
                
                {completedTasks.length > 10 && (
                  <p className="text-center text-sm text-[var(--muted)] pt-2">
                    Showing {Math.min(10, completedTasks.length)} of {completedTasks.length} completed tasks
                  </p>
                )}
              </div>
            )}
            </div>
          </CardContent>
        </Card>
      </motion.div>


      {/* User Profile Onboarding Modal */}
      {showUserProfileOnboarding && (
        <UserProfileOnboarding
          onComplete={handleUserProfileComplete}
          onSkip={handleUserProfileSkip}
          initialData={userProfile || undefined}
        />
      )}

      {/* Expertise Onboarding Modal */}
      {showExpertiseOnboarding && (
        <ExpertiseOnboarding
          onComplete={handleExpertiseComplete}
          onSkip={handleExpertiseSkip}
          initialData={expertiseProfile ? {
            level: expertiseProfile.level,
            channels: expertiseProfile.channels,
            preferences: expertiseProfile.preferences,
            industries: expertiseProfile.industries,
            tools: expertiseProfile.tools,
            goals: expertiseProfile.goals
          } : undefined}
        />
      )}

      {/* Onboarding Complete Screen */}
      {showCompletionScreen && (
        <OnboardingComplete
          userName={userProfile?.name}
          onContinue={() => setShowCompletionScreen(false)}
        />
      )}
    </div>
  );
};