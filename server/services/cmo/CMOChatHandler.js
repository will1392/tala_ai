/**
 * CMOChatHandler - Handles marketing-related chat queries
 * 
 * Processes marketing questions and provides intelligent responses
 * using the CMO Knowledge Base.
 */

import { cmoKnowledgeBase } from './CMOKnowledgeBase.js';
import { cmoAssistant } from './migration/CMOCompatibilityWrapper.js';

class CMOChatHandler {
  constructor() {
    this.knowledgeBase = cmoKnowledgeBase;
    this.assistant = cmoAssistant;
    this.initialized = false;
  }

  /**
   * Initialize the handler
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      console.log('🔍 CMOChatHandler: Initializing, assistant exists?', !!this.assistant);
      await this.assistant.initialize();
      this.initialized = true;
      console.log('✅ CMO Chat Handler initialized');
    } catch (error) {
      console.error('Failed to initialize CMO Chat Handler:', error);
    }
  }

  /**
   * Process a marketing query and generate response
   */
  async processMessage(message, context = {}) {
    const { 
      conversationId, 
      userId, 
      subMode, 
      conversationHistory = [],
      includeKnowledge = true 
    } = context;
    
    try {
      console.log('🔍 CMOChatHandler: Processing message through assistant...');
      console.log('🔍 CMOChatHandler: Assistant initialized?', !!this.assistant);
      console.log('🔍 CMOChatHandler: Assistant has processQuery?', typeof this.assistant?.processQuery);
      console.log('🔍 CMOChatHandler: Assistant has processMessage?', typeof this.assistant?.processMessage);
      
      // Process query through assistant
      let assistantResponse;
      try {
        console.log('🔍 CMOChatHandler: About to call processQuery...');
        assistantResponse = await this.assistant.processQuery(message, {
          userId,
          conversationId,
          category: subMode,
          subMode: subMode,
          conversationHistory, // Pass conversationHistory explicitly
          ...context
        });
        console.log('🔍 CMOChatHandler: processQuery returned');
      } catch (processError) {
        console.error('❌ CMOChatHandler: Error calling processMessage:', processError);
        throw processError;
      }
      
      console.log('🔍 CMOChatHandler: Assistant response:', {
        hasContent: !!assistantResponse?.content,
        hasResults: !!assistantResponse?.results,
        keys: assistantResponse ? Object.keys(assistantResponse) : []
      });
      
      // Format the response
      const formattedResponse = await this.formatResponse(
        message,
        assistantResponse,
        context
      );
      
      return {
        response: formattedResponse.response,
        mode: 'cmo',
        subMode: subMode,
        knowledge: assistantResponse.results,
        suggestions: assistantResponse.suggestions,
        quickActions: this.getRelevantQuickActions(assistantResponse.queryType, subMode),
        metadata: {
          queryType: assistantResponse.queryType,
          confidence: this.calculateConfidence(assistantResponse),
          sources: formattedResponse.sources
        }
      };
      
    } catch (error) {
      console.error('Error processing CMO message:', error);
      return {
        response: this.getErrorResponse(error),
        mode: 'cmo',
        subMode: subMode,
        error: true
      };
    }
  }

  /**
   * Format response with knowledge and context
   */
  async formatResponse(query, assistantResponse, context) {
    const { results, queryType, suggestions, additionalContext } = assistantResponse;
    const { subMode } = context;
    
    console.log('🔍 CMOChatHandler formatResponse:', {
      hasResults: !!results,
      resultsLength: results?.length || 0,
      queryType,
      hasAssistantResponse: !!assistantResponse,
      assistantResponseKeys: Object.keys(assistantResponse || {}),
      hasContent: !!assistantResponse?.content,
      contentType: typeof assistantResponse?.content,
      contentLength: assistantResponse?.content?.length,
      contentPreview: assistantResponse?.content?.substring(0, 100) || 'no content'
    });
    
    // Debug: Log the full assistantResponse structure
    console.log('🔍 Full assistantResponse:', JSON.stringify(assistantResponse, null, 2));
    
    let content = '';
    const sources = [];
    
    // Check if assistantResponse has specialized agent content
    if (assistantResponse.content) {
      console.log('🔍 Found direct content in assistantResponse');
      content = assistantResponse.content;
    } else if (assistantResponse.response) {
      console.log('🔍 Found response in assistantResponse');
      content = assistantResponse.response;
    } else if (assistantResponse.recommendations || assistantResponse.benchmarks || assistantResponse.metrics) {
      console.log('🔍 Building content from structured data');
      // Build content from structured data
      
      // Add greeting or context based on query type
      content += this.getResponseIntro(queryType, subMode);
      
      // Add metrics if available
      if (assistantResponse.metrics) {
        console.log('🔍 CMOChatHandler: metrics data structure:', JSON.stringify(assistantResponse.metrics, null, 2));
        content += '\n\n📊 **Key Metrics:**\n';
        Object.entries(assistantResponse.metrics).forEach(([key, value]) => {
          content += this.formatObjectValue(key, value, '• ');
        });
      }
      
      // Add benchmarks if available
      if (assistantResponse.benchmarks) {
        console.log('🔍 CMOChatHandler: benchmarks data structure:', JSON.stringify(assistantResponse.benchmarks, null, 2));
        content += '\n\n📈 **Industry Benchmarks:**\n';
        Object.entries(assistantResponse.benchmarks).forEach(([key, value]) => {
          content += this.formatObjectValue(key, value, '• ');
        });
      }
      
      // Add recommendations if available
      if (assistantResponse.recommendations && assistantResponse.recommendations.length > 0) {
        content += '\n\n💡 **Recommendations:**\n';
        assistantResponse.recommendations.forEach(rec => {
          if (typeof rec === 'string') {
            content += `• ${rec}\n`;
          } else if (rec.message) {
            content += `• ${rec.message}\n`;
          }
        });
      }
      
      // Add examples if available
      if (assistantResponse.examples && assistantResponse.examples.length > 0) {
        content += '\n\n📝 **Examples:**\n';
        assistantResponse.examples.forEach(example => {
          if (typeof example === 'string') {
            content += `• ${example}\n`;
          } else if (example.description) {
            content += `• ${example.description}\n`;
          }
        });
      }
      
      // Add next steps if available
      if (assistantResponse.nextSteps && assistantResponse.nextSteps.length > 0) {
        content += '\n\n👉 **Next Steps:**\n';
        assistantResponse.nextSteps.forEach((step, index) => {
          content += `${index + 1}. ${step}\n`;
        });
      }
    } else {
      console.log('🔍 Using default content building logic');
      // Original logic
      content += this.getResponseIntro(queryType, subMode);
      
      // Include knowledge results
      if (results && results.length > 0) {
        content += this.formatKnowledgeResults(results, queryType);
        
        // Add sources
        results.forEach(result => {
          sources.push({
            title: result.title,
            category: result.category,
            score: result.score
          });
        });
      } else {
        // No direct knowledge found
        content += this.getNoResultsResponse(query, subMode);
      }
    }
    
    // Add quick actions or tools
    if (queryType === 'tool' || queryType === 'template') {
      content += this.formatToolsSection(queryType, subMode, additionalContext);
    }
    
    // Add suggestions
    if (suggestions && suggestions.length > 0) {
      content += '\n\n💡 **Suggestions:**\n';
      suggestions.forEach(suggestion => {
        content += `• ${suggestion.message}\n`;
      });
    }
    
    // Add quick tip if available
    if (additionalContext?.quickTip) {
      content += `\n\n🎯 **Quick Tip:** ${additionalContext.quickTip.content}`;
    }
    
    console.log('🔍 CMOChatHandler formatResponse final content length:', content.length);
    console.log('🔍 CMOChatHandler formatResponse final content preview:', content.substring(0, 100));
    
    // Check if content is empty and we're echoing the query
    if (!content.trim() || content.trim() === query) {
      console.error('⚠️ WARNING: formatResponse returning empty or echo content!');
      console.error('⚠️ Query:', query);
      console.error('⚠️ Content:', content);
    }
    
    return {
      response: content.trim(),
      content: content.trim(), // Some code expects 'content' field
      sources,
      confidence: assistantResponse.confidence || 0.8,
      metadata: assistantResponse.metadata || {},
      quickActions: assistantResponse.quickActions || [],
      followUpQuestions: assistantResponse.followUpQuestions || [],
      subMode: assistantResponse.subMode || context.subMode || subMode
    };
  }

  /**
   * Get response introduction based on query type
   */
  getResponseIntro(queryType, subMode) {
    const intros = {
      template: `I'll help you with marketing templates${subMode ? ` for ${this.getSubModeName(subMode)}` : ''}.\n\n`,
      howto: `Here's how to approach this${subMode ? ` ${this.getSubModeName(subMode)}` : ' marketing'} task:\n\n`,
      bestpractice: `Here are the best practices to follow:\n\n`,
      analysis: `I'll analyze this for you:\n\n`,
      tool: `I have some tools that can help with this:\n\n`,
      general: ``
    };
    
    return intros[queryType] || intros.general;
  }

  /**
   * Format knowledge results into readable content
   */
  formatKnowledgeResults(results, queryType) {
    let content = '';
    
    results.forEach((result, index) => {
      if (index > 0) content += '\n\n---\n\n';
      
      // Title
      content += `### ${result.title}\n\n`;
      
      // Main content
      if (result.content) {
        content += `${result.content}\n`;
      }
      
      // Type-specific formatting
      switch (result.type) {
        case 'template':
          content += this.formatTemplate(result);
          break;
          
        case 'guide':
          content += this.formatGuide(result);
          break;
          
        case 'checklist':
          content += this.formatChecklist(result);
          break;
          
        case 'tool':
          content += this.formatTool(result);
          break;
          
        case 'tip':
          content += this.formatTip(result);
          break;
          
        default:
          // Generic formatting handled above
          break;
      }
    });
    
    return content;
  }

  /**
   * Format template knowledge
   */
  formatTemplate(item) {
    let content = '\n';
    
    if (item.templates && Array.isArray(item.templates)) {
      item.templates.forEach((template, index) => {
        content += `\n**${template.name || `Template ${index + 1}`}:**\n`;
        if (template.pattern) {
          content += '```\n' + template.pattern + '\n```\n';
        }
        if (template.example) {
          content += `*Example:* ${template.example}\n`;
        }
        if (template.examples && Array.isArray(template.examples)) {
          content += '*Examples:*\n';
          template.examples.forEach(ex => content += `• ${ex}\n`);
        }
      });
    } else if (item.template) {
      content += '```\n' + JSON.stringify(item.template, null, 2) + '\n```\n';
    }
    
    return content;
  }

  /**
   * Format guide knowledge
   */
  formatGuide(item) {
    let content = '\n';
    
    if (item.guidelines && Array.isArray(item.guidelines)) {
      content += '**Guidelines:**\n';
      item.guidelines.forEach(guideline => {
        content += `• ${guideline}\n`;
      });
    }
    
    if (item.steps) {
      content += '\n**Steps:**\n';
      Object.entries(item.steps).forEach(([step, description]) => {
        content += `${step}. ${description}\n`;
      });
    }
    
    if (item.examples) {
      content += '\n**Examples:**\n';
      if (typeof item.examples === 'object' && !Array.isArray(item.examples)) {
        Object.entries(item.examples).forEach(([type, examples]) => {
          content += `\n*${this.titleCase(type)}:*\n`;
          if (Array.isArray(examples)) {
            examples.forEach(ex => content += `• ${ex}\n`);
          }
        });
      }
    }
    
    return content;
  }

  /**
   * Format checklist knowledge
   */
  formatChecklist(item) {
    let content = '\n';
    
    if (item.items && Array.isArray(item.items)) {
      content += '**Checklist:**\n';
      item.items.forEach(checkItem => {
        content += `☐ ${checkItem}\n`;
      });
    }
    
    return content;
  }

  /**
   * Format tool knowledge
   */
  formatTool(item) {
    let content = '\n';
    
    if (item.description) {
      content += `*${item.description}*\n\n`;
    }
    
    if (item.rules) {
      content += '**Rules:**\n';
      Object.entries(item.rules).forEach(([rule, value]) => {
        content += `• ${this.titleCase(rule)}: ${JSON.stringify(value)}\n`;
      });
    }
    
    if (item.tips && Array.isArray(item.tips)) {
      content += '\n**Tips:**\n';
      item.tips.forEach(tip => content += `• ${tip}\n`);
    }
    
    return content;
  }

  /**
   * Format tip knowledge
   */
  formatTip(item) {
    let content = '\n';
    
    if (item.tips && Array.isArray(item.tips)) {
      item.tips.forEach(tip => content += `💡 ${tip}\n`);
    }
    
    return content;
  }

  /**
   * Format tools section
   */
  formatToolsSection(queryType, subMode, context) {
    let content = '\n\n🛠️ **Available Tools:**\n';
    
    if (context.availableTools && context.availableTools.length > 0) {
      context.availableTools.forEach(tool => {
        content += `• **${tool.title}**: ${tool.description}\n`;
      });
    } else if (context.availableTemplates && context.availableTemplates.length > 0) {
      context.availableTemplates.forEach(template => {
        content += `• **${template.title}**: ${template.description}\n`;
      });
    }
    
    return content;
  }

  /**
   * Get response when no knowledge is found
   */
  getNoResultsResponse(query, subMode) {
    // Don't provide a generic response when no results found
    // Let the system handle knowledge base queries properly
    return '';
  }

  /**
   * Get error response
   */
  getErrorResponse(error) {
    return `I encountered an issue while processing your marketing question. ` +
           `Please try rephrasing your question or ask about a specific marketing topic ` +
           `like SEO, email marketing, social media, or advertising.`;
  }

  /**
   * Get relevant quick actions
   */
  getRelevantQuickActions(queryType, subMode) {
    // Check if assistant has getQuickActions method
    if (!this.assistant.getQuickActions) {
      return []; // Return empty array if method doesn't exist
    }
    
    const actions = this.assistant.getQuickActions(subMode || 'general');
    
    // Filter actions based on query type
    if (queryType === 'tool') {
      return actions.filter(a => a.id.includes('check') || a.id.includes('test'));
    } else if (queryType === 'template') {
      return actions.filter(a => a.id.includes('template') || a.id.includes('generator'));
    }
    
    return actions.slice(0, 3); // Return top 3 actions
  }

  /**
   * Calculate confidence score
   */
  calculateConfidence(assistantResponse) {
    const { results, queryType } = assistantResponse;
    
    if (!results || results.length === 0) return 0.3;
    
    // Average score of top results
    const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
    
    // Boost confidence for exact query type matches
    const typeBoost = ['template', 'tool', 'howto'].includes(queryType) ? 0.1 : 0;
    
    return Math.min(avgScore + typeBoost, 1.0);
  }

  /**
   * Get human-readable sub-mode name
   */
  getSubModeName(subMode) {
    const names = {
      seo: 'SEO',
      email: 'Email Marketing',
      social: 'Social Media',
      'direct-mail': 'Direct Mail',
      ads: 'Paid Advertising'
    };
    
    return names[subMode] || subMode;
  }

  /**
   * Convert to title case
   */
  titleCase(str) {
    return str.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Format object values recursively to handle nested structures
   */
  formatObjectValue(key, value, prefix = '') {
    let content = '';
    
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        // Handle arrays by joining simple values, or formatting complex ones
        const formattedArray = value.map(item => {
          if (typeof item === 'object' && item !== null) {
            return JSON.stringify(item);
          }
          return String(item);
        });
        content += `${prefix}${this.titleCase(key)}: ${formattedArray.join(', ')}\n`;
      } else {
        // Handle nested objects
        content += `${prefix}${this.titleCase(key)}:\n`;
        Object.entries(value).forEach(([subKey, subValue]) => {
          // Recursive call for nested objects
          content += this.formatObjectValue(subKey, subValue, prefix + '  - ');
        });
      }
    } else {
      // Simple value
      content += `${prefix}${this.titleCase(key)}: ${value}\n`;
    }
    
    return content;
  }

  /**
   * Generate contextual follow-up questions
   */
  getFollowUpQuestions(queryType, subMode) {
    const questions = {
      template: [
        'Would you like me to customize this template for your brand?',
        'Do you need help with A/B testing variations?',
        'Should I explain best practices for using this template?'
      ],
      howto: [
        'Would you like more detailed step-by-step instructions?',
        'Do you need examples from your industry?',
        'Should I create a checklist for this process?'
      ],
      tool: [
        'Would you like to try this tool with your content?',
        'Do you need help interpreting the results?',
        'Should I show you similar tools?'
      ],
      general: [
        'Can you provide more details about your specific situation?',
        'What marketing goals are you trying to achieve?',
        'Would examples from your industry be helpful?'
      ]
    };
    
    return questions[queryType] || questions.general;
  }
}

// Export singleton instance
export const cmoChatHandler = new CMOChatHandler();
export default CMOChatHandler;