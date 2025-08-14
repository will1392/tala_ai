/**
 * Quarterly Check-In Component
 * Regular progress reviews and goal adjustments
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  TrendingUp,
  Target,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  BarChart3,
  Users,
  Clock,
  Award,
  RefreshCw,
  MessageCircle,
  Lightbulb,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../shared/Badge';
import { Progress } from '../shared/Progress';
import type { Goal, MarketingProfile } from '../../types/marketing';
import { generateCheckInQuestions, adjustGoalsBasedOnPerformance, determineBusinessStage } from '../../services/marketing/RealisticGoalGenerator';

interface QuarterlyCheckInProps {
  profile: MarketingProfile;
  onComplete: (updatedProfile: MarketingProfile) => void;
  onSkip: () => void;
}

interface CheckInData {
  answers: Record<string, any>;
  metrics: {
    traffic: number;
    leads: number;
    customers: number;
    revenue?: number;
  };
  insights: string[];
  recommendations: string[];
}

export const QuarterlyCheckIn: React.FC<QuarterlyCheckInProps> = ({
  profile,
  onComplete,
  onSkip
}) => {
  const [currentStep, setCurrentStep] = useState<'welcome' | 'questions' | 'review' | 'recommendations'>('welcome');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [checkInData, setCheckInData] = useState<CheckInData>({
    answers: {},
    metrics: {
      traffic: 0,
      leads: 0,
      customers: 0
    },
    insights: [],
    recommendations: []
  });
  
  // Calculate time since last assessment
  const daysSinceAssessment = profile.assessment 
    ? Math.floor((Date.now() - new Date(profile.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  
  const isQuarterlyDue = daysSinceAssessment >= 90;
  
  // Generate check-in questions
  const businessStage = profile.assessment ? determineBusinessStage(profile.assessment) : null;
  const questions = businessStage ? generateCheckInQuestions(profile.goals || [], businessStage) : [];
  
  // Calculate overall progress
  const calculateOverallProgress = (): number => {
    const activeGoals = profile.goals?.filter(g => g.status === 'active') || [];
    if (activeGoals.length === 0) return 0;
    
    const totalProgress = activeGoals.reduce((sum, goal) => {
      const progress = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
      return sum + Math.min(progress, 100);
    }, 0);
    
    return Math.round(totalProgress / activeGoals.length);
  };
  
  // Analyze performance trends
  const analyzePerformance = (): { trend: 'improving' | 'stable' | 'declining'; insights: string[] } => {
    const insights: string[] = [];
    let positiveCount = 0;
    let negativeCount = 0;
    
    profile.goals?.forEach(goal => {
      if (goal.trend === 'up') positiveCount++;
      if (goal.trend === 'down') negativeCount++;
      
      const progress = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
      
      if (progress >= 100) {
        insights.push(`🎉 Congratulations! You've achieved your ${goal.metric} goal`);
      } else if (progress >= 75) {
        insights.push(`📈 Great progress on ${goal.metric} - almost there!`);
      } else if (progress < 25 && goal.status === 'active') {
        insights.push(`⚠️ ${goal.metric} needs attention - consider adjusting your approach`);
      }
    });
    
    // Add stage-specific insights
    if (businessStage?.stage === 'pre-launch') {
      insights.push('🚀 Focus on building your foundation before scaling');
    } else if (businessStage?.stage === 'startup') {
      insights.push('💡 Consistency is key at this stage - keep showing up');
    }
    
    const trend = positiveCount > negativeCount ? 'improving' : 
                  negativeCount > positiveCount ? 'declining' : 'stable';
    
    return { trend, insights };
  };
  
  // Handle answer submission
  const handleAnswer = (answer: any) => {
    const question = questions[currentQuestionIndex];
    
    setCheckInData(prev => ({
      ...prev,
      answers: {
        ...prev.answers,
        [question.id]: answer
      },
      metrics: question.category === 'metrics' ? {
        ...prev.metrics,
        [question.id.replace('current_', '')]: answer
      } : prev.metrics
    }));
    
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // All questions answered, move to review
      generateRecommendations();
      setCurrentStep('review');
    }
  };
  
  // Generate personalized recommendations
  const generateRecommendations = () => {
    const recommendations: string[] = [];
    const { answers, metrics } = checkInData;
    
    // Based on biggest challenge
    if (answers.biggest_challenge === 'time') {
      recommendations.push('🕐 Consider automation tools and templates to save time');
    } else if (answers.biggest_challenge === 'budget') {
      recommendations.push('💰 Focus on organic strategies like SEO and content marketing');
    } else if (answers.biggest_challenge === 'knowledge') {
      recommendations.push('📚 Schedule weekly learning time to build marketing skills');
    } else if (answers.biggest_challenge === 'results') {
      recommendations.push('📊 Review your targeting and messaging - small tweaks can make big differences');
    }
    
    // Based on what's working
    if (answers.biggest_win && answers.biggest_win !== 'none') {
      recommendations.push(`✨ Double down on ${answers.biggest_win} - it's working for you`);
    }
    
    // Based on metrics
    if (metrics.traffic < 100) {
      recommendations.push('🎯 Focus on driving initial traffic through content and social media');
    }
    
    if (metrics.leads > 0 && metrics.customers === 0) {
      recommendations.push('🔄 Work on lead nurturing and follow-up processes');
    }
    
    if (metrics.customers > metrics.leads * 0.5) {
      recommendations.push('🌟 Your conversion rate is excellent - focus on volume');
    }
    
    setCheckInData(prev => ({
      ...prev,
      recommendations: recommendations.slice(0, 5)
    }));
  };
  
  // Complete check-in and update profile
  const handleComplete = () => {
    // Adjust goals based on performance
    const performanceData = profile.goals?.reduce((acc, goal) => {
      acc[goal.id] = {
        daysElapsed: daysSinceAssessment,
        currentProgress: goal.current,
        targetProgress: goal.target
      };
      return acc;
    }, {} as any) || {};
    
    const adjustedGoals = adjustGoalsBasedOnPerformance(
      profile.goals || [],
      performanceData
    );
    
    // Update profile with new data
    const updatedProfile: MarketingProfile = {
      ...profile,
      goals: adjustedGoals,
      lastCheckIn: new Date().toISOString(),
      checkInData: {
        ...checkInData,
        date: new Date().toISOString(),
        quarterNumber: Math.floor(daysSinceAssessment / 90) + 1
      },
      metrics: {
        ...profile.metrics,
        current: checkInData.metrics
      }
    };
    
    onComplete(updatedProfile);
  };
  
  const { trend, insights } = analyzePerformance();
  const overallProgress = calculateOverallProgress();
  
  if (!isQuarterlyDue) {
    // Show next check-in reminder
    const daysUntilCheckIn = 90 - daysSinceAssessment;
    
    return (
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold">Next Quarterly Check-In</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Due in {daysUntilCheckIn} days
              </p>
            </div>
          </div>
          <Badge variant="secondary">
            {new Date(Date.now() + daysUntilCheckIn * 24 * 60 * 60 * 1000).toLocaleDateString()}
          </Badge>
        </div>
      </Card>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto">
      <AnimatePresence mode="wait">
        {/* Welcome Screen */}
        {currentStep === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="p-8">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                  <BarChart3 className="w-10 h-10 text-primary" />
                </div>
                
                <h2 className="text-2xl font-bold mb-2">Quarterly Progress Check-In</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  It's been {daysSinceAssessment} days since your last assessment. 
                  Let's review your progress and adjust your goals.
                </p>
                
                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className="text-2xl font-bold text-primary">{overallProgress}%</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Overall Progress</div>
                  </div>
                  <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className="text-2xl font-bold">
                      {profile.goals?.filter(g => g.status === 'active').length || 0}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Active Goals</div>
                  </div>
                  <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center justify-center text-2xl font-bold">
                      {trend === 'improving' ? (
                        <ArrowUp className="w-6 h-6 text-green-500" />
                      ) : trend === 'declining' ? (
                        <ArrowDown className="w-6 h-6 text-red-500" />
                      ) : (
                        <Minus className="w-6 h-6 text-gray-500" />
                      )}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Trend</div>
                  </div>
                </div>
                
                <div className="flex gap-3 justify-center">
                  <Button onClick={() => setCurrentStep('questions')} variant="primary" size="lg">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Start Check-In (5 min)
                  </Button>
                  <Button onClick={onSkip} variant="ghost" size="lg">
                    Skip for now
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
        
        {/* Questions */}
        {currentStep === 'questions' && questions[currentQuestionIndex] && (
          <motion.div
            key={`question-${currentQuestionIndex}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="p-8">
              {/* Progress */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                  <span>{Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}%</span>
                </div>
                <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} />
              </div>
              
              {/* Question */}
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-2">
                  {questions[currentQuestionIndex].question}
                </h3>
                {questions[currentQuestionIndex].helpText && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {questions[currentQuestionIndex].helpText}
                  </p>
                )}
              </div>
              
              {/* Answer Options */}
              <div className="space-y-3">
                {questions[currentQuestionIndex].type === 'number' && (
                  <div>
                    <input
                      type="number"
                      className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                      placeholder="Enter a number"
                      min={questions[currentQuestionIndex].validation?.min}
                      max={questions[currentQuestionIndex].validation?.max}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleAnswer(Number((e.target as HTMLInputElement).value));
                        }
                      }}
                    />
                    <Button
                      onClick={() => {
                        const input = document.querySelector('input[type="number"]') as HTMLInputElement;
                        handleAnswer(Number(input.value));
                      }}
                      variant="primary"
                      className="mt-3"
                    >
                      Continue
                    </Button>
                  </div>
                )}
                
                {questions[currentQuestionIndex].type === 'multiple_choice' && (
                  questions[currentQuestionIndex].options?.map((option: any) => (
                    <button
                      key={option.value}
                      onClick={() => handleAnswer(option.value)}
                      className="w-full text-left p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary hover:bg-primary/5 transition-colors"
                    >
                      {option.label}
                    </button>
                  ))
                )}
                
                {questions[currentQuestionIndex].type === 'yes_no' && (
                  <div className="flex gap-4">
                    <Button
                      onClick={() => handleAnswer(true)}
                      variant="secondary"
                      size="lg"
                      className="flex-1"
                    >
                      Yes
                    </Button>
                    <Button
                      onClick={() => handleAnswer(false)}
                      variant="secondary"
                      size="lg"
                      className="flex-1"
                    >
                      No
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        )}
        
        {/* Review & Recommendations */}
        {currentStep === 'review' && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="p-8">
              <div className="text-center mb-8">
                <Award className="w-16 h-16 text-primary mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Check-In Complete!</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Here's your personalized quarterly review
                </p>
              </div>
              
              {/* Insights */}
              <div className="mb-8">
                <h3 className="font-semibold mb-4 flex items-center">
                  <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
                  Key Insights
                </h3>
                <div className="space-y-2">
                  {insights.map((insight, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                      {insight}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Recommendations */}
              <div className="mb-8">
                <h3 className="font-semibold mb-4 flex items-center">
                  <Target className="w-5 h-5 mr-2 text-primary" />
                  Recommendations for Next Quarter
                </h3>
                <div className="space-y-2">
                  {checkInData.recommendations.map((rec, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                      {rec}
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Updated Metrics */}
              <div className="mb-8">
                <h3 className="font-semibold mb-4">Updated Metrics</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className="text-2xl font-bold">{checkInData.metrics.traffic}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Monthly Traffic</div>
                  </div>
                  <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className="text-2xl font-bold">{checkInData.metrics.leads}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Monthly Leads</div>
                  </div>
                  <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                    <div className="text-2xl font-bold">{checkInData.metrics.customers}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">New Customers</div>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 justify-center">
                <Button onClick={handleComplete} variant="primary" size="lg">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Update Goals & Continue
                </Button>
                <Button onClick={() => window.print()} variant="ghost" size="lg">
                  Save Report
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};