/**
 * Marketing Context Service
 * Provides marketing assessment data to chat and other services
 */

import type { MarketingProfile, Goal } from '../types/marketing';

class MarketingContextService {
  private static instance: MarketingContextService;
  private currentProfile: MarketingProfile | null = null;
  private brandId: string = '';
  private conversations: Map<string, any> = new Map();
  private activeConversation: any = null;
  private growthPlanContext: any = null;

  private constructor() {
    // Load saved profile from localStorage on init
    this.loadSavedProfile();
  }

  static getInstance(): MarketingContextService {
    if (!MarketingContextService.instance) {
      MarketingContextService.instance = new MarketingContextService();
    }
    return MarketingContextService.instance;
  }

  /**
   * Load saved profile from localStorage
   */
  private loadSavedProfile(): void {
    try {
      // Get the default brand ID or last used
      const lastBrandId = localStorage.getItem('last_marketing_brand_id') || 'test-brand-1';
      const savedProfile = localStorage.getItem(`marketing_profile_${lastBrandId}`);
      
      if (savedProfile) {
        this.currentProfile = JSON.parse(savedProfile);
        this.brandId = lastBrandId;
      }
    } catch (error) {
      console.error('Failed to load saved marketing profile:', error);
    }
  }

  /**
   * Set the current marketing profile
   */
  setProfile(profile: MarketingProfile, brandId: string): void {
    this.currentProfile = profile;
    this.brandId = brandId;
    
    // Save to localStorage
    localStorage.setItem(`marketing_profile_${brandId}`, JSON.stringify(profile));
    localStorage.setItem('last_marketing_brand_id', brandId);
  }

  /**
   * Get the current marketing profile
   */
  getProfile(): MarketingProfile | null {
    return this.currentProfile;
  }

  /**
   * Get context for chat system
   */
  getChatContext(): string {
    if (!this.currentProfile) {
      return '';
    }

    const { assessment, skillLevel, goals, growthPlan } = this.currentProfile;
    
    let context = '## Marketing Profile Context\n\n';
    
    // Add skill level
    context += `**Marketing Skill Level:** ${this.formatSkillLevel(skillLevel)}\n`;
    
    // Add assessment scores if available
    if (assessment) {
      context += `**Overall Readiness:** ${assessment.score}%\n`;
      context += '\n### Marketing Maturity Scores:\n';
      
      if (assessment.buckets) {
        Object.entries(assessment.buckets).forEach(([category, score]) => {
          context += `- ${this.formatCategory(category)}: ${score}%\n`;
        });
      }
      
      // Add key strengths and weaknesses
      const strengths = this.getStrengths(assessment.buckets);
      const weaknesses = this.getWeaknesses(assessment.buckets);
      
      if (strengths.length > 0) {
        context += '\n**Strengths:**\n';
        strengths.forEach(s => context += `- ${s}\n`);
      }
      
      if (weaknesses.length > 0) {
        context += '\n**Areas for Improvement:**\n';
        weaknesses.forEach(w => context += `- ${w}\n`);
      }
    }
    
    // Add active goals
    if (goals && goals.length > 0) {
      const activeGoals = goals.filter(g => g.status === 'active');
      if (activeGoals.length > 0) {
        context += '\n### Active Marketing Goals:\n';
        activeGoals.forEach(goal => {
          const progress = goal.target > 0 ? Math.round((goal.current / goal.target) * 100) : 0;
          context += `- ${goal.metric}: ${goal.current}/${goal.target} ${goal.unit} (${progress}% complete)\n`;
        });
      }
    }
    
    // Add current growth phase
    if (growthPlan && growthPlan.currentPhase) {
      const currentPhase = growthPlan.phases.find(p => p.id === growthPlan.currentPhase);
      if (currentPhase) {
        context += `\n**Current Growth Phase:** ${currentPhase.label}\n`;
        
        // Add next steps
        const nextSteps = currentPhase.steps
          .filter(s => s.status === 'todo' || s.status === 'in_progress')
          .slice(0, 3);
        
        if (nextSteps.length > 0) {
          context += '\n**Next Steps:**\n';
          nextSteps.forEach(step => {
            context += `- ${step.label}\n`;
          });
        }
      }
    }
    
    // Add business context from assessment answers
    if (assessment?.inputs) {
      const businessContext = this.extractBusinessContext(assessment.inputs);
      if (businessContext) {
        context += '\n### Business Context:\n' + businessContext;
      }
    }
    
    return context;
  }

  /**
   * Get structured data for chat system
   */
  getStructuredContext(): any {
    if (!this.currentProfile) {
      return null;
    }

    const { assessment, skillLevel, goals, growthPlan, evidence } = this.currentProfile;
    
    return {
      skillLevel,
      readinessScore: assessment?.score || 0,
      categoryScores: assessment?.buckets || {},
      activeGoals: goals?.filter(g => g.status === 'active').map(g => ({
        metric: g.metric,
        progress: g.target > 0 ? (g.current / g.target) * 100 : 0,
        priority: g.priority,
        deadline: g.deadline
      })) || [],
      currentPhase: growthPlan?.currentPhase || null,
      verifiedEvidence: evidence?.filter(e => e.verified).length || 0,
      strengths: this.getStrengths(assessment?.buckets),
      weaknesses: this.getWeaknesses(assessment?.buckets),
      recommendations: this.getTopRecommendations()
    };
  }

  /**
   * Get response adjustment based on skill level
   */
  getResponseAdjustment(): any {
    const skillLevel = this.currentProfile?.skillLevel || 'new';
    
    return {
      complexity: skillLevel === 'new' ? 'simple' :
                  skillLevel === 'intermediate' ? 'moderate' :
                  skillLevel === 'advanced' ? 'detailed' :
                  'expert',
      terminology: skillLevel === 'new' ? 'avoid_jargon' :
                   skillLevel === 'intermediate' ? 'explain_terms' :
                   'use_professional',
      examples: skillLevel === 'new' ? 'many_examples' :
                skillLevel === 'intermediate' ? 'some_examples' :
                'minimal_examples',
      guidance: skillLevel === 'new' ? 'step_by_step' :
                skillLevel === 'intermediate' ? 'general_direction' :
                'high_level'
    };
  }

  /**
   * Check if a specific capability is available
   */
  hasCapability(capability: string): boolean {
    if (!this.currentProfile?.assessment?.inputs) {
      return false;
    }

    const inputs = this.currentProfile.assessment.inputs;
    
    // Check specific capabilities
    const capabilityMap: Record<string, string[]> = {
      'analytics': ['ga4_installed', 'conversion_tracking'],
      'seo': ['gsc_access', 'seo_status'],
      'email': ['email_marketing'],
      'paid_ads': ['ppc_experience'],
      'crm': ['crm_system'],
      'content': ['content_creation', 'content_types']
    };

    const relevantInputs = capabilityMap[capability] || [];
    
    return relevantInputs.some(inputId => {
      const input = inputs.find(i => i.id === inputId);
      return input && input.value && input.value !== 'none' && input.value !== false;
    });
  }

  /**
   * Get personalized greeting based on profile
   */
  getPersonalizedGreeting(): string {
    const skillLevel = this.currentProfile?.skillLevel || 'new';
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? 'Good morning' : 
                         hour < 17 ? 'Good afternoon' : 'Good evening';
    
    if (skillLevel === 'new') {
      return `${timeGreeting}! I'm here to guide you through your marketing journey. Let's start with the basics and build from there.`;
    } else if (skillLevel === 'intermediate') {
      return `${timeGreeting}! Ready to optimize your marketing efforts? I can help you refine your strategies and explore new channels.`;
    } else if (skillLevel === 'advanced') {
      return `${timeGreeting}! Let's dive into advanced strategies to scale your marketing performance.`;
    } else {
      return `${timeGreeting}! Looking to push the boundaries of your marketing? Let's explore cutting-edge strategies.`;
    }
  }

  // Helper methods
  
  private formatSkillLevel(level: string): string {
    const levels: Record<string, string> = {
      'new': 'Beginner',
      'intermediate': 'Intermediate',
      'advanced': 'Advanced',
      'expert': 'Expert'
    };
    return levels[level] || level;
  }

  private formatCategory(category: string): string {
    const categories: Record<string, string> = {
      'business': 'Business Foundation',
      'analytics': 'Analytics & Tracking',
      'channels': 'Marketing Channels',
      'content': 'Content & Creative',
      'budget': 'Budget & Resources',
      'team': 'Team & Operations',
      'goals': 'Goals & Metrics'
    };
    return categories[category] || category;
  }

  private getStrengths(buckets: any): string[] {
    if (!buckets) return [];
    
    return Object.entries(buckets)
      .filter(([_, score]) => score as number >= 70)
      .map(([category]) => this.formatCategory(category))
      .slice(0, 3);
  }

  private getWeaknesses(buckets: any): string[] {
    if (!buckets) return [];
    
    return Object.entries(buckets)
      .filter(([_, score]) => score as number < 50)
      .sort((a, b) => (a[1] as number) - (b[1] as number))
      .map(([category]) => this.formatCategory(category))
      .slice(0, 3);
  }

  private extractBusinessContext(inputs: any[]): string {
    let context = '';
    
    // Extract key business information
    const businessInputs = [
      { id: 'business_defined', label: 'Business Stage' },
      { id: 'ideal_client_profile', label: 'Has ICP' },
      { id: 'monthly_budget', label: 'Marketing Budget' },
      { id: 'marketing_team', label: 'Team Structure' },
      { id: 'primary_goal', label: 'Primary Goal' },
      { id: 'active_channels', label: 'Active Channels' }
    ];

    businessInputs.forEach(({ id, label }) => {
      const input = inputs.find(i => i.id === id);
      if (input && input.value) {
        let value = input.value;
        
        // Format the value
        if (typeof value === 'boolean') {
          value = value ? 'Yes' : 'No';
        } else if (Array.isArray(value)) {
          value = value.join(', ');
        } else if (id === 'monthly_budget') {
          value = `$${value}/month`;
        }
        
        context += `- **${label}:** ${value}\n`;
      }
    });

    return context;
  }

  private getTopRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (!this.currentProfile?.assessment) {
      recommendations.push('Complete the marketing assessment to get personalized recommendations');
      return recommendations;
    }

    const { buckets } = this.currentProfile.assessment;
    
    // Analytics recommendations
    if (buckets?.analytics < 30) {
      recommendations.push('Set up Google Analytics 4 and conversion tracking');
    }
    
    // Business foundation
    if (buckets?.business < 40) {
      recommendations.push('Define your ideal customer profile and value proposition');
    }
    
    // Channel recommendations
    if (buckets?.channels < 30) {
      recommendations.push('Start with one marketing channel and master it before expanding');
    }
    
    // Content recommendations
    if (buckets?.content < 40) {
      recommendations.push('Create a content calendar and publish consistently');
    }
    
    return recommendations.slice(0, 3);
  }

  /**
   * Update a goal's progress
   */
  updateGoalProgress(goalId: string, current: number): void {
    if (!this.currentProfile?.goals) return;
    
    const goal = this.currentProfile.goals.find(g => g.id === goalId);
    if (goal) {
      goal.current = current;
      goal.trend = current > goal.current ? 'up' : 
                   current < goal.current ? 'down' : 'stable';
      
      // Save updated profile
      this.setProfile(this.currentProfile, this.brandId);
    }
  }

  /**
   * Mark a growth plan step as complete
   */
  completeGrowthStep(phaseId: string, stepId: string): void {
    if (!this.currentProfile?.growthPlan) return;
    
    const phase = this.currentProfile.growthPlan.phases.find(p => p.id === phaseId);
    if (phase) {
      const step = phase.steps.find(s => s.id === stepId);
      if (step) {
        step.status = 'done';
        
        // Save updated profile
        this.setProfile(this.currentProfile, this.brandId);
      }
    }
  }

  /**
   * Store a conversation for later continuation
   */
  storeConversation(conversationId: string, messages: any[]): void {
    this.conversations.set(conversationId, {
      id: conversationId,
      messages,
      timestamp: Date.now(),
      context: this.growthPlanContext
    });
    
    // Also save to localStorage for persistence
    const conversationsArray = Array.from(this.conversations.entries());
    localStorage.setItem('marketing_conversations', JSON.stringify(conversationsArray));
  }

  /**
   * Get a stored conversation
   */
  getConversation(conversationId: string): any {
    return this.conversations.get(conversationId);
  }

  /**
   * Set the active conversation for continuation
   */
  setActiveConversation(conversation: any): void {
    this.activeConversation = conversation;
    localStorage.setItem('active_marketing_conversation', JSON.stringify(conversation));
  }

  /**
   * Get the active conversation
   */
  getActiveConversation(): any {
    if (!this.activeConversation) {
      const saved = localStorage.getItem('active_marketing_conversation');
      if (saved) {
        this.activeConversation = JSON.parse(saved);
      }
    }
    return this.activeConversation;
  }

  /**
   * Set growth plan context for help requests
   */
  setGrowthPlanContext(context: any): void {
    this.growthPlanContext = context;
    localStorage.setItem('growth_plan_context', JSON.stringify(context));
  }

  /**
   * Get growth plan context
   */
  getGrowthPlanContext(): any {
    if (!this.growthPlanContext) {
      const saved = localStorage.getItem('growth_plan_context');
      if (saved) {
        this.growthPlanContext = JSON.parse(saved);
      }
    }
    return this.growthPlanContext;
  }

  /**
   * Clear a conversation after it's been completed
   */
  clearConversation(conversationId: string): void {
    this.conversations.delete(conversationId);
    if (this.activeConversation?.id === conversationId) {
      this.activeConversation = null;
      localStorage.removeItem('active_marketing_conversation');
    }
  }

  /**
   * Load stored conversations from localStorage
   */
  loadStoredConversations(): void {
    const saved = localStorage.getItem('marketing_conversations');
    if (saved) {
      try {
        const conversationsArray = JSON.parse(saved);
        this.conversations = new Map(conversationsArray);
      } catch (error) {
        console.error('Failed to load stored conversations:', error);
      }
    }
  }
}

// Export singleton instance
export const marketingContext = MarketingContextService.getInstance();

// Export helper function for chat integration
export function getMarketingContext(): string {
  return marketingContext.getChatContext();
}

// Export structured data for advanced integration
export function getMarketingStructuredData(): any {
  return marketingContext.getStructuredContext();
}

// Export response adjustment for chat
export function getMarketingResponseAdjustment(): any {
  return marketingContext.getResponseAdjustment();
}