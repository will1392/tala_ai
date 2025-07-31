import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, ArrowRight, Check, Play, X, 
  Zap, Target, TrendingUp, Users, BarChart3,
  BookOpen, Award, Rocket, ChevronLeft
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { toolDiscoveryService } from '../../services/ToolDiscoveryService';
import { toolAnalyticsService } from '../../services/ToolAnalyticsService';

interface CMOOnboardingProps {
  onComplete: () => void;
  onSkip?: () => void;
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  content: React.ComponentType<OnboardingStepProps>;
  duration: string;
}

interface OnboardingStepProps {
  onNext: () => void;
  onBack?: () => void;
  userData: UserOnboardingData;
  updateUserData: (data: Partial<UserOnboardingData>) => void;
}

interface UserOnboardingData {
  name?: string;
  role?: string;
  experience?: 'beginner' | 'intermediate' | 'advanced';
  goals?: string[];
  industry?: string;
  teamSize?: string;
  challenges?: string[];
  preferredTools?: string[];
}

// Onboarding steps
const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to CMO Mode',
    description: 'Your AI-powered marketing command center',
    icon: Sparkles,
    content: WelcomeStep,
    duration: '1 min'
  },
  {
    id: 'profile',
    title: 'Tell Us About You',
    description: 'Personalize your experience',
    icon: Users,
    content: ProfileStep,
    duration: '2 min'
  },
  {
    id: 'goals',
    title: 'Set Your Goals',
    description: 'What do you want to achieve?',
    icon: Target,
    content: GoalsStep,
    duration: '2 min'
  },
  {
    id: 'tools-intro',
    title: 'Discover Your Tools',
    description: 'Powerful marketing tools at your fingertips',
    icon: Zap,
    content: ToolsIntroStep,
    duration: '3 min'
  },
  {
    id: 'practice',
    title: 'Try It Out',
    description: 'Practice with a real scenario',
    icon: Play,
    content: PracticeStep,
    duration: '5 min'
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    description: 'Start your marketing journey',
    icon: Rocket,
    content: CompleteStep,
    duration: '1 min'
  }
];

export const CMOOnboarding: React.FC<CMOOnboardingProps> = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [userData, setUserData] = useLocalStorage<UserOnboardingData>('cmo-onboarding-data', {});
  const [isAnimating, setIsAnimating] = useState(false);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep + 1);
        setIsAnimating(false);
      }, 300);
    } else {
      completeOnboarding();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(currentStep - 1);
        setIsAnimating(false);
      }, 300);
    }
  };

  const updateUserData = (data: Partial<UserOnboardingData>) => {
    setUserData(prev => ({ ...prev, ...data }));
  };

  const completeOnboarding = () => {
    // Track completion
    toolAnalyticsService.trackEvent({
      toolId: 'cmo-onboarding',
      userId: userData.name || 'anonymous',
      eventType: 'complete',
      metadata: { userData }
    });

    // Mark as completed
    localStorage.setItem('cmo-onboarding-completed', 'true');
    
    onComplete();
  };

  const currentStepData = ONBOARDING_STEPS[currentStep];
  const StepContent = currentStepData.content;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-gradient-to-br from-primary/10 to-purple-600/10 flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-purple-600 text-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <currentStepData.icon className="w-8 h-8" />
              <div>
                <h2 className="text-2xl font-bold">{currentStepData.title}</h2>
                <p className="text-white/80">{currentStepData.description}</p>
              </div>
            </div>
            {onSkip && (
              <button
                onClick={onSkip}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          
          {/* Progress bar */}
          <div className="flex items-center gap-2">
            {ONBOARDING_STEPS.map((step, index) => (
              <div
                key={step.id}
                className={cn(
                  "flex-1 h-2 rounded-full transition-all",
                  index < currentStep ? "bg-white" :
                  index === currentStep ? "bg-white/60" :
                  "bg-white/20"
                )}
              />
            ))}
          </div>
          <div className="flex items-center justify-between mt-2 text-sm">
            <span>Step {currentStep + 1} of {ONBOARDING_STEPS.length}</span>
            <span>{currentStepData.duration}</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <AnimatePresence mode="wait">
            {!isAnimating && (
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <StepContent
                  onNext={handleNext}
                  onBack={currentStep > 0 ? handleBack : undefined}
                  userData={userData}
                  updateUserData={updateUserData}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

// Step Components

function WelcomeStep({ onNext }: OnboardingStepProps) {
  return (
    <div className="text-center space-y-6 py-8">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="w-24 h-24 bg-gradient-to-br from-primary to-purple-600 rounded-full mx-auto flex items-center justify-center"
      >
        <Sparkles className="w-12 h-12 text-white" />
      </motion.div>
      
      <div className="space-y-4">
        <h3 className="text-3xl font-bold">Welcome to CMO Mode!</h3>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Transform your marketing with AI-powered tools, intelligent workflows, and data-driven insights.
          Let's get you set up in just a few minutes.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <FeatureCard
          icon={Zap}
          title="30+ Marketing Tools"
          description="SEO, social media, email, and more"
        />
        <FeatureCard
          icon={TrendingUp}
          title="AI-Powered Insights"
          description="Smart recommendations and analysis"
        />
        <FeatureCard
          icon={BarChart3}
          title="Track Performance"
          description="Real-time analytics and reporting"
        />
      </div>

      <button
        onClick={onNext}
        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
      >
        Get Started
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function ProfileStep({ onNext, onBack, userData, updateUserData }: OnboardingStepProps) {
  const [formData, setFormData] = useState({
    name: userData.name || '',
    role: userData.role || '',
    experience: userData.experience || 'intermediate',
    industry: userData.industry || '',
    teamSize: userData.teamSize || ''
  });

  const roles = [
    'CMO', 'Marketing Manager', 'Marketing Director', 
    'Digital Marketing Manager', 'Content Manager', 'Growth Manager', 'Other'
  ];

  const industries = [
    'Technology', 'E-commerce', 'Healthcare', 'Finance', 
    'Education', 'Media', 'Retail', 'Other'
  ];

  const teamSizes = [
    'Just me', '2-5 people', '6-10 people', '11-20 people', '20+ people'
  ];

  const handleSubmit = () => {
    updateUserData(formData);
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold mb-2">Let's personalize your experience</h3>
        <p className="text-gray-600 dark:text-gray-400">
          This helps us recommend the right tools and workflows for you.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Your Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Your Role</label>
          <select
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Select your role</option>
            {roles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Experience Level</label>
          <div className="grid grid-cols-3 gap-3">
            {['beginner', 'intermediate', 'advanced'].map(level => (
              <button
                key={level}
                onClick={() => setFormData({ ...formData, experience: level as any })}
                className={cn(
                  "py-2 px-4 rounded-lg border transition-colors capitalize",
                  formData.experience === level
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-gray-300 dark:border-gray-600"
                )}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Industry</label>
          <select
            value={formData.industry}
            onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Select your industry</option>
            {industries.map(industry => (
              <option key={industry} value={industry}>{industry}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Team Size</label>
          <select
            value={formData.teamSize}
            onChange={(e) => setFormData({ ...formData, teamSize: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Select team size</option>
            {teamSizes.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-between">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
        )}
        <button
          onClick={handleSubmit}
          className="ml-auto flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90"
          disabled={!formData.name || !formData.role}
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function GoalsStep({ onNext, onBack, userData, updateUserData }: OnboardingStepProps) {
  const [selectedGoals, setSelectedGoals] = useState<string[]>(userData.goals || []);
  const [selectedChallenges, setSelectedChallenges] = useState<string[]>(userData.challenges || []);

  const goals = [
    { id: 'increase-traffic', label: 'Increase website traffic', icon: TrendingUp },
    { id: 'improve-seo', label: 'Improve SEO rankings', icon: BarChart3 },
    { id: 'social-growth', label: 'Grow social media presence', icon: Users },
    { id: 'lead-generation', label: 'Generate more leads', icon: Target },
    { id: 'brand-awareness', label: 'Build brand awareness', icon: Award },
    { id: 'content-marketing', label: 'Enhance content marketing', icon: BookOpen }
  ];

  const challenges = [
    'Limited time/resources',
    'Measuring ROI',
    'Keeping up with trends',
    'Content creation',
    'Technical complexity',
    'Team coordination'
  ];

  const toggleGoal = (goalId: string) => {
    setSelectedGoals(prev =>
      prev.includes(goalId)
        ? prev.filter(id => id !== goalId)
        : [...prev, goalId]
    );
  };

  const toggleChallenge = (challenge: string) => {
    setSelectedChallenges(prev =>
      prev.includes(challenge)
        ? prev.filter(c => c !== challenge)
        : [...prev, challenge]
    );
  };

  const handleSubmit = () => {
    updateUserData({
      goals: selectedGoals,
      challenges: selectedChallenges
    });
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold mb-2">What are your marketing goals?</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Select all that apply. We'll recommend tools to help you achieve them.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {goals.map(goal => {
          const Icon = goal.icon;
          const isSelected = selectedGoals.includes(goal.id);
          
          return (
            <button
              key={goal.id}
              onClick={() => toggleGoal(goal.id)}
              className={cn(
                "flex items-center gap-3 p-4 rounded-lg border transition-all text-left",
                isSelected
                  ? "border-primary bg-primary/10"
                  : "border-gray-300 dark:border-gray-600 hover:border-gray-400"
              )}
            >
              <Icon className={cn(
                "w-5 h-5",
                isSelected ? "text-primary" : "text-gray-500"
              )} />
              <span className={cn(
                "flex-1",
                isSelected && "text-primary font-medium"
              )}>
                {goal.label}
              </span>
              {isSelected && <Check className="w-5 h-5 text-primary" />}
            </button>
          );
        })}
      </div>

      <div className="mt-8">
        <h4 className="text-lg font-semibold mb-3">What are your biggest challenges?</h4>
        <div className="flex flex-wrap gap-2">
          {challenges.map(challenge => {
            const isSelected = selectedChallenges.includes(challenge);
            
            return (
              <button
                key={challenge}
                onClick={() => toggleChallenge(challenge)}
                className={cn(
                  "px-4 py-2 rounded-full border transition-all",
                  isSelected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-gray-300 dark:border-gray-600"
                )}
              >
                {challenge}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-between">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
        )}
        <button
          onClick={handleSubmit}
          className="ml-auto flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90"
          disabled={selectedGoals.length === 0}
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ToolsIntroStep({ onNext, onBack, userData, updateUserData }: OnboardingStepProps) {
  const [selectedTools, setSelectedTools] = useState<string[]>(userData.preferredTools || []);
  
  // Get recommended tools based on goals
  const recommendedTools = getRecommendedTools(userData.goals || []);

  const toggleTool = (toolId: string) => {
    setSelectedTools(prev =>
      prev.includes(toolId)
        ? prev.filter(id => id !== toolId)
        : [...prev, toolId]
    );
  };

  const handleSubmit = () => {
    updateUserData({ preferredTools: selectedTools });
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold mb-2">Your Recommended Tools</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Based on your goals, we recommend starting with these tools. You can always explore more later!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recommendedTools.map(tool => {
          const isSelected = selectedTools.includes(tool.id);
          
          return (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "p-4 rounded-lg border cursor-pointer transition-all",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-gray-300 dark:border-gray-600"
              )}
              onClick={() => toggleTool(tool.id)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    tool.color || "bg-primary/10"
                  )}>
                    <tool.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">{tool.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {tool.category}
                    </p>
                  </div>
                </div>
                {isSelected && <Check className="w-5 h-5 text-primary" />}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {tool.description}
              </p>
              {tool.matchReason && (
                <p className="text-xs text-primary mt-2">
                  ✨ {tool.matchReason}
                </p>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          💡 <strong>Tip:</strong> Start with 3-5 tools to avoid overwhelm. You can always add more as you get comfortable!
        </p>
      </div>

      <div className="flex justify-between">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
        )}
        <button
          onClick={handleSubmit}
          className="ml-auto flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90"
          disabled={selectedTools.length === 0}
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function PracticeStep({ onNext, onBack, userData }: OnboardingStepProps) {
  const [scenario, setScenario] = useState<'seo' | 'social' | 'email'>('seo');
  const [completed, setCompleted] = useState(false);

  const scenarios = {
    seo: {
      title: 'Optimize a Blog Post Title',
      description: 'Use the Title Tag Tester to create an SEO-friendly title',
      steps: [
        'Open the Title Tag Tester tool',
        'Enter your draft title',
        'Review the suggestions',
        'Apply improvements',
        'Save your optimized title'
      ]
    },
    social: {
      title: 'Generate Hashtags for Instagram',
      description: 'Use the Hashtag Generator to find trending tags',
      steps: [
        'Open the Hashtag Generator',
        'Enter your post topic',
        'Select relevant hashtags',
        'Copy the hashtag set',
        'Use in your post'
      ]
    },
    email: {
      title: 'Test Email Subject Lines',
      description: 'Use the Email Subject Tester to improve open rates',
      steps: [
        'Open the Email Subject Tester',
        'Enter your subject line',
        'Review the analysis',
        'Try variations',
        'Choose the best option'
      ]
    }
  };

  const currentScenario = scenarios[scenario];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold mb-2">Let's Practice!</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Try a quick scenario to get familiar with the tools.
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        {Object.entries(scenarios).map(([key, s]) => (
          <button
            key={key}
            onClick={() => setScenario(key as any)}
            className={cn(
              "px-4 py-2 rounded-lg transition-colors",
              scenario === key
                ? "bg-primary text-white"
                : "bg-gray-200 dark:bg-gray-700"
            )}
          >
            {s.title.split(' ')[0]}
          </button>
        ))}
      </div>

      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
        <h4 className="text-lg font-semibold mb-2">{currentScenario.title}</h4>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {currentScenario.description}
        </p>

        <div className="space-y-2">
          {currentScenario.steps.map((step, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs",
                completed ? "bg-green-500 text-white" : "bg-gray-300 dark:bg-gray-600"
              )}>
                {completed ? <Check className="w-4 h-4" /> : index + 1}
              </div>
              <span className={cn(
                "text-sm",
                completed && "line-through text-gray-500"
              )}>
                {step}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={() => setCompleted(true)}
          className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          disabled={completed}
        >
          {completed ? 'Completed!' : 'Mark as Complete'}
        </button>
      </div>

      <div className="flex justify-between">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
        )}
        <button
          onClick={onNext}
          className="ml-auto flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90"
        >
          {completed ? 'Finish' : 'Skip Practice'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function CompleteStep({ onNext, userData }: OnboardingStepProps) {
  const tips = [
    {
      icon: Zap,
      title: 'Quick Access',
      description: 'Use ⌘K to quickly search and open tools'
    },
    {
      icon: BookOpen,
      title: 'Learn More',
      description: 'Each tool has built-in tutorials and tips'
    },
    {
      icon: TrendingUp,
      title: 'Track Progress',
      description: 'Monitor your marketing performance in real-time'
    }
  ];

  return (
    <div className="text-center space-y-6 py-8">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="w-24 h-24 bg-gradient-to-br from-green-500 to-green-600 rounded-full mx-auto flex items-center justify-center"
      >
        <Check className="w-12 h-12 text-white" />
      </motion.div>

      <div>
        <h3 className="text-3xl font-bold mb-2">Welcome aboard, {userData.name}!</h3>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          You're all set to supercharge your marketing with CMO Mode.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        {tips.map((tip, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800"
          >
            <tip.icon className="w-8 h-8 text-primary mx-auto mb-2" />
            <h4 className="font-semibold mb-1">{tip.title}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {tip.description}
            </p>
          </motion.div>
        ))}
      </div>

      <button
        onClick={onNext}
        className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-primary to-purple-600 text-white rounded-lg hover:shadow-lg transition-all transform hover:scale-105"
      >
        <Rocket className="w-5 h-5" />
        Start Marketing
      </button>
    </div>
  );
}

// Helper components
function FeatureCard({ icon: Icon, title, description }: any) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 text-center"
    >
      <Icon className="w-8 h-8 text-primary mx-auto mb-2" />
      <h4 className="font-semibold mb-1">{title}</h4>
      <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
    </motion.div>
  );
}

// Helper function to get recommended tools based on goals
function getRecommendedTools(goals: string[]) {
  const toolRecommendations: Record<string, any[]> = {
    'increase-traffic': [
      { id: 'title-tag-tester', matchReason: 'Improve search visibility' },
      { id: 'keyword-density-analyzer', matchReason: 'Optimize content for search' }
    ],
    'improve-seo': [
      { id: 'schema-markup-generator', matchReason: 'Enhance search results' },
      { id: 'backlink-checker', matchReason: 'Build domain authority' }
    ],
    'social-growth': [
      { id: 'hashtag-generator', matchReason: 'Increase discoverability' },
      { id: 'content-calendar', matchReason: 'Plan consistent posting' }
    ],
    'lead-generation': [
      { id: 'campaign-builder', matchReason: 'Create targeted campaigns' },
      { id: 'conversion-optimizer', matchReason: 'Improve conversion rates' }
    ],
    'brand-awareness': [
      { id: 'social-preview-tool', matchReason: 'Perfect your social presence' },
      { id: 'brand-voice-analyzer', matchReason: 'Maintain consistency' }
    ],
    'content-marketing': [
      { id: 'content-idea-generator', matchReason: 'Never run out of ideas' },
      { id: 'trend-analyzer', matchReason: 'Create timely content' }
    ]
  };

  const recommendedToolIds = new Set<string>();
  const recommendations: any[] = [];

  goals.forEach(goal => {
    const tools = toolRecommendations[goal] || [];
    tools.forEach(tool => {
      if (!recommendedToolIds.has(tool.id)) {
        recommendedToolIds.add(tool.id);
        // Add full tool data here (would come from tool registry)
        recommendations.push({
          ...tool,
          name: tool.id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
          description: 'Marketing tool description',
          category: 'Marketing',
          icon: Zap // Would be actual icon
        });
      }
    });
  });

  return recommendations.slice(0, 6); // Limit to 6 recommendations
}

export default CMOOnboarding;