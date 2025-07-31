/**
 * SEO Response Templates
 * 
 * Context-aware response templates for SEO-related queries
 */

export const seoTemplates = {
  // Intent-based templates
  intents: {
    create: {
      title: 'Creating SEO Content',
      template: `I'll help you create {contentType} optimized for search engines. Here's what we'll focus on:

**Key Elements:**
1. **Target Keyword**: {keyword} (search volume: {volume})
2. **Search Intent**: {intent} 
3. **Content Structure**: {structure}

**Optimization Checklist:**
✓ Title tag (50-60 characters)
✓ Meta description (150-160 characters)
✓ H1 tag with primary keyword
✓ 2-3 H2 subheadings with variations
✓ Natural keyword density (1-2%)
✓ Internal/external links
✓ Image alt text

{recommendations}

{examples}`,
      variables: ['contentType', 'keyword', 'volume', 'intent', 'structure', 'recommendations', 'examples']
    },

    optimize: {
      title: 'SEO Optimization',
      template: `Let's optimize your {contentType} for better search rankings. 

**Current Performance:**
{currentMetrics}

**Optimization Opportunities:**
{opportunities}

**Priority Actions:**
1. {action1} - Impact: {impact1}
2. {action2} - Impact: {impact2}
3. {action3} - Impact: {impact3}

**Expected Results:**
- Rankings: {rankingImprovement}
- Traffic: {trafficIncrease}
- Timeline: {timeline}

{benchmarks}

{nextSteps}`,
      variables: ['contentType', 'currentMetrics', 'opportunities', 'action1', 'impact1', 'action2', 'impact2', 'action3', 'impact3', 'rankingImprovement', 'trafficIncrease', 'timeline', 'benchmarks', 'nextSteps']
    },

    analyze: {
      title: 'SEO Analysis',
      template: `Here's my analysis of your {subject}:

**SEO Health Score**: {score}/100

**Strengths:**
{strengths}

**Issues Found:**
{issues}

**Competitive Comparison:**
{competitiveAnalysis}

**Key Metrics:**
- Organic Traffic: {organicTraffic}
- Rankings: {rankings}
- Backlinks: {backlinks}
- Page Speed: {pageSpeed}

**Recommendations:**
{recommendations}

**Resources:**
{resources}`,
      variables: ['subject', 'score', 'strengths', 'issues', 'competitiveAnalysis', 'organicTraffic', 'rankings', 'backlinks', 'pageSpeed', 'recommendations', 'resources']
    }
  },

  // Quick answer templates
  quickAnswers: {
    titleTag: {
      question: 'title tag length',
      answer: 'Title tags should be 50-60 characters. Google typically displays the first 50-60 characters, truncating longer titles with "...".\n\n**Best Practices:**\n- Front-load important keywords\n- Include brand name at end\n- Make it compelling for clicks\n- Unique for each page'
    },
    
    metaDescription: {
      question: 'meta description',
      answer: 'Meta descriptions should be 150-160 characters for desktop, 120 for mobile.\n\n**Tips for Great Meta Descriptions:**\n- Include target keyword naturally\n- Add a clear call-to-action\n- Match search intent\n- Use active voice\n- Include unique value proposition'
    },

    keywordDensity: {
      question: 'keyword density',
      answer: 'Aim for 1-2% keyword density. Modern SEO focuses on natural language and topic relevance over exact keyword repetition.\n\n**Natural Optimization:**\n- Use synonyms and variations\n- Focus on user intent\n- Include in title, headers, first paragraph\n- Avoid keyword stuffing'
    }
  },

  // Expertise variations
  expertise: {
    beginner: {
      prefix: "I'll explain this in simple terms:\n\n",
      suffix: "\n\n💡 **Beginner Tip**: Start with one change at a time and measure results before moving to the next.",
      simplifications: {
        'SERP': 'search results page',
        'organic traffic': 'free traffic from search engines',
        'backlinks': 'links from other websites to yours',
        'crawling': 'how Google reads your website'
      }
    },

    intermediate: {
      prefix: "Based on your experience level:\n\n",
      suffix: "\n\n📊 **Pro Tip**: Use Google Search Console data to guide your optimization priorities.",
      additions: ['technical details', 'tool recommendations', 'advanced tactics']
    },

    expert: {
      prefix: "Advanced strategy:\n\n",
      suffix: "\n\n🚀 **Expert Insight**: Consider implementing structured data and entity optimization for semantic search advantages.",
      additions: ['algorithm insights', 'edge tactics', 'scaling strategies']
    }
  },

  // Common issues and solutions
  issues: {
    lowRankings: {
      problem: 'low search rankings',
      solutions: [
        'Improve content quality and depth',
        'Build high-quality backlinks',
        'Optimize page speed and Core Web Vitals',
        'Match search intent better',
        'Update and refresh old content'
      ],
      template: 'To improve your rankings:\n{solutions}\n\nFocus on {priority} first for quickest impact.'
    },

    noTraffic: {
      problem: 'no organic traffic',
      solutions: [
        'Target less competitive keywords',
        'Create content clusters',
        'Improve technical SEO',
        'Build domain authority',
        'Optimize for featured snippets'
      ],
      template: 'To start getting organic traffic:\n{solutions}\n\nExpect to see results in {timeline}.'
    }
  },

  // Metrics and benchmarks
  metrics: {
    standard: {
      'Organic CTR': {
        position1: '~30%',
        position2: '~15%',
        position3: '~10%',
        average: '2-3%'
      },
      'Page Load Time': {
        excellent: '<1.5s',
        good: '<3s',
        needsWork: '>3s'
      },
      'Bounce Rate': {
        excellent: '<40%',
        good: '40-55%',
        poor: '>70%'
      }
    }
  }
};

/**
 * Get template by intent and expertise
 */
export function getSEOTemplate(intent, expertise = 'intermediate') {
  const baseTemplate = seoTemplates.intents[intent];
  const expertiseModifier = seoTemplates.expertise[expertise];
  
  if (!baseTemplate) return null;
  
  return {
    ...baseTemplate,
    template: expertiseModifier.prefix + baseTemplate.template + expertiseModifier.suffix,
    expertise
  };
}

/**
 * Get quick answer
 */
export function getSEOQuickAnswer(topic) {
  const quickAnswers = seoTemplates.quickAnswers;
  
  for (const [key, answer] of Object.entries(quickAnswers)) {
    if (topic.toLowerCase().includes(answer.question)) {
      return answer.answer;
    }
  }
  
  return null;
}

/**
 * Get issue solution
 */
export function getSEOIssueSolution(problem) {
  const issues = seoTemplates.issues;
  
  for (const [key, issue] of Object.entries(issues)) {
    if (problem.toLowerCase().includes(issue.problem)) {
      return issue;
    }
  }
  
  return null;
}