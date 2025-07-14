/**
 * BranchDetector - Intelligent Branch Point Detection for Tala AI
 * 
 * Identifies natural branch points in conversations, detects major decision points,
 * and suggests branch creation to help users explore alternative travel options.
 */

import OpenAI from 'openai';

export class BranchDetector {
  constructor(options = {}) {
    this.options = {
      enableLLMDetection: options.enableLLMDetection !== false,
      enablePatternDetection: options.enablePatternDetection !== false,
      enableAutoSuggestions: options.enableAutoSuggestions !== false,
      minConfidenceThreshold: options.minConfidenceThreshold || 0.7,
      recentMessageWindow: options.recentMessageWindow || 10,
      ...options
    };
    
    // Initialize OpenAI if LLM detection is enabled
    if (this.options.enableLLMDetection) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
    
    // Branch point patterns
    this.branchPatterns = {
      alternatives: [
        /what if (?:we|i) (?:went|go|visit|stayed|tried)/i,
        /(?:instead of|rather than) .+ (?:could|should|might) (?:we|i)/i,
        /(?:or|alternatively) (?:we|i) could/i,
        /another option (?:would be|is|might be)/i,
        /(?:maybe|perhaps) (?:we|i) should consider/i
      ],
      
      comparisons: [
        /(?:compare|comparing) .+ (?:with|to|versus|vs)/i,
        /which (?:is|would be) better/i,
        /(?:pros and cons|advantages and disadvantages) of/i,
        /(?:between|among) .+ (?:which|what)/i
      ],
      
      decisions: [
        /(?:i'm|we're) (?:torn|undecided|unsure) between/i,
        /(?:can't|cannot) decide (?:between|whether)/i,
        /(?:should|shall) (?:we|i) (?:go with|choose)/i,
        /(?:leaning towards|considering|thinking about)/i,
        /(?:on the fence|not sure) about/i
      ],
      
      explorations: [
        /let's (?:explore|look into|research|check out)/i,
        /what (?:are|about) (?:the|our|my) options for/i,
        /(?:show me|tell me about) alternatives/i,
        /(?:other|different) (?:routes|itineraries|plans)/i
      ],
      
      budgetChanges: [
        /if (?:we|i) (?:had|have) (?:more|less|a different) budget/i,
        /(?:cheaper|more expensive|luxury|budget) (?:option|alternative)/i,
        /(?:save|spend) (?:more|less) (?:on|by)/i,
        /(?:within|under|over) budget/i
      ],
      
      timeChanges: [
        /if (?:we|i) (?:had|have) (?:more|less|extra) (?:time|days)/i,
        /(?:shorter|longer|extended) (?:trip|stay|vacation)/i,
        /(?:add|remove|skip) (?:a day|days|time) (?:in|from)/i,
        /(?:rush|take our time|slow down)/i
      ]
    };
    
    // Decision keywords and phrases
    this.decisionKeywords = {
      destinations: ['paris', 'rome', 'london', 'tokyo', 'barcelona', 'amsterdam', 'berlin'],
      accommodations: ['hotel', 'airbnb', 'hostel', 'resort', 'villa', 'apartment'],
      transportation: ['flight', 'train', 'car', 'bus', 'cruise', 'drive', 'fly'],
      activities: ['tour', 'museum', 'restaurant', 'beach', 'hiking', 'shopping', 'nightlife'],
      timing: ['morning', 'afternoon', 'evening', 'early', 'late', 'weekend', 'weekday']
    };
    
    this.initialized = false;
  }

  /**
   * Initialize the branch detector
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      console.log('🔍 Initializing BranchDetector...');
      
      // Test LLM connection if enabled
      if (this.options.enableLLMDetection && this.openai) {
        await this.testLLMConnection();
      }
      
      this.initialized = true;
      console.log('✅ BranchDetector initialized successfully');
      
    } catch (error) {
      console.error('❌ BranchDetector initialization failed:', error);
      // Continue without LLM if it fails
      this.options.enableLLMDetection = false;
      this.initialized = true;
    }
  }

  /**
   * Analyze messages for branch points
   * @param {Array} messages - Recent messages to analyze
   * @param {Object} context - Conversation context
   * @returns {Object} Branch point analysis
   */
  async analyzeBranchPoints(messages, context = {}) {
    try {
      this.ensureInitialized();
      
      if (!Array.isArray(messages) || messages.length === 0) {
        return {
          success: true,
          branchPoints: [],
          suggestions: []
        };
      }
      
      console.log(`🔍 Analyzing ${messages.length} messages for branch points`);
      
      const analysis = {
        branchPoints: [],
        suggestions: [],
        decisionPoints: [],
        confidence: 0
      };
      
      // Pattern-based detection
      if (this.options.enablePatternDetection) {
        const patternResults = this.detectPatternsInMessages(messages);
        analysis.branchPoints.push(...patternResults.branchPoints);
        analysis.decisionPoints.push(...patternResults.decisionPoints);
      }
      
      // LLM-based detection for more nuanced understanding
      if (this.options.enableLLMDetection && messages.length <= 20) {
        const llmResults = await this.detectWithLLM(messages, context);
        if (llmResults.success) {
          analysis.branchPoints.push(...llmResults.branchPoints);
          analysis.suggestions.push(...llmResults.suggestions);
        }
      }
      
      // Deduplicate and sort by confidence
      analysis.branchPoints = this.deduplicateBranchPoints(analysis.branchPoints);
      analysis.suggestions = this.generateSuggestions(analysis.branchPoints, messages, context);
      
      // Calculate overall confidence
      if (analysis.branchPoints.length > 0) {
        analysis.confidence = analysis.branchPoints.reduce((sum, bp) => sum + bp.confidence, 0) / analysis.branchPoints.length;
      }
      
      return {
        success: true,
        ...analysis
      };
      
    } catch (error) {
      console.error('❌ Failed to analyze branch points:', error);
      return {
        success: false,
        error: error.message,
        branchPoints: [],
        suggestions: []
      };
    }
  }

  /**
   * Detect major decision points in conversation
   * @param {Array} messages - Messages to analyze
   * @returns {Array} Decision points
   */
  detectDecisionPoints(messages) {
    const decisionPoints = [];
    
    messages.forEach((message, index) => {
      if (message.role !== 'user') return;
      
      const content = message.content.toLowerCase();
      let isDecisionPoint = false;
      let decisionType = null;
      let options = [];
      
      // Check for decision patterns
      for (const [type, patterns] of Object.entries(this.branchPatterns)) {
        if (patterns.some(pattern => pattern.test(content))) {
          isDecisionPoint = true;
          decisionType = type;
          break;
        }
      }
      
      // Extract mentioned options
      if (isDecisionPoint) {
        options = this.extractOptions(content);
        
        decisionPoints.push({
          messageId: message.id,
          messageIndex: index,
          content: message.content,
          type: decisionType,
          options,
          confidence: this.calculateDecisionConfidence(content, options),
          timestamp: message.created_at || message.createdAt
        });
      }
    });
    
    return decisionPoints;
  }

  /**
   * Suggest branch creation based on conversation flow
   * @param {Array} messages - Recent messages
   * @param {Object} context - Conversation context
   * @returns {Array} Branch suggestions
   */
  async suggestBranches(messages, context = {}) {
    try {
      const analysis = await this.analyzeBranchPoints(messages, context);
      
      if (!analysis.success) {
        return [];
      }
      
      const suggestions = [];
      
      // Generate suggestions based on branch points
      analysis.branchPoints.forEach(branchPoint => {
        if (branchPoint.confidence >= this.options.minConfidenceThreshold) {
          suggestions.push({
            messageId: branchPoint.messageId,
            reason: branchPoint.reason,
            type: branchPoint.type,
            suggestedAction: this.generateBranchAction(branchPoint),
            confidence: branchPoint.confidence,
            options: branchPoint.options || []
          });
        }
      });
      
      // Add proactive suggestions based on conversation patterns
      if (this.options.enableAutoSuggestions) {
        const proactiveSuggestions = this.generateProactiveSuggestions(messages, context);
        suggestions.push(...proactiveSuggestions);
      }
      
      return suggestions;
      
    } catch (error) {
      console.error('Error suggesting branches:', error);
      return [];
    }
  }

  /**
   * Track decision paths across threads
   * @param {Object} conversationTree - Conversation tree structure
   * @returns {Object} Decision path analysis
   */
  trackDecisionPaths(conversationTree) {
    const paths = {
      totalPaths: 0,
      decisions: [],
      outcomes: {},
      popularChoices: {}
    };
    
    function traverseTree(node, currentPath = []) {
      // Record decision if this is a branch point
      if (node.metadata?.branch_reason) {
        paths.decisions.push({
          nodeId: node.id,
          decision: node.metadata.branch_reason,
          path: [...currentPath],
          outcome: node.summary || 'In progress'
        });
      }
      
      // Continue traversing
      if (node.children && node.children.length > 0) {
        node.children.forEach(child => {
          traverseTree(child, [...currentPath, node.id]);
        });
      } else {
        // Leaf node - complete path
        paths.totalPaths++;
      }
    }
    
    traverseTree(conversationTree);
    
    // Analyze popular choices
    paths.decisions.forEach(decision => {
      const key = decision.decision.toLowerCase();
      paths.popularChoices[key] = (paths.popularChoices[key] || 0) + 1;
    });
    
    return paths;
  }

  // Helper methods

  detectPatternsInMessages(messages) {
    const results = {
      branchPoints: [],
      decisionPoints: []
    };
    
    messages.forEach((message, index) => {
      if (message.role !== 'user') return;
      
      const content = message.content;
      const lowerContent = content.toLowerCase();
      
      // Check each pattern category
      Object.entries(this.branchPatterns).forEach(([category, patterns]) => {
        patterns.forEach(pattern => {
          if (pattern.test(content)) {
            const branchPoint = {
              messageId: message.id,
              messageIndex: index,
              type: category,
              pattern: pattern.source,
              content: content,
              reason: this.generateBranchReason(category, content),
              confidence: this.calculatePatternConfidence(category, content),
              timestamp: message.created_at || message.createdAt
            };
            
            // Extract specific options if mentioned
            branchPoint.options = this.extractOptions(content);
            
            results.branchPoints.push(branchPoint);
            
            // Also mark as decision point if applicable
            if (['decisions', 'comparisons'].includes(category)) {
              results.decisionPoints.push(branchPoint);
            }
          }
        });
      });
    });
    
    return results;
  }

  async detectWithLLM(messages, context) {
    if (!this.openai) {
      return { success: false, branchPoints: [], suggestions: [] };
    }
    
    try {
      const conversationText = messages
        .slice(-this.options.recentMessageWindow)
        .map(m => `${m.role}: ${m.content}`)
        .join('\n');
      
      const prompt = `
        Analyze this travel planning conversation for natural branch points where the user might want to explore alternative options.
        
        Look for:
        1. Moments of indecision or comparison
        2. Alternative suggestions or "what if" scenarios
        3. Budget or time constraint discussions
        4. Multiple options being considered
        5. Changes in preferences or requirements
        
        Conversation:
        ${conversationText}
        
        Context: ${JSON.stringify(context)}
        
        Return a JSON array of branch points with:
        {
          "messageIndex": number,
          "type": "alternatives|comparisons|decisions|explorations|budgetChanges|timeChanges",
          "reason": "Brief explanation",
          "confidence": 0.0-1.0,
          "options": ["option1", "option2"],
          "suggestedBranches": ["Branch title 1", "Branch title 2"]
        }
        
        Only return the JSON array, no other text.
      `;
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing travel planning conversations and identifying decision points where users might want to explore different options.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      });
      
      const responseText = response.choices[0]?.message?.content?.trim();
      if (!responseText) {
        return { success: false, branchPoints: [], suggestions: [] };
      }
      
      try {
        const branchPoints = JSON.parse(responseText);
        
        // Map to message IDs and add metadata
        const enhancedBranchPoints = branchPoints.map(bp => ({
          ...bp,
          messageId: messages[bp.messageIndex]?.id,
          content: messages[bp.messageIndex]?.content,
          timestamp: messages[bp.messageIndex]?.created_at || messages[bp.messageIndex]?.createdAt
        }));
        
        return {
          success: true,
          branchPoints: enhancedBranchPoints,
          suggestions: enhancedBranchPoints
            .filter(bp => bp.suggestedBranches && bp.suggestedBranches.length > 0)
            .map(bp => ({
              messageId: bp.messageId,
              branches: bp.suggestedBranches,
              reason: bp.reason,
              confidence: bp.confidence
            }))
        };
        
      } catch (parseError) {
        console.warn('Failed to parse LLM branch detection response:', responseText);
        return { success: false, branchPoints: [], suggestions: [] };
      }
      
    } catch (error) {
      console.error('LLM branch detection error:', error);
      return { success: false, branchPoints: [], suggestions: [] };
    }
  }

  extractOptions(content) {
    const options = [];
    const lowerContent = content.toLowerCase();
    
    // Extract destinations
    Object.values(this.decisionKeywords).flat().forEach(keyword => {
      if (lowerContent.includes(keyword)) {
        options.push(keyword);
      }
    });
    
    // Extract comparisons (X vs Y, X or Y)
    const comparisonMatches = content.match(/(\w+)\s+(?:vs|versus|or)\s+(\w+)/gi);
    if (comparisonMatches) {
      comparisonMatches.forEach(match => {
        const parts = match.split(/\s+(?:vs|versus|or)\s+/i);
        options.push(...parts.map(p => p.trim()));
      });
    }
    
    // Extract quoted options
    const quotedMatches = content.match(/"([^"]+)"/g);
    if (quotedMatches) {
      options.push(...quotedMatches.map(m => m.replace(/"/g, '')));
    }
    
    return [...new Set(options)]; // Remove duplicates
  }

  generateBranchReason(category, content) {
    const reasons = {
      alternatives: 'Exploring alternative options',
      comparisons: 'Comparing different choices',
      decisions: 'Making a decision between options',
      explorations: 'Researching new possibilities',
      budgetChanges: 'Considering budget variations',
      timeChanges: 'Adjusting trip duration'
    };
    
    return reasons[category] || 'Exploring options';
  }

  calculatePatternConfidence(category, content) {
    let confidence = 0.6; // Base confidence for pattern match
    
    // Boost confidence based on category
    const categoryBoosts = {
      decisions: 0.2,
      comparisons: 0.15,
      alternatives: 0.1,
      explorations: 0.05
    };
    
    confidence += categoryBoosts[category] || 0;
    
    // Boost for multiple keywords
    const keywordCount = Object.values(this.decisionKeywords)
      .flat()
      .filter(keyword => content.toLowerCase().includes(keyword))
      .length;
    
    confidence += Math.min(0.2, keywordCount * 0.05);
    
    // Boost for question marks
    if (content.includes('?')) {
      confidence += 0.05;
    }
    
    return Math.min(0.95, confidence);
  }

  calculateDecisionConfidence(content, options) {
    let confidence = 0.5;
    
    // More options = higher confidence it's a decision point
    confidence += Math.min(0.3, options.length * 0.1);
    
    // Question marks indicate uncertainty
    const questionMarks = (content.match(/\?/g) || []).length;
    confidence += Math.min(0.1, questionMarks * 0.05);
    
    // Specific decision words
    const decisionWords = ['decide', 'choose', 'pick', 'select', 'between'];
    const hasDecisionWords = decisionWords.some(word => content.toLowerCase().includes(word));
    if (hasDecisionWords) {
      confidence += 0.1;
    }
    
    return Math.min(0.95, confidence);
  }

  generateBranchAction(branchPoint) {
    const actions = {
      alternatives: `Create branch to explore "${branchPoint.options.join('" vs "')}"`,
      comparisons: `Create comparison branches for each option`,
      decisions: `Branch to explore different choices`,
      explorations: `Create exploratory branch`,
      budgetChanges: `Create branch with adjusted budget`,
      timeChanges: `Create branch with modified duration`
    };
    
    return actions[branchPoint.type] || 'Create alternative branch';
  }

  generateSuggestions(branchPoints, messages, context) {
    const suggestions = [];
    
    // Group branch points by type
    const groupedPoints = branchPoints.reduce((acc, bp) => {
      if (!acc[bp.type]) acc[bp.type] = [];
      acc[bp.type].push(bp);
      return acc;
    }, {});
    
    // Generate suggestions for each type
    Object.entries(groupedPoints).forEach(([type, points]) => {
      if (points.length > 0 && points[0].confidence >= this.options.minConfidenceThreshold) {
        suggestions.push({
          type: 'branch_suggestion',
          category: type,
          message: this.getSuggestionMessage(type, points),
          branchPoints: points.map(p => p.messageId),
          confidence: Math.max(...points.map(p => p.confidence))
        });
      }
    });
    
    return suggestions;
  }

  getSuggestionMessage(type, points) {
    const messages = {
      alternatives: `You're considering alternatives. Would you like to explore different options in separate branches?`,
      comparisons: `You're comparing options. Create branches to explore each one in detail?`,
      decisions: `This looks like a decision point. Would you like to explore each option separately?`,
      explorations: `Ready to explore new possibilities? Create a branch to investigate further.`,
      budgetChanges: `Considering different budgets? Create branches to see how options change.`,
      timeChanges: `Thinking about trip duration? Branch to explore different itineraries.`
    };
    
    return messages[type] || 'Would you like to create a branch to explore this option?';
  }

  generateProactiveSuggestions(messages, context) {
    const suggestions = [];
    
    // Suggest branching after significant conversation length without branches
    if (messages.length > 20 && !context.hasBranches) {
      suggestions.push({
        type: 'proactive',
        reason: 'Long conversation without branches',
        message: 'Your conversation is getting detailed. Consider creating branches to explore different aspects separately.',
        confidence: 0.7
      });
    }
    
    // Suggest branching when multiple destinations mentioned
    const destinationCount = this.countMentionedDestinations(messages);
    if (destinationCount > 3) {
      suggestions.push({
        type: 'proactive',
        reason: 'Multiple destinations discussed',
        message: `You've mentioned ${destinationCount} destinations. Create branches to plan each one?`,
        confidence: 0.8
      });
    }
    
    return suggestions;
  }

  countMentionedDestinations(messages) {
    const destinations = new Set();
    
    messages.forEach(message => {
      if (message.role === 'user') {
        this.decisionKeywords.destinations.forEach(dest => {
          if (message.content.toLowerCase().includes(dest)) {
            destinations.add(dest);
          }
        });
      }
    });
    
    return destinations.size;
  }

  deduplicateBranchPoints(branchPoints) {
    const seen = new Map();
    
    return branchPoints.filter(bp => {
      const key = `${bp.messageId}-${bp.type}`;
      if (seen.has(key)) {
        // Keep the one with higher confidence
        const existing = seen.get(key);
        if (bp.confidence > existing.confidence) {
          seen.set(key, bp);
          return true;
        }
        return false;
      }
      seen.set(key, bp);
      return true;
    });
  }

  async testLLMConnection() {
    try {
      await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1
      });
    } catch (error) {
      if (!error.message.includes('quota')) {
        throw error;
      }
    }
  }

  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('BranchDetector not initialized. Call initialize() first.');
    }
  }
}

export default BranchDetector;