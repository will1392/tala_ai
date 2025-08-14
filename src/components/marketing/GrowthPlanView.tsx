/**
 * Growth Plan View Component
 * Displays personalized growth plan with evidence-gated steps
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  Lock,
  CheckCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  FileText,
  Download,
  Play,
  Pause,
  RotateCw,
  Info,
  TrendingUp,
  Calendar,
  Users,
  Zap,
  BarChart3,
  Target,
  Award,
  MessageCircle,
  X
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../shared/Badge';
import { Progress } from '../shared/Progress';
import { Modal } from '../ui/Modal';
import { useNavigate } from 'react-router-dom';
import { marketingContext } from '../../services/MarketingContextService';
import type { GrowthPlan, GrowthPhase, GrowthStep, EvidenceItem } from '../../types/marketing';

interface GrowthPlanViewProps {
  brandId: string;
  growthPlan: GrowthPlan | null;
  evidence: EvidenceItem[];
  onStepStart: (phaseId: string, stepId: string) => void;
  onStepComplete: (phaseId: string, stepId: string, outputs: any) => void;
  onRefresh: () => void;
}

// Agent icons mapping
const AGENT_ICONS = {
  GENERAL: Users,
  ANALYTICS: BarChart3,
  SEO: TrendingUp,
  CONTENT: FileText,
  PPC: Zap,
  OPS: RotateCw
};

// Status colors
const STATUS_COLORS = {
  todo: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  done: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  blocked: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  skipped: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500'
};

export const GrowthPlanView: React.FC<GrowthPlanViewProps> = ({
  brandId,
  growthPlan,
  evidence,
  onStepStart,
  onStepComplete,
  onRefresh
}) => {
  const navigate = useNavigate();
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);
  const [selectedStep, setSelectedStep] = useState<GrowthStep | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [stepProgress, setStepProgress] = useState<Record<string, number>>({});
  const [showTalaHelp, setShowTalaHelp] = useState(false);
  const [talaHelpStep, setTalaHelpStep] = useState<GrowthStep | null>(null);
  const [talaMessages, setTalaMessages] = useState<Array<{role: string, content: string}>>([]);
  const [talaInput, setTalaInput] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Initialize with first phase
  useEffect(() => {
    if (growthPlan?.phases && growthPlan.phases.length > 0 && !selectedPhase) {
      setSelectedPhase(growthPlan.currentPhase || growthPlan.phases[0].id);
      setExpandedPhases(new Set([growthPlan.currentPhase || growthPlan.phases[0].id]));
    }
  }, [growthPlan, selectedPhase]);

  // Check if step prerequisites are met
  const checkPrerequisites = useCallback((step: GrowthStep): boolean => {
    if (!step.evidenceRequired || step.evidenceRequired.length === 0) {
      return true;
    }

    return step.evidenceRequired.every(req => 
      evidence.some(e => e.key === req && e.verified)
    );
  }, [evidence]);

  // Get step status with evidence check
  const getStepStatus = useCallback((step: GrowthStep): string => {
    if (step.status === 'done') return 'done';
    if (step.status === 'in_progress') return 'in_progress';
    
    // Check if blocked by missing evidence
    if (!checkPrerequisites(step)) {
      return 'blocked';
    }
    
    return step.status || 'todo';
  }, [checkPrerequisites]);

  // Calculate phase completion
  const calculatePhaseCompletion = (phase: GrowthPhase): number => {
    if (!phase.steps || phase.steps.length === 0) return 0;
    
    const completed = phase.steps.filter(step => step.status === 'done').length;
    return Math.round((completed / phase.steps.length) * 100);
  };

  // Calculate overall completion
  const calculateOverallCompletion = (): number => {
    if (!growthPlan?.phases) return 0;
    
    let totalSteps = 0;
    let completedSteps = 0;
    
    growthPlan.phases.forEach(phase => {
      phase.steps.forEach(step => {
        totalSteps++;
        if (step.status === 'done') completedSteps++;
      });
    });
    
    return totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  };

  // Toggle phase expansion
  const togglePhase = (phaseId: string) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(phaseId)) {
      newExpanded.delete(phaseId);
    } else {
      newExpanded.add(phaseId);
    }
    setExpandedPhases(newExpanded);
  };

  // Handle step click
  const handleStepClick = (phase: GrowthPhase, step: GrowthStep) => {
    setSelectedPhase(phase.id);
    setSelectedStep(step);
  };

  // Handle step action
  const handleStepAction = async (action: 'start' | 'complete' | 'skip') => {
    if (!selectedStep || !selectedPhase) return;

    switch (action) {
      case 'start':
        onStepStart(selectedPhase, selectedStep.id);
        // Simulate progress
        const interval = setInterval(() => {
          setStepProgress(prev => {
            const current = prev[selectedStep.id] || 0;
            if (current >= 100) {
              clearInterval(interval);
              return prev;
            }
            return { ...prev, [selectedStep.id]: current + 10 };
          });
        }, 500);
        break;
      
      case 'complete':
        onStepComplete(selectedPhase, selectedStep.id, {
          completedAt: new Date().toISOString(),
          outputs: selectedStep.outputs
        });
        break;
      
      case 'skip':
        // Handle skip logic
        break;
    }
  };

  // Open Tala help for a specific step
  const openTalaHelp = (step: GrowthStep) => {
    setTalaHelpStep(step);
    setConversationId(`growth-help-${Date.now()}`);
    
    // Store initial context in marketing context service
    marketingContext.setGrowthPlanContext({
      currentStep: step,
      brandId
    });
    
    setTalaMessages([
      {
        role: 'assistant',
        content: `I see you want to work on "${step.label}". How can I help you with this?\n\nYou can say things like:\n• "I don't know where to start"\n• "Give me ideas"\n• "What tools should I use?"\n• "Show me examples"\n• "Break this down into smaller steps"\n• "What's the fastest way to do this?"\n\nI'm here to guide you through this step!`
      }
    ]);
    setShowTalaHelp(true);
  };

  // Send message to Tala
  const sendToTala = async () => {
    if (!talaInput.trim() || !talaHelpStep) return;

    const userMessage = talaInput;
    setTalaInput('');
    
    // Add user message
    setTalaMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      // Build a clear marketing-focused message that won't trigger travel processing
      const marketingQuery = `I need marketing advice and guidance. ${userMessage}

Context: I'm working on a marketing growth plan step called "${talaHelpStep.label}". 
The task involves: ${talaHelpStep.description}
Expected deliverables: ${talaHelpStep.outputs?.join(', ') || 'Marketing materials'}

Please provide specific marketing guidance and actionable steps. This is NOT a travel query - this is about marketing strategy and implementation.`;

      // Send to chat API with CMO mode
      const response = await fetch('/api/chat/v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage, // Send user's actual message
          conversationId: conversationId,
          mode: 'cmo', // Use CMO mode for marketing
          subMode: 'general', // General marketing sub-mode
          searchKnowledge: true,  // Still search knowledge base
          preferredStyle: 'professional',
          costOptimization: false,
          fastResponse: false,
          device: 'web',
          attachments: [],
          // Store the actual context in request metadata
          requestMetadata: {
            type: 'marketing_help',
            subType: 'growth_plan',
            originalMessage: userMessage,
            growthPlanContext: marketingQuery, // Include the full context
            growthPlanStep: {
              label: talaHelpStep.label,
              description: talaHelpStep.description,
              agent: talaHelpStep.agent,
              outputs: talaHelpStep.outputs,
              estimateHours: talaHelpStep.estimateHours
            },
            brandId
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Tala response received:', data);
        
        setTalaMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.response || data.message || 'I received your request. Let me help you with this marketing task.' 
        }]);
        
        // Store conversation in marketing context for continuation
        marketingContext.storeConversation(conversationId!, talaMessages);
        
        // Update conversation ID if backend provided one
        if (data.conversationId && data.conversationId !== conversationId) {
          setConversationId(data.conversationId);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ API response error:', response.status, errorData);
        
        setTalaMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `I encountered an error (${response.status}). Let me provide some general guidance for this task:\n\n1. Start by understanding the goal clearly\n2. Break it down into smaller, manageable steps\n3. Focus on one aspect at a time\n4. Use available templates and tools\n5. Don\'t hesitate to iterate and improve\n\nError details: ${errorData.error || errorData.message || 'Unknown error'}` 
        }]);
      }
    } catch (error) {
      console.error('❌ Failed to get Tala help:', error);
      setTalaMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `I apologize, but I'm having trouble connecting right now. Here are some general tips for this task:\n\n1. Start by understanding the goal clearly\n2. Break it down into smaller, manageable steps\n3. Focus on one aspect at a time\n4. Use available templates and tools\n5. Don't hesitate to iterate and improve\n\nTechnical error: ${error.message}` 
      }]);
    }
  };

  // Continue conversation in main chat
  const continueInChat = () => {
    // Ensure we have the current messages including all exchanges
    const allMessages = [...talaMessages];
    
    // Store current conversation state in marketing context
    if (conversationId && talaHelpStep) {
      marketingContext.storeConversation(conversationId, allMessages);
      marketingContext.setActiveConversation({
        id: conversationId,
        context: {
          growthPlanStep: talaHelpStep,
          messages: allMessages
        }
      });
    }
    
    // Close the modal
    setShowTalaHelp(false);
    
    // Navigate to chat with full context
    navigate('/chat', { 
      state: { 
        continueConversation: conversationId,
        initialContext: {
          type: 'growth-plan-help',
          step: talaHelpStep,
          messages: allMessages
        }
      } 
    });
  };

  if (!growthPlan) {
    return (
      <Card className="p-8 text-center">
        <CardContent>
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Growth Plan Yet</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Complete the marketing assessment to get your personalized growth plan
          </p>
          <Button onClick={onRefresh} variant="primary">
            Start Assessment
          </Button>
        </CardContent>
      </Card>
    );
  }

  const overallProgress = calculateOverallCompletion();
  const currentPhase = growthPlan.phases.find(p => p.id === selectedPhase);

  return (
    <div className="h-full flex flex-col">
      {/* Header with Progress */}
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Your Growth Plan</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Personalized roadmap to marketing success
            </p>
          </div>
          <Button onClick={onRefresh} variant="ghost" size="sm">
            <RotateCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
        
        {/* Overall Progress */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {overallProgress}% Complete
            </span>
          </div>
          <Progress value={overallProgress} className="mb-3" />
          {growthPlan.estimatedCompletion && (
            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
              <Calendar className="w-3 h-3 mr-1" />
              Estimated completion: {new Date(growthPlan.estimatedCompletion).toLocaleDateString()}
            </div>
          )}
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left Sidebar - Phases */}
        <div className="w-80 flex flex-col">
          <Card className="flex-1 p-4 overflow-y-auto">
            <h3 className="font-semibold mb-4 flex items-center">
              <Target className="w-4 h-4 mr-2" />
              Growth Phases
            </h3>
            
            <div className="space-y-2">
              {growthPlan.phases.map((phase, index) => {
                const isActive = phase.id === selectedPhase;
                const isExpanded = expandedPhases.has(phase.id);
                const completion = calculatePhaseCompletion(phase);
                const isLocked = phase.prerequisites?.some(
                  preq => !growthPlan.phases.find(p => p.id === preq)?.steps.every(s => s.status === 'done')
                );

                return (
                  <motion.div
                    key={phase.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div
                      className={`
                        rounded-lg border transition-all cursor-pointer
                        ${isActive 
                          ? 'border-primary bg-primary/5' 
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }
                        ${isLocked ? 'opacity-50' : ''}
                      `}
                    >
                      <div
                        onClick={() => {
                          if (!isLocked) {
                            setSelectedPhase(phase.id);
                            togglePhase(phase.id);
                          }
                        }}
                        className="p-3"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center">
                            {isLocked ? (
                              <Lock className="w-4 h-4 mr-2 text-gray-400" />
                            ) : completion === 100 ? (
                              <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                            ) : completion > 0 ? (
                              <Clock className="w-4 h-4 mr-2 text-blue-500" />
                            ) : (
                              <div className="w-4 h-4 mr-2 rounded-full border-2 border-gray-300" />
                            )}
                            <span className="font-medium text-sm">{phase.label}</span>
                          </div>
                          <ChevronRight className={`
                            w-4 h-4 text-gray-400 transition-transform
                            ${isExpanded ? 'rotate-90' : ''}
                          `} />
                        </div>
                        
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                          {phase.description}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {phase.steps.filter(s => s.status === 'done').length}/{phase.steps.length} steps
                          </span>
                          {completion > 0 && (
                            <span className="text-xs font-medium text-primary">
                              {completion}%
                            </span>
                          )}
                        </div>
                        
                        {completion > 0 && (
                          <Progress value={completion} className="mt-2 h-1" />
                        )}
                      </div>
                      
                      {/* Expanded Steps Preview */}
                      <AnimatePresence>
                        {isExpanded && !isLocked && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-t border-gray-200 dark:border-gray-700"
                          >
                            <div className="p-2 space-y-1">
                              {phase.steps.slice(0, 3).map(step => {
                                const status = getStepStatus(step);
                                const StatusIcon = status === 'done' ? CheckCircle :
                                                 status === 'in_progress' ? Clock :
                                                 status === 'blocked' ? Lock : 
                                                 ChevronRight;
                                
                                return (
                                  <button
                                    key={step.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStepClick(phase, step);
                                    }}
                                    className="w-full text-left p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                  >
                                    <div className="flex items-center text-xs">
                                      <StatusIcon className="w-3 h-3 mr-2 flex-shrink-0" />
                                      <span className="truncate">{step.label}</span>
                                    </div>
                                  </button>
                                );
                              })}
                              {phase.steps.length > 3 && (
                                <div className="text-xs text-gray-500 pl-5">
                                  +{phase.steps.length - 3} more steps
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </div>
            
            {/* Phase Legend */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-xs font-medium text-gray-500 mb-2">Legend</h4>
              <div className="space-y-1">
                <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                  <CheckCircle className="w-3 h-3 mr-2 text-green-500" />
                  Completed
                </div>
                <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                  <Clock className="w-3 h-3 mr-2 text-blue-500" />
                  In Progress
                </div>
                <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                  <Lock className="w-3 h-3 mr-2 text-gray-400" />
                  Locked
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Center - Steps List */}
        <div className="flex-1 flex flex-col">
          <Card className="flex-1 p-6 overflow-y-auto">
            {currentPhase ? (
              <>
                <div className="mb-6">
                  <h3 className="text-xl font-semibold mb-2">{currentPhase.label}</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {currentPhase.description}
                  </p>
                  {currentPhase.estimatedWeeks && (
                    <div className="flex items-center mt-2 text-sm text-gray-500">
                      <Clock className="w-4 h-4 mr-1" />
                      Estimated: {currentPhase.estimatedWeeks} weeks
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {currentPhase.steps.map((step, index) => {
                    const status = getStepStatus(step);
                    const isSelected = selectedStep?.id === step.id;
                    const isBlocked = status === 'blocked';
                    const AgentIcon = AGENT_ICONS[step.agent as keyof typeof AGENT_ICONS] || Users;

                    return (
                      <motion.div
                        key={step.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleStepClick(currentPhase, step)}
                        className={`
                          p-4 rounded-lg border cursor-pointer transition-all
                          ${isSelected 
                            ? 'border-primary bg-primary/5 shadow-sm' 
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }
                          ${isBlocked ? 'opacity-60' : ''}
                        `}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-start flex-1">
                            <div className={`
                              w-8 h-8 rounded-full flex items-center justify-center mr-3 flex-shrink-0
                              ${STATUS_COLORS[status]}
                            `}>
                              {status === 'done' ? (
                                <CheckCircle className="w-4 h-4" />
                              ) : status === 'in_progress' ? (
                                <Clock className="w-4 h-4" />
                              ) : status === 'blocked' ? (
                                <Lock className="w-4 h-4" />
                              ) : (
                                <span className="text-xs font-semibold">{index + 1}</span>
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium mb-1">{step.label}</h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                {step.description}
                              </p>
                              
                              {/* Step Metadata */}
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <div className="flex items-center">
                                  <AgentIcon className="w-3 h-3 mr-1" />
                                  {step.agent}
                                </div>
                                {step.estimateHours && (
                                  <div className="flex items-center">
                                    <Clock className="w-3 h-3 mr-1" />
                                    {step.estimateHours}h
                                  </div>
                                )}
                                {step.outputs && step.outputs.length > 0 && (
                                  <div className="flex items-center">
                                    <FileText className="w-3 h-3 mr-1" />
                                    {step.outputs.length} outputs
                                  </div>
                                )}
                              </div>

                              {/* Progress Bar for In-Progress Steps */}
                              {status === 'in_progress' && stepProgress[step.id] !== undefined && (
                                <div className="mt-3">
                                  <Progress value={stepProgress[step.id]} className="h-1" />
                                </div>
                              )}

                              {/* Evidence Warning for Blocked Steps */}
                              {isBlocked && step.evidenceRequired && (
                                <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded flex items-start">
                                  <AlertCircle className="w-3 h-3 text-red-500 mr-1 mt-0.5" />
                                  <div className="text-xs text-red-700 dark:text-red-400">
                                    <span className="font-medium">Missing evidence:</span>
                                    <ul className="mt-1 space-y-0.5">
                                      {step.evidenceRequired.map(req => (
                                        <li key={req}>• {req.replace(/_/g, ' ')}</li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              )}

                              {/* Get Help from Tala Button */}
                              <div className="mt-3">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openTalaHelp(step);
                                  }}
                                  className="text-primary hover:text-primary/80"
                                >
                                  <MessageCircle className="w-3 h-3 mr-1" />
                                  Get Help from Tala
                                </Button>
                              </div>
                            </div>
                          </div>
                          
                          {/* Quick Action Button */}
                          {!isBlocked && status === 'todo' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStepClick(currentPhase, step);
                                handleStepAction('start');
                              }}
                            >
                              <Play className="w-3 h-3" />
                              Start
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <p>Select a phase to view steps</p>
              </div>
            )}
          </Card>
        </div>

        {/* Right Panel - Step Details */}
        <div className="w-96 flex flex-col">
          <Card className="flex-1 p-6 overflow-y-auto">
            {selectedStep ? (
              <>
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={getStepStatus(selectedStep) as any}>
                      {getStepStatus(selectedStep).replace('_', ' ')}
                    </Badge>
                    {selectedStep.estimateHours && (
                      <span className="text-xs text-gray-500">
                        ~{selectedStep.estimateHours} hours
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{selectedStep.label}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedStep.description}
                  </p>
                </div>

                {/* Evidence Requirements */}
                {selectedStep.evidenceRequired && selectedStep.evidenceRequired.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium mb-2 flex items-center">
                      <Info className="w-4 h-4 mr-1" />
                      Evidence Requirements
                    </h4>
                    <div className="space-y-2">
                      {selectedStep.evidenceRequired.map(req => {
                        const hasEvidence = evidence.some(e => e.key === req && e.verified);
                        return (
                          <div
                            key={req}
                            className={`
                              p-2 rounded-lg border text-xs
                              ${hasEvidence
                                ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                                : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                              }
                            `}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">
                                {req.replace(/_/g, ' ')}
                              </span>
                              {hasEvidence ? (
                                <CheckCircle className="w-3 h-3 text-green-500" />
                              ) : (
                                <AlertCircle className="w-3 h-3 text-red-500" />
                              )}
                            </div>
                            {!hasEvidence && (
                              <p className="mt-1 text-gray-600 dark:text-gray-400">
                                Complete prerequisite steps to unlock
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Expected Outputs */}
                {selectedStep.outputs && selectedStep.outputs.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium mb-2 flex items-center">
                      <FileText className="w-4 h-4 mr-1" />
                      Expected Outputs
                    </h4>
                    <div className="space-y-1">
                      {selectedStep.outputs.map(output => (
                        <div
                          key={output}
                          className="flex items-center text-xs text-gray-600 dark:text-gray-400"
                        >
                          <Download className="w-3 h-3 mr-2" />
                          {output}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resources */}
                {selectedStep.resources && selectedStep.resources.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium mb-2 flex items-center">
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Resources
                    </h4>
                    <div className="space-y-2">
                      {selectedStep.resources.map((resource, idx) => (
                        <a
                          key={idx}
                          href={resource.url}
                          target={resource.internal ? undefined : "_blank"}
                          rel={resource.internal ? undefined : "noopener noreferrer"}
                          className="flex items-start p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <FileText className="w-4 h-4 mr-2 mt-0.5 text-gray-400" />
                          <div className="flex-1">
                            <div className="text-xs font-medium">{resource.title}</div>
                            <div className="text-xs text-gray-500">{resource.type}</div>
                          </div>
                          <ExternalLink className="w-3 h-3 text-gray-400" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Why This Step? */}
                <div className="mb-6">
                  <button className="text-sm font-medium mb-2 flex items-center text-primary hover:underline">
                    <Info className="w-4 h-4 mr-1" />
                    Why this step?
                  </button>
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      Based on your assessment, this step addresses gaps in your{' '}
                      {selectedStep.agent?.toLowerCase()} capabilities and aligns with your
                      goal of improving marketing effectiveness.
                    </p>
                  </div>
                </div>

                {/* Get Help from Tala Button */}
                <div className="mb-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => openTalaHelp(selectedStep)}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Get Help from Tala
                  </Button>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {getStepStatus(selectedStep) === 'todo' && !checkPrerequisites(selectedStep) ? (
                    <Button variant="secondary" disabled className="flex-1">
                      <Lock className="w-4 h-4 mr-2" />
                      Complete Prerequisites
                    </Button>
                  ) : getStepStatus(selectedStep) === 'todo' ? (
                    <>
                      <Button
                        variant="primary"
                        className="flex-1"
                        onClick={() => handleStepAction('start')}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Start Step
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleStepAction('skip')}
                      >
                        Skip
                      </Button>
                    </>
                  ) : getStepStatus(selectedStep) === 'in_progress' ? (
                    <>
                      <Button
                        variant="primary"
                        className="flex-1"
                        onClick={() => handleStepAction('complete')}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark Complete
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleStepAction('skip')}
                      >
                        <Pause className="w-4 h-4" />
                      </Button>
                    </>
                  ) : getStepStatus(selectedStep) === 'done' ? (
                    <div className="flex items-center text-green-600 dark:text-green-400">
                      <Award className="w-5 h-5 mr-2" />
                      <span className="font-medium">Completed!</span>
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Info className="w-12 h-12 mb-3" />
                <p className="text-center">
                  Select a step to view details and take action
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Tala Help Modal - Larger size */}
      <Modal
        isOpen={showTalaHelp}
        onClose={() => setShowTalaHelp(false)}
        title={
          <div className="flex items-center justify-between w-full">
            <span>Get Help with: {talaHelpStep?.label || 'Growth Plan Step'}</span>
            <Button
              onClick={continueInChat}
              variant="outline"
              size="sm"
              className="ml-4"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Continue in Chat Tab
            </Button>
          </div>
        }
        className="max-w-5xl w-[90vw]"
      >
        <div className="flex flex-col h-[70vh]">
          {/* Step Context Bar */}
          {talaHelpStep && (
            <div className="bg-gray-50 dark:bg-gray-800 p-4 mb-4 rounded-lg">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <h4 className="font-semibold text-sm mb-1">Current Step:</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{talaHelpStep.description}</p>
                </div>
                {talaHelpStep.estimateHours && (
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Estimated Time</p>
                    <p className="text-sm font-medium">{talaHelpStep.estimateHours} hours</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            {talaMessages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] p-4 rounded-xl shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex items-center mb-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-2">
                        <MessageCircle className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-semibold">Tala AI Assistant</span>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
            <div className="flex gap-3 mb-3">
              <input
                type="text"
                value={talaInput}
                onChange={(e) => setTalaInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendToTala();
                  }
                }}
                placeholder="Ask Tala for help with this growth plan step..."
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary text-base"
                autoFocus
              />
              <Button
                onClick={sendToTala}
                disabled={!talaInput.trim()}
                variant="primary"
                size="lg"
              >
                <Play className="w-4 h-4 mr-2" />
                Send
              </Button>
            </div>
            
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-500 mr-2">Quick prompts:</span>
              {[
                "I don't know where to start",
                "Give me ideas",
                "Show me examples",
                "What tools should I use?",
                "Break this down into steps"
              ].map((quick) => (
                <button
                  key={quick}
                  onClick={() => {
                    setTalaInput(quick);
                    setTimeout(sendToTala, 100);
                  }}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {quick}
                </button>
              ))}
            </div>
            
            {/* Info Bar */}
            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center">
                <Info className="w-3 h-3 mr-1" />
                <span>Tala has full context about your growth plan and business goals</span>
              </div>
              {talaMessages.length > 1 && (
                <Button
                  onClick={continueInChat}
                  variant="ghost"
                  size="sm"
                >
                  Open in full chat →
                </Button>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};