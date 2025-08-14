/**
 * Realistic Goal Generator Service
 * Creates achievable, stage-appropriate marketing goals
 */

import type { Goal, AssessmentResult } from '../../types/marketing';

interface BusinessStage {
  stage: 'pre-launch' | 'startup' | 'growing' | 'established' | 'scaling';
  monthsInBusiness: number;
  currentMonthlyTraffic: number;
  currentMonthlyLeads: number;
  currentMonthlyRevenue: number;
  hasProduct: boolean;
  hasWebsite: boolean;
  hasCustomers: boolean;
}

interface GoalTemplate {
  id: string;
  metric: string;
  description: string;
  unit: string;
  category: string;
  stages: {
    [key: string]: {
      baseTarget: number;
      growthRate: number; // Monthly growth rate (e.g., 0.1 = 10% per month)
      timeframe: number; // Days to achieve
    };
  };
  priority: 'low' | 'medium' | 'high';
  prerequisites?: string[];
}

/**
 * Determine business stage from assessment answers
 */
export function determineBusinessStage(assessment: AssessmentResult): BusinessStage {
  const inputs = assessment.inputs || [];
  const getAnswer = (id: string) => inputs.find(i => i.id === id)?.value;
  
  // Analyze business maturity indicators
  const businessDefined = getAnswer('business_defined');
  const monthlyBudget = getAnswer('monthly_budget');
  const marketingTeam = getAnswer('marketing_team');
  const activeChannels = getAnswer('active_channels') || [];
  const ga4Installed = getAnswer('ga4_installed');
  
  let stage: BusinessStage['stage'] = 'pre-launch';
  let monthsInBusiness = 0;
  let currentMonthlyTraffic = 0;
  let currentMonthlyLeads = 0;
  let currentMonthlyRevenue = 0;
  
  // Determine stage based on multiple factors
  if (businessDefined === 'startup' || monthlyBudget === '0' || marketingTeam === 'none') {
    stage = 'pre-launch';
    monthsInBusiness = 0;
    currentMonthlyTraffic = 0;
    currentMonthlyLeads = 0;
  } else if (businessDefined === 'growing' || monthlyBudget === '500') {
    stage = 'startup';
    monthsInBusiness = 6;
    currentMonthlyTraffic = 50; // Very modest starting point
    currentMonthlyLeads = 2;
    currentMonthlyRevenue = 1000;
  } else if (businessDefined === 'established' || monthlyBudget === '2000') {
    stage = 'growing';
    monthsInBusiness = 18;
    currentMonthlyTraffic = 500;
    currentMonthlyLeads = 20;
    currentMonthlyRevenue = 10000;
  } else if (monthlyBudget === '5000' || monthlyBudget === '10000') {
    stage = 'established';
    monthsInBusiness = 36;
    currentMonthlyTraffic = 2000;
    currentMonthlyLeads = 100;
    currentMonthlyRevenue = 50000;
  } else {
    stage = 'scaling';
    monthsInBusiness = 60;
    currentMonthlyTraffic = 10000;
    currentMonthlyLeads = 500;
    currentMonthlyRevenue = 200000;
  }
  
  return {
    stage,
    monthsInBusiness,
    currentMonthlyTraffic,
    currentMonthlyLeads,
    currentMonthlyRevenue,
    hasProduct: businessDefined !== 'startup',
    hasWebsite: ga4Installed === true || activeChannels.length > 0,
    hasCustomers: stage !== 'pre-launch'
  };
}

/**
 * Realistic goal templates based on business stage
 */
const realisticGoalTemplates: GoalTemplate[] = [
  // Foundation Goals (Pre-launch & Startup)
  {
    id: 'first-website-visitors',
    metric: 'First Website Visitors',
    description: 'Get your first consistent website traffic',
    unit: 'visitors/month',
    category: 'traffic',
    stages: {
      'pre-launch': { baseTarget: 10, growthRate: 0.5, timeframe: 30 },
      'startup': { baseTarget: 100, growthRate: 0.3, timeframe: 60 },
      'growing': { baseTarget: 500, growthRate: 0.2, timeframe: 90 },
      'established': { baseTarget: 2000, growthRate: 0.15, timeframe: 90 },
      'scaling': { baseTarget: 10000, growthRate: 0.1, timeframe: 90 }
    },
    priority: 'high'
  },
  
  {
    id: 'email-list-start',
    metric: 'Email List Building',
    description: 'Start building your email list from scratch',
    unit: 'subscribers',
    category: 'audience',
    stages: {
      'pre-launch': { baseTarget: 5, growthRate: 1.0, timeframe: 30 },
      'startup': { baseTarget: 25, growthRate: 0.5, timeframe: 60 },
      'growing': { baseTarget: 100, growthRate: 0.3, timeframe: 90 },
      'established': { baseTarget: 500, growthRate: 0.2, timeframe: 90 },
      'scaling': { baseTarget: 2000, growthRate: 0.15, timeframe: 90 }
    },
    priority: 'high'
  },
  
  {
    id: 'first-leads',
    metric: 'Generate First Leads',
    description: 'Start generating qualified leads',
    unit: 'leads/month',
    category: 'conversion',
    stages: {
      'pre-launch': { baseTarget: 1, growthRate: 1.0, timeframe: 30 },
      'startup': { baseTarget: 5, growthRate: 0.4, timeframe: 60 },
      'growing': { baseTarget: 25, growthRate: 0.3, timeframe: 90 },
      'established': { baseTarget: 100, growthRate: 0.2, timeframe: 90 },
      'scaling': { baseTarget: 500, growthRate: 0.15, timeframe: 90 }
    },
    priority: 'high',
    prerequisites: ['hasWebsite']
  },
  
  {
    id: 'first-customers',
    metric: 'First Paying Customers',
    description: 'Convert leads into paying customers',
    unit: 'customers/month',
    category: 'revenue',
    stages: {
      'pre-launch': { baseTarget: 1, growthRate: 0, timeframe: 60 },
      'startup': { baseTarget: 2, growthRate: 0.5, timeframe: 60 },
      'growing': { baseTarget: 10, growthRate: 0.3, timeframe: 90 },
      'established': { baseTarget: 50, growthRate: 0.2, timeframe: 90 },
      'scaling': { baseTarget: 200, growthRate: 0.15, timeframe: 90 }
    },
    priority: 'high',
    prerequisites: ['hasProduct']
  },
  
  // Content Goals
  {
    id: 'content-consistency',
    metric: 'Content Publishing',
    description: 'Establish consistent content creation',
    unit: 'pieces/month',
    category: 'content',
    stages: {
      'pre-launch': { baseTarget: 1, growthRate: 0, timeframe: 30 },
      'startup': { baseTarget: 2, growthRate: 0.5, timeframe: 60 },
      'growing': { baseTarget: 4, growthRate: 0.25, timeframe: 90 },
      'established': { baseTarget: 8, growthRate: 0.25, timeframe: 90 },
      'scaling': { baseTarget: 20, growthRate: 0.2, timeframe: 90 }
    },
    priority: 'medium'
  },
  
  // Social Media Goals
  {
    id: 'social-following',
    metric: 'Social Media Following',
    description: 'Build engaged social media audience',
    unit: 'followers',
    category: 'social',
    stages: {
      'pre-launch': { baseTarget: 10, growthRate: 1.0, timeframe: 30 },
      'startup': { baseTarget: 50, growthRate: 0.5, timeframe: 60 },
      'growing': { baseTarget: 250, growthRate: 0.3, timeframe: 90 },
      'established': { baseTarget: 1000, growthRate: 0.2, timeframe: 90 },
      'scaling': { baseTarget: 5000, growthRate: 0.15, timeframe: 90 }
    },
    priority: 'low'
  },
  
  // SEO Goals
  {
    id: 'search-rankings',
    metric: 'Keywords Ranking',
    description: 'Rank for target keywords',
    unit: 'keywords in top 10',
    category: 'seo',
    stages: {
      'pre-launch': { baseTarget: 0, growthRate: 0, timeframe: 90 },
      'startup': { baseTarget: 1, growthRate: 0, timeframe: 90 },
      'growing': { baseTarget: 5, growthRate: 0.2, timeframe: 120 },
      'established': { baseTarget: 20, growthRate: 0.2, timeframe: 120 },
      'scaling': { baseTarget: 100, growthRate: 0.15, timeframe: 120 }
    },
    priority: 'medium',
    prerequisites: ['hasWebsite']
  },
  
  // Conversion Rate Goals
  {
    id: 'conversion-rate',
    metric: 'Website Conversion Rate',
    description: 'Improve visitor to lead conversion',
    unit: '%',
    category: 'optimization',
    stages: {
      'pre-launch': { baseTarget: 0.5, growthRate: 0, timeframe: 60 },
      'startup': { baseTarget: 1.0, growthRate: 0.1, timeframe: 90 },
      'growing': { baseTarget: 2.0, growthRate: 0.1, timeframe: 90 },
      'established': { baseTarget: 3.0, growthRate: 0.05, timeframe: 90 },
      'scaling': { baseTarget: 5.0, growthRate: 0.05, timeframe: 90 }
    },
    priority: 'medium',
    prerequisites: ['hasWebsite']
  }
];

/**
 * Generate realistic goals based on business stage
 */
export function generateRealisticGoals(
  assessment: AssessmentResult,
  skillLevel: string,
  existingGoals: Goal[] = []
): Goal[] {
  const businessStage = determineBusinessStage(assessment);
  const goals: Goal[] = [];
  
  // Select appropriate templates based on stage and priorities
  const applicableTemplates = realisticGoalTemplates.filter(template => {
    // Check if we already have this goal
    if (existingGoals.some(g => g.metric === template.metric)) {
      return false;
    }
    
    // Check prerequisites
    if (template.prerequisites) {
      for (const prereq of template.prerequisites) {
        if (prereq === 'hasWebsite' && !businessStage.hasWebsite) return false;
        if (prereq === 'hasProduct' && !businessStage.hasProduct) return false;
        if (prereq === 'hasCustomers' && !businessStage.hasCustomers) return false;
      }
    }
    
    return true;
  });
  
  // Prioritize goals based on business stage
  const priorityOrder = businessStage.stage === 'pre-launch' 
    ? ['high'] // Focus only on critical goals
    : businessStage.stage === 'startup'
    ? ['high', 'medium'] // Add some medium priority
    : ['high', 'medium', 'low']; // All priorities for mature businesses
  
  // Select goals by priority
  const selectedTemplates: GoalTemplate[] = [];
  for (const priority of priorityOrder) {
    const priorityTemplates = applicableTemplates.filter(t => t.priority === priority);
    selectedTemplates.push(...priorityTemplates.slice(0, 2)); // Max 2 per priority
    if (selectedTemplates.length >= 4) break; // Max 4 goals for beginners
  }
  
  // Generate goals from templates
  selectedTemplates.slice(0, businessStage.stage === 'pre-launch' ? 3 : 4).forEach(template => {
    const stageConfig = template.stages[businessStage.stage];
    if (!stageConfig) return;
    
    // Calculate realistic target based on current state
    let currentValue = 0;
    let target = stageConfig.baseTarget;
    
    // Adjust based on current metrics
    if (template.category === 'traffic') {
      currentValue = businessStage.currentMonthlyTraffic;
      if (currentValue > 0) {
        // If they have traffic, aim for realistic growth
        target = Math.round(currentValue * (1 + stageConfig.growthRate * 3)); // 3 months growth
      }
    } else if (template.category === 'conversion') {
      currentValue = businessStage.currentMonthlyLeads;
      if (currentValue > 0) {
        target = Math.round(currentValue * (1 + stageConfig.growthRate * 3));
      }
    } else if (template.category === 'revenue') {
      currentValue = Math.round(businessStage.currentMonthlyRevenue / 5000); // Rough customer count
      if (currentValue > 0) {
        target = Math.round(currentValue * (1 + stageConfig.growthRate * 3));
      }
    }
    
    // Create goal with milestones
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + stageConfig.timeframe);
    
    const goal: Goal = {
      id: `goal_${template.id}_${Date.now()}`,
      metric: template.metric,
      description: template.description,
      target,
      current: currentValue,
      unit: template.unit,
      deadline: deadline.toISOString().split('T')[0],
      status: 'active',
      priority: template.priority,
      owner: 'user',
      trend: 'stable',
      milestones: generateRealisticMilestones(currentValue, target, template.unit, stageConfig.timeframe),
      category: template.category,
      source: 'assessment',
      confidence: 0.8,
      businessStage: businessStage.stage
    };
    
    goals.push(goal);
  });
  
  // Add one foundational goal for complete beginners
  if (businessStage.stage === 'pre-launch' && goals.length < 2) {
    goals.unshift({
      id: `goal_foundation_${Date.now()}`,
      metric: 'Marketing Foundation',
      description: 'Complete basic marketing setup',
      target: 100,
      current: assessment.score || 0,
      unit: '% complete',
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'active',
      priority: 'high',
      owner: 'user',
      trend: 'stable',
      milestones: [
        { id: 'm1', label: 'Define target audience', value: 25, completed: false },
        { id: 'm2', label: 'Set up website/landing page', value: 50, completed: false },
        { id: 'm3', label: 'Install analytics', value: 75, completed: false },
        { id: 'm4', label: 'Create first content', value: 100, completed: false }
      ],
      source: 'assessment',
      businessStage: businessStage.stage
    });
  }
  
  return goals;
}

/**
 * Generate realistic milestones with smaller increments
 */
function generateRealisticMilestones(
  current: number,
  target: number,
  unit: string,
  timeframeDays: number
): any[] {
  const milestones = [];
  const totalIncrease = target - current;
  
  if (totalIncrease <= 0) {
    // If no increase needed, create percentage-based milestones
    return [
      { id: 'm1', label: `Maintain ${target} ${unit}`, value: target, completed: false }
    ];
  }
  
  // Create 4 milestones with progressive increases
  const increments = [0.2, 0.4, 0.7, 1.0]; // Reach 20%, 40%, 70%, 100% of goal
  
  increments.forEach((increment, index) => {
    const value = Math.round(current + (totalIncrease * increment));
    const weeks = Math.round((timeframeDays / 30) * (increment * 4));
    
    milestones.push({
      id: `m${index + 1}`,
      label: `Reach ${value} ${unit} (Week ${weeks})`,
      value,
      completed: false
    });
  });
  
  return milestones;
}

/**
 * Adjust goals based on actual performance (for quarterly check-ins)
 */
export function adjustGoalsBasedOnPerformance(
  currentGoals: Goal[],
  performanceData: any
): Goal[] {
  return currentGoals.map(goal => {
    const performance = performanceData[goal.id];
    if (!performance) return goal;
    
    const progressRate = goal.target > 0 ? (goal.current / goal.target) : 0;
    const timeElapsed = performance.daysElapsed || 30;
    const expectedProgress = timeElapsed / 90; // Assuming 90-day goals
    
    // If significantly behind or ahead, adjust target
    if (progressRate < expectedProgress * 0.5) {
      // Way behind - reduce target
      return {
        ...goal,
        target: Math.round(goal.target * 0.7),
        adjustmentReason: 'Target reduced based on current progress rate'
      };
    } else if (progressRate > expectedProgress * 1.5) {
      // Way ahead - increase target
      return {
        ...goal,
        target: Math.round(goal.target * 1.3),
        adjustmentReason: 'Target increased due to excellent progress'
      };
    }
    
    return goal;
  });
}

/**
 * Generate recommendations based on assessment results
 */
export function generateRecommendations(assessment: AssessmentResult): string[] {
  const recommendations: string[] = [];
  const businessStage = determineBusinessStage(assessment);
  const score = assessment.score || 0;
  
  // Stage-specific recommendations
  if (businessStage.stage === 'pre-launch') {
    recommendations.push('Focus on building your foundation - define your target audience clearly');
    recommendations.push('Set up basic analytics tracking before you launch');
    recommendations.push('Start building an email list, even with just 5-10 subscribers');
    if (!businessStage.hasWebsite) {
      recommendations.push('Create a simple landing page to start collecting leads');
    }
  } else if (businessStage.stage === 'startup') {
    recommendations.push('Establish consistent content creation - aim for 2 pieces per month');
    recommendations.push('Focus on one marketing channel until you see consistent results');
    recommendations.push('Set up conversion tracking to understand what drives results');
    if (businessStage.currentMonthlyTraffic < 100) {
      recommendations.push('Work on SEO basics to increase organic traffic');
    }
  } else if (businessStage.stage === 'growing') {
    recommendations.push('Implement A/B testing to optimize conversion rates');
    recommendations.push('Expand to 2-3 marketing channels that show promise');
    recommendations.push('Build marketing automation to scale your efforts');
    recommendations.push('Start tracking customer lifetime value (CLV)');
  } else if (businessStage.stage === 'established') {
    recommendations.push('Focus on optimization and efficiency improvements');
    recommendations.push('Develop a comprehensive content strategy');
    recommendations.push('Invest in marketing attribution to understand ROI');
    recommendations.push('Consider building a marketing team or hiring specialists');
  } else {
    recommendations.push('Scale successful campaigns and channels');
    recommendations.push('Implement advanced analytics and predictive modeling');
    recommendations.push('Build strategic partnerships for growth');
    recommendations.push('Develop thought leadership content');
  }
  
  // Score-based recommendations
  if (score < 25) {
    recommendations.push('Complete the marketing foundation checklist in your growth plan');
  } else if (score < 50) {
    recommendations.push('Focus on improving your weakest marketing areas first');
  } else if (score < 75) {
    recommendations.push('Time to optimize and scale what\'s already working');
  }
  
  // Limit to top 5 most relevant recommendations
  return recommendations.slice(0, 5);
}

/**
 * Generate quarterly check-in questions based on progress
 */
export function generateCheckInQuestions(
  goals: Goal[],
  businessStage: BusinessStage
): any[] {
  const questions = [];
  
  // Always ask about current metrics
  questions.push({
    id: 'current_traffic',
    question: 'What is your current monthly website traffic?',
    type: 'number',
    category: 'metrics',
    helpText: 'Check Google Analytics or your website stats',
    validation: { min: 0, max: 1000000 }
  });
  
  questions.push({
    id: 'current_leads',
    question: 'How many leads did you generate last month?',
    type: 'number',
    category: 'metrics',
    helpText: 'Count form submissions, calls, and email inquiries',
    validation: { min: 0, max: 10000 }
  });
  
  questions.push({
    id: 'current_customers',
    question: 'How many new customers did you acquire last month?',
    type: 'number',
    category: 'metrics',
    helpText: 'Count actual paying customers only',
    validation: { min: 0, max: 1000 }
  });
  
  // Ask about challenges
  questions.push({
    id: 'biggest_challenge',
    question: 'What has been your biggest marketing challenge this quarter?',
    type: 'multiple_choice',
    category: 'challenges',
    options: [
      { value: 'time', label: 'Not enough time for marketing' },
      { value: 'budget', label: 'Limited budget' },
      { value: 'knowledge', label: 'Not sure what to do' },
      { value: 'execution', label: 'Know what to do but struggling to execute' },
      { value: 'results', label: 'Not seeing results from efforts' },
      { value: 'tools', label: 'Lack of proper tools' }
    ]
  });
  
  // Ask about successes
  questions.push({
    id: 'biggest_win',
    question: 'What marketing tactic worked best for you this quarter?',
    type: 'multiple_choice',
    category: 'successes',
    options: [
      { value: 'content', label: 'Content marketing' },
      { value: 'social', label: 'Social media' },
      { value: 'email', label: 'Email marketing' },
      { value: 'seo', label: 'SEO improvements' },
      { value: 'ads', label: 'Paid advertising' },
      { value: 'networking', label: 'Networking/partnerships' },
      { value: 'none', label: 'Nothing worked well' }
    ]
  });
  
  // Ask about resources
  questions.push({
    id: 'resource_changes',
    question: 'Have your marketing resources changed?',
    type: 'multiple_choice',
    category: 'resources',
    options: [
      { value: 'increased_budget', label: 'Increased budget' },
      { value: 'decreased_budget', label: 'Decreased budget' },
      { value: 'hired_help', label: 'Hired help or agency' },
      { value: 'lost_help', label: 'Lost team member or support' },
      { value: 'more_time', label: 'Have more time for marketing' },
      { value: 'less_time', label: 'Have less time for marketing' },
      { value: 'no_change', label: 'No significant changes' }
    ]
  });
  
  // Stage-specific questions
  if (businessStage.stage === 'pre-launch' || businessStage.stage === 'startup') {
    questions.push({
      id: 'launch_status',
      question: 'What is your current business status?',
      type: 'multiple_choice',
      category: 'stage',
      options: [
        { value: 'pre_launch', label: 'Still preparing to launch' },
        { value: 'soft_launch', label: 'Soft launched to test market' },
        { value: 'launched', label: 'Fully launched and operating' },
        { value: 'pivoting', label: 'Pivoting business model' }
      ]
    });
  }
  
  // Ask about goal relevance
  goals.forEach(goal => {
    if (goal.status === 'active') {
      questions.push({
        id: `goal_relevance_${goal.id}`,
        question: `Is "${goal.metric}" still a priority for your business?`,
        type: 'yes_no',
        category: 'goal_relevance',
        metadata: { goalId: goal.id }
      });
    }
  });
  
  return questions;
}