/**
 * UserProfileOnboarding - Initial user profile setup
 * Collects basic information about the user and their business
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, User, Building, Target, DollarSign, Users } from 'lucide-react';
import { ProgressBar } from '../cmo/onboarding/ProgressBar';

export interface UserProfile {
  name: string;
  role: 'agent' | 'agency_owner';
  companyName?: string;
  employees?: number;
  monthlyMarketingBudget?: string;
  clientTypes?: string[];
  idealClient: {
    averageProjectValue?: string;
    description?: string;
  };
  businessGoals: string[];
  currentChallenges: string[];
}

interface UserProfileOnboardingProps {
  onComplete: (profile: UserProfile) => void;
  onSkip?: () => void;
  initialData?: Partial<UserProfile>;
}

export const UserProfileOnboarding: React.FC<UserProfileOnboardingProps> = ({
  onComplete,
  onSkip,
  initialData = {}
}) => {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Partial<UserProfile>>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onSkip) {
        onSkip();
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [onSkip]);

  const steps = [
    {
      key: 'personal',
      title: 'Nice to meet you!',
      subtitle: "Let's start with the basics so I can personalize our conversations",
      icon: User
    },
    {
      key: 'role',
      title: 'What\'s your role?',
      subtitle: 'This helps me understand your perspective and responsibilities',
      icon: Building
    },
    {
      key: 'business',
      title: 'Tell me about your business',
      subtitle: 'Understanding your business context helps me provide better guidance',
      icon: Target
    },
    {
      key: 'clients',
      title: 'Who do you love working with?',
      subtitle: 'Understanding your ideal travelers helps me tailor marketing strategies',
      icon: Users
    },
    {
      key: 'goals',
      title: 'What are your main goals?',
      subtitle: 'Understanding your objectives helps me prioritize the right advice',
      icon: DollarSign
    }
  ];

  const currentStep = steps[step];
  const isLastStep = step === steps.length - 1;
  const canGoBack = step > 0;

  const updateProfile = (key: string, value: any) => {
    setProfile(prev => ({ ...prev, [key]: value }));
  };

  const updateNestedProfile = (parentKey: string, childKey: string, value: any) => {
    setProfile(prev => ({
      ...prev,
      [parentKey]: {
        ...prev[parentKey],
        [childKey]: value
      }
    }));
  };

  const toggleArrayItem = (key: string, value: string) => {
    setProfile(prev => ({
      ...prev,
      [key]: prev[key]?.includes(value)
        ? prev[key].filter((item: string) => item !== value)
        : [...(prev[key] || []), value]
    }));
  };

  const goNext = () => {
    if (!isLastStep) {
      setStep(prev => prev + 1);
    }
  };

  const goBack = () => {
    if (canGoBack) {
      setStep(prev => prev - 1);
    }
  };

  const handleComplete = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onComplete(profile as UserProfile);
    } catch (error) {
      console.error('Error completing user profile:', error);
      setIsSubmitting(false);
    }
  };

  const canContinue = () => {
    switch (step) {
      case 0: return profile.name?.trim();
      case 1: return profile.role;
      case 2: return true; // Business info is optional
      case 3: return true; // Client info is optional
      case 4: return true; // Goals are optional
      default: return false;
    }
  };

  const budgetRanges = [
    { value: 'under-1k', label: 'Under $1,000/month' },
    { value: '1k-5k', label: '$1,000 - $5,000/month' },
    { value: '5k-10k', label: '$5,000 - $10,000/month' },
    { value: '10k-25k', label: '$10,000 - $25,000/month' },
    { value: '25k-50k', label: '$25,000 - $50,000/month' },
    { value: 'over-50k', label: 'Over $50,000/month' }
  ];

  const clientTypes = [
    { value: 'leisure', label: 'Leisure Travelers' },
    { value: 'luxury', label: 'Luxury Travelers' },
    { value: 'adventure', label: 'Adventure Seekers' },
    { value: 'family', label: 'Families with Children' },
    { value: 'senior', label: 'Senior Travelers' },
    { value: 'honeymoon', label: 'Honeymooners & Couples' },
    { value: 'group', label: 'Group Travel' },
    { value: 'corporate', label: 'Corporate/Business Travel' }
  ];

  const businessGoals = [
    { value: 'increase-leads', label: 'Generate more qualified leads' },
    { value: 'improve-conversion', label: 'Improve conversion rates' },
    { value: 'build-brand', label: 'Build brand awareness' },
    { value: 'expand-market', label: 'Expand to new markets' },
    { value: 'retain-clients', label: 'Improve client retention' },
    { value: 'increase-revenue', label: 'Increase revenue per client' },
    { value: 'streamline-operations', label: 'Streamline marketing operations' },
    { value: 'improve-roi', label: 'Improve marketing ROI' }
  ];

  const challenges = [
    { value: 'limited-budget', label: 'Limited marketing budget' },
    { value: 'lack-expertise', label: 'Lack of marketing expertise' },
    { value: 'time-constraints', label: 'Not enough time for marketing' },
    { value: 'measuring-roi', label: 'Difficulty measuring ROI' },
    { value: 'lead-quality', label: 'Poor lead quality' },
    { value: 'competition', label: 'Intense competition' },
    { value: 'staying-current', label: 'Keeping up with trends' },
    { value: 'client-acquisition', label: 'Acquiring new clients' }
  ];

  // Handle clicking outside modal
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && onSkip) {
      onSkip();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 backdrop-blur-sm overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full my-4 flex flex-col min-h-[70vh] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <currentStep.icon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Welcome to Tala! 👋</h2>
                <p className="text-purple-100 mt-1">
                  Let's get to know each other so I can provide the best assistance
                </p>
              </div>
            </div>
            
            {onSkip && (
              <button
                onClick={onSkip}
                className="text-white/80 hover:text-white transition-colors p-2"
                title="Skip for now"
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>
          
          <div className="mt-6">
            <ProgressBar current={step + 1} total={steps.length} />
          </div>
        </div>

        {/* Step Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8">
            <div className="mb-8">
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                {currentStep.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {currentStep.subtitle}
              </p>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="pb-6"
              >
                {/* Step 1: Personal Info */}
                {step === 0 && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        What should I call you? *
                      </label>
                      <input
                        type="text"
                        value={profile.name || ''}
                        onChange={(e) => updateProfile('name', e.target.value)}
                        placeholder="Enter your first name"
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        autoFocus
                      />
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        I'll use this name in all our conversations to make them more personal
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 2: Role */}
                {step === 1 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        {
                          value: 'agent',
                          title: 'Travel Agent',
                          description: 'I work with clients directly to plan and book their travel',
                          icon: '✈️'
                        },
                        {
                          value: 'agency_owner',
                          title: 'Agency Owner/Manager',
                          description: 'I own or manage a travel agency and oversee operations',
                          icon: '🏢'
                        }
                      ].map((role) => (
                        <button
                          key={role.value}
                          onClick={() => updateProfile('role', role.value)}
                          className={`p-6 rounded-xl border-2 text-left transition-all duration-300 ${
                            profile.role === role.value
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-lg'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-2xl">{role.icon}</span>
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              {role.title}
                            </h4>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {role.description}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 3: Business Info */}
                {step === 2 && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {profile.role === 'agency_owner' ? 'What\'s your agency name?' : 'Which agency do you work for?'}
                      </label>
                      <input
                        type="text"
                        value={profile.companyName || ''}
                        onChange={(e) => updateProfile('companyName', e.target.value)}
                        placeholder="Enter company/agency name"
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    {profile.role === 'agency_owner' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          How many employees do you have?
                        </label>
                        <select
                          value={profile.employees || ''}
                          onChange={(e) => updateProfile('employees', parseInt(e.target.value))}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="">Select range</option>
                          <option value="1">Just me</option>
                          <option value="2">2-5 employees</option>
                          <option value="6">6-10 employees</option>
                          <option value="11">11-25 employees</option>
                          <option value="26">26+ employees</option>
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        What's your monthly marketing budget?
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {budgetRanges.map((budget) => (
                          <button
                            key={budget.value}
                            onClick={() => updateProfile('monthlyMarketingBudget', budget.value)}
                            className={`p-3 rounded-lg border-2 text-left transition-all ${
                              profile.monthlyMarketingBudget === budget.value
                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700'
                            }`}
                          >
                            {budget.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4: Ideal Clients */}
                {step === 3 && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        What type of travelers do you typically work with? (Select all that apply)
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {clientTypes.map((type) => (
                          <button
                            key={type.value}
                            onClick={() => toggleArrayItem('clientTypes', type.value)}
                            className={`p-3 rounded-lg border-2 text-left transition-all ${
                              profile.clientTypes?.includes(type.value)
                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700'
                            }`}
                          >
                            {type.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        What's the average value of your travel bookings?
                      </label>
                      <select
                        value={profile.idealClient?.averageProjectValue || ''}
                        onChange={(e) => updateNestedProfile('idealClient', 'averageProjectValue', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="">Select range</option>
                        <option value="under-1k">Under $1,000</option>
                        <option value="1k-5k">$1,000 - $5,000</option>
                        <option value="5k-15k">$5,000 - $15,000</option>
                        <option value="15k-50k">$15,000 - $50,000</option>
                        <option value="over-50k">Over $50,000</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Describe your ideal client (optional)
                      </label>
                      <textarea
                        value={profile.idealClient?.description || ''}
                        onChange={(e) => updateNestedProfile('idealClient', 'description', e.target.value)}
                        placeholder="e.g., Luxury travelers seeking unique experiences, corporate groups, adventure seekers..."
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}

                {/* Step 5: Goals & Challenges */}
                {step === 4 && (
                  <div className="space-y-8">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-4">
                        What are your main business goals? (Select all that apply)
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {businessGoals.map((goal) => (
                          <button
                            key={goal.value}
                            onClick={() => toggleArrayItem('businessGoals', goal.value)}
                            className={`p-3 rounded-lg border-2 text-left transition-all ${
                              profile.businessGoals?.includes(goal.value)
                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700'
                            }`}
                          >
                            {goal.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-4">
                        What are your biggest challenges? (Select all that apply)
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {challenges.map((challenge) => (
                          <button
                            key={challenge.value}
                            onClick={() => toggleArrayItem('currentChallenges', challenge.value)}
                            className={`p-3 rounded-lg border-2 text-left transition-all ${
                              profile.currentChallenges?.includes(challenge.value)
                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700'
                            }`}
                          >
                            {challenge.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Footer - Fixed at bottom */}
        <div className="flex-shrink-0 bg-gray-50 dark:bg-gray-700 px-8 py-6 flex items-center justify-between border-t border-gray-200 dark:border-gray-600">
          <button
            onClick={goBack}
            disabled={!canGoBack}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              canGoBack
                ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                : 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Step {step + 1} of {steps.length}
            </span>
          </div>

          <button
            onClick={isLastStep ? handleComplete : goNext}
            disabled={!canContinue() || isSubmitting}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${
              canContinue() && !isSubmitting
                ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg hover:shadow-xl'
                : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              'Setting up...'
            ) : isLastStep ? (
              'Complete Setup'
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};