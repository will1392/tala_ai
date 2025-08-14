/**
 * Growth Plan Generator Service
 * Creates personalized growth plans based on skill level and assessment
 */

/**
 * Generate a growth plan based on skill level and assessment
 */
async function generateGrowthPlan(skillLevel, assessmentResult) {
  const plan = {
    phases: [],
    currentPhase: null,
    startedAt: new Date().toISOString(),
    estimatedCompletion: null
  };

  // Add phases based on skill level
  switch (skillLevel) {
    case 'new':
      plan.phases = getBeginnerPhases(assessmentResult);
      plan.estimatedCompletion = getEstimatedDate(6); // 6 months
      break;
    case 'intermediate':
      plan.phases = getIntermediatePhases(assessmentResult);
      plan.estimatedCompletion = getEstimatedDate(4); // 4 months
      break;
    case 'advanced':
      plan.phases = getAdvancedPhases(assessmentResult);
      plan.estimatedCompletion = getEstimatedDate(3); // 3 months
      break;
    case 'expert':
      plan.phases = getExpertPhases(assessmentResult);
      plan.estimatedCompletion = getEstimatedDate(2); // 2 months
      break;
  }

  // Set the first phase as current
  if (plan.phases.length > 0) {
    plan.currentPhase = plan.phases[0].id;
  }

  return plan;
}

/**
 * Get phases for beginner level
 */
function getBeginnerPhases(assessment) {
  const phases = [];

  // Phase 1: Foundation
  phases.push({
    id: 'foundation',
    label: 'Marketing Foundation',
    description: 'Set up essential tracking and define your strategy',
    prerequisites: [],
    estimatedWeeks: 4,
    order: 1,
    steps: [
      {
        id: 'setup-ga4',
        label: 'Set up Google Analytics 4',
        agent: 'ANALYTICS',
        description: 'Install and configure GA4 to track website performance',
        outputs: ['ga4-setup-complete.json'],
        evidenceRequired: [],
        estimateHours: 3,
        status: 'todo',
        resources: [
          {
            type: 'guide',
            url: 'https://support.google.com/analytics/answer/9306384',
            title: 'GA4 Setup Guide',
            internal: false
          }
        ]
      },
      {
        id: 'setup-gsc',
        label: 'Connect Google Search Console',
        agent: 'SEO',
        description: 'Verify website ownership and start monitoring search performance',
        outputs: ['gsc-verification.json'],
        evidenceRequired: [],
        estimateHours: 1,
        status: 'todo'
      },
      {
        id: 'define-icp',
        label: 'Define Ideal Client Profile',
        agent: 'GENERAL',
        description: 'Create detailed buyer personas for your target audience',
        outputs: ['icp-document.md'],
        evidenceRequired: [],
        estimateHours: 4,
        status: 'todo'
      },
      {
        id: 'competitor-analysis',
        label: 'Analyze Top 3 Competitors',
        agent: 'GENERAL',
        description: 'Research competitor strategies and positioning',
        outputs: ['competitor-analysis.json'],
        evidenceRequired: [],
        estimateHours: 6,
        status: 'todo'
      },
      {
        id: 'setup-conversion-tracking',
        label: 'Set Up Conversion Tracking',
        agent: 'ANALYTICS',
        description: 'Configure goal tracking for key actions',
        outputs: ['conversions-configured.json'],
        evidenceRequired: ['ga4_connected'],
        estimateHours: 2,
        status: 'todo'
      }
    ]
  });

  // Phase 2: Channel Setup
  phases.push({
    id: 'channel-setup',
    label: 'Channel Setup',
    description: 'Establish your marketing channels',
    prerequisites: ['foundation'],
    estimatedWeeks: 4,
    order: 2,
    steps: [
      {
        id: 'keyword-research',
        label: 'Conduct Keyword Research',
        agent: 'SEO',
        description: 'Identify target keywords for your business',
        outputs: ['keyword-research.csv'],
        evidenceRequired: ['gsc_connected'],
        estimateHours: 4,
        status: 'todo'
      },
      {
        id: 'on-page-seo',
        label: 'Optimize On-Page SEO',
        agent: 'SEO',
        description: 'Optimize title tags, meta descriptions, and content',
        outputs: ['seo-audit.json'],
        evidenceRequired: [],
        estimateHours: 8,
        status: 'todo'
      },
      {
        id: 'email-setup',
        label: 'Set Up Email Marketing',
        agent: 'GENERAL',
        description: 'Choose and configure email marketing platform',
        outputs: ['email-platform-configured.json'],
        evidenceRequired: [],
        estimateHours: 3,
        status: 'todo'
      },
      {
        id: 'social-profiles',
        label: 'Optimize Social Media Profiles',
        agent: 'CONTENT',
        description: 'Set up and optimize business social media accounts',
        outputs: ['social-profiles.json'],
        evidenceRequired: [],
        estimateHours: 2,
        status: 'todo'
      }
    ]
  });

  // Phase 3: Content & Campaigns
  phases.push({
    id: 'content-campaigns',
    label: 'Content & Campaigns',
    description: 'Launch your first marketing campaigns',
    prerequisites: ['channel-setup'],
    estimatedWeeks: 8,
    order: 3,
    steps: [
      {
        id: 'content-calendar',
        label: 'Create Content Calendar',
        agent: 'CONTENT',
        description: 'Plan content for the next 90 days',
        outputs: ['content-calendar.csv'],
        evidenceRequired: [],
        estimateHours: 4,
        status: 'todo'
      },
      {
        id: 'create-lead-magnet',
        label: 'Create Lead Magnet',
        agent: 'CONTENT',
        description: 'Develop valuable content to capture leads',
        outputs: ['lead-magnet.pdf'],
        evidenceRequired: [],
        estimateHours: 8,
        status: 'todo'
      },
      {
        id: 'first-email-campaign',
        label: 'Launch First Email Campaign',
        agent: 'GENERAL',
        description: 'Create and send your first email newsletter',
        outputs: ['campaign-report.json'],
        evidenceRequired: ['email_platform_connected'],
        estimateHours: 3,
        status: 'todo'
      },
      {
        id: 'blog-posts',
        label: 'Publish 5 Blog Posts',
        agent: 'CONTENT',
        description: 'Create and publish SEO-optimized blog content',
        outputs: ['published-posts.json'],
        evidenceRequired: [],
        estimateHours: 20,
        status: 'todo'
      }
    ]
  });

  // Prioritize based on assessment weaknesses
  if (assessment.buckets.analytics < 30) {
    // Move analytics steps to higher priority
    moveStepToPriority(phases, 'setup-ga4', 1);
    moveStepToPriority(phases, 'setup-conversion-tracking', 2);
  }

  return phases;
}

/**
 * Get phases for intermediate level
 */
function getIntermediatePhases(assessment) {
  const phases = [];

  // Phase 1: Optimization
  phases.push({
    id: 'optimization',
    label: 'Campaign Optimization',
    description: 'Optimize existing marketing efforts',
    prerequisites: [],
    estimatedWeeks: 4,
    order: 1,
    steps: [
      {
        id: 'conversion-optimization',
        label: 'Optimize Conversion Rates',
        agent: 'ANALYTICS',
        description: 'A/B test and improve conversion paths',
        outputs: ['cro-report.json'],
        evidenceRequired: ['ga4_connected'],
        estimateHours: 8,
        status: 'todo'
      },
      {
        id: 'seo-technical',
        label: 'Technical SEO Audit',
        agent: 'SEO',
        description: 'Fix technical SEO issues',
        outputs: ['technical-seo-audit.json'],
        evidenceRequired: ['gsc_connected'],
        estimateHours: 6,
        status: 'todo'
      },
      {
        id: 'email-automation',
        label: 'Set Up Email Automation',
        agent: 'GENERAL',
        description: 'Create automated email sequences',
        outputs: ['automation-workflows.json'],
        evidenceRequired: ['email_platform_connected'],
        estimateHours: 8,
        status: 'todo'
      }
    ]
  });

  // Phase 2: Paid Advertising
  phases.push({
    id: 'paid-advertising',
    label: 'Paid Advertising',
    description: 'Launch and optimize paid campaigns',
    prerequisites: ['optimization'],
    estimatedWeeks: 6,
    order: 2,
    steps: [
      {
        id: 'google-ads-setup',
        label: 'Set Up Google Ads',
        agent: 'PPC',
        description: 'Create and launch Google Ads campaigns',
        outputs: ['google-ads-campaigns.json'],
        evidenceRequired: ['conversion_tracking_configured'],
        estimateHours: 6,
        status: 'todo'
      },
      {
        id: 'facebook-ads',
        label: 'Launch Facebook Ads',
        agent: 'PPC',
        description: 'Create targeted Facebook ad campaigns',
        outputs: ['facebook-campaigns.json'],
        evidenceRequired: [],
        estimateHours: 6,
        status: 'todo'
      },
      {
        id: 'retargeting',
        label: 'Set Up Retargeting',
        agent: 'PPC',
        description: 'Create retargeting campaigns',
        outputs: ['retargeting-setup.json'],
        evidenceRequired: ['pixel_installed'],
        estimateHours: 4,
        status: 'todo'
      }
    ]
  });

  // Phase 3: Scale
  phases.push({
    id: 'scale',
    label: 'Scale & Automate',
    description: 'Scale successful campaigns',
    prerequisites: ['paid-advertising'],
    estimatedWeeks: 4,
    order: 3,
    steps: [
      {
        id: 'scale-winners',
        label: 'Scale Winning Campaigns',
        agent: 'PPC',
        description: 'Increase budget on profitable campaigns',
        outputs: ['scaling-plan.json'],
        evidenceRequired: ['positive_roas'],
        estimateHours: 4,
        status: 'todo'
      },
      {
        id: 'marketing-automation',
        label: 'Implement Marketing Automation',
        agent: 'OPS',
        description: 'Automate repetitive marketing tasks',
        outputs: ['automation-setup.json'],
        evidenceRequired: [],
        estimateHours: 10,
        status: 'todo'
      }
    ]
  });

  return phases;
}

/**
 * Get phases for advanced level
 */
function getAdvancedPhases(assessment) {
  const phases = [];

  // Phase 1: Advanced Strategy
  phases.push({
    id: 'advanced-strategy',
    label: 'Advanced Strategy',
    description: 'Implement sophisticated marketing strategies',
    prerequisites: [],
    estimatedWeeks: 3,
    order: 1,
    steps: [
      {
        id: 'attribution-modeling',
        label: 'Set Up Attribution Modeling',
        agent: 'ANALYTICS',
        description: 'Implement multi-touch attribution',
        outputs: ['attribution-model.json'],
        evidenceRequired: ['ga4_advanced'],
        estimateHours: 8,
        status: 'todo'
      },
      {
        id: 'predictive-analytics',
        label: 'Implement Predictive Analytics',
        agent: 'ANALYTICS',
        description: 'Use data to predict customer behavior',
        outputs: ['predictive-model.json'],
        evidenceRequired: ['sufficient_data'],
        estimateHours: 12,
        status: 'todo'
      },
      {
        id: 'personalization',
        label: 'Implement Personalization',
        agent: 'CONTENT',
        description: 'Create personalized user experiences',
        outputs: ['personalization-rules.json'],
        evidenceRequired: [],
        estimateHours: 10,
        status: 'todo'
      }
    ]
  });

  // Phase 2: Optimization
  phases.push({
    id: 'advanced-optimization',
    label: 'Advanced Optimization',
    description: 'Fine-tune for maximum ROI',
    prerequisites: ['advanced-strategy'],
    estimatedWeeks: 4,
    order: 2,
    steps: [
      {
        id: 'ltv-optimization',
        label: 'Optimize for LTV',
        agent: 'ANALYTICS',
        description: 'Focus on customer lifetime value',
        outputs: ['ltv-strategy.json'],
        evidenceRequired: ['crm_connected'],
        estimateHours: 8,
        status: 'todo'
      },
      {
        id: 'advanced-segmentation',
        label: 'Advanced Audience Segmentation',
        agent: 'ANALYTICS',
        description: 'Create sophisticated audience segments',
        outputs: ['segments.json'],
        evidenceRequired: [],
        estimateHours: 6,
        status: 'todo'
      }
    ]
  });

  return phases;
}

/**
 * Get phases for expert level
 */
function getExpertPhases(assessment) {
  const phases = [];

  // Phase 1: Innovation
  phases.push({
    id: 'innovation',
    label: 'Marketing Innovation',
    description: 'Test cutting-edge strategies',
    prerequisites: [],
    estimatedWeeks: 4,
    order: 1,
    steps: [
      {
        id: 'ai-implementation',
        label: 'Implement AI Marketing Tools',
        agent: 'OPS',
        description: 'Leverage AI for marketing optimization',
        outputs: ['ai-tools.json'],
        evidenceRequired: [],
        estimateHours: 10,
        status: 'todo'
      },
      {
        id: 'growth-experiments',
        label: 'Run Growth Experiments',
        agent: 'GENERAL',
        description: 'Test innovative growth strategies',
        outputs: ['experiment-results.json'],
        evidenceRequired: [],
        estimateHours: 15,
        status: 'todo'
      },
      {
        id: 'cross-channel',
        label: 'Cross-Channel Attribution',
        agent: 'ANALYTICS',
        description: 'Implement cross-channel tracking',
        outputs: ['cross-channel-setup.json'],
        evidenceRequired: ['multiple_channels_active'],
        estimateHours: 12,
        status: 'todo'
      }
    ]
  });

  return phases;
}

/**
 * Helper function to move a step to higher priority
 */
function moveStepToPriority(phases, stepId, priority) {
  // Find the step
  let targetStep = null;
  let targetPhaseIndex = -1;
  let targetStepIndex = -1;

  phases.forEach((phase, phaseIdx) => {
    phase.steps.forEach((step, stepIdx) => {
      if (step.id === stepId) {
        targetStep = step;
        targetPhaseIndex = phaseIdx;
        targetStepIndex = stepIdx;
      }
    });
  });

  if (targetStep && targetPhaseIndex >= 0 && targetStepIndex >= 0) {
    // Remove from current position
    phases[targetPhaseIndex].steps.splice(targetStepIndex, 1);
    
    // Insert at new priority position in first phase
    if (phases[0] && phases[0].steps) {
      phases[0].steps.splice(priority - 1, 0, targetStep);
    }
  }
}

/**
 * Get estimated completion date
 */
function getEstimatedDate(months) {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date.toISOString();
}

module.exports = {
  generateGrowthPlan
};