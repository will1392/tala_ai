/**
 * CMOAssistant - Marketing assistant service
 * 
 * Provides marketing expertise using the CMO Knowledge Base
 * and integrates with the chat system.
 */

import { cmoKnowledgeBase } from './CMOKnowledgeBase.js';
import { contextDetector } from './ContextDetector.js';
import { cmoResponseEnhancer } from './CMOResponseEnhancer.js';
import { conversationFlow } from './ConversationFlow.js';
import { marketingIntelligence } from './MarketingIntelligence.js';
import { getSEOTemplate } from '../../templates/cmo/seo-responses.js';
import { getEmailTemplate } from '../../templates/cmo/email-responses.js';
import { getSocialPlatformGuide } from '../../templates/cmo/social-responses.js';
import { getMailPieceSpecs } from '../../templates/cmo/directmail-responses.js';
import { getAdsPlatformGuide } from '../../templates/cmo/ads-responses.js';

// Import expertise services
import ExpertiseAssessment from '../expertise/ExpertiseAssessment.js';
import CommunicationAdapter from '../expertise/CommunicationAdapter.js';
import ExpertiseLearning from '../expertise/ExpertiseLearning.js';
import ExpertiseProfiles from '../expertise/ExpertiseProfiles.js';
import { ResponseTemplates, generateAdaptiveResponse } from '../../templates/cmo/expertise-responses.js';

// Import specialized marketing agents router
import marketingAgentRouter from '../agents/MarketingAgentRouter.js';

class CMOAssistant {
  constructor() {
    this.knowledgeBase = cmoKnowledgeBase;
    this.contextDetector = contextDetector;
    this.responseEnhancer = cmoResponseEnhancer;
    this.conversationFlow = conversationFlow;
    this.marketingIntelligence = marketingIntelligence;
    
    // Initialize expertise services
    this.expertiseAssessment = new ExpertiseAssessment();
    this.communicationAdapter = new CommunicationAdapter();
    this.expertiseLearning = new ExpertiseLearning();
    this.expertiseProfiles = new ExpertiseProfiles();
    
    // Store reference to marketing agent router
    this.marketingAgentRouter = marketingAgentRouter;
    console.log('🔍 CMOAssistant constructor: marketingAgentRouter imported?', !!marketingAgentRouter);
    
    this.initialized = false;
  }

  /**
   * Initialize the CMO Assistant
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      await this.knowledgeBase.initialize();
      this.initialized = true;
      console.log('✅ CMO Assistant initialized');
    } catch (error) {
      console.error('Failed to initialize CMO Assistant:', error);
      throw error;
    }
  }

  /**
   * Process a query (wrapper for processMessage for backward compatibility)
   */
  async processQuery(message, options = {}) {
    console.log('🔍 CMOAssistant: processQuery called with message:', message.substring(0, 50) + '...');
    console.log('🔍 CMOAssistant: Options:', Object.keys(options));
    console.log('🔍 CMOAssistant: subMode:', options.subMode);
    
    // Extract userId from options or use a default
    const userId = options.userId || options.conversationId || 'default-user';
    
    // Call processMessage with the proper parameters
    return this.processMessage(message, userId, options);
  }

  /**
   * Process a message with expertise-aware adaptations
   */
  async processMessage(message, userId, options = {}) {
    const startTime = Date.now();
    console.log('🎯 CMOAssistant.processMessage called with:', {
      message: message.substring(0, 50),
      userId,
      optionKeys: Object.keys(options),
      options: JSON.stringify(options, null, 2)
    });
    
    try {
      // Check if this is a field assistance request
      console.log('🗒️ Checking for field assistance:', {
        subMode: options.subMode,
        hasFieldContext: !!options.fieldContext,
        fieldContext: options.fieldContext,
        allOptions: options
      });
      
      if (options.subMode === 'field_assistance') {
        console.log('📝 Field assistance mode detected');
        if (!options.fieldContext) {
          console.warn('⚠️ Field assistance mode but no fieldContext provided, using default context');
          // Provide a default context to prevent errors
          options.fieldContext = {
            fieldLabel: 'Travel Specialty',
            fieldType: 'text',
            fieldDescription: 'Your travel business specialty',
            currentValue: message
          };
        }
        return await this.handleFieldAssistance(message, userId, options);
      }
      
      // Check if this is a direct mail strategy report (already processed)
      if (options.subMode === 'direct_mail_strategy') {
        console.log('📊 Direct mail strategy mode detected - returning strategy directly');
        return {
          response: message,
          conversationId: options.conversationId || `dm-${Date.now()}`,
          metadata: options.context?.metadata || {}
        };
      }
      
      // Get user expertise profile
      const expertise = await this.getUserExpertise(userId);
      
      // Check conversation history to detect if we're in an ongoing conversation
      const conversationHistory = options.conversationHistory || [];
      let isOngoingConversation = false;
      let previousChannel = null;
      
      if (conversationHistory.length > 0) {
        // Check if previous messages were about direct mail
        const recentMessages = conversationHistory.slice(-3); // Look at last 3 messages
        for (const msg of recentMessages) {
          const msgText = msg.content?.toLowerCase() || '';
          if (msgText.includes('postcard') || msgText.includes('direct mail') || msgText.includes('mailer')) {
            isOngoingConversation = true;
            previousChannel = 'direct_mail';
            console.log('🔍 CMOAssistant: Detected ongoing direct mail conversation');
            break;
          }
        }
      }
      
      // Detect marketing context and topic
      const contextAnalysis = await this.contextDetector.detectMarketingContext(message);
      console.log('🔍 CMOAssistant: contextAnalysis result:', {
        primaryContext: contextAnalysis.primaryContext,
        confidence: contextAnalysis.confidence
      });
      
      // If we're in an ongoing conversation, use the previous channel
      const topic = isOngoingConversation ? previousChannel : (contextAnalysis.primaryContext || options.topic || 'general');
      const channel = isOngoingConversation ? previousChannel : this.expertiseProfiles.mapTopicToChannel(topic);
      console.log('🔍 CMOAssistant: Mapping result:', { topic, channel, isOngoingConversation });
      
      // Check if a specialized agent should handle this query
      console.log('🔍 CMOAssistant: Checking for specialized agent routing...');
      console.log('🔍 CMOAssistant: marketingAgentRouter available?', !!this.marketingAgentRouter);
      console.log('🔍 CMOAssistant: marketingAgentRouter.route available?', typeof this.marketingAgentRouter?.route);
      console.log('🔍 CMOAssistant: Detected channel for routing:', channel);
      console.log('🔍 CMOAssistant: Detected topic for routing:', topic);
      
      const specializedAgentResponse = this.marketingAgentRouter 
        ? await this.marketingAgentRouter.route(message, {
            userId,
            expertise: expertise?.level || 'beginner',
            detectedChannel: channel, // Pass the detected channel for better routing
            detectedTopic: topic, // Pass the detected topic
            businessType: options.businessType,
            campaignGoal: options.campaignGoal,
            targetAudience: options.targetAudience,
            budget: options.budget,
            timeline: options.timeline,
            userExpertise: expertise?.level,
            conversationHistory: options.conversationHistory || [], // Pass conversation history
            conversationId: options.conversationId
          })
        : null;
      
      console.log('🔍 CMOAssistant: specializedAgentResponse received:', !!specializedAgentResponse);
      if (specializedAgentResponse) {
        console.log('🔍 CMOAssistant: Response type:', specializedAgentResponse.type);
        console.log('🔍 CMOAssistant: Response agent:', specializedAgentResponse.agent);
        console.log('🔍 CMOAssistant: Has content:', !!specializedAgentResponse.content);
        console.log('🔍 CMOAssistant: Content structure:', specializedAgentResponse.content ? Object.keys(specializedAgentResponse.content) : 'no content');
        console.log('🔍 CMOAssistant: Content.text preview:', specializedAgentResponse.content?.text?.substring(0, 100) || 'no text');
      } else {
        console.log('❌ CMOAssistant: No specialized agent response, falling back to default');
      }
      
      // If specialized agent handled it, adapt and return response
      if (specializedAgentResponse) {
        console.log('📬 Using specialized agent response');
        console.log('📬 Specialized response structure:', Object.keys(specializedAgentResponse));
        console.log('📬 Response content type:', typeof specializedAgentResponse.content);
        console.log('📬 Has content.text:', !!specializedAgentResponse.content?.text);
        
        // Extract response text correctly based on the structure
        let responseText;
        if (specializedAgentResponse.content && typeof specializedAgentResponse.content === 'object') {
          // Content is an object with text property
          responseText = specializedAgentResponse.content.text;
          console.log('📬 Extracted text from content.text:', responseText?.substring(0, 100) + '...');
        } else if (typeof specializedAgentResponse.content === 'string') {
          // Content is directly a string
          responseText = specializedAgentResponse.content;
          console.log('📬 Content is string:', responseText.substring(0, 100) + '...');
        }
        
        // Check if we actually got text
        if (!responseText || 
            responseText === message || 
            (typeof responseText === 'string' && responseText.trim().length < 10)) {
          console.log('⚠️ CMOAssistant: Specialized agent returned empty/echo response');
          console.log('⚠️ Response content:', specializedAgentResponse.content);
          console.log('⚠️ Extracted responseText:', responseText);
          console.log('⚠️ User message:', message);
          console.log('⚠️ Falling back to default response generation');
          // Fall through to default response generation
        } else {
          // Adapt the specialized response based on user expertise
          const adaptedSpecializedResponse = await this.adaptSpecializedResponse(
            specializedAgentResponse,
            expertise,
            { topic, channel }
          );
          
          // Track the interaction
          const duration = Date.now() - startTime;
          await this.trackInteractionLearning(userId, {
            message,
            response: adaptedSpecializedResponse,
            context: { ...enhancedContext, specializedAgent: true },
            duration,
            topic,
            channel
          });
          
          return adaptedSpecializedResponse;
        }
      }
      
      // Get topic-specific expertise
      const topicExpertise = await this.expertiseProfiles.getTopicExpertise(userId, topic);
      
      // Build enhanced context
      const enhancedContext = {
        ...options,
        topic,
        channel,
        expertise: expertise?.level || 'beginner',
        channelExpertise: topicExpertise,
        intent: contextAnalysis.intent,
        confidence: contextAnalysis.confidence
      };
      
      // Generate base response
      const baseResponse = await this.generateResponse(message, enhancedContext);
      
      // Adapt response based on expertise
      const adaptedResponse = await this.adaptResponseForExpertise(
        baseResponse,
        expertise,
        enhancedContext
      );
      
      // Track interaction for learning
      const duration = Date.now() - startTime;
      await this.trackInteractionLearning(userId, {
        message,
        response: adaptedResponse,
        context: enhancedContext,
        duration,
        topic,
        channel
      });
      
      return adaptedResponse;
      
    } catch (error) {
      console.error('Error processing message with expertise:', error);
      
      // Fallback to basic processing
      return this.processQuery(message, { userId, ...options });
    }
  }

  /**
   * Handle field assistance requests
   */
  async handleFieldAssistance(message, userId, options) {
    const { fieldContext } = options;
    console.log('📝 Field assistance handler called');
    console.log('📝 Field assistance context:', fieldContext);
    console.log('📝 Message:', message);
    console.log('📝 Options:', options);
    
    try {
      // Get expertise-based response
      const expertise = await this.getUserExpertise(userId);
      
      // Generate field-specific response directly without knowledge base search
      const responseText = this.generateFieldSpecificResponse(fieldContext, message, expertise);
      
      // Return response WITHOUT enhancement - field assistance should be direct and conversational
      const fieldAssistanceResponse = {
        response: responseText,
        content: responseText, // Also include as content for compatibility
        subMode: 'field_assistance',
        confidence: 0.9,
        metadata: {
          fieldContext,
          expertise: expertise.level,
          sources: []
        },
        quickActions: [],
        suggestions: [],
        recommendations: [],
        // Add flag to prevent further enhancement
        skipEnhancement: true
      };
      
      console.log('📝 Field assistance response:', {
        hasResponse: !!fieldAssistanceResponse.response,
        responseLength: fieldAssistanceResponse.response?.length,
        responsePreview: fieldAssistanceResponse.response?.substring(0, 100)
      });
      
      return fieldAssistanceResponse;
      
    } catch (error) {
      console.error('Error handling field assistance:', error);
      
      // Fallback response with helpful guidance
      const fallbackResponse = this.generateFieldAssistanceDefault(fieldContext, message);
      
      return {
        response: fallbackResponse,
        content: fallbackResponse,
        subMode: 'field_assistance',
        confidence: 0.7,
        skipEnhancement: true
      };
    }
  }

  /**
   * Generate field-specific response based on field label and context
   */
  generateFieldSpecificResponse(fieldContext, message, expertise) {
    const { fieldLabel, fieldType, fieldOptions, currentValue } = fieldContext;
    const fieldLabelLower = fieldLabel.toLowerCase();
    
    // Handle specific fields with targeted responses
    if (fieldLabelLower.includes('travel specialty') || fieldLabelLower.includes('specialty')) {
      if (message && message.toLowerCase().includes('luxury')) {
        return `Oh, "luxury travel - 5 star properties and private touring" - that sounds amazing! You're already on the right track.\n\n` +
               `That's actually a great specialty because luxury travelers:\n` +
               `• Value expertise (that's you!)\n` +
               `• Book higher-priced trips\n` +
               `• Often become repeat clients\n` +
               `• Refer friends who travel similarly\n\n` +
               `Quick thought: Do you focus on specific destinations? Like "European luxury" or "African safaris"? Adding that could make your specialty even stronger.\n\n` +
               `But honestly, what you have is already excellent.\n\n` +
               `I suggest using: "Luxury travel - 5 star properties and private touring"`;
      } else {
        return `Ah, the specialty field! Think of this as "what do people come to you for?"\n\n` +
               `Don't overthink it. When friends ask about your job, how do you describe what you do?\n\n` +
               `Maybe you say things like:\n` +
               `• "I plan Disney trips for families"\n` +
               `• "I book cruises, mostly river cruises in Europe"\n` +
               `• "I do honeymoons and romantic getaways"\n` +
               `• "I help people explore Africa on safari"\n\n` +
               `Or maybe you're still figuring it out - that's okay too! What type of trip gets you most excited to plan?\n\n` +
               `I suggest using: Whatever you just thought of! That's your specialty.\n\n` +
               `(If you're really stuck, just put what you've booked most in the last year)`;
      }
    }
    
    if (fieldLabelLower.includes('business goals') || fieldLabelLower.includes('goals')) {
      // Check if user provided actual input (not just asking for help)
      const messageLower = message.toLowerCase();
      const isAskingForHelp = messageLower.includes('help') || messageLower.includes('what should') || 
                              messageLower.includes('not sure') || messageLower.includes('don\'t know') ||
                              (messageLower.length < 10 && messageLower !== 'yes' && messageLower !== 'no' && messageLower !== 'change');
      
      if (!isAskingForHelp) {
        // Check if user is confirming their goal
        if (messageLower === 'yes' || messageLower === 'yes!' || messageLower === 'yes, use that' || messageLower === 'yes please') {
          return `Great! I've set your business goal.\n\n` +
                 `✅ Your goal is locked in and ready for your Direct Mail campaign.\n\n` +
                 `This clear, specific goal will help create a focused campaign that delivers real results.\n\n` +
                 `Feel free to move on to the next question, or type "change" if you want to adjust it.`;
        }
        
        if (messageLower === 'change' || messageLower.includes('adjust') || messageLower.includes('different')) {
          return `No problem! Let's refine your goal.\n\n` +
                 `What would you like to change about it? Just tell me your revised goal, and I'll help you polish it.`;
        }
        
        // Check if this is a complete, refined goal
        const hasCurrentAmount = /\$\d+k?\s*(to|in|from|at|currently)/i.test(message);
        const hasTargetAmount = /to\s*\$?\d+k?|scale.*\$?\d+k?|grow.*\$?\d+k?/i.test(message);
        const hasTimeframe = /\d+\s*(months?|years?|quarters?)|by\s+(end|june|december|q[1-4])|within\s+\d+/i.test(message);
        const hasAudience = /(clients?|travelers?|couples?|families|cruises?|luxury|adventure|budget)/i.test(message);
        
        const isComplete = (hasCurrentAmount || hasTargetAmount) && hasTimeframe && hasAudience;
        
        if (isComplete) {
          // User has provided a complete goal - confirm it
          return `Perfect! That's exactly the kind of specific goal I was hoping for!\n\n` +
                 `Let me make sure I got this right:\n\n` +
                 `**"${message}"**\n\n` +
                 `This is great because it has:\n` +
                 `✓ Clear numbers (${hasCurrentAmount ? 'current and target' : 'target amount'})\n` +
                 `✓ Specific timeframe\n` +
                 `✓ Target audience defined\n\n` +
                 `Would you like to use this as your business goal for the campaign?\n\n` +
                 `Type **"yes"** to use this goal, or tell me what you'd like to change.`;
        }
        
        // Check for partially complete goals
        const hasAmount = /\$\d+k?/i.test(message);
        const elements = {
          amount: hasAmount,
          timeframe: hasTimeframe,
          audience: hasAudience
        };
        
        // Handle specific goal types with more nuanced responses
        if ((message.includes('grow from') || message.includes('scale from')) && hasAmount) {
          // User is providing more detail after initial response
          const missingElements = [];
          if (!hasTimeframe) missingElements.push('timeframe');
          if (!hasAudience) missingElements.push('who you want to target');
          
          if (missingElements.length === 0) {
            // They've provided everything
            return `Perfect! That's exactly what I was looking for!\n\n` +
                   `**"${message}"**\n\n` +
                   `This goal is crystal clear - it shows where you are, where you're going, and who will get you there.\n\n` +
                   `Should we use this as your campaign goal? Type "yes" or let me know if you want to adjust anything.`;
          } else {
            // Still missing some elements
            return `Great progress! You've got the growth numbers down.\n\n` +
                   `Just need to add: ${missingElements.join(' and ')}\n\n` +
                   `For example: "${message} by targeting affluent river cruise enthusiasts"\n\n` +
                   `What would you add?`;
          }
        } else if (message.includes('$500k') || message.includes('500k')) {
          // Initial $500k mention - ask for details
          return `"Scale to $500k" - I love the ambition! That's a clear target.\n\n` +
                 `To make this really compelling for your campaign, let's add a couple details:\n\n` +
                 `• What are you at now? (e.g., "from $300k")\n` +
                 `• When do you want to hit $500k? (e.g., "by June 2026")\n` +
                 `• Who will help you get there? (e.g., "river cruise clients")\n\n` +
                 `Maybe something like: "Grow from $300k to $500k by June 2026 by attracting more river cruise clients"\n\n` +
                 `How would you fill in those blanks?`;
        } else if (message.includes('more clients') || message.includes('new clients')) {
          return `Getting more clients - that's what it's all about!\n\n` +
                 `Let's get specific:\n` +
                 `• How many new clients would make you happy? 5? 20? 50?\n` +
                 `• What type of clients? Business travelers? Families? Retirees?\n` +
                 `• Over what time period?\n\n` +
                 `Based on what you said, try:\n\n` +
                 `**"Attract [number] new [type] clients per month who book [type of trips]"**\n\n` +
                 `For example: "Attract 10 new luxury clients per month who book European river cruises"`;
        } else if (message.includes('fill') || message.includes('slow season')) {
          return `Ah, filling the slow season - smart thinking!\n\n` +
                 `Let's nail this down:\n` +
                 `• Which months are typically slow for you?\n` +
                 `• What kind of trips work best during those times?\n` +
                 `• How many bookings would "fill" mean to you?\n\n` +
                 `Here's a focused goal:\n\n` +
                 `**"Fill slow season (Oct-Feb) with 15+ warm-weather bookings per month"**\n\n` +
                 `Or: **"Generate consistent year-round revenue by promoting off-season destinations"**\n\n` +
                 `Which version feels right, or would you say it differently?`;
        } else {
          // Generic refinement for other goals
          return `You said: "${message}"\n\n` +
                 `That's a good start! Let's make it more specific:\n\n` +
                 `A powerful goal includes:\n` +
                 `• A number (clients, revenue, or bookings)\n` +
                 `• A deadline (3 months, by June, this year)\n` +
                 `• Your target audience\n\n` +
                 `For example: "${message} - specifically, 20 new luxury cruise bookings by December"\n\n` +
                 `How would you make your goal more specific?`;
        }
      } else {
        // Show intro message for help requests
        return `I see you're at the business goals question - this one trips up a lot of people! Let's figure it out together.\n\n` +
               `Think of it this way: if your direct mail campaign works perfectly, what would happen to your business?\n\n` +
               `Maybe you're thinking:\n` +
               `• "I just want more clients" - Great! How many more? 10? 50?\n` +
               `• "I want to fill up my slow season" - Which months are slow for you?\n` +
               `• "I want higher-paying clients" - What would that look like?\n\n` +
               `Don't worry about making it sound fancy. Just tell me in plain language what success looks like for you.\n\n` +
               `For example, one travel agent told me: "I want to book 2 more river cruises per month during winter." That's perfect!\n\n` +
               `What would make YOU excited about your business 6 months from now?\n\n` +
               `I suggest using: "[Your simple goal] over the next [timeframe] by focusing on [who you want to attract]."\n\n` +
               `Just fill in those blanks with what matters to you!`;
      }
    }
    
    if (fieldLabelLower.includes('budget')) {
      if (fieldOptions && fieldOptions.length > 0) {
        return `Okay, the budget question - I know this feels like a big decision!\n\n` +
               `Here's a simple way to think about it:\n\n` +
               `Imagine you could send a beautiful postcard to 1,000 potential clients. Would that feel like enough to start? Or are you thinking bigger?\n\n` +
               `• **$2,500-$5,000** = About 2,500-5,000 postcards\n` +
               `  Perfect if you're thinking: "Let me test this out first"\n\n` +
               `• **$5,000-$10,000** = About 5,000-10,000 postcards\n` +
               `  Good if you're thinking: "I'm ready to make some noise"\n\n` +
               `• **$10,000+** = 10,000+ postcards, multiple mailings\n` +
               `  Right if you're thinking: "Let's go big and dominate my area"\n\n` +
               `Most agents start with the first or second option to see what works, then scale up.\n\n` +
               `What feels comfortable for you to invest in getting new clients?\n\n` +
               `I suggest using: "$2,500 - $5,000" if this is your first direct mail campaign`;
      }
    }
    
    if (fieldLabelLower.includes('offer') || fieldLabelLower.includes('promotion')) {
      return `The offer field - this is where we make people say "ooh, I want that!"\n\n` +
             `Here's the secret: The best offers aren't always about discounts. Think about what you could give that costs you little but means a lot to clients.\n\n` +
             `For example:\n` +
             `• "Free airport transfers" (if you can arrange good rates)\n` +
             `• "Room upgrade at check-in" (hotels often do this for agents)\n` +
             `• "My personal restaurant guide" (you already know the best spots!)\n` +
             `• "24/7 support during travel" (you probably do this anyway)\n\n` +
             `What do your clients always ask for that you could include as a bonus?\n\n` +
             `Or think about it this way: What's something you do for clients that they don't expect but always appreciate?\n\n` +
             `I suggest using: "Free [something you mentioned above] when you book by [pick a date 30 days out]"\n\n` +
             `Keep it simple - one clear offer is better than a confusing list!`;
    }
    
    if (fieldLabelLower.includes('target audience') || fieldLabelLower.includes('audience')) {
      // Check if user provided actual input (not just asking for help)
      const messageLower = message.toLowerCase();
      const isAskingForHelp = messageLower.includes('help') || messageLower.includes('what should') || 
                              messageLower.includes('not sure') || messageLower.includes('don\'t know') ||
                              messageLower.includes('who should') || messageLower.length < 10;
      
      if (!isAskingForHelp && message.length > 10) {
        // User has provided actual content - help them refine it
        let refinementResponse = `Great description! Let me help you turn that into a focused target audience.\n\n`;
        refinementResponse += `You said: "${message}"\n\n`;
        
        // Extract key details from their input
        const hasAge = /\d{2}/.test(message);
        const hasOccupation = message.includes('professional') || message.includes('retire') || 
                             message.includes('business') || message.includes('executive') ||
                             message.includes('doctor') || message.includes('lawyer');
        const hasTravelStyle = message.includes('luxury') || message.includes('adventure') ||
                              message.includes('cruise') || message.includes('family') ||
                              message.includes('budget') || message.includes('group');
        
        if (hasAge || hasOccupation || hasTravelStyle) {
          refinementResponse += `I can see you're thinking about specific types of clients - perfect!\n\n`;
          refinementResponse += `Here's how to make your target audience crystal clear:\n\n`;
          
          if (!hasAge) {
            refinementResponse += `• Add an age range (like "45-65" or "30-50")\n`;
          }
          if (!hasOccupation) {
            refinementResponse += `• Mention what they do (professionals, retirees, business owners)\n`;
          }
          if (!hasTravelStyle) {
            refinementResponse += `• Include their travel style (luxury, adventure, cruises)\n`;
          }
          
          refinementResponse += `\nBased on what you wrote, try this:\n\n`;
          refinementResponse += `**"${message} who value personalized service and expert planning"**\n\n`;
          refinementResponse += `Or be even more specific:\n\n`;
          refinementResponse += `**"Affluent [profession] aged [range] seeking [travel type] with a focus on [what matters to them]"**`;
        } else {
          refinementResponse += `Let's make this more specific. A great target audience description includes:\n\n`;
          refinementResponse += `• **Age range**: Are they millennials (25-40)? Gen X (40-55)? Boomers (55-75)?\n`;
          refinementResponse += `• **Income/lifestyle**: Professionals? Retirees? Business owners?\n`;
          refinementResponse += `• **Travel preferences**: Luxury? Adventure? Family trips?\n`;
          refinementResponse += `• **What they value**: Convenience? Expertise? Deals?\n\n`;
          refinementResponse += `For example:\n`;
          refinementResponse += `"Professional couples 35-55 who take 2-3 luxury trips per year and value time-saving expertise"\n\n`;
          refinementResponse += `Tell me more about your ideal clients and I'll help you craft the perfect description!`;
        }
        
        return refinementResponse;
      } else {
        // Show intro message for help requests
        return `Target audience - basically "who's your perfect client?"\n\n` +
               `Close your eyes and picture your favorite client walking into your office. Got them? Good!\n\n` +
               `Now tell me about them:\n` +
               `• How old are they (roughly)?\n` +
               `• What do they do for work?\n` +
               `• What kind of trips do they book?\n` +
               `• Why do they love working with you?\n\n` +
               `For example, maybe you're picturing:\n` +
               `"Susan, she's about 55, owns a business, books 2-3 trips a year, loves that I handle all the details"\n\n` +
               `That's your target audience! We'll find more people like Susan.\n\n` +
               `I suggest using: "[Age range] [what they do] who [what kind of travel they like] and value [what you offer]"\n\n` +
               `So for Susan: "Professional women 45-65 who take luxury trips and value stress-free planning"`;
      }
    }
    
    if (fieldLabelLower.includes('headline') || fieldLabelLower.includes('subject')) {
      return `The headline - this is your "attention grabber"!\n\n` +
             `Think about what would make YOU stop and read a postcard. Usually it's one of these:\n\n` +
             `• A question they're asking: "Ready for your next adventure?"\n` +
             `• Something they want: "Your Italian villa awaits"\n` +
             `• A problem you solve: "Too busy to plan your dream trip?"\n` +
             `• Curiosity: "The secret beach even locals don't know"\n\n` +
             `What's the #1 thing your ideal client wants from a trip? Put that in your headline!\n\n` +
             `I suggest using: "[Something they want] + [Your specialty]"\n\n` +
             `Like: "Your stress-free luxury escape is waiting" or "Finally, a cruise expert who gets it"`;
    }
    
    if (fieldLabelLower.includes('call to action') || fieldLabelLower.includes('cta')) {
      return `Call to Action - this tells people what to do next (and makes it super easy!)\n\n` +
             `People are busy. Tell them EXACTLY what to do:\n\n` +
             `✅ Good: "Call me at 555-1234 for your free consultation"\n` +
             `❌ Not great: "Contact us for more information"\n\n` +
             `The magic formula:\n` +
             `[Action] + [How] + [What they get] + [When]\n\n` +
             `Examples:\n` +
             `• "Text CRUISE to 555-1234 for instant pricing"\n` +
             `• "Call Sarah at 555-5678 this week for your free travel planning session"\n` +
             `• "Visit TravelWithSarah.com/Italy to grab your Italian restaurant guide"\n\n` +
             `What's the EASIEST way for someone to reach you? Phone? Text? Website?\n\n` +
             `I suggest using: "Call [your name] at [your number] by [date 2-3 weeks out] for your free [your offer]"`;
    }
    
    // Default response for unrecognized fields
    return this.generateFieldAssistanceDefault(fieldContext, message);
  }
  
  /**
   * Generate default field assistance response
   */
  generateFieldAssistanceDefault(fieldContext, message) {
    const { fieldLabel, fieldType, fieldOptions, currentValue, sectionContext } = fieldContext;
    
    // Make the field label more conversational
    const friendlyLabel = fieldLabel.replace(/([A-Z])/g, ' $1').toLowerCase();
    
    let response = `I see you're stuck on "${fieldLabel}" - no worries, let me help!\n\n`;
    
    // Field type specific guidance
    if (fieldType === 'select' && fieldOptions) {
      response += `You need to pick one of these options:\n\n`;
      fieldOptions.forEach((option, index) => {
        response += `${index + 1}. ${option}\n`;
      });
      response += `\nNot sure which one? Think about:\n`;
      response += `• What describes you best RIGHT NOW?\n`;
      response += `• Which one would your current clients recognize?\n`;
      response += `• When in doubt, pick what you do most often\n\n`;
      response += `I suggest using: "${fieldOptions[0]}" (that's what most people choose to start)`;
    } else if (fieldType === 'textarea') {
      response += `This is where you can write a bit more about ${friendlyLabel}.\n\n`;
      response += `Don't stress about making it perfect! Just write like you're explaining to a friend.\n\n`;
      response += `Start with:\n`;
      response += `• What's most important to you about this?\n`;
      response += `• What makes you different?\n`;
      response += `• What do you want people to know?\n\n`;
      response += `Even 2-3 sentences is fine. You can always change it later!\n\n`;
      response += `I suggest using: Start with "I help [who] to [do what] so they can [benefit]"`;
    } else if (fieldType === 'number') {
      response += `Just need a number here - keep it simple!\n\n`;
      response += `Think about:\n`;
      response += `• What feels realistic for you?\n`;
      response += `• What would make you happy?\n`;
      response += `• What can you actually handle?\n\n`;
      response += `There's no "wrong" answer - just put what makes sense for YOUR business.\n\n`;
      response += `I suggest using: Start with a smaller number you're confident about. You can always increase it later!`;
    } else {
      response += `This field is asking about ${friendlyLabel}.\n\n`;
      response += `Here's my advice: Don't overthink it! \n\n`;
      response += `Ask yourself:\n`;
      response += `• What would I tell a friend who asked about this?\n`;
      response += `• What's the simple, honest answer?\n`;
      response += `• What feels right for my business?\n\n`;
      response += `I suggest using: Whatever first comes to mind - that's usually the right answer!`;
    }
    
    return response;
  }

  /**
   * Get user expertise profile
   */
  async getUserExpertise(userId) {
    try {
      // Try to get detailed profile first
      const profile = await this.expertiseProfiles.getUserProfile(userId);
      if (profile) {
        return {
          level: profile.overall_level,
          confidence: profile.overall_confidence,
          channel_expertise: profile.channel_expertise,
          learning_style: profile.preferred_learning_style,
          technical_comfort: profile.technical_comfort,
          industry_experience: profile.industry_experience,
          tools_familiar: profile.tools_familiar
        };
      }
      
      // Fallback to basic assessment data
      const basicExpertise = await this.expertiseAssessment.getUserExpertise(userId);
      return basicExpertise || {
        level: 'beginner',
        confidence: 0.5,
        channel_expertise: {},
        learning_style: 'visual',
        technical_comfort: 0.5
      };
    } catch (error) {
      console.error('Error getting user expertise:', error);
      return {
        level: 'beginner',
        confidence: 0.5,
        channel_expertise: {},
        learning_style: 'visual',
        technical_comfort: 0.5
      };
    }
  }

  /**
   * Generate base response - First check for specific template responses
   */
  async generateResponse(message, context) {
    // Check if we have a specific template response for this topic/level combination
    const templateResponse = await this.tryGenerateTemplateResponse(message, context);
    if (templateResponse) {
      return templateResponse;
    }
    
    // Use existing processQuery method for base response generation
    const queryResult = await this.processQuery(message, context);
    
    return {
      content: queryResult.content || this.buildResponseContent(queryResult),
      context: queryResult.context,
      intent: queryResult.intent,
      results: queryResult.results,
      suggestions: queryResult.suggestions,
      quickActions: queryResult.quickActions,
      template: queryResult.template
    };
  }

  /**
   * Try to generate response using specific expertise templates
   */
  async tryGenerateTemplateResponse(message, context) {
    const { topic, channel, expertise } = context;
    
    // Map common questions to subtopics
    const questionMapping = {
      'improve email open rates': { topic: 'email', subtopic: 'open_rates' },
      'email open rate': { topic: 'email', subtopic: 'open_rates' },
      'open rates': { topic: 'email', subtopic: 'open_rates' },
      'subject line': { topic: 'email', subtopic: 'subject_lines' },
      'email subject': { topic: 'email', subtopic: 'subject_lines' },
      'title tag': { topic: 'seo', subtopic: 'title_tags' },
      'meta description': { topic: 'seo', subtopic: 'meta_descriptions' },
      'keyword research': { topic: 'seo', subtopic: 'keyword_research' },
      'social media content': { topic: 'social', subtopic: 'content_strategy' },
      'ppc campaign': { topic: 'ppc', subtopic: 'campaign_structure' },
      'blog strategy': { topic: 'content', subtopic: 'blog_strategy' },
      'conversion tracking': { topic: 'analytics', subtopic: 'conversion_tracking' }
    };

    // Find matching topic and subtopic
    let matchedTopic = null, matchedSubtopic = null;
    
    const messageLower = message.toLowerCase();
    Object.keys(questionMapping).forEach(question => {
      if (messageLower.includes(question)) {
        matchedTopic = questionMapping[question].topic;
        matchedSubtopic = questionMapping[question].subtopic;
      }
    });

    // Use detected context if no direct match
    if (!matchedTopic) {
      matchedTopic = channel || topic;
      // Default subtopics based on context
      const defaultSubtopics = {
        'email': 'open_rates',
        'seo': 'title_tags',
        'social': 'content_strategy',
        'ppc': 'campaign_structure',
        'content': 'blog_strategy',
        'analytics': 'conversion_tracking'
      };
      matchedSubtopic = defaultSubtopics[matchedTopic];
    }

    // Generate adaptive response if we have a match
    if (matchedTopic && matchedSubtopic) {
      const adaptiveContent = generateAdaptiveResponse(
        matchedTopic, 
        matchedSubtopic, 
        expertise, 
        {
          includeMetrics: context.technical_comfort > 0.6,
          includeTools: context.tools_familiar?.length > 0
        }
      );

      if (adaptiveContent) {
        return {
          content: adaptiveContent,
          context: { ...context, source: 'expertise_template', topic: matchedTopic, subtopic: matchedSubtopic },
          intent: 'marketing_guidance',
          template: `${matchedTopic}_${matchedSubtopic}_${expertise}`,
          isAdaptive: true
        };
      }
    }

    return null;
  }

  /**
   * Build response content from query results
   */
  buildResponseContent(queryResult) {
    let content = '';
    
    if (queryResult.results && queryResult.results.length > 0) {
      content += '## Marketing Insights\n\n';
      
      queryResult.results.forEach((result, index) => {
        content += `### ${result.title}\n`;
        if (result.description) {
          content += `${result.description}\n\n`;
        }
        if (result.content) {
          content += `${result.content}\n\n`;
        }
      });
    }
    
    // Add template content if available
    if (queryResult.template && queryResult.template.content) {
      content += queryResult.template.content + '\n\n';
    }
    
    // Add suggestions
    if (queryResult.suggestions && queryResult.suggestions.length > 0) {
      content += '## Recommendations\n\n';
      queryResult.suggestions.forEach(suggestion => {
        content += `- ${suggestion.message}\n`;
      });
    }
    
    // Don't return a generic question if we have no content - let the system handle it
    return content;
  }

  /**
   * Adapt response based on user expertise
   */
  async adaptResponseForExpertise(baseResponse, expertise, context) {
    try {
      // Get adaptive response template if available
      const adaptiveTemplate = this.getAdaptiveTemplate(
        context.topic,
        context.subtopic || context.intent,
        expertise.level
      );
      
      if (adaptiveTemplate) {
        // Use expertise-specific template
        const adaptedContent = generateAdaptiveResponse(
          context.topic,
          context.subtopic || context.intent,
          expertise.level,
          {
            includeMetrics: expertise.technical_comfort > 0.6,
            includeTools: expertise.tools_familiar?.length > 0,
            hasData: context.hasData || false
          }
        );
        
        if (adaptedContent) {
          baseResponse.content = adaptedContent;
          baseResponse.adaptationSource = 'template';
        }
      }
      
      // Apply communication style adaptation
      if (baseResponse.content) {
        const communicationPrefs = await this.expertiseProfiles.getCommunicationPreferences(context.userId);
        
        baseResponse.content = this.communicationAdapter.adaptResponse(
          baseResponse.content,
          expertise.level,
          {
            topic: context.topic,
            channelExpertise: context.channelExpertise,
            learningStyle: expertise.learning_style,
            technicalComfort: expertise.technical_comfort,
            industryContext: expertise.industry_experience,
            communicationPrefs
          }
        );
        
        baseResponse.adaptationSource = baseResponse.adaptationSource === 'template' ? 'both' : 'communication';
      }
      
      // Add expertise-specific quick actions
      baseResponse.quickActions = this.enhanceQuickActionsForExpertise(
        baseResponse.quickActions || [],
        expertise,
        context
      );
      
      // Add learning recommendations
      if (context.channelExpertise && context.channelExpertise.confidence < 0.7) {
        baseResponse.learningRecommendations = await this.generateLearningRecommendations(
          context.userId,
          context.topic,
          expertise
        );
      }
      
      return baseResponse;
      
    } catch (error) {
      console.error('Error adapting response for expertise:', error);
      return baseResponse; // Return original response on error
    }
  }

  /**
   * Adapt specialized agent response based on user expertise
   */
  async adaptSpecializedResponse(agentResponse, expertise, context) {
    try {
      // Extract content and metadata
      const { content, metadata } = agentResponse;
      
      // Create adapted response structure
      const adaptedResponse = {
        content: content.text,  // Changed from 'text' to 'content' for CMOChatHandler compatibility
        type: agentResponse.type,
        agent: agentResponse.agent,
        format: 'adaptive',
        confidence: content.confidence || 'medium',
        adaptationSource: 'specialized_agent',
        metadata: {
          ...metadata,
          adapted: true,
          originalAgent: agentResponse.agent,
          userExpertise: expertise?.level || 'beginner'
        }
      };
      
      // Adapt language complexity based on expertise
      if (expertise && expertise.level !== 'advanced') {
        adaptedResponse.content = await this.communicationAdapter.adaptMessage(
          content.text,
          expertise.preferences || {},
          context
        );
      }
      
      // Add structured data for UI rendering
      if (content.structured) {
        adaptedResponse.structured = content.structured;
        
        // Simplify metrics for beginners
        if (expertise?.level === 'beginner' && content.structured.metrics) {
          adaptedResponse.structured.metrics = this.simplifyMetrics(content.structured.metrics);
        }
      }
      
      // Add citations with expertise-appropriate explanations
      if (content.citations && content.citations.length > 0) {
        adaptedResponse.citations = content.citations.map(citation => ({
          ...citation,
          explanation: this.getCitationExplanation(citation, expertise?.level)
        }));
      }
      
      // Add next steps based on expertise
      adaptedResponse.quickActions = this.generateSpecializedQuickActions(
        agentResponse.agent,
        expertise?.level || 'beginner',
        content.structured
      );
      
      // Add follow-up suggestions
      adaptedResponse.followUpSuggestions = this.generateFollowUpSuggestions(
        agentResponse.agent,
        content.structured,
        expertise
      );
      
      // Return in the format expected by CMOChatHandler
      return {
        content: adaptedResponse.content,
        results: [],  // Specialized agents don't return search results
        queryType: 'specialized',
        intent: 'specialized_guidance',
        suggestions: adaptedResponse.followUpSuggestions || [],
        quickActions: adaptedResponse.quickActions || [],
        confidence: adaptedResponse.confidence || content.confidence || 'medium',
        metadata: adaptedResponse.metadata,
        additionalContext: {
          agent: agentResponse.agent,
          structured: adaptedResponse.structured
        },
        // Include structured data that formatResponse can use
        metrics: adaptedResponse.structured?.metrics,
        benchmarks: adaptedResponse.structured?.benchmarks,
        recommendations: adaptedResponse.structured?.recommendations,
        examples: adaptedResponse.structured?.examples,
        nextSteps: adaptedResponse.structured?.nextSteps
      };
      
    } catch (error) {
      console.error('Error adapting specialized response:', error);
      // Return original response formatted for CMO system
      // Handle both string and object content structures
      let contentText;
      if (agentResponse.content && typeof agentResponse.content === 'object') {
        contentText = agentResponse.content.text || '';
      } else if (typeof agentResponse.content === 'string') {
        contentText = agentResponse.content;
      } else {
        contentText = 'I apologize, but I encountered an error processing your request.';
      }
      
      return {
        content: contentText,
        results: [],
        queryType: 'specialized',
        intent: 'specialized_guidance',
        suggestions: [],
        quickActions: [],
        confidence: agentResponse.metadata?.confidence || 'low',
        metadata: agentResponse.metadata,
        additionalContext: {
          agent: agentResponse.agent,
          error: error.message
        }
      };
    }
  }

  /**
   * Get adaptive response template
   */
  getAdaptiveTemplate(topic, subtopic, level) {
    try {
      const topicKey = topic.toUpperCase();
      if (ResponseTemplates[topicKey] && ResponseTemplates[topicKey][subtopic]) {
        return ResponseTemplates[topicKey][subtopic][level];
      }
      return null;
    } catch (error) {
      console.error('Error getting adaptive template:', error);
      return null;
    }
  }

  /**
   * Enhance quick actions based on expertise
   */
  enhanceQuickActionsForExpertise(quickActions, expertise, context) {
    const enhanced = [...quickActions];
    
    // Add level-appropriate actions
    if (expertise.level === 'beginner') {
      enhanced.unshift({
        id: 'explain-basics',
        label: 'Explain Basics',
        icon: '📚',
        priority: 'high'
      });
    } else if (expertise.level === 'expert') {
      enhanced.push({
        id: 'advanced-strategies',
        label: 'Advanced Strategies',
        icon: '🚀',
        priority: 'medium'
      });
    }
    
    // Add channel-specific actions based on expertise
    if (context.channelExpertise && context.channelExpertise.level > 2) {
      enhanced.push({
        id: 'deep-dive',
        label: `Advanced ${context.channel.toUpperCase()}`,
        icon: '🔍',
        priority: 'medium'
      });
    }
    
    return enhanced;
  }

  /**
   * Generate learning recommendations
   */
  async generateLearningRecommendations(userId, topic, expertise) {
    try {
      const recommendations = await this.expertiseProfiles.getChannelRecommendations(userId);
      
      // Filter for current topic/channel
      const channel = this.expertiseProfiles.mapTopicToChannel(topic);
      const channelRecs = recommendations.filter(rec => rec.channel === channel);
      
      if (channelRecs.length > 0) {
        return channelRecs.map(rec => ({
          type: rec.type,
          message: rec.recommendation,
          priority: rec.priority,
          action: rec.type === 'improvement' ? 'Learn Fundamentals' : 'Explore Advanced Topics'
        }));
      }
      
      // Generate default recommendations
      return [{
        type: 'improvement',
        message: `Build stronger foundation in ${topic} fundamentals`,
        priority: 'medium',
        action: 'View Learning Resources'
      }];
    } catch (error) {
      console.error('Error generating learning recommendations:', error);
      return [];
    }
  }

  /**
   * Track interaction for learning
   */
  async trackInteractionLearning(userId, interactionData) {
    try {
      // Track with expertise learning system
      await this.expertiseLearning.trackInteraction(userId, {
        message: interactionData.message,
        response: interactionData.response.content,
        duration: interactionData.duration,
        topic: interactionData.topic,
        type: 'message',
        success: !this.hasConfusionSignals(interactionData.message),
        metadata: {
          channel: interactionData.channel,
          intent: interactionData.context.intent,
          adaptationSource: interactionData.response.adaptationSource,
          quickActionsUsed: interactionData.response.quickActions?.length || 0
        }
      });
      
      // Update channel expertise based on interaction
      await this.expertiseProfiles.updateChannelExpertise(userId, interactionData.topic, {
        success: !this.hasConfusionSignals(interactionData.message),
        confusion: this.hasConfusionSignals(interactionData.message),
        timeToComplete: interactionData.duration,
        difficulty: this.assessMessageDifficulty(interactionData.message)
      });
      
    } catch (error) {
      console.error('Error tracking interaction learning:', error);
      // Don't throw error to avoid breaking main flow
    }
  }

  /**
   * Check for confusion signals in message
   */
  hasConfusionSignals(message) {
    const confusionPhrases = [
      "i don't understand",
      "can you explain",
      "what does that mean",
      "i'm confused",
      "too complicated",
      "can you simplify"
    ];
    
    const lowerMessage = message.toLowerCase();
    return confusionPhrases.some(phrase => lowerMessage.includes(phrase));
  }

  /**
   * Assess message difficulty level
   */
  assessMessageDifficulty(message) {
    const advancedTerms = [
      'attribution', 'programmatic', 'remarketing', 'cohort',
      'funnel optimization', 'multivariate', 'segmentation',
      'automation', 'integration', 'analytics'
    ];
    
    const lowerMessage = message.toLowerCase();
    const advancedCount = advancedTerms.filter(term => lowerMessage.includes(term)).length;
    
    if (advancedCount >= 3) return 'expert';
    if (advancedCount >= 2) return 'advanced';
    if (advancedCount >= 1) return 'intermediate';
    return 'beginner';
  }

  /**
   * Process a marketing query with context-aware enhancements
   * @deprecated Use processQuery(message, options) instead
   */
  async processQueryDeprecated(query, context = {}) {
    const { category, subMode, expertise = 'intermediate', userId = 'default' } = context;
    
    try {
      // Process conversation flow first
      const conversationContext = await this.conversationFlow.processMessage(userId, query, context);
      
      // Detect marketing context
      const contextAnalysis = await this.contextDetector.detectMarketingContext(query);
      
      // Use detected context or provided subMode
      const effectiveContext = contextAnalysis.primaryContext || subMode || category;
      
      // Search for relevant knowledge
      const searchResults = await this.knowledgeBase.search(query, {
        category: effectiveContext,
        limit: 5
      });
      
      // Get query type and intent
      const queryType = this.detectQueryType(query);
      const intent = contextAnalysis.intent || 'general';
      
      // Build base response
      const baseResponse = {
        query,
        context: effectiveContext,
        queryType,
        intent,
        results: searchResults,
        confidence: contextAnalysis.confidence
      };
      
      // Get context-specific template
      const template = await this.getContextTemplate(effectiveContext, intent, expertise);
      if (template) {
        baseResponse.template = template;
      }
      
      // Enhance response with context-aware content
      const enhancedResponse = await this.responseEnhancer.enhanceResponse(
        query,
        baseResponse,
        {
          mode: 'cmo',
          subMode: effectiveContext,
          intent,
          expertise,
          analysis: contextAnalysis
        }
      );
      
      // Add quick actions for the context
      enhancedResponse.quickActions = this.getQuickActions(effectiveContext);
      
      // Add additional context
      enhancedResponse.additionalContext = await this.getAdditionalContext(
        queryType,
        effectiveContext
      );
      
      // Add conversation flow context
      enhancedResponse.conversation = {
        session: conversationContext.session,
        stage: conversationContext.session.stage,
        breadcrumbs: conversationContext.breadcrumbs,
        followUpSuggestions: conversationContext.followUpSuggestions,
        memory: conversationContext.memory,
        previousTopics: conversationContext.previousTopics
      };
      
      // Add personalized elements based on conversation memory
      if (conversationContext.memory.businessInfo.name) {
        enhancedResponse.personalization = {
          businessName: conversationContext.memory.businessInfo.name,
          industry: conversationContext.memory.businessInfo.industry,
          previousChallenges: conversationContext.businessContext.challenges,
          goals: conversationContext.businessContext.goals
        };
      }
      
      return enhancedResponse;
      
    } catch (error) {
      console.error('Error processing CMO query:', error);
      return {
        results: [],
        error: error.message
      };
    }
  }

  /**
   * Detect the type of marketing query
   */
  detectQueryType(query) {
    const queryLower = query.toLowerCase();
    
    // Template requests
    if (queryLower.includes('template') || queryLower.includes('example')) {
      return 'template';
    }
    
    // How-to questions
    if (queryLower.startsWith('how to') || queryLower.includes('how do i')) {
      return 'howto';
    }
    
    // Best practices
    if (queryLower.includes('best practice') || queryLower.includes('tips')) {
      return 'bestpractice';
    }
    
    // Analysis requests
    if (queryLower.includes('analyze') || queryLower.includes('review')) {
      return 'analysis';
    }
    
    // Tool requests
    if (queryLower.includes('tool') || queryLower.includes('calculator')) {
      return 'tool';
    }
    
    return 'general';
  }

  /**
   * Get additional context based on query type
   */
  async getAdditionalContext(queryType, category) {
    const context = {};
    
    switch (queryType) {
      case 'template':
        // Get available templates
        const templates = this.knowledgeBase.getByCategory(category)
          .filter(item => item.type === 'template');
        context.availableTemplates = templates.map(t => ({
          title: t.title,
          description: t.description
        }));
        break;
        
      case 'bestpractice':
        // Get a random tip
        const tip = this.knowledgeBase.getRandomTip(category);
        if (tip) {
          context.quickTip = tip;
        }
        break;
        
      case 'tool':
        // Get available tools
        const tools = this.knowledgeBase.getByCategory(category)
          .filter(item => item.type === 'tool');
        context.availableTools = tools.map(t => ({
          title: t.title,
          description: t.description
        }));
        break;
    }
    
    // Get category stats
    const stats = this.knowledgeBase.getStats();
    if (stats.categories[category]) {
      context.categoryInfo = {
        totalItems: stats.categories[category].count,
        types: stats.categories[category].types
      };
    }
    
    return context;
  }

  /**
   * Get context-specific template
   */
  async getContextTemplate(context, intent, expertise) {
    let template = null;
    
    switch (context) {
      case 'seo':
        template = getSEOTemplate(intent, expertise);
        break;
      case 'email':
        template = getEmailTemplate(intent, expertise);
        break;
      case 'social':
        // For social, we'll return platform guide if platform is mentioned
        template = { type: 'social', intent, expertise };
        break;
      case 'directMail':
        template = { type: 'directMail', intent, expertise };
        break;
      case 'ads':
        template = { type: 'ads', intent, expertise };
        break;
    }
    
    return template;
  }

  /**
   * Generate suggestions based on query results
   */
  generateSuggestions(queryType, results) {
    const suggestions = [];
    
    if (results.length === 0) {
      suggestions.push({
        type: 'expand',
        message: 'Try broadening your search or asking about general best practices'
      });
    }
    
    switch (queryType) {
      case 'template':
        suggestions.push({
          type: 'action',
          message: 'Would you like me to customize a template for your specific needs?'
        });
        break;
        
      case 'howto':
        suggestions.push({
          type: 'followup',
          message: 'Do you need step-by-step instructions or examples?'
        });
        break;
        
      case 'analysis':
        suggestions.push({
          type: 'action',
          message: 'Share your content and I can provide specific feedback'
        });
        break;
    }
    
    return suggestions;
  }

  /**
   * Get quick actions for a category
   */
  getQuickActions(category) {
    const actions = {
      seo: [
        { id: 'title-checker', label: 'Check Title Tag', icon: '📏' },
        { id: 'meta-generator', label: 'Generate Meta Description', icon: '📝' },
        { id: 'keyword-research', label: 'Keyword Ideas', icon: '🔑' },
        { id: 'content-audit', label: 'Content Audit', icon: '🔍' }
      ],
      email: [
        { id: 'subject-tester', label: 'Test Subject Line', icon: '🧪' },
        { id: 'spam-check', label: 'Spam Check', icon: '🚫' },
        { id: 'template-gallery', label: 'Email Templates', icon: '📧' },
        { id: 'segment-builder', label: 'Build Segment', icon: '👥' }
      ],
      social: [
        { id: 'hashtag-generator', label: 'Generate Hashtags', icon: '#️⃣' },
        { id: 'post-ideas', label: 'Post Ideas', icon: '💡' },
        { id: 'content-calendar', label: 'Content Calendar', icon: '📅' },
        { id: 'engagement-tips', label: 'Engagement Tips', icon: '💬' }
      ],
      'direct-mail': [
        { id: 'postcard-design', label: 'Design Postcard', icon: '🎨' },
        { id: 'copy-generator', label: 'Generate Copy', icon: '✍️' },
        { id: 'roi-calculator', label: 'ROI Calculator', icon: '💰' },
        { id: 'usps-guide', label: 'USPS Guide', icon: '📮' }
      ],
      ads: [
        { id: 'ad-copy-generator', label: 'Generate Ad Copy', icon: '📝' },
        { id: 'keyword-planner', label: 'Keyword Planner', icon: '🎯' },
        { id: 'budget-optimizer', label: 'Optimize Budget', icon: '💵' },
        { id: 'performance-analyzer', label: 'Analyze Performance', icon: '📊' }
      ]
    };
    
    return actions[category] || [];
  }

  /**
   * Execute a quick action
   */
  async executeQuickAction(actionId, params = {}) {
    switch (actionId) {
      case 'title-checker':
        return this.checkTitleTag(params.title);
        
      case 'subject-tester':
        return this.testSubjectLine(params.subject);
        
      case 'hashtag-generator':
        return this.generateHashtags(params.content);
        
      default:
        return {
          error: 'Unknown action',
          message: `Action ${actionId} is not implemented yet`
        };
    }
  }

  /**
   * Title tag checker
   */
  checkTitleTag(title) {
    if (!title) {
      return { error: 'No title provided' };
    }
    
    const length = title.length;
    const analysis = {
      title,
      length,
      status: 'good',
      issues: [],
      suggestions: []
    };
    
    // Length check
    if (length < 30) {
      analysis.status = 'warning';
      analysis.issues.push('Title is too short (under 30 characters)');
      analysis.suggestions.push('Add more descriptive keywords');
    } else if (length > 60) {
      analysis.status = 'warning';
      analysis.issues.push('Title may be truncated in search results (over 60 characters)');
      analysis.suggestions.push('Consider shortening to ensure full visibility');
    }
    
    // Keyword position
    if (!title.toLowerCase().includes('|') && !title.includes('-')) {
      analysis.suggestions.push('Consider adding your brand name with a separator');
    }
    
    // Special characters
    if (title.includes('&')) {
      analysis.suggestions.push('Consider using "and" instead of "&" for better readability');
    }
    
    return analysis;
  }

  /**
   * Subject line tester
   */
  testSubjectLine(subject) {
    if (!subject) {
      return { error: 'No subject line provided' };
    }
    
    const analysis = {
      subject,
      length: subject.length,
      score: 100,
      issues: [],
      suggestions: []
    };
    
    // Length check
    if (subject.length > 50) {
      analysis.score -= 10;
      analysis.issues.push('Subject line is long (may be cut off on mobile)');
    }
    
    // Spam words check
    const spamWords = ['free', 'guarantee', 'click here', 'buy now', 'limited time'];
    const foundSpam = spamWords.filter(word => 
      subject.toLowerCase().includes(word)
    );
    
    if (foundSpam.length > 0) {
      analysis.score -= foundSpam.length * 15;
      analysis.issues.push(`Contains spam trigger words: ${foundSpam.join(', ')}`);
      analysis.suggestions.push('Replace spam trigger words with alternatives');
    }
    
    // Personalization check
    if (subject.includes('{{') || subject.includes('{name}')) {
      analysis.score += 10;
      analysis.suggestions.push('Good use of personalization!');
    }
    
    // Emoji check
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]/u;
    if (emojiRegex.test(subject)) {
      analysis.suggestions.push('Test with and without emoji - results vary by audience');
    }
    
    analysis.score = Math.max(0, Math.min(100, analysis.score));
    
    return analysis;
  }

  /**
   * Hashtag generator
   */
  async generateHashtags(content) {
    if (!content) {
      return { error: 'No content provided' };
    }
    
    // Extract keywords from content
    const words = content.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'from', 'have'].includes(word));
    
    // Generate hashtags
    const hashtags = {
      recommended: [],
      trending: [],
      niche: []
    };
    
    // Simple keyword-based hashtags
    const keywords = [...new Set(words)].slice(0, 5);
    hashtags.recommended = keywords.map(word => `#${word}`);
    
    // Add some generic trending tags based on content
    if (content.includes('marketing')) {
      hashtags.trending.push('#MarketingTips', '#DigitalMarketing');
    }
    if (content.includes('business')) {
      hashtags.trending.push('#SmallBusiness', '#Entrepreneur');
    }
    
    // Niche tags
    hashtags.niche = hashtags.recommended.map(tag => tag + 'Tips');
    
    return {
      hashtags,
      tips: [
        'Use 5-10 hashtags on Instagram',
        'Use 1-2 hashtags on Twitter',
        'Mix popular and niche hashtags',
        'Create a branded hashtag for campaigns'
      ]
    };
  }

  /**
   * Navigate back in conversation
   */
  async navigateBack(userId, steps = 1) {
    return this.conversationFlow.navigateBack(userId, steps);
  }

  /**
   * Get conversation summary
   */
  async getConversationSummary(userId) {
    return this.conversationFlow.getSessionSummary(userId);
  }

  /**
   * Clear conversation session
   */
  async clearConversation(userId) {
    this.conversationFlow.clearSession(userId);
    return { success: true, message: 'Conversation cleared' };
  }

  /**
   * Process follow-up suggestion
   */
  async processFollowUp(userId, suggestion) {
    // Generate a query from the suggestion
    const query = suggestion.text || suggestion;
    const context = {
      userId,
      isFollowUp: true,
      previousIntent: suggestion.intent,
      topic: suggestion.topic
    };
    
    return this.processQuery(query, context);
  }

  /**
   * Get marketing health assessment
   */
  async getMarketingHealth(userId) {
    try {
      const health = await this.marketingIntelligence.analyzeMarketingHealth(userId);
      
      // Track any mentioned metrics
      const session = this.conversationFlow.getSession(userId);
      if (session.memory.metrics.size > 0) {
        session.memory.metrics.forEach((metric, key) => {
          if (metric.context) {
            this.marketingIntelligence.updateProgress(
              userId,
              metric.context,
              key,
              metric.value
            );
          }
        });
      }
      
      return health;
    } catch (error) {
      console.error('Failed to get marketing health:', error);
      return null;
    }
  }

  /**
   * Get proactive suggestions
   */
  async getProactiveSuggestions(userId) {
    return this.marketingIntelligence.generateProactiveSuggestions(userId);
  }

  /**
   * Process marketing health query
   */
  async processHealthQuery(userId, query = 'Show my marketing health') {
    const health = await this.getMarketingHealth(userId);
    
    if (!health) {
      return {
        content: "I'm unable to assess your marketing health at the moment. Let's continue our conversation to gather more information.",
        error: true
      };
    }
    
    const response = {
      query,
      context: 'health_assessment',
      queryType: 'analysis',
      intent: 'analyze',
      results: [],
      marketingHealth: health,
      confidence: 1.0
    };
    
    // Enhance with context-aware content
    const enhanced = await this.responseEnhancer.enhanceResponse(
      query,
      response,
      {
        mode: 'cmo',
        subMode: 'all',
        intent: 'analyze',
        expertise: 'intermediate'
      }
    );
    
    // Add health-specific content
    enhanced.content = this.generateHealthSummary(health);
    enhanced.visualization = 'dashboard';
    
    return enhanced;
  }

  /**
   * Generate health summary text
   */
  generateHealthSummary(health) {
    const { summary, gaps, opportunities, crossChannelInsights } = health;
    
    let content = `## Marketing Health Assessment\n\n`;
    content += `**Overall Score: ${summary.overallHealth.score}/100** - ${summary.overallHealth.label}\n\n`;
    content += `You have **${summary.overallHealth.activeChannels} active channels** out of ${summary.overallHealth.totalChannels} `;
    content += `(${summary.overallHealth.coverage}% coverage).\n\n`;
    
    // Critical gaps
    const criticalGaps = gaps.filter(g => g.severity === 'high');
    if (criticalGaps.length > 0) {
      content += `### 🚨 Critical Areas to Address\n`;
      criticalGaps.forEach(gap => {
        content += `- **${gap.description}**\n  → ${gap.recommendation}\n`;
      });
      content += '\n';
    }
    
    // Top opportunities
    if (opportunities.length > 0) {
      content += `### 💡 Top Opportunities\n`;
      opportunities.slice(0, 3).forEach(opp => {
        content += `- **${opp.title}**\n`;
        if (opp.description) {
          content += `  ${opp.description}\n`;
        }
      });
      content += '\n';
    }
    
    // Cross-channel insights
    if (crossChannelInsights.length > 0) {
      content += `### 🔗 Cross-Channel Insights\n`;
      crossChannelInsights.slice(0, 2).forEach(insight => {
        content += `- ${insight.insight}\n`;
      });
    }
    
    return content;
  }

  /**
   * Get expertise-based response (main entry point for chat integration)
   */
  async getExpertiseResponse(message, userId, options = {}) {
    // Use the new processMessage method with expertise integration
    return this.processMessage(message, userId, options);
  }

  /**
   * Update user expertise profile
   */
  async updateUserExpertise(userId, assessment) {
    try {
      // Create detailed profile
      await this.expertiseProfiles.createDetailedProfile(userId, assessment);
      
      // Save basic assessment
      await this.expertiseAssessment.saveAssessment(userId, assessment, {});
      
      return { success: true };
    } catch (error) {
      console.error('Error updating user expertise:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's expertise summary
   */
  async getUserExpertiseSummary(userId) {
    try {
      return await this.expertiseProfiles.getExpertiseSummary(userId);
    } catch (error) {
      console.error('Error getting expertise summary:', error);
      return null;
    }
  }

  /**
   * Get personalized learning recommendations
   */
  async getPersonalizedRecommendations(userId) {
    try {
      return await this.expertiseProfiles.getChannelRecommendations(userId);
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      return [];
    }
  }

  /**
   * Check if user needs expertise assessment
   */
  async needsExpertiseAssessment(userId) {
    try {
      const profile = await this.expertiseProfiles.getUserProfile(userId);
      return !profile; // Needs assessment if no profile exists
    } catch (error) {
      console.error('Error checking expertise assessment need:', error);
      return true; // Assume needs assessment on error
    }
  }

  /**
   * Get expertise learning insights
   */
  async getLearningInsights(userId) {
    try {
      return await this.expertiseLearning.getLearningInsights(userId);
    } catch (error) {
      console.error('Error getting learning insights:', error);
      return { hasData: false };
    }
  }

  /**
   * Simplify metrics for beginners
   */
  simplifyMetrics(metrics) {
    const simplified = {};
    
    for (const [key, value] of Object.entries(metrics)) {
      // Convert technical metric names to user-friendly ones
      const friendlyKey = key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^expected/, 'Expected')
        .replace(/ROI/g, 'Return on Investment')
        .trim();
      
      // Add explanations for complex metrics
      if (key.includes('Response') || key.includes('Rate')) {
        simplified[friendlyKey] = {
          value: value,
          explanation: 'Industry benchmark for similar campaigns'
        };
      } else {
        simplified[friendlyKey] = value;
      }
    }
    
    return simplified;
  }

  /**
   * Get citation explanation based on expertise level
   */
  getCitationExplanation(citation, expertiseLevel) {
    if (expertiseLevel === 'beginner') {
      return `This information comes from our ${citation.source.replace('.md', '').replace(/-/g, ' ')} guide`;
    } else if (expertiseLevel === 'intermediate') {
      return `Source: ${citation.section || 'General guidance'}`;
    } else {
      return citation.snippet;
    }
  }

  /**
   * Generate quick actions for specialized agent responses
   */
  generateSpecializedQuickActions(agentType, expertiseLevel, structuredData) {
    const actions = [];
    
    if (agentType === 'direct_mail') {
      if (expertiseLevel === 'beginner') {
        actions.push(
          { label: 'Download Campaign Checklist', action: 'download_checklist', data: { type: 'direct_mail' } },
          { label: 'Calculate My Budget', action: 'budget_calculator', data: { campaign: 'direct_mail' } },
          { label: 'Find Print Vendors', action: 'vendor_search', data: { type: 'printing' } }
        );
      } else {
        actions.push(
          { label: 'A/B Test Calculator', action: 'ab_test_calc', data: { type: 'direct_mail' } },
          { label: 'ROI Predictor', action: 'roi_predict', data: structuredData?.metrics },
          { label: 'Export Campaign Brief', action: 'export_brief', data: structuredData }
        );
      }
    }
    
    // Add more agent-specific actions for SEO, PPC, Meta Ads
    
    return actions;
  }

  /**
   * Generate follow-up suggestions based on agent response
   */
  generateFollowUpSuggestions(agentType, structuredData, expertise) {
    const suggestions = [];
    
    if (agentType === 'direct_mail') {
      if (structuredData?.recommendations) {
        suggestions.push('Tell me more about the first recommendation');
      }
      
      if (expertise?.level === 'beginner') {
        suggestions.push(
          'What\'s the difference between postcards and letters?',
          'How do I build a mailing list?',
          'What\'s a typical budget for my first campaign?'
        );
      } else {
        suggestions.push(
          'How can I improve response rates?',
          'What are the latest USPS regulations?',
          'Show me examples of high-converting offers'
        );
      }
    }
    
    return suggestions;
  }
}

// Export singleton instance
export const cmoAssistant = new CMOAssistant();
export default CMOAssistant;