/**
 * Chat Service for Tala AI with Mode Support
 * 
 * Enhanced chat functionality with mode detection and routing for both
 * travel and CMO modes. Maintains backward compatibility while adding
 * mode-aware capabilities.
 */

import OpenAI from 'openai';
import { modeManager } from './modes/ModeManager.js';
import { modeContext } from './modes/ModeContext.js';

class ChatService {
  constructor(options = {}) {
    this.enableMultiLLM = options.enableMultiLLM || false;
    this.llmRouter = options.llmRouter || null;
    this.openai = options.openai || null;
    this.enableLogging = options.enableLogging !== false;
    
    // Mode management
    this.modeManager = modeManager;
    this.modeContext = modeContext;
    
    if (!this.enableMultiLLM && !this.openai) {
      throw new Error('OpenAI client is required when multi-LLM is disabled');
    }
    
    if (this.enableMultiLLM && !this.llmRouter) {
      throw new Error('LLM Router is required when multi-LLM is enabled');
    }
    
    this.log(`Chat Service initialized (Multi-LLM: ${this.enableMultiLLM}, Mode Support: enabled)`);
  }

  /**
   * Generate chat response using appropriate LLM service with mode awareness
   * @param {Object} options - Chat options
   * @returns {Object} Chat response with metadata
   */
  async generateResponse(options) {
    const {
      message,
      systemPrompt,
      conversationContext = {},
      userPreferences = {},
      maxTokens = 1000,
      temperature = 0.7,
      userId,
      conversationId,
      forceMode = null, // Allow explicit mode override
      detectMode = true // Whether to auto-detect mode
    } = options;

    try {
      // Get current mode context
      let currentMode = 'travel'; // Default
      let currentSubMode = null;
      let modeContextData = {};
      
      if (conversationId) {
        const modeInfo = await this.modeManager.getModeContext(conversationId);
        currentMode = modeInfo.mode;
        currentSubMode = modeInfo.subMode;
        modeContextData = await this.modeContext.getContext(conversationId);
      } else if (userId) {
        // New conversation - get user's default mode
        currentMode = await this.modeManager.getUserDefaultMode(userId);
      }
      
      // Detect mode from message if enabled
      let detectedMode = null;
      if (detectMode && !forceMode) {
        const detection = this.modeManager.detectMode(message, {
          mode: currentMode,
          subMode: currentSubMode
        });
        
        // Only switch if high confidence or explicit request
        if (detection.confidence > 0.7 || detection.explicit) {
          detectedMode = detection;
          
          // Switch mode if different
          if (detection.mode !== currentMode && conversationId) {
            const switchResult = await this.modeManager.switchMode(
              userId,
              conversationId,
              detection.mode,
              detection.subMode
            );
            
            if (switchResult.success) {
              currentMode = detection.mode;
              currentSubMode = detection.subMode;
              
              // Switch context
              await this.modeContext.switchContext(
                conversationId,
                switchResult.previousMode,
                detection.mode
              );
            }
          }
        }
      }
      
      // Use forced mode if specified
      if (forceMode) {
        currentMode = forceMode;
      }
      
      // Enhance system prompt with mode context
      const enhancedSystemPrompt = this.enhanceSystemPromptForMode(
        systemPrompt,
        currentMode,
        currentSubMode,
        modeContextData
      );
      
      // Add mode information to conversation context
      const enhancedContext = {
        ...conversationContext,
        mode: currentMode,
        subMode: currentSubMode,
        modeContext: modeContextData,
        modeDetection: detectedMode
      };
      
      // Generate response with enhanced context
      let response;
      if (this.enableMultiLLM) {
        response = await this.generateWithMultiLLM({
          message,
          systemPrompt: enhancedSystemPrompt,
          conversationContext: enhancedContext,
          userPreferences,
          maxTokens,
          temperature,
          userId,
          conversationId
        });
      } else {
        response = await this.generateWithOpenAI({
          message,
          systemPrompt: enhancedSystemPrompt,
          maxTokens,
          temperature
        });
      }
      
      // Add mode information to response
      response.mode = {
        current: currentMode,
        subMode: currentSubMode,
        detected: detectedMode,
        contextSummary: conversationId ? 
          await this.modeContext.getContextSummary(conversationId) : null
      };
      
      // Log mode activity
      if (userId) {
        await this.modeManager.logQuickAction(userId, 'chat_interaction', {
          mode: currentMode,
          sub_mode: currentSubMode,
          detected_mode: detectedMode?.mode,
          message_preview: message.substring(0, 50)
        });
      }
      
      return response;
      
    } catch (error) {
      this.log(`Chat generation failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Enhance system prompt based on current mode
   * @param {string} basePrompt - Base system prompt
   * @param {string} mode - Current mode
   * @param {string} subMode - Current sub-mode
   * @param {Object} context - Mode context data
   * @returns {string} Enhanced prompt
   */
  enhanceSystemPromptForMode(basePrompt, mode, subMode, context) {
    let enhancement = '';
    
    if (mode === 'cmo') {
      enhancement = `\n\nYou are now operating in CMO (Chief Marketing Officer) mode.`;
      
      if (context.business_info?.name) {
        enhancement += ` You are helping ${context.business_info.name}`;
        if (context.business_info.industry) {
          enhancement += ` (${context.business_info.industry})`;
        }
        enhancement += ' with their marketing needs.';
      }
      
      if (subMode) {
        const subModeDescriptions = {
          seo: 'Focus on search engine optimization, rankings, and organic visibility.',
          email: 'Help with email marketing campaigns, subject lines, and engagement.',
          social: 'Assist with social media content, engagement, and strategy.',
          ads: 'Optimize paid advertising campaigns, ad copy, and ROAS.',
          directMail: 'Design effective direct mail campaigns and print materials.'
        };
        
        enhancement += `\n${subModeDescriptions[subMode] || ''}`;
      }
      
      if (context.brand_voice) {
        enhancement += `\n\nBrand voice: ${context.brand_voice}`;
      }
      
      if (context.marketing_goals?.length > 0) {
        enhancement += `\n\nCurrent marketing goals: ${context.marketing_goals.join(', ')}`;
      }
      
    } else if (mode === 'travel') {
      enhancement = `\n\nYou are operating in Travel Assistant mode.`;
      
      if (context.destination) {
        enhancement += ` The user is planning a trip to ${context.destination}.`;
      }
      
      if (context.travel_dates?.start) {
        enhancement += ` Travel dates: ${context.travel_dates.start} to ${context.travel_dates.end || 'TBD'}.`;
      }
      
      if (context.preferences?.budget) {
        enhancement += ` Budget: ${context.preferences.budget}.`;
      }
    }
    
    return basePrompt + enhancement;
  }

  /**
   * Generate response using multi-LLM router (unchanged from original)
   * @param {Object} options - Generation options
   * @returns {Object} Response with routing metadata
   */
  async generateWithMultiLLM(options) {
    const {
      message,
      systemPrompt,
      conversationContext,
      userPreferences,
      maxTokens,
      temperature,
      userId,
      conversationId
    } = options;

    const startTime = Date.now();

    try {
      // Prepare context for LLM Router (now includes mode info)
      const routerContext = {
        userId,
        conversationId,
        userPreferences: {
          costOptimization: userPreferences.costOptimization || false,
          fastResponse: userPreferences.fastResponse || false,
          preferredModel: userPreferences.preferredModel || null,
          ...userPreferences
        },
        conversationContext: {
          hasDocumentContext: !!conversationContext.documentContext,
          entityCount: conversationContext.entities?.length || 0,
          conversationLength: conversationContext.messageCount || 0,
          lastActivity: conversationContext.lastActivity,
          mode: conversationContext.mode,
          subMode: conversationContext.subMode,
          ...conversationContext
        }
      };

      // Use LLM Router to generate response
      const routerResponse = await this.llmRouter.routeQuery(
        message,
        routerContext,
        {
          systemPrompt,
          maxTokens,
          temperature
        }
      );

      const responseTime = Date.now() - startTime;

      this.log(`Multi-LLM response generated in ${responseTime}ms using ${routerResponse.routing.selectedModel}`);

      return {
        content: routerResponse.response,
        model: routerResponse.routing.selectedModel,
        provider: routerResponse.routing.provider,
        routing: {
          queryType: routerResponse.routing.queryType,
          modelSelected: routerResponse.routing.selectedModel,
          fallbacksUsed: routerResponse.routing.fallbacksUsed,
          costOptimized: routerResponse.routing.costOptimized,
          reasoning: routerResponse.routing.reasoning || []
        },
        usage: {
          promptTokens: routerResponse.usage.promptTokens,
          completionTokens: routerResponse.usage.completionTokens,
          totalTokens: routerResponse.usage.totalTokens,
          cost: routerResponse.usage.cost
        },
        performance: {
          responseTime,
          successful: true
        },
        metadata: {
          timestamp: new Date().toISOString(),
          multiLLM: true,
          budgetStatus: routerResponse.routing.budgetStatus,
          costSavings: routerResponse.routing.costSavings
        }
      };

    } catch (error) {
      this.log(`Multi-LLM generation failed: ${error.message}`, 'error');
      
      return {
        content: null,
        error: error.message,
        model: null,
        provider: null,
        routing: {
          queryType: 'unknown',
          modelSelected: null,
          fallbacksUsed: 0,
          costOptimized: false,
          reasoning: [`Error: ${error.message}`]
        },
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          cost: 0
        },
        performance: {
          responseTime: Date.now() - startTime,
          successful: false
        },
        metadata: {
          timestamp: new Date().toISOString(),
          multiLLM: true,
          error: true
        }
      };
    }
  }

  /**
   * Generate response using OpenAI directly (backward compatibility)
   * @param {Object} options - Generation options
   * @returns {Object} Response with basic metadata
   */
  async generateWithOpenAI(options) {
    const {
      message,
      systemPrompt,
      maxTokens,
      temperature
    } = options;

    const startTime = Date.now();

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: maxTokens,
        temperature: temperature
      });

      const responseTime = Date.now() - startTime;
      const response = completion.choices[0].message.content;

      this.log(`OpenAI response generated in ${responseTime}ms`);

      return {
        content: response,
        model: 'gpt-4o-mini',
        provider: 'openai',
        routing: {
          queryType: 'unknown',
          modelSelected: 'gpt-4o-mini',
          fallbacksUsed: 0,
          costOptimized: false,
          reasoning: ['OpenAI-only mode']
        },
        usage: {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens,
          cost: this.calculateOpenAICost(completion.usage)
        },
        performance: {
          responseTime,
          successful: true
        },
        metadata: {
          timestamp: new Date().toISOString(),
          multiLLM: false
        }
      };

    } catch (error) {
      this.log(`OpenAI generation failed: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Calculate OpenAI API cost
   * @param {Object} usage - Usage statistics
   * @returns {number} Estimated cost
   */
  calculateOpenAICost(usage) {
    // GPT-4o-mini pricing (as of 2024)
    const inputCostPer1k = 0.00015;
    const outputCostPer1k = 0.0006;
    
    return (usage.prompt_tokens / 1000 * inputCostPer1k) + 
           (usage.completion_tokens / 1000 * outputCostPer1k);
  }

  /**
   * Log messages with optional level
   * @param {string} message - Message to log
   * @param {string} level - Log level
   */
  log(message, level = 'info') {
    if (!this.enableLogging) return;
    
    const timestamp = new Date().toISOString();
    const prefix = `[ChatService ${timestamp}]`;
    
    switch (level) {
      case 'error':
        console.error(`${prefix} ERROR: ${message}`);
        break;
      case 'warn':
        console.warn(`${prefix} WARN: ${message}`);
        break;
      default:
        console.log(`${prefix} ${message}`);
    }
  }

  /**
   * Get mode-specific quick actions
   * @param {string} mode - Current mode
   * @param {string} subMode - Current sub-mode
   * @returns {Array} Quick actions
   */
  getModeQuickActions(mode, subMode) {
    const actions = {
      travel: [
        { action: 'search_flights', label: 'Search Flights', icon: '✈️' },
        { action: 'find_hotels', label: 'Find Hotels', icon: '🏨' },
        { action: 'plan_itinerary', label: 'Plan Itinerary', icon: '📅' },
        { action: 'check_visa', label: 'Check Visa Requirements', icon: '📋' }
      ],
      cmo: {
        default: [
          { action: 'create_campaign', label: 'Create Campaign', icon: '🎯' },
          { action: 'analyze_performance', label: 'Analyze Performance', icon: '📊' },
          { action: 'generate_content', label: 'Generate Content', icon: '✍️' },
          { action: 'competitor_analysis', label: 'Competitor Analysis', icon: '🔍' }
        ],
        seo: [
          { action: 'keyword_research', label: 'Keyword Research', icon: '🔑' },
          { action: 'optimize_page', label: 'Optimize Page', icon: '🔧' },
          { action: 'check_rankings', label: 'Check Rankings', icon: '📈' },
          { action: 'audit_site', label: 'SEO Audit', icon: '🔍' }
        ],
        email: [
          { action: 'write_campaign', label: 'Write Campaign', icon: '✉️' },
          { action: 'test_subject', label: 'Test Subject Line', icon: '🧪' },
          { action: 'segment_list', label: 'Segment List', icon: '👥' },
          { action: 'check_deliverability', label: 'Check Deliverability', icon: '📬' }
        ],
        social: [
          { action: 'create_post', label: 'Create Post', icon: '📱' },
          { action: 'schedule_content', label: 'Schedule Content', icon: '📅' },
          { action: 'analyze_engagement', label: 'Analyze Engagement', icon: '💬' },
          { action: 'find_hashtags', label: 'Find Hashtags', icon: '#️⃣' }
        ],
        ads: [
          { action: 'create_ad', label: 'Create Ad', icon: '📢' },
          { action: 'optimize_bids', label: 'Optimize Bids', icon: '💰' },
          { action: 'ab_test', label: 'A/B Test', icon: '🔬' },
          { action: 'track_roi', label: 'Track ROI', icon: '💹' }
        ]
      }
    };
    
    if (mode === 'cmo' && subMode && actions.cmo[subMode]) {
      return actions.cmo[subMode];
    }
    
    return actions[mode] || actions.cmo.default;
  }
}

export default ChatService;