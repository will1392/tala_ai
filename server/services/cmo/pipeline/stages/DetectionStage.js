/**
 * DetectionStage - Detects marketing context and intent from user messages
 * 
 * First stage in the pipeline that analyzes the message to determine
 * topic, channel, intent, and other contextual information.
 */

import { Stage } from '../Stage.js';
import { CMOResponse } from '../CMOResponse.js';

export class DetectionStage extends Stage {
  constructor(contextDetector, expertiseProfiles, options = {}) {
    super('DetectionStage', options);
    this.contextDetector = contextDetector;
    this.expertiseProfiles = expertiseProfiles;
  }

  async process(input, context) {
    const startTime = Date.now();
    
    try {
      // Extract message from input - check metadata.originalMessage for CMOResponse
      let message;
      if (typeof input === 'string') {
        message = input;
      } else if (input.metadata?.originalMessage) {
        message = input.metadata.originalMessage;
      } else if (input.content) {
        message = input.content;
      } else {
        message = '';
      }
      
      // Debug logging to see what's in context
      console.log('🐛 [DetectionStage] Input analysis:', {
        inputType: typeof input,
        inputIsString: typeof input === 'string',
        hasMetadata: !!input.metadata,
        hasOriginalMessage: !!input.metadata?.originalMessage,
        hasContent: !!input.content,
        originalMessage: input.metadata?.originalMessage?.substring(0, 50),
        content: input.content?.substring(0, 50)
      });
      
      console.log('🐛 [DetectionStage] Context:', {
        subMode: context.subMode,
        topic: context.topic,
        contextKeys: Object.keys(context),
        messageExtracted: message.substring(0, 50)
      });
      
      // Check conversation history first to detect ongoing conversations
      let isOngoingConversation = false;
      let previousChannel = null;
      let previousTopic = null;
      
      const conversationHistory = context.conversationHistory || [];
      if (conversationHistory.length > 0) {
        // Check if previous messages were about specific topics
        const recentMessages = conversationHistory.slice(-3); // Look at last 3 messages
        for (const msg of recentMessages) {
          const msgText = msg.content?.toLowerCase() || '';
          
          // Direct mail detection
          if (msgText.includes('postcard') || msgText.includes('direct mail') || msgText.includes('mailer')) {
            isOngoingConversation = true;
            previousChannel = 'direct_mail';
            previousTopic = 'directMail';
            this.log('info', 'Detected ongoing direct mail conversation from history');
            break;
          }
          // Add other channel detections as needed
        }
      }
      
      // Detect marketing context
      const contextAnalysis = await this.contextDetector.detectMarketingContext(message);
      
      this.log('info', 'Context analysis complete', {
        primaryContext: contextAnalysis.primaryContext,
        confidence: contextAnalysis.confidence,
        intent: contextAnalysis.intent,
        isOngoingConversation,
        previousChannel
      });
      
      // If we're in an ongoing conversation, use the previous channel/topic
      // Also check if subMode was already detected and passed in context
      const topic = isOngoingConversation ? previousTopic : 
                   (context.subMode === 'directMail' ? 'directMail' : 
                    contextAnalysis.primaryContext || context.topic || context.subMode || 'general');
      const channel = isOngoingConversation ? previousChannel : this.expertiseProfiles.mapTopicToChannel(topic);
      
      // Detect additional patterns
      const patterns = this.detectPatterns(message);
      
      // Create enriched context
      const enrichedContext = {
        ...context,
        detected: {
          topic,
          channel,
          intent: contextAnalysis.intent,
          confidence: contextAnalysis.confidence,
          entities: contextAnalysis.entities || [],
          patterns,
          keywords: this.extractKeywords(message),
          sentiment: this.detectSentiment(message)
        }
      };
      
      // Create response with detection metadata - always create new one without user message as content
      const response = new CMOResponse({
        content: '', // Never set content to the user's message
        source: 'detection',
        metadata: {
          context: enrichedContext.detected,
          originalMessage: message // Store the original message in metadata instead
        }
      });
      
      // Add detected context to the pipeline context
      Object.assign(context, enrichedContext.detected);
      context.detected = enrichedContext.detected;
      
      this.metrics.processed++;
      this.metrics.totalTime += Date.now() - startTime;
      
      return response;
      
    } catch (error) {
      this.log('error', 'Detection failed', error);
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Detect specific patterns in the message
   */
  detectPatterns(message) {
    const patterns = {
      hasQuestion: /\?|how|what|when|where|why|which/i.test(message),
      hasUrgency: /urgent|asap|immediately|today|now|quick/i.test(message),
      hasBudget: /\$|budget|cost|price|expense|afford/i.test(message),
      hasTimeline: /deadline|by|until|before|timeline|schedule/i.test(message),
      hasComparison: /vs|versus|compare|better|best|difference/i.test(message),
      hasProblem: /issue|problem|challenge|struggle|difficult|help/i.test(message),
      hasGoal: /goal|objective|target|achieve|increase|improve/i.test(message)
    };
    
    return Object.entries(patterns)
      .filter(([_, value]) => value)
      .map(([pattern, _]) => pattern);
  }

  /**
   * Extract keywords from message
   */
  extractKeywords(message) {
    // Simple keyword extraction - in production, use NLP library
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but',
      'in', 'with', 'to', 'for', 'of', 'as', 'by', 'that', 'this',
      'it', 'from', 'be', 'are', 'was', 'were', 'been'
    ]);
    
    const words = message.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));
    
    // Count frequency
    const frequency = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });
    
    // Return top keywords
    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  /**
   * Simple sentiment detection
   */
  detectSentiment(message) {
    const positive = /great|excellent|love|amazing|fantastic|good|helpful|thank/i;
    const negative = /bad|terrible|hate|awful|horrible|problem|issue|wrong/i;
    const neutral = /okay|fine|alright|maybe|perhaps/i;
    
    if (negative.test(message)) return 'negative';
    if (positive.test(message)) return 'positive';
    if (neutral.test(message)) return 'neutral';
    return 'neutral';
  }
}

export default DetectionStage;