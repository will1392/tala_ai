/**
 * Goal Generator Service
 * Creates initial marketing goals based on assessment results
 */

import type { Goal, AssessmentResult } from '../../types/marketing';

interface GoalTemplate {
  id: string;
  metric: string;
  description: string;
  unit: string;
  category: string;
  baseTarget: number;
  targetMultiplier?: number;
  priority: 'low' | 'medium' | 'high';
  requiredScore?: number; // Minimum score in category to suggest this goal
  maxScore?: number; // Maximum score in category to suggest this goal
}

// Goal templates based on common marketing objectives
const goalTemplates: GoalTemplate[] = [
  // Traffic Goals
  {
    id: 'increase-traffic',
    metric: 'Monthly Website Traffic',
    description: 'Increase monthly website visitors through SEO and content marketing',
    unit: 'visitors',
    category: 'channels',
    baseTarget: 1000,
    targetMultiplier: 3,
    priority: 'high',
    maxScore: 50
  },
  {
    id: 'organic-traffic',
    metric: 'Organic Search Traffic',
    description: 'Grow organic search traffic through SEO optimization',
    unit: 'visitors/month',
    category: 'seo',
    baseTarget: 500,
    targetMultiplier: 2,
    priority: 'medium',
    maxScore: 40
  },
  
  // Conversion Goals
  {
    id: 'improve-conversion',
    metric: 'Website Conversion Rate',
    description: 'Optimize website to convert more visitors into leads',
    unit: '%',
    category: 'analytics',
    baseTarget: 3,
    priority: 'high',
    maxScore: 60
  },
  {
    id: 'lead-generation',
    metric: 'Monthly Leads',
    description: 'Generate qualified leads through multiple channels',
    unit: 'leads',
    category: 'business',
    baseTarget: 50,
    targetMultiplier: 2,
    priority: 'high',
    maxScore: 50
  },
  
  // Engagement Goals
  {
    id: 'email-list',
    metric: 'Email Subscriber Growth',
    description: 'Build email list for direct marketing',
    unit: 'subscribers',
    category: 'channels',
    baseTarget: 100,
    targetMultiplier: 3,
    priority: 'medium',
    maxScore: 40
  },
  {
    id: 'social-followers',
    metric: 'Social Media Followers',
    description: 'Grow social media presence and engagement',
    unit: 'followers',
    category: 'content',
    baseTarget: 500,
    targetMultiplier: 2,
    priority: 'low',
    maxScore: 30
  },
  
  // Revenue Goals
  {
    id: 'revenue-growth',
    metric: 'Marketing-Generated Revenue',
    description: 'Track revenue directly attributed to marketing efforts',
    unit: '$/month',
    category: 'goals',
    baseTarget: 10000,
    targetMultiplier: 2,
    priority: 'high',
    requiredScore: 40
  },
  {
    id: 'customer-acquisition',
    metric: 'New Customers',
    description: 'Acquire new customers through marketing campaigns',
    unit: 'customers/month',
    category: 'business',
    baseTarget: 10,
    targetMultiplier: 2,
    priority: 'high'
  },
  
  // Efficiency Goals
  {
    id: 'reduce-cac',
    metric: 'Customer Acquisition Cost',
    description: 'Reduce the cost of acquiring new customers',
    unit: '$',
    category: 'budget',
    baseTarget: 100,
    targetMultiplier: 0.7, // Reduction goal
    priority: 'medium',
    requiredScore: 30
  },
  {
    id: 'improve-roas',
    metric: 'Return on Ad Spend',
    description: 'Improve the return on advertising investments',
    unit: ':1',
    category: 'channels',
    baseTarget: 3,
    priority: 'high',
    requiredScore: 25
  },
  
  // Foundation Goals
  {
    id: 'setup-analytics',
    metric: 'Analytics Implementation',
    description: 'Set up comprehensive tracking and analytics',
    unit: '% complete',
    category: 'analytics',
    baseTarget: 100,
    priority: 'high',
    maxScore: 30
  },
  {
    id: 'content-production',
    metric: 'Content Pieces Published',
    description: 'Create and publish valuable content regularly',
    unit: 'pieces/month',
    category: 'content',
    baseTarget: 4,
    targetMultiplier: 2,
    priority: 'medium',
    maxScore: 50
  }
];

/**
 * Generate initial goals based on assessment results
 */
export function generateInitialGoals(
  assessment: AssessmentResult,
  skillLevel: string,
  existingGoals: Goal[] = []
): Goal[] {
  const goals: Goal[] = [];
  const categoryScores = assessment.buckets || {};
  
  // Identify weak areas that need improvement
  const weakAreas = Object.entries(categoryScores)
    .filter(([_, score]) => score < 50)
    .sort((a, b) => a[1] - b[1]) // Sort by lowest score first
    .map(([category]) => category);
  
  // Select appropriate goal templates based on skill level and weak areas
  const selectedTemplates = goalTemplates.filter(template => {
    // Check if we already have a similar goal
    if (existingGoals.some(g => g.metric === template.metric)) {
      return false;
    }
    
    const categoryScore = categoryScores[template.category] || 0;
    
    // Check score requirements
    if (template.requiredScore && categoryScore < template.requiredScore) {
      return false;
    }
    
    if (template.maxScore && categoryScore > template.maxScore) {
      return true; // Include if score is low enough
    }
    
    // Prioritize goals for weak areas
    if (weakAreas.includes(template.category)) {
      return true;
    }
    
    // Include high priority goals for beginners
    if (skillLevel === 'new' && template.priority === 'high') {
      return true;
    }
    
    // Include all priorities for intermediate and above
    if (skillLevel !== 'new') {
      return categoryScore < 70; // Focus on areas below 70%
    }
    
    return false;
  });
  
  // Generate 3-5 initial goals
  const goalCount = skillLevel === 'new' ? 3 : 
                    skillLevel === 'intermediate' ? 4 : 5;
  
  selectedTemplates
    .sort((a, b) => {
      // Sort by priority and relevance to weak areas
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      // Then by category score (lower scores first)
      const aScore = categoryScores[a.category] || 100;
      const bScore = categoryScores[b.category] || 100;
      return aScore - bScore;
    })
    .slice(0, goalCount)
    .forEach(template => {
      // Calculate appropriate target based on skill level
      let target = template.baseTarget;
      if (template.targetMultiplier) {
        const multiplier = skillLevel === 'new' ? 1 :
                          skillLevel === 'intermediate' ? 1.5 :
                          skillLevel === 'advanced' ? 2 :
                          2.5;
        target = Math.round(template.baseTarget * Math.min(template.targetMultiplier, multiplier));
      }
      
      // Set deadline based on priority and skill level
      const daysToDeadline = template.priority === 'high' ? 30 :
                             template.priority === 'medium' ? 60 : 90;
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + daysToDeadline);
      
      // Create goal
      const goal: Goal = {
        id: `goal_${template.id}_${Date.now()}`,
        metric: template.metric,
        description: template.description,
        target,
        current: 0,
        unit: template.unit,
        deadline: deadline.toISOString().split('T')[0],
        status: 'active',
        priority: template.priority,
        owner: 'user',
        trend: 'stable',
        milestones: generateMilestones(target, template.unit),
        category: template.category,
        source: 'assessment',
        confidence: assessment.confidence || 0.7
      };
      
      goals.push(goal);
    });
  
  // Add one foundational goal if user is new
  if (skillLevel === 'new' && goals.length < 3) {
    const setupGoal: Goal = {
      id: `goal_foundation_${Date.now()}`,
      metric: 'Marketing Foundation Setup',
      description: 'Complete essential marketing setup tasks',
      target: 100,
      current: assessment.score || 0,
      unit: '% complete',
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'active',
      priority: 'high',
      owner: 'user',
      trend: 'stable',
      milestones: [
        { id: 'm1', label: 'Set up Google Analytics', value: 25, completed: false },
        { id: 'm2', label: 'Define ideal customer', value: 50, completed: false },
        { id: 'm3', label: 'Create first content', value: 75, completed: false },
        { id: 'm4', label: 'Launch first campaign', value: 100, completed: false }
      ],
      source: 'assessment'
    };
    goals.unshift(setupGoal); // Add as first goal
  }
  
  return goals;
}

/**
 * Generate milestones for a goal
 */
function generateMilestones(target: number, unit: string): any[] {
  const milestones = [];
  const steps = 4; // Create 4 milestones
  
  for (let i = 1; i <= steps; i++) {
    const value = Math.round((target / steps) * i);
    milestones.push({
      id: `m${i}`,
      label: `Reach ${value} ${unit}`,
      value,
      completed: false
    });
  }
  
  return milestones;
}

/**
 * Generate recommendations for improving weak areas
 */
export function generateRecommendations(
  assessment: AssessmentResult,
  goals: Goal[]
): string[] {
  const recommendations: string[] = [];
  const categoryScores = assessment.buckets || {};
  
  // Analytics recommendations
  if (categoryScores.analytics < 30) {
    recommendations.push('📊 Set up Google Analytics 4 and conversion tracking to measure marketing effectiveness');
  } else if (categoryScores.analytics < 60) {
    recommendations.push('📊 Enhance your analytics setup with custom events and audience segments');
  }
  
  // SEO recommendations
  if (categoryScores.channels < 30) {
    recommendations.push('🔍 Start with basic SEO: optimize page titles, meta descriptions, and create quality content');
  } else if (categoryScores.channels < 60) {
    recommendations.push('🔍 Expand your marketing channels - consider email marketing or paid advertising');
  }
  
  // Content recommendations
  if (categoryScores.content < 40) {
    recommendations.push('📝 Develop a content strategy and create valuable content for your audience regularly');
  }
  
  // Business foundation
  if (categoryScores.business < 40) {
    recommendations.push('🎯 Define your ideal customer profile and unique value proposition clearly');
  }
  
  // Budget recommendations
  if (categoryScores.budget < 30) {
    recommendations.push('💰 Start with free/low-cost marketing tactics like SEO and organic social media');
  }
  
  // Add goal-specific recommendations
  goals.forEach(goal => {
    if (goal.priority === 'high' && goal.current === 0) {
      recommendations.push(`⚡ Priority: Start working on "${goal.metric}" immediately`);
    }
  });
  
  return recommendations.slice(0, 5); // Return top 5 recommendations
}

/**
 * Update goals based on new evidence
 */
export function updateGoalsWithEvidence(
  goals: Goal[],
  evidence: any[]
): Goal[] {
  return goals.map(goal => {
    // Check if there's evidence related to this goal
    const relatedEvidence = evidence.filter(e => 
      e.relatedGoals?.includes(goal.id) ||
      e.category === goal.category
    );
    
    if (relatedEvidence.length > 0) {
      // Update confidence based on evidence
      const avgConfidence = relatedEvidence.reduce((sum, e) => sum + (e.confidence || 0), 0) / relatedEvidence.length;
      
      // Update trend based on recent evidence
      const recentEvidence = relatedEvidence.filter(e => {
        const evidenceDate = new Date(e.timestamp);
        const daysSince = (Date.now() - evidenceDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysSince < 7;
      });
      
      if (recentEvidence.length > 0) {
        // Analyze trend from evidence
        // This is simplified - in reality, you'd analyze the actual data points
        const trend = recentEvidence[0].data?.trend || goal.trend;
        
        return {
          ...goal,
          confidence: avgConfidence,
          trend,
          hasEvidence: true
        };
      }
    }
    
    return goal;
  });
}