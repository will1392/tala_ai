/**
 * Marketing Assessment Wizard Component
 * Multi-step wizard for marketing maturity assessment
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Save, AlertCircle, CheckCircle, Info, HelpCircle, X, Target } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Card, CardContent } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { assessmentQuestions, getNextQuestion, calculateReadinessScore, getCategoryScores } from '../../config/marketingAssessment';
import { getHelpForQuestion, hasHelp } from '../../config/marketingHelp';
import type { AssessmentQuestion, AssessmentAnswer } from '../../types/marketing';

interface AssessmentWizardProps {
  brandId: string;
  onComplete: (assessment: any) => void;
  savedDraft?: Record<string, any>;
}

export const AssessmentWizard: React.FC<AssessmentWizardProps> = ({
  brandId,
  onComplete,
  savedDraft
}) => {
  // State
  const [answers, setAnswers] = useState<Record<string, any>>(savedDraft || {});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set(Object.keys(savedDraft || {})));
  const [currentQuestion, setCurrentQuestion] = useState<AssessmentQuestion | null>(null);
  const [confidence, setConfidence] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [signals, setSignals] = useState<any[]>([]);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);

  // Calculate progress
  const requiredQuestions = assessmentQuestions.filter(q => q.required);
  const totalQuestions = requiredQuestions.length;
  const answeredCount = Array.from(answeredIds).filter(id => 
    assessmentQuestions.find(q => q.id === id && q.required)
  ).length;
  const progress = Math.round((answeredCount / totalQuestions) * 100);
  
  // More accurate question tracking
  const estimatedTotalQuestions = Math.max(totalQuestions, answeredIds.size + 5); // Show at least 5 more questions ahead

  // Load the current question
  useEffect(() => {
    const nextQ = getNextQuestion(answers, answeredIds);
    setCurrentQuestion(nextQ);
    
    if (!nextQ && answeredCount >= totalQuestions * 0.8) {
      // Assessment is sufficiently complete
      handleComplete();
    }
  }, [answers, answeredIds]);

  // Fetch evidence signals (GA4, GSC, etc.)
  useEffect(() => {
    const fetchSignals = async () => {
      try {
        const response = await fetch(`/api/marketing-profile/${brandId}/signals`);
        if (response.ok) {
          const data = await response.json();
          setSignals(data.signals || []);
        }
      } catch (error) {
        console.error('Failed to fetch signals:', error);
      }
    };
    
    fetchSignals();
  }, [brandId]);

  // Save draft periodically
  const saveDraft = useCallback(async () => {
    setIsSaving(true);
    try {
      const draftData = {
        brandId,
        answers,
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem(`assessment_draft_${brandId}`, JSON.stringify(draftData));
      
      // Also save to backend
      await fetch(`/api/marketing-profile/${brandId}/assessment/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draftData)
      });
    } catch (error) {
      console.error('Failed to save draft:', error);
    } finally {
      setIsSaving(false);
    }
  }, [brandId, answers]);

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(saveDraft, 30000);
    return () => clearInterval(interval);
  }, [saveDraft]);

  // Handle answer submission
  const handleAnswer = (value: any) => {
    if (!currentQuestion) return;

    setValidationError(null);

    // Validate the answer
    if (currentQuestion.validation) {
      if (currentQuestion.type === 'scale' || currentQuestion.type === 'number') {
        const numValue = Number(value);
        if (currentQuestion.validation.min && numValue < currentQuestion.validation.min) {
          setValidationError(`Value must be at least ${currentQuestion.validation.min}`);
          return;
        }
        if (currentQuestion.validation.max && numValue > currentQuestion.validation.max) {
          setValidationError(`Value must be at most ${currentQuestion.validation.max}`);
          return;
        }
      }
    }

    // Store the answer
    const newAnswers = {
      ...answers,
      [currentQuestion.id]: value
    };
    setAnswers(newAnswers);
    setAnsweredIds(new Set([...answeredIds, currentQuestion.id]));

    // Check for evidence alignment
    checkEvidenceAlignment(currentQuestion, value);

    // Move to next question
    setTimeout(() => {
      const nextQ = getNextQuestion(newAnswers, new Set([...answeredIds, currentQuestion.id]));
      setCurrentQuestion(nextQ);
      setCurrentQuestionIndex(prev => prev + 1);
    }, 300);
  };

  // Check if answer aligns with evidence signals
  const checkEvidenceAlignment = (question: AssessmentQuestion, answer: any) => {
    const relatedSignal = signals.find(s => s.key === question.id);
    if (relatedSignal) {
      // Compare answer with signal
      let aligned = false;
      
      if (question.type === 'yes_no') {
        aligned = (answer === true && relatedSignal.value === true) ||
                 (answer === false && relatedSignal.value === false);
      }
      
      if (aligned) {
        setConfidence(prev => Math.min(1, prev + 0.1));
      } else {
        setConfidence(prev => Math.max(0.5, prev - 0.1));
      }
    }
  };

  // Navigate to previous question
  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      // Find the previous question in history
      const questionHistory = assessmentQuestions.filter(q => answeredIds.has(q.id));
      if (questionHistory[currentQuestionIndex - 1]) {
        setCurrentQuestion(questionHistory[currentQuestionIndex - 1]);
      }
    }
  };

  // Skip current question
  const handleSkip = () => {
    const nextQ = getNextQuestion(answers, answeredIds);
    if (nextQ) {
      setCurrentQuestion(nextQ);
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  // Complete assessment
  const handleComplete = async () => {
    const score = calculateReadinessScore(answers);
    const categoryScores = getCategoryScores(answers);
    
    const assessmentResult = {
      score,
      buckets: categoryScores,
      inputs: Object.entries(answers).map(([id, value]) => ({
        id,
        value,
        confidence,
        timestamp: new Date().toISOString()
      })),
      signals,
      confidence
    };

    // Clear draft
    localStorage.removeItem(`assessment_draft_${brandId}`);
    
    onComplete(assessmentResult);
  };

  if (!currentQuestion) {
    return (
      <Card className="max-w-2xl mx-auto p-8">
        <CardContent className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Assessment Complete!</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Analyzing your responses to create your personalized growth plan...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Question {answeredIds.size + 1} of ~{estimatedTotalQuestions}
          </span>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {progress}% Required Questions Complete
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <motion.div
            className="bg-primary h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="p-8">
            <CardContent>
              {/* Category Badge and Help Button */}
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  {currentQuestion.category}
                </span>
                <div className="flex items-center gap-2">
                  {currentQuestion.weight && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Weight: {currentQuestion.weight}/10
                    </span>
                  )}
                  {hasHelp(currentQuestion.id) && (
                    <Button
                      onClick={() => setShowHelpModal(true)}
                      variant="ghost"
                      size="sm"
                      className="text-primary hover:text-primary/80"
                    >
                      <HelpCircle className="w-4 h-4 mr-1" />
                      Don't know what this means?
                    </Button>
                  )}
                </div>
              </div>

              {/* Question */}
              <h3 className="text-xl font-semibold mb-6">
                {currentQuestion.question}
              </h3>

              {/* Help Text */}
              {currentQuestion.helpText && (
                <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-6">
                  <Info className="w-4 h-4 text-blue-500 mt-0.5" />
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {currentQuestion.helpText}
                  </p>
                </div>
              )}

              {/* Answer Input */}
              <div className="space-y-4">
                {currentQuestion.type === 'yes_no' && (
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

                {currentQuestion.type === 'multiple_choice' && (
                  <div className="space-y-3">
                    {currentQuestion.options?.map(option => (
                      <button
                        key={option.value}
                        onClick={() => handleAnswer(option.value)}
                        className="w-full text-left p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary hover:bg-primary/5 transition-colors"
                      >
                        <div className="font-medium">{option.label}</div>
                        {option.score !== undefined && signals.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            Impact: {option.score}/10
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {currentQuestion.type === 'multi_select' && (
                  <MultiSelectAnswer
                    options={currentQuestion.options || []}
                    onSubmit={handleAnswer}
                  />
                )}

                {currentQuestion.type === 'scale' && (
                  <ScaleAnswer
                    min={currentQuestion.validation?.min || 1}
                    max={currentQuestion.validation?.max || 10}
                    onSubmit={handleAnswer}
                  />
                )}

                {currentQuestion.type === 'text' && (
                  <TextAnswer onSubmit={handleAnswer} />
                )}
              </div>

              {/* Validation Error */}
              {validationError && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-300">{validationError}</p>
                </div>
              )}

              {/* Evidence Indicator */}
              {signals.find(s => s.key === currentQuestion.id) && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                  <p className="text-sm text-green-700 dark:text-green-300">
                    We detected evidence for this from your connected accounts
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between items-center mt-8">
        <div className="flex gap-2">
          <Button
            onClick={handlePrevious}
            variant="ghost"
            disabled={currentQuestionIndex === 0}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          <Button
            onClick={saveDraft}
            variant="ghost"
            disabled={isSaving}
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Draft'}
          </Button>
        </div>

        <div className="flex gap-2">
          {!currentQuestion.required && (
            <Button
              onClick={handleSkip}
              variant="ghost"
            >
              Skip
            </Button>
          )}
          {answeredCount >= totalQuestions * 0.8 && (
            <Button
              onClick={handleComplete}
              variant="primary"
            >
              Complete Assessment
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Confidence Indicator */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Evidence Confidence: {Math.round(confidence * 100)}%
        </p>
      </div>
      
      {/* Help Modal */}
      {currentQuestion && hasHelp(currentQuestion.id) && (
        <Modal
          isOpen={showHelpModal}
          onClose={() => setShowHelpModal(false)}
          title="Understanding This Question"
        >
          <HelpModal 
            questionId={currentQuestion.id}
            onClose={() => setShowHelpModal(false)}
            onUnderstood={() => {
              setShowHelpModal(false);
              // Could track that user needed help for this question
            }}
          />
        </Modal>
      )}
    </div>
  );
};

// Help Modal Component
const HelpModal: React.FC<{
  questionId: string;
  onClose: () => void;
  onUnderstood: () => void;
}> = ({ questionId, onClose, onUnderstood }) => {
  const help = getHelpForQuestion(questionId);
  
  if (!help) return null;
  
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <h3 className="font-semibold mb-2 flex items-center">
          <Info className="w-4 h-4 mr-2 text-blue-500" />
          {help.term}
        </h3>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {help.simple}
        </p>
      </div>
      
      <div>
        <h4 className="font-medium mb-2">More Details</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {help.detailed}
        </p>
      </div>
      
      {help.example && (
        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
          <h4 className="font-medium mb-1 text-sm">Example:</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {help.example}
          </p>
        </div>
      )}
      
      {help.why && (
        <div>
          <h4 className="font-medium mb-1 flex items-center">
            <Target className="w-4 h-4 mr-1 text-primary" />
            Why This Matters
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {help.why}
          </p>
        </div>
      )}
      
      {help.howToAnswer && (
        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
          <h4 className="font-medium mb-1 text-sm flex items-center">
            <CheckCircle className="w-4 h-4 mr-1 text-green-500" />
            How to Answer
          </h4>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {help.howToAnswer}
          </p>
        </div>
      )}
      
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
        <Button variant="primary" onClick={onUnderstood}>
          Got it!
        </Button>
      </div>
    </div>
  );
};

// Multi-select component
const MultiSelectAnswer: React.FC<{
  options: any[];
  onSubmit: (values: string[]) => void;
}> = ({ options, onSubmit }) => {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (value: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(value)) {
      newSelected.delete(value);
    } else {
      newSelected.add(value);
    }
    setSelected(newSelected);
  };

  return (
    <div className="space-y-3">
      {options.map(option => (
        <label
          key={option.value}
          className="flex items-center p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
        >
          <input
            type="checkbox"
            checked={selected.has(option.value)}
            onChange={() => toggle(option.value)}
            className="mr-3"
          />
          <span>{option.label}</span>
        </label>
      ))}
      <Button
        onClick={() => onSubmit(Array.from(selected))}
        variant="primary"
        disabled={selected.size === 0}
        className="w-full"
      >
        Continue
      </Button>
    </div>
  );
};

// Scale input component
const ScaleAnswer: React.FC<{
  min: number;
  max: number;
  onSubmit: (value: number) => void;
}> = ({ min, max, onSubmit }) => {
  const [value, setValue] = useState(Math.floor((min + max) / 2));

  return (
    <div className="space-y-4">
      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
        <span>{min} - Low</span>
        <span className="text-lg font-semibold text-primary">{value}</span>
        <span>{max} - High</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full"
      />
      <Button
        onClick={() => onSubmit(value)}
        variant="primary"
        className="w-full"
      >
        Continue
      </Button>
    </div>
  );
};

// Text input component
const TextAnswer: React.FC<{
  onSubmit: (value: string) => void;
}> = ({ onSubmit }) => {
  const [value, setValue] = useState('');

  return (
    <div className="space-y-4">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type your answer here..."
        className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 min-h-[120px] resize-none"
        maxLength={1000}
      />
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500">{value.length}/1000</span>
        <Button
          onClick={() => onSubmit(value)}
          variant="primary"
          disabled={value.trim().length === 0}
        >
          Continue
        </Button>
      </div>
    </div>
  );
};