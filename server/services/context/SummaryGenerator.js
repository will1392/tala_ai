/**
 * SummaryGenerator - Intelligent Conversation Summarization for Tala AI
 * 
 * Generates concise, context-aware summaries of conversations
 * with different styles and focus areas.
 */

import OpenAI from 'openai';

export class SummaryGenerator {
  constructor(options = {}) {
    this.options = {
      // Summary styles
      styles: {
        concise: {
          maxLength: 150,
          focus: 'key decisions and outcomes',
          includeDetails: false
        },
        comprehensive: {
          maxLength: 500,
          focus: 'all important information',
          includeDetails: true
        },
        bullets: {
          maxLength: 300,
          focus: 'action items and decisions',
          format: 'bullet points'
        },
        timeline: {
          maxLength: 400,
          focus: 'chronological progression',
          format: 'timeline'
        }
      },
      
      // Default LLM settings
      model: options.model || 'gpt-4o-mini',
      temperature: options.temperature || 0.3,
      maxTokens: options.maxTokens || 500,
      
      // Summary components
      includeComponents: {
        decisions: true,
        preferences: true,
        constraints: true,
        nextSteps: true,
        openQuestions: true,
        ...options.includeComponents
      },
      
      // Travel-specific focus
      travelFocus: {
        destinations: true,
        dates: true,
        budget: true,
        companions: true,
        activities: true,
        accommodations: true
      },
      
      ...options
    };
    
    // Initialize OpenAI client if API key provided
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
    }
    
    this.initialized = false;
  }

  /**
   * Initialize the summary generator
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      console.log('📝 Initializing SummaryGenerator...');
      
      // Verify OpenAI connection if available
      if (this.openai) {
        try {
          await this.openai.models.list();
          console.log('✅ OpenAI connection verified');
        } catch (error) {
          console.warn('⚠️  OpenAI connection failed, will use fallback summarization');
          this.openai = null;
        }
      }
      
      this.initialized = true;
      console.log('✅ SummaryGenerator initialized successfully');
      
    } catch (error) {
      console.error('❌ SummaryGenerator initialization failed:', error);
      throw error;
    }
  }

  /**
   * Generate summary for messages
   * @param {Array} messages - Messages to summarize
   * @param {Object} options - Summary options
   * @returns {Object} Generated summary
   */
  async generateSummary(messages, options = {}) {
    try {
      this.ensureInitialized();
      
      const style = options.style || 'comprehensive';
      const maxLength = options.maxLength || this.options.styles[style]?.maxLength || 300;
      const keyPoints = options.keyPoints || {};
      
      console.log(`📝 Generating ${style} summary for ${messages.length} messages`);
      
      // Use LLM if available, otherwise fallback
      let summary;
      if (this.openai && messages.length > 3) {
        summary = await this.generateLLMSummary(messages, style, maxLength, keyPoints, options);
      } else {
        summary = await this.generateFallbackSummary(messages, style, maxLength, keyPoints, options);
      }
      
      return {
        text: summary,
        style,
        messageCount: messages.length,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Failed to generate summary:', error);
      return {
        text: this.generateErrorSummary(messages),
        error: error.message
      };
    }
  }

  /**
   * Generate summary using LLM
   */
  async generateLLMSummary(messages, style, maxLength, keyPoints, options) {
    try {
      const prompt = this.buildLLMPrompt(messages, style, maxLength, keyPoints, options);
      
      const response = await this.openai.chat.completions.create({
        model: this.options.model,
        messages: [
          {
            role: 'system',
            content: 'You are a travel planning assistant that creates clear, concise summaries of travel conversations. Focus on key decisions, preferences, and important details.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: this.options.temperature,
        max_tokens: this.options.maxTokens
      });
      
      return response.choices[0].message.content.trim();
      
    } catch (error) {
      console.warn('⚠️  LLM summary failed, using fallback:', error.message);
      return this.generateFallbackSummary(messages, style, maxLength, keyPoints, options);
    }
  }

  /**
   * Build prompt for LLM summarization
   */
  buildLLMPrompt(messages, style, maxLength, keyPoints, options) {
    const styleConfig = this.options.styles[style];
    let prompt = `Summarize this travel planning conversation in ${Math.floor(maxLength / 5)} words or less.\n\n`;
    
    // Add style-specific instructions
    switch (style) {
      case 'concise':
        prompt += 'Focus only on final decisions and key outcomes. Be extremely brief.\n';
        break;
      case 'comprehensive':
        prompt += 'Include all important details: destinations, dates, budget, preferences, and decisions.\n';
        break;
      case 'bullets':
        prompt += 'Format as bullet points. Include:\n- Key decisions\n- Important preferences\n- Budget/constraints\n- Next steps\n';
        break;
      case 'timeline':
        prompt += 'Format as a chronological timeline showing the progression of planning.\n';
        break;
    }
    
    // Add key points if provided
    if (keyPoints.decisions?.length > 0) {
      prompt += `\nKey decisions made: ${keyPoints.decisions.slice(0, 3).map(d => d.content).join('; ')}\n`;
    }
    
    // Add conversation context
    prompt += '\nConversation:\n';
    messages.forEach(msg => {
      const role = msg.role === 'user' ? 'Traveler' : 'Assistant';
      prompt += `${role}: ${msg.content.substring(0, 200)}...\n`;
    });
    
    // Add specific focus areas
    if (options.includePlanning) {
      prompt += '\nEmphasize any future planning or next steps discussed.';
    }
    
    if (options.includeTimeline) {
      prompt += '\nInclude relevant dates and timeline information.';
    }
    
    return prompt;
  }

  /**
   * Generate fallback summary without LLM
   */
  async generateFallbackSummary(messages, style, maxLength, keyPoints, options) {
    const components = [];
    
    // Extract basic information
    const info = this.extractBasicInfo(messages);
    
    // Build summary based on style
    switch (style) {
      case 'concise':
        return this.buildConciseSummary(info, keyPoints, maxLength);
        
      case 'comprehensive':
        return this.buildComprehensiveSummary(info, keyPoints, maxLength);
        
      case 'bullets':
        return this.buildBulletSummary(info, keyPoints, maxLength);
        
      case 'timeline':
        return this.buildTimelineSummary(messages, info, keyPoints, maxLength);
        
      default:
        return this.buildConciseSummary(info, keyPoints, maxLength);
    }
  }

  /**
   * Extract basic information from messages
   */
  extractBasicInfo(messages) {
    const info = {
      destinations: new Set(),
      dates: new Set(),
      budget: null,
      preferences: [],
      constraints: [],
      decisions: [],
      questions: []
    };
    
    messages.forEach(msg => {
      const content = msg.content.toLowerCase();
      
      // Extract destinations
      const destinations = msg.content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
      destinations.forEach(dest => {
        if (!this.isCommonWord(dest)) {
          info.destinations.add(dest);
        }
      });
      
      // Extract dates
      const dates = msg.content.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:,?\s+\d{4})?\b/gi) || [];
      dates.forEach(date => info.dates.add(date));
      
      // Extract budget
      const budget = msg.content.match(/\$[\d,]+/);
      if (budget && !info.budget) {
        info.budget = budget[0];
      }
      
      // Extract preferences
      if (content.includes('prefer') || content.includes('like') || content.includes('want')) {
        info.preferences.push(this.extractPreference(msg.content));
      }
      
      // Extract constraints
      if (content.includes('budget') || content.includes('limit') || content.includes('must')) {
        info.constraints.push(this.extractConstraint(msg.content));
      }
      
      // Extract decisions
      if (content.includes('decided') || content.includes('will') || content.includes('let\'s')) {
        info.decisions.push(msg.content.substring(0, 100));
      }
      
      // Extract questions
      if (msg.role === 'user' && msg.content.includes('?')) {
        info.questions.push(msg.content);
      }
    });
    
    return info;
  }

  /**
   * Build concise summary
   */
  buildConciseSummary(info, keyPoints, maxLength) {
    const parts = [];
    
    // Destinations
    if (info.destinations.size > 0) {
      parts.push(`Planning trip to ${Array.from(info.destinations).slice(0, 3).join(', ')}`);
    }
    
    // Dates
    if (info.dates.size > 0) {
      parts.push(`for ${Array.from(info.dates)[0]}`);
    }
    
    // Budget
    if (info.budget) {
      parts.push(`with budget of ${info.budget}`);
    }
    
    // Key decisions
    if (keyPoints.decisions?.length > 0) {
      parts.push(`Decided: ${keyPoints.decisions[0].content.substring(0, 50)}`);
    }
    
    const summary = parts.join('. ') + '.';
    return summary.substring(0, maxLength);
  }

  /**
   * Build comprehensive summary
   */
  buildComprehensiveSummary(info, keyPoints, maxLength) {
    const sections = [];
    
    // Overview
    const destinations = Array.from(info.destinations).slice(0, 5);
    if (destinations.length > 0) {
      sections.push(`Trip planning for ${destinations.join(', ')}`);
    }
    
    // Timeline
    if (info.dates.size > 0) {
      sections.push(`Dates: ${Array.from(info.dates).join(', ')}`);
    }
    
    // Budget
    if (info.budget) {
      sections.push(`Budget: ${info.budget}`);
    }
    
    // Preferences
    if (info.preferences.length > 0) {
      sections.push(`Preferences: ${info.preferences.slice(0, 3).join('; ')}`);
    }
    
    // Constraints
    if (info.constraints.length > 0) {
      sections.push(`Constraints: ${info.constraints.slice(0, 2).join('; ')}`);
    }
    
    // Decisions
    if (keyPoints.decisions?.length > 0) {
      const decisions = keyPoints.decisions.slice(0, 3).map(d => 
        d.content.substring(0, 80)
      );
      sections.push(`Key decisions: ${decisions.join('; ')}`);
    }
    
    // Open questions
    if (keyPoints.questions?.length > 0) {
      sections.push(`Open questions: ${keyPoints.questions.length} pending`);
    }
    
    const summary = sections.join('. ') + '.';
    return summary.substring(0, maxLength);
  }

  /**
   * Build bullet point summary
   */
  buildBulletSummary(info, keyPoints, maxLength) {
    const bullets = [];
    
    // Destinations
    if (info.destinations.size > 0) {
      bullets.push(`• Destinations: ${Array.from(info.destinations).join(', ')}`);
    }
    
    // Dates & Duration
    if (info.dates.size > 0) {
      bullets.push(`• Dates: ${Array.from(info.dates).join(', ')}`);
    }
    
    // Budget
    if (info.budget) {
      bullets.push(`• Budget: ${info.budget}`);
    }
    
    // Key decisions
    if (keyPoints.decisions?.length > 0) {
      bullets.push('• Decisions made:');
      keyPoints.decisions.slice(0, 3).forEach(decision => {
        bullets.push(`  - ${decision.content.substring(0, 60)}`);
      });
    }
    
    // Preferences
    if (info.preferences.length > 0) {
      bullets.push('• Preferences:');
      info.preferences.slice(0, 3).forEach(pref => {
        bullets.push(`  - ${pref.substring(0, 60)}`);
      });
    }
    
    // Next steps
    if (keyPoints.questions?.length > 0) {
      bullets.push(`• Pending: ${keyPoints.questions.length} items to resolve`);
    }
    
    const summary = bullets.join('\n');
    return summary.substring(0, maxLength);
  }

  /**
   * Build timeline summary
   */
  buildTimelineSummary(messages, info, keyPoints, maxLength) {
    const timeline = [];
    let currentPhase = 'Initial Planning';
    
    // Group messages by phase
    const phases = this.identifyPlanningPhases(messages);
    
    phases.forEach((phase, index) => {
      const phaseInfo = [];
      
      // Add destinations discussed
      const destinations = phase.destinations.size > 0 ? 
        Array.from(phase.destinations).join(', ') : null;
      if (destinations) {
        phaseInfo.push(`Discussed: ${destinations}`);
      }
      
      // Add decisions
      if (phase.decisions.length > 0) {
        phaseInfo.push(`Decided: ${phase.decisions[0].substring(0, 50)}`);
      }
      
      if (phaseInfo.length > 0) {
        timeline.push(`${index + 1}. ${phase.name}: ${phaseInfo.join('; ')}`);
      }
    });
    
    // Add current status
    if (info.destinations.size > 0) {
      timeline.push(`Current focus: ${Array.from(info.destinations).slice(-1)[0]}`);
    }
    
    const summary = timeline.join('\n');
    return summary.substring(0, maxLength);
  }

  /**
   * Identify planning phases in conversation
   */
  identifyPlanningPhases(messages) {
    const phases = [];
    let currentPhase = {
      name: 'Initial Planning',
      messages: [],
      destinations: new Set(),
      decisions: []
    };
    
    messages.forEach((msg, index) => {
      currentPhase.messages.push(msg);
      
      // Extract destinations for this phase
      const destinations = msg.content.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
      destinations.forEach(dest => {
        if (!this.isCommonWord(dest)) {
          currentPhase.destinations.add(dest);
        }
      });
      
      // Check for phase transitions
      const content = msg.content.toLowerCase();
      if (content.includes('what if') || content.includes('alternatively') || 
          content.includes('instead')) {
        // Start new phase
        if (currentPhase.messages.length > 1) {
          phases.push(currentPhase);
          currentPhase = {
            name: 'Alternative Option',
            messages: [],
            destinations: new Set(),
            decisions: []
          };
        }
      }
      
      // Track decisions
      if (content.includes('decided') || content.includes('let\'s go with')) {
        currentPhase.decisions.push(msg.content);
        currentPhase.name = 'Decision Made';
      }
    });
    
    // Add final phase
    if (currentPhase.messages.length > 0) {
      phases.push(currentPhase);
    }
    
    return phases;
  }

  /**
   * Extract preference from content
   */
  extractPreference(content) {
    const patterns = [
      /(?:prefer|like|want|love)\s+(.{20,60})/i,
      /(?:would rather|instead of)\s+(.{20,60})/i
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1].trim().replace(/[.,!?]$/, '');
      }
    }
    
    return content.substring(0, 60);
  }

  /**
   * Extract constraint from content
   */
  extractConstraint(content) {
    const patterns = [
      /(?:budget|limit|maximum)\s+(?:is|of)\s+(.{10,50})/i,
      /(?:must|need to|have to)\s+(.{20,60})/i
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1].trim().replace(/[.,!?]$/, '');
      }
    }
    
    return content.substring(0, 60);
  }

  /**
   * Check if word is common
   */
  isCommonWord(word) {
    const commonWords = [
      'The', 'This', 'That', 'What', 'Where', 'When', 'Why', 'How',
      'Yes', 'No', 'Maybe', 'Please', 'Thank', 'Thanks', 'Hello', 'Hi'
    ];
    return commonWords.includes(word);
  }

  /**
   * Generate error fallback summary
   */
  generateErrorSummary(messages) {
    if (messages.length === 0) {
      return 'No messages to summarize.';
    }
    
    const msgCount = messages.length;
    const userMsgs = messages.filter(m => m.role === 'user').length;
    
    return `Conversation with ${msgCount} messages (${userMsgs} from user). Unable to generate detailed summary.`;
  }

  /**
   * Generate progressive summary (for long conversations)
   * @param {Array} chunks - Message chunks
   * @param {Object} options - Summary options
   * @returns {Object} Progressive summary
   */
  async generateProgressiveSummary(chunks, options = {}) {
    try {
      const summaries = [];
      let runningContext = '';
      
      for (const [index, chunk] of chunks.entries()) {
        console.log(`📝 Generating summary for chunk ${index + 1}/${chunks.length}`);
        
        // Include context from previous summaries
        const messagesWithContext = runningContext ? 
          [{ role: 'system', content: `Previous context: ${runningContext}` }, ...chunk] : 
          chunk;
        
        const summary = await this.generateSummary(messagesWithContext, {
          style: 'concise',
          maxLength: 200,
          ...options
        });
        
        summaries.push(summary);
        
        // Update running context
        runningContext = summary.text;
      }
      
      // Generate final consolidated summary
      const finalSummary = await this.consolidateSummaries(summaries, options);
      
      return {
        chunkSummaries: summaries,
        finalSummary,
        totalMessages: chunks.reduce((sum, chunk) => sum + chunk.length, 0)
      };
      
    } catch (error) {
      console.error('❌ Failed to generate progressive summary:', error);
      throw error;
    }
  }

  /**
   * Consolidate multiple summaries
   */
  async consolidateSummaries(summaries, options = {}) {
    const consolidated = {
      destinations: new Set(),
      dates: new Set(),
      budget: null,
      keyDecisions: [],
      mainThemes: []
    };
    
    // Extract information from all summaries
    summaries.forEach(summary => {
      const text = summary.text;
      
      // Extract destinations
      const destinations = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
      destinations.forEach(dest => {
        if (!this.isCommonWord(dest)) {
          consolidated.destinations.add(dest);
        }
      });
      
      // Extract budget if mentioned
      const budget = text.match(/\$[\d,]+/);
      if (budget && !consolidated.budget) {
        consolidated.budget = budget[0];
      }
    });
    
    // Build final summary
    const parts = [];
    
    if (consolidated.destinations.size > 0) {
      parts.push(`Trip planning covering ${Array.from(consolidated.destinations).join(', ')}`);
    }
    
    if (consolidated.budget) {
      parts.push(`with budget of ${consolidated.budget}`);
    }
    
    parts.push(`across ${summaries.length} conversation segments`);
    
    return {
      text: parts.join(' '),
      metadata: consolidated
    };
  }

  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('SummaryGenerator not initialized. Call initialize() first.');
    }
  }
}

export default SummaryGenerator;