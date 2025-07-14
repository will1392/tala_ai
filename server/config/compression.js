/**
 * Context Compression Configuration
 * 
 * Defines settings and strategies for intelligent context compression
 * to handle longer conversations within token limits.
 */

export const compressionConfig = {
  // Global compression settings
  global: {
    enabled: process.env.ENABLE_CONTEXT_COMPRESSION !== 'false',
    defaultStrategy: process.env.COMPRESSION_STRATEGY || 'auto',
    maxContextTokens: parseInt(process.env.MAX_CONTEXT_TOKENS) || 4000,
    compressionThreshold: parseFloat(process.env.COMPRESSION_THRESHOLD) || 0.8,
    minMessagesToCompress: parseInt(process.env.MIN_MESSAGES_TO_COMPRESS) || 20
  },

  // Strategy-specific configurations
  strategies: {
    'sliding-window': {
      enabled: true,
      recentMessageCount: 10,
      minImportanceScore: 0.6,
      summaryRatio: 0.3, // 30% of tokens for summary
      preserveBookings: true,
      preserveDecisions: true
    },
    
    'hierarchical': {
      enabled: true,
      chunkSize: 10,
      compressionLevels: [
        { age: 0, ratio: 1.0 },    // Recent: keep all
        { age: 1, ratio: 0.5 },    // 1 chunk old: 50%
        { age: 2, ratio: 0.3 },    // 2 chunks old: 30%
        { age: 3, ratio: 0.1 }     // 3+ chunks old: 10%
      ],
      minChunkTokens: 50
    },
    
    'entity-focused': {
      enabled: true,
      priorityEntities: ['destination', 'date', 'budget', 'hotel', 'airline'],
      entityTokenAllocation: 0.7, // 70% for entity-related messages
      recentTokenAllocation: 0.3, // 30% for recent context
      includeEntitySummary: true
    },
    
    'query-relevant': {
      enabled: true,
      maxRelevantMessages: 20,
      minRelevanceScore: 0.5,
      relevanceWeights: {
        contentMatch: 0.7,
        recency: 0.3
      },
      alwaysIncludeLastN: 3
    }
  },

  // Importance scoring configuration
  importanceScoring: {
    weights: {
      decision: 0.9,
      preference: 0.8,
      constraint: 0.85,
      entity: 0.7,
      question: 0.6,
      booking: 0.95,
      problem: 0.75,
      emphasis: 0.7,
      recency: 0.3
    },
    
    entityImportance: {
      destination: 0.8,
      date: 0.9,
      budget: 0.85,
      airline: 0.7,
      hotel: 0.7,
      person: 0.6,
      activity: 0.5,
      restaurant: 0.4,
      transportation: 0.6
    },
    
    // Keywords that boost importance
    importantKeywords: [
      'confirm', 'book', 'reserve', 'purchase', 'pay',
      'final', 'decided', 'definitely', 'absolutely',
      'important', 'critical', 'urgent', 'asap', 'immediately',
      'deadline', 'must', 'require', 'essential', 'vital'
    ]
  },

  // Summary generation configuration
  summaryGeneration: {
    defaultStyle: 'comprehensive',
    maxSummaryTokens: 500,
    
    styles: {
      concise: {
        maxLength: 150,
        includeDetails: false,
        focusAreas: ['decisions', 'outcomes']
      },
      comprehensive: {
        maxLength: 500,
        includeDetails: true,
        focusAreas: ['decisions', 'preferences', 'constraints', 'entities']
      },
      bullets: {
        maxLength: 300,
        format: 'bullets',
        focusAreas: ['actions', 'decisions', 'next-steps']
      },
      timeline: {
        maxLength: 400,
        format: 'timeline',
        focusAreas: ['progression', 'decisions', 'changes']
      }
    },
    
    // LLM settings for summary generation
    llm: {
      model: process.env.SUMMARY_MODEL || 'gpt-4o-mini',
      temperature: 0.3,
      maxTokens: 500,
      fallbackToLocal: true
    }
  },

  // Performance optimization
  performance: {
    cacheEnabled: true,
    cacheTTL: 300, // 5 minutes
    maxCacheSize: 100, // Maximum cached compressions
    parallelCompression: true,
    compressionTimeout: 5000 // 5 seconds
  },

  // Model-specific token limits
  modelLimits: {
    'gpt-4': 8192,
    'gpt-4-turbo': 128000,
    'gpt-4o': 128000,
    'gpt-4o-mini': 16385,
    'gpt-3.5-turbo': 4096,
    'claude-3-opus': 200000,
    'claude-3-sonnet': 200000,
    'claude-3-haiku': 200000,
    'claude-3-5-sonnet': 200000,
    'gemini-pro': 32760,
    'gemini-1.5-pro': 1048576,
    'gemini-1.5-flash': 1048576,
    'mistral-large': 32768,
    'mixtral-8x7b': 32768
  },

  // Strategy selection rules
  strategySelection: {
    rules: [
      {
        condition: (messages, query) => messages.length > 100,
        strategy: 'hierarchical',
        reason: 'Very long conversation'
      },
      {
        condition: (messages, query) => query && query.length > 100,
        strategy: 'query-relevant',
        reason: 'Complex query requiring context'
      },
      {
        condition: (messages, query) => {
          const entityCount = messages.filter(m => 
            m.content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g)
          ).length;
          return entityCount / messages.length > 0.6;
        },
        strategy: 'entity-focused',
        reason: 'High entity density'
      },
      {
        condition: (messages, query) => messages.length < 50,
        strategy: 'sliding-window',
        reason: 'Moderate conversation length'
      }
    ],
    
    defaultStrategy: 'sliding-window'
  },

  // Monitoring and analytics
  monitoring: {
    enabled: true,
    logCompressionStats: true,
    trackTokenSavings: true,
    alertThresholds: {
      compressionFailureRate: 0.1, // Alert if >10% compressions fail
      avgCompressionTime: 3000,    // Alert if avg time >3s
      tokenSavingsTarget: 0.3      // Target 30% token reduction
    }
  },

  // Integration settings
  integration: {
    // Which services should use compression
    enabledServices: [
      'chat',
      'conversation-summary',
      'context-retrieval',
      'memory-search'
    ],
    
    // Webhook for compression events (optional)
    webhooks: {
      onCompressionComplete: process.env.COMPRESSION_WEBHOOK_URL,
      includeStats: true
    }
  }
};

/**
 * Get compression configuration for a specific model
 */
export function getModelCompressionConfig(model) {
  const baseConfig = { ...compressionConfig.global };
  
  // Adjust based on model limits
  const modelLimit = compressionConfig.modelLimits[model];
  if (modelLimit) {
    // Use 50% of model limit as default max context
    baseConfig.maxContextTokens = Math.min(
      baseConfig.maxContextTokens,
      Math.floor(modelLimit * 0.5)
    );
  }
  
  return baseConfig;
}

/**
 * Select compression strategy based on rules
 */
export function selectCompressionStrategy(messages, query = '') {
  if (compressionConfig.global.defaultStrategy !== 'auto') {
    return compressionConfig.global.defaultStrategy;
  }
  
  // Evaluate rules in order
  for (const rule of compressionConfig.strategySelection.rules) {
    if (rule.condition(messages, query)) {
      console.log(`📋 Selected ${rule.strategy} strategy: ${rule.reason}`);
      return rule.strategy;
    }
  }
  
  return compressionConfig.strategySelection.defaultStrategy;
}

/**
 * Get importance scoring configuration
 */
export function getImportanceScoringConfig() {
  return compressionConfig.importanceScoring;
}

/**
 * Get summary generation configuration
 */
export function getSummaryConfig(style = null) {
  const config = compressionConfig.summaryGeneration;
  
  if (style && config.styles[style]) {
    return {
      ...config,
      ...config.styles[style]
    };
  }
  
  return config;
}

/**
 * Check if compression should be enabled for a service
 */
export function isCompressionEnabledForService(serviceName) {
  return compressionConfig.global.enabled && 
         compressionConfig.integration.enabledServices.includes(serviceName);
}

export default compressionConfig;