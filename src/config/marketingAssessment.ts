/**
 * Marketing Assessment Questions Configuration
 * Defines the adaptive questionnaire for assessing marketing maturity
 */

import type { AssessmentQuestion } from '../types/marketing';

export const assessmentQuestions: AssessmentQuestion[] = [
  // ============= BUSINESS & AUDIENCE =============
  {
    id: 'business_defined',
    category: 'business',
    question: 'How well-defined is your business?',
    type: 'multiple_choice',
    weight: 10,
    required: true,
    options: [
      { value: 'startup', label: 'Early-stage startup (idea/MVP stage)', score: 0 },
      { value: 'growing', label: 'Growing business with some customers', score: 5 },
      { value: 'established', label: 'Established with steady revenue', score: 8 },
      { value: 'scaling', label: 'Scaling rapidly with proven model', score: 10 }
    ]
  },
  {
    id: 'ideal_client_profile',
    category: 'business',
    question: 'Do you have a clearly defined ideal client profile (ICP)?',
    type: 'yes_no',
    weight: 8,
    required: true,
    followUps: [
      {
        if: { operator: 'equals', value: true },
        then: { action: 'ask', questionId: 'icp_documented' }
      },
      {
        if: { operator: 'equals', value: false },
        then: { action: 'flag', flag: 'needs_icp_definition' }
      }
    ]
  },
  {
    id: 'icp_documented',
    category: 'business',
    question: 'How detailed is your ideal client profile?',
    type: 'multiple_choice',
    weight: 5,
    options: [
      { value: 'basic', label: 'Basic demographics only', score: 3 },
      { value: 'detailed', label: 'Demographics + psychographics', score: 6 },
      { value: 'comprehensive', label: 'Full buyer personas with journey mapping', score: 10 }
    ]
  },
  {
    id: 'competitors_identified',
    category: 'business',
    question: 'Have you identified your top competitors?',
    type: 'multiple_choice',
    weight: 6,
    options: [
      { value: 'none', label: 'No competitor research done', score: 0 },
      { value: 'basic', label: 'Know main competitors by name', score: 4 },
      { value: 'analyzed', label: 'Analyzed their strategies and positioning', score: 8 },
      { value: 'tracked', label: 'Actively track and monitor competitors', score: 10 }
    ]
  },
  {
    id: 'tam_known',
    category: 'business',
    question: 'Do you know your Total Addressable Market (TAM)?',
    type: 'multiple_choice',
    weight: 7,
    options: [
      { value: 'unknown', label: "Haven't calculated TAM", score: 0 },
      { value: 'estimated', label: 'Rough estimate based on research', score: 5 },
      { value: 'calculated', label: 'Detailed calculation with data', score: 10 }
    ]
  },
  {
    id: 'unique_value_prop',
    category: 'business',
    question: 'How clear is your unique value proposition?',
    type: 'scale',
    weight: 9,
    validation: { min: 1, max: 10 },
    helpText: '1 = No clear differentiation, 10 = Crystal clear and compelling UVP'
  },

  // ============= ANALYTICS & TRACKING =============
  {
    id: 'ga4_installed',
    category: 'analytics',
    question: 'Do you have Google Analytics 4 (GA4) installed?',
    type: 'yes_no',
    weight: 10,
    required: true,
    followUps: [
      {
        if: { operator: 'equals', value: true },
        then: { action: 'ask', questionId: 'ga4_configured' }
      },
      {
        if: { operator: 'equals', value: false },
        then: { 
          action: 'recommend', 
          recommendation: 'GA4 setup is critical for tracking. Tala can guide you through the setup process.'
        }
      }
    ]
  },
  {
    id: 'ga4_configured',
    category: 'analytics',
    question: 'How well is your GA4 configured?',
    type: 'multiple_choice',
    weight: 7,
    options: [
      { value: 'basic', label: 'Basic installation only', score: 3, signals: ['ga4_basic'] },
      { value: 'events', label: 'Key events tracked', score: 6, signals: ['ga4_events'] },
      { value: 'ecommerce', label: 'E-commerce/conversions tracked', score: 8, signals: ['ga4_ecommerce'] },
      { value: 'advanced', label: 'Custom dimensions, audiences, and reports', score: 10, signals: ['ga4_advanced'] }
    ]
  },
  {
    id: 'gsc_access',
    category: 'analytics',
    question: 'Do you have Google Search Console access?',
    type: 'yes_no',
    weight: 8,
    followUps: [
      {
        if: { operator: 'equals', value: false },
        then: { action: 'flag', flag: 'needs_gsc_setup' }
      }
    ]
  },
  {
    id: 'conversion_tracking',
    category: 'analytics',
    question: 'What conversion tracking do you have in place?',
    type: 'multi_select',
    weight: 9,
    options: [
      { value: 'none', label: 'No conversion tracking', score: 0 },
      { value: 'form_submits', label: 'Form submissions', score: 2 },
      { value: 'phone_calls', label: 'Phone call tracking', score: 2 },
      { value: 'purchases', label: 'Purchase/transaction tracking', score: 3 },
      { value: 'micro_conversions', label: 'Micro-conversions (email signups, etc.)', score: 2 },
      { value: 'offline', label: 'Offline conversion import', score: 1 }
    ]
  },
  {
    id: 'tag_manager',
    category: 'analytics',
    question: 'Do you use Google Tag Manager?',
    type: 'yes_no',
    weight: 6,
    followUps: [
      {
        if: { operator: 'equals', value: true },
        then: { action: 'flag', flag: 'has_gtm' }
      }
    ]
  },
  {
    id: 'crm_system',
    category: 'analytics',
    question: 'Which CRM system do you use?',
    type: 'multiple_choice',
    weight: 5,
    options: [
      { value: 'none', label: 'No CRM system', score: 0 },
      { value: 'spreadsheets', label: 'Spreadsheets/manual tracking', score: 2 },
      { value: 'basic_crm', label: 'Basic CRM (e.g., Pipedrive, Zoho)', score: 5 },
      { value: 'hubspot', label: 'HubSpot', score: 8, signals: ['crm_hubspot'] },
      { value: 'salesforce', label: 'Salesforce', score: 8, signals: ['crm_salesforce'] },
      { value: 'other_advanced', label: 'Other advanced CRM', score: 7 }
    ]
  },

  // ============= MARKETING CHANNELS =============
  {
    id: 'active_channels',
    category: 'channels',
    question: 'Which marketing channels are you currently using?',
    type: 'multi_select',
    weight: 8,
    required: true,
    options: [
      { value: 'none', label: 'Not doing marketing yet', score: 0 },
      { value: 'organic_social', label: 'Organic social media', score: 1 },
      { value: 'paid_social', label: 'Paid social media ads', score: 2 },
      { value: 'google_ads', label: 'Google Ads', score: 3, signals: ['ads_google'] },
      { value: 'seo', label: 'SEO/Content marketing', score: 3, signals: ['seo_active'] },
      { value: 'email', label: 'Email marketing', score: 2, signals: ['email_active'] },
      { value: 'affiliate', label: 'Affiliate/partnership marketing', score: 1 },
      { value: 'traditional', label: 'Traditional advertising', score: 1 }
    ]
  },
  {
    id: 'ppc_experience',
    category: 'channels',
    question: 'What is your experience with paid advertising (PPC)?',
    type: 'multiple_choice',
    weight: 7,
    options: [
      { value: 'none', label: 'Never run paid ads', score: 0 },
      { value: 'tried', label: 'Tried but stopped', score: 2 },
      { value: 'basic', label: 'Running basic campaigns', score: 5 },
      { value: 'optimizing', label: 'Actively optimizing campaigns', score: 8 },
      { value: 'advanced', label: 'Advanced with strong ROAS', score: 10 }
    ]
  },
  {
    id: 'seo_status',
    category: 'channels',
    question: 'How would you describe your SEO efforts?',
    type: 'multiple_choice',
    weight: 7,
    options: [
      { value: 'none', label: 'No SEO work done', score: 0 },
      { value: 'basic', label: 'Basic on-page optimization', score: 3 },
      { value: 'content', label: 'Regular content creation', score: 5 },
      { value: 'technical', label: 'Technical SEO implemented', score: 7 },
      { value: 'comprehensive', label: 'Full SEO strategy with link building', score: 10 }
    ]
  },
  {
    id: 'email_marketing',
    category: 'channels',
    question: 'What is your email marketing setup?',
    type: 'multiple_choice',
    weight: 6,
    options: [
      { value: 'none', label: 'No email marketing', score: 0 },
      { value: 'basic', label: 'Occasional newsletters', score: 3 },
      { value: 'regular', label: 'Regular campaigns', score: 5 },
      { value: 'automated', label: 'Automated sequences', score: 8, signals: ['email_automation'] },
      { value: 'advanced', label: 'Segmented with personalization', score: 10 }
    ]
  },

  // ============= CONTENT & CREATIVE =============
  {
    id: 'content_creation',
    category: 'content',
    question: 'How often do you create marketing content?',
    type: 'multiple_choice',
    weight: 6,
    options: [
      { value: 'never', label: 'Rarely or never', score: 0 },
      { value: 'sporadic', label: 'When we have time', score: 2 },
      { value: 'monthly', label: 'A few times per month', score: 5 },
      { value: 'weekly', label: 'Weekly', score: 8 },
      { value: 'daily', label: 'Daily or multiple times per week', score: 10 }
    ]
  },
  {
    id: 'content_types',
    category: 'content',
    question: 'What types of content do you create?',
    type: 'multi_select',
    weight: 5,
    options: [
      { value: 'none', label: 'No content creation', score: 0 },
      { value: 'blog', label: 'Blog posts', score: 2 },
      { value: 'video', label: 'Videos', score: 2 },
      { value: 'social', label: 'Social media posts', score: 1 },
      { value: 'email', label: 'Email newsletters', score: 1 },
      { value: 'guides', label: 'Guides/whitepapers', score: 2 },
      { value: 'webinars', label: 'Webinars/podcasts', score: 2 }
    ]
  },
  {
    id: 'brand_guidelines',
    category: 'content',
    question: 'Do you have documented brand guidelines?',
    type: 'multiple_choice',
    weight: 5,
    options: [
      { value: 'none', label: 'No brand guidelines', score: 0 },
      { value: 'basic', label: 'Logo and colors only', score: 3 },
      { value: 'visual', label: 'Visual identity guide', score: 6 },
      { value: 'comprehensive', label: 'Full brand book with voice/tone', score: 10 }
    ]
  },

  // ============= BUDGET & RESOURCES =============
  {
    id: 'monthly_budget',
    category: 'budget',
    question: 'What is your monthly marketing budget?',
    type: 'multiple_choice',
    weight: 8,
    required: true,
    options: [
      { value: '0', label: '$0 - No budget yet', score: 0 },
      { value: '500', label: 'Under $500', score: 2 },
      { value: '2000', label: '$500 - $2,000', score: 4 },
      { value: '5000', label: '$2,000 - $5,000', score: 6 },
      { value: '10000', label: '$5,000 - $10,000', score: 8 },
      { value: '10000+', label: 'Over $10,000', score: 10 }
    ]
  },
  {
    id: 'budget_allocation',
    category: 'budget',
    question: 'How do you allocate your marketing budget?',
    type: 'multiple_choice',
    weight: 5,
    options: [
      { value: 'none', label: 'No formal allocation', score: 0 },
      { value: 'adhoc', label: 'Ad-hoc spending', score: 2 },
      { value: 'planned', label: 'Planned by channel', score: 6 },
      { value: 'roi_based', label: 'Based on ROI data', score: 10 }
    ]
  },

  // ============= TEAM & OPERATIONS =============
  {
    id: 'marketing_team',
    category: 'team',
    question: 'Who handles your marketing?',
    type: 'multiple_choice',
    weight: 6,
    required: true,
    options: [
      { value: 'none', label: 'No one dedicated', score: 0 },
      { value: 'owner', label: 'Business owner/founder', score: 2 },
      { value: 'part_time', label: 'Part-time marketer', score: 4 },
      { value: 'full_time', label: 'Full-time marketer', score: 6 },
      { value: 'small_team', label: 'Small team (2-5 people)', score: 8 },
      { value: 'large_team', label: 'Large team (5+ people)', score: 10 },
      { value: 'agency', label: 'External agency', score: 7 }
    ]
  },
  {
    id: 'marketing_experience',
    category: 'team',
    question: 'How would you rate your marketing knowledge?',
    type: 'scale',
    weight: 7,
    validation: { min: 1, max: 10 },
    helpText: '1 = Complete beginner, 10 = Marketing expert'
  },
  {
    id: 'time_for_marketing',
    category: 'team',
    question: 'How many hours per week can you dedicate to marketing?',
    type: 'multiple_choice',
    weight: 5,
    options: [
      { value: '0-5', label: 'Less than 5 hours', score: 2 },
      { value: '5-10', label: '5-10 hours', score: 4 },
      { value: '10-20', label: '10-20 hours', score: 6 },
      { value: '20-40', label: '20-40 hours (half to full time)', score: 8 },
      { value: '40+', label: '40+ hours (full time+)', score: 10 }
    ]
  },

  // ============= GOALS & PRIORITIES =============
  {
    id: 'primary_goal',
    category: 'goals',
    question: 'What is your primary marketing goal for the next 90 days?',
    type: 'multiple_choice',
    weight: 10,
    required: true,
    options: [
      { value: 'awareness', label: 'Build brand awareness', score: 5 },
      { value: 'traffic', label: 'Increase website traffic', score: 5 },
      { value: 'leads', label: 'Generate more leads', score: 5 },
      { value: 'sales', label: 'Drive direct sales', score: 5 },
      { value: 'retention', label: 'Improve customer retention', score: 5 },
      { value: 'optimization', label: 'Optimize existing campaigns', score: 5 }
    ]
  },
  {
    id: 'success_metrics',
    category: 'goals',
    question: 'How do you currently measure marketing success?',
    type: 'multi_select',
    weight: 7,
    options: [
      { value: 'none', label: "Don't measure", score: 0 },
      { value: 'traffic', label: 'Website traffic', score: 1 },
      { value: 'leads', label: 'Lead generation', score: 2 },
      { value: 'conversion_rate', label: 'Conversion rates', score: 2 },
      { value: 'cac', label: 'Customer acquisition cost', score: 3 },
      { value: 'ltv', label: 'Customer lifetime value', score: 3 },
      { value: 'roi', label: 'Marketing ROI', score: 3 }
    ]
  },
  {
    id: 'biggest_challenge',
    category: 'goals',
    question: 'What is your biggest marketing challenge?',
    type: 'text',
    weight: 5,
    helpText: 'Describe in a few sentences'
  },
  {
    id: 'growth_timeline',
    category: 'goals',
    question: 'What is your desired growth timeline?',
    type: 'multiple_choice',
    weight: 6,
    options: [
      { value: 'urgent', label: 'Need results ASAP (1-3 months)', score: 3 },
      { value: 'moderate', label: 'Steady growth (3-6 months)', score: 5 },
      { value: 'patient', label: 'Long-term building (6-12 months)', score: 8 },
      { value: 'strategic', label: 'Strategic multi-year plan', score: 10 }
    ]
  }
];

/**
 * Calculate readiness score based on assessment answers
 */
export function calculateReadinessScore(answers: Record<string, any>): number {
  let totalScore = 0;
  let totalWeight = 0;

  assessmentQuestions.forEach(question => {
    const answer = answers[question.id];
    if (!answer) return;

    const weight = question.weight || 5;
    totalWeight += weight;

    let score = 0;

    if (question.type === 'yes_no') {
      score = answer ? 5 : 0;
    } else if (question.type === 'scale') {
      score = answer; // Already 1-10
    } else if (question.type === 'multiple_choice') {
      const option = question.options?.find(opt => opt.value === answer);
      score = option?.score || 0;
    } else if (question.type === 'multi_select' && Array.isArray(answer)) {
      answer.forEach(val => {
        const option = question.options?.find(opt => opt.value === val);
        score += (option?.score || 0);
      });
      // Cap multi-select at 10
      score = Math.min(score, 10);
    }

    totalScore += score * weight;
  });

  // Return percentage
  return totalWeight > 0 ? Math.round((totalScore / (totalWeight * 10)) * 100) : 0;
}

/**
 * Determine skill level based on score
 */
export function getSkillLevel(score: number): 'new' | 'intermediate' | 'advanced' | 'expert' {
  if (score >= 75) return 'expert';
  if (score >= 50) return 'advanced';
  if (score >= 25) return 'intermediate';
  return 'new';
}

/**
 * Get category scores breakdown
 */
export function getCategoryScores(answers: Record<string, any>): Record<string, number> {
  const categories = ['business', 'analytics', 'channels', 'content', 'budget', 'team', 'goals'];
  const scores: Record<string, number> = {};

  categories.forEach(category => {
    const categoryQuestions = assessmentQuestions.filter(q => q.category === category);
    let catScore = 0;
    let catWeight = 0;

    categoryQuestions.forEach(question => {
      const answer = answers[question.id];
      if (!answer) return;

      const weight = question.weight || 5;
      catWeight += weight;

      let score = 0;
      // Same scoring logic as above
      if (question.type === 'yes_no') {
        score = answer ? 5 : 0;
      } else if (question.type === 'scale') {
        score = answer;
      } else if (question.type === 'multiple_choice') {
        const option = question.options?.find(opt => opt.value === answer);
        score = option?.score || 0;
      } else if (question.type === 'multi_select' && Array.isArray(answer)) {
        answer.forEach(val => {
          const option = question.options?.find(opt => opt.value === val);
          score += (option?.score || 0);
        });
        score = Math.min(score, 10);
      }

      catScore += score * weight;
    });

    scores[category] = catWeight > 0 ? Math.round((catScore / (catWeight * 10)) * 100) : 0;
  });

  return scores;
}

/**
 * Get next questions based on current answers
 */
export function getNextQuestion(
  answers: Record<string, any>,
  answeredIds: Set<string>
): AssessmentQuestion | null {
  // First, check for any follow-up questions triggered by recent answers
  for (const question of assessmentQuestions) {
    if (answeredIds.has(question.id)) {
      const answer = answers[question.id];
      if (question.followUps) {
        for (const followUp of question.followUps) {
          let shouldTrigger = false;

          switch (followUp.if.operator) {
            case 'equals':
              shouldTrigger = answer === followUp.if.value;
              break;
            case 'not_equals':
              shouldTrigger = answer !== followUp.if.value;
              break;
            case 'contains':
              shouldTrigger = Array.isArray(answer) 
                ? answer.includes(followUp.if.value)
                : String(answer).includes(followUp.if.value);
              break;
            case 'greater_than':
              shouldTrigger = answer > followUp.if.value;
              break;
            case 'less_than':
              shouldTrigger = answer < followUp.if.value;
              break;
          }

          if (shouldTrigger && followUp.then.action === 'ask' && followUp.then.questionId) {
            const nextQ = assessmentQuestions.find(q => q.id === followUp.then.questionId);
            if (nextQ && !answeredIds.has(nextQ.id)) {
              return nextQ;
            }
          }
        }
      }
    }
  }

  // Otherwise, return the next unanswered required question or any unanswered question
  const requiredQuestions = assessmentQuestions.filter(q => q.required && !answeredIds.has(q.id));
  if (requiredQuestions.length > 0) {
    return requiredQuestions[0];
  }

  const unansweredQuestions = assessmentQuestions.filter(q => !answeredIds.has(q.id));
  return unansweredQuestions.length > 0 ? unansweredQuestions[0] : null;
}

/**
 * Get recommendations based on assessment
 */
export function getRecommendations(answers: Record<string, any>): string[] {
  const recommendations: string[] = [];
  const flags = new Set<string>();

  // Check for flags from follow-ups
  assessmentQuestions.forEach(question => {
    const answer = answers[question.id];
    if (answer !== undefined && question.followUps) {
      question.followUps.forEach(followUp => {
        let shouldTrigger = false;

        switch (followUp.if.operator) {
          case 'equals':
            shouldTrigger = answer === followUp.if.value;
            break;
          // ... other operators
        }

        if (shouldTrigger) {
          if (followUp.then.action === 'flag' && followUp.then.flag) {
            flags.add(followUp.then.flag);
          } else if (followUp.then.action === 'recommend' && followUp.then.recommendation) {
            recommendations.push(followUp.then.recommendation);
          }
        }
      });
    }
  });

  // Add recommendations based on flags
  if (flags.has('needs_ga4_setup')) {
    recommendations.push('Set up Google Analytics 4 to start tracking website performance');
  }
  if (flags.has('needs_gsc_setup')) {
    recommendations.push('Connect Google Search Console to monitor search performance');
  }
  if (flags.has('needs_icp_definition')) {
    recommendations.push('Define your ideal client profile to improve targeting');
  }

  // Add recommendations based on low scores
  const categoryScores = getCategoryScores(answers);
  
  if (categoryScores.analytics < 30) {
    recommendations.push('Improve tracking and analytics to make data-driven decisions');
  }
  if (categoryScores.business < 30) {
    recommendations.push('Strengthen your business foundation with clear positioning');
  }
  if (categoryScores.channels < 30) {
    recommendations.push('Explore and test new marketing channels for growth');
  }

  return recommendations.slice(0, 5); // Return top 5 recommendations
}