/**
 * LLM Configuration for Tala AI Travel Assistant
 * 
 * This file contains configuration for multiple Large Language Models,
 * including API settings, pricing, and capabilities.
 */

// LLM Provider Configurations
const LLM_PROVIDERS = {
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  GOOGLE: 'google',
  GROK: 'grok',
  LLAMA: 'llama',
  MOCK: 'mock'
};

// Model Configurations
const LLM_MODELS = {
  // OpenAI GPT-5 Models (Released 2025-08-07)
  'gpt-5-nano-2025-08-07': {
    provider: LLM_PROVIDERS.OPENAI,
    name: 'GPT-5 Nano',
    maxTokens: 16384,
    contextWindow: 128000,
    pricing: {
      input: 0.00010,  // per 1K tokens (estimated)
      output: 0.0004   // per 1K tokens (estimated)
    },
    capabilities: {
      chat: true,
      embedding: false,
      vision: true,
      functionCalling: true
    },
    defaultParams: {
      temperature: 0.7,
      maxTokens: 4096,
      topP: 1.0
    }
  },
  'gpt-5-mini-2025-08-07': {
    provider: LLM_PROVIDERS.OPENAI,
    name: 'GPT-5 Mini',
    maxTokens: 32768,
    contextWindow: 256000,
    pricing: {
      input: 0.0005,   // per 1K tokens (estimated)
      output: 0.002    // per 1K tokens (estimated)
    },
    capabilities: {
      chat: true,
      embedding: false,
      vision: true,
      functionCalling: true
    },
    defaultParams: {
      temperature: 0.7,
      maxTokens: 8192,
      topP: 1.0
    }
  },
  'gpt-5-2025-08-07': {
    provider: LLM_PROVIDERS.OPENAI,
    name: 'GPT-5',
    maxTokens: 65536,
    contextWindow: 512000,
    pricing: {
      input: 0.015,    // per 1K tokens (estimated)
      output: 0.06     // per 1K tokens (estimated)
    },
    capabilities: {
      chat: true,
      embedding: false,
      vision: true,
      functionCalling: true
    },
    defaultParams: {
      temperature: 0.7,
      maxTokens: 16384,
      topP: 1.0
    }
  },
  // GPT-4o Model (keeping as requested)
  'gpt-4o-mini': {
    provider: LLM_PROVIDERS.OPENAI,
    name: 'GPT-4o Mini',
    maxTokens: 16384,
    contextWindow: 128000,
    pricing: {
      input: 0.00015,  // per 1K tokens
      output: 0.0006   // per 1K tokens
    },
    capabilities: {
      chat: true,
      embedding: false,
      vision: true,
      functionCalling: true
    },
    defaultParams: {
      temperature: 0.7,
      maxTokens: 4096,
      topP: 1.0
    }
  },
  'text-embedding-3-small': {
    provider: LLM_PROVIDERS.OPENAI,
    name: 'Text Embedding 3 Small',
    maxTokens: 8191,
    contextWindow: 8191,
    pricing: {
      input: 0.00002,  // per 1K tokens
      output: 0        // embedding models don't have output cost
    },
    capabilities: {
      chat: false,
      embedding: true,
      vision: false,
      functionCalling: false
    },
    defaultParams: {
      dimensions: 1536
    }
  },

  // Anthropic Models - Claude 4 is now available!
  'claude-sonnet-4-20250514': {
    provider: LLM_PROVIDERS.ANTHROPIC,
    name: 'Claude Sonnet 4',
    maxTokens: 8192,
    contextWindow: 200000,
    pricing: {
      input: 0.003,    // per 1K tokens (estimated)
      output: 0.015    // per 1K tokens (estimated)
    },
    capabilities: {
      chat: true,
      embedding: false,
      vision: true,
      functionCalling: true
    },
    defaultParams: {
      temperature: 0.7,
      maxTokens: 4096,
      topP: 1.0
    }
  },
  'claude-opus-4-20250514': {
    provider: LLM_PROVIDERS.ANTHROPIC,
    name: 'Claude Opus 4',
    maxTokens: 8192,
    contextWindow: 200000,
    pricing: {
      input: 0.015,    // per 1K tokens (estimated)
      output: 0.075    // per 1K tokens (estimated)
    },
    capabilities: {
      chat: true,
      embedding: false,
      vision: true,
      functionCalling: true
    },
    defaultParams: {
      temperature: 0.7,
      maxTokens: 4096,
      topP: 1.0
    }
  },

  // Google Models
  'gemini-2.5-flash': {
    provider: LLM_PROVIDERS.GOOGLE,
    name: 'Gemini 2.5 Flash',
    maxTokens: 8192,
    contextWindow: 1048576,  // 1M+ tokens
    pricing: {
      input: 0.000075,  // per 1K tokens (estimated)
      output: 0.0003    // per 1K tokens (estimated)
    },
    capabilities: {
      chat: true,
      embedding: false,
      vision: true,
      functionCalling: true,
      codeExecution: true,
      searchGrounding: true,
      thinking: true
    },
    defaultParams: {
      temperature: 0.7,
      maxTokens: 8192,
      topP: 0.95
    }
  },
  'gemini-2.5-pro': {
    provider: LLM_PROVIDERS.GOOGLE,
    name: 'Gemini 2.5 Pro',
    maxTokens: 65536,
    contextWindow: 1048576,  // 1M+ tokens
    pricing: {
      input: 0.00125,  // per 1K tokens (estimated)
      output: 0.005    // per 1K tokens (estimated)
    },
    capabilities: {
      chat: true,
      embedding: false,
      vision: true,
      functionCalling: true,
      codeExecution: true,
      searchGrounding: true,
      thinking: true
    },
    defaultParams: {
      temperature: 0.7,
      maxTokens: 8192,
      topP: 0.95
    }
  },

  // Grok Models (X.AI)
  'grok-4': {
    provider: LLM_PROVIDERS.GROK,
    name: 'Grok 4.0',
    maxTokens: 4096,
    contextWindow: 128000,
    pricing: {
      input: 0.003,    // per 1K tokens (from article)
      output: 0.015    // per 1K tokens (from article)
    },
    capabilities: {
      chat: true,
      embedding: false,
      vision: false,
      functionCalling: true,
      reasoning: true
    },
    defaultParams: {
      temperature: 0.7,
      maxTokens: 4096,
      topP: 1.0
    }
  },
  'grok-4-latest': {
    provider: LLM_PROVIDERS.GROK,
    name: 'Grok 4.0 Latest',
    maxTokens: 4096,
    contextWindow: 128000,
    pricing: {
      input: 0.003,    // per 1K tokens
      output: 0.015    // per 1K tokens
    },
    capabilities: {
      chat: true,
      embedding: false,
      vision: false,
      functionCalling: true,
      reasoning: true
    },
    defaultParams: {
      temperature: 0.7,
      maxTokens: 4096,
      topP: 1.0
    }
  },
  'grok-4-0709': {
    provider: LLM_PROVIDERS.GROK,
    name: 'Grok 4.0 (July 2024)',
    maxTokens: 4096,
    contextWindow: 128000,
    pricing: {
      input: 0.003,    // per 1K tokens
      output: 0.015    // per 1K tokens
    },
    capabilities: {
      chat: true,
      embedding: false,
      vision: false,
      functionCalling: true,
      reasoning: true
    },
    defaultParams: {
      temperature: 0.7,
      maxTokens: 4096,
      topP: 1.0
    }
  },

  // Llama Models (Local deployment)
  'llama-3.1-8b': {
    provider: LLM_PROVIDERS.LLAMA,
    name: 'Llama 3.1 8B',
    maxTokens: 4096,
    contextWindow: 128000,
    pricing: {
      input: 0,        // Local deployment - no API costs
      output: 0
    },
    capabilities: {
      chat: true,
      embedding: false,
      vision: false,
      functionCalling: true
    },
    defaultParams: {
      temperature: 0.7,
      maxTokens: 4096,
      topP: 0.9
    },
    localConfig: {
      modelPath: process.env.LLAMA_MODEL_PATH || './models/llama-3.1-8b.gguf',
      quantization: 'q4_0',
      contextSize: 4096,
      gpuLayers: 0  // CPU inference by default
    }
  },

  // Mock Models (Testing)
  'mock-model': {
    provider: LLM_PROVIDERS.MOCK,
    name: 'Mock Model',
    maxTokens: 4096,
    contextWindow: 8192,
    pricing: {
      input: 0,     // No cost for testing
      output: 0
    },
    capabilities: {
      chat: true,
      embedding: true,
      vision: false,
      functionCalling: true
    },
    defaultParams: {
      temperature: 0.7,
      maxTokens: 1000,
      topP: 1.0
    }
  },
  'mock-test': {
    provider: LLM_PROVIDERS.MOCK,
    name: 'Mock Test Model',
    maxTokens: 4096,
    contextWindow: 8192,
    pricing: {
      input: 0,     // No cost for testing
      output: 0
    },
    capabilities: {
      chat: true,
      embedding: true,
      vision: false,
      functionCalling: true
    },
    defaultParams: {
      temperature: 0.7,
      maxTokens: 1000,
      topP: 1.0
    }
  },
  'mock-retry-test': {
    provider: LLM_PROVIDERS.MOCK,
    name: 'Mock Retry Test Model',
    maxTokens: 4096,
    contextWindow: 8192,
    pricing: {
      input: 0,     // No cost for testing
      output: 0
    },
    capabilities: {
      chat: true,
      embedding: true,
      vision: false,
      functionCalling: true
    },
    defaultParams: {
      temperature: 0.7,
      maxTokens: 1000,
      topP: 1.0
    }
  },
  'mock-stream-test': {
    provider: LLM_PROVIDERS.MOCK,
    name: 'Mock Stream Test Model',
    maxTokens: 4096,
    contextWindow: 8192,
    pricing: {
      input: 0,     // No cost for testing
      output: 0
    },
    capabilities: {
      chat: true,
      embedding: true,
      vision: false,
      functionCalling: true
    },
    defaultParams: {
      temperature: 0.7,
      maxTokens: 1000,
      topP: 1.0
    }
  }
};

// Default model for each use case (Updated with GPT-5 models)
const DEFAULT_MODELS = {
  chat: 'gpt-5-nano-2025-08-07',     // GPT-5 Nano for common tasks
  embedding: 'text-embedding-3-small',  // Standard embedding model
  analysis: 'gpt-5-2025-08-07',    // GPT-5 for heavy analysis work
  creative: 'claude-opus-4-20250514',       // Keep Claude 4 Opus for creative (pending GPT-5 testing)
  vision: 'gpt-5-mini-2025-08-07',     // GPT-5 Mini for vision tasks
  reasoning: 'gpt-5-2025-08-07',  // GPT-5 for complex reasoning
  fast: 'gpt-5-nano-2025-08-07',     // GPT-5 Nano for fast responses
  local: 'llama-3.1-8b',        // Local deployment
  multimodal: 'gpt-5-mini-2025-08-07'  // GPT-5 Mini for multimodal tasks
};

// Provider-specific configurations
const PROVIDER_CONFIGS = {
  [LLM_PROVIDERS.OPENAI]: {
    baseURL: 'https://api.openai.com/v1',
    apiKeyEnv: 'OPENAI_API_KEY',
    defaultModel: 'gpt-5-nano-2025-08-07',  // Updated to GPT-5 Nano
    rateLimits: {
      requestsPerMinute: 500,
      tokensPerMinute: 150000
    }
  },
  [LLM_PROVIDERS.ANTHROPIC]: {
    baseURL: 'https://api.anthropic.com/v1',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    defaultModel: 'claude-sonnet-4-20250514',
    rateLimits: {
      requestsPerMinute: 50,
      tokensPerMinute: 40000
    }
  },
  [LLM_PROVIDERS.GOOGLE]: {
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
    apiKeyEnv: 'GOOGLE_AI_API_KEY',
    defaultModel: 'gemini-2.5-flash',
    rateLimits: {
      requestsPerMinute: 60,
      tokensPerMinute: 32000
    }
  },
  [LLM_PROVIDERS.GROK]: {
    baseURL: 'https://api.x.ai/v1',
    apiKeyEnv: 'GROK_API_KEY',
    defaultModel: 'grok-4-latest',
    rateLimits: {
      requestsPerMinute: 100,
      tokensPerMinute: 50000
    }
  },
  [LLM_PROVIDERS.LLAMA]: {
    baseURL: null, // Local deployment
    apiKeyEnv: null,
    defaultModel: 'llama-3.1-8b',
    rateLimits: {
      requestsPerMinute: 1000, // Limited by hardware
      tokensPerMinute: 500000
    }
  },
  [LLM_PROVIDERS.MOCK]: {
    baseURL: null, // Testing/mock service
    apiKeyEnv: null,
    defaultModel: 'mock-model',
    rateLimits: {
      requestsPerMinute: 10000, // No real limits for mock
      tokensPerMinute: 1000000
    }
  }
};

// Cost tracking configuration
const COST_TRACKING = {
  enabled: true,
  currency: 'USD',
  trackingPeriods: ['daily', 'weekly', 'monthly'],
  budgetLimits: {
    daily: 10.00,    // $10 per day
    weekly: 50.00,   // $50 per week
    monthly: 200.00  // $200 per month
  },
  alertThresholds: {
    warning: 0.8,    // 80% of budget
    critical: 0.95   // 95% of budget
  }
};

// Load balancing configuration
const LOAD_BALANCING = {
  enabled: true,
  strategies: {
    roundRobin: 'round_robin',
    leastCost: 'least_cost',
    fastestResponse: 'fastest_response',
    random: 'random'
  },
  fallbackChain: [
    'gpt-4o-mini',
    'claude-sonnet-4-20250514',
    'gemini-2.5-flash',
    'llama-3.1-8b'
  ]
};

/**
 * Get model configuration by ID
 * @param {string} modelId - The model identifier
 * @returns {object|null} Model configuration or null if not found
 */
function getModelConfig(modelId) {
  return LLM_MODELS[modelId] || null;
}

/**
 * Get provider configuration by name
 * @param {string} providerName - The provider name
 * @returns {object|null} Provider configuration or null if not found
 */
function getProviderConfig(providerName) {
  return PROVIDER_CONFIGS[providerName] || null;
}

/**
 * Get default model for a specific use case
 * @param {string} useCase - The use case (chat, embedding, analysis, etc.)
 * @returns {string} Model ID
 */
function getDefaultModel(useCase) {
  return DEFAULT_MODELS[useCase] || DEFAULT_MODELS.chat;
}

/**
 * Get all available models for a provider
 * @param {string} providerName - The provider name
 * @returns {array} Array of model configurations
 */
function getModelsByProvider(providerName) {
  return Object.entries(LLM_MODELS)
    .filter(([_, config]) => config.provider === providerName)
    .map(([id, config]) => ({ id, ...config }));
}

/**
 * Calculate estimated cost for a request
 * @param {string} modelId - The model identifier
 * @param {number} inputTokens - Number of input tokens
 * @param {number} outputTokens - Number of output tokens
 * @returns {number} Estimated cost in USD
 */
function calculateCost(modelId, inputTokens, outputTokens) {
  const model = getModelConfig(modelId);
  if (!model) return 0;

  const inputCost = (inputTokens / 1000) * model.pricing.input;
  const outputCost = (outputTokens / 1000) * model.pricing.output;
  
  return inputCost + outputCost;
}

/**
 * Check if a model is available (has required API key)
 * @param {string} modelId - The model identifier
 * @returns {boolean} True if model is available
 */
function isModelAvailable(modelId) {
  const model = getModelConfig(modelId);
  if (!model) return false;

  const provider = getProviderConfig(model.provider);
  if (!provider) return false;

  // For local models, check if model file exists
  if (model.provider === LLM_PROVIDERS.LLAMA) {
    // TODO: Add file system check for local models
    return true;
  }

  // For API models, check if API key is configured
  return provider.apiKeyEnv ? !!process.env[provider.apiKeyEnv] : false;
}

export {
  LLM_PROVIDERS,
  LLM_MODELS,
  DEFAULT_MODELS,
  PROVIDER_CONFIGS,
  COST_TRACKING,
  LOAD_BALANCING,
  getModelConfig,
  getProviderConfig,
  getDefaultModel,
  getModelsByProvider,
  calculateCost,
  isModelAvailable
};