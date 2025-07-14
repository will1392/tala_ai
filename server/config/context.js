/**
 * Context Management Configuration for Tala AI
 * 
 * Defines settings for memory importance, context windows, entity types,
 * and memory retention policies for the advanced context management system.
 */

import dotenv from 'dotenv';
dotenv.config();

/**
 * Memory importance thresholds and scoring
 */
export const MEMORY_IMPORTANCE = {
  // Importance score thresholds (0.0 - 1.0)
  THRESHOLDS: {
    CRITICAL: 0.9,    // Passport info, emergency contacts, medical conditions
    HIGH: 0.7,        // Travel preferences, dietary restrictions, loyalty programs
    MEDIUM: 0.5,      // General preferences, past destinations
    LOW: 0.3          // Casual mentions, temporary preferences
  },
  
  // Base importance scores by memory type
  BASE_SCORES: {
    passport_info: 0.95,
    emergency_contact: 0.95,
    dietary_restriction: 0.85,
    accessibility_need: 0.85,
    loyalty_program: 0.75,
    budget_preference: 0.70,
    destination_preference: 0.65,
    accommodation_preference: 0.60,
    transportation_preference: 0.60,
    activity_preference: 0.55,
    travel_history: 0.50,
    personal_preference: 0.45,
    contact_info: 0.80,
    travel_companion: 0.55,
    fact: 0.40,
    note: 0.30
  },
  
  // Boost factors for importance calculation
  BOOST_FACTORS: {
    recently_mentioned: 1.2,    // Mentioned in last 3 conversations
    frequently_mentioned: 1.3,  // Mentioned 3+ times
    user_emphasized: 1.4,       // User specifically emphasized importance
    travel_critical: 1.5,       // Critical for travel (passport, visa, etc.)
    time_sensitive: 1.3,        // Has expiry or time relevance
    verified: 1.1               // Information has been verified
  }
};

/**
 * Context window sizes and limits
 */
export const CONTEXT_WINDOWS = {
  // Maximum number of messages to analyze for context
  MAX_MESSAGES_FOR_CONTEXT: parseInt(process.env.CONTEXT_MAX_MESSAGES) || 50,
  
  // Maximum number of memories to retrieve for context
  MAX_MEMORIES_FOR_CONTEXT: parseInt(process.env.CONTEXT_MAX_MEMORIES) || 20,
  
  // Maximum token length for context summary
  MAX_CONTEXT_SUMMARY_TOKENS: parseInt(process.env.CONTEXT_MAX_SUMMARY_TOKENS) || 500,
  
  // Maximum number of entities to extract per message
  MAX_ENTITIES_PER_MESSAGE: 20,
  
  // Rolling window for conversation analysis (in messages)
  ROLLING_WINDOW_SIZE: 10,
  
  // Lookback period for relevant memories (in days)
  MEMORY_LOOKBACK_DAYS: parseInt(process.env.MEMORY_LOOKBACK_DAYS) || 90,
  
  // Context freshness period (in hours)
  CONTEXT_FRESHNESS_HOURS: 24
};

/**
 * Entity types and their configurations
 */
export const ENTITY_TYPES = {
  // Travel-specific entities
  TRAVEL: {
    destination: {
      patterns: [
        /\b(?:going to|traveling to|visiting|trip to)\s+([A-Z][a-z\s,]+)/gi,
        /\b(?:in|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*(?:,|\.|$)/gi
      ],
      confidence_threshold: 0.7,
      importance_boost: 1.2
    },
    
    airline: {
      patterns: [
        /\b(?:flying|flight)\s+(?:with\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/gi,
        /\b(?:Delta|United|American|Southwest|JetBlue|Alaska|Spirit|Frontier)\b/gi
      ],
      confidence_threshold: 0.8,
      importance_boost: 1.1
    },
    
    hotel: {
      patterns: [
        /\bstaying at\s+([A-Z][a-z\s]+(?:Hotel|Resort|Inn|Lodge))/gi,
        /\b(?:Marriott|Hilton|Hyatt|IHG|Best Western|Holiday Inn)\b/gi
      ],
      confidence_threshold: 0.8,
      importance_boost: 1.1
    },
    
    date: {
      patterns: [
        /\b(?:on|from|until|by)\s+(\w+\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s+\d{4})?)/gi,
        /\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/g,
        /\b(\d{4}-\d{1,2}-\d{1,2})\b/g
      ],
      confidence_threshold: 0.9,
      importance_boost: 1.3
    }
  },
  
  // Personal information entities
  PERSONAL: {
    dietary_restriction: {
      keywords: [
        'vegetarian', 'vegan', 'gluten-free', 'allergic to', 'can\'t eat',
        'lactose intolerant', 'kosher', 'halal', 'diabetic', 'low sodium'
      ],
      confidence_threshold: 0.8,
      importance_boost: 1.4
    },
    
    accessibility_need: {
      keywords: [
        'wheelchair', 'mobility', 'visual impairment', 'hearing impairment',
        'assistance', 'special needs', 'disabled', 'accessibility'
      ],
      confidence_threshold: 0.8,
      importance_boost: 1.4
    },
    
    budget_preference: {
      patterns: [
        /\bbudget\s+(?:of\s+)?(?:around\s+)?[\$]?(\d+(?:,\d{3})*(?:\.\d{2})?)/gi,
        /\b(?:spending|budget)\s+[\$]?(\d+(?:,\d{3})*)/gi
      ],
      confidence_threshold: 0.7,
      importance_boost: 1.2
    }
  },
  
  // Document and credential entities
  DOCUMENTS: {
    passport: {
      patterns: [
        /\bpassport\s+(?:expires?|expiration)\s+(?:on\s+)?([A-Za-z\s\d,]+)/gi,
        /\bpassport\s+(?:number|#)\s*:?\s*([A-Z0-9]+)/gi
      ],
      confidence_threshold: 0.9,
      importance_boost: 1.5
    },
    
    visa: {
      patterns: [
        /\bvisa\s+(?:for\s+)?([A-Z][a-z\s]+)/gi,
        /\b([A-Z][a-z\s]+)\s+visa/gi
      ],
      confidence_threshold: 0.8,
      importance_boost: 1.4
    }
  }
};

/**
 * Memory retention policies
 */
export const RETENTION_POLICIES = {
  // Retention periods by importance level (in days)
  RETENTION_PERIODS: {
    critical: null,     // Never expire
    high: 365 * 2,      // 2 years
    medium: 365,        // 1 year
    low: 90             // 3 months
  },
  
  // Memory types that never expire
  PERMANENT_MEMORY_TYPES: [
    'passport_info',
    'emergency_contact',
    'dietary_restriction',
    'accessibility_need'
  ],
  
  // Cleanup policies
  CLEANUP: {
    // Run cleanup every N days
    CLEANUP_INTERVAL_DAYS: parseInt(process.env.MEMORY_CLEANUP_INTERVAL) || 7,
    
    // Minimum access count to keep low importance memories
    MIN_ACCESS_COUNT_FOR_LOW_IMPORTANCE: 3,
    
    // Batch size for cleanup operations
    CLEANUP_BATCH_SIZE: 100,
    
    // Keep at least N memories per user
    MIN_MEMORIES_PER_USER: 10
  }
};

/**
 * Context analysis settings
 */
export const CONTEXT_ANALYSIS = {
  // Sentiment analysis settings
  SENTIMENT: {
    enabled: true,
    track_emotional_state: true,
    detect_stress_indicators: true
  },
  
  // Topic modeling settings
  TOPICS: {
    min_topic_confidence: 0.6,
    max_topics_per_conversation: 5,
    topic_similarity_threshold: 0.8
  },
  
  // Entity relationship settings
  RELATIONSHIPS: {
    max_relationship_distance: 3,
    relationship_confidence_threshold: 0.7,
    track_temporal_relationships: true
  },
  
  // Context quality metrics
  QUALITY: {
    min_completeness_score: 0.5,
    min_extraction_confidence: 0.6,
    context_freshness_weight: 0.3,
    entity_density_weight: 0.4,
    memory_relevance_weight: 0.3
  }
};

/**
 * Vector embedding settings
 */
export const EMBEDDING_CONFIG = {
  // Qdrant collection settings
  COLLECTIONS: {
    memories: 'tala_memories',
    entities: 'tala_entities',
    contexts: 'tala_contexts'
  },
  
  // Vector dimensions (must match your embedding model)
  VECTOR_DIMENSIONS: parseInt(process.env.EMBEDDING_DIMENSIONS) || 1536,
  
  // Distance metric for similarity search
  DISTANCE_METRIC: process.env.EMBEDDING_DISTANCE_METRIC || 'cosine',
  
  // Similarity search settings
  SIMILARITY_SEARCH: {
    default_limit: 10,
    min_similarity_threshold: 0.7,
    max_results: 50,
    enable_filtering: true
  },
  
  // Embedding model settings
  MODEL: {
    provider: process.env.EMBEDDING_PROVIDER || 'openai',
    model_name: process.env.EMBEDDING_MODEL || 'text-embedding-ada-002',
    batch_size: parseInt(process.env.EMBEDDING_BATCH_SIZE) || 100,
    retry_attempts: 3,
    timeout_ms: 30000
  }
};

/**
 * Performance and optimization settings
 */
export const PERFORMANCE = {
  // Caching settings
  CACHE: {
    enable_memory_cache: true,
    enable_context_cache: true,
    memory_cache_ttl_seconds: 3600,    // 1 hour
    context_cache_ttl_seconds: 1800,   // 30 minutes
    max_cache_size_mb: 100
  },
  
  // Batch processing settings
  BATCH_PROCESSING: {
    entity_extraction_batch_size: 10,
    memory_indexing_batch_size: 50,
    context_analysis_batch_size: 5,
    max_concurrent_operations: 3
  },
  
  // Rate limiting
  RATE_LIMITS: {
    max_context_analyses_per_minute: 60,
    max_memory_retrievals_per_minute: 200,
    max_entity_extractions_per_minute: 100
  }
};

/**
 * Integration settings
 */
export const INTEGRATION = {
  // Chat service integration
  CHAT_INTEGRATION: {
    auto_capture_context: true,
    context_injection_enabled: true,
    max_context_tokens_in_prompt: 1000,
    memory_relevance_threshold: 0.6
  },
  
  // External service settings
  EXTERNAL_SERVICES: {
    enable_entity_validation: false,
    validation_timeout_ms: 5000,
    fallback_on_service_failure: true
  },
  
  // Monitoring and logging
  MONITORING: {
    enable_performance_tracking: true,
    enable_quality_metrics: true,
    log_level: process.env.CONTEXT_LOG_LEVEL || 'info',
    metrics_retention_days: 30
  }
};

/**
 * Development and testing settings
 */
export const DEVELOPMENT = {
  // Mock data settings
  MOCK_DATA: {
    enable_mock_entities: process.env.NODE_ENV === 'development',
    mock_confidence_scores: true,
    simulate_embedding_delays: false
  },
  
  // Testing settings
  TESTING: {
    enable_test_mode: process.env.NODE_ENV === 'test',
    use_in_memory_storage: process.env.NODE_ENV === 'test',
    disable_external_calls: process.env.NODE_ENV === 'test'
  },
  
  // Debug settings
  DEBUG: {
    log_entity_extractions: process.env.DEBUG_CONTEXT === 'true',
    log_memory_retrievals: process.env.DEBUG_CONTEXT === 'true',
    log_context_analysis: process.env.DEBUG_CONTEXT === 'true',
    save_debug_files: false
  }
};

/**
 * Get configuration for a specific component
 */
export function getContextConfig(component = 'all') {
  const configs = {
    memory: MEMORY_IMPORTANCE,
    context: CONTEXT_WINDOWS,
    entities: ENTITY_TYPES,
    retention: RETENTION_POLICIES,
    analysis: CONTEXT_ANALYSIS,
    embedding: EMBEDDING_CONFIG,
    performance: PERFORMANCE,
    integration: INTEGRATION,
    development: DEVELOPMENT
  };
  
  if (component === 'all') {
    return {
      MEMORY_IMPORTANCE,
      CONTEXT_WINDOWS,
      ENTITY_TYPES,
      RETENTION_POLICIES,
      CONTEXT_ANALYSIS,
      EMBEDDING_CONFIG,
      PERFORMANCE,
      INTEGRATION,
      DEVELOPMENT
    };
  }
  
  return configs[component] || {};
}

/**
 * Validate configuration settings
 */
export function validateContextConfig() {
  const errors = [];
  
  // Validate memory importance thresholds
  const thresholds = MEMORY_IMPORTANCE.THRESHOLDS;
  if (thresholds.LOW >= thresholds.MEDIUM) {
    errors.push('LOW threshold must be less than MEDIUM threshold');
  }
  if (thresholds.MEDIUM >= thresholds.HIGH) {
    errors.push('MEDIUM threshold must be less than HIGH threshold');
  }
  if (thresholds.HIGH >= thresholds.CRITICAL) {
    errors.push('HIGH threshold must be less than CRITICAL threshold');
  }
  
  // Validate context windows
  if (CONTEXT_WINDOWS.MAX_MESSAGES_FOR_CONTEXT <= 0) {
    errors.push('MAX_MESSAGES_FOR_CONTEXT must be positive');
  }
  
  // Validate embedding dimensions
  if (EMBEDDING_CONFIG.VECTOR_DIMENSIONS <= 0) {
    errors.push('VECTOR_DIMENSIONS must be positive');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Export default configuration
export default {
  MEMORY_IMPORTANCE,
  CONTEXT_WINDOWS,
  ENTITY_TYPES,
  RETENTION_POLICIES,
  CONTEXT_ANALYSIS,
  EMBEDDING_CONFIG,
  PERFORMANCE,
  INTEGRATION,
  DEVELOPMENT,
  getContextConfig,
  validateContextConfig
};