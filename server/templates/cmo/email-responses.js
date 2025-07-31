/**
 * Email Marketing Response Templates
 * 
 * Context-aware response templates for email marketing queries
 */

export const emailTemplates = {
  // Intent-based templates
  intents: {
    create: {
      title: 'Creating Email Campaign',
      template: `Let's create your {campaignType} email campaign. Here's a strategic approach:

**Campaign Overview:**
- **Goal**: {goal}
- **Audience**: {audience} ({listSize} subscribers)
- **Send Date**: {sendDate}

**Email Structure:**
1. **Subject Line**: {subjectLine}
   - Open rate prediction: {openRatePrediction}
2. **Preview Text**: {previewText}
3. **Content Sections**:
   {contentSections}

**Personalization Elements:**
{personalization}

**Call-to-Action:**
- Primary CTA: {primaryCTA}
- Secondary CTA: {secondaryCTA}

**Testing Strategy:**
{testingStrategy}

{examples}`,
      variables: ['campaignType', 'goal', 'audience', 'listSize', 'sendDate', 'subjectLine', 'openRatePrediction', 'previewText', 'contentSections', 'personalization', 'primaryCTA', 'secondaryCTA', 'testingStrategy', 'examples']
    },

    optimize: {
      title: 'Email Optimization',
      template: `Let's optimize your email {optimizationTarget} for better performance.

**Current Performance:**
- Open Rate: {currentOpenRate} (Industry avg: {industryOpenRate})
- Click Rate: {currentClickRate} (Industry avg: {industryClickRate})
- Conversion Rate: {currentConversionRate}

**Optimization Opportunities:**
{opportunities}

**A/B Test Recommendations:**
1. {test1} - Expected lift: {lift1}
2. {test2} - Expected lift: {lift2}
3. {test3} - Expected lift: {lift3}

**Segmentation Strategy:**
{segmentationStrategy}

**Timeline & Expected Results:**
{timeline}

{benchmarks}`,
      variables: ['optimizationTarget', 'currentOpenRate', 'industryOpenRate', 'currentClickRate', 'industryClickRate', 'currentConversionRate', 'opportunities', 'test1', 'lift1', 'test2', 'lift2', 'test3', 'lift3', 'segmentationStrategy', 'timeline', 'benchmarks']
    },

    analyze: {
      title: 'Email Campaign Analysis',
      template: `Here's my analysis of your {campaignName} campaign:

**Campaign Performance:**
{performanceOverview}

**Key Metrics:**
- Delivered: {delivered} ({deliveryRate}%)
- Opens: {opens} ({openRate}%)
- Clicks: {clicks} ({clickRate}%)
- Conversions: {conversions} ({conversionRate}%)
- Revenue: {revenue} (ROI: {roi})

**Audience Insights:**
{audienceInsights}

**Device & Client Analysis:**
{deviceAnalysis}

**What Worked Well:**
{strengths}

**Areas for Improvement:**
{improvements}

**Recommendations for Next Campaign:**
{recommendations}`,
      variables: ['campaignName', 'performanceOverview', 'delivered', 'deliveryRate', 'opens', 'openRate', 'clicks', 'clickRate', 'conversions', 'conversionRate', 'revenue', 'roi', 'audienceInsights', 'deviceAnalysis', 'strengths', 'improvements', 'recommendations']
    }
  },

  // Quick answer templates
  quickAnswers: {
    subjectLineLength: {
      question: 'subject line length',
      answer: 'Keep subject lines under 50 characters (30-40 is ideal for mobile).\n\n**Subject Line Best Practices:**\n- Create urgency without being spammy\n- Personalize with name or location\n- Ask questions to spark curiosity\n- Use numbers for specificity\n- Test emojis with your audience'
    },

    bestSendTime: {
      question: 'best time to send',
      answer: 'General best times: Tuesday-Thursday, 10 AM or 2 PM recipient\'s time.\n\n**Industry Variations:**\n- B2B: Tuesday-Thursday, 10-11 AM\n- B2C: Evenings and weekends work well\n- E-commerce: Thursday 8 PM, Sunday 2 PM\n\n**Pro Tip**: Test with your specific audience as results vary.'
    },

    listSegmentation: {
      question: 'segment email list',
      answer: 'Segmentation can increase open rates by 14% and clicks by 100%.\n\n**Key Segmentation Strategies:**\n- Demographics (age, location, gender)\n- Behavior (purchase history, engagement)\n- Preferences (content topics, frequency)\n- Lifecycle stage (new, active, lapsed)\n- Value (VIP, regular, at-risk)'
    }
  },

  // Campaign types
  campaignTypes: {
    welcome: {
      type: 'Welcome Series',
      structure: [
        'Email 1: Instant welcome + deliver incentive',
        'Email 2: Brand story + social proof (Day 3)',
        'Email 3: Popular products/content (Day 5)',
        'Email 4: Customer testimonials (Day 10)',
        'Email 5: Exclusive offer (Day 14)'
      ],
      tips: ['Send first email immediately', 'Set expectations', 'Progressive value delivery']
    },

    abandonment: {
      type: 'Cart Abandonment',
      structure: [
        'Email 1: Gentle reminder (2-4 hours)',
        'Email 2: Address objections + reviews (24 hours)',
        'Email 3: Limited-time discount (72 hours)'
      ],
      tips: ['Include product images', 'Show social proof', 'Create urgency']
    },

    reengagement: {
      type: 'Win-Back Campaign',
      structure: [
        'Email 1: "We miss you" + value reminder',
        'Email 2: Exclusive comeback offer',
        'Email 3: Last chance + preference center'
      ],
      tips: ['Acknowledge absence', 'Offer incentive', 'Easy unsubscribe option']
    }
  },

  // Expertise variations
  expertise: {
    beginner: {
      prefix: "Let me break this down simply:\n\n",
      suffix: "\n\n📧 **Starter Tip**: Focus on growing a quality list and sending consistent, valuable content.",
      simplifications: {
        'ESP': 'email service provider (like Mailchimp)',
        'CTR': 'click-through rate (percentage who click)',
        'segmentation': 'dividing your list into groups',
        'automation': 'emails that send automatically'
      }
    },

    intermediate: {
      prefix: "Here's a comprehensive approach:\n\n",
      suffix: "\n\n📈 **Growth Tip**: Implement behavioral triggers and dynamic content for better engagement.",
      additions: ['automation workflows', 'advanced segmentation', 'testing strategies']
    },

    expert: {
      prefix: "Advanced email strategy:\n\n",
      suffix: "\n\n🎯 **Expert Tactic**: Use predictive analytics and AI for send-time optimization and content personalization.",
      additions: ['multi-touch attribution', 'lifecycle automation', 'cross-channel integration']
    }
  },

  // Common issues and solutions
  issues: {
    lowOpenRates: {
      problem: 'low open rates',
      solutions: [
        'Improve subject lines with A/B testing',
        'Clean your list of inactive subscribers',
        'Optimize sender name and email',
        'Segment for relevance',
        'Test different send times'
      ],
      template: 'To improve open rates:\n{solutions}\n\nStart with {priority} for immediate impact.'
    },

    highUnsubscribes: {
      problem: 'high unsubscribe',
      solutions: [
        'Survey unsubscribers for feedback',
        'Reduce email frequency',
        'Improve content relevance',
        'Set clear expectations',
        'Add preference center'
      ],
      template: 'To reduce unsubscribes:\n{solutions}\n\nAim for <0.5% unsubscribe rate.'
    },

    deliverability: {
      problem: 'deliverability issues',
      solutions: [
        'Authenticate with SPF, DKIM, DMARC',
        'Clean your list regularly',
        'Avoid spam trigger words',
        'Monitor sender reputation',
        'Use double opt-in'
      ],
      template: 'To improve deliverability:\n{solutions}\n\nMaintain >95% delivery rate.'
    }
  },

  // Metrics and benchmarks
  metrics: {
    byIndustry: {
      'Retail': { openRate: '18.39%', clickRate: '2.25%' },
      'Technology': { openRate: '22.15%', clickRate: '2.45%' },
      'Healthcare': { openRate: '23.45%', clickRate: '3.04%' },
      'Finance': { openRate: '25.15%', clickRate: '3.06%' },
      'Nonprofit': { openRate: '26.27%', clickRate: '2.79%' }
    },
    general: {
      'List Growth Rate': { good: '2-3%/month', excellent: '>5%/month' },
      'Bounce Rate': { good: '<2%', excellent: '<0.5%' },
      'Spam Complaints': { good: '<0.1%', excellent: '<0.05%' }
    }
  }
};

/**
 * Get template by intent and expertise
 */
export function getEmailTemplate(intent, expertise = 'intermediate') {
  const baseTemplate = emailTemplates.intents[intent];
  const expertiseModifier = emailTemplates.expertise[expertise];
  
  if (!baseTemplate) return null;
  
  return {
    ...baseTemplate,
    template: expertiseModifier.prefix + baseTemplate.template + expertiseModifier.suffix,
    expertise
  };
}

/**
 * Get campaign structure
 */
export function getEmailCampaignStructure(campaignType) {
  return emailTemplates.campaignTypes[campaignType] || null;
}

/**
 * Get industry benchmarks
 */
export function getEmailBenchmarks(industry) {
  return emailTemplates.metrics.byIndustry[industry] || emailTemplates.metrics.general;
}