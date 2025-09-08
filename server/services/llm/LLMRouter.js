/**
 * LLM Router Service for Tala AI Travel Assistant
 * 
 * Implements intelligent routing logic to automatically select the optimal
 * LLM model based on query characteristics, cost considerations, and performance
 * requirements. Enhanced with robust fallback chains and error handling.
 */

import { 
  OpenAIService, 
  AnthropicService, 
  GeminiService, 
  GrokService, 
  MockLLMService 
} from './providers/index.js';
import { 
  LLM_MODELS, 
  LLM_PROVIDERS, 
  getModelConfig, 
  calculateCost, 
  isModelAvailable 
} from './config.js';
import { FallbackManager } from './FallbackManager.js';
import { 
  LLMError, 
  AllModelsFailedError, 
  ErrorUtils 
} from './errors/LLMErrors.js';
import { PerformanceMonitor } from './monitoring/PerformanceMonitor.js';
import { CostOptimizer } from './monitoring/CostOptimizer.js';
import { MetricsCollector } from './monitoring/MetricsCollector.js';

class LLMRouter {
  constructor(options = {}) {
    this.options = {
      enableLogging: options.enableLogging !== false,
      costOptimization: options.costOptimization !== false,
      enableHealthChecks: options.enableHealthChecks !== false,
      healthCheckInterval: options.healthCheckInterval || 300000, // 5 minutes
      enableMonitoring: options.enableMonitoring !== false,
      enableCostOptimization: options.enableCostOptimization !== false,
      dailyBudget: options.dailyBudget || null,
      monthlyBudget: options.monthlyBudget || null,
      fallbackChain: options.fallbackChain || [
        'gpt-4o-mini',
        'claude-sonnet-4-20250514',
        'gemini-2.5-flash',
        'grok-4-latest',
        'mock-model'
      ],
      ...options
    };
    
    // Initialize fallback manager
    this.fallbackManager = new FallbackManager({
      enableLogging: this.options.enableLogging,
      enableCircuitBreaker: true,
      maxRetries: 2
    });
    
    // Initialize monitoring components
    if (this.options.enableMonitoring) {
      this.performanceMonitor = new PerformanceMonitor({
        enableLogging: this.options.enableLogging
      });
      
      this.metricsCollector = new MetricsCollector({
        enableLogging: this.options.enableLogging,
        autoSave: true
      });
    }
    
    if (this.options.enableCostOptimization) {
      this.costOptimizer = new CostOptimizer({
        enableLogging: this.options.enableLogging,
        dailyBudget: this.options.dailyBudget,
        monthlyBudget: this.options.monthlyBudget
      });
    }
    
    this.serviceCache = new Map();
    this.routingStats = {
      totalQueries: 0,
      routingDecisions: {},
      fallbackUsage: {},
      costSavings: 0,
      uptime: Date.now()
    };
    
    // Health check tracking
    this.serviceHealth = new Map();
    this.healthCheckTimer = null;
    
    // Start health checking if enabled
    if (this.options.enableHealthChecks) {
      this.startHealthChecking();
    }
    
    this.log('LLM Router initialized with enhanced fallback management and monitoring');
  }

  /**
   * Main routing method - intelligently selects and executes with optimal model
   * @param {string} query - The user query to process
   * @param {Object} context - Additional context (user preferences, conversation history, etc.)
   * @param {Object} options - Execution options (maxTokens, temperature, etc.)
   * @returns {Promise<Object>} LLM response with routing metadata
   */
  async routeQuery(query, context = {}, options = {}) {
    this.routingStats.totalQueries++;
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    try {
      // Step 1: Detect query type and characteristics
      const queryAnalysis = await this.detectQueryType(query, context);
      this.log(`Query analysis: ${JSON.stringify(queryAnalysis)}`);
      
      // Step 2: Apply cost optimization if enabled
      let optimalModel = null;
      if (this.costOptimizer) {
        const costOptimization = this.costOptimizer.getOptimizedModel(
          queryAnalysis.type,
          {
            estimatedTokens: this.estimateTokens(query),
            userId: context.userId,
            sessionId: context.sessionId
          }
        );
        
        if (costOptimization.isEmergencyMode) {
          this.log(`🚨 Emergency budget mode - using cheapest models`, 'warn');
        }
        
        optimalModel = costOptimization.primaryModel;
        queryAnalysis.costOptimization = costOptimization;
      }
      
      // Step 3: Get fallback chain for this query type
      const fallbackChain = this.fallbackManager.getFallbackChain(
        queryAnalysis.type,
        context.userPreferences?.customFallbackChain
      );
      
      // Apply cost optimization to chain if needed
      let filteredChain = this.filterFallbackChain(
        fallbackChain,
        queryAnalysis,
        context.userPreferences
      );
      
      if (optimalModel && !filteredChain.includes(optimalModel)) {
        filteredChain = [optimalModel, ...filteredChain];
      }
      
      this.log(`Using fallback chain: ${filteredChain.join(' -> ')}`);
      
      // Step 4: Start performance monitoring
      if (this.performanceMonitor) {
        this.performanceMonitor.startRequest(requestId, {
          modelId: filteredChain[0],
          queryType: queryAnalysis.type,
          userId: context.userId,
          sessionId: context.sessionId,
          queryLength: query.length,
          estimatedTokens: this.estimateTokens(query)
        });
      }
      
      // Step 5: Execute with comprehensive fallback support
      const executionContext = {
        query,
        queryAnalysis,
        provider: null,
        userPreferences: context.userPreferences
      };
      
      const response = await this.fallbackManager.executeWithFallback(
        async (modelId) => {
          const service = await this.getServiceInstance(modelId);
          const messages = [];
          
          // Add system prompt if provided in options
          if (options.systemPrompt) {
            messages.push({ role: 'system', content: options.systemPrompt });
          }
          
          // Add user message
          messages.push({ role: 'user', content: query });
          
          return await service.chat(messages, options);
        },
        filteredChain,
        executionContext
      );
      
      // Step 6: Complete monitoring and record metrics
      const routingTime = Date.now() - startTime;
      const finalModel = response.metadata.model;
      
      const metricsData = {
        requestId,
        modelId: finalModel,
        queryType: queryAnalysis.type,
        userId: context.userId,
        sessionId: context.sessionId,
        responseTime: routingTime,
        tokensUsed: response.usage.totalTokens,
        inputTokens: response.usage.promptTokens,
        outputTokens: response.usage.completionTokens,
        cost: response.usage.cost,
        inputCost: response.usage.inputCost || 0,
        outputCost: response.usage.outputCost || 0,
        success: true,
        fallbacksUsed: response.fallbackMetadata?.fallbacksUsed || 0,
        modelsAttempted: response.fallbackMetadata?.modelsAttempted || 1,
        contentLength: response.content?.length || 0,
        timestamp: Date.now()
      };
      
      // Record metrics in all monitoring components
      if (this.performanceMonitor) {
        this.performanceMonitor.completeRequest(requestId, metricsData);
      }
      
      if (this.costOptimizer) {
        this.costOptimizer.recordCost(metricsData);
      }
      
      if (this.metricsCollector) {
        await this.metricsCollector.storeMetrics(metricsData);
      }
      
      // Step 7: Add routing metadata and update stats
      response.routing = {
        queryType: queryAnalysis.type,
        selectedModel: finalModel,
        routingTime,
        fallbacksUsed: response.fallbackMetadata?.fallbacksUsed || 0,
        totalModelsAttempted: response.fallbackMetadata?.modelsAttempted || 1,
        costOptimized: queryAnalysis.costOptimized,
        circuitBreakerStatus: response.fallbackMetadata?.circuitBreakerStatus || {},
        budgetStatus: this.costOptimizer?.getBudgetStatus() || null,
        costSavings: queryAnalysis.costOptimization?.costSavings || null
      };
      
      // Include failure details if there were any
      if (response.fallbackMetadata?.failures?.length > 0) {
        response.routing.failures = response.fallbackMetadata.failures.map(f => ({
          modelId: f.modelId,
          errorType: f.error.constructor.name,
          message: f.error.getUserMessage(),
          timestamp: f.timestamp,
          skipped: f.skipped
        }));
      }
      
      this.updateRoutingStats(queryAnalysis.type, finalModel);
      this.log(`Query routed successfully in ${routingTime}ms with ${response.routing.fallbacksUsed} fallbacks - Cost: $${(response.usage.cost || 0).toFixed(6)}`);
      
      return response;
      
    } catch (error) {
      const routingTime = Date.now() - startTime;
      
      // Record failed metrics
      const failureMetrics = {
        requestId,
        modelId: 'unknown',
        queryType: context.queryType || 'unknown',
        userId: context.userId,
        sessionId: context.sessionId,
        responseTime: routingTime,
        tokensUsed: 0,
        cost: 0,
        success: false,
        errorType: error.constructor.name,
        timestamp: Date.now()
      };
      
      if (this.performanceMonitor) {
        this.performanceMonitor.completeRequest(requestId, failureMetrics);
      }
      
      if (this.metricsCollector) {
        await this.metricsCollector.storeMetrics(failureMetrics);
      }
      
      // Handle AllModelsFailedError specially
      if (error instanceof AllModelsFailedError) {
        this.log(`All models failed after ${error.failures.length} attempts`, 'error');
        
        // Create user-friendly response
        const friendlyError = new LLMError(
          error.getUserMessage(),
          error,
          null,
          null
        );
        
        // Add routing metadata to error
        friendlyError.routing = {
          queryType: context.queryType || 'unknown',
          routingTime,
          totalModelsAttempted: error.failures.length,
          failures: error.failures.map(f => ({
            modelId: f.modelId,
            errorType: f.error.constructor.name,
            message: f.error.getUserMessage(),
            timestamp: f.timestamp
          })),
          failureSummary: error.getFailureSummary()
        };
        
        throw friendlyError;
      }
      
      this.log(`Routing failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Analyzes query to detect type and required features
   * @param {string} query - The user query
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} Query analysis results
   */
  async detectQueryType(query, context = {}) {
    const queryLower = query.toLowerCase();
    const words = queryLower.split(/\s+/);
    
    // Define keyword patterns for different query types
    const patterns = {
      realTime: [
        'current', 'now', 'latest', 'real-time', 'today', 'right now',
        'currently', 'at the moment', 'breaking', 'live', 'recent',
        'weather', 'news', 'traffic', 'flight status', 'delays'
      ],
      complexPlanning: [
        'itinerary', 'multi-city', 'detailed plan', 'trip planning',
        'schedule', 'route optimization', 'complex', 'comprehensive',
        'step-by-step', 'detailed', 'elaborate', 'sophisticated',
        'multiple destinations', 'travel plan', 'vacation planning',
        '2-week', '3-week', 'week itinerary', 'day itinerary', 
        'multi-day', 'trip to', 'visit multiple', 'comprehensive trip'
      ],
      documentAnalysis: [
        'analyze', 'extract', 'document', 'file', 'pdf', 'review',
        'summarize', 'parse', 'examine', 'study', 'read through',
        'content analysis', 'text analysis', 'data extraction'
      ],
      multimodal: [
        'image', 'photo', 'picture', 'video', 'visual', 'screenshot',
        'map', 'diagram', 'chart', 'graph', 'attachment', 'upload',
        'show me', 'look at', 'see this', 'view'
      ],
      creative: [
        'create', 'generate', 'write', 'compose', 'draft', 'design',
        'brainstorm', 'creative', 'innovative', 'imaginative',
        'story', 'poem', 'article', 'content', 'marketing'
      ],
      factual: [
        'what is', 'define', 'explain', 'how does', 'why',
        'fact', 'information', 'details', 'definition',
        'history', 'background', 'overview'
      ]
    };
    
    // Score each query type based on keyword matches
    const scores = {};
    for (const [type, keywords] of Object.entries(patterns)) {
      scores[type] = 0;
      for (const keyword of keywords) {
        if (queryLower.includes(keyword)) {
          // Weight longer keywords more heavily
          scores[type] += keyword.split(' ').length;
        }
      }
    }
    
    // Determine primary query type
    const primaryType = Object.keys(scores).reduce((a, b) => 
      scores[a] > scores[b] ? a : b
    );
    
    // Check for required features based on context and query
    const requiredFeatures = {
      vision: scores.multimodal > 0 || context.hasAttachments,
      reasoning: scores.complexPlanning > 2 || scores.documentAnalysis > 1,
      realTime: scores.realTime > 0,
      functionCalling: queryLower.includes('book') || queryLower.includes('reserve'),
      fastResponse: queryLower.includes('quick') || queryLower.includes('fast')
    };
    
    // Determine if cost optimization should be prioritized
    const costOptimized = scores[primaryType] < 2 && !requiredFeatures.reasoning;
    
    return {
      type: primaryType,
      scores,
      requiredFeatures,
      costOptimized,
      queryLength: query.length,
      complexity: this.assessComplexity(query, scores)
    };
  }

  /**
   * Selects the optimal model based on query type and requirements
   * @param {string} queryType - Detected query type
   * @param {Object} requiredFeatures - Required model capabilities
   * @param {Object} userPreferences - User's model preferences
   * @returns {string} Optimal model ID
   */
  getOptimalModel(queryType, requiredFeatures = {}, userPreferences = {}) {
    // User override takes precedence
    if (userPreferences.preferredModel && isModelAvailable(userPreferences.preferredModel)) {
      this.log(`Using user-preferred model: ${userPreferences.preferredModel}`);
      return userPreferences.preferredModel;
    }
    
    // Model selection rules based on query type
    const routingRules = {
      realTime: [
        'grok-4-latest',    // Best for real-time/current info
        'gpt-4o-mini',      // Fast and reliable
        'gemini-2.5-flash'  // Ultra-fast backup
      ],
      complexPlanning: [
        'claude-opus-4-20250514',      // Best reasoning for complex planning
        'claude-sonnet-4-20250514',    // Good balance
        'gemini-2.5-pro'               // Strong multimodal planning
      ],
      documentAnalysis: [
        'claude-sonnet-4-20250514',    // Excellent text analysis
        'gpt-4o-mini',                 // Good general analysis
        'gemini-2.5-pro'               // Strong document understanding
      ],
      multimodal: [
        'gemini-2.5-pro',              // Best multimodal capabilities
        'gpt-4o-mini',                 // Good vision support
        'claude-sonnet-4-20250514'     // Growing multimodal support
      ],
      creative: [
        'claude-opus-4-20250514',      // Most creative and nuanced
        'gpt-4o-mini',                 // Good creative balance
        'gemini-2.5-flash'             // Fast creative responses
      ],
      factual: [
        'gpt-4o-mini',                 // Cost-effective for simple facts
        'gemini-2.5-flash',            // Ultra-fast facts
        'claude-sonnet-4-20250514'     // Accurate and detailed
      ]
    };
    
    // Get candidates for this query type
    let candidates = routingRules[queryType] || routingRules.factual;
    
    // Filter by required features
    candidates = candidates.filter(modelId => {
      const config = getModelConfig(modelId);
      if (!config || !isModelAvailable(modelId)) return false;
      
      // Check feature requirements
      if (requiredFeatures.vision && !config.capabilities.vision) return false;
      if (requiredFeatures.reasoning && !config.capabilities.reasoning && !config.capabilities.functionCalling) return false;
      if (requiredFeatures.functionCalling && !config.capabilities.functionCalling) return false;
      
      return true;
    });
    
    // If cost optimization is enabled, prefer cheaper models
    if (this.options.costOptimization && requiredFeatures.fastResponse) {
      candidates.sort((a, b) => {
        const costA = getModelConfig(a).pricing.input + getModelConfig(a).pricing.output;
        const costB = getModelConfig(b).pricing.input + getModelConfig(b).pricing.output;
        return costA - costB;
      });
    }
    
    // Return the best available candidate
    const selected = candidates[0] || 'gpt-4o-mini';
    this.log(`Model selection for ${queryType}: ${selected} (from ${candidates.length} candidates)`);
    
    return selected;
  }

  /**
   * Filter fallback chain based on requirements and user preferences
   * @param {Array} fallbackChain - Original fallback chain
   * @param {Object} queryAnalysis - Query analysis results
   * @param {Object} userPreferences - User preferences
   * @returns {Array} Filtered fallback chain
   */
  filterFallbackChain(fallbackChain, queryAnalysis, userPreferences = {}) {
    let filteredChain = [...fallbackChain];
    
    // Filter by feature requirements
    filteredChain = filteredChain.filter(modelId => {
      const config = getModelConfig(modelId);
      if (!config || !isModelAvailable(modelId)) return false;
      
      // Check feature requirements
      if (queryAnalysis.requiredFeatures.vision && !config.capabilities.vision) return false;
      if (queryAnalysis.requiredFeatures.reasoning && !config.capabilities.reasoning) return false;
      if (queryAnalysis.requiredFeatures.functionCalling && !config.capabilities.functionCalling) return false;
      
      return true;
    });
    
    // Apply user preferences
    if (userPreferences.preferredModel && isModelAvailable(userPreferences.preferredModel)) {
      // Move preferred model to front if it's in the chain
      const index = filteredChain.indexOf(userPreferences.preferredModel);
      if (index > 0) {
        filteredChain.splice(index, 1);
        filteredChain.unshift(userPreferences.preferredModel);
      } else if (index === -1) {
        // Add preferred model to front if not in chain
        filteredChain.unshift(userPreferences.preferredModel);
      }
    }
    
    // Remove unhealthy services from chain if health checking is enabled
    if (this.options.enableHealthChecks) {
      filteredChain = filteredChain.filter(modelId => {
        const health = this.serviceHealth.get(modelId);
        return !health || health.isHealthy;
      });
    }
    
    // Ensure we have at least one model in the chain
    if (filteredChain.length === 0) {
      filteredChain = ['mock-model']; // Fallback to mock for testing
    }
    
    return filteredChain;
  }

  /**
   * Gets or creates a service instance for the given model
   * @param {string} modelId - Model identifier
   * @returns {Promise<Object>} Service instance
   */
  async getServiceInstance(modelId) {
    if (this.serviceCache.has(modelId)) {
      return this.serviceCache.get(modelId);
    }
    
    const config = getModelConfig(modelId);
    if (!config) {
      throw new Error(`Model configuration not found: ${modelId}`);
    }
    
    let service;
    switch (config.provider) {
      case LLM_PROVIDERS.OPENAI:
        service = new OpenAIService(modelId);
        break;
      case LLM_PROVIDERS.ANTHROPIC:
        service = new AnthropicService(modelId);
        break;
      case LLM_PROVIDERS.GOOGLE:
        service = new GeminiService(modelId);
        break;
      case LLM_PROVIDERS.GROK:
        service = new GrokService(modelId);
        break;
      case LLM_PROVIDERS.MOCK:
        service = new MockLLMService(modelId);
        break;
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
    
    service.initialize();
    this.serviceCache.set(modelId, service);
    
    return service;
  }

  /**
   * Assesses query complexity based on length and keyword patterns
   * @param {string} query - The user query
   * @param {Object} scores - Keyword pattern scores
   * @returns {string} Complexity level: 'simple', 'moderate', 'complex'
   */
  assessComplexity(query, scores) {
    const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
    const wordCount = query.split(/\s+/).length;
    
    if (totalScore >= 4 || wordCount > 50) return 'complex';
    if (totalScore >= 2 || wordCount > 20) return 'moderate';
    return 'simple';
  }

  /**
   * Updates routing statistics for analytics
   * @param {string} queryType - Type of query processed
   * @param {string} modelUsed - Model that was used
   */
  updateRoutingStats(queryType, modelUsed) {
    if (!this.routingStats.routingDecisions[queryType]) {
      this.routingStats.routingDecisions[queryType] = {};
    }
    
    this.routingStats.routingDecisions[queryType][modelUsed] = 
      (this.routingStats.routingDecisions[queryType][modelUsed] || 0) + 1;
  }

  /**
   * Gets routing statistics for analytics and optimization
   * @returns {Object} Routing statistics
   */
  getRoutingStats() {
    return {
      ...this.routingStats,
      cacheSize: this.serviceCache.size,
      uptime: Date.now() - this.startTime
    };
  }

  /**
   * Optimizes routing rules based on usage patterns
   * This method can be called periodically to improve routing decisions
   */
  optimizeRoutingRules() {
    this.log('Optimizing routing rules based on usage patterns...');
    
    // Analyze success rates by model and query type
    const stats = this.getRoutingStats();
    
    // Log optimization insights
    for (const [queryType, models] of Object.entries(stats.routingDecisions)) {
      const totalQueries = Object.values(models).reduce((sum, count) => sum + count, 0);
      const mostUsed = Object.keys(models).reduce((a, b) => 
        models[a] > models[b] ? a : b
      );
      
      this.log(`${queryType}: ${totalQueries} queries, most used: ${mostUsed} (${models[mostUsed]} times)`);
    }
    
    // Future: Implement ML-based rule optimization
  }

  /**
   * Logs routing decisions and events
   * @param {string} message - Log message
   * @param {string} level - Log level (info, warn, error)
   */
  log(message, level = 'info') {
    if (!this.options.enableLogging) return;
    
    const timestamp = new Date().toISOString();
    const prefix = `[LLMRouter ${level.toUpperCase()}] ${timestamp}`;
    
    switch (level) {
      case 'error':
        console.error(`${prefix}: ${message}`);
        break;
      case 'warn':
        console.warn(`${prefix}: ${message}`);
        break;
      default:
        console.log(`${prefix}: ${message}`);
    }
  }

  /**
   * Start periodic health checking for all services
   */
  startHealthChecking() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    this.log('Starting health checks');
    
    // Initial health check
    this.performHealthChecks();
    
    // Set up periodic health checks
    this.healthCheckTimer = setInterval(() => {
      this.performHealthChecks();
    }, this.options.healthCheckInterval);
  }

  /**
   * Stop health checking
   */
  stopHealthChecking() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
      this.log('Health checking stopped');
    }
  }

  /**
   * Perform health checks on all available models
   */
  async performHealthChecks() {
    const models = Object.keys(LLM_MODELS).filter(isModelAvailable);
    
    this.log(`Performing health checks on ${models.length} models`);
    
    const healthPromises = models.map(async (modelId) => {
      try {
        const startTime = Date.now();
        const service = await this.getServiceInstance(modelId);
        
        // Simple health check query
        await service.chat([
          { role: 'user', content: 'Health check' }
        ], { maxTokens: 5 });
        
        const responseTime = Date.now() - startTime;
        
        this.serviceHealth.set(modelId, {
          isHealthy: true,
          lastCheck: new Date().toISOString(),
          responseTime,
          consecutiveFailures: 0
        });
        
        this.log(`${modelId}: healthy (${responseTime}ms)`, 'info');
        
      } catch (error) {
        const health = this.serviceHealth.get(modelId) || { consecutiveFailures: 0 };
        const consecutiveFailures = health.consecutiveFailures + 1;
        
        this.serviceHealth.set(modelId, {
          isHealthy: consecutiveFailures < 3, // Mark unhealthy after 3 consecutive failures
          lastCheck: new Date().toISOString(),
          responseTime: null,
          consecutiveFailures,
          lastError: error.message
        });
        
        this.log(`${modelId}: unhealthy (${consecutiveFailures} failures) - ${error.message}`, 'warn');
      }
    });
    
    await Promise.allSettled(healthPromises);
  }

  /**
   * Get health status for all services
   */
  getHealthStatus() {
    const status = {};
    for (const [modelId, health] of this.serviceHealth.entries()) {
      status[modelId] = health;
    }
    return status;
  }

  /**
   * Get enhanced routing statistics including fallback manager stats
   */
  getEnhancedStats() {
    const routerStats = this.getRoutingStats();
    const fallbackStats = this.fallbackManager.getStats();
    const healthStatus = this.getHealthStatus();
    
    return {
      router: routerStats,
      fallback: fallbackStats,
      health: healthStatus,
      circuitBreakers: this.fallbackManager.getCircuitBreakerStatuses(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Reset circuit breakers for specific model or all models
   */
  resetCircuitBreakers(modelId = null) {
    if (modelId) {
      this.fallbackManager.resetCircuitBreaker(modelId);
      this.log(`Circuit breaker reset for ${modelId}`);
    } else {
      this.fallbackManager.resetAllCircuitBreakers();
      this.log('All circuit breakers reset');
    }
  }

  /**
   * Generate unique request ID for tracking
   * @returns {string} Unique request ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Estimate token count for a query
   * @param {string} query - Query text
   * @returns {number} Estimated token count
   */
  estimateTokens(query) {
    // Simple estimation: ~4 characters per token for most models
    return Math.ceil(query.length / 4);
  }

  /**
   * Get comprehensive monitoring report
   * @param {Object} options - Report options
   * @returns {Object} Monitoring report
   */
  getMonitoringReport(options = {}) {
    const report = {
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.routingStats.uptime,
      router: this.getEnhancedStats()
    };

    if (this.performanceMonitor) {
      report.performance = this.performanceMonitor.getPerformanceReport(options);
    }

    if (this.costOptimizer) {
      report.costs = this.costOptimizer.getCostBreakdown(options);
    }

    if (this.metricsCollector) {
      report.analytics = this.metricsCollector.calculateAnalytics(options);
    }

    return report;
  }

  /**
   * Get dashboard data structure for frontend integration
   * @returns {Object} Dashboard data
   */
  getDashboardData() {
    const now = Date.now();
    const last24h = 24 * 60 * 60 * 1000;
    const last7d = 7 * 24 * 60 * 60 * 1000;

    const dashboardData = {
      summary: {
        totalQueries: this.routingStats.totalQueries,
        uptime: now - this.routingStats.uptime,
        activeModels: this.serviceCache.size,
        healthyServices: this.getHealthyServiceCount(),
        lastUpdated: new Date().toISOString()
      },
      
      performance: {
        current: this.performanceMonitor?.getPerformanceReport({ timeRange: last24h }) || null,
        trend: this.performanceMonitor?.getPerformanceReport({ timeRange: last7d }) || null
      },
      
      costs: {
        budget: this.costOptimizer?.getBudgetStatus() || null,
        breakdown: this.costOptimizer?.getCostBreakdown({ timeRange: last24h }) || null,
        projections: this.costOptimizer?.getCostProjection(30) || null
      },
      
      models: this.getModelPerformanceComparison(),
      
      routing: {
        queryTypeDistribution: this.getQueryTypeDistribution(),
        fallbackUsage: this.routingStats.fallbackUsage,
        circuitBreakerStatus: this.fallbackManager.getCircuitBreakerStatuses()
      },
      
      alerts: this.generateAlerts(),
      
      charts: {
        responseTime: this.getResponseTimeChartData(),
        costTrend: this.getCostTrendChartData(),
        queryVolume: this.getQueryVolumeChartData(),
        modelUsage: this.getModelUsageChartData()
      }
    };

    return dashboardData;
  }

  /**
   * Get count of healthy services
   * @returns {number} Count of healthy services
   */
  getHealthyServiceCount() {
    let healthyCount = 0;
    for (const [_, health] of this.serviceHealth.entries()) {
      if (health.isHealthy) healthyCount++;
    }
    return healthyCount;
  }

  /**
   * Get model performance comparison
   * @returns {Array} Model performance data
   */
  getModelPerformanceComparison() {
    if (!this.performanceMonitor) return [];
    
    const comparison = this.performanceMonitor.compareModels();
    return comparison ? comparison.models : [];
  }

  /**
   * Get query type distribution
   * @returns {Object} Query type distribution
   */
  getQueryTypeDistribution() {
    const distribution = {};
    for (const [queryType, models] of Object.entries(this.routingStats.routingDecisions)) {
      const totalQueries = Object.values(models).reduce((sum, count) => sum + count, 0);
      distribution[queryType] = totalQueries;
    }
    return distribution;
  }

  /**
   * Generate alerts based on current system status
   * @returns {Array} List of alerts
   */
  generateAlerts() {
    const alerts = [];
    
    // Budget alerts
    if (this.costOptimizer) {
      const budgetStatus = this.costOptimizer.getBudgetStatus();
      
      if (budgetStatus.daily.usage >= 0.95) {
        alerts.push({
          type: 'error',
          category: 'budget',
          message: 'Daily budget 95% exhausted',
          timestamp: new Date().toISOString()
        });
      } else if (budgetStatus.daily.usage >= 0.8) {
        alerts.push({
          type: 'warning',
          category: 'budget',
          message: `Daily budget ${(budgetStatus.daily.usage * 100).toFixed(1)}% used`,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Health alerts
    const unhealthyServices = [];
    for (const [modelId, health] of this.serviceHealth.entries()) {
      if (!health.isHealthy) {
        unhealthyServices.push(modelId);
      }
    }
    
    if (unhealthyServices.length > 0) {
      alerts.push({
        type: 'warning',
        category: 'health',
        message: `${unhealthyServices.length} services unhealthy: ${unhealthyServices.join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }
    
    // Performance alerts
    if (this.performanceMonitor) {
      const report = this.performanceMonitor.getPerformanceReport({ timeRange: 60 * 60 * 1000 }); // Last hour
      
      if (report.summary.avgResponseTime > 5000) { // 5 seconds
        alerts.push({
          type: 'warning',
          category: 'performance',
          message: `High average response time: ${report.summary.avgResponseTime.toFixed(0)}ms`,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return alerts;
  }

  /**
   * Get response time chart data
   * @returns {Array} Chart data points
   */
  getResponseTimeChartData() {
    if (!this.performanceMonitor) return [];
    
    const report = this.performanceMonitor.getPerformanceReport({ 
      timeRange: 24 * 60 * 60 * 1000,
      includeRaw: false 
    });
    
    return report.hourlyTrends.map(trend => ({
      timestamp: trend.timestamp,
      avgResponseTime: trend.avgResponseTime,
      requests: trend.requests
    }));
  }

  /**
   * Get cost trend chart data
   * @returns {Array} Chart data points
   */
  getCostTrendChartData() {
    if (!this.costOptimizer) return [];
    
    const breakdown = this.costOptimizer.getCostBreakdown();
    return breakdown.dailyTrend.map(day => ({
      date: day.date,
      cost: day.cost
    }));
  }

  /**
   * Get query volume chart data
   * @returns {Array} Chart data points
   */
  getQueryVolumeChartData() {
    if (!this.performanceMonitor) return [];
    
    const report = this.performanceMonitor.getPerformanceReport({ 
      timeRange: 7 * 24 * 60 * 60 * 1000 
    });
    
    return report.dailyTrends.map(trend => ({
      date: trend.date,
      queries: trend.requests,
      successRate: trend.successRate
    }));
  }

  /**
   * Get model usage chart data
   * @returns {Array} Chart data points
   */
  getModelUsageChartData() {
    const usage = [];
    for (const [queryType, models] of Object.entries(this.routingStats.routingDecisions)) {
      for (const [modelId, count] of Object.entries(models)) {
        const existing = usage.find(u => u.modelId === modelId);
        if (existing) {
          existing.queries += count;
        } else {
          usage.push({ modelId, queries: count });
        }
      }
    }
    
    return usage.sort((a, b) => b.queries - a.queries);
  }

  /**
   * Gracefully shutdown the router
   */
  async shutdown() {
    this.stopHealthChecking();
    
    // Shutdown monitoring components
    if (this.metricsCollector) {
      await this.metricsCollector.shutdown();
    }
    
    this.clearCache();
    this.log('LLM Router shutdown completed');
  }

  /**
   * Clears service cache (useful for testing or memory management)
   */
  clearCache() {
    this.serviceCache.clear();
    this.log('Service cache cleared');
  }
}

export default LLMRouter;