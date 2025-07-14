/**
 * TalaIntelligence - Core Intelligence Orchestrator
 * 
 * Combines context management, memory systems, and agent orchestration
 * to provide intelligent, context-aware responses while maintaining
 * conversation continuity across different agents.
 */

import ContextManager from '../context/ContextManager.js';
import MemoryManager from '../memory/MemoryManager.js';
import ProfileManager from '../profiles/ProfileManager.js';
import AgentOrchestrator from '../agents/AgentOrchestrator.js';
import ThreadingService from '../conversations/ThreadingService.js';
import { LearningEngine } from './LearningEngine.js';
import { CompressionService } from '../compression/CompressionService.js';

// Mock Context Manager for testing
class MockContextManager {
  constructor() {
    this.contexts = new Map();
    this.initialized = false;
  }
  
  async initialize() {
    this.initialized = true;
    console.log('📝 Mock Context Manager initialized');
  }
  
  async buildContext(params) {
    return params.conversationHistory || [];
  }
  
  async getContext(contextId) {
    return this.contexts.get(contextId) || { topics: [], entities: [] };
  }
  
  async resetContext(contextId) {
    this.contexts.delete(contextId);
  }
  
  getStats() {
    return {
      totalContexts: this.contexts.size,
      averageSize: 1000
    };
  }
  
  async shutdown() {
    console.log('🛑 Mock Context Manager shut down');
  }
}

export class TalaIntelligence {
  constructor(options = {}) {
    this.options = {
      maxContextSize: options.maxContextSize || 8000,
      compressionThreshold: options.compressionThreshold || 0.8,
      memoryRetrievalLimit: options.memoryRetrievalLimit || 10,
      learningEnabled: options.learningEnabled !== false,
      mockMode: options.mockMode || false,
      ...options
    };
    
    // Initialize core services
    if (this.options.mockMode) {
      this.contextManager = new MockContextManager();
    } else {
      this.contextManager = new ContextManager();
    }
    this.memoryManager = new MemoryManager();
    this.profileManager = new ProfileManager();
    this.agentOrchestrator = new AgentOrchestrator();
    this.threadingService = new ThreadingService();
    this.learningEngine = new LearningEngine();
    this.compressionService = new CompressionService();
    
    // Intelligence state
    this.activeConversations = new Map();
    this.routingHistory = new Map();
    this.performanceMetrics = {
      totalRequests: 0,
      successfulResponses: 0,
      averageResponseTime: 0,
      agentUtilization: new Map(),
      contextCompressionRatio: 0,
      memorySaveRate: 0
    };
    
    this.initialized = false;
  }
  
  /**
   * Initialize the intelligence system
   */
  async initialize() {
    try {
      console.log('🧠 Initializing Tala Intelligence...');
      
      // Initialize all subsystems
      await Promise.all([
        this.contextManager.initialize(),
        this.memoryManager.initialize(),
        this.profileManager.initialize(),
        this.agentOrchestrator.initialize(),
        this.threadingService.initialize(),
        this.learningEngine.initialize()
      ]);
      
      // Load learning data
      if (this.options.learningEnabled) {
        await this.learningEngine.loadHistoricalData();
      }
      
      this.initialized = true;
      console.log('✅ Tala Intelligence initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Tala Intelligence:', error);
      throw error;
    }
  }
  
  /**
   * Process an intelligent request
   */
  async processRequest(request) {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    try {
      // Track metrics
      this.performanceMetrics.totalRequests++;
      
      // 1. Load user profile and preferences
      const userProfile = await this.profileManager.getProfile(request.userId);
      console.log(`👤 User profile loaded: ${userProfile.preferences.responseStyle}`);
      
      // 2. Get or create conversation thread
      const thread = await this.threadingService.getOrCreateThread({
        userId: request.userId,
        conversationId: request.conversationId,
        metadata: { source: request.source || 'chat' }
      });
      
      // 3. Build context with memories
      const context = await this.buildIntelligentContext(request, userProfile, thread);
      
      // 4. Determine routing strategy
      const routingDecision = await this.makeRoutingDecision(request, context, userProfile);
      console.log(`🎯 Routing strategy: ${routingDecision.strategy}`);
      
      // 5. Execute with selected agent(s)
      const agentResponse = await this.executeWithAgents(
        routingDecision,
        request,
        context
      );
      
      // 6. Process and enhance response
      const enhancedResponse = await this.enhanceResponse(
        agentResponse,
        context,
        userProfile
      );
      
      // 7. Update systems based on interaction
      await this.updateSystemsAfterInteraction({
        request,
        response: enhancedResponse,
        context,
        userProfile,
        thread,
        routingDecision,
        executionTime: Date.now() - startTime
      });
      
      // 8. Track success
      this.performanceMetrics.successfulResponses++;
      this.updateAverageResponseTime(Date.now() - startTime);
      
      return {
        success: true,
        response: enhancedResponse,
        metadata: {
          requestId,
          executionTime: Date.now() - startTime,
          agentsUsed: routingDecision.selectedAgents.map(a => a.name),
          contextSize: context.contextWindow.length,
          memoriesUsed: context.relevantMemories.length,
          threadId: thread.id
        }
      };
      
    } catch (error) {
      console.error(`❌ Intelligence processing failed for ${requestId}:`, error);
      
      // Fallback response
      return {
        success: false,
        response: this.generateFallbackResponse(error, request),
        error: error.message,
        metadata: {
          requestId,
          executionTime: Date.now() - startTime,
          fallback: true
        }
      };
    }
  }
  
  /**
   * Build intelligent context
   */
  async buildIntelligentContext(request, userProfile, thread) {
    // Get recent conversation history
    const recentMessages = await this.threadingService.getThreadMessages(
      thread.id,
      { limit: 20 }
    );
    
    // Retrieve relevant memories
    const relevantMemories = await this.memoryManager.retrieveMemories({
      userId: request.userId,
      query: request.content,
      limit: this.options.memoryRetrievalLimit,
      filters: {
        importance: { $gte: userProfile.preferences.memoryThreshold || 0.5 }
      }
    });
    
    console.log(`💭 Retrieved ${relevantMemories.length} relevant memories`);
    
    // Build context window
    let contextWindow = await this.contextManager.buildContext({
      currentMessage: request.content,
      conversationHistory: recentMessages,
      relevantMemories: relevantMemories.map(m => m.content),
      userProfile: {
        preferences: userProfile.preferences,
        expertise: userProfile.expertise
      },
      metadata: {
        timestamp: new Date(),
        location: request.location,
        device: request.device
      }
    });
    
    // Compress if needed
    const contextSize = JSON.stringify(contextWindow).length;
    if (contextSize > this.options.maxContextSize * this.options.compressionThreshold) {
      console.log(`🗜️ Compressing context (${contextSize} bytes)`);
      
      const compressed = await this.compressionService.compressConversation({
        messages: contextWindow,
        strategy: 'intelligent',
        targetTokens: Math.floor(this.options.maxContextSize * 0.7)
      });
      
      contextWindow = compressed.messages;
      this.performanceMetrics.contextCompressionRatio = compressed.compressionRatio;
    }
    
    return {
      contextWindow,
      relevantMemories,
      thread,
      recentMessages,
      userProfile
    };
  }
  
  /**
   * Make intelligent routing decision
   */
  async makeRoutingDecision(request, context, userProfile) {
    // Get task analysis
    const taskAnalysis = await this.analyzeTask(request, context);
    console.log(`📊 Task analysis: type=${taskAnalysis.type}, complexity=${taskAnalysis.complexity}, requiresMultipleDomains=${taskAnalysis.requiresMultipleDomains}`);
    
    // Get learning engine recommendations
    const learningRecommendations = await this.learningEngine.recommendAgents({
      taskType: taskAnalysis.type,
      complexity: taskAnalysis.complexity,
      userProfile,
      historicalSuccess: this.routingHistory.get(userProfile.userId)
    });
    
    // Determine routing strategy
    let strategy = 'single';
    let selectedAgents = [];
    
    if (taskAnalysis.complexity > 0.7 || taskAnalysis.requiresMultipleDomains) {
      strategy = 'multi-agent';
      
      // Use agent orchestrator's routing
      const orchestratorRouting = await this.agentOrchestrator.routeToAgent({
        type: taskAnalysis.type,
        content: request.content,
        data: taskAnalysis.extractedData,
        requirements: taskAnalysis.requirements
      });
      
      selectedAgents = orchestratorRouting.selectedAgents;
      
      // Apply learning recommendations
      if (learningRecommendations.length > 0) {
        // Merge or adjust based on learning
        selectedAgents = this.mergeLearningRecommendations(
          selectedAgents,
          learningRecommendations
        );
      }
    } else {
      // Simple task - single agent
      console.log(`🎯 Single agent routing for task type: ${taskAnalysis.type}`);
      console.log(`📚 Learning recommendations: ${learningRecommendations.length}`);
      
      let bestAgent;
      if (learningRecommendations.length > 0) {
        const recommendation = learningRecommendations[0];
        console.log(`🧠 Learning recommendation: ${recommendation.agentId} (score: ${recommendation.score})`);
        
        // Convert agentId to actual agent object
        bestAgent = await this.agentOrchestrator.registry.getAgent(recommendation.agentId);
        console.log(`🤖 Resolved to agent: ${bestAgent ? bestAgent.name || bestAgent.id : 'null'}`);
      } else {
        bestAgent = await this.selectBestAgent(taskAnalysis, userProfile);
        console.log(`🔍 Selected via capability search: ${bestAgent ? bestAgent.name || bestAgent.id : 'null'}`);
      }
      
      selectedAgents = [bestAgent];
    }
    
    return {
      strategy,
      selectedAgents,
      taskAnalysis,
      confidence: this.calculateRoutingConfidence(selectedAgents, taskAnalysis),
      reasoning: this.explainRouting(strategy, selectedAgents, taskAnalysis)
    };
  }
  
  /**
   * Execute with selected agents
   */
  async executeWithAgents(routingDecision, request, context) {
    const { strategy, selectedAgents } = routingDecision;
    
    if (strategy === 'single') {
      // Single agent execution
      const agent = selectedAgents[0];
      console.log(`🤖 Executing with single agent: ${agent.name}`);
      
      const result = await this.agentOrchestrator.executeAgentTask(
        agent.id,
        {
          type: routingDecision.taskAnalysis.type,
          content: request.content,
          context: context.contextWindow,
          data: {
            ...request.data,
            userPreferences: context.userProfile.preferences,
            relevantMemories: context.relevantMemories
          }
        }
      );
      
      return result;
      
    } else {
      // Multi-agent execution
      console.log(`🤖 Executing with ${selectedAgents.length} agents`);
      
      const results = await this.agentOrchestrator.executeComplexTask({
        type: routingDecision.taskAnalysis.type,
        content: request.content,
        data: request.data,
        context: context.contextWindow
      }, {
        strategy: this.determineCoordinationStrategy(routingDecision),
        timeout: 30000,
        aggregationMethod: 'intelligent'
      });
      
      return results;
    }
  }
  
  /**
   * Enhance response with additional context
   */
  async enhanceResponse(agentResponse, context, userProfile) {
    let enhancedContent = agentResponse.result;
    
    // Apply user preferences
    if (userProfile.preferences.responseStyle) {
      enhancedContent = this.applyResponseStyle(
        enhancedContent,
        userProfile.preferences.responseStyle
      );
    }
    
    // Add contextual information if relevant
    if (context.relevantMemories.length > 0 && userProfile.preferences.includeContext) {
      enhancedContent = this.addContextualReferences(
        enhancedContent,
        context.relevantMemories
      );
    }
    
    // Format based on output preferences
    if (userProfile.preferences.outputFormat) {
      enhancedContent = this.formatResponse(
        enhancedContent,
        userProfile.preferences.outputFormat
      );
    }
    
    return {
      content: enhancedContent,
      metadata: agentResponse.metadata || {},
      suggestions: this.generateFollowUpSuggestions(
        agentResponse,
        context,
        userProfile
      )
    };
  }
  
  /**
   * Update systems after interaction
   */
  async updateSystemsAfterInteraction(interactionData) {
    const {
      request,
      response,
      context,
      userProfile,
      thread,
      routingDecision,
      executionTime
    } = interactionData;
    
    // 1. Save to conversation thread
    await this.threadingService.addMessage(thread.id, {
      role: 'user',
      content: request.content,
      metadata: {
        timestamp: request.timestamp,
        analyzed: routingDecision.taskAnalysis
      }
    });
    
    await this.threadingService.addMessage(thread.id, {
      role: 'assistant',
      content: response.content,
      metadata: {
        agents: routingDecision.selectedAgents.map(a => a.id),
        executionTime,
        compressed: context.contextWindow.length < context.recentMessages.length
      }
    });
    
    // 2. Create memories if important
    const importance = await this.assessInteractionImportance(
      request,
      response,
      routingDecision
    );
    
    if (importance > (userProfile.preferences.memoryThreshold || 0.5)) {
      await this.memoryManager.createMemory({
        userId: request.userId,
        content: {
          interaction: {
            request: request.content,
            response: response.content,
            context: routingDecision.taskAnalysis
          }
        },
        type: 'interaction',
        importance,
        tags: this.extractMemoryTags(request, response, routingDecision),
        metadata: {
          agents: routingDecision.selectedAgents.map(a => a.id),
          threadId: thread.id,
          timestamp: new Date()
        }
      });
      
      this.performanceMetrics.memorySaveRate++;
    }
    
    // 3. Update learning engine
    if (this.options.learningEnabled) {
      await this.learningEngine.recordInteraction({
        userId: request.userId,
        taskType: routingDecision.taskAnalysis.type,
        complexity: routingDecision.taskAnalysis.complexity,
        selectedAgents: routingDecision.selectedAgents,
        executionTime,
        success: response.success !== false,
        userSatisfaction: null // Will be updated by feedback
      });
    }
    
    // 4. Update agent utilization metrics
    routingDecision.selectedAgents.forEach(agent => {
      const currentCount = this.performanceMetrics.agentUtilization.get(agent.id) || 0;
      this.performanceMetrics.agentUtilization.set(agent.id, currentCount + 1);
    });
    
    // 5. Update routing history
    this.updateRoutingHistory(request.userId, routingDecision, response.success !== false);
  }
  
  /**
   * Analyze task to determine type and complexity
   */
  async analyzeTask(request, context) {
    const content = request.content.toLowerCase();
    
    // Determine task type
    let type = 'general';
    let complexity = 0.3;
    let requiresMultipleDomains = false;
    const extractedData = {};
    const requirements = [];
    
    // Travel/booking related
    if (content.includes('flight') || content.includes('hotel') || 
        content.includes('travel') || content.includes('itinerary') ||
        content.includes('plan') || content.includes('trip')) {
      
      // Determine if it's itinerary planning vs simple booking
      if (content.includes('itinerary') || content.includes('plan') ||
          content.includes('schedule') || content.includes('activities') ||
          (content.includes('trip') && (content.includes('week') || content.includes('day'))) ||
          content.match(/\d+\s*(city|cities|destination)/)) {
        type = 'build-itinerary';
        complexity += 0.4;
      } else {
        type = 'booking-search';
        complexity += 0.2;
      }
      
      // Multiple cities or complex requirements
      if (content.includes('multi-city') || content.includes('multiple') ||
          content.match(/\w+,\s*\w+,?\s*(and|&)\s*\w+/) || // "Paris, Rome, and Barcelona"
          content.includes('family') || content.includes('group')) {
        complexity += 0.3;
        requiresMultipleDomains = true;
      }
    }
    
    // Email/document parsing
    if (content.includes('email') || content.includes('parse') || 
        content.includes('extract')) {
      type = 'parse-email';
      complexity += 0.1;
    }
    
    // Document analysis
    if (content.includes('document') || content.includes('passport') || 
        content.includes('analyze') || content.includes('visa') || 
        content.includes('need') && (content.includes('document') || content.includes('requirement'))) {
      type = 'analyze-document';
      complexity += 0.2;
    }
    
    // Task extraction
    if (content.includes('task') || content.includes('todo') || 
        content.includes('action items')) {
      type = 'extract-tasks';
      complexity += 0.1;
    }
    
    // Complex queries requiring multiple capabilities
    if ((content.match(/\band\b/g) || []).length > 2 ||
        content.includes('then') || content.includes('after that')) {
      requiresMultipleDomains = true;
      complexity += 0.2;
    }
    
    // Extract any structured data from request
    if (request.data) {
      Object.assign(extractedData, request.data);
    }
    
    // Extract requirements from context
    if (context.relevantMemories.length > 0) {
      requirements.push('context-aware');
      complexity += 0.1;
    }
    
    if (context.userProfile.preferences.detailed) {
      requirements.push('detailed-response');
    }
    
    return {
      type,
      complexity: Math.min(complexity, 1.0),
      requiresMultipleDomains,
      extractedData,
      requirements,
      confidence: this.calculateTaskAnalysisConfidence(content, type)
    };
  }
  
  /**
   * Select best single agent for task
   */
  async selectBestAgent(taskAnalysis, userProfile) {
    const capability = this.mapTaskTypeToCapability(taskAnalysis.type);
    console.log(`🔍 Looking for agents with capability: ${capability} for task type: ${taskAnalysis.type}`);
    
    const candidates = await this.agentOrchestrator.registry.findAgentsByCapability(capability);
    console.log(`🎯 Found ${candidates.length} candidate agents`);
    
    if (candidates.length === 0) {
      console.log(`⚠️ No agents found for capability ${capability}, falling back to any available agent`);
      // Fallback to general agent
      const allAgents = await this.agentOrchestrator.registry.getAllAgents();
      console.log(`📋 Available agents: ${allAgents.length}`);
      return allAgents[0] || null;
    }
    
    // Score candidates based on various factors
    const scores = candidates.map(agent => ({
      agent,
      score: this.scoreAgentForTask(agent, taskAnalysis, userProfile)
    }));
    
    // Sort by score
    scores.sort((a, b) => b.score - a.score);
    
    return scores[0].agent;
  }
  
  /**
   * Score agent for specific task
   */
  scoreAgentForTask(agent, taskAnalysis, userProfile) {
    let score = 0;
    
    // Capability match
    const capabilities = agent.getCapabilities();
    const requiredCapability = this.mapTaskTypeToCapability(taskAnalysis.type);
    if (capabilities.includes(requiredCapability)) {
      score += 0.5;
    }
    
    // Specialization match
    if (agent.getSpecialization() === taskAnalysis.type) {
      score += 0.3;
    }
    
    // User preference alignment
    if (userProfile.preferredAgents?.includes(agent.id)) {
      score += 0.2;
    }
    
    // Historical performance (from learning engine)
    const historicalScore = this.learningEngine.getAgentPerformanceScore(
      agent.id,
      taskAnalysis.type,
      userProfile.userId
    );
    score += historicalScore * 0.3;
    
    return score;
  }
  
  /**
   * Merge learning recommendations with selected agents
   */
  mergeLearningRecommendations(selectedAgents, recommendations) {
    const merged = [...selectedAgents];
    
    // Add highly recommended agents not already selected
    recommendations.forEach(rec => {
      if (rec.confidence > 0.8 && !merged.find(a => a.id === rec.agentId)) {
        const agent = this.agentOrchestrator.registry.getAgent(rec.agentId);
        if (agent) {
          merged.push(agent);
        }
      }
    });
    
    // Remove poorly performing agents
    return merged.filter(agent => {
      const performance = this.learningEngine.getAgentPerformanceScore(
        agent.id,
        'overall'
      );
      return performance > 0.3; // Remove if performance is too low
    });
  }
  
  /**
   * Calculate routing confidence
   */
  calculateRoutingConfidence(selectedAgents, taskAnalysis) {
    if (selectedAgents.length === 0) return 0;
    
    let confidence = 0.5; // Base confidence
    
    // Task type match
    selectedAgents.forEach(agent => {
      if (agent && typeof agent.getSupportedTaskTypes === 'function') {
        try {
          if (agent.getSupportedTaskTypes().includes(taskAnalysis.type)) {
            confidence += 0.2;
          }
        } catch (error) {
          console.warn(`Failed to get supported task types for agent:`, error);
        }
      }
    });
    
    // Complexity alignment
    if (taskAnalysis.complexity > 0.7 && selectedAgents.length > 1) {
      confidence += 0.1; // Multiple agents for complex task
    } else if (taskAnalysis.complexity < 0.5 && selectedAgents.length === 1) {
      confidence += 0.1; // Single agent for simple task
    }
    
    return Math.min(confidence, 1.0);
  }
  
  /**
   * Determine coordination strategy for multi-agent execution
   */
  determineCoordinationStrategy(routingDecision) {
    const { taskAnalysis, selectedAgents } = routingDecision;
    
    // Pipeline for sequential tasks
    if (taskAnalysis.requirements.includes('sequential')) {
      return 'pipeline';
    }
    
    // Consensus for decision-making tasks
    if (taskAnalysis.type.includes('decision') || 
        taskAnalysis.type.includes('recommendation')) {
      return 'consensus';
    }
    
    // Hierarchical for complex multi-step tasks
    if (taskAnalysis.complexity > 0.8) {
      return 'hierarchical';
    }
    
    // Default to adaptive
    return 'adaptive';
  }
  
  /**
   * Apply response style preferences
   */
  applyResponseStyle(content, style) {
    switch (style) {
      case 'concise':
        return this.makeConcise(content);
      case 'detailed':
        return this.makeDetailed(content);
      case 'technical':
        return this.makeTechnical(content);
      case 'friendly':
        return this.makeFriendly(content);
      default:
        return content;
    }
  }
  
  /**
   * Make response concise
   */
  makeConcise(content) {
    if (typeof content === 'string') {
      // Remove redundant phrases
      return content
        .replace(/In other words,|To put it simply,|Basically,/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
    }
    return content;
  }
  
  /**
   * Make response detailed
   */
  makeDetailed(content) {
    // This would add more context and explanations
    // For now, return as-is
    return content;
  }
  
  /**
   * Make response technical
   */
  makeTechnical(content) {
    // This would use more technical terminology
    // For now, return as-is
    return content;
  }
  
  /**
   * Make response friendly
   */
  makeFriendly(content) {
    if (typeof content === 'string') {
      // Add friendly touches
      if (!content.startsWith('I')) {
        content = `I\'d be happy to help with that! ${content}`;
      }
      if (!content.includes('?') && Math.random() > 0.5) {
        content += ' Is there anything else you\'d like to know?';
      }
    }
    return content;
  }
  
  /**
   * Add contextual references to response
   */
  addContextualReferences(content, memories) {
    if (memories.length === 0) return content;
    
    const references = memories
      .slice(0, 3)
      .map((m, i) => `[${i + 1}] ${m.summary || m.content.substring(0, 50)}...`)
      .join('\n');
    
    if (typeof content === 'string') {
      content += `\n\n📌 Related context:\n${references}`;
    } else if (typeof content === 'object') {
      content.contextualReferences = references;
    }
    
    return content;
  }
  
  /**
   * Format response based on preferences
   */
  formatResponse(content, format) {
    switch (format) {
      case 'json':
        return typeof content === 'string' ? { response: content } : content;
      case 'markdown':
        return this.formatAsMarkdown(content);
      case 'plain':
        return typeof content === 'object' ? JSON.stringify(content, null, 2) : content;
      default:
        return content;
    }
  }
  
  /**
   * Format content as markdown
   */
  formatAsMarkdown(content) {
    if (typeof content === 'string') {
      return content;
    }
    
    // Convert object to markdown
    let markdown = '';
    for (const [key, value] of Object.entries(content)) {
      markdown += `## ${key}\n\n`;
      if (typeof value === 'object') {
        markdown += '```json\n' + JSON.stringify(value, null, 2) + '\n```\n\n';
      } else {
        markdown += `${value}\n\n`;
      }
    }
    
    return markdown;
  }
  
  /**
   * Generate follow-up suggestions
   */
  generateFollowUpSuggestions(response, context, userProfile) {
    const suggestions = [];
    
    // Based on response type
    if (response.result?.itinerary) {
      suggestions.push('Would you like me to help you book any of these?');
      suggestions.push('Should I create a detailed day-by-day schedule?');
    }
    
    if (response.result?.bookingDetails) {
      suggestions.push('Would you like me to add this to your calendar?');
      suggestions.push('Should I set up reminders for this trip?');
    }
    
    if (response.result?.tasks) {
      suggestions.push('Would you like me to prioritize these tasks?');
      suggestions.push('Should I create deadlines for any of these?');
    }
    
    // Based on user history
    if (context.relevantMemories.length > 0) {
      suggestions.push('Would you like to see related past interactions?');
    }
    
    return suggestions.slice(0, 3); // Return top 3 suggestions
  }
  
  /**
   * Assess interaction importance for memory storage
   */
  async assessInteractionImportance(request, response, routingDecision) {
    let importance = 0.5; // Base importance
    
    // Complex tasks are more important
    importance += routingDecision.taskAnalysis.complexity * 0.2;
    
    // Multi-agent tasks are more important
    if (routingDecision.selectedAgents.length > 1) {
      importance += 0.1;
    }
    
    // Successful outcomes are more important
    if (response.success !== false) {
      importance += 0.1;
    }
    
    // User-initiated requests are more important
    if (request.source === 'user') {
      importance += 0.1;
    }
    
    // Booking confirmations and itineraries are important
    if (routingDecision.taskAnalysis.type.includes('booking') ||
        routingDecision.taskAnalysis.type.includes('itinerary')) {
      importance += 0.2;
    }
    
    return Math.min(importance, 1.0);
  }
  
  /**
   * Extract tags for memory storage
   */
  extractMemoryTags(request, response, routingDecision) {
    const tags = [];
    
    // Task type
    tags.push(routingDecision.taskAnalysis.type);
    
    // Agent names
    routingDecision.selectedAgents.forEach(agent => {
      tags.push(`agent:${agent.name}`);
    });
    
    // Extract entities from content
    const entities = this.extractEntities(request.content + ' ' + 
                                         JSON.stringify(response.content));
    tags.push(...entities);
    
    // Add complexity level
    if (routingDecision.taskAnalysis.complexity > 0.7) {
      tags.push('complex');
    }
    
    return [...new Set(tags)]; // Remove duplicates
  }
  
  /**
   * Extract entities from text
   */
  extractEntities(text) {
    const entities = [];
    const lowerText = text.toLowerCase();
    
    // Locations
    const locations = ['paris', 'rome', 'barcelona', 'london', 'new york', 'tokyo'];
    locations.forEach(loc => {
      if (lowerText.includes(loc)) {
        entities.push(`location:${loc}`);
      }
    });
    
    // Dates
    const datePattern = /\b\d{4}-\d{2}-\d{2}\b/g;
    const dates = text.match(datePattern);
    if (dates) {
      dates.forEach(date => entities.push(`date:${date}`));
    }
    
    // Airlines/Hotels
    const airlines = ['american airlines', 'united', 'delta', 'lufthansa'];
    airlines.forEach(airline => {
      if (lowerText.includes(airline)) {
        entities.push(`airline:${airline}`);
      }
    });
    
    return entities;
  }
  
  /**
   * Update routing history
   */
  updateRoutingHistory(userId, routingDecision, success) {
    if (!this.routingHistory.has(userId)) {
      this.routingHistory.set(userId, []);
    }
    
    const history = this.routingHistory.get(userId);
    history.push({
      timestamp: new Date(),
      taskType: routingDecision.taskAnalysis.type,
      agents: routingDecision.selectedAgents.map(a => a.id),
      success,
      complexity: routingDecision.taskAnalysis.complexity
    });
    
    // Keep only last 100 entries
    if (history.length > 100) {
      history.shift();
    }
  }
  
  /**
   * Generate fallback response
   */
  generateFallbackResponse(error, request) {
    return {
      content: `I apologize, but I encountered an issue processing your request. ${
        error.message.includes('agent') 
          ? 'The specialized assistant is temporarily unavailable.' 
          : 'Please try rephrasing your request.'
      }`,
      error: true,
      suggestions: [
        'Try asking in a different way',
        'Break down your request into smaller parts',
        'Check if all required information is provided'
      ]
    };
  }
  
  /**
   * Map task type to capability
   */
  mapTaskTypeToCapability(taskType) {
    const mapping = {
      'parse-email': 'email-parsing',
      'build-itinerary': 'itinerary-creation',
      'analyze-document': 'travel-document-parsing',
      'extract-tasks': 'task-extraction',
      'booking-search': 'booking-extraction'
    };
    
    return mapping[taskType] || 'travel-document-parsing';
  }
  
  /**
   * Calculate task analysis confidence
   */
  calculateTaskAnalysisConfidence(content, type) {
    // Simple keyword-based confidence
    const keywords = {
      'parse-email': ['email', 'parse', 'extract', 'booking confirmation'],
      'build-itinerary': ['itinerary', 'trip', 'travel plan', 'schedule'],
      'analyze-document': ['document', 'passport', 'analyze', 'scan'],
      'extract-tasks': ['tasks', 'todo', 'action items', 'to-do']
    };
    
    const typeKeywords = keywords[type] || [];
    const matches = typeKeywords.filter(keyword => 
      content.toLowerCase().includes(keyword)
    );
    
    return matches.length / Math.max(typeKeywords.length, 1);
  }
  
  /**
   * Update average response time
   */
  updateAverageResponseTime(responseTime) {
    const current = this.performanceMetrics.averageResponseTime;
    const count = this.performanceMetrics.totalRequests;
    
    this.performanceMetrics.averageResponseTime = 
      (current * (count - 1) + responseTime) / count;
  }
  
  /**
   * Explain routing decision
   */
  explainRouting(strategy, agents, taskAnalysis) {
    const agentNames = agents.map(a => a.name).join(', ');
    
    if (strategy === 'single') {
      return `Using ${agentNames} for ${taskAnalysis.type} task`;
    } else {
      return `Using multiple agents (${agentNames}) due to ${
        taskAnalysis.requiresMultipleDomains ? 'multi-domain requirements' : 'high complexity'
      }`;
    }
  }
  
  /**
   * Generate unique request ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Get system metrics
   */
  getMetrics() {
    return {
      ...this.performanceMetrics,
      contextManager: this.contextManager.getStats(),
      memoryManager: this.memoryManager.getStats(),
      agentOrchestrator: this.agentOrchestrator.getStats(),
      learningEngine: this.learningEngine.getMetrics()
    };
  }
  
  /**
   * Process user feedback
   */
  async processFeedback(feedbackData) {
    const { requestId, userId, rating, comment, timestamp } = feedbackData;
    
    // Update learning engine
    if (this.options.learningEnabled) {
      await this.learningEngine.updateWithFeedback({
        requestId,
        userId,
        rating,
        comment,
        timestamp
      });
    }
    
    // Update memory importance if applicable
    if (rating <= 2) {
      // Low rating - reduce importance of related memories
      await this.memoryManager.adjustImportance({
        userId,
        criteria: { metadata: { requestId } },
        adjustment: -0.2
      });
    } else if (rating >= 4) {
      // High rating - increase importance
      await this.memoryManager.adjustImportance({
        userId,
        criteria: { metadata: { requestId } },
        adjustment: 0.2
      });
    }
    
    // Update user preferences based on feedback patterns
    await this.profileManager.updateFromFeedback(userId, {
      rating,
      comment,
      context: { requestId, timestamp }
    });
    
    return {
      success: true,
      message: 'Feedback processed successfully'
    };
  }
  
  /**
   * Shutdown intelligence system
   */
  async shutdown() {
    console.log('🛑 Shutting down Tala Intelligence...');
    
    await Promise.all([
      this.contextManager.shutdown(),
      this.memoryManager.close(),
      this.profileManager.shutdown(),
      this.agentOrchestrator.shutdown(),
      this.threadingService.shutdown(),
      this.learningEngine.shutdown()
    ]);
    
    this.initialized = false;
    console.log('✅ Tala Intelligence shut down successfully');
  }
}

export default TalaIntelligence;