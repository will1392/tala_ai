/**
 * Smart Chat Service for Tala AI
 * 
 * Extends chat functionality with smart document features:
 * - Document relationship understanding
 * - Visual content reference
 * - Multilingual query handling
 * - Trip summaries and suggestions
 * - Context-aware responses
 */

import { DocumentService } from './db/documentService.js';
import relationshipMapper from './documents/RelationshipMapper.js';
import tripBuilder from './documents/TripBuilder.js';

class SmartChatService {
  constructor(baseChatService, options = {}) {
    this.chatService = baseChatService;
    this.documentService = new DocumentService();
    this.enableLogging = options.enableLogging !== false;
    
    // Configuration
    this.config = {
      maxRelatedDocuments: 10,
      includeVisualDescriptions: true,
      autoTranslate: true,
      suggestionThreshold: 0.7,
      ...options.config
    };
    
    this.log('Smart Chat Service initialized');
  }

  /**
   * Generate enhanced chat response with document context
   * @param {Object} options - Chat options
   * @returns {Object} Enhanced chat response
   */
  async generateSmartResponse(options) {
    const {
      message,
      userId,
      organizationId,
      conversationId,
      conversationContext = {},
      includeDocumentContext = true,
      language = 'en'
    } = options;

    try {
      // Extract context from message
      const messageContext = await this.analyzeMessage(message);
      
      // Build enhanced context
      const enhancedContext = await this.buildEnhancedContext({
        userId,
        organizationId,
        messageContext,
        conversationContext,
        includeDocumentContext
      });

      // Enhance system prompt with document capabilities
      const enhancedSystemPrompt = this.buildEnhancedSystemPrompt(
        options.systemPrompt,
        enhancedContext,
        language
      );

      // Generate response using base chat service
      const response = await this.chatService.generateResponse({
        ...options,
        message: this.enhanceMessage(message, enhancedContext),
        systemPrompt: enhancedSystemPrompt,
        conversationContext: enhancedContext
      });

      // Post-process response with smart features
      const smartResponse = await this.enhanceResponse(response, enhancedContext);

      return smartResponse;

    } catch (error) {
      this.log(`Smart response generation failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Analyze message for context clues
   * @param {string} message - User message
   * @returns {Object} Message context
   */
  async analyzeMessage(message) {
    const context = {
      mentions: {
        documents: [],
        trips: [],
        dates: [],
        locations: []
      },
      intents: [],
      language: 'en',
      requiresDocuments: false,
      requiresVisualInfo: false,
      requiresTranslation: false
    };

    const lowerMessage = message.toLowerCase();

    // Check for document references
    if (lowerMessage.includes('document') || lowerMessage.includes('file')) {
      context.requiresDocuments = true;
      context.intents.push('document_query');
    }

    // Check for trip references
    if (lowerMessage.includes('trip') || lowerMessage.includes('travel') || 
        lowerMessage.includes('flight') || lowerMessage.includes('hotel')) {
      context.intents.push('trip_query');
      context.requiresDocuments = true;
    }

    // Check for visual references
    if (lowerMessage.includes('show') || lowerMessage.includes('image') || 
        lowerMessage.includes('picture') || lowerMessage.includes('visual')) {
      context.requiresVisualInfo = true;
      context.intents.push('visual_query');
    }

    // Check for relationship queries
    if (lowerMessage.includes('related') || lowerMessage.includes('connected') || 
        lowerMessage.includes('relationship')) {
      context.intents.push('relationship_query');
    }

    // Extract document IDs if mentioned
    const docIdPattern = /document[s]?\s+([a-f0-9-]{36})/gi;
    let match;
    while ((match = docIdPattern.exec(message)) !== null) {
      context.mentions.documents.push(match[1]);
    }

    // Extract date mentions
    const datePattern = /\b(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/gi;
    while ((match = datePattern.exec(message)) !== null) {
      context.mentions.dates.push(match[1]);
    }

    return context;
  }

  /**
   * Build enhanced context with document information
   * @param {Object} params - Context parameters
   * @returns {Object} Enhanced context
   */
  async buildEnhancedContext(params) {
    const {
      userId,
      organizationId,
      messageContext,
      conversationContext,
      includeDocumentContext
    } = params;

    const enhanced = {
      ...conversationContext,
      documents: [],
      trips: [],
      relationships: [],
      visualContent: [],
      suggestions: []
    };

    if (!includeDocumentContext || !messageContext.requiresDocuments) {
      return enhanced;
    }

    try {
      // Get recent documents if no specific ones mentioned
      let documents = [];
      if (messageContext.mentions.documents.length > 0) {
        // Fetch specific documents
        for (const docId of messageContext.mentions.documents) {
          const result = await this.documentService.getDocumentWithRelationships(docId, {
            organizationId
          });
          if (result.success) {
            documents.push(result.data);
          }
        }
      } else {
        // Get recent relevant documents
        const docsResult = await this.documentService.getDocumentsByUser(userId, {
          organizationId,
          pagination: { page: 1, pageSize: 20 },
          sort: { field: 'updated_at', direction: 'desc' }
        });
        if (docsResult.success) {
          documents = docsResult.data.slice(0, this.config.maxRelatedDocuments);
        }
      }

      // Add document summaries to context
      enhanced.documents = documents.map(doc => ({
        id: doc.id,
        title: doc.title,
        type: doc.type || doc.document_type,
        summary: this.summarizeDocument(doc),
        visualDescription: doc.visual_description || doc.metadata?.visualAnalysis?.description,
        hasTranslation: doc.has_translation || !!doc.metadata?.translation,
        entities: doc.metadata?.entities || {},
        relationships: doc.metadata?.relationships || {}
      }));

      // Extract trips if relevant
      if (messageContext.intents.includes('trip_query')) {
        const tripMap = new Map();
        documents.forEach(doc => {
          if (doc.metadata?.trips?.tripIds) {
            doc.metadata.trips.tripIds.forEach(tripId => {
              if (!tripMap.has(tripId)) {
                tripMap.set(tripId, []);
              }
              tripMap.get(tripId).push(doc);
            });
          }
        });

        enhanced.trips = Array.from(tripMap.entries()).map(([tripId, tripDocs]) => ({
          id: tripId,
          documentCount: tripDocs.length,
          documents: tripDocs.map(d => ({ id: d.id, title: d.title, type: d.type }))
        }));
      }

      // Add visual content if needed
      if (messageContext.requiresVisualInfo) {
        enhanced.visualContent = documents
          .filter(doc => doc.visual_description || doc.metadata?.visualAnalysis)
          .map(doc => ({
            documentId: doc.id,
            title: doc.title,
            description: doc.visual_description || doc.metadata.visualAnalysis.description,
            objects: doc.metadata?.visualAnalysis?.objects || []
          }));
      }

      // Generate suggestions based on context
      enhanced.suggestions = await this.generateContextualSuggestions(documents, messageContext);

    } catch (error) {
      this.log(`Error building enhanced context: ${error.message}`, 'error');
    }

    return enhanced;
  }

  /**
   * Build enhanced system prompt
   * @param {string} basePrompt - Base system prompt
   * @param {Object} context - Enhanced context
   * @param {string} language - Response language
   * @returns {string} Enhanced system prompt
   */
  buildEnhancedSystemPrompt(basePrompt, context, language) {
    let enhancedPrompt = basePrompt || 'You are Tala AI, a helpful assistant.';

    // Add document awareness
    if (context.documents.length > 0) {
      enhancedPrompt += '\n\nYou have access to the following documents:\n';
      context.documents.forEach(doc => {
        enhancedPrompt += `- ${doc.title} (${doc.type}): ${doc.summary}\n`;
        if (doc.visualDescription) {
          enhancedPrompt += `  Visual: ${doc.visualDescription}\n`;
        }
      });
    }

    // Add trip context
    if (context.trips.length > 0) {
      enhancedPrompt += '\n\nIdentified trips:\n';
      context.trips.forEach(trip => {
        enhancedPrompt += `- Trip ${trip.id}: ${trip.documentCount} documents\n`;
      });
    }

    // Add relationship context
    if (context.relationships.length > 0) {
      enhancedPrompt += '\n\nDocument relationships identified. You can reference connected documents when relevant.';
    }

    // Add language instruction
    if (language !== 'en') {
      enhancedPrompt += `\n\nPlease respond in ${language}.`;
    }

    // Add smart features instructions
    enhancedPrompt += '\n\nCapabilities:\n';
    enhancedPrompt += '- Reference specific documents by title or content\n';
    enhancedPrompt += '- Describe visual content from images\n';
    enhancedPrompt += '- Understand document relationships and trips\n';
    enhancedPrompt += '- Provide suggestions based on document patterns\n';
    enhancedPrompt += '- Handle multilingual content\n';

    return enhancedPrompt;
  }

  /**
   * Enhance user message with context
   * @param {string} message - Original message
   * @param {Object} context - Enhanced context
   * @returns {string} Enhanced message
   */
  enhanceMessage(message, context) {
    let enhanced = message;

    // Add document references if implicit
    if (context.documents.length > 0 && !message.toLowerCase().includes('document')) {
      const docTitles = context.documents.slice(0, 3).map(d => d.title).join(', ');
      enhanced += `\n\nContext: Recent documents include ${docTitles}`;
    }

    // Add visual descriptions if relevant
    if (context.visualContent.length > 0) {
      enhanced += '\n\nVisual content available:';
      context.visualContent.slice(0, 2).forEach(vc => {
        enhanced += `\n- ${vc.title}: ${vc.description}`;
      });
    }

    return enhanced;
  }

  /**
   * Enhance response with smart features
   * @param {Object} response - Base chat response
   * @param {Object} context - Enhanced context
   * @returns {Object} Enhanced response
   */
  async enhanceResponse(response, context) {
    const enhanced = {
      ...response,
      smartFeatures: {
        documentsReferenced: [],
        tripsIdentified: [],
        suggestionsProvided: [],
        visualContentIncluded: false,
        relationshipsUsed: false
      }
    };

    // Check if response references any documents
    if (context.documents.length > 0) {
      context.documents.forEach(doc => {
        if (response.content && response.content.includes(doc.title)) {
          enhanced.smartFeatures.documentsReferenced.push({
            id: doc.id,
            title: doc.title
          });
        }
      });
    }

    // Check if visual content was used
    if (context.visualContent.length > 0 && response.content) {
      enhanced.smartFeatures.visualContentIncluded = 
        context.visualContent.some(vc => response.content.includes(vc.description));
    }

    // Add action buttons for referenced documents
    if (enhanced.smartFeatures.documentsReferenced.length > 0) {
      enhanced.actions = enhanced.smartFeatures.documentsReferenced.map(doc => ({
        type: 'view_document',
        label: `View ${doc.title}`,
        documentId: doc.id
      }));
    }

    // Add trip summary if trips were discussed
    if (context.trips.length > 0 && response.content && 
        response.content.toLowerCase().includes('trip')) {
      enhanced.smartFeatures.tripsIdentified = context.trips.map(t => t.id);
      
      if (!enhanced.actions) enhanced.actions = [];
      enhanced.actions.push({
        type: 'view_trips',
        label: 'View all trips',
        tripIds: enhanced.smartFeatures.tripsIdentified
      });
    }

    return enhanced;
  }

  /**
   * Summarize document for context
   * @param {Object} document - Document to summarize
   * @returns {string} Document summary
   */
  summarizeDocument(document) {
    const parts = [];
    
    // Add type-specific information
    if (document.type === 'flight') {
      if (document.metadata?.flightNumber) {
        parts.push(`Flight ${document.metadata.flightNumber}`);
      }
      if (document.metadata?.departureDate) {
        parts.push(`on ${new Date(document.metadata.departureDate).toLocaleDateString()}`);
      }
    } else if (document.type === 'hotel') {
      if (document.metadata?.hotelName) {
        parts.push(`${document.metadata.hotelName}`);
      }
      if (document.metadata?.checkInDate) {
        parts.push(`from ${new Date(document.metadata.checkInDate).toLocaleDateString()}`);
      }
    } else {
      // Generic summary
      if (document.content_preview) {
        parts.push(document.content_preview.substring(0, 100));
      } else if (document.description) {
        parts.push(document.description);
      }
    }

    // Add entity information
    if (document.metadata?.entities) {
      const entities = document.metadata.entities;
      if (entities.bookingReferences?.length > 0) {
        parts.push(`Ref: ${entities.bookingReferences[0]}`);
      }
      if (entities.destinations?.length > 0) {
        parts.push(`Destination: ${entities.destinations.join(', ')}`);
      }
    }

    return parts.join(' ') || 'No summary available';
  }

  /**
   * Generate contextual suggestions
   * @param {Array} documents - User documents
   * @param {Object} messageContext - Message context
   * @returns {Array} Suggestions
   */
  async generateContextualSuggestions(documents, messageContext) {
    const suggestions = [];

    // Suggest related documents
    if (messageContext.mentions.documents.length > 0) {
      suggestions.push({
        type: 'related_documents',
        message: 'You might also want to check related documents',
        confidence: 0.8
      });
    }

    // Suggest trip organization
    const travelDocs = documents.filter(doc => 
      ['flight', 'hotel', 'passport', 'visa'].includes(doc.type)
    );
    if (travelDocs.length >= 2) {
      suggestions.push({
        type: 'trip_organization',
        message: 'I can help organize these documents into trips',
        confidence: 0.9
      });
    }

    // Suggest translations
    const foreignDocs = documents.filter(doc => 
      doc.detected_language && doc.detected_language !== 'en' && !doc.has_translation
    );
    if (foreignDocs.length > 0) {
      suggestions.push({
        type: 'translation',
        message: `${foreignDocs.length} document(s) can be translated`,
        documentIds: foreignDocs.map(d => d.id),
        confidence: 0.95
      });
    }

    // Suggest visual analysis
    const imageDocs = documents.filter(doc => 
      doc.mime_type?.startsWith('image/') && !doc.visual_description
    );
    if (imageDocs.length > 0) {
      suggestions.push({
        type: 'visual_analysis',
        message: `${imageDocs.length} image(s) can be analyzed for content`,
        documentIds: imageDocs.map(d => d.id),
        confidence: 0.85
      });
    }

    return suggestions.filter(s => s.confidence >= this.config.suggestionThreshold);
  }

  /**
   * Handle document-specific queries
   * @param {Object} query - Query parameters
   * @returns {Object} Query response
   */
  async handleDocumentQuery(query) {
    const { type, documentId, userId, organizationId } = query;

    switch (type) {
      case 'get_relationships':
        return await this.getDocumentRelationships(documentId, { organizationId });
        
      case 'get_visual_content':
        return await this.getVisualContent(documentId, { organizationId });
        
      case 'translate':
        return await this.translateDocument(documentId, query.targetLanguage, { organizationId });
        
      case 'build_trip':
        return await this.buildTripFromDocuments(query.documentIds, { userId, organizationId });
        
      default:
        throw new Error(`Unknown document query type: ${type}`);
    }
  }

  /**
   * Get document relationships for chat context
   * @param {string} documentId - Document ID
   * @param {Object} options - Query options
   * @returns {Object} Relationships data
   */
  async getDocumentRelationships(documentId, options) {
    const result = await this.documentService.getDocumentWithRelationships(documentId, options);
    
    if (!result.success) {
      return { error: result.error };
    }

    const relationships = result.data.metadata?.relationships || {};
    const relatedDocs = [];

    // Get basic info for related documents
    if (relationships.relationships) {
      for (const rel of relationships.relationships.slice(0, 5)) {
        const relDoc = await this.documentService.getDocument(
          rel.sourceId === documentId ? rel.targetId : rel.sourceId,
          { ...options, includeContent: false }
        );
        
        if (relDoc.success) {
          relatedDocs.push({
            id: relDoc.data.id,
            title: relDoc.data.title,
            type: relDoc.data.type,
            relationshipType: rel.type
          });
        }
      }
    }

    return {
      documentId,
      relationshipCount: relationships.count || 0,
      clusterCount: relationships.clusterCount || 0,
      relatedDocuments: relatedDocs
    };
  }

  /**
   * Get visual content description
   * @param {string} documentId - Document ID
   * @param {Object} options - Query options
   * @returns {Object} Visual content data
   */
  async getVisualContent(documentId, options) {
    const result = await this.documentService.getDocument(documentId, {
      ...options,
      includeContent: false
    });

    if (!result.success) {
      return { error: result.error };
    }

    const visualData = {
      documentId,
      hasVisualContent: false,
      description: null,
      objects: [],
      quality: null
    };

    if (result.data.visual_description) {
      visualData.hasVisualContent = true;
      visualData.description = result.data.visual_description;
    }

    if (result.data.metadata?.visualAnalysis) {
      const analysis = result.data.metadata.visualAnalysis;
      visualData.hasVisualContent = true;
      visualData.description = visualData.description || analysis.description;
      visualData.objects = analysis.objects || [];
      visualData.quality = analysis.quality;
    }

    return visualData;
  }

  /**
   * Translate document content
   * @param {string} documentId - Document ID
   * @param {string} targetLanguage - Target language
   * @param {Object} options - Translation options
   * @returns {Object} Translation result
   */
  async translateDocument(documentId, targetLanguage, options) {
    return await this.documentService.translateDocument(documentId, targetLanguage, options);
  }

  /**
   * Build trip from documents
   * @param {Array} documentIds - Document IDs
   * @param {Object} options - Build options
   * @returns {Object} Trip building result
   */
  async buildTripFromDocuments(documentIds, options) {
    const { userId, organizationId } = options;

    // Fetch all documents
    const documents = [];
    for (const docId of documentIds) {
      const result = await this.documentService.getDocument(docId, {
        organizationId,
        includeContent: false
      });
      if (result.success) {
        documents.push(result.data);
      }
    }

    if (documents.length < 2) {
      return {
        error: 'At least 2 documents are required to build a trip'
      };
    }

    // Identify relationships
    const relationships = await relationshipMapper.identifyRelationships(documents);

    // Build trips
    const tripResults = await tripBuilder.buildTrips(documents, relationships.relationships);

    return {
      trips: tripResults.trips,
      suggestions: tripResults.suggestions,
      orphanedDocuments: tripResults.orphanedDocuments
    };
  }

  /**
   * Log with appropriate level
   * @param {string} message - Log message
   * @param {string} level - Log level
   */
  log(message, level = 'info') {
    if (this.enableLogging) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [SmartChat] [${level.toUpperCase()}] ${message}`);
    }
  }
}

export default SmartChatService;