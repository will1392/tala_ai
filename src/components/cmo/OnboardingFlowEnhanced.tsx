import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, ArrowRight, Check, Play, ChevronLeft,
  Zap, Target, TrendingUp, Users, BarChart3, Award,
  BookOpen, MessageCircle, Mail, Hash, Send, X, Rocket
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { useNotifications } from './NotificationSystem';
import { ConversationBadge } from './VisualContextCues';
import { CMOProgressIndicator } from './NotificationSystem';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  type: 'welcome' | 'feature' | 'interactive' | 'practice' | 'complete';
  content: React.ComponentType<OnboardingStepProps>;
  duration?: string;
  icon?: React.ComponentType<any>;
}

interface OnboardingStepProps {
  onNext: () => void;
  onBack?: () => void;
  onSkip?: () => void;
  userData: UserOnboardingData;
  updateUserData: (data: Partial<UserOnboardingData>) => void;
  currentStep: number;
  totalSteps: number;
}

interface UserOnboardingData {
  name?: string;
  role?: string;
  experience?: 'beginner' | 'intermediate' | 'advanced';
  goals?: string[];
  industry?: string;
  teamSize?: string;
  preferredChannels?: string[];
  completedSteps?: string[];
  practiceProgress?: Record<string, boolean>;
}

// Enhanced onboarding steps
const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to CMO Mode',
    description: 'Your AI-powered marketing command center',
    type: 'welcome',
    content: WelcomeStep,
    icon: Sparkles
  },
  {
    id: 'mode-overview',
    title: 'Understanding CMO Mode',
    description: 'Learn how CMO mode transforms your marketing',
    type: 'feature',
    content: ModeOverviewStep,
    icon: Zap
  },
  {
    id: 'channels',
    title: 'Marketing Channels',
    description: 'Explore available marketing channels',
    type: 'interactive',
    content: ChannelsStep,
    icon: Target
  },
  {
    id: 'tools-intro',
    title: 'Powerful Tools',
    description: 'Discover your marketing toolkit',
    type: 'feature',
    content: ToolsIntroStep,
    icon: BarChart3
  },
  {
    id: 'workflow',
    title: 'Your First Workflow',
    description: 'Learn by doing with a real example',
    type: 'interactive',
    content: WorkflowStep,
    icon: TrendingUp
  },
  {
    id: 'practice',
    title: 'Practice Scenarios',
    description: 'Try different marketing tasks',
    type: 'practice',
    content: PracticeStep,
    icon: Play
  },
  {
    id: 'complete',
    title: 'Ready to Launch!',
    description: 'Start your marketing journey',
    type: 'complete',
    content: CompleteStep,
    icon: Award
  }
];

export const OnboardingFlowEnhanced: React.FC<{
  onComplete: () => void;
  onSkip?: () => void;
}> = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [userData, setUserData] = useLocalStorage<UserOnboardingData>('cmo-onboarding-data', {});
  const [isAnimating, setIsAnimating] = useState(false);
  const { addNotification } = useNotifications();

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setIsAnimating(true);
      
      // Mark step as completed
      const completedSteps = userData.completedSteps || [];
      completedSteps.push(ONBOARDING_STEPS[currentStep].id);
      updateUserData({ completedSteps });

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

  const handleSkip = () => {
    addNotification({
      type: 'info',
      title: 'Onboarding Skipped',
      message: 'You can restart the onboarding anytime from settings'
    });
    onSkip?.();
  };

  const updateUserData = (data: Partial<UserOnboardingData>) => {
    setUserData(prev => ({ ...prev, ...data }));
  };

  const completeOnboarding = () => {
    updateUserData({ 
      completedSteps: ONBOARDING_STEPS.map(s => s.id) 
    });
    
    addNotification({
      type: 'achievement',
      title: 'Onboarding Complete!',
      message: 'You\'re ready to supercharge your marketing'
    });

    onComplete();
  };

  const currentStepData = ONBOARDING_STEPS[currentStep];
  const StepContent = currentStepData.content;
  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-gradient-to-br from-primary/5 to-purple-600/5 flex items-center justify-center p-4"
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-purple-600 text-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {currentStepData.icon && (
                <currentStepData.icon className="w-8 h-8" />
              )}
              <div>
                <h2 className="text-2xl font-bold">{currentStepData.title}</h2>
                <p className="text-white/80">{currentStepData.description}</p>
              </div>
            </div>
            {onSkip && currentStep < ONBOARDING_STEPS.length - 1 && (
              <button
                onClick={handleSkip}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          
          {/* Progress */}
          <CMOProgressIndicator
            value={progress}
            max={100}
            variant="linear"
            size="sm"
            animated
          />
          <div className="flex items-center justify-between mt-2 text-sm">
            <span>Step {currentStep + 1} of {ONBOARDING_STEPS.length}</span>
            <span>{currentStepData.duration || '2-3 min'}</span>
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
                  onSkip={onSkip}
                  userData={userData}
                  updateUserData={updateUserData}
                  currentStep={currentStep}
                  totalSteps={ONBOARDING_STEPS.length}
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

function WelcomeStep({ onNext, userData, updateUserData }: OnboardingStepProps) {
  const [name, setName] = useState(userData.name || '');
  const [role, setRole] = useState(userData.role || '');

  const handleContinue = () => {
    updateUserData({ name, role });
    onNext();
  };

  return (
    <div className="text-center space-y-6 py-8">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="w-32 h-32 bg-gradient-to-br from-primary to-purple-600 rounded-full mx-auto flex items-center justify-center"
      >
        <Sparkles className="w-16 h-16 text-white" />
      </motion.div>

      <div className="space-y-4 max-w-2xl mx-auto">
        <h3 className="text-3xl font-bold">Welcome to Your Marketing Command Center!</h3>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          CMO Mode transforms how you approach marketing with AI-powered tools, 
          intelligent workflows, and data-driven insights.
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2 text-left">
            What should we call you?
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-left">
            What's your role?
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Select your role</option>
            <option value="cmo">CMO / Marketing Executive</option>
            <option value="manager">Marketing Manager</option>
            <option value="specialist">Marketing Specialist</option>
            <option value="entrepreneur">Entrepreneur / Founder</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <button
        onClick={handleContinue}
        disabled={!name || !role}
        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Let's Get Started
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

function ModeOverviewStep({ onNext, onBack }: OnboardingStepProps) {
  const features = [
    {
      icon: Zap,
      title: 'Context-Aware Intelligence',
      description: 'CMO Mode understands marketing context and provides specialized insights'
    },
    {
      icon: Target,
      title: 'Multi-Channel Mastery',
      description: 'Seamlessly work across SEO, Email, Social Media, and Direct Mail'
    },
    {
      icon: BarChart3,
      title: 'Data-Driven Decisions',
      description: 'Get real-time analytics and performance tracking'
    },
    {
      icon: Users,
      title: 'Audience Understanding',
      description: 'Deep insights into your target audience and customer journey'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold mb-2">CMO Mode is Different</h3>
        <p className="text-gray-600 dark:text-gray-400">
          It's not just chat - it's your complete marketing workspace
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold mb-1">{feature.title}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex justify-between mt-8">
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
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ChannelsStep({ onNext, onBack, userData, updateUserData }: OnboardingStepProps) {
  const [selectedChannels, setSelectedChannels] = useState<string[]>(
    userData.preferredChannels || []
  );

  const channels = [
    {
      id: 'seo',
      name: 'SEO',
      icon: TrendingUp,
      description: 'Search engine optimization',
      examples: ['Keyword research', 'On-page optimization', 'Link building']
    },
    {
      id: 'email',
      name: 'Email',
      icon: Mail,
      description: 'Email marketing campaigns',
      examples: ['Newsletters', 'Automation', 'A/B testing']
    },
    {
      id: 'social',
      name: 'Social Media',
      icon: Hash,
      description: 'Social media marketing',
      examples: ['Content creation', 'Engagement', 'Analytics']
    },
    {
      id: 'directmail',
      name: 'Direct Mail',
      icon: Send,
      description: 'Physical mail campaigns',
      examples: ['Postcards', 'Letters', 'Catalogs']
    }
  ];

  const toggleChannel = (channelId: string) => {
    setSelectedChannels(prev => 
      prev.includes(channelId)
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    );
  };

  const handleContinue = () => {
    updateUserData({ preferredChannels: selectedChannels });
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold mb-2">Choose Your Marketing Channels</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Select the channels you work with (you can change this later)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {channels.map((channel) => {
          const isSelected = selectedChannels.includes(channel.id);
          
          return (
            <motion.div
              key={channel.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => toggleChannel(channel.id)}
              className={cn(
                "cursor-pointer rounded-lg border-2 p-6 transition-all",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-gray-300 dark:border-gray-600 hover:border-gray-400"
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <channel.icon className={cn(
                    "w-6 h-6",
                    isSelected ? "text-primary" : "text-gray-500"
                  )} />
                  <h4 className="font-semibold">{channel.name}</h4>
                </div>
                {isSelected && <Check className="w-5 h-5 text-primary" />}
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {channel.description}
              </p>
              
              <div className="space-y-1">
                {channel.examples.map(example => (
                  <div key={example} className="flex items-center gap-2 text-xs">
                    <div className="w-1 h-1 bg-gray-400 rounded-full" />
                    <span className="text-gray-500">{example}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="flex justify-between mt-8">
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
          onClick={handleContinue}
          className="ml-auto flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90"
          disabled={selectedChannels.length === 0}
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ToolsIntroStep({ onNext, onBack }: OnboardingStepProps) {
  const toolCategories = [
    {
      name: 'Content Creation',
      tools: ['AI Writer', 'Image Generator', 'Video Scripts'],
      icon: BookOpen
    },
    {
      name: 'Analytics & Insights',
      tools: ['Performance Tracker', 'ROI Calculator', 'Competitor Analysis'],
      icon: BarChart3
    },
    {
      name: 'Campaign Management',
      tools: ['Campaign Builder', 'A/B Testing', 'Automation'],
      icon: Target
    },
    {
      name: 'Optimization',
      tools: ['SEO Analyzer', 'Email Optimizer', 'Landing Pages'],
      icon: Zap
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold mb-2">Your Marketing Toolkit</h3>
        <p className="text-gray-600 dark:text-gray-400">
          30+ specialized tools at your fingertips
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {toolCategories.map((category, index) => (
          <motion.div
            key={category.name}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-lg p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <category.icon className="w-5 h-5 text-primary" />
              </div>
              <h4 className="font-semibold">{category.name}</h4>
            </div>
            
            <div className="space-y-2">
              {category.tools.map(tool => (
                <div key={tool} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm">{tool}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          💡 <strong>Pro Tip:</strong> Use ⌘K (or Ctrl+K) to quickly search and access any tool
        </p>
      </div>

      <div className="flex justify-between mt-8">
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
          Let's Try It
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function WorkflowStep({ onNext, onBack }: OnboardingStepProps) {
  const [currentPhase, setCurrentPhase] = useState(0);
  
  const workflow = [
    {
      phase: 'Ask',
      action: 'Type your marketing question',
      example: '"I need to create an email campaign for our summer sale"',
      icon: MessageCircle
    },
    {
      phase: 'Analyze',
      action: 'CMO Mode understands your context',
      example: 'Identifies: Email channel, promotional campaign, seasonal timing',
      icon: Zap
    },
    {
      phase: 'Suggest',
      action: 'Get tailored recommendations',
      example: 'Subject lines, content ideas, sending times, A/B tests',
      icon: Target
    },
    {
      phase: 'Execute',
      action: 'Use tools to implement',
      example: 'Email builder, spam checker, preview tool',
      icon: Play
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold mb-2">How CMO Mode Works</h3>
        <p className="text-gray-600 dark:text-gray-400">
          A simple workflow that adapts to your needs
        </p>
      </div>

      <div className="max-w-3xl mx-auto">
        {workflow.map((step, index) => (
          <motion.div
            key={step.phase}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.2 }}
            className={cn(
              "flex items-start gap-4 p-4 rounded-lg mb-4 cursor-pointer transition-all",
              currentPhase === index
                ? "bg-primary/10 border-2 border-primary"
                : "bg-gray-50 dark:bg-gray-800 hover:bg-gray-100"
            )}
            onClick={() => setCurrentPhase(index)}
          >
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
              currentPhase === index
                ? "bg-primary text-white"
                : "bg-gray-200 dark:bg-gray-700"
            )}>
              <step.icon className="w-6 h-6" />
            </div>
            
            <div className="flex-1">
              <h4 className="font-semibold mb-1">
                {index + 1}. {step.phase}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {step.action}
              </p>
              {currentPhase === index && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-white dark:bg-gray-700 p-3 rounded-md"
                >
                  <p className="text-xs font-mono">{step.example}</p>
                </motion.div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex justify-between mt-8">
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
          Practice Time
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function PracticeStep({ onNext, onBack, userData, updateUserData }: OnboardingStepProps) {
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [practiceProgress, setPracticeProgress] = useState(
    userData.practiceProgress || {}
  );

  const scenarios = [
    {
      id: 'email-welcome',
      title: 'Create a Welcome Email',
      description: 'Design an engaging welcome email for new subscribers',
      channel: 'email',
      difficulty: 'beginner',
      steps: [
        'Define your audience',
        'Write subject line',
        'Create email content',
        'Add call-to-action'
      ]
    },
    {
      id: 'seo-blog',
      title: 'Optimize Blog Post',
      description: 'Improve SEO for a blog post to rank higher',
      channel: 'seo',
      difficulty: 'intermediate',
      steps: [
        'Research keywords',
        'Optimize title tag',
        'Improve meta description',
        'Add internal links'
      ]
    },
    {
      id: 'social-campaign',
      title: 'Launch Social Campaign',
      description: 'Create a multi-platform social media campaign',
      channel: 'social',
      difficulty: 'advanced',
      steps: [
        'Define campaign goals',
        'Create content calendar',
        'Design visuals',
        'Schedule posts'
      ]
    }
  ];

  const completeScenario = (scenarioId: string) => {
    const newProgress = { ...practiceProgress, [scenarioId]: true };
    setPracticeProgress(newProgress);
    updateUserData({ practiceProgress: newProgress });
    setSelectedScenario(null);
  };

  const handleContinue = () => {
    onNext();
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold mb-2">Practice Makes Perfect</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Try these real-world scenarios to get comfortable
        </p>
      </div>

      {!selectedScenario ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {scenarios.map(scenario => {
            const isCompleted = practiceProgress[scenario.id];
            
            return (
              <motion.div
                key={scenario.id}
                whileHover={{ scale: 1.05 }}
                className={cn(
                  "cursor-pointer rounded-lg border-2 p-6 transition-all",
                  isCompleted
                    ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                    : "border-gray-300 dark:border-gray-600 hover:border-primary"
                )}
                onClick={() => !isCompleted && setSelectedScenario(scenario.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <ConversationBadge type={scenario.channel as any} size="sm" />
                  {isCompleted && <Check className="w-5 h-5 text-green-500" />}
                </div>
                
                <h4 className="font-semibold mb-2">{scenario.title}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {scenario.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <span className={cn(
                    "text-xs px-2 py-1 rounded-full",
                    scenario.difficulty === 'beginner' ? "bg-green-100 text-green-700" :
                    scenario.difficulty === 'intermediate' ? "bg-orange-100 text-orange-700" :
                    "bg-red-100 text-red-700"
                  )}>
                    {scenario.difficulty}
                  </span>
                  <span className="text-xs text-gray-500">
                    {scenario.steps.length} steps
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <PracticeScenario
          scenario={scenarios.find(s => s.id === selectedScenario)!}
          onComplete={() => completeScenario(selectedScenario)}
          onBack={() => setSelectedScenario(null)}
        />
      )}

      <div className="flex justify-between mt-8">
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
          onClick={handleContinue}
          className="ml-auto flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90"
        >
          {Object.keys(practiceProgress).length === 0 ? 'Skip Practice' : 'Continue'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function CompleteStep({ onNext, userData }: OnboardingStepProps) {
  const achievements = [
    { title: 'Quick Learner', description: 'Completed onboarding', icon: Award },
    { title: 'Explorer', description: 'Discovered CMO Mode features', icon: Target },
    { title: 'Ready to Launch', description: 'Prepared for marketing success', icon: Rocket }
  ];

  return (
    <div className="text-center space-y-6 py-8">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="w-32 h-32 bg-gradient-to-br from-green-500 to-green-600 rounded-full mx-auto flex items-center justify-center"
      >
        <Check className="w-16 h-16 text-white" />
      </motion.div>

      <div>
        <h3 className="text-3xl font-bold mb-2">
          Congratulations, {userData.name || 'Marketer'}!
        </h3>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          You're ready to revolutionize your marketing with CMO Mode
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
        {achievements.map((achievement, index) => (
          <motion.div
            key={achievement.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-lg p-4"
          >
            <achievement.icon className="w-8 h-8 text-primary mx-auto mb-2" />
            <h4 className="font-semibold">{achievement.title}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {achievement.description}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="space-y-4 max-w-xl mx-auto">
        <div className="bg-primary/10 p-4 rounded-lg">
          <h4 className="font-semibold mb-2">What's Next?</h4>
          <ul className="text-sm text-left space-y-2">
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-primary mt-0.5" />
              <span>Start a conversation and watch CMO Mode in action</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-primary mt-0.5" />
              <span>Explore tools with ⌘K shortcut</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-primary mt-0.5" />
              <span>Check your dashboard for insights</span>
            </li>
          </ul>
        </div>
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

// Practice scenario component
function PracticeScenario({ 
  scenario, 
  onComplete, 
  onBack 
}: {
  scenario: any;
  onComplete: () => void;
  onBack: () => void;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);

  const completeStep = () => {
    if (currentStep < scenario.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setCompleted(true);
      setTimeout(onComplete, 1500);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h4 className="text-xl font-semibold mb-2">{scenario.title}</h4>
        <p className="text-gray-600 dark:text-gray-400">{scenario.description}</p>
      </div>

      <div className="space-y-3 mb-6">
        {scenario.steps.map((step: string, index: number) => (
          <div
            key={index}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg transition-all",
              index < currentStep ? "bg-green-50 dark:bg-green-900/20" :
              index === currentStep ? "bg-blue-50 dark:bg-blue-900/20" :
              "bg-gray-50 dark:bg-gray-800"
            )}
          >
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
              index < currentStep ? "bg-green-500 text-white" :
              index === currentStep ? "bg-blue-500 text-white" :
              "bg-gray-300 dark:bg-gray-600"
            )}>
              {index < currentStep ? <Check className="w-4 h-4" /> : index + 1}
            </div>
            <span className={cn(
              index <= currentStep ? "text-gray-900 dark:text-white" : "text-gray-500"
            )}>
              {step}
            </span>
          </div>
        ))}
      </div>

      {completed ? (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="text-center py-8"
        >
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-10 h-10 text-white" />
          </div>
          <p className="text-lg font-semibold">Scenario Complete!</p>
        </motion.div>
      ) : (
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
          <h5 className="font-medium mb-3">Step {currentStep + 1}: {scenario.steps[currentStep]}</h5>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            In a real scenario, you would use CMO Mode's tools to complete this step.
            For now, click "Complete Step" to continue.
          </p>
          <button
            onClick={completeStep}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Complete Step
          </button>
        </div>
      )}

      {!completed && (
        <button
          onClick={onBack}
          className="mt-4 text-sm text-gray-600 hover:text-gray-800"
        >
          ← Back to scenarios
        </button>
      )}
    </div>
  );
}

// Export component
export default OnboardingFlowEnhanced;