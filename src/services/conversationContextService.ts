/**
 * Conversation Context Service
 * 
 * Handles conversation memory, entity extraction, and context management
 * for maintaining conversation awareness in TALA AI chat sessions.
 */

import type {
  ConversationContext,
  ConversationEntity,
  ConversationIntent,
  EntityExtractionResult,
  EntityReference,
  ContextUpdate,
  ContextSummary,
  ContextClarification,
  MessageWithContext,
  EntityType,
  IntentType
} from '../types/conversationContext';
import { CONTEXT_CONFIG } from '../types/conversationContext';
import { buildApiUrl } from '../utils/api';

export class ConversationContextService {
  private contexts: Map<string, ConversationContext> = new Map();
  private contextHistory: Map<string, ContextUpdate[]> = new Map();

  /**
   * Initialize or retrieve conversation context
   */
  async getOrCreateContext(
    sessionId: string,
    userId: string,
    conversationId: string
  ): Promise<ConversationContext> {
    const existingContext = this.contexts.get(sessionId);
    
    if (existingContext && !this.isContextExpired(existingContext)) {
      // Update last accessed time
      existingContext.lastAccessed = new Date();
      return existingContext;
    }

    // Create new context
    const newContext: ConversationContext = {
      sessionId,
      userId,
      conversationId,
      createdAt: new Date(),
      lastUpdated: new Date(),
      lastAccessed: new Date(),
      entities: new Map(),
      intents: [],
      state: {},
      metadata: {
        messageCount: 0,
        languages: ['en'],
        complexityLevel: 'simple',
        needsClarification: false,
        tags: []
      },
      expiration: {
        ttl: CONTEXT_CONFIG.DEFAULT_TTL,
        expiresAt: new Date(Date.now() + CONTEXT_CONFIG.DEFAULT_TTL),
        autoExtend: true
      }
    };

    this.contexts.set(sessionId, newContext);
    this.contextHistory.set(sessionId, []);
    
    return newContext;
  }

  /**
   * Process a user message and extract context
   */
  async processMessage(
    sessionId: string,
    message: string,
    existingContext?: ConversationContext
  ): Promise<MessageWithContext> {
    const context = existingContext || await this.getOrCreateContext(sessionId, '', '');
    
    // Extract entities and intents from message
    const extractionResult = await this.extractEntitiesAndIntents(message, context);
    
    // Update context with new information
    const updatedContext = await this.updateContext(context, extractionResult, message);
    
    // Check for clarifications needed
    const clarifications = this.detectClarificationNeeds(extractionResult, updatedContext);
    
    return {
      content: message,
      extractedContext: extractionResult,
      updatedContext,
      clarifications
    };
  }

  /**
   * Extract entities and intents from message using OpenAI function calling
   */
  private async extractEntitiesAndIntents(
    message: string,
    context: ConversationContext
  ): Promise<EntityExtractionResult> {
    try {
      // Build context for entity extraction
      const contextSummary = this.buildContextSummary(context);

      // Use OpenAI function calling for structured extraction
      const response = await fetch(buildApiUrl('chat/extract-context'), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': 'test_user_123' // TODO: Get from auth context
        },
        body: JSON.stringify({
          message,
          contextSummary,
          existingEntities: Array.from(context.entities.values())
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.warn('Context extraction API failed:', response.status, errorData);
        throw new Error('Failed to extract context');
      }

      const result = await response.json();
      return this.parseExtractionResult(result, message);
      
    } catch (error) {
      console.warn('Entity extraction failed, using fallback:', error.message);
      return this.fallbackExtraction(message, context);
    }
  }

  /**
   * Fallback extraction using regex patterns
   */
  private fallbackExtraction(
    message: string,
    _context: ConversationContext
  ): EntityExtractionResult {
    const entities: ConversationEntity[] = [];
    const intents: ConversationIntent[] = [];
    const references: EntityReference[] = [];

    // Basic regex-based entity extraction
    const countryMatch = message.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g);
    if (countryMatch) {
      countryMatch.forEach((match) => {
        if (this.isLikelyCountry(match)) {
          entities.push(this.createEntity('country', match, 0.6, message));
        }
      });
    }

    // Date extraction
    const dateMatch = message.match(/\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})\b/g);
    if (dateMatch) {
      dateMatch.forEach(match => {
        entities.push(this.createEntity('date', match, 0.7, message));
      });
    }

    // Intent detection based on keywords
    const intentKeywords = {
      visa_inquiry: ['visa', 'entry', 'requirements', 'permit'],
      passport_check: ['passport', 'valid', 'expire', 'expiry'],
      restaurant_search: ['restaurant', 'food', 'eat', 'dining'],
      hotel_search: ['hotel', 'accommodation', 'stay', 'booking'],
      task_creation: ['create a task', 'remind me', 'add a task', 'make a task', 'schedule', 'todo', 'task to']
    };

    Object.entries(intentKeywords).forEach(([intent, keywords]) => {
      const hasKeyword = keywords.some(keyword => 
        message.toLowerCase().includes(keyword)
      );
      if (hasKeyword) {
        intents.push(this.createIntent(intent as IntentType, 0.6));
      }
    });

    // Task extraction for task creation intent
    if (intents.some(i => i.type === 'task_creation')) {
      // Extract task title - text after task keywords
      const taskPatterns = ['create a task to', 'remind me to', 'add a task to', 'make a task to', 'task to'];
      for (const pattern of taskPatterns) {
        const index = message.toLowerCase().indexOf(pattern);
        if (index !== -1) {
          const afterPattern = message.substring(index + pattern.length).trim();
          const taskTitle = afterPattern.split(/\s+(by|on|at|before|tomorrow|today|next)\s+/i)[0].trim();
          if (taskTitle) {
            entities.push(this.createEntity('task_title', taskTitle, 0.7, message));
          }
          break;
        }
      }
      
      // Extract due date patterns
      const dueDatePatterns = [
        { pattern: /\b(tomorrow)\b/i, value: 'tomorrow' },
        { pattern: /\b(today)\b/i, value: 'today' },
        { pattern: /\b(next week)\b/i, value: 'next week' },
        { pattern: /\b(next monday|next tuesday|next wednesday|next thursday|next friday)\b/i, value: null }
      ];
      
      for (const { pattern, value } of dueDatePatterns) {
        const match = message.match(pattern);
        if (match) {
          entities.push(this.createEntity('task_due_date', value || match[0], 0.7, message));
          break;
        }
      }
      
      // Extract priority
      if (message.toLowerCase().includes('urgent') || message.toLowerCase().includes('asap')) {
        entities.push(this.createEntity('task_priority', 'high', 0.8, message));
      }
    }

    // Basic reference detection
    const referencePatterns = ['there', 'it', 'that place', 'the country', 'the city'];
    referencePatterns.forEach(pattern => {
      const index = message.toLowerCase().indexOf(pattern);
      if (index !== -1) {
        references.push({
          type: 'demonstrative',
          referenceText: pattern,
          position: index,
          confidence: 0.5,
          clarificationNeeded: true
        });
      }
    });

    return {
      entities,
      intents,
      references,
      confidence: 0.5,
      contextUpdates: {}
    };
  }

  /**
   * Update conversation context with new information
   */
  private async updateContext(
    context: ConversationContext,
    extraction: EntityExtractionResult,
    _message: string
  ): Promise<ConversationContext> {
    const updatedContext = { ...context };
    const now = new Date();

    // Update metadata
    updatedContext.lastUpdated = now;
    updatedContext.lastAccessed = now;
    updatedContext.metadata.messageCount++;

    // Extend expiration if auto-extend is enabled
    if (updatedContext.expiration.autoExtend) {
      updatedContext.expiration.expiresAt = new Date(
        Date.now() + updatedContext.expiration.ttl
      );
    }

    // Add or update entities
    extraction.entities.forEach(entity => {
      const existingEntity = updatedContext.entities.get(entity.id);
      if (existingEntity) {
        existingEntity.lastReferenced = now;
        existingEntity.referenceCount++;
        existingEntity.confidence = Math.max(existingEntity.confidence, entity.confidence);
      } else {
        updatedContext.entities.set(entity.id, entity);
      }
    });

    // Update intents
    extraction.intents.forEach(intent => {
      const existingIntent = updatedContext.intents.find(i => i.type === intent.type);
      if (existingIntent) {
        existingIntent.confidence = Math.max(existingIntent.confidence, intent.confidence);
        existingIntent.isActive = true;
      } else {
        updatedContext.intents.push(intent);
      }
    });

    // Apply context updates
    updatedContext.state = { ...updatedContext.state, ...extraction.contextUpdates };

    // Update primary context
    this.updatePrimaryContext(updatedContext);

    // Record the update
    this.recordContextUpdate(context.sessionId, 'entity_add', {
      entitiesAdded: extraction.entities.length,
      intentsAdded: extraction.intents.length
    });

    // Save updated context
    this.contexts.set(updatedContext.sessionId, updatedContext);

    return updatedContext;
  }

  /**
   * Update primary context for quick reference
   */
  private updatePrimaryContext(context: ConversationContext): void {
    const entities = Array.from(context.entities.values());
    
    // Find most recent country
    const countries = entities
      .filter(e => e.type === 'country')
      .sort((a, b) => b.lastReferenced.getTime() - a.lastReferenced.getTime());
    
    // Find most recent city
    const cities = entities
      .filter(e => e.type === 'city')
      .sort((a, b) => b.lastReferenced.getTime() - a.lastReferenced.getTime());

    context.primaryContext = {
      country: countries[0]?.normalizedValue,
      city: cities[0]?.normalizedValue,
      purpose: this.inferTravelPurpose(context),
      timeframe: this.inferTimeframe(context)
    };
  }

  /**
   * Generate conversation context summary for AI
   */
  getContextSummary(sessionId: string): ContextSummary | null {
    const context = this.contexts.get(sessionId);
    if (!context || this.isContextExpired(context)) {
      return null;
    }

    const entities = Array.from(context.entities.values());
    const keyEntities = entities
      .sort((a, b) => b.referenceCount - a.referenceCount)
      .slice(0, 5)
      .map(e => `${e.type}: ${e.value}`);

    const activeIntents = context.intents
      .filter(i => i.isActive)
      .map(i => i.type);

    let summary = 'Conversation Context:\n';
    
    if (context.primaryContext?.country) {
      summary += `- Current country: ${context.primaryContext.country}\n`;
    }
    
    if (context.primaryContext?.city) {
      summary += `- Current city: ${context.primaryContext.city}\n`;
    }
    
    if (context.state.clientInfo?.passportExpiry) {
      summary += `- Passport expiry: ${context.state.clientInfo.passportExpiry}\n`;
    }
    
    if (context.state.clientInfo?.travelDates) {
      summary += `- Travel dates: ${JSON.stringify(context.state.clientInfo.travelDates)}\n`;
    }

    return {
      summary,
      keyEntities,
      topics: activeIntents,
      status: this.getContextStatus(context)
    };
  }

  /**
   * Get formatted context for AI prompt injection
   */
  getContextForAI(sessionId: string): string {
    const summary = this.getContextSummary(sessionId);
    if (!summary) {
      return '';
    }

    return `\n\nConversation Context:\n${summary.summary}\nKey entities discussed: ${summary.keyEntities.join(', ')}\nCurrent topics: ${summary.topics.join(', ')}\n\nPlease use this context to better understand references like "there", "it", "the place", etc. in the user's message.`;
  }

  /**
   * Check if clarification is needed
   */
  private detectClarificationNeeds(
    extraction: EntityExtractionResult,
    context: ConversationContext
  ): ContextClarification[] {
    const clarifications: ContextClarification[] = [];

    // Check for ambiguous references
    extraction.references.forEach(ref => {
      if (ref.clarificationNeeded && !ref.resolvedEntityId) {
        clarifications.push({
          type: 'ambiguous_reference',
          ambiguousText: ref.referenceText,
          possibleMeanings: this.getPossibleMeanings(ref, context),
          clarificationQuestion: `When you say "${ref.referenceText}", do you mean ${this.formatPossibleMeanings(this.getPossibleMeanings(ref, context))}?`,
          priority: 'medium'
        });
      }
    });

    return clarifications;
  }

  /**
   * Clean up expired contexts
   */
  cleanupExpiredContexts(): void {
    const expiredSessions: string[] = [];

    this.contexts.forEach((context, sessionId) => {
      if (this.isContextExpired(context)) {
        expiredSessions.push(sessionId);
      }
    });

    expiredSessions.forEach(sessionId => {
      this.contexts.delete(sessionId);
      this.contextHistory.delete(sessionId);
    });

    if (expiredSessions.length > 0) {
      console.log(`🧹 Cleaned up ${expiredSessions.length} expired conversation contexts`);
    }
  }

  /**
   * Reset context for a session
   */
  resetContext(sessionId: string): void {
    this.contexts.delete(sessionId);
    this.contextHistory.delete(sessionId);
  }

  /**
   * Get conversation history with context
   */
  getConversationHistory(sessionId: string, messageLimit: number = 10): string {
    const context = this.contexts.get(sessionId);
    if (!context) return '';

    const history = this.contextHistory.get(sessionId) || [];
    const recentUpdates = history
      .slice(-messageLimit)
      .map(update => `${update.type}: ${JSON.stringify(update.changes)}`)
      .join('\n');

    return recentUpdates;
  }

  // Helper methods
  private isContextExpired(context: ConversationContext): boolean {
    return new Date() > context.expiration.expiresAt;
  }

  private buildContextSummary(context: ConversationContext): string {
    const entities = Array.from(context.entities.values());
    const entitySummary = entities
      .map(e => `${e.type}: ${e.value}`)
      .join(', ');
    
    return `Entities: ${entitySummary}. Active intents: ${context.intents.map(i => i.type).join(', ')}`;
  }

  private parseExtractionResult(result: any, _message: string): EntityExtractionResult {
    // Parse the structured result from OpenAI function calling
    return {
      entities: result.entities || [],
      intents: result.intents || [],
      references: result.references || [],
      confidence: result.confidence || 0.5,
      contextUpdates: result.contextUpdates || {}
    };
  }

  private createEntity(
    type: EntityType,
    value: string,
    confidence: number,
    context: string
  ): ConversationEntity {
    const now = new Date();
    return {
      id: `${type}_${value.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`,
      type,
      value,
      normalizedValue: this.normalizeEntityValue(type, value),
      confidence,
      firstMentioned: now,
      lastReferenced: now,
      referenceCount: 1,
      context: context.substring(0, 200)
    };
  }

  private createIntent(type: IntentType, confidence: number): ConversationIntent {
    return {
      id: `${type}_${Date.now()}`,
      type,
      confidence,
      detectedAt: new Date(),
      relatedEntities: [],
      isActive: true
    };
  }

  private normalizeEntityValue(type: EntityType, value: string): string {
    switch (type) {
      case 'country':
        return value.toLowerCase().trim();
      case 'city':
        return value.toLowerCase().trim();
      case 'date':
        // Normalize date format
        return new Date(value).toISOString().split('T')[0];
      default:
        return value.trim();
    }
  }

  private isLikelyCountry(text: string): boolean {
    const commonCountries = [
      'greece', 'spain', 'italy', 'france', 'germany', 'japan', 'china',
      'united states', 'canada', 'australia', 'england', 'uk', 'usa'
    ];
    return commonCountries.includes(text.toLowerCase());
  }

  private inferTravelPurpose(context: ConversationContext): string {
    const intents = context.intents.filter(i => i.isActive);
    if (intents.some(i => i.type === 'visa_inquiry')) return 'visa inquiry';
    if (intents.some(i => i.type === 'hotel_search')) return 'accommodation';
    if (intents.some(i => i.type === 'restaurant_search')) return 'dining';
    return 'general travel';
  }

  private inferTimeframe(context: ConversationContext): string {
    const dates = Array.from(context.entities.values())
      .filter(e => e.type === 'date' || e.type === 'travel_date')
      .sort((a, b) => a.firstMentioned.getTime() - b.firstMentioned.getTime());
    
    if (dates.length > 0) {
      return `around ${dates[0].value}`;
    }
    return 'unspecified';
  }

  private getContextStatus(context: ConversationContext): string {
    const entityCount = context.entities.size;
    const intentCount = context.intents.filter(i => i.isActive).length;
    
    if (entityCount === 0 && intentCount === 0) return 'new conversation';
    if (entityCount < 3) return 'building context';
    return 'established context';
  }

  private getPossibleMeanings(_ref: EntityReference, context: ConversationContext): string[] {
    const entities = Array.from(context.entities.values());
    const recentEntities = entities
      .filter(e => e.type === 'country' || e.type === 'city')
      .sort((a, b) => b.lastReferenced.getTime() - a.lastReferenced.getTime())
      .slice(0, 3);
    
    return recentEntities.map(e => e.value);
  }

  private formatPossibleMeanings(meanings: string[]): string {
    if (meanings.length === 0) return 'something specific';
    if (meanings.length === 1) return meanings[0];
    if (meanings.length === 2) return `${meanings[0]} or ${meanings[1]}`;
    return `${meanings.slice(0, -1).join(', ')}, or ${meanings[meanings.length - 1]}`;
  }

  private recordContextUpdate(
    sessionId: string,
    type: ContextUpdate['type'],
    changes: Record<string, any>,
    _triggeredBy?: string
  ): void {
    const history = this.contextHistory.get(sessionId) || [];
    history.push({
      type,
      timestamp: new Date(),
      changes,
      source: 'auto'
    });
    
    // Keep only recent updates
    if (history.length > 50) {
      history.splice(0, history.length - 50);
    }
    
    this.contextHistory.set(sessionId, history);
  }
}

// Create and export singleton instance
export const conversationContextService = new ConversationContextService();