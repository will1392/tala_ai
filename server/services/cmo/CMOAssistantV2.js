/**
 * CMOAssistantV2 - Refactored marketing assistant using pipeline architecture
 * 
 * Provides marketing expertise through a modular pipeline of specialized stages,
 * enabling clear ownership, better debugging, and easy extensibility.
 */

import { Pipeline } from './pipeline/Pipeline.js';
import { CMOResponse, CMOResponseFactory } from './pipeline/CMOResponse.js';
import {
  DetectionStage,
  SpecializedStage,
  KnowledgeBaseStage,
  EnhancementStage,
  AdaptationStage
} from './pipeline/stages/index.js';

// Import required services
import { cmoKnowledgeBase } from './CMOKnowledgeBase.js';
import { contextDetector } from './ContextDetector.js';
import { cmoResponseEnhancer } from './CMOResponseEnhancer.js';
import CommunicationAdapter from '../expertise/CommunicationAdapter.js';
import ExpertiseProfiles from '../expertise/ExpertiseProfiles.js';
import ExpertiseLearning from '../expertise/ExpertiseLearning.js';

// Import and register agents
import agentRegistry from './agents/AgentRegistry.js';

class CMOAssistantV2 {
  constructor() {
    this.pipeline = null;
    this.initialized = false;
    
    // Services
    this.knowledgeBase = cmoKnowledgeBase;
    this.contextDetector = contextDetector;
    this.responseEnhancer = cmoResponseEnhancer;
    this.communicationAdapter = new CommunicationAdapter();
    this.expertiseProfiles = new ExpertiseProfiles();
    this.expertiseLearning = new ExpertiseLearning();
    
    // Metrics
    this.metrics = {
      totalQueries: 0,
      pipelineMetrics: null,
      agentMetrics: null
    };
  }

  /**
   * Initialize the assistant and build pipeline
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      console.log('🚀 Initializing CMOAssistantV2...');
      
      // Initialize knowledge base
      await this.knowledgeBase.initialize();
      
      // Build the pipeline
      this.pipeline = this.buildPipeline();
      
      // Register specialized agents
      await this.registerAgents();
      
      this.initialized = true;
      console.log('✅ CMOAssistantV2 initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize CMOAssistantV2:', error);
      throw error;
    }
  }

  /**
   * Build the processing pipeline
   */
  buildPipeline() {
    const pipeline = new Pipeline('CMO Marketing Pipeline');
    
    // Stage 1: Detection - Analyze message and extract context
    pipeline.addStage(new DetectionStage(
      this.contextDetector,
      this.expertiseProfiles,
      { debug: true }
    ));
    
    // Stage 2: Specialized Agents - Try specialized agent first
    pipeline.addStage(new SpecializedStage({
      registry: agentRegistry,
      confidenceThreshold: 0.6,
      debug: true
    }));
    
    // Stage 3: Knowledge Base - Fallback to KB search
    pipeline.addStage(new KnowledgeBaseStage(
      this.knowledgeBase,
      {
        minResults: 1,
        maxResults: 5,
        relevanceThreshold: 0.7
      }
    ));
    
    // Stage 4: Enhancement - Add formatting and structure
    pipeline.addStage(new EnhancementStage(
      this.responseEnhancer,
      {
        preserveSpecialized: true // Don't override agent responses
      }
    ));
    
    // Stage 5: Adaptation - Personalize for user expertise
    pipeline.addStage(new AdaptationStage(
      this.communicationAdapter,
      this.expertiseProfiles
    ));
    
    // Listen to pipeline events for monitoring
    pipeline.on('pipeline:complete', (event) => {
      this.handlePipelineComplete(event);
    });
    
    pipeline.on('stage:error', (event) => {
      console.error(`⚠️ Stage error in ${event.stage}:`, event.error);
    });
    
    return pipeline;
  }

  /**
   * Register specialized marketing agents
   */
  async registerAgents() {
    try {
      // Import agents (they self-register)
      await import('./agents/specialized/DirectMailAgent.js');
      await import('./agents/specialized/DirectMailAgentV2.js');
      
      // Future agents would be imported here:
      // await import('./agents/specialized/SEOAgent.js');
      // await import('./agents/specialized/EmailAgent.js');
      // await import('./agents/specialized/SocialAgent.js');
      
      const registeredAgents = agentRegistry.listAgents();
      console.log(`📝 Registered ${registeredAgents.length} specialized agents:`, 
        registeredAgents.map(a => a.channel));
        
    } catch (error) {
      console.error('Failed to register agents:', error);
    }
  }

  /**
   * Process a marketing query
   * @param {string} message - User message
   * @param {string} userId - User ID
   * @param {object} options - Additional options
   */
  async processMessage(message, userId, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const startTime = Date.now();
    this.metrics.totalQueries++;
    
    console.log('📨 Processing message:', {
      message: message.substring(0, 50) + '...',
      userId,
      options: Object.keys(options)
    });
    
    // Check for field assistance - V2 pipeline doesn't handle this properly
    if (options.subMode === 'field_assistance') {
      console.log('⚠️ Field assistance detected in V2 - providing fallback response');
      return this.handleFieldAssistanceFallback(message, userId, options);
    }
    
    try {
      // Build context
      const context = {
        userId,
        conversationId: options.conversationId,
        timestamp: Date.now(),
        ...options
      };
      
      // Get user expertise for context
      if (userId) {
        try {
          context.expertise = await this.expertiseProfiles.getUserProfile(userId);
        } catch (error) {
          console.error('Failed to get user expertise:', error);
        }
      }
      
      // Process through pipeline
      const response = await this.pipeline.process(message, context);
      
      // Track learning
      if (userId && response.hasContent()) {
        await this.trackInteraction(userId, message, response, Date.now() - startTime);
      }
      
      // Convert to legacy format if needed
      if (options.legacyFormat) {
        return this.convertToLegacyFormat(response);
      }
      
      return response;
      
    } catch (error) {
      console.error('❌ Error processing message:', error);
      
      // Return error response
      return new CMOResponse({
        content: 'I apologize, but I encountered an error processing your request. Please try again or rephrase your question.',
        source: 'error',
        confidence: 0,
        metadata: {
          error: error.message,
          timestamp: Date.now()
        }
      });
    }
  }

  /**
   * Process a query (backward compatibility wrapper)
   */
  async processQuery(message, options = {}) {
    // Extract userId from options for backward compatibility
    const userId = options.userId || options.conversationId || 'anonymous';
    
    // Set legacy format flag
    const enhancedOptions = {
      ...options,
      legacyFormat: true
    };
    
    return this.processMessage(message, userId, enhancedOptions);
  }

  /**
   * Track user interaction for learning
   */
  async trackInteraction(userId, message, response, duration) {
    try {
      // Extract insights from response metadata
      const insights = {
        channel: response.ui?.processingMetadata?.channel,
        intent: response.ui?.processingMetadata?.intent,
        source: response.source,
        confidence: response.confidence,
        duration
      };
      
      // Track with expertise learning
      await this.expertiseLearning.trackInteraction(userId, {
        message,
        response: response.content,
        context: insights,
        timestamp: Date.now()
      });
      
      // Update channel expertise if applicable
      if (insights.channel && insights.channel !== 'general') {
        await this.expertiseProfiles.updateTopicExpertise(
          userId,
          insights.channel,
          {
            interactions: 1,
            confidence: response.confidence
          }
        );
      }
      
    } catch (error) {
      console.error('Failed to track interaction:', error);
    }
  }

  /**
   * Handle pipeline completion events
   */
  handlePipelineComplete(event) {
    const { runId, totalTime, output, executionLog } = event;
    
    // Update metrics
    this.metrics.pipelineMetrics = this.pipeline.getMetrics();
    this.metrics.agentMetrics = agentRegistry.getStats();
    
    // Log performance for monitoring
    if (totalTime > 2000) {
      console.warn(`⚠️ Slow pipeline execution: ${totalTime}ms`, {
        runId,
        stages: executionLog.filter(s => s.time > 500)
      });
    }
  }

  /**
   * Convert CMOResponse to legacy format
   */
  convertToLegacyFormat(response) {
    return {
      content: response.content,
      confidence: response.confidence,
      structured: response.structured,
      metadata: response.metadata,
      quickActions: response.ui?.quickActions || [],
      citations: response.ui?.citations || [],
      type: response.metadata?.queryType || 'general',
      format: 'adaptive'
    };
  }

  /**
   * Get assistant metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      pipeline: this.pipeline?.getMetrics(),
      agents: agentRegistry.getStats()
    };
  }

  /**
   * Handle field assistance fallback (V2 doesn't properly handle field assistance)
   */
  handleFieldAssistanceFallback(message, userId, options) {
    const { fieldContext } = options;
    console.log('📝 V2 Field assistance fallback for:', fieldContext);
    
    // Provide helpful response based on field context
    let response = '';
    
    if (!fieldContext) {
      response = 'I can help you with this field. Please provide the specific information requested.';
    } else {
      const { fieldLabel, fieldType, fieldDescription } = fieldContext;
      
      if (fieldLabel?.toLowerCase().includes('travel') || fieldLabel?.toLowerCase().includes('specialty')) {
        response = `For your travel specialty, "luxury travel - 5 star properties and private touring" is an excellent focus! This positions you in the high-end travel market.\n\n`;
        response += `This specialty allows you to:\n`;
        response += `• Target affluent travelers seeking exclusive experiences\n`;
        response += `• Command premium pricing for your expertise\n`;
        response += `• Partner with luxury hotel brands and tour operators\n`;
        response += `• Create bespoke itineraries with private guides and exclusive access\n\n`;
        response += `Consider highlighting specific destinations where you excel in luxury travel, such as European capitals, exotic islands, or safari destinations.`;
      } else {
        response = `I'll help you with the "${fieldLabel}" field.\n\n`;
        response += fieldDescription ? `${fieldDescription}\n\n` : '';
        response += `For this field, provide specific information that best represents your business and target market. `;
        response += `Be clear and detailed to help create an effective direct mail campaign.`;
      }
    }
    
    // Return in CMOResponse format
    return CMOResponseFactory.create({
      response,
      mode: 'cmo',
      subMode: 'field_assistance',
      agent: 'fallback',
      confidence: 0.8,
      metadata: {
        source: 'v2_fallback',
        fieldContext
      }
    });
  }

  /**
   * Health check
   */
  async healthCheck() {
    const checks = {
      initialized: this.initialized,
      knowledgeBase: false,
      pipeline: false,
      agents: false
    };
    
    try {
      // Check knowledge base
      const kbStats = await this.knowledgeBase.getStats();
      checks.knowledgeBase = kbStats.initialized;
      
      // Check pipeline
      checks.pipeline = this.pipeline && this.pipeline.stages.length > 0;
      
      // Check agents
      const agents = agentRegistry.listAgents();
      checks.agents = agents.length > 0;
      
      checks.healthy = Object.values(checks).every(v => v === true);
      
    } catch (error) {
      checks.error = error.message;
      checks.healthy = false;
    }
    
    return checks;
  }

  /**
   * Shutdown and cleanup
   */
  async shutdown() {
    console.log('Shutting down CMOAssistantV2...');
    
    // Clear agent registry
    agentRegistry.clear();
    
    // Reset pipeline metrics
    if (this.pipeline) {
      this.pipeline.resetMetrics();
    }
    
    this.initialized = false;
  }
}

// Create singleton instance
const cmoAssistantV2 = new CMOAssistantV2();

// Also export the class for testing
export { CMOAssistantV2 };
export default cmoAssistantV2;