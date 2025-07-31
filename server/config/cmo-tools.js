// CMO Marketing Tools Registry
// This file defines all available marketing tools for the CMO mode

const CMO_TOOLS = {
  // SEO Tools
  'title-tag-tester': {
    id: 'title-tag-tester',
    name: 'Title Tag Tester',
    description: 'Test and optimize title tags for SEO',
    category: 'seo',
    contexts: ['seo'],
    features: [
      'Character count analysis',
      'SERP preview',
      'Keyword placement check',
      'Mobile optimization'
    ],
    limits: {
      optimal: { min: 30, max: 60 },
      mobile: 50,
      pixels: 600
    },
    aiPrompts: {
      suggest: 'Suggest an optimized title tag for a page about {topic} targeting the keyword {keyword}',
      analyze: 'Analyze this title tag for SEO effectiveness: {title}',
      improve: 'Improve this title tag for better CTR and SEO: {title}'
    }
  },

  'keyword-density': {
    id: 'keyword-density',
    name: 'Keyword Density Checker',
    description: 'Analyze keyword usage and density in content',
    category: 'seo',
    contexts: ['seo', 'email'],
    features: [
      'Keyword frequency analysis',
      'Density calculation',
      'Prominence scoring',
      'Stop word filtering',
      'Readability assessment'
    ],
    recommendations: {
      density: { min: 0.5, optimal: 1.5, max: 3 },
      prominence: 70, // % - keyword should appear in first 30% of content
    },
    aiPrompts: {
      analyze: 'Analyze the keyword density and SEO optimization of this content: {content}',
      optimize: 'Suggest how to optimize keyword density for {keyword} in this content: {content}',
      rewrite: 'Rewrite this paragraph to include {keyword} with optimal density: {paragraph}'
    }
  },

  // Email Marketing Tools
  'subject-line-tester': {
    id: 'subject-line-tester',
    name: 'Subject Line Tester',
    description: 'Analyze email subject lines for effectiveness',
    category: 'email',
    contexts: ['email'],
    features: [
      'Spam score analysis',
      'Open rate prediction',
      'Mobile preview',
      'Personalization detection',
      'Urgency analysis'
    ],
    spamTriggers: [
      'free', 'guarantee', 'no obligation', 'risk-free', 'act now',
      'apply now', 'buy now', 'click here', 'clearance', 'congratulations'
    ],
    scoring: {
      lengthOptimal: { min: 30, max: 50 },
      lengthMax: 60,
      spamThreshold: 3
    },
    aiPrompts: {
      generate: 'Generate 5 compelling subject lines for an email about {topic} targeting {audience}',
      improve: 'Improve this email subject line for better open rates: {subject}',
      personalize: 'Add personalization to this subject line: {subject}'
    }
  },

  // Social Media Tools
  'hashtag-generator': {
    id: 'hashtag-generator',
    name: 'Hashtag Generator',
    description: 'Generate relevant and trending hashtags',
    category: 'social',
    contexts: ['social'],
    features: [
      'Platform-specific suggestions',
      'Trending hashtag detection',
      'Niche hashtag discovery',
      'Branded hashtag creation',
      'Location-based hashtags'
    ],
    platforms: {
      instagram: { optimal: 10, max: 30 },
      twitter: { optimal: 2, max: 5 },
      linkedin: { optimal: 5, max: 10 },
      tiktok: { optimal: 5, max: 10 }
    },
    aiPrompts: {
      generate: 'Generate {count} relevant hashtags for {platform} about {topic}',
      trending: 'What are the trending hashtags for {topic} on {platform}?',
      analyze: 'Analyze the effectiveness of these hashtags: {hashtags}'
    }
  },

  // Universal Tools
  'character-counter': {
    id: 'character-counter',
    name: 'Character Counter',
    description: 'Count characters for any platform with limits',
    category: 'universal',
    contexts: ['all'],
    features: [
      'Multi-platform limits',
      'Real-time counting',
      'Word and line counting',
      'Byte size calculation',
      'Platform-specific warnings'
    ],
    platformLimits: {
      'twitter': 280,
      'linkedin-post': 3000,
      'facebook-post': 63206,
      'instagram-caption': 2200,
      'meta-description': 160,
      'sms': 160,
      'google-ads-headline': 30,
      'email-subject': 60
    },
    aiPrompts: {
      shorten: 'Shorten this text to fit within {limit} characters: {text}',
      expand: 'Expand this text to be closer to {limit} characters while maintaining meaning: {text}',
      optimize: 'Optimize this text for {platform} character limits: {text}'
    }
  },

  // Direct Mail Tools (placeholder for future)
  'address-validator': {
    id: 'address-validator',
    name: 'Address Validator',
    description: 'Validate and format mailing addresses',
    category: 'directmail',
    contexts: ['directmail'],
    features: [
      'USPS validation',
      'International formats',
      'Bulk validation',
      'Standardization'
    ],
    status: 'planned'
  },

  // Advertising Tools (placeholder for future)
  'ad-copy-analyzer': {
    id: 'ad-copy-analyzer',
    name: 'Ad Copy Analyzer',
    description: 'Analyze and optimize advertising copy',
    category: 'ads',
    contexts: ['ads'],
    features: [
      'Compliance checking',
      'CTR prediction',
      'A/B test suggestions',
      'Platform optimization'
    ],
    status: 'planned'
  }
};

// Tool categories
const TOOL_CATEGORIES = {
  seo: {
    name: 'SEO Tools',
    description: 'Search engine optimization tools',
    icon: 'search'
  },
  email: {
    name: 'Email Marketing',
    description: 'Email campaign optimization tools',
    icon: 'mail'
  },
  social: {
    name: 'Social Media',
    description: 'Social media marketing tools',
    icon: 'share'
  },
  universal: {
    name: 'Universal Tools',
    description: 'Tools that work across all contexts',
    icon: 'tool'
  },
  directmail: {
    name: 'Direct Mail',
    description: 'Direct mail campaign tools',
    icon: 'send'
  },
  ads: {
    name: 'Advertising',
    description: 'Digital advertising tools',
    icon: 'megaphone'
  }
};

// Get tools by context
function getToolsByContext(context) {
  return Object.values(CMO_TOOLS).filter(tool => 
    tool.contexts.includes(context) || tool.contexts.includes('all')
  );
}

// Get tool by ID
function getToolById(toolId) {
  return CMO_TOOLS[toolId] || null;
}

// Get active tools (not planned)
function getActiveTools() {
  return Object.values(CMO_TOOLS).filter(tool => 
    tool.status !== 'planned'
  );
}

// Get tool suggestions based on user input
function suggestTools(userInput, currentContext) {
  const input = userInput.toLowerCase();
  const suggestions = [];
  
  // Keywords to tool mapping
  const keywordMap = {
    'title': ['title-tag-tester'],
    'seo': ['title-tag-tester', 'keyword-density'],
    'subject': ['subject-line-tester'],
    'email': ['subject-line-tester'],
    'hashtag': ['hashtag-generator'],
    'social': ['hashtag-generator'],
    'character': ['character-counter'],
    'count': ['character-counter'],
    'keyword': ['keyword-density'],
    'density': ['keyword-density']
  };
  
  // Check for keyword matches
  Object.entries(keywordMap).forEach(([keyword, toolIds]) => {
    if (input.includes(keyword)) {
      toolIds.forEach(toolId => {
        const tool = CMO_TOOLS[toolId];
        if (tool && tool.status !== 'planned') {
          suggestions.push({
            tool,
            relevance: input.includes(tool.name.toLowerCase()) ? 1 : 0.8
          });
        }
      });
    }
  });
  
  // Filter by context if provided
  if (currentContext) {
    return suggestions.filter(s => 
      s.tool.contexts.includes(currentContext) || s.tool.contexts.includes('all')
    );
  }
  
  return suggestions;
}

// Export functions and data
export {
  CMO_TOOLS,
  TOOL_CATEGORIES,
  getToolsByContext,
  getToolById,
  getActiveTools,
  suggestTools
};