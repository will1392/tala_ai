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
  MoreHorizontal,
  PanelLeft,
  MessageSquare,
  DollarSign,
  Eye,
  Star,
  ArrowUpDown,
  Download,
  Wand2
} from 'lucide-react';
import { cn } from '../utils/cn';
import type { UserProfile } from '../components/onboarding/UserProfileOnboarding';

// Card Component
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('rounded-3xl border bg-white dark:bg-gray-800 shadow-sm transition-all duration-200', className)}>
    {children}
  </div>
);

const CardHeader = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('p-6 md:p-7', className)}>{children}</div>
);

const CardContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('px-6 pb-6 md:px-7 md:pb-7', className)}>{children}</div>
);

const CardTitle = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <h3 className={cn('text-lg font-semibold', className)}>{children}</h3>
);

const CardDescription = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <p className={cn('text-sm text-muted-foreground', className)}>{children}</p>
);

// Badge Component
const Badge = ({ children, variant = 'default', className = '' }: { 
  children: React.ReactNode; 
  variant?: 'default' | 'outline' | 'secondary';
  className?: string 
}) => {
  const variants = {
    default: 'bg-primary/10 text-primary border-transparent',
    outline: 'border-gray-200 dark:border-gray-700',
    secondary: 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-transparent'
  };

  return (
    <span className={cn(
      'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
};

// Button Component
const Button = ({ 
  children, 
  variant = 'default', 
  size = 'default',
  className = '',
  ...props 
}: { 
  children: React.ReactNode; 
  variant?: 'default' | 'secondary' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  [key: string]: any;
}) => {
  const variants = {
    default: 'bg-primary text-white hover:bg-primary/90',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600',
    outline: 'border border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
    ghost: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
  };

  const sizes = {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 rounded-md px-3',
    lg: 'h-11 rounded-md px-8',
    icon: 'h-10 w-10'
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-2xl text-sm font-medium transition-colors disabled:opacity-50',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

// Progress Component
const Progress = ({ value, className = '' }: { value: number; className?: string }) => (
  <div className={cn('relative h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700', className)}>
    <div 
      className="h-full bg-primary transition-all duration-300"
      style={{ width: `${value}%` }}
    />
  </div>
);

// Input Component
const Input = ({ className = '', ...props }: { className?: string; [key: string]: any }) => (
  <input
    className={cn(
      'flex h-10 w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary',
      className
    )}
    {...props}
  />
);

// Sidebar navigation structure
const sidebarItems = [
  {
    title: 'Home',
    icon: Home,
    id: 'home',
    isActive: true,
  },
  {
    title: 'Tasks',
    icon: CheckSquare,
    id: 'tasks',
    badge: '12',
    items: [
      { title: 'All Tasks', id: 'all', badge: '12' },
      { title: 'Active', id: 'active', badge: '8' },
      { title: 'Completed', id: 'completed' },
      { title: 'From Emails', id: 'emails', badge: '3' },
    ],
  },
  {
    title: 'Marketing',
    icon: TrendingUp,
    id: 'marketing',
    items: [
      { title: 'Campaigns', id: 'campaigns' },
      { title: 'Content Calendar', id: 'calendar' },
      { title: 'Email Marketing', id: 'email' },
      { title: 'Social Media', id: 'social' },
    ],
  },
  {
    title: 'Analytics',
    icon: BarChart3,
    id: 'analytics',
    items: [
      { title: 'Performance', id: 'performance' },
      { title: 'ROI Tracking', id: 'roi' },
      { title: 'Reports', id: 'reports' },
    ],
  },
  {
    title: 'Documents',
    icon: FileText,
    id: 'documents',
  },
  {
    title: 'Learn',
    icon: BookOpen,
    id: 'learn',
  },
];

export const ModernDashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState('home');
  const [notifications] = useState(5);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

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
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const toggleExpanded = (title: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar - Mobile */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform bg-background transition-transform duration-300 ease-in-out md:hidden',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <SidebarContent 
          expandedItems={expandedItems}
          toggleExpanded={toggleExpanded}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          userProfile={userProfile}
          onClose={() => setMobileMenuOpen(false)}
        />
      </div>

      {/* Sidebar - Desktop */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden w-64 transform border-r bg-background transition-transform duration-300 ease-in-out md:block',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <SidebarContent 
          expandedItems={expandedItems}
          toggleExpanded={toggleExpanded}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          userProfile={userProfile}
        />
      </div>

      {/* Main Content */}
      <div className={cn('min-h-screen transition-all duration-300 ease-in-out', sidebarOpen ? 'md:pl-64' : 'md:pl-0')}>
        <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden md:flex" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <PanelLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex flex-1 items-center justify-between">
            <h1 className="text-xl font-semibold">Marketing Dashboard</h1>
            
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="rounded-2xl relative">
                <Bell className="h-5 w-5" />
                {notifications > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                    {notifications}
                  </span>
                )}
              </Button>
              
              <Button className="rounded-2xl">
                <Plus className="mr-2 h-4 w-4" />
                New Task
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 lg:p-10 max-w-[1600px] mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'home' && <HomeContent />}
              {activeTab.startsWith('tasks') && <TasksContent activeView={activeTab} />}
              {activeTab.startsWith('marketing') && <MarketingContent activeView={activeTab} />}
              {activeTab.startsWith('analytics') && <AnalyticsContent activeView={activeTab} />}
              {!['home', 'tasks', 'marketing', 'analytics'].some(tab => activeTab.startsWith(tab)) && (
                <div className="text-center py-20">
                  <h2 className="text-2xl font-semibold mb-4">Coming Soon</h2>
                  <p className="text-muted-foreground">This section is under development</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

// Sidebar Content Component
const SidebarContent = ({ expandedItems, toggleExpanded, activeTab, setActiveTab, userProfile, onClose }: any) => (
  <div className="flex h-full flex-col border-r">
    <div className="flex items-center justify-between p-6 pb-4">
      <div className="flex items-center gap-3">
        <div className="flex aspect-square size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-lg">
          <Wand2 className="size-6" />
        </div>
        <div>
          <h2 className="font-semibold text-lg">Tala AI</h2>
          <p className="text-xs text-muted-foreground">Marketing Suite</p>
        </div>
      </div>
      {onClose && (
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      )}
    </div>

    <div className="px-4 py-3">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input type="search" placeholder="Search..." className="w-full pl-10 h-11" />
      </div>
    </div>

    <nav className="flex-1 space-y-1.5 overflow-y-auto px-4 py-3">
      {sidebarItems.map((item) => (
        <div key={item.id} className="mb-2">
          <button
            className={cn(
              'flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition-all',
              activeTab === item.id || activeTab.startsWith(`${item.id}-`)
                ? 'bg-primary/10 text-primary shadow-sm' 
                : 'hover:bg-muted'
            )}
            onClick={() => {
              if (item.items) {
                toggleExpanded(item.id);
              } else {
                setActiveTab(item.id);
                onClose?.();
              }
            }}
          >
            <div className="flex items-center gap-3">
              <item.icon className="h-5 w-5" />
              <span>{item.title}</span>
            </div>
            {item.badge && (
              <Badge variant="outline" className="ml-auto">
                {item.badge}
              </Badge>
            )}
            {item.items && (
              <ChevronDown
                className={cn(
                  'ml-2 h-4 w-4 transition-transform',
                  expandedItems[item.id] ? 'rotate-180' : ''
                )}
              />
            )}
          </button>

          {item.items && expandedItems[item.id] && (
            <div className="mt-2 ml-7 space-y-1 border-l pl-4">
              {item.items.map((subItem) => (
                <button
                  key={subItem.id}
                  onClick={() => {
                    setActiveTab(`${item.id}-${subItem.id}`);
                    onClose?.();
                  }}
                  className={cn(
                    'flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-all',
                    activeTab === `${item.id}-${subItem.id}`
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                  )}
                >
                  {subItem.title}
                  {subItem.badge && (
                    <Badge variant="outline" className="ml-auto text-xs">
                      {subItem.badge}
                    </Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>

    <div className="border-t p-4 space-y-3">
      <Button variant="ghost" className="w-full justify-start h-11">
        <Settings className="mr-3 h-5 w-5" />
        Settings
      </Button>
      <div className="flex items-center gap-3 rounded-2xl px-3 py-3 bg-muted">
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white text-sm font-semibold shadow-md">
          {userProfile?.name?.charAt(0) || 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{userProfile?.name || 'User'}</p>
          <p className="text-xs text-muted-foreground truncate">{userProfile?.companyName || 'Travel Agency'}</p>
        </div>
        <Badge variant="outline" className="shrink-0">Pro</Badge>
      </div>
    </div>
  </div>
);

// Home Content Component
const HomeContent = () => {
  const stats = [
    { label: 'Active Tasks', value: '24', icon: CheckSquare, trend: '+12%', color: 'text-blue-600' },
    { label: 'Campaigns', value: '8', icon: Target, trend: '+5%', color: 'text-green-600' },
    { label: 'Email Opens', value: '68%', icon: Mail, trend: '+15%', color: 'text-purple-600' },
    { label: 'Revenue', value: '$24.5K', icon: DollarSign, trend: '+22%', color: 'text-orange-600' },
  ];

  const recentTasks = [
    { id: 1, title: 'Create summer campaign landing page', priority: 'high', due: '2 hours', source: 'email' },
    { id: 2, title: 'Review email newsletter draft', priority: 'medium', due: 'Tomorrow', source: 'chat' },
    { id: 3, title: 'Update social media calendar', priority: 'low', due: 'Next week', source: 'manual' },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Section with improved spacing */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 p-8 md:p-10 text-white"
      >
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div className="space-y-6">
            <div>
              <Badge className="mb-4 bg-white/20 text-white hover:bg-white/30">Welcome Back</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-3">Your Marketing Command Center</h2>
              <p className="max-w-[600px] text-white/80 text-lg">
                Track campaigns, manage tasks, and analyze performance all in one place.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="outline" 
              className="border-2 border-white/30 text-white hover:bg-white/20 h-12 px-6"
            >
              View Tutorial
            </Button>
            <Button 
              variant="default"
              className="h-12 px-6 font-semibold"
            >
              <Plus className="mr-2 h-4 w-4" />
              Quick Actions
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid with consistent spacing */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02, y: -5 }}
          >
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                  <div className={cn('p-2 rounded-lg bg-gray-50 dark:bg-gray-800')}>
                    <stat.icon className={cn('h-5 w-5', stat.color)} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-bold mb-2">{stat.value}</div>
                <p className="text-sm text-muted-foreground">
                  <span className="text-green-600 font-medium">{stat.trend}</span> from last month
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Recent Tasks & Campaign Performance with improved spacing */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">Recent Tasks</CardTitle>
              <Button variant="ghost" size="sm" className="h-9">
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {recentTasks.map((task, index) => (
                <motion.div 
                  key={task.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between rounded-xl border p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="font-medium text-base mb-2">{task.title}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        Due {task.due}
                      </span>
                      {task.source === 'email' && (
                        <span className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5" />
                          Email
                        </span>
                      )}
                      {task.source === 'chat' && (
                        <span className="flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5" />
                          Chat
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge 
                    variant={task.priority === 'high' ? 'default' : 'outline'}
                    className={cn(
                      'ml-2',
                      task.priority === 'high' && 'bg-red-100 text-red-700 border-red-200',
                      task.priority === 'medium' && 'bg-yellow-100 text-yellow-700 border-yellow-200',
                      task.priority === 'low' && 'bg-green-100 text-green-700 border-green-200'
                    )}
                  >
                    {task.priority}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Campaign Performance</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">Email Open Rate</span>
                  <span className="text-sm font-semibold text-right">68%</span>
                </div>
                <Progress value={68} className="h-2.5" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">Click-through Rate</span>
                  <span className="text-sm font-semibold text-right">24%</span>
                </div>
                <Progress value={24} className="h-2.5" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">Conversion Rate</span>
                  <span className="text-sm font-semibold text-right">3.2%</span>
                </div>
                <Progress value={32} className="h-2.5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Tasks Content Component
const TasksContent = ({ activeView }: { activeView: string }) => {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white"
      >
        <h2 className="text-3xl font-bold">Task Management</h2>
        <p className="mt-2 text-white/80">Stay organized and never miss a deadline</p>
      </motion.div>

      <div className="text-center py-20">
        <h3 className="text-xl font-semibold mb-2">Tasks View: {activeView}</h3>
        <p className="text-muted-foreground">Task management interface coming soon</p>
      </div>
    </div>
  );
};

// Marketing Content Component
const MarketingContent = ({ activeView }: { activeView: string }) => {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-3xl bg-gradient-to-r from-purple-600 to-pink-600 p-8 text-white"
      >
        <h2 className="text-3xl font-bold">Marketing Hub</h2>
        <p className="mt-2 text-white/80">Create, manage, and optimize your campaigns</p>
      </motion.div>

      <div className="text-center py-20">
        <h3 className="text-xl font-semibold mb-2">Marketing View: {activeView}</h3>
        <p className="text-muted-foreground">Marketing tools coming soon</p>
      </div>
    </div>
  );
};

// Analytics Content Component
const AnalyticsContent = ({ activeView }: { activeView: string }) => {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-3xl bg-gradient-to-r from-orange-600 to-red-600 p-8 text-white"
      >
        <h2 className="text-3xl font-bold">Analytics & Insights</h2>
        <p className="mt-2 text-white/80">Data-driven decisions for better results</p>
      </motion.div>

      <div className="text-center py-20">
        <h3 className="text-xl font-semibold mb-2">Analytics View: {activeView}</h3>
        <p className="text-muted-foreground">Analytics dashboard coming soon</p>
      </div>
    </div>
  );
};