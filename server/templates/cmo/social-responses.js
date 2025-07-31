/**
 * Social Media Response Templates
 * 
 * Context-aware response templates for social media marketing queries
 */

export const socialTemplates = {
  // Intent-based templates
  intents: {
    create: {
      title: 'Creating Social Media Content',
      template: `Let's create engaging {contentType} for {platform}. Here's your content strategy:

**Content Overview:**
- **Platform**: {platform}
- **Format**: {format}
- **Goal**: {goal}
- **Target Audience**: {audience}

**Content Structure:**
{hook}
{mainContent}
{callToAction}

**Visual Elements:**
- Format: {visualFormat}
- Style: {visualStyle}
- Brand elements: {brandElements}

**Hashtag Strategy:**
{hashtagStrategy}

**Posting Schedule:**
- Best time: {bestTime}
- Frequency: {frequency}

**Engagement Tactics:**
{engagementTactics}

{examples}`,
      variables: ['contentType', 'platform', 'format', 'goal', 'audience', 'hook', 'mainContent', 'callToAction', 'visualFormat', 'visualStyle', 'brandElements', 'hashtagStrategy', 'bestTime', 'frequency', 'engagementTactics', 'examples']
    },

    optimize: {
      title: 'Social Media Optimization',
      template: `Let's optimize your {platform} strategy for better engagement.

**Current Performance:**
- Followers: {followers} ({growthRate} growth)
- Engagement Rate: {engagementRate} (Platform avg: {platformAvg})
- Reach: {reach}
- Impressions: {impressions}

**Content Analysis:**
{contentAnalysis}

**Optimization Strategies:**
1. **Content Mix**: {contentMix}
2. **Posting Times**: {optimalTimes}
3. **Hashtag Optimization**: {hashtagOptimization}
4. **Community Engagement**: {communityStrategy}

**Competitor Insights:**
{competitorAnalysis}

**30-Day Action Plan:**
{actionPlan}

{benchmarks}`,
      variables: ['platform', 'followers', 'growthRate', 'engagementRate', 'platformAvg', 'reach', 'impressions', 'contentAnalysis', 'contentMix', 'optimalTimes', 'hashtagOptimization', 'communityStrategy', 'competitorAnalysis', 'actionPlan', 'benchmarks']
    },

    analyze: {
      title: 'Social Media Analysis',
      template: `Here's my analysis of your {platform} performance:

**Overall Health Score**: {healthScore}/100

**Key Metrics Analysis:**
{metricsBreakdown}

**Content Performance:**
- Top performing posts: {topPosts}
- Engagement patterns: {patterns}
- Content types ranking: {contentRanking}

**Audience Insights:**
- Demographics: {demographics}
- Active times: {activeTimes}
- Interests: {interests}

**Growth Analysis:**
{growthAnalysis}

**Recommendations:**
{recommendations}

**Tools & Resources:**
{resources}`,
      variables: ['platform', 'healthScore', 'metricsBreakdown', 'topPosts', 'patterns', 'contentRanking', 'demographics', 'activeTimes', 'interests', 'growthAnalysis', 'recommendations', 'resources']
    }
  },

  // Platform-specific guidance
  platforms: {
    instagram: {
      bestPractices: [
        'Use 9-11 relevant hashtags',
        'Post Reels for maximum reach',
        'Stories daily for engagement',
        'Carousel posts get 3x engagement',
        'User-generated content builds trust'
      ],
      contentMix: {
        'Reels': '40%',
        'Carousel': '30%',
        'Single Image': '20%',
        'IGTV/Video': '10%'
      },
      optimal: {
        postingTimes: ['11 AM - 1 PM', '7 PM - 9 PM'],
        frequency: '1-2 posts/day, 3-5 stories'
      }
    },

    facebook: {
      bestPractices: [
        'Video content gets 135% more reach',
        'Ask questions to boost engagement',
        'Share to relevant groups',
        'Go live for 6x engagement',
        'Native video over YouTube links'
      ],
      contentMix: {
        'Video': '50%',
        'Images': '30%',
        'Links': '15%',
        'Text': '5%'
      },
      optimal: {
        postingTimes: ['9 AM', '3 PM', '7 PM'],
        frequency: '1-2 posts/day'
      }
    },

    linkedin: {
      bestPractices: [
        'Professional, value-driven content',
        'Native documents get 3x reach',
        'Personal stories outperform corporate',
        'Tuesday-Thursday best days',
        'Engage in first hour after posting'
      ],
      contentMix: {
        'Native Articles': '40%',
        'Professional Updates': '30%',
        'Industry News': '20%',
        'Company Culture': '10%'
      },
      optimal: {
        postingTimes: ['7-8 AM', '12 PM', '5-6 PM'],
        frequency: '1 post/day weekdays'
      }
    },

    tiktok: {
      bestPractices: [
        'Hook viewers in first 3 seconds',
        'Trending sounds boost visibility',
        'Authentic over polished',
        'Engage with comments quickly',
        'Post at peak user times'
      ],
      contentMix: {
        'Trending Challenges': '30%',
        'Educational': '30%',
        'Behind-the-Scenes': '25%',
        'Entertainment': '15%'
      },
      optimal: {
        postingTimes: ['6 AM', '10 AM', '6 PM', '10 PM'],
        frequency: '1-4 posts/day'
      }
    }
  },

  // Quick answer templates
  quickAnswers: {
    hashtagStrategy: {
      question: 'hashtag',
      answer: 'Hashtag best practices vary by platform:\n\n**Instagram**: 9-11 hashtags, mix of popular and niche\n**Twitter**: 1-2 hashtags maximum\n**LinkedIn**: 3-5 professional hashtags\n**TikTok**: 3-5 trending + niche hashtags\n\n**Strategy**: 30% popular, 50% moderate, 20% niche'
    },

    engagementRate: {
      question: 'engagement rate',
      answer: 'Engagement rate = (Likes + Comments + Shares) / Followers × 100\n\n**Good Engagement Rates:**\n- Instagram: 1-3%\n- Facebook: 0.5-1%\n- Twitter: 0.5-1%\n- LinkedIn: 2-3%\n- TikTok: 3-6%\n\n**Improve by**: Quality content, optimal timing, community interaction'
    },

    contentCalendar: {
      question: 'content calendar',
      answer: 'A content calendar ensures consistent posting:\n\n**Weekly Structure:**\n- Monday: Motivational content\n- Tuesday: Tips/Education\n- Wednesday: Behind-the-scenes\n- Thursday: User-generated content\n- Friday: Fun/Entertainment\n\n**Plan**: 2 weeks minimum, 1 month ideal'
    }
  },

  // Content types and formats
  contentTypes: {
    educational: {
      formats: ['How-to posts', 'Tips carousel', 'Tutorial videos', 'Infographics'],
      hooks: [
        'Stop making this mistake...',
        '5 things I wish I knew...',
        'The secret to...',
        'Here\'s exactly how to...'
      ],
      structure: 'Problem → Solution → Result'
    },

    entertaining: {
      formats: ['Memes', 'Trending challenges', 'Behind-the-scenes', 'Bloopers'],
      hooks: [
        'POV: You\'re...',
        'Tell me you\'re... without telling me',
        'Things that live rent-free...',
        'Nobody talks about...'
      ],
      structure: 'Hook → Twist → Payoff'
    },

    promotional: {
      formats: ['Product showcase', 'Customer testimonials', 'Limited offers', 'Launch announcements'],
      hooks: [
        'Just dropped...',
        'Last chance to...',
        'Our customers say...',
        'Big announcement...'
      ],
      structure: 'Value → Proof → CTA'
    }
  },

  // Expertise variations
  expertise: {
    beginner: {
      prefix: "Social media basics:\n\n",
      suffix: "\n\n🌟 **Beginner Focus**: Start with one platform and master it before expanding.",
      focus: ['consistency', 'authentic voice', 'basic metrics']
    },

    intermediate: {
      prefix: "Let's elevate your social strategy:\n\n",
      suffix: "\n\n📱 **Level Up**: Implement content pillars and community management strategies.",
      focus: ['content strategy', 'paid promotion', 'analytics']
    },

    expert: {
      prefix: "Advanced social media tactics:\n\n",
      suffix: "\n\n🚀 **Pro Strategy**: Leverage social commerce and cross-platform synergies for exponential growth.",
      focus: ['influencer partnerships', 'social commerce', 'advanced analytics']
    }
  },

  // Metrics and benchmarks
  metrics: {
    engagement: {
      'Instagram': { poor: '<1%', average: '1-3%', good: '3-6%', excellent: '>6%' },
      'Facebook': { poor: '<0.5%', average: '0.5-1%', good: '1-2%', excellent: '>2%' },
      'Twitter': { poor: '<0.5%', average: '0.5-1%', good: '1-1.5%', excellent: '>1.5%' },
      'LinkedIn': { poor: '<2%', average: '2-3%', good: '3-5%', excellent: '>5%' },
      'TikTok': { poor: '<3%', average: '3-6%', good: '6-10%', excellent: '>10%' }
    },
    growth: {
      healthy: '2-5% monthly',
      viral: '>10% monthly',
      stagnant: '<1% monthly'
    }
  }
};

/**
 * Get platform-specific guidance
 */
export function getSocialPlatformGuide(platform) {
  return socialTemplates.platforms[platform.toLowerCase()] || null;
}

/**
 * Get content type template
 */
export function getSocialContentTemplate(contentType) {
  return socialTemplates.contentTypes[contentType] || null;
}

/**
 * Calculate engagement rate
 */
export function calculateEngagementRate(likes, comments, shares, followers) {
  if (!followers || followers === 0) return 0;
  return ((likes + comments + shares) / followers * 100).toFixed(2);
}