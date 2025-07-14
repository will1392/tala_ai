/**
 * Service Integration Module
 * 
 * Updates and integrates existing services to work seamlessly
 * with the new intelligence, memory, and agent systems
 */

import DocumentService from '../documentService.js';
import conversationService from '../conversations/conversationDAL.js';
import chatService from '../chatService.js';
import ThreadingService from '../conversations/ThreadingService.js';
import DocumentAnalyzerAgent from '../agents/DocumentAnalyzerAgent.js';
import AgentRegistry from '../agents/AgentRegistry.js';

export class ServiceIntegration {
  constructor(intelligence) {
    this.intelligence = intelligence;
    this.integrations = new Map();
    this.initialized = false;
  }
  
  /**
   * Initialize all service integrations
   */
  async initialize() {
    console.log('🔧 Initializing service integrations...');
    
    try {
      // Integrate document service with analyzer agent
      await this.integrateDocumentService();
      
      // Integrate conversation service with threading
      await this.integrateConversationService();
      
      // Integrate chat service with intelligence layer
      await this.integrateChatService();
      
      // Set up cross-service communication
      await this.setupCrossServiceCommunication();
      
      this.initialized = true;
      console.log('✅ Service integrations initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize service integrations:', error);
      throw error;
    }
  }
  
  /**
   * Integrate document service with document analyzer agent
   */
  async integrateDocumentService() {
    console.log('📄 Integrating document service...');
    
    // Extend document upload to use analyzer agent
    const originalUpload = DocumentService.prototype.uploadDocument;
    
    DocumentService.prototype.uploadDocument = async function(fileData, userId, metadata) {
      // Call original upload
      const uploadResult = await originalUpload.call(this, fileData, userId, metadata);
      
      if (uploadResult.success && this.intelligence) {
        try {
          // Get document analyzer agent
          const registry = this.intelligence.agentOrchestrator.registry;
          const analyzerAgent = await registry.createAgent('document-analyzer');
          
          if (analyzerAgent) {
            // Analyze document
            const analysisResult = await analyzerAgent.execute({
              type: 'analyze-document',
              data: {
                documentId: uploadResult.documentId,
                content: fileData.content,
                metadata: metadata
              }
            });
            
            // Store analysis in memory
            if (analysisResult.success) {
              await this.intelligence.memoryManager.createMemory({
                userId,
                content: {
                  documentAnalysis: analysisResult.result,
                  documentId: uploadResult.documentId,
                  filename: metadata.filename
                },
                type: 'document-analysis',
                importance: 0.7,
                tags: ['document', metadata.type, ...extractDocumentTags(analysisResult.result)]
              });
            }
          }
        } catch (error) {
          console.warn('⚠️ Document analysis failed:', error.message);
        }
      }
      
      return uploadResult;
    };
    
    // Add intelligence reference to document service instances
    DocumentService.prototype.setIntelligence = function(intelligence) {
      this.intelligence = intelligence;
    };
    
    this.integrations.set('documentService', {
      status: 'integrated',
      enhancements: ['automatic-analysis', 'memory-storage']
    });
  }
  
  /**
   * Integrate conversation service with threading
   */
  async integrateConversationService() {
    console.log('💬 Integrating conversation service...');
    
    // Extend conversation creation to use threading
    const originalCreate = conversationService.createConversation;
    
    conversationService.createConversation = async function(data) {
      // Create conversation
      const result = await originalCreate.call(this, data);
      
      if (result.success && this.intelligence) {
        try {
          // Create corresponding thread
          const thread = await this.intelligence.threadingService.createThread({
            id: result.data.id,
            userId: data.user_id,
            metadata: {
              title: data.title,
              source: 'conversation-service',
              persist_context: data.persist_context !== false
            }
          });
          
          // Link thread to conversation
          if (thread) {
            await conversationService.updateConversation(result.data.id, {
              thread_id: thread.id,
              intelligence_enabled: true
            });
          }
        } catch (error) {
          console.warn('⚠️ Thread creation failed:', error.message);
        }
      }
      
      return result;
    };
    
    // Extend message addition to use threading
    const originalAddMessage = conversationService.addMessage;
    
    conversationService.addMessage = async function(conversationId, messageData) {
      const result = await originalAddMessage.call(this, conversationId, messageData);
      
      if (result.success && this.intelligence) {
        try {
          // Get conversation to find thread ID
          const conv = await conversationService.getConversationById(conversationId);
          if (conv.data?.thread_id) {
            // Add message to thread
            await this.intelligence.threadingService.addMessage(conv.data.thread_id, {
              role: messageData.sender === 'user' ? 'user' : 'assistant',
              content: messageData.content,
              metadata: {
                messageId: result.data.id,
                entities: messageData.entities,
                timestamp: messageData.timestamp
              }
            });
          }
        } catch (error) {
          console.warn('⚠️ Thread message sync failed:', error.message);
        }
      }
      
      return result;
    };
    
    // Add intelligence reference
    conversationService.setIntelligence = function(intelligence) {
      this.intelligence = intelligence;
    };
    
    this.integrations.set('conversationService', {
      status: 'integrated',
      enhancements: ['threading-sync', 'persistent-context']
    });
  }
  
  /**
   * Integrate chat service with intelligence layer
   */
  async integrateChatService() {
    console.log('🤖 Integrating chat service...');
    
    // Extend chat response generation to use intelligence
    const originalGenerate = chatService.generateResponse;
    
    chatService.generateResponse = async function(options) {
      // If intelligence is available and enabled, use it
      if (this.intelligence && options.useIntelligence !== false) {
        try {
          const intelligentResponse = await this.intelligence.processRequest({
            userId: options.userId,
            content: options.message,
            conversationId: options.conversationId,
            source: 'chat-service',
            data: {
              systemPrompt: options.systemPrompt,
              conversationContext: options.conversationContext,
              userPreferences: options.userPreferences
            }
          });
          
          if (intelligentResponse.success) {
            return {
              content: intelligentResponse.response.content,
              model: intelligentResponse.metadata.agentsUsed[0],
              usage: {
                totalTokens: intelligentResponse.metadata.contextSize,
                cost: 0 // Would be calculated
              },
              routing: {
                strategy: 'intelligence',
                agentsUsed: intelligentResponse.metadata.agentsUsed
              }
            };
          }
        } catch (error) {
          console.warn('⚠️ Intelligence processing failed, falling back:', error.message);
        }
      }
      
      // Fallback to original implementation
      return originalGenerate.call(this, options);
    };
    
    // Add intelligence reference
    chatService.setIntelligence = function(intelligence) {
      this.intelligence = intelligence;
    };
    
    this.integrations.set('chatService', {
      status: 'integrated',
      enhancements: ['intelligence-routing', 'fallback-support']
    });
  }
  
  /**
   * Set up cross-service communication
   */
  async setupCrossServiceCommunication() {
    console.log('🔗 Setting up cross-service communication...');
    
    // Create event emitter for service communication
    const { EventEmitter } = await import('events');
    const serviceEvents = new EventEmitter();
    
    // Document upload -> Memory creation
    serviceEvents.on('document:uploaded', async (data) => {
      const { documentId, userId, metadata } = data;
      
      // Create memory for document
      await this.intelligence.memoryManager.createMemory({
        userId,
        content: {
          event: 'document_uploaded',
          documentId,
          filename: metadata.filename,
          type: metadata.type
        },
        type: 'event',
        importance: 0.5,
        tags: ['document-upload', metadata.type]
      });
    });
    
    // Conversation created -> Profile update
    serviceEvents.on('conversation:created', async (data) => {
      const { conversationId, userId, title } = data;
      
      // Update user activity in profile
      await this.intelligence.profileManager.updateActivity(userId, {
        action: 'conversation_created',
        conversationId,
        timestamp: new Date()
      });
    });
    
    // High importance memory -> Alert
    serviceEvents.on('memory:important', async (data) => {
      const { memory, userId } = data;
      
      if (memory.importance > 0.9) {
        console.log(`⚠️ High importance memory created for user ${userId}:`, memory.summary);
        // Could trigger notifications or special handling
      }
    });
    
    // Agent failure -> Learning update
    serviceEvents.on('agent:failed', async (data) => {
      const { agentId, taskType, error } = data;
      
      // Record failure in learning engine
      await this.intelligence.learningEngine.recordInteraction({
        userId: 'system',
        taskType,
        selectedAgents: [{ id: agentId }],
        executionTime: 0,
        success: false,
        error: error.message
      });
    });
    
    this.serviceEvents = serviceEvents;
    
    this.integrations.set('crossService', {
      status: 'integrated',
      enhancements: ['event-driven', 'automatic-updates']
    });
  }
  
  /**
   * Apply all integrations
   */
  async applyIntegrations() {
    if (!this.intelligence) {
      throw new Error('Intelligence instance required for integration');
    }
    
    // Set intelligence reference on all services
    if (DocumentService.prototype.setIntelligence) {
      DocumentService.prototype.setIntelligence(this.intelligence);
    }
    
    if (conversationService.setIntelligence) {
      conversationService.setIntelligence(this.intelligence);
    }
    
    if (chatService.setIntelligence) {
      chatService.setIntelligence(this.intelligence);
    }
    
    console.log('✅ All service integrations applied');
  }
  
  /**
   * Get integration status
   */
  getStatus() {
    const status = {
      initialized: this.initialized,
      integrations: {}
    };
    
    this.integrations.forEach((value, key) => {
      status.integrations[key] = value;
    });
    
    return status;
  }
  
  /**
   * Emit service event
   */
  emit(event, data) {
    if (this.serviceEvents) {
      this.serviceEvents.emit(event, data);
    }
  }
}

// Helper functions

function extractDocumentTags(analysis) {
  const tags = [];
  
  if (analysis.documentType) {
    tags.push(analysis.documentType);
  }
  
  if (analysis.extractedData?.type) {
    tags.push(analysis.extractedData.type);
  }
  
  if (analysis.language) {
    tags.push(`lang:${analysis.language}`);
  }
  
  return tags;
}

export default ServiceIntegration;