/**
 * DirectMailAgent - Adaptive direct mail marketing consultant
 * 
 * Provides expert guidance on direct mail campaigns for travel agencies
 * using adaptive conversation that adjusts to user needs.
 */

import { registerAgent } from '../AgentRegistry.js';
import llmManager from '../../../llm/LLMManager.js';

export class DirectMailAgent {
  static metadata = {
    channel: 'direct_mail',
    name: 'Direct Mail Marketing Expert',
    description: 'Adaptive direct mail campaign consultant',
    priority: 10,
    triggers: [
      /direct mail/i,
      /postcard/i,
      /mailer/i,
      /help.*postcard/i,
      /create.*postcard/i
    ],
    confidence: (message) => {
      const msgLower = message.toLowerCase();
      if (/postcard|direct mail|mailer/.test(msgLower)) return 0.9;
      return 0;
    }
  };

  constructor() {
    this.name = 'DirectMailAgent';
    this.llm = llmManager;
    this.conversationMemory = new Map(); // Store memory per conversation
    this.debugMode = false; // Enable for memory debugging
  }
  
  // Enable/disable debug mode
  setDebugMode(enabled) {
    this.debugMode = enabled;
    console.log(`🔧 DirectMailAgent debug mode: ${enabled ? 'ON' : 'OFF'}`);
  }
  
  // Detect when user rejects suggestions
  detectRejection(message, context = {}) {
    const lower = message.toLowerCase();
    const rejectionWords = /none|neither|don't like|not (working|good)|nope|nah|ew|yuck|hmm|meh|wrong|miss|bad/;
    const referenceWords = /these|those|options|ideas|headlines|suggestions|choices/;
    
    // Only detect rejection if we've actually shown options
    const hasShownOptions = context.hasShownHeadlines || 
                           context.memory?.strategyProgress?.messageStrategy?.started ||
                           context.lastBotMessage?.includes('Headline Options');
    
    // Don't treat client descriptions as rejections
    const isDescribingClient = /they|client|customer|people|traveler|look for|want|need|seek/.test(lower);
    
    return hasShownOptions && rejectionWords.test(lower) && (referenceWords.test(lower) || lower.length < 30) && !isDescribingClient;
  }
  
  // Detect creative themes in user input
  detectThemes(message) {
    const themes = [];
    const lower = message.toLowerCase();
    
    // Luxury themes
    if (/exclusive|luxury|premium|elegant|sophisticated|refined/.test(lower)) themes.push('exclusivity');
    if (/personal|intimate|private|boutique|custom/.test(lower)) themes.push('personalization');
    if (/authentic|genuine|real|unique|special/.test(lower)) themes.push('authenticity');
    if (/relax|rest|escape|peace|tranquil/.test(lower)) themes.push('tranquility');
    if (/adventure|explore|discover|experience/.test(lower)) themes.push('discovery');
    
    return themes;
  }

  async execute(input) {
    const { query, conversationHistory = [] } = input;
    
    try {
      // Get or initialize conversation memory
      const conversationId = this.getConversationId(conversationHistory);
      const memory = this.getMemory(conversationId);
      
      // Update memory with new information from user query
      this.updateMemory(conversationId, query, conversationHistory);
      
      // Debug memory state
      if (this.debugMode) {
        console.log('🧠 MEMORY STATE:', JSON.stringify(memory, null, 2));
      }
      
      // Analyze context with structured memory
      const context = await this.analyzeContextWithMemory(query, conversationHistory, memory);
      
      // Generate adaptive response that avoids repetition
      const response = await this.generateNonRepetitiveResponse(query, conversationHistory, context, memory);
      
      return {
        status: 'success',
        type: 'conversational_guidance',
        agent: this.name,
        content: {
          text: response,
          confidence: 'high'
        },
        metadata: {
          conversational: true,
          context,
          memory: memory // Include memory in metadata for debugging
        }
      };
    } catch (error) {
      console.error('DirectMailAgent error:', error);
      return this.getFallbackResponse(query, conversationHistory);
    }
  }

  async analyzeContext(query, conversationHistory) {
    const systemPrompt = `You are analyzing a conversation about creating a direct mail postcard campaign.

Analyze the conversation to understand:
1. Business situation: established (has customers) or new/aspirational (wants customers)
2. What we know: business type, target audience, goals, challenges, budget
3. What stage we're at: just starting, gathering info, or ready for strategy
4. What the user needs help with now
5. Any concerns or objections raised

Return a JSON object with your analysis.`;

    const conversationText = conversationHistory
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    try {
      const response = await this.llm.chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Current query: "${query}"\n\nConversation:\n${conversationText}` }
      ], {
        model: 'gpt-4o-mini',
        temperature: 0.3
      });

      // Handle different response formats
      let content = response.content;
      if (typeof content === 'string' && content.includes('Mock response')) {
        // Fallback to basic analysis if LLM is in mock mode
        return this.basicContextAnalysis(query, conversationHistory);
      }
      
      if (typeof content === 'object') return content;
      
      try {
        return JSON.parse(content);
      } catch {
        return this.basicContextAnalysis(query, conversationHistory);
      }
    } catch (error) {
      return this.basicContextAnalysis(query, conversationHistory);
    }
  }

  async generateAdaptiveResponse(query, conversationHistory, context) {
    const memory = context.memory;
    
    const systemPrompt = `You are an expert direct mail consultant for travel agencies.

IMPORTANT: Use the memory provided to avoid repeating questions and build on confirmed information.

Your style:
- Conversational and natural
- Ask ONE clear question at a time
- Build on information already confirmed (shown in memory)
- NEVER ask about topics marked as "confirmed" in memory
- Progress naturally to the next logical topic
- If user rejects suggestions, pivot to collaborative brainstorming
- Don't be pushy or repetitive - be a creative partner

Current memory state:
- Business Type: ${memory.businessType || 'unknown'} (confirmed: ${memory.confirmedTopics.businessType})
- Audience Challenge: ${memory.audienceChallenge || 'unknown'} (confirmed: ${memory.confirmedTopics.audienceChallenge})
- Ideal Client: ${memory.idealClient || 'unknown'} (confirmed: ${memory.confirmedTopics.idealClient})
- Budget: ${memory.budget || 'unknown'} (confirmed: ${memory.confirmedTopics.budget})
- Current Stage: ${memory.currentStage}

Next recommended action: ${context.nextAction}

IMPORTANT: Do NOT ask about any topic that is already confirmed (marked as true). Build upon the confirmed information naturally.

Remember: You're having a conversation that builds on what you already know. Reference confirmed information naturally.`;

    const recentConversation = conversationHistory.slice(-3)
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const memorySummary = this.getMemorySummary(memory);
    
    const userPrompt = `Current query: "${query}"

Recent conversation:
${recentConversation}

Known facts about this user:
${JSON.stringify(memorySummary, null, 2)}

Given the memory and confirmed topics above, what's your natural response that builds on what we already know?

Rules:
1. NEVER re-ask about confirmed topics: ${memorySummary.confirmedTopics.join(', ')}
2. Reference known information naturally in your response
3. Progress to the next logical step based on what's already known
4. If all basic info is confirmed, move to strategy/implementation
5. The next logical action is: ${memorySummary.nextLogicalStep}`;

    try {
      const response = await this.llm.chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], {
        model: 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: 400
      });

      // Handle mock responses
      if (typeof response.content === 'string' && response.content.includes('Mock response')) {
        if (this.debugMode) {
          console.warn('❌ Mock LLM response detected - using fallback logic');
        }
        return this.generateFallbackConversationWithMemory(query, conversationHistory, context, memory);
      }
      
      return response.content;
    } catch (error) {
      return this.generateFallbackConversationWithMemory(query, conversationHistory, context, memory);
    }
  }

  basicContextAnalysis(query, conversationHistory) {
    const context = {
      businessSituation: 'unknown',
      knownInfo: {},
      stage: conversationHistory.length === 0 ? 'starting' : 'gathering',
      userNeeds: 'guidance',
      conversationFlow: this.analyzeConversationFlow(conversationHistory)
    };

    // Quick analysis
    const queryLower = query.toLowerCase();
    if (queryLower.includes("don't have") || queryLower.includes("want to start")) {
      context.businessSituation = 'new';
    }
    
    // Scan conversation for business info
    conversationHistory.forEach(msg => {
      if (msg.role === 'user') {
        const content = msg.content.toLowerCase();
        if (/luxury|5 star|high.?end/.test(content)) context.knownInfo.type = 'luxury';
        if (/family|multi.?gen/.test(content)) context.knownInfo.audience = 'families';
        if (/cruise|resort|tour|adventure/.test(content)) context.knownInfo.travelType = content.match(/cruise|resort|tour|adventure/)[0];
        if (/\$\d+/.test(content)) context.knownInfo.hasBudget = true;
      }
    });
    
    // Analyze current user query specifically 
    if (queryLower.includes('attention') && queryLower.includes('identif')) {
      context.userNeeds = 'both_challenges';
    } else if (queryLower.includes('attention')) {
      context.userNeeds = 'getting_attention';
    } else if (queryLower.includes('identif')) {
      context.userNeeds = 'identifying_clients';
    }

    return context;
  }
  
  analyzeConversationFlow(conversationHistory) {
    const flow = {
      askedAboutBusiness: false,
      askedAboutChallenges: false,
      askedAboutAudience: false,
      userProvidedChallenges: false
    };
    
    conversationHistory.forEach(msg => {
      if (msg.role === 'assistant') {
        const content = msg.content.toLowerCase();
        if (content.includes('business') || content.includes('specialize')) flow.askedAboutBusiness = true;
        if (content.includes('challenge') || content.includes('facing')) flow.askedAboutChallenges = true;
        if (content.includes('ideal client') || content.includes('target')) flow.askedAboutAudience = true;
      }
      if (msg.role === 'user') {
        const content = msg.content.toLowerCase();
        if (content.includes('attention') || content.includes('identif')) flow.userProvidedChallenges = true;
      }
    });
    
    return flow;
  }

  generateFallbackConversation(query, conversationHistory, context) {
    const queryLower = query.toLowerCase();
    const flow = context.conversationFlow;
    
    if (conversationHistory.length === 0) {
      return `I'd love to help you create a successful postcard campaign for your travel business!

Tell me about your business - what type of travel experiences do you specialize in?`;
    }
    
    // Handle specific user responses intelligently
    if (context.userNeeds === 'both_challenges') {
      return `Perfect! Those are the two biggest challenges in direct mail. Let's tackle identification first.

Who is your ideal client? Think about your dream customer - what type of person books your travel services and loves the experience?

For example: families planning milestone trips, couples seeking luxury getaways, or adventure travelers looking for unique experiences?`;
    }
    
    if (context.userNeeds === 'getting_attention') {
      return `Getting attention is crucial! A great postcard needs to grab them in 3 seconds or it's tossed.

Tell me about your ideal client first - who exactly are you trying to get attention from? Understanding them helps us craft the right hook.`;
    }
    
    if (context.userNeeds === 'identifying_clients') {
      return `Smart - knowing WHO to target is half the battle!

Describe your ideal client. Are they families, couples, business travelers, retirees? What age range and income level?

The more specific you can be, the better we can target your postcards.`;
    }
    
    // Handle "don't have customers yet"
    if (queryLower.includes("don't have") || queryLower.includes("want to start")) {
      return `Perfect - you're looking to attract new clients! That's exciting.

Let's define your ideal target market. When you envision your perfect client for travel experiences, what's most important to them?`;
    }
    
    // Progressive conversation flow
    if (flow.askedAboutChallenges && flow.userProvidedChallenges && !flow.askedAboutAudience) {
      return `Now let's get specific about WHO you're trying to reach.

Describe your ideal travel client. What type of person books with you and has a great experience?`;
    }
    
    if (!flow.askedAboutBusiness) {
      return `Tell me about your travel business - what type of travel experiences do you specialize in?`;
    }
    
    if (flow.askedAboutBusiness && !flow.askedAboutChallenges) {
      return `What's your biggest challenge in reaching potential clients right now?`;
    }
    
    // If we've covered the basics, move to strategy
    if (flow.askedAboutBusiness && flow.askedAboutChallenges && flow.userProvidedChallenges) {
      return `Great! Let's dive deeper into your target audience. 

What type of traveler is most likely to book with you and become a repeat customer?`;
    }
    
    // Default safe progression
    return `Let me understand your situation better. 

What type of travel business are you running, and who would be your ideal client for a postcard campaign?`;
  }
  
  generateFallbackConversationWithMemory(query, conversationHistory, context, memory) {
    const queryLower = query.toLowerCase();
    
    // Handle first conversation
    if (conversationHistory.length === 0) {
      return `I'd love to help you create a successful postcard campaign for your travel business!

Tell me about your business - what type of travel experiences do you specialize in?`;
    }
    
    // Use memory to determine next logical step
    const nextAction = this.determineNextAction(memory);
    
    // Handle specific user responses intelligently with memory awareness
    if (context.userNeeds === 'both_challenges' && !memory.confirmedTopics.idealClient) {
      return `Perfect! Those are the two biggest challenges in direct mail. Let's tackle identification first.

Who is your ideal client? Think about your dream customer - what type of person books your travel services and loves the experience?`;
    }
    
    // Memory-aware responses based on what we already know
    if (memory.businessType && !memory.confirmedTopics.audienceChallenge) {
      return `Great - I understand you specialize in ${memory.businessType}. What's your biggest challenge in reaching potential clients right now?`;
    }
    
    if (memory.audienceChallenge && !memory.confirmedTopics.idealClient) {
      return `I see you're working on ${memory.audienceChallenge}. Let's get specific about your ideal client. 

What type of person books with you and has the best experience?`;
    }
    
    if (memory.idealClient && !memory.confirmedTopics.budget) {
      return `Excellent! I have a clear picture of your ideal client: ${memory.idealClient}. 

What budget range are you thinking for this postcard campaign?`;
    }
    
    // If we have enough info, move to strategy
    if (memory.currentStage === 'strategy_building') {
      return this.generateStrategy(memory);
    }
    
    // Use alternative response to avoid repetition
    return this.generateAlternativeResponse(memory, query);
  }
  
  // Helper method to check if a topic has been discussed
  hasAskedAbout(conversationHistory, keywords) {
    const keywordRegex = new RegExp(keywords, 'i');
    return conversationHistory.some(msg => 
      msg.role === 'assistant' && keywordRegex.test(msg.content)
    );
  }

  // === MEMORY MANAGEMENT METHODS ===
  
  getConversationId(conversationHistory) {
    // Simple conversation ID based on first user message
    if (conversationHistory.length === 0) return 'new_conversation';
    const firstMessage = conversationHistory.find(msg => msg.role === 'user');
    return firstMessage ? firstMessage.content.substring(0, 50).replace(/\W/g, '_') : 'conversation_' + Date.now();
  }
  
  getMemory(conversationId) {
    if (!this.conversationMemory.has(conversationId)) {
      this.conversationMemory.set(conversationId, {
        // Confirmed information
        businessType: null,
        travelSpecialty: null,
        audienceChallenge: null,
        idealClient: null,
        budget: null,
        timeline: null,
        selectedStrategy: null,
        
        // Topic completion flags
        confirmedTopics: {
          businessType: false,
          audienceChallenge: false,
          idealClient: false,
          budget: false,
          timeline: false
        },
        
        // Flow state
        currentStage: 'initial',
        completedStages: [],
        
        // Strategy execution tracking
        strategyProgress: {
          messageStrategy: { started: false, completed: false },
          visualDesign: { started: false, completed: false },
          listBuilding: { started: false, completed: false },
          campaignExecution: { started: false, completed: false }
        },
        
        // Implementation details gathered
        chosenHeadline: null,
        featuredTrip: null,
        designDirection: null,
        targetingApproach: null,
        timeline: null,
        
        // Prevent repetition
        lastBotQuestions: [],
        topicsDiscussed: new Set(),
        
        // Creative mode tracking
        rejectedSuggestions: false,
        creativeThemes: [],
        customHeadlineRequested: false
      });
    }
    return this.conversationMemory.get(conversationId);
  }
  
  updateMemory(conversationId, query, conversationHistory) {
    const memory = this.getMemory(conversationId);
    const queryLower = query.toLowerCase();
    
    // Enhanced extraction with confidence scoring
    const extractionConfidence = {
      businessType: 0,
      challenge: 0,
      idealClient: 0,
      budget: 0
    };
    
    // Check for strategy selection FIRST (most specific)
    if (memory.currentStage === 'strategy_building' && !memory.selectedStrategy) {
      if (/let.*start.*message|start.*message|message strategy/.test(queryLower)) {
        memory.selectedStrategy = 'message_strategy';
        memory.currentStage = 'executing_strategy';
        memory.strategyProgress.messageStrategy.started = true;
        console.log(`📝 Memory: User selected message strategy`);
        return memory; // Early return to avoid other pattern matches
      } else if (/visual|design/.test(queryLower)) {
        memory.selectedStrategy = 'visual_design';
        memory.currentStage = 'executing_strategy';
        memory.strategyProgress.visualDesign.started = true;
        console.log(`📝 Memory: User selected visual design`);
        return memory;
      } else if (/list|targeting/.test(queryLower)) {
        memory.selectedStrategy = 'list_building';
        memory.currentStage = 'executing_strategy';
        memory.strategyProgress.listBuilding.started = true;
        console.log(`📝 Memory: User selected list building`);
        return memory;
      } else if (/execution|timeline/.test(queryLower)) {
        memory.selectedStrategy = 'campaign_execution';
        memory.currentStage = 'executing_strategy';
        memory.strategyProgress.campaignExecution.started = true;
        console.log(`📝 Memory: User selected campaign execution`);
        return memory;
      }
    }
    
    // Track implementation details during strategy execution
    if (memory.currentStage === 'executing_strategy') {
      if (memory.selectedStrategy === 'message_strategy') {
        // Track headline choices and feedback - IMPROVED PARSING
        const headlineChoice = query.match(/#?\s*([123])|option\s*([123])|number\s*([123])/i);
        const saysChoice = /say.*#?\s*([123])|choose.*#?\s*([123])|prefer.*#?\s*([123])|like.*#?\s*([123])|#?\s*([123])\s*(is\s*)?(better|best|good)/i.test(queryLower);
        const negativeFeedback = /none|don't|dont|not|no|doesn't|doesnt|wrong|bad|miss|off/.test(queryLower);
        const wantsLuxury = /luxury|upscale|premium|exclusive|high.?end|sophisticated/.test(queryLower);
        
        // Handle negative feedback about headlines
        if (negativeFeedback && (wantsLuxury || /speak|work|fit|right/.test(queryLower))) {
          memory.headlineFeedback = query;
          memory.needsCustomHeadlines = true;
          memory.rejectedSuggestions = true;
          if (wantsLuxury) memory.wantsLuxuryFocus = true;
          console.log(`📝 Memory: User rejected headlines - entering creative mode`);
          
          // Extract themes from their feedback
          const themes = this.detectThemes(query);
          if (themes.length > 0) {
            memory.creativeThemes = themes;
            console.log(`🎨 Memory: Detected themes - ${themes.join(', ')}`);
          }
        } else if (headlineChoice || saysChoice) {
          // Extract the number from various formats
          let choiceNum = null;
          if (headlineChoice) {
            choiceNum = headlineChoice[1] || headlineChoice[2] || headlineChoice[3];
          } else {
            const match = queryLower.match(/#?\s*([123])/); 
            if (match) choiceNum = match[1];
          }
          
          memory.chosenHeadline = `option_${choiceNum}`;
          console.log(`📝 Memory: User chose headline option ${choiceNum}`);
        } else if (/headline|option|wake.*up|floating|hidden.*gems/.test(queryLower)) {
          memory.chosenHeadline = query;
          console.log(`📝 Memory: User chose custom headline`);
        } else if (memory.strategyProgress.messageStrategy.started && !memory.chosenHeadline) {
          // Only treat as trip description if it's not a choice
          memory.featuredTrip = query;
          memory.chosenHeadline = "headline_pending";
          console.log(`📝 Memory: User described trip instead of choosing headline`);
        }
        
        // Track featured trip details
        if (/trip|offer|experience|city|wake|new|every|day/.test(queryLower) && !memory.featuredTrip) {
          memory.featuredTrip = query;
          console.log(`📝 Memory: User described featured trip`);
        }
      }
      
      if (memory.selectedStrategy === 'visual_design') {
        if (/pool|tour|suite|direction|feel|visual|photo|image/.test(queryLower)) {
          memory.designDirection = query;
          console.log(`📝 Memory: User chose design direction`);
        }
      }
      
      if (memory.selectedStrategy === 'list_building') {
        if (/geographic|behavior|local|zip|area|approach/.test(queryLower)) {
          memory.targetingApproach = query;
          console.log(`📝 Memory: User chose targeting approach`);
        }
      }
      
      if (memory.selectedStrategy === 'campaign_execution') {
        if (/week|month|timeline|launch|ready|time/.test(queryLower)) {
          memory.timeline = query;
          console.log(`📝 Memory: User provided timeline preference`);
        }
      }
    }
    
    // Extract and store key information with enhanced confidence
    if (!memory.confirmedTopics.businessType) {
      // Check if we asked about business type
      const lastAssistantMessage = this.getLastBotMessage(conversationHistory);
      const askedAboutBusiness = lastAssistantMessage && 
        /what.*specialty|specialize|travel business|cruises.*luxury.*adventure/i.test(lastAssistantMessage);
      
      // Check context - only extract if talking about their business, not clients
      const talkingAboutBusiness = !(/age|income|appreciate|travelers?|clients?|customer/.test(queryLower));
      const hasBusinessKeywords = /cruise|resort|tour|adventure|luxury|family/.test(queryLower);
      
      // If we directly asked and they answered with a business type, accept it
      if (askedAboutBusiness && hasBusinessKeywords) {
        const extracted = this.extractTravelType(query);
        memory.businessType = extracted || query.trim(); // Use their answer directly if extraction fails
        memory.confirmedTopics.businessType = true;
        memory.topicsDiscussed.add('businessType');
        console.log(`📝 Memory: Confirmed business type - ${memory.businessType}`);
      } else if (hasBusinessKeywords && talkingAboutBusiness) {
        const extracted = this.extractTravelType(query);
        if (extracted) { // Accept any valid extraction
          memory.businessType = extracted;
          memory.confirmedTopics.businessType = true;
          memory.topicsDiscussed.add('businessType');
          extractionConfidence.businessType = 0.9;
          console.log(`📝 Memory: Confirmed business type - ${memory.businessType} (confidence: 90%)`);
        }
      }
    }
    
    if (!memory.confirmedTopics.audienceChallenge) {
      // Check if this is a response to a challenge question
      const lastAssistantMessage = this.getLastBotMessage(conversationHistory);
      const askedAboutChallenge = lastAssistantMessage && 
        /biggest challenge|challenge.*reaching|what.*challenge/i.test(lastAssistantMessage);
      
      // Accept ANY response to challenge question, even vague ones like "getting more"
      if (askedAboutChallenge && query.length > 2) {
        memory.audienceChallenge = query;
        memory.confirmedTopics.audienceChallenge = true;
        memory.topicsDiscussed.add('audienceChallenge');
        memory.needsChallengeClarity = /more|better|harder|difficult|tough/.test(queryLower); // Flag vague responses
        console.log(`📝 Memory: Confirmed audience challenge - ${memory.audienceChallenge}`);
      }
    }
    
    if (!memory.confirmedTopics.idealClient) {
      // Check if this is a response to an ideal client question
      const lastAssistantMessage = this.getLastBotMessage(conversationHistory);
      const askedAboutIdealClient = lastAssistantMessage && 
        /ideal client|type of person|who.*book|dream customer|target|describe.*client/i.test(lastAssistantMessage);
      
      // Much more flexible pattern matching for ANY client description
      const describesClient = /people|client|customer|traveler|they|who|person|someone|folks|individual|guest|passenger|couples|families|groups/i.test(queryLower);
      
      // If we asked about ideal client and they're describing people, capture it
      if (askedAboutIdealClient && (describesClient || query.length > 15)) {
        memory.idealClient = query;
        memory.confirmedTopics.idealClient = true;
        memory.topicsDiscussed.add('idealClient');
        console.log(`📝 Memory: Confirmed ideal client - ${memory.idealClient}`);
      }
    } else if (memory.confirmedTopics.idealClient) {
      // Check if they're still describing the ideal client (common in multi-turn descriptions)
      const lastAssistantMessage = this.getLastBotMessage(conversationHistory);
      const stillAskingAboutClient = lastAssistantMessage && /ideal client|type of person|who.*book/i.test(lastAssistantMessage);
      
      // User is providing more client details
      const providingMoreDetails = /they|also|and|like|prefer|enjoy|want|need|appreciate|value|look for|seek/i.test(queryLower);
      const describesPreferences = /experience|memory|memories|luxury|comfort|time|busy|convenience|new|different|unique|adventure/i.test(queryLower);
      
      if ((stillAskingAboutClient || providingMoreDetails) && describesPreferences) {
        // Append to existing ideal client description
        memory.idealClient = memory.idealClient + ". " + query;
        console.log(`📝 Memory: Enhanced ideal client description - ${query}`);
        
        // Mark that we should acknowledge this addition
        memory.acknowledgeAdditionalInfo = true;
      }
    }
    
    if (!memory.confirmedTopics.budget) {
      // Check if we asked about budget
      const lastAssistantMessage = this.getLastBotMessage(conversationHistory);
      const askedAboutBudget = lastAssistantMessage && /budget|thinking.*campaign|range.*thinking/i.test(lastAssistantMessage);
      
      if (/\$\d+|budget|spend|afford/.test(queryLower) && !/years?\s*old|age/.test(queryLower)) {
        memory.budget = this.extractBudget(query);
        if (memory.budget) { // Only confirm if we actually extracted a budget
          memory.confirmedTopics.budget = true;
          memory.topicsDiscussed.add('budget');
          console.log(`📝 Memory: Confirmed budget - ${memory.budget}`);
        }
      } else if (askedAboutBudget && query.length > 2) {
        // Accept any response to budget question
        memory.budget = /\d/.test(query) ? query : 'flexible';
        memory.confirmedTopics.budget = true;
        memory.topicsDiscussed.add('budget');
        console.log(`📝 Memory: Confirmed budget - ${memory.budget}`);
      }
    }
    
    // Update current stage based on confirmed topics
    const confirmedCount = Object.values(memory.confirmedTopics).filter(Boolean).length;
    if (confirmedCount === 0) {
      memory.currentStage = 'discovery';
    } else if (confirmedCount < 3) {
      memory.currentStage = 'gathering_info';
    } else if (confirmedCount >= 3 && !memory.selectedStrategy) {
      memory.currentStage = 'strategy_building';
    }
    
    return memory;
  }
  
  extractTravelType(query) {
    const queryLower = query.toLowerCase();
    
    // Debug extraction
    if (this.debugMode) {
      console.log('🔍 Extracting travel type from:', query);
    }
    
    // River Cruises (sophisticated, cultural, intimate)
    if (/river\s*cruise|rhine|danube|seine|douro|mekong/.test(queryLower)) {
      return 'river cruises';
    }
    
    // Ocean Cruises (large ships, entertainment, multiple destinations)
    if (/ocean\s*cruise|caribbean\s*cruise|mediterranean\s*cruise|alaska\s*cruise/.test(queryLower)) {
      return 'ocean cruises';
    }
    
    // Luxury Cruises (ultra-premium, yacht-like, exclusive)
    if (/luxury\s*cruise|yacht|expedition\s*cruise|small\s*ship/.test(queryLower)) {
      return 'luxury cruises';
    }
    
    // Generic cruise detection
    if (queryLower.includes('cruise')) return 'cruises';
    
    // Luxury Travel (5-star, exclusive, high-end)
    if (/luxury|five\s*star|5\s*star|high[\s-]?end|exclusive|premium/.test(queryLower)) {
      return 'luxury travel';
    }
    
    // Adventure Travel (active, outdoor, challenging)
    if (/adventure|hiking|trekking|climbing|rafting|safari|expedition/.test(queryLower)) {
      return 'adventure travel';
    }
    
    // All-Inclusive Resorts
    if (/all[\s-]?inclusive|resort|sandals|club\s*med/.test(queryLower)) {
      return 'all-inclusive resorts';
    }
    
    // Guided Tours (escorted, group travel)
    if (/guided\s*tour|escorted|group\s*travel|bus\s*tour/.test(queryLower)) {
      return 'guided tours';
    }
    
    // Family Travel (multi-generational, kid-friendly)
    if (/family|multi[\s-]?gen|kids|disney|theme\s*park/.test(queryLower)) {
      return 'family travel';
    }
    
    // Wellness/Spa Travel
    if (/wellness|spa|retreat|yoga|mindfulness/.test(queryLower)) {
      return 'wellness travel';
    }
    
    // Cultural/Educational Travel
    if (/cultural|educational|heritage|historic|museum/.test(queryLower)) {
      return 'cultural travel';
    }
    
    // Romance/Honeymoon
    if (/romance|honeymoon|couples|anniversary|destination\s*wedding/.test(queryLower)) {
      return 'romance travel';
    }
    
    // Eco/Sustainable Travel
    if (/eco|sustainable|responsible|conservation|volunteer/.test(queryLower)) {
      return 'eco travel';
    }
    
    return query.trim();
  }
  
  extractBudget(query) {
    // More specific budget extraction - look for actual budget indicators
    const budgetMatch = query.match(/\$([\d,]+)|([\d,]+)\s*(?:dollars?|budget|spend)/i);
    if (budgetMatch) {
      const amount = budgetMatch[1] || budgetMatch[2];
      return `$${amount}`;
    }
    return null;
  }
  
  async analyzeContextWithMemory(query, conversationHistory, memory) {
    // Enhanced context analysis using structured memory
    return {
      ...await this.analyzeContext(query, conversationHistory),
      memory,
      stage: memory.currentStage,
      nextAction: this.determineNextAction(memory),
      shouldSkipTopics: this.getSkippableTopics(memory)
    };
  }
  
  determineNextAction(memory) {
    if (!memory.confirmedTopics.businessType) return 'ask_business_type';
    if (!memory.confirmedTopics.audienceChallenge) return 'ask_audience_challenge';
    if (!memory.confirmedTopics.idealClient) return 'ask_ideal_client';
    if (!memory.confirmedTopics.budget) return 'ask_budget';
    if (memory.currentStage === 'strategy_building' && !memory.selectedStrategy) return 'provide_strategy';
    if (memory.currentStage === 'executing_strategy') return `execute_${memory.selectedStrategy}`;
    return 'provide_strategy';
  }
  
  getSkippableTopics(memory) {
    return Object.entries(memory.confirmedTopics)
      .filter(([topic, confirmed]) => confirmed)
      .map(([topic]) => topic);
  }
  
  // Get clean memory summary for LLM context
  getMemorySummary(memory) {
    const summary = {
      knownFacts: {},
      confirmedTopics: [],
      nextLogicalStep: this.determineNextAction(memory),
      conversationStage: memory.currentStage
    };
    
    // Only include confirmed, non-null values
    if (memory.businessType && memory.confirmedTopics.businessType) {
      summary.knownFacts.businessType = memory.businessType;
      summary.confirmedTopics.push('business type');
    }
    
    if (memory.audienceChallenge && memory.confirmedTopics.audienceChallenge) {
      summary.knownFacts.challenge = memory.audienceChallenge;
      summary.confirmedTopics.push('main challenge');
    }
    
    if (memory.idealClient && memory.confirmedTopics.idealClient) {
      summary.knownFacts.idealClient = memory.idealClient;
      summary.confirmedTopics.push('ideal client profile');
    }
    
    if (memory.budget && memory.confirmedTopics.budget) {
      summary.knownFacts.budget = memory.budget;
      summary.confirmedTopics.push('budget range');
    }
    
    return summary;
  }
  
  async generateNonRepetitiveResponse(query, conversationHistory, context, memory) {
    // Get last bot message for context
    const lastBotMessage = this.getLastBotMessage(conversationHistory);
    const rejectionContext = {
      hasShownHeadlines: lastBotMessage && /headline|option.*1|option.*2|option.*3/i.test(lastBotMessage),
      memory,
      lastBotMessage
    };
    
    // Check for rejection only if we've shown options
    if (this.detectRejection(query, rejectionContext)) {
      memory.rejectedSuggestions = true;
      memory.customHeadlineRequested = true;
      
      // Extract any themes they mentioned
      const themes = this.detectThemes(query);
      if (themes.length > 0) {
        memory.creativeThemes = themes;
      }
      
      return `Totally fair — those ideas didn't land.

Let's create something more custom. How would YOU describe the feeling your clients get from your ${memory.businessType || 'travel'} experiences?

Give me a few words or themes (like "exclusive access," "transformative," "intimate," etc.), and I'll shape headlines around those.`;
    }
    
    // Handle custom headline request
    if (memory.customHeadlineRequested && query.length > 10 && !this.detectRejection(query)) {
      // They've given us themes or description
      const themes = this.detectThemes(query);
      const customHeadlines = await this.generateCustomHeadlines(
        themes.length > 0 ? themes : ['luxury', 'exclusivity', 'experience'],
        memory.businessType || 'luxury cruise',
        memory.idealClient || 'discerning travelers'
      );
      
      memory.customHeadlineRequested = false;
      
      return `Perfect! Based on your vision, here are custom headlines:

${customHeadlines}

These capture that ${themes.join(', ')} feeling. Which resonates most?

Or should we refine further with different themes?`;
    }
    
    // Handle ongoing strategy execution
    if (memory.currentStage === 'executing_strategy' && memory.selectedStrategy) {
      const response = await this.generateStrategyFollowUp(memory, query);
      if (response) {
        memory.lastBotQuestions.push(response.substring(0, 100));
        if (memory.lastBotQuestions.length > 3) {
          memory.lastBotQuestions.shift();
        }
        return response;
      }
    }
    
    // First check if we should skip to avoid repetition
    const potentialResponse = await this.generateAdaptiveResponse(query, conversationHistory, context);
    
    // Duplicate detection
    if (this.isDuplicateResponse(potentialResponse, memory.lastBotQuestions)) {
      console.log('⚠️ Duplicate detected, generating alternative response');
      return this.generateAlternativeResponse(memory, query);
    }
    
    // Store this response to prevent future duplicates
    memory.lastBotQuestions.push(potentialResponse.substring(0, 100));
    if (memory.lastBotQuestions.length > 3) {
      memory.lastBotQuestions.shift(); // Keep only last 3
    }
    
    return potentialResponse;
  }
  
  getLastBotMessage(conversationHistory) {
    for (let i = conversationHistory.length - 1; i >= 0; i--) {
      if (conversationHistory[i].role === 'assistant') {
        return conversationHistory[i].content;
      }
    }
    return null;
  }
  
  isDuplicateResponse(response, lastQuestions) {
    const responseWords = response.toLowerCase().split(' ');
    const responseLower = response.toLowerCase();
    
    return lastQuestions.some(lastQ => {
      const lastWords = lastQ.toLowerCase().split(' ');
      const lastLower = lastQ.toLowerCase();
      const commonWords = responseWords.filter(word => lastWords.includes(word) && word.length > 3); // Only count meaningful words
      
      // Check for key phrase repetition - EXPANDED LIST
      const duplicatePhrases = [
        ['ideal client', 'ideal client'],
        ['dream customer', 'dream customer'],
        ['age range', 'age range'],
        ['type of person', 'type of person'],
        ['who.*book', 'who.*book'],
        ['biggest challenge', 'biggest challenge'],
        ['reaching.*clients', 'reaching.*clients'],
        ['perfect.*now', 'perfect.*now']
      ];
      
      // Check each duplicate phrase pattern
      for (const [phrase1, phrase2] of duplicatePhrases) {
        if (new RegExp(phrase1).test(responseLower) && new RegExp(phrase2).test(lastLower)) {
          console.log(`⚠️ Duplicate phrase detected: "${phrase1}"`);
          return true;
        }
      }
      
      // Check if we're asking a question that was just answered
      if (responseLower.includes('?') && lastLower.includes('?')) {
        const responseQuestion = responseLower.match(/what|who|how|when|where|which/);
        const lastQuestion = lastLower.match(/what|who|how|when|where|which/);
        if (responseQuestion && lastQuestion && responseQuestion[0] === lastQuestion[0]) {
          console.log(`⚠️ Duplicate question type detected: "${responseQuestion[0]}"`);
          return true;
        }
      }
      
      return commonWords.length > Math.min(responseWords.length, lastWords.length) * 0.3; // 30% similarity (even more sensitive)
    });
  }
  
  generateAlternativeResponse(memory, query) {
    const nextAction = this.determineNextAction(memory);
    
    switch (nextAction) {
      case 'ask_business_type':
        return `I'd love to understand your travel business better. What's your specialty - cruises, luxury trips, adventure travel, or something else?`;
        
      case 'ask_audience_challenge':
        // Don't repeat if we have a vague challenge - clarify instead
        if (memory.needsChallengeClarity && memory.audienceChallenge) {
          return `I understand you want ${memory.audienceChallenge} clients. Let me help you be more specific - is your main challenge:
- Finding the right people to target?
- Getting their attention once you find them?
- Converting interest into bookings?
- Something else entirely?`;
        }
        return `What's your biggest marketing challenge right now? Finding the right clients, getting their attention, or converting interest into bookings?`;
        
      case 'ask_ideal_client':
        if (memory.businessType) {
          return `Perfect! Now for your ${memory.businessType} business, who is your ideal client? What type of person books with you and loves the experience?`;
        }
        return `Perfect! Let's get specific about your ideal client. Describe your dream customer - age range, income level, and what motivates them to travel.`;
        
      case 'ask_budget':
        if (memory.acknowledgeAdditionalInfo && memory.idealClient) {
          // Acknowledge the additional details they just provided
          memory.acknowledgeAdditionalInfo = false; // Reset flag
          return `Perfect! I love that they appreciate cultural experiences and creating memories - that's exactly what cruise postcards should highlight.

Now that I have a complete picture of your ideal client, what budget range are you thinking for this postcard campaign?`;
        }
        if (memory.idealClient) {
          return `Excellent! I understand your target client: ${memory.idealClient.substring(0, 60)}... What budget range are you thinking for this postcard campaign?`;
        }
        return `Excellent! What budget range are you thinking for this postcard campaign? This helps me recommend the right approach.`;
        
      case 'provide_strategy':
        return this.generateStrategy(memory);
        
      case 'execute_message_strategy':
        // Ensure business type is available for proper strategy generation
        if (!memory.businessType && memory.confirmedTopics.businessType) {
          // Try to recover business type from topics discussed
          if (memory.topicsDiscussed.has('businessType')) {
            memory.businessType = 'cruises'; // Default recovery - should be improved
          }
        }
        return this.generateMessageStrategy(memory);
        
      case 'execute_visual_design':
        return this.generateVisualDesignGuidance(memory);
        
      case 'execute_list_building':
        return this.generateListBuildingGuidance(memory);
        
      case 'execute_campaign_execution':
        return this.generateCampaignExecutionGuidance(memory);
        
      default:
        return `Based on what you've told me, let's move forward. What aspect of your postcard campaign would you like to focus on next?`;
    }
  }
  
  generateStrategy(memory) {
    return `Perfect! Based on what you've shared:

**Your Campaign Foundation:**
• Business: ${memory.businessType || 'travel services'}
• Challenge: ${memory.audienceChallenge || 'reaching ideal clients'}
• Target: ${memory.idealClient || 'your ideal travelers'}
${memory.budget ? `• Budget: ${memory.budget}` : ''}

**Next Steps:**
1. **Message Strategy** - Craft compelling headlines that speak to your target
2. **Visual Design** - Choose imagery and colors that resonate
3. **List Building** - Find and reach your ideal clients
4. **Campaign Execution** - Timeline and implementation

Which area would you like to dive into first?`;
  }
  
  generateMessageStrategy(memory) {
    const businessType = memory.businessType || 'travel';
    const idealClient = memory.idealClient || 'your target clients';
    const budget = memory.budget || '$500-1000';
    
    // Detect luxury indicators in client description
    const clientLower = (idealClient + ' ' + businessType).toLowerCase();
    const isLuxury = /wealthy|luxury|high.?end|affluent|exclusive|premium|upscale|sophisticated/.test(clientLower);
    const isOlder = /older|mature|senior|retired|50|60|70|empty.?nest/.test(clientLower);
    
    // Override business type if luxury indicators present
    if (isLuxury && businessType.includes('cruise')) {
      return this.generateLuxuryCruiseStrategy(memory, isOlder);
    }
    
    // River Cruises - sophisticated, cultural
    if (businessType.includes('river cruise')) {
      return `**Message Strategy for River Cruises**

For your ${idealClient}, here's your winning message approach:

**Primary Headline Options:**
1. "Skip the Bus Tours. Your Suite Floats to Each City."
2. "Unpack Once. Wake Up in Prague, Vienna, Budapest."
3. "Small Ship. Big Access. No Tour Bus Crowds."

**Key Message Elements:**
• **Pain Point**: Crowded tourist traps, exhausting travel, superficial experiences
• **Solution**: Intimate ships (150 guests max), dock in city centers, local guides
• **Proof**: All-inclusive luxury, Michelin-inspired dining, panoramic suites
• **Urgency**: "Only 12 suites left for 2024 Rhine sailings"

**Postcard Copy Structure:**
- Front: Elegant headline + stunning river vista with castle/vineyard
- Back: "Imagine waking to castle views, strolling to a café for breakfast, returning to your suite as cities glide by..."

**Your ${budget} budget targets:**
- 300 postcards to affluent neighborhoods
- Premium paper with spot UV on water imagery

Which river route best showcases your unique experience?`;
    }
    
    // Ocean Cruises - fun, diverse, value
    if (businessType.includes('ocean cruise')) {
      return `**Message Strategy for Ocean Cruises**

For your ${idealClient}, here's your winning message approach:

**Primary Headline Options:**
1. "7 Countries. 1 Suitcase. 0 Airport Security Lines."
2. "Tired of Unpacking? Let Your Hotel Do the Traveling."
3. "Kids Want Fun. You Want Rest. This Ship Has Both."

**Key Message Elements:**
• **Pain Point**: Constant packing/unpacking, airport hassles, planning fatigue
• **Solution**: Floating resort with entertainment, dining, destinations delivered to you
• **Proof**: Award-winning ships, broadway shows, specialty restaurants
• **Urgency**: "Early bird pricing ends March 31st"

**Postcard Copy Structure:**
- Front: Dynamic headline + ship with tropical destination
- Back: "Wake up in a new paradise daily. No airports. No packing..."

Which destination or ship feature excites your clients most?`;
    }
    
    // Luxury Travel - exclusive, bespoke
    if (businessType.includes('luxury')) {
      // Enhanced copy for mature luxury travelers who value experiences
      const clientProfile = idealClient.toLowerCase();
      const isExperienceFocused = /experience|memor|cultur|authentic|unique/.test(clientProfile);
      const isMature = /older|mature|senior|retired|50|60|70/.test(clientProfile);
      
      return `**Message Strategy for Luxury Travel**

For your ${idealClient}, here's your refined message approach:

**Primary Headline Options:**
1. "Travel That Transcends the Ordinary"
2. "Where 'Exclusive' Actually Means Something" 
3. "Curated Luxury. Authentic Experiences. Your Way."

**Key Message Elements for Experience-Seeking Mature Travelers:**
• **Pain Point**: ${isMature ? 'Been there, done that - seeking deeper meaning in travel' : 'Cookie-cutter luxury, crowded "exclusive" venues'}
• **Solution**: ${isExperienceFocused ? 'Transformative moments money can\'t buy - private museum tours, dinner with local nobility, backstage cultural access' : 'Truly bespoke experiences, private access, dedicated concierge'}
• **Proof**: "Our clients don't just visit places - they become part of them"
• **Urgency**: Limited access experiences (only X spots per season)

**Postcard Copy Framework:**
- Front: Striking image of exclusive moment + chosen headline
- Back: "${isMature ? 'You\'ve traveled the world. But have you truly experienced it?' : 'While others queue, you\'ll have the temple to yourself at dawn...'}"

**Your ${budget} budget allows:**
- 400 oversized luxury postcards
- Premium textured cardstock with spot gloss
- Targeted mailing to qualified households

What's that one exclusive experience that perfectly captures your brand promise?`;
    }
    
    // Adventure Travel - active, transformative
    if (businessType.includes('adventure')) {
      return `**Message Strategy for Adventure Travel**

For your ${idealClient}, here's your winning message approach:

**Primary Headline Options:**
1. "Your Coworkers Post Gym Selfies. You'll Post Summit Selfies."
2. "Trading Spreadsheets for Mountain Peaks Since 2010"
3. "Because 'Someday' Isn't on the Calendar"

**Key Message Elements:**
• **Pain Point**: Desk-bound life, virtual everything, lost connection to nature
• **Solution**: Guided adventures matched to fitness levels, expert instruction
• **Proof**: 15 years zero accidents, certified guides, small groups
• **Urgency**: "Summer 2024 trips filling fast - only 4 spots left"

**Postcard Copy Structure:**
- Front: Action shot + bold headline
- Back: "Trade spreadsheets for summit views..."

What's your signature adventure that converts prospects?`;
    }
    
    // All-Inclusive Resorts - easy, value, relaxation
    if (businessType.includes('all-inclusive')) {
      return `**Message Strategy for All-Inclusive Resorts**

For your ${idealClient}, here's your winning message approach:

**Primary Headline Options:**
1. "Stop Calculating Vacation Costs. It's ALL Included."
2. "$500 Resort Credits? Hidden Fees? Not Here. Everything's Actually Included."
3. "Margaritas. Jet Skis. Kids Club. All Covered. (Yes, Premium Drinks Too)"

**Key Message Elements:**
• **Pain Point**: Hidden fees, vacation budgeting stress, decision fatigue
• **Solution**: True all-inclusive - premium drinks, restaurants, activities, tips
• **Proof**: 4.8 star reviews, awards, returning guest rate
• **Urgency**: "Book by Feb 28 - Kids stay free"

What aspect of 'all-inclusive' matters most to your clients?`;
    }
    
    // Family Travel - multi-gen harmony
    if (businessType.includes('family')) {
      return `**Message Strategy for Family Travel**

For your ${idealClient}, here's your winning message approach:

**Primary Headline Options:**
1. "Finally - Grandparents Rest While Kids Play (in the Same Place!)"
2. "Warning: Your Teenagers Might Actually Talk to You Here"
3. "3 Generations. 3 Different Vacations. 1 Perfect Location."

**Key Message Elements:**
• **Pain Point**: Age gaps, different interests, exhausting planning
• **Solution**: Properties with teen clubs AND adult space, flexible dining
• **Proof**: Family specialists, connecting rooms, age-appropriate activities
• **Urgency**: "Spring break filling - secure your family suite"

What's the biggest challenge your families face when traveling together?`;
    }
    
    // Wellness Travel - transformation, renewal
    if (businessType.includes('wellness')) {
      return `**Message Strategy for Wellness Travel**

For your ${idealClient}, here's your winning message approach:

**Primary Headline Options:**
1. "You Check Work Emails on Vacation. Time to Fix That."
2. "Burnout Doesn't Take PTO. Neither Should You."
3. "7 Days Without WiFi Won't Kill You (But Might Save You)"

**Key Message Elements:**
• **Pain Point**: Burnout, digital overload, vacations that need vacations
• **Solution**: Structured wellness programs, digital detox, expert guidance
• **Proof**: Certified instructors, medical staff, proven results
• **Urgency**: "Small group retreat - only 8 spots per session"

What transformation do your guests seek most?`;
    }
    
    // Default - customize based on what they tell us
    return `**Message Strategy for ${businessType}**

For your ${idealClient}, let's create a winning message approach.

First, help me understand your unique travel offering:
- What specific type of travel do you specialize in?
- What makes your approach different from competitors?
- What problem do you solve for travelers?
- What's your most popular or unique trip?

Once I understand your specialty, I'll create targeted headlines and messaging that resonates with your specific market.

**Your ${budget} budget allows for:**
- 300-500 postcards depending on targeting and quality
- Professional design and printing

Tell me more about your travel business so I can craft the perfect message strategy.`;
  }
  
  generateVisualDesignGuidance(memory) {
    const businessType = memory.businessType || 'travel';
    const budget = memory.budget || '$750';
    
    // River Cruises
    if (businessType.includes('river cruise')) {
      return `**Visual Design for River Cruises**

**Hero Image Options:**
1. **Panoramic suite balcony overlooking Rhine castles** - luxury + destination
2. **Couple at captain's table with city lights behind** - intimate + sophisticated  
3. **Morning coffee on deck, medieval town awakening** - peaceful + authentic

**Color Psychology:**
- **Deep Blue + Gold**: Water elegance, premium feel
- **Burgundy + Cream**: Wine country sophistication
- **Charcoal + Silver**: Modern luxury cruising

**Design Elements:**
- Elegant script for "River Cruise" 
- Watercolor effect on edges
- Subtle wave pattern in background
- Map element showing route

**Typography:**
- Headlines: Refined serif (Didot/Bodoni style)
- Body: Clean, readable sans-serif

Which visual story best captures your river cruise magic?`;
    }
    
    // Ocean Cruises
    if (businessType.includes('ocean cruise')) {
      return `**Visual Design for Ocean Cruises**

**Hero Image Options:**
1. **Ship at sunset with tropical island** - adventure + relaxation
2. **Pool deck party aerial view** - fun + social
3. **Balcony suite with ocean wake** - value + views

**Color Psychology:**
- **Aqua + Coral**: Caribbean vibes
- **Navy + White**: Classic nautical
- **Sunset Orange + Blue**: Warmth + ocean

**Design Elements:**
- Ship silhouette as design element
- Compass rose or nautical elements
- Multiple destination stamps effect
- "All-Inclusive" badge prominent

Which captures your cruise experience best?`;
    }
    
    // Adventure Travel
    if (businessType.includes('adventure')) {
      return `**Visual Design for Adventure Travel**

**Hero Image Options:**
1. **Summit celebration at sunrise** - achievement + beauty
2. **River rafting action shot** - excitement + teamwork
3. **Campfire under stars** - connection + wonder

**Color Psychology:**
- **Orange + Teal**: Energy + nature
- **Forest Green + Tan**: Earthy authenticity
- **Red + Charcoal**: Bold action

**Design Elements:**
- Topographic map patterns
- Hand-drawn trail elements
- Vintage national park poster style
- Action-oriented typography

Which adventure visual tells your story?`;
    }
    
    // Luxury Travel
    if (businessType.includes('luxury')) {
      return `**Visual Design for Luxury Travel**

**Hero Image Options:**
1. **Private villa infinity pool at sunset** - exclusivity
2. **Helicopter landing at remote lodge** - access
3. **Butler service on private beach** - personalization

**Color Psychology:**
- **Black + Gold**: Ultimate luxury
- **Champagne + Navy**: Sophisticated elegance  
- **White + Silver**: Pure refinement

**Design Elements:**
- Minimalist design, maximum impact
- Foil stamping or spot UV
- Thick, textured cardstock
- Subtle monogram pattern

What defines luxury for your clients?`;
    }
    
    // Default adaptive
    return `**Visual Design for ${businessType}**

Let's create visuals that resonate with your ${memory.idealClient || 'target market'}.

**Key Questions:**
1. What emotion should people feel seeing your postcard?
2. What's the ONE image that captures your unique value?
3. What colors represent your brand?

**Your ${budget} budget options:**
- Stock photography: $50-150
- Custom design: $200-400
- Premium printing: $200-400

Share your vision and let's create something memorable!`;
  }
  
  generateListBuildingGuidance(memory) {
    return `**List Building Strategy for Multi-Gen Luxury Travel**

To reach your ${memory.idealClient}, here's your targeting approach:

**Primary Demographics:**
- Age: 50-65 (the decision makers & planners)
- Income: $150k+ household 
- Home Value: $500k+ (indicates disposable income)
- Life Stage: Empty nesters with adult children

**Geographic Targeting:**
- Affluent zip codes within 50 miles of your location
- Suburbs with high concentration of large homes
- Areas with country clubs/private schools

**Psychographic Indicators:**
- Subscribe to luxury travel magazines
- Previous cruise/resort bookings
- Members of country clubs
- Drive luxury SUVs (space for family)

**Your $750 Budget List Options:**
1. **Targeted Mailing List**: 500 qualified households ($250 + $500 printing/postage)
2. **Radius + Income Filter**: 800 households in target zip codes
3. **Previous Traveler List**: 400 luxury travel purchasers

**Best ROI Approach:**
Start with 300 highest-income households in your immediate area - easier to convert locals first.

Which targeting approach fits your business model best - geographic proximity or luxury travel behavior?`;
  }
  
  generateCampaignExecutionGuidance(memory) {
    return `**Campaign Execution Timeline**

For your ${memory.idealClient} and $${memory.budget} budget:

**Phase 1: Pre-Launch (Weeks 1-2)**
- Finalize list (300 targeted households)
- Complete design and copy approval
- Print postcards (allow 5-7 business days)

**Phase 2: Launch (Week 3)**
- Mail postcards on Tuesday (best day for travel offers)
- Set up tracking phone number
- Prepare follow-up materials

**Phase 3: Response Management (Weeks 4-6)**
- Expect 1-3% response rate (3-9 inquiries)
- Follow up within 24 hours of inquiry
- Book consultation appointments

**Phase 4: Follow-Up (Weeks 7-8)**
- Second touchpoint to non-responders
- Seasonal offer based on results

**Success Metrics to Track:**
- Response rate (calls/emails)
- Appointment bookings
- Conversion to actual bookings
- Revenue per conversion

**Your Action Steps:**
1. Choose your list source
2. Approve final design
3. Set up dedicated tracking line
4. Create consultation booking calendar

What's your preferred timeline - launch in 2 weeks or do you need more time for design refinement?`;
  }
  
  async generateStrategyFollowUp(memory, query) {
    const strategy = memory.selectedStrategy;
    
    if (strategy === 'message_strategy') {
      // Handle case where they described trip instead of choosing headline
      if (memory.chosenHeadline === "headline_pending" && memory.featuredTrip) {
        const headlines = this.getHeadlinesForBusinessType(memory.businessType);
        return `I love that experience - "${memory.featuredTrip}" - that's exactly what we need to highlight!

Now let's choose a headline to grab attention. Which of these resonates best?

${headlines}

Or would you prefer something custom that captures your unique approach?`;
      }
      
      if (memory.chosenHeadline && memory.chosenHeadline !== "headline_pending" && !memory.featuredTrip) {
        const businessType = memory.businessType || 'travel';
        const headlineText = this.getChosenHeadlineText(memory.chosenHeadline, memory.businessType, memory);
        
        return `Excellent choice! "${headlineText}" really sets you apart.

Now, what's your signature ${businessType} experience that proves this promise? 

Think about that one trip or moment where clients truly felt the exclusivity - what made it unforgettable?`;
      }
      
      if (memory.chosenHeadline && memory.chosenHeadline !== "headline_pending" && memory.featuredTrip) {
        // Check if they want to continue to next area
        if (/next|good|looks|continue|what.*next|move|ready/.test(query.toLowerCase())) {
          return `Perfect! Your message strategy is solid. Ready to tackle the next area?

**Still need to cover:**
${this.getNextStrategyOptions(memory)}

Which area would you like to work on next?`;
        }
        
        return `Excellent! Let's craft your postcard copy:

**Front:** "${this.getChosenHeadlineText(memory.chosenHeadline, memory.businessType)}"
**Back:** "Imagine ${this.createScenario(memory.featuredTrip, memory.businessType)}... ${this.getCallToAction(memory.businessType)}"

Does this capture your unique value? Should we adjust anything?`;
      }
      
      // If they just got strategy overview, make sure we show them the headlines
      if (!memory.chosenHeadline || memory.chosenHeadline === "headline_pending") {
        // Check if they gave negative feedback or rejection
        if (memory.rejectedSuggestions || (memory.needsCustomHeadlines && memory.wantsLuxuryFocus)) {
          // If they've already seen luxury options and still reject, go full creative
          if (memory.rejectedSuggestions && memory.wantsLuxuryFocus) {
            return `I hear you - let's step back from pre-written options.

Think about your most successful booking. What did that client say made them choose you? What emotion or promise sealed the deal?

Share that with me, and I'll craft headlines that capture THAT exact feeling.`;
          }
          
          // First rejection - try luxury focused
          return `You're absolutely right - those headlines don't capture the luxury experience. Let me create better options for your upscale clientele:

**Luxury-Focused Headlines:**
1. "Your Private Yacht Holds 200. Not 2,000."
2. "Suite-Only Ships. Butler-Only Service. The Way Cruising Should Be."
3. "When 'All-Inclusive' Includes the Caviar and Château Margaux"

These better reflect exclusivity and sophistication. Which resonates with your brand?

And what's your most exclusive cruise experience that proves this luxury promise?`;
        }
        
        const headlines = this.getHeadlinesForBusinessType(memory.businessType);
        return `Let's work on your message. Here are headline options for your ${memory.businessType || 'travel'} business:

${headlines}

Which captures your style best? And what's your signature trip experience that gets people excited?`;
      }
    }
    
    // Check if they want to move to another strategy area
    if (/visual|design|list|execution|next/.test(query.toLowerCase())) {
      return `Great progress on ${strategy.replace('_', ' ')}! Ready to tackle another area?

**Still need to cover:**
${this.getNextStrategyOptions(memory)}

Which area interests you most next?`;
    }
    
    return null; // Fall back to standard response generation
  }
  
  getChosenHeadlineText(chosenHeadline, businessType = '', memory = null) {
    const queryLower = chosenHeadline.toLowerCase();
    
    // Handle numbered options first
    if (chosenHeadline.startsWith('option_')) {
      const optionNum = chosenHeadline.split('_')[1];
      return this.getHeadlineByNumber(optionNum, businessType, memory);
    }
    
    // Cruise headlines
    if (businessType.includes('cruise') || /cruise|river|luxury|culture/.test(queryLower)) {
      if (queryLower.includes('hidden') || queryLower.includes('gems') || queryLower.includes('palace')) {
        return 'Discover Europe\'s Hidden Gems From Your Floating Palace';
      }
      if (queryLower.includes('luxury') || queryLower.includes('culture') || queryLower.includes('meet')) {
        return 'Where Luxury Meets Culture: Unforgettable River Journeys';
      }
      if (queryLower.includes('step') || queryLower.includes('history') || queryLower.includes('ship')) {
        return 'Step Off the Ship, Step Into History';
      }
      return 'Discover Europe\'s Hidden Gems From Your Floating Palace'; // Default for cruises
    }
    
    // Adventure headlines  
    if (queryLower.includes('escape') || queryLower.includes('office')) {
      return 'Escape the Office. Embrace the Wild.';
    }
    if (queryLower.includes('calling') || queryLower.includes('answer')) {
      return 'Your Next Adventure is Calling... Will You Answer?';
    }
    if (queryLower.includes('stop') || queryLower.includes('dream')) {
      return 'Stop Dreaming. Start Climbing, Hiking, Living.';
    }
    
    // Default based on business type
    if (businessType.includes('cruise')) {
      return 'Discover Europe\'s Hidden Gems From Your Floating Palace';
    }
    return 'Escape the Office. Embrace the Wild.';
  }
  
  createScenario(featuredTrip, businessType = '') {
    const tripLower = featuredTrip.toLowerCase();
    
    // Handle cruise scenarios
    if (businessType.includes('cruise') || /cruise|river|city|cultural|inclusive/.test(tripLower)) {
      if (/river|europe|city|cultural/.test(tripLower)) {
        return 'gliding past medieval castles, stepping off for exclusive city tours, returning to your luxury suite each evening';
      }
      if (/inclusive|luxury/.test(tripLower)) {
        return 'being pampered with gourmet dining while historic cities unfold outside your window';
      }
      return 'waking up in a new fascinating city each morning, exploring cobblestone streets, then returning to your floating hotel';
    }
    
    // Handle adventure scenarios
    if (/climb|rock|mountain/.test(tripLower)) {
      return 'reaching the summit after an incredible climb, the world spread out below you';
    }
    if (/hik|trek|trail/.test(tripLower)) {
      return 'walking ancient trails, disconnected from everything except nature\'s power';
    }
    if (/raft|water|river/.test(tripLower) && !businessType.includes('cruise')) {
      return 'conquering raging rapids, heart pounding with pure adrenaline';
    }
    
    // Default based on business type
    if (businessType.includes('cruise')) {
      return 'exploring Europe\'s most beautiful cities from the comfort of your luxury river cruise';
    }
    return 'trading your desk view for endless horizons and real adventure';
  }
  
  getCallToAction(businessType = '') {
    if (businessType.includes('cruise')) {
      return 'Reserve your stateroom today. Call [Your number] for luxury that moves you.';
    }
    if (businessType.includes('adventure')) {
      return 'Stop imagining. Start living. Call [Your number] for your next adventure.';
    }
    return 'Make it happen. Call [Your number] to start planning.';
  }
  
  getNextStrategyOptions(memory) {
    const options = [];
    if (!memory.strategyProgress.visualDesign.started) options.push('• Visual Design - Colors, images, and layout');
    if (!memory.strategyProgress.listBuilding.started) options.push('• List Building - Finding your ideal clients');
    if (!memory.strategyProgress.campaignExecution.started) options.push('• Campaign Execution - Timeline and implementation');
    return options.join('\n');
  }
  
  getHeadlinesForBusinessType(businessType) {
    if (!businessType) return this.getGenericHeadlines();
    
    if (businessType.includes('river cruise')) {
      return `1. "Skip the Bus Tours. Your Suite Floats to Each City."
2. "Unpack Once. Wake Up in Prague, Vienna, Budapest."
3. "Small Ship. Big Access. No Tour Bus Crowds."`;
    }
    
    if (businessType.includes('cruise')) {
      return `1. "7 Countries. 1 Suitcase. 0 Airport Security Lines."
2. "Tired of Unpacking? Let Your Hotel Do the Traveling."
3. "Kids Want Fun. You Want Rest. This Ship Has Both."`;
    }
    
    if (businessType.includes('adventure')) {
      return `1. "Your Coworkers Post Gym Selfies. You'll Post Summit Selfies."
2. "Trading Spreadsheets for Mountain Peaks Since 2010"
3. "Because 'Someday' Isn't on the Calendar"`;
    }
    
    if (businessType.includes('luxury')) {
      return `1. "Tired of 'Luxury' Tours Herding You Like Cattle?"
2. "Why Settle for 5-Star When You Deserve Private Access?"
3. "The Louvre at Dawn. Just You. No Crowds."`;
    }
    
    return this.getGenericHeadlines();
  }
  
  async generateCustomHeadlines(themes = [], businessContext = '', idealClient = '') {
    const themeString = themes.length > 0 ? themes.join(', ') : 'exclusivity, sophistication, unique experiences';
    
    const prompt = `You're a creative strategist writing luxury postcard headlines for a high-end travel advisor.
Business: ${businessContext}
Target audience: ${idealClient}
Themes to incorporate: ${themeString}

${businessContext.includes('cruise') ? 'The advisor specializes in personalized, guided cruise experiences — like "we plan your travel for you" and "a guided hand each step of the way."' : ''}

Write 3 sophisticated, emotionally compelling postcard headlines that:
- Feel personal, elegant, and exclusive
- Address specific pain points of ${idealClient}
- Use elevated, sophisticated language
- Create intrigue or contrast
- Avoid clichés and cruise industry tropes
${businessContext.includes('cruise') ? '- Don\'t mention "unpacking" or "kids"' : ''}

Format: Just list the 3 headlines, numbered.`;

    try {
      const response = await this.llm.chat([
        { role: 'system', content: 'You are an expert travel marketing copywriter who creates compelling headlines.' },
        { role: 'user', content: prompt }
      ], {
        model: 'gpt-4o-mini',
        temperature: 0.8,
        max_tokens: 200
      });
      
      // Check for mock response
      if (typeof response.content === 'string' && response.content.includes('Mock response')) {
        console.warn('❌ LLM returned mock response - using fallback headlines');
        return this.generateFallbackCustomHeadlines(themes, businessContext);
      }
      
      return response.content;
    } catch (error) {
      // Fallback headlines based on themes
      return this.generateFallbackCustomHeadlines(themes, businessContext);
    }
  }
  
  generateFallbackCustomHeadlines(themes, businessContext) {
    // Enhanced templates for luxury cruise context
    const isLuxuryCruise = businessContext.includes('cruise') && (businessContext.includes('luxury') || themes.includes('exclusivity'));
    
    const templates = {
      exclusivity: isLuxuryCruise ? [
        "Every Detail, Seamlessly Orchestrated. Just Show Up.",
        "Your Travel Concierge at Sea. Every Moment Curated.",
        "The Voyage Where 'All-Inclusive' Includes Everything You Didn't Know to Ask For"
      ] : [
        "Only 12 Suites. 3,000 Applied. Will You Be Chosen?",
        "The Voyage 97% of Travelers Will Never Experience"
      ],
      personalization: isLuxuryCruise ? [
        "From Dock to Dream: A Journey Curated Just for You",
        "You Travel. We Handle Everything Else.",
        "Your Preferences Remembered. Your Expectations Exceeded."
      ] : [
        "Your Butler Knows Your Name. And Your Favorite Wine.",
        "Designed Around You. Not 3,000 Other Passengers."
      ],
      authenticity: [
        "Beyond the Brochure. Into the Extraordinary.",
        "Real Experiences. Real Access. Really Different."
      ],
      tranquility: [
        "Finally. Travel Without the Travel Planning.",
        "Disconnect From Logistics. Connect With Wonder."
      ],
      discovery: [
        "Collecting Moments, Not Tourist Traps",
        "The World's Hidden Corners. Reserved for You."
      ]
    };
    
    const selectedHeadlines = [];
    themes.forEach(theme => {
      if (templates[theme] && templates[theme].length > 0) {
        selectedHeadlines.push(templates[theme][0]);
      }
    });
    
    // Fill with elegant defaults if needed
    while (selectedHeadlines.length < 3) {
      const defaults = isLuxuryCruise ? [
        "Where Every Detail Is Handled. So You Can Simply Be.",
        "The Art of Travel, Perfected.",
        "Your Journey. Our Expertise. Perfection."
      ] : [
        "Your Ship Has Arrived. (And It's Nothing Like the Others.)",
        "Travel That Transcends Expectations.",
        "The Journey You've Been Waiting For."
      ];
      selectedHeadlines.push(defaults[selectedHeadlines.length % defaults.length]);
    }
    
    return selectedHeadlines.slice(0, 3).map((h, i) => `${i + 1}. "${h}"`).join('\n');
  }
  
  generateLuxuryCruiseStrategy(memory, isOlder = false) {
    const idealClient = memory.idealClient || 'discerning travelers';
    const budget = memory.budget || '$1000';
    
    return `**Message Strategy for Luxury Cruises**

For your ${idealClient}, let's create headlines that speak to exclusivity:

**Primary Headline Options:**
1. "Your Private Yacht Holds 200. Not 2,000."
2. "Suite-Only Ships. Butler-Only Service. The Way Cruising Should Be."
3. "When 'All-Inclusive' Includes the Caviar and Château Margaux"

**Key Message Elements:**
• **Pain Point**: Mass-market cruise ships, nickel-and-diming, fighting for deck chairs
• **Solution**: Intimate ships, all-suite accommodations, personalized service ratios
• **Proof**: "More crew than guests" or "Space ratio 3x industry standard"
• **Urgency**: Limited suites, exclusive departures

**Postcard Copy Framework:**
- Front: Elegant ship or suite image + chosen headline
- Back: "${isOlder ? 'You\'ve earned the right to travel without compromises' : 'Experience the Mediterranean as it was meant to be seen - from your private balcony, not a crowded deck'}..."

**Your ${budget} budget strategy:**
- 300 heavy-stock postcards with gold foil accents
- Highly targeted mailing to qualified luxury travelers

What specific luxury cruise line or experience defines your difference?`;
  }
  
  getGenericHeadlines() {
    return `1. "Still Taking the Same Vacation as Everyone Else?"
2. "Your Friends Show the Same Travel Photos. Time to Change That."
3. "Stop Googling 'Best Places to Visit.' Start Living Them."`;
  }
  
  getHeadlineByNumber(number, businessType, memory = null) {
    // Dynamic headline selection based on context
    if (memory && businessType.includes('cruise')) {
      const idealClient = (memory.idealClient || '').toLowerCase();
      const isLuxury = /wealthy|luxury|affluent|high.?end|exclusive|upscale/.test(idealClient);
      if (isLuxury) {
        businessType = 'luxury cruises';
      }
    }
    
    const headlines = {
      'luxury cruises': [
        "Your Private Yacht Holds 200. Not 2,000.",
        "Suite-Only Ships. Butler-Only Service. The Way Cruising Should Be.",
        "When 'All-Inclusive' Includes the Caviar and Château Margaux"
      ],
      'luxury travel': [
        "Tired of 'Luxury' Tours Herding You Like Cattle?",
        "Why Settle for 5-Star When You Deserve Private Access?",
        "The Louvre at Dawn. Just You. No Crowds."
      ],
      'luxury': [
        "Tired of 'Luxury' Tours Herding You Like Cattle?",
        "Why Settle for 5-Star When You Deserve Private Access?",
        "The Louvre at Dawn. Just You. No Crowds."
      ],
      'river cruises': [
        "Skip the Bus Tours. Your Suite Floats to Each City.",
        "Unpack Once. Wake Up in Prague, Vienna, Budapest.",
        "Small Ship. Big Access. No Tour Bus Crowds."
      ],
      'cruises': [
        "7 Countries. 1 Suitcase. 0 Airport Security Lines.",
        "Tired of Unpacking? Let Your Hotel Do the Traveling.",
        "Kids Want Fun. You Want Rest. This Ship Has Both."
      ],
      'adventure': [
        "Your Coworkers Post Gym Selfies. You'll Post Summit Selfies.",
        "Trading Spreadsheets for Mountain Peaks Since 2010",
        "Because 'Someday' Isn't on the Calendar"
      ],
      'default': [
        "Still Taking the Same Vacation as Everyone Else?",
        "Your Friends Show the Same Travel Photos. Time to Change That.",
        "Stop Googling 'Best Places to Visit.' Start Living Them."
      ]
    };
    
    const typeHeadlines = headlines[businessType] || headlines['default'];
    const index = parseInt(number) - 1;
    return typeHeadlines[index] || typeHeadlines[0];
  }

  getFallbackResponse(query, conversationHistory) {
    if (conversationHistory.length === 0) {
      return {
        status: 'success',
        type: 'conversational_guidance',
        agent: this.name,
        content: {
          text: `I'd love to help you create a successful postcard campaign for your travel business!

Tell me a bit about what you offer - what kind of travel experiences do you specialize in?`,
          confidence: 'high'
        },
        metadata: { conversational: true }
      };
    }

    return {
      status: 'success',
      type: 'conversational_guidance', 
      agent: this.name,
      content: {
        text: `Let me help you with your postcard campaign. What specific aspect would you like to explore - your target audience, the message, or the campaign strategy?`,
        confidence: 'high'
      },
      metadata: { conversational: true }
    };
  }

  // === DEBUG METHODS ===
  
  getMemoryState(conversationHistory) {
    const conversationId = this.getConversationId(conversationHistory);
    const memory = this.getMemory(conversationId);
    return {
      conversationId,
      memory: {
        businessType: memory.businessType,
        audienceChallenge: memory.audienceChallenge,
        idealClient: memory.idealClient,
        budget: memory.budget,
        timeline: memory.timeline,
        confirmedTopics: memory.confirmedTopics,
        currentStage: memory.currentStage,
        topicsDiscussed: Array.from(memory.topicsDiscussed),
        lastBotQuestions: memory.lastBotQuestions
      },
      memorySummary: this.getMemorySummary(memory),
      nextAction: this.determineNextAction(memory),
      skippableTopics: this.getSkippableTopics(memory)
    };
  }
}

// Register the agent
registerAgent(DirectMailAgent);

export default DirectMailAgent;