/**
 * Goals View Component
 * Displays and manages marketing goals with evidence-based tracking
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Target,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Users,
  DollarSign,
  BarChart3,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  Info,
  Clock,
  Award,
  ChevronRight,
  ChevronDown,
  Filter,
  Search,
  RefreshCw,
  ExternalLink,
  FileText,
  Zap
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Card, CardContent } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Badge } from '../shared/Badge';
import { Progress } from '../shared/Progress';
import type { Goal, Milestone, EvidenceItem } from '../../types/marketing';

interface GoalsViewProps {
  brandId: string;
  goals: Goal[];
  evidence: EvidenceItem[];
  onCreateGoal: (goal: Partial<Goal>) => void;
  onUpdateGoal: (goalId: string, updates: Partial<Goal>) => void;
  onDeleteGoal: (goalId: string) => void;
  onUpdateProgress: (goalId: string, progress: any) => void;
  onRefresh: () => void;
}

// Goal type icons
const GOAL_ICONS = {
  traffic: TrendingUp,
  conversion: Target,
  revenue: DollarSign,
  engagement: Users,
  brand: Award,
  efficiency: Zap,
  custom: BarChart3
};

// Trend indicators
const TREND_INDICATORS = {
  up: { icon: TrendingUp, color: 'text-green-500', label: 'Improving' },
  down: { icon: TrendingDown, color: 'text-red-500', label: 'Declining' },
  stable: { icon: Minus, color: 'text-gray-500', label: 'Stable' }
};

// Priority colors
const PRIORITY_COLORS = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
};

export const GoalsView: React.FC<GoalsViewProps> = ({
  brandId,
  goals,
  evidence,
  onCreateGoal,
  onUpdateGoal,
  onDeleteGoal,
  onUpdateProgress,
  onRefresh
}) => {
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [newGoalData, setNewGoalData] = useState<Partial<Goal>>({
    metric: '',
    target: 0,
    current: 0,
    unit: '',
    priority: 'medium',
    owner: 'user',
    deadline: '',
    trend: 'stable'
  });

  // Filter goals
  const filteredGoals = goals.filter(goal => {
    let matches = true;
    
    if (filterStatus !== 'all') {
      matches = matches && goal.status === filterStatus;
    }
    
    if (filterPriority !== 'all') {
      matches = matches && goal.priority === filterPriority;
    }
    
    if (searchTerm) {
      matches = matches && (
        goal.metric.toLowerCase().includes(searchTerm.toLowerCase()) ||
        goal.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return matches;
  });

  // Group goals by status
  const groupedGoals = {
    active: filteredGoals.filter(g => g.status === 'active'),
    completed: filteredGoals.filter(g => g.status === 'completed'),
    paused: filteredGoals.filter(g => g.status === 'paused')
  };

  // Calculate overall progress
  const calculateOverallProgress = (): number => {
    const activeGoals = goals.filter(g => g.status === 'active');
    if (activeGoals.length === 0) return 0;
    
    const totalProgress = activeGoals.reduce((sum, goal) => {
      const progress = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
      return sum + Math.min(progress, 100);
    }, 0);
    
    return Math.round(totalProgress / activeGoals.length);
  };

  // Check if goal has supporting evidence
  const hasEvidence = (goal: Goal): boolean => {
    return evidence.some(e => 
      e.relatedGoals?.includes(goal.id) && e.verified
    );
  };

  // Get evidence for goal
  const getGoalEvidence = (goal: Goal): EvidenceItem[] => {
    return evidence.filter(e => 
      e.relatedGoals?.includes(goal.id)
    );
  };

  // Toggle goal expansion
  const toggleGoalExpansion = (goalId: string) => {
    const newExpanded = new Set(expandedGoals);
    if (newExpanded.has(goalId)) {
      newExpanded.delete(goalId);
    } else {
      newExpanded.add(goalId);
    }
    setExpandedGoals(newExpanded);
  };

  // Handle goal creation
  const handleCreateGoal = () => {
    const goalId = `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    onCreateGoal({
      ...newGoalData,
      id: goalId,
      status: 'active',
      createdAt: new Date().toISOString(),
      milestones: []
    });
    setIsCreateModalOpen(false);
    setNewGoalData({
      metric: '',
      target: 0,
      current: 0,
      unit: '',
      priority: 'medium',
      owner: 'user',
      deadline: '',
      trend: 'stable'
    });
  };

  // Handle goal update
  const handleUpdateGoal = () => {
    if (selectedGoal) {
      onUpdateGoal(selectedGoal.id, newGoalData);
      setIsEditModalOpen(false);
      setSelectedGoal(null);
    }
  };

  // Handle quick progress update
  const handleQuickProgressUpdate = (goal: Goal, newValue: number) => {
    const trend = newValue > goal.current ? 'up' : 
                  newValue < goal.current ? 'down' : 'stable';
    
    onUpdateProgress(goal.id, {
      current: newValue,
      trend,
      updatedAt: new Date().toISOString()
    });
  };

  // Calculate days remaining
  const getDaysRemaining = (deadline: string): number => {
    const today = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const overallProgress = calculateOverallProgress();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold mb-1">Marketing Goals</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Track progress with evidence-based metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={onRefresh} variant="ghost" size="sm">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button onClick={() => setIsCreateModalOpen(true)} variant="primary">
            <Plus className="w-4 h-4" />
            New Goal
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-5 h-5 text-primary" />
            <span className="text-2xl font-bold">{goals.length}</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Goals</p>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-5 h-5 text-blue-500" />
            <span className="text-2xl font-bold">
              {goals.filter(g => g.status === 'active').length}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span className="text-2xl font-bold">
              {goals.filter(g => g.status === 'completed').length}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <BarChart3 className="w-5 h-5 text-purple-500" />
            <span className="text-2xl font-bold">{overallProgress}%</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Avg Progress</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search goals..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Label className="text-sm">Status:</Label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="paused">Paused</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <Label className="text-sm">Priority:</Label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"
            >
              <option value="all">All</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Goals List */}
      {filteredGoals.length === 0 ? (
        <Card className="p-8 text-center">
          <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Goals Found</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {goals.length === 0 
              ? "Create your first marketing goal to start tracking progress"
              : "No goals match your current filters"}
          </p>
          {goals.length === 0 && (
            <Button onClick={() => setIsCreateModalOpen(true)} variant="primary">
              <Plus className="w-4 h-4" />
              Create First Goal
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredGoals.map((goal, index) => {
            const progress = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;
            const isExpanded = expandedGoals.has(goal.id);
            const goalEvidence = getGoalEvidence(goal);
            const daysLeft = goal.deadline ? getDaysRemaining(goal.deadline) : null;
            const TrendIcon = TREND_INDICATORS[goal.trend || 'stable'].icon;
            const trendColor = TREND_INDICATORS[goal.trend || 'stable'].color;
            const GoalIcon = GOAL_ICONS[goal.type || 'custom'];
            
            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={`p-6 ${goal.status === 'completed' ? 'opacity-75' : ''}`}>
                  {/* Goal Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start flex-1">
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center mr-4
                        ${goal.status === 'completed' 
                          ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-primary/10 text-primary'
                        }
                      `}>
                        <GoalIcon className="w-5 h-5" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">{goal.metric}</h3>
                          <Badge 
                            variant={goal.priority as any}
                            className={PRIORITY_COLORS[goal.priority]}
                          >
                            {goal.priority}
                          </Badge>
                          {goal.status === 'completed' && (
                            <Badge variant="success">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Completed
                            </Badge>
                          )}
                          {goal.status === 'paused' && (
                            <Badge variant="warning">
                              <Clock className="w-3 h-3 mr-1" />
                              Paused
                            </Badge>
                          )}
                        </div>
                        
                        {goal.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            {goal.description}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          {goal.owner && (
                            <div className="flex items-center">
                              <Users className="w-3 h-3 mr-1" />
                              {goal.owner === 'user' ? 'You' : goal.owner}
                            </div>
                          )}
                          {daysLeft !== null && (
                            <div className={`flex items-center ${
                              daysLeft < 7 ? 'text-red-500' : 
                              daysLeft < 30 ? 'text-yellow-500' : ''
                            }`}>
                              <Calendar className="w-3 h-3 mr-1" />
                              {daysLeft > 0 ? `${daysLeft} days left` : 'Overdue'}
                            </div>
                          )}
                          <div className={`flex items-center ${trendColor}`}>
                            <TrendIcon className="w-3 h-3 mr-1" />
                            {TREND_INDICATORS[goal.trend || 'stable'].label}
                          </div>
                          {hasEvidence(goal) && (
                            <div className="flex items-center text-green-500">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Evidence-backed
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleGoalExpansion(goal.id)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedGoal(goal);
                          setNewGoalData(goal);
                          setIsEditModalOpen(true);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDeleteGoal(goal.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between items-baseline mb-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold">{goal.current}</span>
                        <span className="text-sm text-gray-500">/ {goal.target} {goal.unit}</span>
                      </div>
                      <span className="text-sm font-medium text-primary">
                        {Math.round(progress)}%
                      </span>
                    </div>
                    <Progress value={Math.min(progress, 100)} className="h-2" />
                  </div>

                  {/* Quick Update */}
                  {goal.status === 'active' && (
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Quick update:</Label>
                      <Input
                        type="number"
                        value={goal.current}
                        onChange={(e) => handleQuickProgressUpdate(goal, Number(e.target.value))}
                        className="w-24"
                        min={0}
                        max={goal.target}
                      />
                      <span className="text-sm text-gray-500">{goal.unit}</span>
                    </div>
                  )}

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
                      >
                        {/* Milestones */}
                        {goal.milestones && goal.milestones.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium mb-2">Milestones</h4>
                            <div className="space-y-2">
                              {goal.milestones.map((milestone: Milestone) => (
                                <div
                                  key={milestone.id}
                                  className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800"
                                >
                                  <div className="flex items-center">
                                    <div className={`
                                      w-6 h-6 rounded-full flex items-center justify-center mr-2
                                      ${milestone.completed 
                                        ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                                        : 'bg-gray-200 text-gray-400 dark:bg-gray-700'
                                      }
                                    `}>
                                      {milestone.completed ? (
                                        <CheckCircle className="w-3 h-3" />
                                      ) : (
                                        <div className="w-2 h-2 rounded-full bg-current" />
                                      )}
                                    </div>
                                    <span className={`text-sm ${
                                      milestone.completed ? 'line-through text-gray-500' : ''
                                    }`}>
                                      {milestone.label}
                                    </span>
                                  </div>
                                  <span className="text-xs text-gray-500">
                                    {milestone.value} {goal.unit}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Evidence */}
                        {goalEvidence.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-medium mb-2 flex items-center">
                              <Info className="w-4 h-4 mr-1" />
                              Supporting Evidence
                            </h4>
                            <div className="space-y-2">
                              {goalEvidence.map((item, idx) => (
                                <div
                                  key={idx}
                                  className={`
                                    p-2 rounded-lg text-xs
                                    ${item.verified
                                      ? 'bg-green-50 dark:bg-green-900/20'
                                      : 'bg-yellow-50 dark:bg-yellow-900/20'
                                    }
                                  `}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium">{item.source}</span>
                                    {item.verified ? (
                                      <CheckCircle className="w-3 h-3 text-green-500" />
                                    ) : (
                                      <AlertCircle className="w-3 h-3 text-yellow-500" />
                                    )}
                                  </div>
                                  <p className="mt-1 text-gray-600 dark:text-gray-400">
                                    {item.data.message || 'Data point collected'}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Why This Goal? */}
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <h4 className="text-sm font-medium mb-1 flex items-center text-blue-700 dark:text-blue-300">
                            <Info className="w-4 h-4 mr-1" />
                            Evidence-Based Insight
                          </h4>
                          <p className="text-xs text-blue-600 dark:text-blue-400">
                            {goalEvidence.length > 0
                              ? `This goal is supported by ${goalEvidence.length} data points from your connected integrations.`
                              : 'Connect analytics tools to track this goal with real-time data.'}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Goal Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create New Goal"
      >
        <div className="space-y-4">
          <div>
            <Label>Goal Metric</Label>
            <Input
              placeholder="e.g., Website Traffic, Lead Generation"
              value={newGoalData.metric}
              onChange={(e) => setNewGoalData({ ...newGoalData, metric: e.target.value })}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Current Value</Label>
              <Input
                type="number"
                value={newGoalData.current}
                onChange={(e) => setNewGoalData({ ...newGoalData, current: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Target Value</Label>
              <Input
                type="number"
                value={newGoalData.target}
                onChange={(e) => setNewGoalData({ ...newGoalData, target: Number(e.target.value) })}
              />
            </div>
          </div>
          
          <div>
            <Label>Unit</Label>
            <Input
              placeholder="e.g., visitors, leads, %"
              value={newGoalData.unit}
              onChange={(e) => setNewGoalData({ ...newGoalData, unit: e.target.value })}
            />
          </div>
          
          <div>
            <Label>Description (Optional)</Label>
            <textarea
              className="w-full p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
              rows={3}
              placeholder="Describe your goal..."
              value={newGoalData.description}
              onChange={(e) => setNewGoalData({ ...newGoalData, description: e.target.value })}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Priority</Label>
              <select
                className="w-full p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                value={newGoalData.priority}
                onChange={(e) => setNewGoalData({ ...newGoalData, priority: e.target.value as any })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <Label>Deadline</Label>
              <Input
                type="date"
                value={newGoalData.deadline}
                onChange={(e) => setNewGoalData({ ...newGoalData, deadline: e.target.value })}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleCreateGoal}
              disabled={!newGoalData.metric || !newGoalData.target}
            >
              Create Goal
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Goal Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Goal"
      >
        <div className="space-y-4">
          <div>
            <Label>Goal Metric</Label>
            <Input
              value={newGoalData.metric}
              onChange={(e) => setNewGoalData({ ...newGoalData, metric: e.target.value })}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Current Value</Label>
              <Input
                type="number"
                value={newGoalData.current}
                onChange={(e) => setNewGoalData({ ...newGoalData, current: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Target Value</Label>
              <Input
                type="number"
                value={newGoalData.target}
                onChange={(e) => setNewGoalData({ ...newGoalData, target: Number(e.target.value) })}
              />
            </div>
          </div>
          
          <div>
            <Label>Status</Label>
            <select
              className="w-full p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
              value={newGoalData.status}
              onChange={(e) => setNewGoalData({ ...newGoalData, status: e.target.value as any })}
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleUpdateGoal}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};