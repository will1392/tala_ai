import React, { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { UserProfileOnboarding, type UserProfile } from "../components/onboarding/UserProfileOnboarding"
import { ExpertiseOnboarding, type ExpertiseProfile } from "../components/cmo/onboarding/ExpertiseOnboarding"
import { OnboardingComplete } from "../components/onboarding/OnboardingComplete"
import {
  Award,
  Bell,
  Calendar,
  Clock,
  Eye,
  Archive,
  ArrowUpDown,
  MoreHorizontal,
  X,
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
  Filter,
  TrendingUp,
  Users,
  Search,
  Plus
} from "lucide-react"

// Import components
import { Card } from "../components/ui/Card"
import { Badge } from "../components/shared/Badge"
import { Button } from "../components/ui/Button"

export function PremiumDashboardContent() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [expertiseProfile, setExpertiseProfile] = useState<ExpertiseProfile | null>(null)
  const [onboardingStep, setOnboardingStep] = useState<"user" | "expertise" | "complete" | null>(null)
  const [activeTab, setActiveTab] = useState("overview")
  const navigate = useNavigate()

  useEffect(() => {
    // Check if user has completed onboarding
    const savedUserProfile = localStorage.getItem("userProfile")
    const savedExpertiseProfile = localStorage.getItem("expertiseProfile")
    const hasCompletedOnboarding = localStorage.getItem("hasCompletedOnboarding")

    if (hasCompletedOnboarding === "true") {
      setOnboardingStep(null)
      if (savedUserProfile) setUserProfile(JSON.parse(savedUserProfile))
      if (savedExpertiseProfile) setExpertiseProfile(JSON.parse(savedExpertiseProfile))
    } else if (!savedUserProfile) {
      setOnboardingStep("user")
    } else if (!savedExpertiseProfile) {
      setUserProfile(JSON.parse(savedUserProfile))
      setOnboardingStep("expertise")
    } else {
      setUserProfile(JSON.parse(savedUserProfile))
      setExpertiseProfile(JSON.parse(savedExpertiseProfile))
      setOnboardingStep("complete")
    }
  }, [])

  const handleUserProfileComplete = (profile: UserProfile) => {
    setUserProfile(profile)
    localStorage.setItem("userProfile", JSON.stringify(profile))
    setOnboardingStep("expertise")
  }

  const handleExpertiseComplete = (profile: ExpertiseProfile) => {
    setExpertiseProfile(profile)
    localStorage.setItem("expertiseProfile", JSON.stringify(profile))
    setOnboardingStep("complete")
  }

  const handleOnboardingComplete = () => {
    localStorage.setItem("hasCompletedOnboarding", "true")
    setOnboardingStep(null)
  }

  // Function to skip onboarding
  const handleSkipOnboarding = () => {
    localStorage.setItem("hasCompletedOnboarding", "true")
    setOnboardingStep(null)
  }

  // Show onboarding if needed
  if (onboardingStep === "user") {
    return <UserProfileOnboarding onComplete={handleUserProfileComplete} onSkip={handleSkipOnboarding} />
  }

  if (onboardingStep === "expertise") {
    return <ExpertiseOnboarding onComplete={handleExpertiseComplete} onSkip={handleSkipOnboarding} />
  }

  if (onboardingStep === "complete") {
    return (
      <OnboardingComplete
        userProfile={userProfile}
        expertiseProfile={expertiseProfile}
        onComplete={handleOnboardingComplete}
      />
    )
  }

  // Main dashboard content
  return (
    <div className="flex-1 overflow-auto">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600">
              Premium
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="sm">
              <Search className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 px-6">
          {["overview", "analytics", "tasks"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 pb-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Stats Grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Revenue</p>
                      <p className="text-2xl font-bold">$45,231.89</p>
                      <p className="text-xs text-emerald-600">+20.1% from last month</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                </Card>
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Campaigns</p>
                      <p className="text-2xl font-bold">12</p>
                      <p className="text-xs text-emerald-600">+2 from last week</p>
                    </div>
                    <Megaphone className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                </Card>
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Conversion Rate</p>
                      <p className="text-2xl font-bold">3.2%</p>
                      <p className="text-xs text-emerald-600">+0.5% from last month</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                </Card>
                <Card className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Subscribers</p>
                      <p className="text-2xl font-bold">2,350</p>
                      <p className="text-xs text-emerald-600">+180 this month</p>
                    </div>
                    <Users className="h-8 w-8 text-muted-foreground/30" />
                  </div>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card className="p-6">
                <h3 className="mb-4 text-lg font-semibold">Recent Activity</h3>
                <div className="space-y-4">
                  {[
                    { title: "New email campaign launched", time: "2 hours ago", icon: Send },
                    { title: "SEO report generated", time: "4 hours ago", icon: BarChart3 },
                    { title: "Blog post published", time: "6 hours ago", icon: PenTool },
                    { title: "Social media posts scheduled", time: "8 hours ago", icon: Globe },
                  ].map((activity, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <activity.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.title}</p>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          )}

          {activeTab === "analytics" && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <Card className="p-6">
                <h3 className="mb-4 text-lg font-semibold">Performance Analytics</h3>
                <div className="flex h-64 items-center justify-center text-muted-foreground">
                  Analytics charts will be displayed here
                </div>
              </Card>
            </motion.div>
          )}

          {activeTab === "tasks" && (
            <motion.div
              key="tasks"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Marketing Tasks</h3>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Task
                </Button>
              </div>
              
              <div className="grid gap-4">
                {[
                  { id: 1, title: "Create landing page for Q1 campaign", status: "In Progress", priority: "High" },
                  { id: 2, title: "Review SEO audit results", status: "Pending", priority: "Medium" },
                  { id: 3, title: "Schedule social media posts", status: "Completed", priority: "Low" },
                  { id: 4, title: "Update email templates", status: "In Progress", priority: "High" },
                  { id: 5, title: "Analyze competitor strategies", status: "Pending", priority: "Medium" },
                ].map((task) => (
                  <Card key={task.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckSquare className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{task.title}</p>
                          <p className="text-sm text-muted-foreground">Priority: {task.priority}</p>
                        </div>
                      </div>
                      <Badge>{task.status}</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}