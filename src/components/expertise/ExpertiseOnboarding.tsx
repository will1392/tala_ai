import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Check, Sparkles } from 'lucide-react';
import AssessmentQuestion from './AssessmentQuestion';
import OnboardingProgress from './OnboardingProgress';
import ExpertiseLevelResult from './ExpertiseLevelResult';
import { useAuthStore } from '../../store/authStore';
import { expertiseService } from '../../services/expertiseService';

interface ExpertiseOnboardingProps {
  onComplete: (expertise: any) => void;
  onSkip?: () => void;
}

export const ExpertiseOnboarding: React.FC<ExpertiseOnboardingProps> = ({
  onComplete,
  onSkip
}) => {
  const { user } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [questions, setQuestions] = useState<any[]>([]);
  const [isAssessing, setIsAssessing] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<any>(null);
  const [showValidation, setShowValidation] = useState(false);
  const [validationQuestions, setValidationQuestions] = useState<any[]>([]);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      const response = await expertiseService.getAssessmentQuestions();
      setQuestions(response.questions);
    } catch (error) {
      console.error('Error loading questions:', error);
      // Fallback to default questions
      setQuestions(getDefaultQuestions());
    }
  };

  const getDefaultQuestions = () => [
    {
      id: 'q1',
      question: "How would you describe your marketing experience?",
      type: 'single-select',
      required: true,
      options: [
        { value: 'beginner', label: "I'm new to marketing" },
        { value: 'intermediate', label: "I know the basics and have some experience" },
        { value: 'advanced', label: "I'm comfortable with most marketing concepts" },
        { value: 'expert', label: "I have deep expertise across marketing channels" }
      ]
    },
    {
      id: 'q2',
      question: "Which marketing areas are you most familiar with?",
      type: 'multi-select',
      required: true,
      options: [
        { value: 'seo', label: 'SEO & Organic Search' },
        { value: 'email', label: 'Email Marketing' },
        { value: 'social', label: 'Social Media Marketing' },
        { value: 'paid', label: 'Paid Advertising' },
        { value: 'content', label: 'Content Marketing' },
        { value: 'analytics', label: 'Analytics & Data' }
      ]
    },
    {
      id: 'q3',
      question: "How do you prefer explanations?",
      type: 'single-select',
      required: true,
      options: [
        { value: 'simple', label: "Keep it simple with examples" },
        { value: 'balanced', label: "Mix of simple and technical" },
        { value: 'technical', label: "Get straight to the technical details" }
      ]
    }
  ];

  const handleAnswer = (questionId: string, answer: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleNext = () => {
    const currentQuestion = questions[currentStep];
    if (currentQuestion.required && !answers[currentQuestion.id]) {
      return; // Don't proceed if required question not answered
    }

    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // All questions answered, assess expertise
      assessExpertise();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const assessExpertise = async () => {
    setIsAssessing(true);
    
    try {
      const result = await expertiseService.assessExpertise(answers);
      setAssessmentResult(result);

      // Check if we need validation questions
      if (result.needsValidation && result.validationQuestions) {
        setValidationQuestions(result.validationQuestions);
        setShowValidation(true);
      } else {
        // Save and complete
        await saveAssessment(result);
      }
    } catch (error) {
      console.error('Error assessing expertise:', error);
      // Fallback assessment
      const fallbackResult = {
        level: answers.q1?.value || 'beginner',
        confidence: 0.7,
        areas: {},
        communicationStyle: answers.q3?.value || 'simple'
      };
      setAssessmentResult(fallbackResult);
      await saveAssessment(fallbackResult);
    } finally {
      setIsAssessing(false);
    }
  };

  const handleValidationComplete = async (validationAnswers: Record<string, any>) => {
    try {
      const finalResult = await expertiseService.validateExpertise(
        assessmentResult.level,
        validationAnswers
      );
      
      // Update assessment result with validation
      const updatedResult = {
        ...assessmentResult,
        ...finalResult
      };
      
      setAssessmentResult(updatedResult);
      await saveAssessment(updatedResult);
    } catch (error) {
      console.error('Error validating expertise:', error);
      await saveAssessment(assessmentResult);
    }
  };

  const saveAssessment = async (result: any) => {
    try {
      await expertiseService.saveAssessment(user?.id, result, answers);
      onComplete(result);
    } catch (error) {
      console.error('Error saving assessment:', error);
      onComplete(result);
    }
  };

  const currentQuestion = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;

  if (showValidation) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        >
          <div className="p-8">
            <h2 className="text-2xl font-bold mb-4">Quick Knowledge Check</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Let's make sure we provide the right level of guidance for you.
            </p>
            
            {/* Validation questions would go here */}
            <div className="space-y-4">
              {validationQuestions.map((question, index) => (
                <AssessmentQuestion
                  key={question.id}
                  question={question}
                  value={answers[question.id]}
                  onChange={(answer) => handleAnswer(question.id, answer)}
                  showResult={false}
                />
              ))}
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={() => handleValidationComplete(answers)}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                Complete Assessment
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (assessmentResult) {
    return (
      <ExpertiseLevelResult
        result={assessmentResult}
        onContinue={() => onComplete(assessmentResult)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-purple-600 text-white p-8">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Let's Personalize Your Experience</h1>
          </div>
          <p className="text-white/90">
            Tell us about your marketing experience so we can provide the right level of guidance.
          </p>
        </div>

        {/* Progress */}
        <OnboardingProgress 
          currentStep={currentStep + 1} 
          totalSteps={questions.length} 
          progress={progress}
        />

        {/* Question */}
        <div className="p-8">
          <AnimatePresence mode="wait">
            {currentQuestion && (
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <AssessmentQuestion
                  question={currentQuestion}
                  value={answers[currentQuestion.id]}
                  onChange={(answer) => handleAnswer(currentQuestion.id, answer)}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {isAssessing && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Analyzing your responses...</p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="px-8 pb-8">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                currentStep === 0
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>

            {onSkip && currentStep === 0 && (
              <button
                onClick={onSkip}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Skip for now
              </button>
            )}

            <button
              onClick={handleNext}
              disabled={currentQuestion?.required && !answers[currentQuestion.id]}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                currentQuestion?.required && !answers[currentQuestion.id]
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-primary text-white hover:bg-primary/90'
              }`}
            >
              {currentStep === questions.length - 1 ? (
                <>
                  Complete
                  <Check className="w-5 h-5" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};