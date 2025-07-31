/**
 * Paid Advertising Response Templates
 * 
 * Context-aware response templates for paid advertising queries
 */

export const adsTemplates = {
  // Intent-based templates
  intents: {
    create: {
      title: 'Creating Ad Campaign',
      template: `Let's build your {platform} {campaignType} campaign for optimal performance.

**Campaign Structure:**
- **Platform**: {platform}
- **Campaign Type**: {campaignType}
- **Budget**: {budget}/day ({budgetPeriod})
- **Objective**: {objective}
- **Target CPA**: {targetCPA}

**Targeting Strategy:**
- **Audience**: {audience}
- **Demographics**: {demographics}
- **Interests**: {interests}
- **Behaviors**: {behaviors}
- **Custom Audiences**: {customAudiences}

**Ad Creative:**
{headlines}
{descriptions}
{ctas}

**Landing Page:**
- URL: {landingPage}
- Conversion Rate: {conversionRate}%
- Optimization: {lpOptimization}

**Bidding Strategy:**
- Type: {biddingStrategy}
- Target: {biddingTarget}

**Expected Performance:**
{projectedMetrics}

{examples}`,
      variables: ['platform', 'campaignType', 'budget', 'budgetPeriod', 'objective', 'targetCPA', 'audience', 'demographics', 'interests', 'behaviors', 'customAudiences', 'headlines', 'descriptions', 'ctas', 'landingPage', 'conversionRate', 'lpOptimization', 'biddingStrategy', 'biddingTarget', 'projectedMetrics', 'examples']
    },

    optimize: {
      title: 'Ad Campaign Optimization',
      template: `Let's optimize your {platform} campaigns for better {optimizationGoal}.

**Current Performance:**
- Impressions: {impressions}
- Clicks: {clicks} (CTR: {ctr}%)
- Conversions: {conversions} (CVR: {cvr}%)
- CPC: {cpc}
- CPA: {cpa} (Target: {targetCPA})
- ROAS: {roas}

**Quality Score Analysis:**
{qualityScoreBreakdown}

**Optimization Opportunities:**
1. **Ad Copy**: {adCopyOpp}
2. **Targeting**: {targetingOpp}
3. **Bidding**: {biddingOpp}
4. **Landing Pages**: {landingOpp}

**A/B Tests to Run:**
{testingPlan}

**Budget Reallocation:**
{budgetOptimization}

**Expected Improvements:**
- CPA Reduction: -{cpaReduction}%
- ROAS Increase: +{roasIncrease}%
- Conversion Volume: +{volumeIncrease}%

{benchmarks}`,
      variables: ['platform', 'optimizationGoal', 'impressions', 'clicks', 'ctr', 'conversions', 'cvr', 'cpc', 'cpa', 'targetCPA', 'roas', 'qualityScoreBreakdown', 'adCopyOpp', 'targetingOpp', 'biddingOpp', 'landingOpp', 'testingPlan', 'budgetOptimization', 'cpaReduction', 'roasIncrease', 'volumeIncrease', 'benchmarks']
    },

    analyze: {
      title: 'Ad Campaign Analysis',
      template: `Comprehensive analysis of your {campaignName} campaign:

**Performance Overview:**
{performanceSummary}

**Key Metrics:**
- Spend: {totalSpend}
- Impressions: {impressions} ({cpm} CPM)
- Clicks: {clicks} ({cpc} CPC, {ctr}% CTR)
- Conversions: {conversions} ({cpa} CPA, {cvr}% CVR)
- Revenue: {revenue} ({roas} ROAS)

**Audience Performance:**
{audienceBreakdown}

**Creative Performance:**
{creativeAnalysis}

**Device & Placement:**
{deviceAnalysis}

**Time & Day Analysis:**
{timeAnalysis}

**Competitive Insights:**
{competitiveAnalysis}

**Recommendations:**
{recommendations}

**Next Steps:**
{nextSteps}`,
      variables: ['campaignName', 'performanceSummary', 'totalSpend', 'impressions', 'cpm', 'clicks', 'cpc', 'ctr', 'conversions', 'cpa', 'cvr', 'revenue', 'roas', 'audienceBreakdown', 'creativeAnalysis', 'deviceAnalysis', 'timeAnalysis', 'competitiveAnalysis', 'recommendations', 'nextSteps']
    }
  },

  // Platform-specific guidance
  platforms: {
    googleAds: {
      campaignTypes: ['Search', 'Display', 'Shopping', 'Video', 'Performance Max'],
      bestPractices: [
        'Use 3+ headlines, 2+ descriptions',
        'Include keywords in ad copy',
        'Use ad extensions (4+ types)',
        'Responsive search ads perform 15% better',
        'Negative keywords save 20-30% budget'
      ],
      qualityScore: {
        factors: {
          'Expected CTR': '35%',
          'Ad Relevance': '35%',
          'Landing Page Experience': '30%'
        },
        improvement: 'Each point increase = 16% CPC reduction'
      }
    },

    facebookAds: {
      campaignTypes: ['Awareness', 'Traffic', 'Engagement', 'Leads', 'Sales'],
      bestPractices: [
        'Video ads have 10% higher CTR',
        'Carousel format increases conversions 30-50%',
        'Update creative every 2-4 weeks',
        'Use automatic placements for 27% lower CPA',
        'Lookalike audiences from 1-2% work best'
      ],
      targeting: {
        'Core Audiences': 'Demographics + Interests',
        'Custom Audiences': 'Your data (email, website)',
        'Lookalike Audiences': 'Similar to your customers'
      }
    },

    linkedinAds: {
      campaignTypes: ['Sponsored Content', 'Message Ads', 'Dynamic Ads', 'Text Ads'],
      bestPractices: [
        'B2B focus - 2x higher conversion rates',
        'Target by job title and company size',
        'Sponsored content gets 3x engagement',
        'Include statistics for credibility',
        'Test single image vs video'
      ],
      targeting: {
        unique: ['Job Title', 'Company Size', 'Industry', 'Skills', 'Groups']
      }
    }
  },

  // Ad copy frameworks
  copyFrameworks: {
    pas: {
      name: 'Problem-Agitate-Solution',
      structure: [
        'Problem: Identify pain point',
        'Agitate: Emphasize consequences',
        'Solution: Present your offer'
      ],
      example: 'Tired of low conversion rates? Every day you wait costs you sales. Our tool increases conversions by 40%.'
    },

    aida: {
      name: 'Attention-Interest-Desire-Action',
      structure: [
        'Attention: Hook with benefit',
        'Interest: Expand on value',
        'Desire: Show transformation',
        'Action: Clear CTA'
      ],
      example: 'Save 50% on software. Trusted by 10,000 companies. Join industry leaders. Start free trial.'
    },

    fab: {
      name: 'Features-Advantages-Benefits',
      structure: [
        'Features: What it does',
        'Advantages: How it helps',
        'Benefits: Why it matters'
      ],
      example: 'AI-powered analytics. Make decisions 10x faster. Grow revenue 25%.'
    }
  },

  // Quick answer templates
  quickAnswers: {
    qualityScore: {
      question: 'quality score',
      answer: 'Quality Score (Google Ads) ranges from 1-10:\n\n**Components:**\n- Expected CTR (35%)\n- Ad relevance (35%)\n- Landing page experience (30%)\n\n**Impact**: Each point increase = ~16% CPC reduction\n\n**Improve by**: Better ad copy, tighter keywords, faster landing pages'
    },

    biddingStrategies: {
      question: 'bidding strategy',
      answer: 'Choose bidding based on goals:\n\n**Conversions**: Target CPA or Maximize Conversions\n**Revenue**: Target ROAS or Maximize Value\n**Traffic**: Maximize Clicks\n**Awareness**: Target Impression Share\n\n**Start with**: Manual CPC, then switch to automated after 30+ conversions'
    },

    adFatigue: {
      question: 'ad fatigue',
      answer: 'Combat ad fatigue (declining CTR over time):\n\n**Signs**: CTR drops 20%+, frequency >3-4\n\n**Solutions:**\n- Refresh creative every 2-4 weeks\n- Rotate 3-5 ad variations\n- Expand audience targeting\n- Test new formats\n- Implement frequency caps'
    }
  },

  // Expertise variations
  expertise: {
    beginner: {
      prefix: "Let's start with PPC basics:\n\n",
      suffix: "\n\n💡 **Beginner Tip**: Start with search ads and a small daily budget to learn.",
      focus: ['understanding metrics', 'basic setup', 'simple optimization']
    },

    intermediate: {
      prefix: "Here's how to scale your paid ads:\n\n",
      suffix: "\n\n📈 **Growth Tip**: Implement conversion tracking and automated bidding strategies.",
      focus: ['audience segmentation', 'A/B testing', 'cross-platform campaigns']
    },

    expert: {
      prefix: "Advanced advertising strategies:\n\n",
      suffix: "\n\n🚀 **Expert Move**: Use incrementality testing and multi-touch attribution modeling.",
      focus: ['advanced bidding', 'creative automation', 'full-funnel optimization']
    }
  },

  // Metrics and benchmarks
  metrics: {
    byIndustry: {
      'Ecommerce': { ctr: '2.69%', cpc: '$1.16', cvr: '2.81%' },
      'Technology': { ctr: '2.38%', cpc: '$3.80', cvr: '2.70%' },
      'Healthcare': { ctr: '3.27%', cpc: '$3.17', cvr: '3.39%' },
      'Finance': { ctr: '3.44%', cpc: '$3.94', cvr: '5.51%' },
      'B2B': { ctr: '2.14%', cpc: '$3.33', cvr: '2.23%' }
    },
    platforms: {
      'Google Search': { avgCTR: '3.17%', avgCPC: '$2.69' },
      'Google Display': { avgCTR: '0.46%', avgCPC: '$0.63' },
      'Facebook': { avgCTR: '0.90%', avgCPC: '$1.72' },
      'LinkedIn': { avgCTR: '0.44%', avgCPC: '$5.26' }
    }
  }
};

/**
 * Get platform-specific guidance
 */
export function getAdsPlatformGuide(platform) {
  return adsTemplates.platforms[platform.toLowerCase()] || null;
}

/**
 * Get ad copy framework
 */
export function getAdCopyFramework(framework) {
  return adsTemplates.copyFrameworks[framework.toLowerCase()] || null;
}

/**
 * Calculate ROAS
 */
export function calculateROAS(revenue, adSpend) {
  if (!adSpend || adSpend === 0) return 0;
  return (revenue / adSpend).toFixed(2);
}

/**
 * Get bidding strategy recommendation
 */
export function getBiddingStrategy(goal, conversions = 0) {
  if (conversions < 30) {
    return {
      strategy: 'Manual CPC',
      reason: 'Need 30+ conversions for automated bidding'
    };
  }
  
  const strategies = {
    conversions: 'Target CPA',
    revenue: 'Target ROAS',
    traffic: 'Maximize Clicks',
    awareness: 'Target Impression Share'
  };
  
  return {
    strategy: strategies[goal] || 'Manual CPC',
    reason: 'Optimized for your goal'
  };
}