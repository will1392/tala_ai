import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Home,
  Grid,
  Target,
  FileText,
  BarChart3,
  BookOpen,
  CheckSquare,
  MessageSquare,
  Mail,
  Settings,
  ChevronDown,
  Menu,
  PanelLeft,
  X,
  Search,
  Wand2,
  Bell
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { GlobalSearch } from './GlobalSearch';

// UI Components
const Input = ({ className = '', ...props }: { className?: string; [key: string]: any }) => (
  <input
    className={cn(
      'flex h-10 w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary',
      className
    )}
    {...props}
  />
);

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

const Badge = ({ 
  children, 
  variant = 'default',
  className = '' 
}: { 
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'secondary';
  className?: string;
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

const Avatar = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn("relative inline-flex", className)}>{children}</div>
);

const AvatarImage = ({ src, alt }: { src: string; alt: string }) => (
  <img className="h-full w-full rounded-full object-cover" src={src} alt={alt} />
);

const AvatarFallback = ({ children }: { children: React.ReactNode }) => (
  <div className="flex h-full w-full items-center justify-center rounded-full bg-muted text-sm font-medium">
    {children}
  </div>
);

interface SidebarItem {
  title: string;
  icon: React.ReactNode;
  id: string;
  badge?: string;
  isActive?: boolean;
  isExternal?: boolean;
  path?: string;
  items?: {
    title: string;
    id: string;
    badge?: string;
    path?: string;
  }[];
}

const sidebarItems: SidebarItem[] = [
  {
    title: "Home",
    icon: <Home className="h-5 w-5" />,
    id: "home",
    path: "/dashboard"
  },
  {
    title: "Tasks",
    icon: <CheckSquare className="h-5 w-5" />,
    id: "tasks",
    badge: "24",
    items: [
      { title: "My Tasks", id: "my-tasks", badge: "12" },
      { title: "Team Tasks", id: "team-tasks", badge: "8" },
      { title: "Completed", id: "completed", badge: "4" },
    ],
  },
  {
    title: "Chat",
    icon: <MessageSquare className="h-5 w-5" />,
    id: "chat",
    isExternal: true,
    items: [
      { title: "Classic Chat", id: "chat-classic", path: "/chat" },
      { title: "Claude Style", id: "chat-claude", path: "/chat-claude" },
    ],
  },
  {
    title: "Email",
    icon: <Mail className="h-5 w-5" />,
    id: "email",
    isExternal: true,
    path: "/email"
  },
  {
    title: "Knowledge Base",
    icon: <BookOpen className="h-5 w-5" />,
    id: "knowledge",
    isExternal: true,
    path: "/knowledge"
  },
];

// Sidebar Content Component
const SidebarContent = ({ expandedItems, toggleExpanded, activeTab, onNavigate, userProfile, onClose }: any) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  return (
    <div className="flex h-full flex-col border-r">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="flex aspect-square size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 text-white">
            <Wand2 className="size-5" />
          </div>
          <div>
            <h2 className="font-semibold">Tala AI</h2>
            <p className="text-xs text-muted-foreground">Marketing Suite</p>
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      <div className="px-3 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input type="search" placeholder="Search..." className="w-full rounded-2xl bg-muted pl-9 pr-4 py-2" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        <div className="space-y-1">
          {sidebarItems.map((item) => {
            const isActive = item.path === location.pathname;
            
            return (
              <div key={item.id} className="mb-1">
                <button
                  className={cn(
                    "flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm font-medium",
                    isActive ? "bg-primary/10 text-primary" : "hover:bg-muted",
                  )}
                  onClick={() => {
                    if (item.path) {
                      navigate(item.path);
                      onClose?.();
                    } else if (item.items) {
                      toggleExpanded(item.id);
                    } else if (onNavigate) {
                      onNavigate(item.id);
                      onClose?.();
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.title}</span>
                  </div>
                  {item.badge && (
                    <Badge variant="outline" className="ml-auto rounded-full px-2 py-0.5 text-xs">
                      {item.badge}
                    </Badge>
                  )}
                  {item.items && (
                    <ChevronDown
                      className={cn(
                        "ml-2 h-4 w-4 transition-transform",
                        expandedItems[item.id] ? "rotate-180" : "",
                      )}
                    />
                  )}
                </button>

                {item.items && expandedItems[item.id] && (
                  <div className="mt-1 ml-6 space-y-1 border-l pl-3">
                    {item.items.map((subItem) => (
                      <button
                        key={subItem.id}
                        onClick={() => {
                          if (subItem.path) {
                            navigate(subItem.path);
                            onClose?.();
                          } else if (onNavigate) {
                            onNavigate(`${item.id}-${subItem.id}`);
                            onClose?.();
                          }
                        }}
                        className={cn(
                          "flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm",
                          subItem.path === location.pathname ? "bg-primary/10 text-primary" : 
                          activeTab === `${item.id}-${subItem.id}` ? "bg-primary/10 text-primary" : "hover:bg-muted"
                        )}
                      >
                        {subItem.title}
                        {subItem.badge && (
                          <Badge variant="outline" className="ml-auto rounded-full px-2 py-0.5 text-xs">
                            {subItem.badge}
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t p-3">
        <div className="space-y-1">
          <button 
            onClick={() => navigate('/settings')}
            className={cn(
              "flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium hover:bg-muted",
              location.pathname === '/settings' && "bg-primary/10 text-primary"
            )}
          >
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </button>
          <button className="flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm font-medium hover:bg-muted">
            <div className="flex items-center gap-3">
              <Avatar className="h-6 w-6">
                <AvatarFallback>{userProfile?.name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <span>{userProfile?.name || 'User'}</span>
            </div>
            <Badge variant="outline" className="ml-auto">
              Pro
            </Badge>
          </button>
        </div>
      </div>
    </div>
  );
};

export const PremiumLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState("home");
  const [notifications] = useState(5);
  const [userProfile, setUserProfile] = useState<any>(null);
  const location = useLocation();

  // Load user profile
  useEffect(() => {
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
    loadUserProfile();
  }, []);

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/chat':
        return 'Chat Assistant';
      case '/email':
        return 'Email Manager';
      case '/settings':
        return 'Settings';
      case '/knowledge':
        return 'Knowledge Base';
      default:
        return 'Tala Marketing Suite';
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Animated gradient background */}
      <motion.div
        className="absolute inset-0 -z-10 opacity-20"
        animate={{
          background: [
            "radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.5) 0%, rgba(59, 130, 246, 0.5) 50%, rgba(0, 0, 0, 0) 100%)",
            "radial-gradient(circle at 30% 70%, rgba(236, 72, 153, 0.5) 0%, rgba(139, 92, 246, 0.5) 50%, rgba(0, 0, 0, 0) 100%)",
            "radial-gradient(circle at 70% 30%, rgba(34, 197, 94, 0.5) 0%, rgba(59, 130, 246, 0.5) 50%, rgba(0, 0, 0, 0) 100%)",
            "radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.5) 0%, rgba(59, 130, 246, 0.5) 50%, rgba(0, 0, 0, 0) 100%)",
          ],
        }}
        transition={{ duration: 30, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
      />

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar - Mobile */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform bg-background transition-transform duration-300 ease-in-out md:hidden",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarContent
          expandedItems={expandedItems}
          toggleExpanded={toggleExpanded}
          activeTab={activeTab}
          userProfile={userProfile}
          onClose={() => setMobileMenuOpen(false)}
        />
      </div>

      {/* Sidebar - Desktop */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden w-64 transform border-r bg-background transition-transform duration-300 ease-in-out md:block",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarContent
          expandedItems={expandedItems}
          toggleExpanded={toggleExpanded}
          activeTab={activeTab}
          userProfile={userProfile}
        />
      </div>

      {/* Main Content */}
      <div className={cn("min-h-screen transition-all duration-300 ease-in-out", sidebarOpen ? "md:pl-64" : "md:pl-0")}>
        <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden md:flex" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <PanelLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-1 items-center justify-between">
            <h1 className="text-xl font-semibold">{getPageTitle()}</h1>
            <div className="flex items-center gap-3">
              <GlobalSearch />
              <Button variant="ghost" size="icon" className="rounded-2xl relative">
                <Bell className="h-5 w-5" />
                {notifications > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                    {notifications}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 lg:p-10 max-w-[1600px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
};