import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { UserProfileOnboarding, type UserProfile } from "../components/onboarding/UserProfileOnboarding"
import { ExpertiseOnboarding, type ExpertiseProfile } from "../components/cmo/onboarding/ExpertiseOnboarding"
import { OnboardingComplete } from "../components/onboarding/OnboardingComplete"
import { GlobalSearch } from "../components/layout/GlobalSearch"
import {
  Award,
  Bell,
  BookOpen,
  Bookmark,
  Calendar,
  ChevronDown,
  Cloud,
  Crown,
  Download,
  FileText,
  Grid,
  Heart,
  Home,
  Layers,
  LayoutGrid,
  Lightbulb,
  Menu,
  MessageSquare,
  Palette,
  PanelLeft,
  Play,
  Plus,
  Search,
  Settings,
  Share2,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Wand2,
  Clock,
  Eye,
  Archive,
  ArrowUpDown,
  MoreHorizontal,
  X,
  Mail,
  Target,
  BarChart3,
  DollarSign,
  PenTool,
  Send,
  Globe,
  Megaphone,
  Database,
  Zap,
  CheckSquare,
  AlertCircle,
  CheckCircle,
  Filter
} from "lucide-react"
import { cn } from "../utils/cn"

// Custom UI Components
const Avatar = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn("relative inline-flex", className)}>{children}</div>
)

const AvatarImage = ({ src, alt }: { src: string; alt: string }) => (
  <img className="h-full w-full rounded-full object-cover" src={src} alt={alt} />
)

const AvatarFallback = ({ children }: { children: React.ReactNode }) => (
  <div className="flex h-full w-full items-center justify-center rounded-full bg-muted text-sm font-medium">
    {children}
  </div>
)

const Badge = ({ 
  children, 
  variant = "default",
  className = "" 
}: { 
  children: React.ReactNode;
  variant?: "default" | "outline" | "secondary" | "destructive" | "success";
  className?: string;
}) => {
  const variants = {
    default: "bg-primary text-primary-foreground hover:bg-primary/80",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/80",
    success: "bg-green-500 text-white hover:bg-green-600"
  }

  return (
    <div className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
      variants[variant],
      className
    )}>
      {children}
    </div>
  )
}

const Button = ({ 
  children, 
  variant = "default",
  size = "default",
  className = "",
  ...props
}: { 
  children: React.ReactNode;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  [key: string]: any;
}) => {
  const variants = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    link: "text-primary underline-offset-4 hover:underline"
  }

  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    lg: "h-11 rounded-md px-8",
    icon: "h-10 w-10"
  }

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)}>
    {children}
  </div>
)

const CardHeader = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("flex flex-col space-y-1.5 p-6", className)}>{children}</div>
)

const CardContent = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("p-6 pt-0", className)}>{children}</div>
)

const CardTitle = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <h3 className={cn("text-2xl font-semibold leading-none tracking-tight", className)}>{children}</h3>
)

const CardDescription = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <p className={cn("text-sm text-muted-foreground", className)}>{children}</p>
)

const CardFooter = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("flex items-center p-6 pt-0", className)}>{children}</div>
)

const Input = ({ className = "", ...props }: { className?: string; [key: string]: any }) => (
  <input
    className={cn(
      "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
)

const Progress = ({ value, className = "" }: { value: number; className?: string }) => (
  <div className={cn("relative h-4 w-full overflow-hidden rounded-full bg-secondary", className)}>
    <div
      className="h-full w-full flex-1 bg-primary transition-all"
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </div>
)

const ScrollArea = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("relative overflow-auto", className)}>{children}</div>
)

// Tab Components with actual functionality
interface TabsProps {
  children: React.ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  defaultValue?: string;
  className?: string;
}

const TabsContext = React.createContext<{
  value: string;
  onValueChange: (value: string) => void;
}>({ value: "", onValueChange: () => {} });

const Tabs = ({ children, value, onValueChange, defaultValue, className = "" }: TabsProps) => {
  const [internalValue, setInternalValue] = useState(defaultValue || "");
  const actualValue = value !== undefined ? value : internalValue;
  const actualOnValueChange = value !== undefined ? onValueChange : setInternalValue;

  return (
    <TabsContext.Provider value={{ value: actualValue, onValueChange: actualOnValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
};

const TabsList = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("inline-flex h-12 items-center justify-center rounded-2xl bg-muted p-1 text-muted-foreground", className)}>
    {children}
  </div>
);

const TabsTrigger = ({ 
  children, 
  value, 
  className = "" 
}: { 
  children: React.ReactNode; 
  value: string; 
  className?: string 
}) => {
  const context = React.useContext(TabsContext);
  const isActive = context.value === value;

  return (
    <button
      onClick={() => context.onValueChange(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200",
        "hover:bg-background/50",
        isActive && "bg-background text-foreground shadow-sm",
        !isActive && "text-muted-foreground",
        className
      )}
      data-state={isActive ? "active" : "inactive"}
    >
      {children}
    </button>
  );
};

const TabsContent = ({ 
  children, 
  value, 
  className = "" 
}: { 
  children: React.ReactNode; 
  value: string; 
  className?: string 
}) => {
  const context = React.useContext(TabsContext);
  
  if (context.value !== value) {
    return null;
  }

  return (
    <div className={cn("mt-2", className)}>
      {children}
    </div>
  );
};

// Removed dummy tooltip components that were causing visual issues

// Sidebar Navigation Data
interface SidebarItem {
  title: string
  icon: React.ReactNode
  id: string
  badge?: string
  isActive?: boolean
  isExternal?: boolean
  path?: string
  items?: {
    title: string
    id: string
    badge?: string
  }[]
}

const sidebarItems: SidebarItem[] = [
  {
    title: "Home",
    icon: <Home />,
    id: "home",
    isActive: true,
  },
  {
    title: "Tasks",
    icon: <CheckSquare />,
    id: "tasks",
    badge: "20",
  },
  {
    title: "Completed Tasks",
    icon: <CheckCircle />,
    id: "completed",
    badge: "4",
  },
  {
    title: "Chat",
    icon: <MessageSquare />,
    id: "chat",
    isExternal: true,
    path: "/chat"
  },
  {
    title: "Marketing",
    icon: <Target />,
    id: "marketing",
    isExternal: true,
    path: "/marketing"
  },
  {
    title: "Email",
    icon: <Mail />,
    id: "email",
    isExternal: true,
    path: "/email"
  },
  {
    title: "Knowledge Base",
    icon: <BookOpen />,
    id: "knowledge",
    isExternal: true,
    path: "/knowledge"
  },
]

export function PremiumDashboard() {
  const [progress, setProgress] = useState(0)
  const [notifications, setNotifications] = useState(5)
  const [activeTab, setActiveTab] = useState("home")
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [showUserProfileOnboarding, setShowUserProfileOnboarding] = useState(false)
  const [showExpertiseOnboarding, setShowExpertiseOnboarding] = useState(false)
  const [showCompletionScreen, setShowCompletionScreen] = useState(false)
  const [expertiseProfile, setExpertiseProfile] = useState<ExpertiseProfile | null>(null)
  const [hasCheckedOnboarding, setHasCheckedOnboarding] = useState(false)

  // Simulate progress loading
  useEffect(() => {
    const timer = setTimeout(() => setProgress(100), 1000)
    return () => clearTimeout(timer)
  }, [])

  // Check and load user profile & onboarding status
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (hasCheckedOnboarding) return
      
      try {
        if (process.env.NODE_ENV === 'development') {
          // Check if user profile exists
          const storedProfile = localStorage.getItem('tala_user_profile')
          const profileCompleted = localStorage.getItem('tala_user_profile_completed')
          const expertiseCompleted = localStorage.getItem('tala_expertise_completed')
          
          if (storedProfile) {
            setUserProfile(JSON.parse(storedProfile))
          }
          
          // Check if we need to show onboarding
          if (!profileCompleted) {
            setShowUserProfileOnboarding(true)
          } else if (!expertiseCompleted) {
            setShowExpertiseOnboarding(true)
          }
        }
        setHasCheckedOnboarding(true)
      } catch (error) {
        console.error('Error checking onboarding status:', error)
        setHasCheckedOnboarding(true)
      }
    }
    checkOnboardingStatus()
  }, [hasCheckedOnboarding])

  const handleUserProfileComplete = (profile: UserProfile) => {
    setUserProfile(profile)
    setShowUserProfileOnboarding(false)
    
    // Save to localStorage
    if (process.env.NODE_ENV === 'development') {
      localStorage.setItem('tala_user_profile', JSON.stringify(profile))
      localStorage.setItem('tala_user_profile_completed', 'true')
    }
    
    // Show expertise onboarding next
    setShowExpertiseOnboarding(true)
  }

  const handleExpertiseComplete = (profile: ExpertiseProfile) => {
    setExpertiseProfile(profile)
    setShowExpertiseOnboarding(false)
    
    // Save to localStorage
    if (process.env.NODE_ENV === 'development') {
      localStorage.setItem('tala_expertise_profile', JSON.stringify(profile))
      localStorage.setItem('tala_expertise_completed', 'true')
    }
    
    // Show completion screen
    setShowCompletionScreen(true)
  }

  const handleOnboardingComplete = () => {
    setShowCompletionScreen(false)
  }

  const handleSkipOnboarding = () => {
    setShowUserProfileOnboarding(false)
    setShowExpertiseOnboarding(false)
    setShowCompletionScreen(false)
    
    if (process.env.NODE_ENV === 'development') {
      localStorage.setItem('tala_user_profile_completed', 'true')
      localStorage.setItem('tala_expertise_completed', 'true')
    }
  }

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  return (
    <>
      {/* Onboarding Modals */}
      <AnimatePresence>
        {showUserProfileOnboarding && (
          <UserProfileOnboarding
            onComplete={handleUserProfileComplete}
            onSkip={handleSkipOnboarding}
            initialData={userProfile || {}}
          />
        )}
        
        {showExpertiseOnboarding && (
          <ExpertiseOnboarding
            onComplete={handleExpertiseComplete}
            onSkip={handleSkipOnboarding}
          />
        )}
        
        {showCompletionScreen && (
          <OnboardingComplete
            userName={userProfile?.name}
            onContinue={handleOnboardingComplete}
          />
        )}
      </AnimatePresence>

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
          setActiveTab={setActiveTab}
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
          setActiveTab={setActiveTab}
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
            <h1 className="text-xl font-semibold">Tala Marketing Suite</h1>
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

              <Avatar className="h-9 w-9 border-2 border-primary">
                <AvatarFallback>{userProfile?.name?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <Tabs defaultValue="home" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {activeTab === "completed" ? (
                // Show back button when viewing completed tasks
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    className="rounded-2xl"
                    onClick={() => setActiveTab("tasks")}
                  >
                    <ArrowUpDown className="mr-2 h-4 w-4 rotate-90" />
                    Back to Tasks
                  </Button>
                  <h2 className="text-xl font-semibold">Completed Tasks</h2>
                </div>
              ) : (
                // Show regular tabs for other views
                <TabsList className="grid w-full max-w-[400px] grid-cols-3 rounded-2xl p-1">
                  <TabsTrigger value="home" className="rounded-xl data-[state=active]:rounded-xl">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="rounded-xl data-[state=active]:rounded-xl">
                    Analytics
                  </TabsTrigger>
                  <TabsTrigger value="tasks" className="rounded-xl data-[state=active]:rounded-xl">
                    Tasks
                  </TabsTrigger>
                </TabsList>
              )}
              <div className="hidden md:flex gap-2">
                <Button variant="outline" className="rounded-2xl">
                  <Download className="mr-2 h-4 w-4" />
                  Export Report
                </Button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <TabsContent value="home" className="space-y-8 mt-0">
                  <HomeTabContent onRestartOnboarding={() => {
                    // Clear onboarding flags and restart
                    if (process.env.NODE_ENV === 'development') {
                      localStorage.removeItem('tala_user_profile_completed')
                      localStorage.removeItem('tala_expertise_completed')
                    }
                    setHasCheckedOnboarding(false)
                    setShowUserProfileOnboarding(true)
                  }} />
                </TabsContent>

                <TabsContent value="analytics" className="space-y-8 mt-0">
                  <AnalyticsTabContent />
                </TabsContent>

                <TabsContent value="tasks" className="space-y-8 mt-0">
                  <TasksTabContent />
                </TabsContent>

                <TabsContent value="completed" className="space-y-8 mt-0">
                  <CompletedTasksContent />
                </TabsContent>
              </motion.div>
            </AnimatePresence>
          </Tabs>
        </main>
      </div>
    </div>
    </>
  )
}

// Sidebar Content Component
const SidebarContent = ({ expandedItems, toggleExpanded, activeTab, setActiveTab, userProfile, onClose }: any) => {
  const navigate = useNavigate();
  
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

    <ScrollArea className="flex-1 px-3 py-2">
      <div className="space-y-1">
        {sidebarItems.map((item) => (
          <div key={item.id} className="mb-1">
            <button
              className={cn(
                "flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm font-medium",
                activeTab === item.id ? "bg-primary/10 text-primary" : "hover:bg-muted",
              )}
              onClick={() => {
                if (item.isExternal && item.path) {
                  navigate(item.path)
                } else if (item.items) {
                  toggleExpanded(item.id)
                  // Also set the active tab when clicking parent items with subitems
                  setActiveTab(item.id)
                } else {
                  setActiveTab(item.id)
                  onClose?.()
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
                      setActiveTab(`${item.id}-${subItem.id}`)
                      onClose?.()
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm",
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
        ))}
      </div>
    </ScrollArea>

    <div className="border-t p-3">
      <div className="space-y-1">
        <button 
          onClick={() => navigate('/settings')}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium hover:bg-muted"
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
  )
}

// Home Tab Content
const HomeTabContent = ({ onRestartOnboarding }: { onRestartOnboarding?: () => void }) => (
  <>
    <section>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 p-8 text-white"
      >
        <div className="flex items-center justify-between">
          <div className="space-y-4">
            <h2 className="text-3xl font-bold">Marketing Data Overview</h2>
            <p className="max-w-[600px] text-white/80">
              Monitor your key performance metrics and insights in real-time
            </p>
          </div>
          {process.env.NODE_ENV === 'development' && onRestartOnboarding && (
            <Button 
              onClick={onRestartOnboarding}
              variant="secondary"
              className="rounded-2xl bg-white/20 hover:bg-white/30 text-white"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Restart Onboarding
            </Button>
          )}
        </div>
      </motion.div>
    </section>

    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Quick Stats</h2>
        <Button variant="ghost" className="rounded-2xl">
          View All
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Tasks", value: "24", icon: CheckSquare, trend: "+8%", color: "text-violet-600" },
          { label: "Email Open Rate", value: "68%", icon: Mail, trend: "+12%", color: "text-blue-600" },
          { label: "Active Users", value: "1,245", icon: Users, trend: "+28%", color: "text-green-600" },
          { label: "Monthly Revenue", value: "$124.5K", icon: DollarSign, trend: "+18%", color: "text-orange-600" },
        ].map((stat) => (
          <motion.div key={stat.label} whileHover={{ scale: 1.02, y: -5 }} whileTap={{ scale: 0.98 }}>
            <Card className="overflow-hidden rounded-3xl border-2 hover:border-primary/50 transition-all duration-300">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                    <stat.icon className={cn("h-6 w-6", stat.color)} />
                  </div>
                  <Badge variant="outline" className="rounded-xl">
                    {stat.trend}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>

    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Performance Metrics</h2>
        <Button variant="ghost" className="rounded-2xl">
          View Details
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Email Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Open Rate</span>
                <span className="text-sm font-semibold">68%</span>
              </div>
              <Progress value={68} className="h-2 rounded-full" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Click Rate</span>
                <span className="text-sm font-semibold">24%</span>
              </div>
              <Progress value={24} className="h-2 rounded-full" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Conversion Rate</span>
                <span className="text-sm font-semibold">3.2%</span>
              </div>
              <Progress value={3.2} className="h-2 rounded-full" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle>Task Completion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Completed This Week</span>
                <span className="text-sm font-semibold">18 tasks</span>
              </div>
              <Progress value={75} className="h-2 rounded-full" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">On Schedule</span>
                <span className="text-sm font-semibold">92%</span>
              </div>
              <Progress value={92} className="h-2 rounded-full" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Team Productivity</span>
                <span className="text-sm font-semibold">87%</span>
              </div>
              <Progress value={87} className="h-2 rounded-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    </section>

    <section className="space-y-4">
      <h2 className="text-2xl font-semibold">Recent Activity</h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle className="text-lg">Recent Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { title: "Update email templates", time: "2 hours ago", status: "completed" },
                { title: "Review analytics report", time: "4 hours ago", status: "in-progress" },
                { title: "Schedule social media posts", time: "Yesterday", status: "pending" },
                { title: "Client meeting preparation", time: "Yesterday", status: "completed" },
              ].map((task, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-2 w-2 rounded-full",
                      task.status === "completed" && "bg-green-500",
                      task.status === "in-progress" && "bg-blue-500",
                      task.status === "pending" && "bg-gray-400"
                    )} />
                    <div>
                      <p className="text-sm font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{task.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl">
          <CardHeader>
            <CardTitle className="text-lg">Email Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { subject: "Travel Package Promotion", sent: "245", opened: "168", clicked: "42" },
                { subject: "Newsletter - June Edition", sent: "1,024", opened: "682", clicked: "156" },
                { subject: "Flash Sale Alert", sent: "512", opened: "389", clicked: "98" },
                { subject: "Customer Survey", sent: "156", opened: "89", clicked: "23" },
              ].map((email, i) => (
                <div key={i} className="space-y-2 py-2">
                  <p className="text-sm font-medium">{email.subject}</p>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Sent: {email.sent}</span>
                    <span>Opened: {email.opened}</span>
                    <span>Clicked: {email.clicked}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  </>
)

// Tasks Tab Content
const TasksTabContent = () => {
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', priority: 'medium', due: '' });
  const [tasks, setTasks] = useState([
    { id: 1, title: "Create Q3 Marketing Strategy", priority: "high", due: "Tomorrow", assignee: "John D.", progress: 75 },
    { id: 2, title: "Review Email Campaign Performance", priority: "medium", due: "In 3 days", assignee: "Sarah M.", progress: 40 },
    { id: 3, title: "Update Social Media Calendar", priority: "medium", due: "Next week", assignee: "Mike R.", progress: 20 },
    { id: 4, title: "Prepare Client Presentation", priority: "high", due: "Today", assignee: "You", progress: 90 },
    { id: 5, title: "Analyze Website Traffic Report", priority: "low", due: "In 5 days", assignee: "Lisa K.", progress: 0 },
  ]);
  
  const handleNewTask = () => {
    setShowNewTaskForm(true);
  };

  const handleCreateTask = () => {
    if (newTask.title.trim()) {
      const task = {
        id: tasks.length + 1,
        title: newTask.title,
        priority: newTask.priority,
        due: newTask.due || "Not set",
        assignee: "You",
        progress: 0
      };
      setTasks([task, ...tasks]);
      setNewTask({ title: '', priority: 'medium', due: '' });
      setShowNewTaskForm(false);
    }
  };

  const handleCancelNewTask = () => {
    setNewTask({ title: '', priority: 'medium', due: '' });
    setShowNewTaskForm(false);
  };

  return (
  <>
    <section>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="overflow-hidden rounded-3xl bg-gradient-to-r from-green-600 via-teal-600 to-cyan-600 p-8 text-white"
      >
        <div className="space-y-4">
          <h2 className="text-3xl font-bold">Task Management</h2>
          <p className="max-w-[600px] text-white/80">
            Track and manage all your marketing tasks in one place
          </p>
        </div>
      </motion.div>
    </section>

    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Active Tasks</h2>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-2xl">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button className="rounded-2xl" onClick={handleNewTask}>
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        </div>
      </div>
      
      {/* New Task Form */}
      {showNewTaskForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Card className="rounded-3xl border-2 border-primary/20">
            <CardHeader>
              <CardTitle>Create New Task</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Task Title</label>
                <Input
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Enter task title..."
                  className="rounded-xl"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Due Date</label>
                  <Input
                    type="date"
                    value={newTask.due}
                    onChange={(e) => setNewTask({ ...newTask, due: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleCancelNewTask} className="rounded-xl">
                  Cancel
                </Button>
                <Button onClick={handleCreateTask} className="rounded-xl">
                  Create Task
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
      
      <div className="space-y-4">
        {tasks.map((task, index) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="rounded-3xl hover:border-primary/20 transition-all">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="space-y-2 flex-1">
                    <h3 className="font-semibold text-lg">{task.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Due {task.due}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {task.assignee}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={task.priority === "high" ? "destructive" : task.priority === "medium" ? "secondary" : "outline"}
                      className="rounded-xl"
                    >
                      {task.priority}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-xl h-8 w-8"
                    >
                      <MoreHorizontal size={16} />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{task.progress}%</span>
                  </div>
                  <Progress value={task.progress} className="h-2 rounded-full" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  </>
  )
}

// Analytics Tab Content - focused on data visualization
const AnalyticsTabContent = () => {
  // Keep the existing analytics content from later in the file
  return (
    <>
      <section>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="overflow-hidden rounded-3xl bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 p-8 text-white"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Marketing Analytics</h2>
              <p className="max-w-[600px] text-white/80">
                Track performance, measure ROI, and optimize your marketing efforts
              </p>
            </div>
            <Button className="w-fit rounded-2xl bg-white text-indigo-700 hover:bg-white/90">
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </Button>
          </div>
        </motion.div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Performance Overview</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            { title: "Email Performance", icon: Mail, metrics: ["68% Open Rate", "24% Click Rate", "3.2% Conversion"] },
            { title: "Social Media", icon: Globe, metrics: ["45.2K Reach", "3.8K Engagement", "567 Shares"] },
            { title: "Website Traffic", icon: Globe, metrics: ["12K Visitors", "3:24 Avg. Session", "2.4% Bounce Rate"] },
            { title: "Lead Generation", icon: Users, metrics: ["234 New Leads", "45% Qualified", "$125 CPL"] },
            { title: "Revenue", icon: DollarSign, metrics: ["$124.5K Total", "+18% Growth", "$3.2K Avg. Deal"] },
            { title: "Task Completion", icon: CheckSquare, metrics: ["87% On Time", "156 Completed", "12 Overdue"] },
          ].map((item) => (
            <motion.div key={item.title} whileHover={{ scale: 1.02, y: -5 }} whileTap={{ scale: 0.98 }}>
              <Card className="overflow-hidden rounded-3xl border hover:border-primary/50 transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {item.metrics.map((metric, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-2xl font-bold">{metric.split(' ')[0]}</span>
                        <span className="text-sm text-muted-foreground">{metric.split(' ').slice(1).join(' ')}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>
    </>
  )
}

// Completed Tasks Tab Content
const CompletedTasksContent = () => {
  const completedTasks = [
    { id: 1, title: "Q2 Marketing Report", completedDate: "2024-06-30", completedBy: "John D." },
    { id: 2, title: "Email Campaign Launch", completedDate: "2024-06-28", completedBy: "Sarah M." },
    { id: 3, title: "Website Redesign", completedDate: "2024-06-25", completedBy: "Mike R." },
    { id: 4, title: "SEO Optimization", completedDate: "2024-06-20", completedBy: "Lisa K." },
  ]

  return (
    <>
      <section>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 p-8 text-white"
        >
          <div className="space-y-4">
            <h2 className="text-3xl font-bold">Completed Tasks</h2>
            <p className="max-w-[600px] text-white/80">
              Review and archive your completed marketing tasks
            </p>
          </div>
        </motion.div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Recently Completed</h2>
          <Button variant="outline" className="rounded-2xl">
            <Archive className="mr-2 h-4 w-4" />
            Archive All
          </Button>
        </div>
        
        <div className="space-y-4">
          {completedTasks.map((task, index) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="rounded-3xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-900/20">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{task.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          Completed on {new Date(task.completedDate).toLocaleDateString()} by {task.completedBy}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-xl">
                      <MoreHorizontal size={16} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>
    </>
  )
}
