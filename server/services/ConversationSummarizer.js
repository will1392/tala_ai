/**
 * Conversation Summarizer Service
 * 
 * Handles intelligent conversation summarization to prevent token overflow
 * in long chat sessions while preserving important context.
 */

class ConversationSummarizer {
  constructor() {
    this.MAX_HISTORY_MESSAGES = 10;
    this.SUMMARY_TRIGGER_THRESHOLD = 20;
    this.MAX_SUMMARY_LENGTH = 500;
  }

  /**
   * Process conversation history with intelligent pruning
   */
  async processConversationHistory(conversationHistory, openaiClient) {
    if (!conversationHistory || conversationHistory.length <= this.SUMMARY_TRIGGER_THRESHOLD) {
      // No need to summarize yet
      return conversationHistory;
    }

    console.log(`📝 Conversation has ${conversationHistory.length} messages - summarizing older messages...`);

    try {
      // Split messages into older (to summarize) and recent (to keep)
      const olderMessages = conversationHistory.slice(0, -this.MAX_HISTORY_MESSAGES);
      const recentMessages = conversationHistory.slice(-this.MAX_HISTORY_MESSAGES);

      // Generate summary of older messages
      const summary = await this.summarizeMessages(olderMessages, openaiClient);

      // Create new conversation history with summary + recent messages
      const processedHistory = [
        {
          role: 'system',
          content: summary,
          sender: 'system',
          timestamp: olderMessages[0]?.timestamp || new Date(),
          metadata: {
            type: 'conversation_summary',
            messagesCount: olderMessages.length,
            originalStart: olderMessages[0]?.timestamp,
            originalEnd: olderMessages[olderMessages.length - 1]?.timestamp
          }
        },
        ...recentMessages
      ];

      console.log(`✅ Summarized ${olderMessages.length} messages into ${summary.length} chars`);
      console.log(`📊 New history: 1 summary + ${recentMessages.length} recent messages`);

      return processedHistory;
    } catch (error) {
      console.error('❌ Failed to summarize conversation:', error);
      // Fallback: just return the most recent messages
      return conversationHistory.slice(-this.MAX_HISTORY_MESSAGES);
    }
  }

  /**
   * Generate intelligent summary of messages
   */
  async summarizeMessages(messages, openaiClient) {
    // Extract key information from messages
    const conversationText = messages.map(msg => {
      const role = msg.sender === 'user' ? 'User' : 'Assistant';
      return `${role}: ${msg.content}`;
    }).join('\n');

    // Create summarization prompt
    const prompt = `Please create a concise summary of this conversation history. 
Focus on:
1. Main topics discussed
2. Key decisions or preferences expressed by the user
3. Important information or recommendations provided
4. Any unresolved questions or ongoing discussions

Keep the summary under ${this.MAX_SUMMARY_LENGTH} characters.

Conversation:
${conversationText}`;

    try {
      const completion = await openaiClient.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a conversation summarizer. Create concise, informative summaries that preserve key context.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      });

      const summary = completion.choices[0].message.content;
      return `Previous conversation summary: ${summary}`;
    } catch (error) {
      console.error('❌ OpenAI summarization failed:', error);
      // Fallback: create a basic summary
      return this.createBasicSummary(messages);
    }
  }

  /**
   * Create basic summary without AI (fallback)
   */
  createBasicSummary(messages) {
    const topics = new Set();
    const destinations = new Set();
    
    messages.forEach(msg => {
      const content = msg.content.toLowerCase();
      
      // Extract destinations
      const destinationPatterns = [
        /\b(greece|spain|france|iceland|portugal|italy|england)\b/gi,
        /\b(athens|santorini|madrid|barcelona|paris|reykjavik|lisbon|rome|london)\b/gi
      ];
      
      destinationPatterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
          matches.forEach(match => destinations.add(match.toLowerCase()));
        }
      });
      
      // Extract topics
      if (content.includes('hotel') || content.includes('accommodation')) topics.add('accommodation');
      if (content.includes('flight') || content.includes('transport')) topics.add('transportation');
      if (content.includes('restaurant') || content.includes('food')) topics.add('dining');
      if (content.includes('activity') || content.includes('attraction')) topics.add('activities');
    });
    
    const summary = `Previous conversation summary: Discussed ${messages.length} messages`;
    const topicsList = Array.from(topics).join(', ');
    const destList = Array.from(destinations).join(', ');
    
    let fullSummary = summary;
    if (destList) fullSummary += ` about ${destList}`;
    if (topicsList) fullSummary += ` covering ${topicsList}`;
    
    return fullSummary + '.';
  }

  /**
   * Check if conversation needs pruning
   */
  needsPruning(conversationHistory) {
    return conversationHistory && conversationHistory.length > this.SUMMARY_TRIGGER_THRESHOLD;
  }

  /**
   * Get conversation metrics
   */
  getConversationMetrics(conversationHistory) {
    if (!conversationHistory || conversationHistory.length === 0) {
      return {
        totalMessages: 0,
        estimatedTokens: 0,
        needsPruning: false,
        pruningRecommended: false
      };
    }

    // Estimate tokens (rough approximation: 1 token ≈ 4 characters)
    const estimatedTokens = conversationHistory.reduce((total, msg) => {
      return total + Math.ceil((msg.content?.length || 0) / 4);
    }, 0);

    return {
      totalMessages: conversationHistory.length,
      estimatedTokens,
      needsPruning: this.needsPruning(conversationHistory),
      pruningRecommended: estimatedTokens > 6000 || conversationHistory.length > 30,
      summaryWouldSave: Math.max(0, estimatedTokens - 2000) // Estimated savings
    };
  }
}

export default ConversationSummarizer;