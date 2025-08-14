import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home,
  CheckSquare,
  TrendingUp,
  Calendar,
  Mail,
  FileText,
  BookOpen,
  Settings,
  ChevronDown,
  Search,
  Bell,
  Plus,
  Menu,
  X,
  Activity,
  Users,
  Target,
  BarChart3,
  Clock,
  Filter,
  MoreHorizontal
} from 'lucide-react';
import { GlassCard } from '../components/layout/GlassCard';
import { Button } from '../components/shared/Button';
import { Input } from '../components/shared/Input';
import { Badge } from '../components/shared/Badge';
import { cn } from '../utils/cn';
import type { UserProfile } from '../components/onboarding/UserProfileOnboarding';
import { OverviewContent } from '../components/dashboard/OverviewContent';

// Sidebar navigation structure
const sidebarItems = [
  {
    id: 'overview',
    title: 'Overview',
    icon: Home,
    isActive: true,
  },
  {
    id: 'tasks',
    title: 'Tasks',
    icon: CheckSquare,
    badge: '12',
    items: [
      { id: 'active-tasks', title: 'Active Tasks', badge: '8' },
      { id: 'completed-tasks', title: 'Completed' },
      { id: 'from-emails', title: 'From Emails', badge: '3' },
      { id: 'from-chats', title: 'From Chats', badge: '5' },
    ],
  },
  {
    id: 'marketing',
    title: 'Marketing',
    icon: TrendingUp,
    items: [
      { id: 'campaigns', title: 'Campaigns' },
      { id: 'content-calendar', title: 'Content Calendar' },
      { id: 'email-campaigns', title: 'Email Campaigns' },
      { id: 'social-media', title: 'Social Media' },
    ],
  },
  {
    id: 'analytics',
    title: 'Analytics',
    icon: BarChart3,
    items: [
      { id: 'performance', title: 'Performance' },
      { id: 'roi-tracking', title: 'ROI Tracking' },
      { id: 'engagement', title: 'Engagement' },
    ],
  },
  {
    id: 'documents',
    title: 'Documents',
    icon: FileText,
  },
  {
    id: 'knowledge',
    title: 'Knowledge Base',
    icon: BookOpen,
  },
];

export const UnifiedDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState('overview');
  const [notifications, setNotifications] = useState(5);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Load user profile
  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      if (process.env.NODE_ENV === 'development') {
        const storedProfile = localStorage.getItem('tala_user_profile');
        if (storedProfile) {
          setUserProfile(JSON.parse(storedProfile));
        }
        return;
      }

      const userId = 'test_user_123';
      const response = await fetch(`/api/user-profile/${userId}`);
      if (response.ok) {
        const profile = await response.json();
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleNavigation = (id: string, parentId?: string) => {
    if (parentId) {
      setActiveTab(`${parentId}-${id}`);
    } else {
      setActiveTab(id);
    }
    setMobileMenuOpen(false);
  };

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

  return (
    <div className="relative min-h-screen overflow-hidden bg-gray-950">
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0 -z-10 opacity-30"
        animate={{
          background: [
            'radial-gradient(circle at 50% 50%, rgba(15, 198, 198, 0.3) 0%, rgba(20, 184, 166, 0.2) 50%, rgba(0, 0, 0, 0) 100%)',
            'radial-gradient(circle at 30% 70%, rgba(20, 184, 166, 0.3) 0%, rgba(15, 198, 198, 0.2) 50%, rgba(0, 0, 0, 0) 100%)',
            'radial-gradient(circle at 70% 30%, rgba(13, 148, 136, 0.3) 0%, rgba(15, 198, 198, 0.2) 50%, rgba(0, 0, 0, 0) 100%)',
            'radial-gradient(circle at 50% 50%, rgba(15, 198, 198, 0.3) 0%, rgba(20, 184, 166, 0.2) 50%, rgba(0, 0, 0, 0) 100%)',
          ],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      />

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden" 
          onClick={() => setMobileMenuOpen(false)} 
        />
      )}

      {/* Sidebar - Mobile */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform bg-gray-900/95 backdrop-blur-md transition-transform duration-300 ease-in-out md:hidden',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col border-r border-white/10">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="flex aspect-square size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-white shadow-glow">
                <span className="font-bold text-lg">T</span>
              </div>
              <div>
                <h2 className="font-semibold text-white">Tala AI</h2>
                <p className="text-xs text-white/60">Marketing Assistant</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="px-3 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-white/40" />
              <Input 
                type="search" 
                placeholder="Search..." 
                className="w-full rounded-2xl bg-white/5 border-white/10 pl-9 pr-4 py-2 text-white placeholder-white/40" 
              />
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-2">
            <div className="space-y-1">
              {sidebarItems.map((item) => (
                <SidebarItem
                  key={item.id}
                  item={item}
                  isExpanded={expandedItems[item.id]}
                  onToggle={() => item.items && toggleExpanded(item.id)}
                  onNavigate={handleNavigation}
                  activeTab={activeTab}
                />
              ))}
            </div>
          </nav>

          <div className="border-t border-white/10 p-3">
            <button 
              onClick={() => handleNavigation('settings')}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Settings className="h-5 w-5" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar - Desktop */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden w-64 transform border-r border-white/10 bg-gray-900/50 backdrop-blur-md transition-all duration-300 ease-in-out md:block',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex aspect-square size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-dark text-white shadow-glow">
                <span className="font-bold text-lg">T</span>
              </div>
              <div>
                <h2 className="font-semibold text-white">Tala AI</h2>
                <p className="text-xs text-white/60">Marketing Assistant</p>
              </div>
            </div>
          </div>

          <div className="px-3 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-white/40" />
              <Input 
                type="search" 
                placeholder="Search..." 
                className="w-full rounded-2xl bg-white/5 border-white/10 pl-9 pr-4 py-2 text-white placeholder-white/40" 
              />
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-2">
            <div className="space-y-1">
              {sidebarItems.map((item) => (
                <SidebarItem
                  key={item.id}
                  item={item}
                  isExpanded={expandedItems[item.id]}
                  onToggle={() => item.items && toggleExpanded(item.id)}
                  onNavigate={handleNavigation}
                  activeTab={activeTab}
                />
              ))}
            </div>
          </nav>

          <div className="border-t border-white/10 p-3">
            <button 
              onClick={() => handleNavigation('settings')}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Settings className="h-5 w-5" />
              <span>Settings</span>
            </button>
            <div className="mt-2 flex items-center gap-3 rounded-2xl px-3 py-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white text-sm font-medium">
                {userProfile?.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{userProfile?.name || 'User'}</p>
                <p className="text-xs text-white/60">{userProfile?.companyName || 'Travel Agency'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={cn(
        'min-h-screen transition-all duration-300 ease-in-out',
        sidebarOpen ? 'md:pl-64' : 'md:pl-0'
      )}>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-white/10 bg-gray-900/50 backdrop-blur-md px-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden" 
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="hidden md:flex" 
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="flex flex-1 items-center justify-between">
            <h1 className="text-xl font-semibold text-white">
              {getPageTitle(activeTab)}
            </h1>
            
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {notifications > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                    {notifications}
                  </span>
                )}
              </Button>
              
              <Button variant="primary" size="sm" className="hidden md:flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Task
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderContent(activeTab)}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

// Sidebar Item Component
const SidebarItem = ({ item, isExpanded, onToggle, onNavigate, activeTab }: any) => {
  const Icon = item.icon;
  const isActive = activeTab === item.id || activeTab.startsWith(`${item.id}-`);

  return (
    <div className="mb-1">
      <button
        className={cn(
          'flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm font-medium transition-all',
          isActive 
            ? 'bg-primary/20 text-primary shadow-glow-sm' 
            : 'text-white/80 hover:bg-white/10 hover:text-white'
        )}
        onClick={() => item.items ? onToggle() : onNavigate(item.id)}
      >
        <div className="flex items-center gap-3">
          <Icon className="h-4 w-4" />
          <span>{item.title}</span>
        </div>
        <div className="flex items-center gap-2">
          {item.badge && (
            <Badge variant="default" className="rounded-full px-2 py-0.5 text-xs">
              {item.badge}
            </Badge>
          )}
          {item.items && (
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform',
                isExpanded ? 'rotate-180' : ''
              )}
            />
          )}
        </div>
      </button>

      {item.items && isExpanded && (
        <div className="mt-1 ml-6 space-y-1 border-l border-white/10 pl-3">
          {item.items.map((subItem: any) => {
            const isSubActive = activeTab === `${item.id}-${subItem.id}`;
            return (
              <button
                key={subItem.id}
                onClick={() => onNavigate(subItem.id, item.id)}
                className={cn(
                  'flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm transition-all',
                  isSubActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-white/60 hover:bg-white/5 hover:text-white/80'
                )}
              >
                {subItem.title}
                {subItem.badge && (
                  <Badge variant="outline" className="rounded-full px-2 py-0.5 text-xs">
                    {subItem.badge}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// Helper functions
const getPageTitle = (activeTab: string) => {
  const titles: Record<string, string> = {
    'overview': 'Dashboard Overview',
    'tasks-active-tasks': 'Active Tasks',
    'tasks-completed-tasks': 'Completed Tasks',
    'tasks-from-emails': 'Tasks from Emails',
    'tasks-from-chats': 'Tasks from Chats',
    'marketing-campaigns': 'Marketing Campaigns',
    'marketing-content-calendar': 'Content Calendar',
    'marketing-email-campaigns': 'Email Campaigns',
    'marketing-social-media': 'Social Media',
    'analytics-performance': 'Performance Analytics',
    'analytics-roi-tracking': 'ROI Tracking',
    'analytics-engagement': 'Engagement Metrics',
    'documents': 'Documents',
    'knowledge': 'Knowledge Base',
    'settings': 'Settings',
  };
  
  return titles[activeTab] || 'Dashboard';
};

const renderContent = (activeTab: string) => {
  switch (activeTab) {
    case 'overview':
      return (
        <div className="space-y-6">
          {/* Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="overflow-hidden rounded-3xl bg-gradient-to-r from-cyan-600 via-teal-600 to-emerald-600 p-8 text-white shadow-glow"
          >
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="space-y-4">
                <h2 className="text-3xl font-bold">Welcome to Your Marketing Hub</h2>
                <p className="max-w-[600px] text-white/80">
                  Manage your tasks, campaigns, and analytics all in one place.
                </p>
              </div>
              <div className="flex gap-3">
                <Button className="bg-white/20 backdrop-blur-md hover:bg-white/30">
                  View Tutorial
                </Button>
                <Button className="bg-white text-teal-700 hover:bg-white/90">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Campaign
                </Button>
              </div>
            </div>
          </motion.div>
          <OverviewContent />
        </div>
      );
    
    case 'tasks-active-tasks':
    case 'tasks-completed-tasks':
    case 'tasks-from-emails':
    case 'tasks-from-chats':
      return (
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 text-white shadow-glow"
          >
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="space-y-4">
                <h2 className="text-3xl font-bold">Task Management</h2>
                <p className="max-w-[600px] text-white/80">
                  Track and manage all your marketing tasks in one place.
                </p>
              </div>
              <Button className="bg-white text-indigo-700 hover:bg-white/90">
                <Plus className="mr-2 h-4 w-4" />
                New Task
              </Button>
            </div>
          </motion.div>
          <div className="text-white/80 text-center py-20">
            <p className="text-2xl mb-4">Task Content Coming Soon</p>
            <p className="text-white/60">Task management interface will be integrated here</p>
          </div>
        </div>
      );
    
    case 'marketing-campaigns':
    case 'marketing-content-calendar':
    case 'marketing-email-campaigns':
    case 'marketing-social-media':
      return (
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="overflow-hidden rounded-3xl bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 p-8 text-white shadow-glow"
          >
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="space-y-4">
                <h2 className="text-3xl font-bold">Marketing Campaigns</h2>
                <p className="max-w-[600px] text-white/80">
                  Create, manage, and track your marketing campaigns.
                </p>
              </div>
              <Button className="bg-white text-purple-700 hover:bg-white/90">
                <Plus className="mr-2 h-4 w-4" />
                New Campaign
              </Button>
            </div>
          </motion.div>
          <div className="text-white/80 text-center py-20">
            <p className="text-2xl mb-4">Marketing Content Coming Soon</p>
            <p className="text-white/60">Campaign management interface will be integrated here</p>
          </div>
        </div>
      );
    
    case 'analytics-performance':
    case 'analytics-roi-tracking':
    case 'analytics-engagement':
      return (
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="overflow-hidden rounded-3xl bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 p-8 text-white shadow-glow"
          >
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="space-y-4">
                <h2 className="text-3xl font-bold">Analytics & Insights</h2>
                <p className="max-w-[600px] text-white/80">
                  Track performance and ROI across all your marketing efforts.
                </p>
              </div>
              <Button className="bg-white text-orange-700 hover:bg-white/90">
                Export Report
              </Button>
            </div>
          </motion.div>
          <div className="text-white/80 text-center py-20">
            <p className="text-2xl mb-4">Analytics Coming Soon</p>
            <p className="text-white/60">Analytics dashboard will be integrated here</p>
          </div>
        </div>
      );
    
    default:
      return (
        <div className="text-white/80 text-center py-20">
          <p className="text-2xl mb-4">Content for: {getPageTitle(activeTab)}</p>
          <p className="text-white/60">This section is under development</p>
        </div>
      );
  }
};