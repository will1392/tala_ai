/**
 * DirectMailAgentV2 - Enhanced direct mail consultant with structured questionnaire
 * Built with advanced conversational AI for travel agents
 */

import { registerAgent } from '../AgentRegistry.js';
import llmManager from '../../../llm/LLMManager.js';
import CampaignStorage from '../../../storage/CampaignStorage.js';

export class DirectMailAgentV2 {
  static metadata = {
    channel: 'direct_mail_v2',
    name: 'Direct Mail Campaign Expert',
    description: 'Expert consultant for launching and optimizing direct mail campaigns',
    priority: 15, // Higher priority than V1
    triggers: [
      /direct mail/i,
      /postcard campaign/i,
      /mailer campaign/i,
      /launch.*campaign/i,
      /optimize.*campaign/i,
      /direct mail consultation/i
    ],
    confidence: (message) => {
      const msgLower = message.toLowerCase();
      if (/consultation|campaign consultant|expert help/i.test(msgLower)) return 0.95;
      if (/postcard|direct mail|mailer/.test(msgLower)) return 0.9;
      return 0;
    }
  };

  constructor() {
    this.name = 'DirectMailAgentV2';
    this.llm = llmManager;
    this.storage = new CampaignStorage();
    this.sections = this.initializeSections();
  }

  initializeSections() {
    return {
      business_objectives: {
        name: 'Business & Marketing Objectives',
        questions: [
          'travel_specialty',
          'business_goals',
          'previous_direct_mail',
          'marketing_mix_role',
          'primary_campaign_goal'
        ],
        completed: false
      },
      target_audience: {
        name: 'Target Audience Discovery',
        questions: [
          'ideal_client_profile',
          'audience_type',
          'demographics',
          'mailing_list_status',
          'seasonal_targeting'
        ],
        completed: false
      },
      offer_message: {
        name: 'Offer & Message Strategy',
        questions: [
          'campaign_offer',
          'value_proposition',
          'common_objections',
          'unique_differentiators',
          'featured_destinations'
        ],
        completed: false
      },
      design_format: {
        name: 'Design & Format',
        questions: [
          'format_preference',
          'design_assets',
          'imagery_style',
          'personalization_level',
          'call_to_action'
        ],
        completed: false
      },
      timing_frequency: {
        name: 'Timing & Frequency',
        questions: [
          'arrival_date',
          'seasonal_alignment',
          'booking_window',
          'campaign_frequency',
          'followup_coordination'
        ],
        completed: false
      },
      budget_roi: {
        name: 'Budget & ROI Expectations',
        questions: [
          'campaign_budget',
          'mail_volume',
          'customer_value',
          'success_metrics',
          'tracking_methods'
        ],
        completed: false
      },
      campaign_optimization: {
        name: 'Campaign Optimization',
        questions: [
          'past_results',
          'performance_metrics',
          'testing_history',
          'delivery_issues',
          'improvement_areas'
        ],
        completed: false,
        conditional: true // Only for existing campaigns
      },
      logistics_fulfillment: {
        name: 'Logistics & Fulfillment',
        questions: [
          'design_responsibility',
          'print_partner',
          'mail_class',
          'list_support_needed',
          'crm_integration'
        ],
        completed: false
      }
    };
  }

  async execute(input) {
    const { query, conversationHistory = [], userId, campaignId } = input;
    
    try {
      // Load or create campaign state
      const campaign = await this.loadOrCreateCampaign(userId, campaignId);
      
      // Analyze current context and progress
      const context = await this.analyzeProgress(campaign, query, conversationHistory);
      
      // Generate adaptive response based on questionnaire progress
      const response = await this.generateAdaptiveResponse(query, campaign, context);
      
      // Update campaign state
      await this.updateCampaignState(campaign, query, context);
      
      return {
        status: 'success',
        type: 'campaign_consultation',
        agent: this.name,
        content: {
          text: response,
          confidence: 'high',
          progress: this.calculateProgress(campaign),
          currentSection: context.currentSection,
          nextQuestion: context.nextQuestion
        },
        metadata: {
          campaignId: campaign.id,
          conversational: true,
          canSave: this.canSaveCampaign(campaign)
        }
      };
    } catch (error) {
      console.error('DirectMailAgentV2 error:', error);
      return this.getFallbackResponse(query, conversationHistory);
    }
  }

  async loadOrCreateCampaign(userId, campaignId) {
    if (campaignId) {
      const existingCampaign = await this.storage.getCampaign(userId, campaignId);
      if (existingCampaign) return existingCampaign;
    }
    
    // Create new campaign
    return await this.storage.createCampaign(userId, {
      type: 'direct_mail',
      status: 'consultation',
      sections: this.initializeSections(),
      responses: {},
      startedAt: new Date(),
      lastUpdated: new Date()
    });
  }

  async analyzeProgress(campaign, query, conversationHistory) {
    // Determine current section and question based on progress
    const incompleteSections = Object.entries(campaign.sections)
      .filter(([key, section]) => !section.completed && (!section.conditional || campaign.type === 'optimization'));
    
    const currentSection = incompleteSections[0]?.[0] || 'summary';
    const sectionData = campaign.sections[currentSection];
    
    // Find next unanswered question in current section
    const answeredQuestions = Object.keys(campaign.responses);
    const nextQuestion = sectionData?.questions?.find(q => !answeredQuestions.includes(q));
    
    // Detect if user is answering current question
    const isAnswering = await this.detectAnswer(query, nextQuestion, conversationHistory);
    
    return {
      currentSection,
      sectionData,
      nextQuestion,
      isAnswering,
      totalSections: Object.keys(campaign.sections).length,
      completedSections: Object.values(campaign.sections).filter(s => s.completed).length,
      campaignType: campaign.type || 'new'
    };
  }

  async detectAnswer(query, expectedQuestion, conversationHistory) {
    // Check if the user's response matches the expected question context
    const lastAssistantMessage = this.getLastAssistantMessage(conversationHistory);
    
    // Simple detection based on response length and context
    if (query.length > 10 && lastAssistantMessage) {
      return true; // Likely answering a question
    }
    
    return false;
  }

  async generateAdaptiveResponse(query, campaign, context) {
    const { currentSection, nextQuestion, isAnswering, campaignType } = context;
    
    // Handle initial greeting
    if (!campaign.responses || Object.keys(campaign.responses).length === 0) {
      return this.getWelcomeMessage(campaignType);
    }
    
    // Handle answer processing
    if (isAnswering && nextQuestion) {
      // Store the answer
      campaign.responses[nextQuestion] = query;
      
      // Check if section is complete
      const sectionQuestions = context.sectionData.questions;
      const sectionComplete = sectionQuestions.every(q => campaign.responses[q]);
      
      if (sectionComplete) {
        campaign.sections[currentSection].completed = true;
        return await this.getSectionTransition(currentSection, context);
      }
    }
    
    // Generate next question
    return await this.getNextQuestion(campaign, context);
  }

  getWelcomeMessage(campaignType) {
    if (campaignType === 'optimization') {
      return `Welcome back! I'm here to help you optimize your existing direct mail campaign for even better results.

I'll guide you through a comprehensive review of your current campaign and identify opportunities for improvement.

Let's start with your business. What type of travel experiences does your agency specialize in? (e.g., luxury cruises, adventure travel, family vacations, etc.)`;
    }
    
    return `Hello! I'm your direct mail campaign expert, and I'm here to help you launch a successful postcard campaign that drives real bookings for your travel agency.

I'll guide you through a comprehensive consultation to ensure we create a campaign that resonates with your ideal clients and achieves your business goals.

Let's begin with understanding your business. What type of travel experiences does your agency specialize in? (e.g., luxury cruises, adventure travel, family vacations, etc.)`;
  }

  async getNextQuestion(campaign, context) {
    const questions = this.getQuestionTemplates();
    const question = questions[context.nextQuestion];
    
    if (!question) {
      return this.generateCampaignSummary(campaign);
    }
    
    // Build context-aware question
    const prompt = `You are a direct mail marketing expert helping a travel agent. 
    
Current section: ${context.sectionData.name}
Previous responses: ${JSON.stringify(campaign.responses, null, 2)}
Current question topic: ${context.nextQuestion}
Base question: ${question.text}

Generate a natural, conversational way to ask this question that:
1. References any relevant previous answers
2. Shows understanding of their business
3. Provides helpful context or examples
4. Maintains a consultative, expert tone
5. Keeps the conversation flowing naturally

Important: Ask only this ONE question. Do not ask multiple questions at once.`;

    try {
      const response = await this.llm.chat([
        { role: 'system', content: 'You are a direct mail marketing expert for travel agencies.' },
        { role: 'user', content: prompt }
      ], {
        model: 'gpt-4o',
        temperature: 0.7,
        max_tokens: 300
      });
      
      return response.content;
    } catch (error) {
      // Fallback to template question
      return question.text;
    }
  }

  async getSectionTransition(completedSection, context) {
    const sectionName = context.sectionData.name;
    const nextSectionKey = this.getNextSection(completedSection, context);
    const nextSection = nextSectionKey ? this.sections[nextSectionKey] : null;
    
    const transitions = {
      business_objectives: `Excellent! I now have a clear understanding of your business objectives and how direct mail fits into your marketing strategy.

Next, let's define exactly who we're targeting with this campaign. Understanding your ideal client is crucial for creating messages that resonate and drive action.`,
      
      target_audience: `Perfect! I have a detailed picture of your target audience. This will help us craft messages that speak directly to their desires and pain points.

Now, let's work on the offer and message strategy that will grab their attention and compel them to take action.`,
      
      offer_message: `Great insights! Your value proposition and unique differentiators will form the foundation of compelling copy.

Let's move on to the visual design and format decisions that will make your postcard stand out in the mailbox.`,
      
      design_format: `Wonderful! The design direction is clear, and we know exactly how to make your postcards visually compelling.

Now, let's discuss timing and frequency to ensure your campaign hits at the perfect moment.`,
      
      timing_frequency: `Excellent timing strategy! Reaching people at the right moment is crucial for campaign success.

Let's talk about your budget and ROI expectations to ensure we maximize your investment.`,
      
      budget_roi: `Perfect! With your budget parameters and success metrics defined, we can create a campaign that delivers measurable results.

Finally, let's cover the logistics and fulfillment details to ensure smooth execution.`,
      
      logistics_fulfillment: `Fantastic! We've covered all the essential elements for your direct mail campaign.

Let me summarize your campaign strategy and provide specific recommendations for moving forward.`
    };
    
    const transition = transitions[completedSection] || 'Moving on to the next section...';
    
    if (nextSection) {
      return transition + '\n\n' + await this.getNextQuestion(context.campaign, {
        ...context,
        currentSection: nextSectionKey,
        sectionData: nextSection,
        nextQuestion: nextSection.questions[0]
      });
    }
    
    return transition;
  }

  getNextSection(currentSection, context) {
    const sectionOrder = [
      'business_objectives',
      'target_audience',
      'offer_message',
      'design_format',
      'timing_frequency',
      'budget_roi'
    ];
    
    // Add optimization section if applicable
    if (context.campaignType === 'optimization') {
      sectionOrder.push('campaign_optimization');
    }
    
    sectionOrder.push('logistics_fulfillment');
    
    const currentIndex = sectionOrder.indexOf(currentSection);
    return sectionOrder[currentIndex + 1];
  }

  getQuestionTemplates() {
    return {
      // Business & Marketing Objectives
      travel_specialty: {
        text: "What type of travel experiences does your agency specialize in? (e.g., luxury cruises, adventure travel, all-inclusive resorts, guided tours, etc.)"
      },
      business_goals: {
        text: "What are your primary business goals for the next 6-12 months? Are you looking to grow revenue, expand into new markets, or increase repeat bookings?"
      },
      previous_direct_mail: {
        text: "Have you used direct mail marketing before? If yes, what kind of results did you see?"
      },
      marketing_mix_role: {
        text: "How does direct mail fit into your current marketing mix? Do you also use email, social media, or other channels?"
      },
      primary_campaign_goal: {
        text: "What's the primary goal for this campaign - generating new leads, booking specific trips, driving awareness, or reactivating past clients?"
      },
      
      // Target Audience Discovery
      ideal_client_profile: {
        text: "Describe your ideal client for this campaign. What type of person gets the most value from your services?"
      },
      audience_type: {
        text: "Are you targeting new prospects, existing clients, past clients who haven't booked recently, or a mix?"
      },
      demographics: {
        text: "What demographics best describe your target audience - age range, income level, geographic location, lifestyle characteristics?"
      },
      mailing_list_status: {
        text: "Do you have an existing mailing list, or will you need to purchase or build one? If you have a list, how many contacts and how current is it?"
      },
      seasonal_targeting: {
        text: "Are you targeting any specific travel season, holiday period, or booking window? (e.g., summer vacations, holiday travel, spring break)"
      },
      
      // Offer & Message Strategy
      campaign_offer: {
        text: "What's the main offer or message you want to communicate? (e.g., special pricing, exclusive access, limited-time deals, unique experiences)"
      },
      value_proposition: {
        text: "What specific value do you want to emphasize - pricing, exclusive access, personalized service, expertise, or something else?"
      },
      common_objections: {
        text: "What objections or concerns does your target audience typically have about booking travel?"
      },
      unique_differentiators: {
        text: "What makes your travel agency different from online booking sites or other agencies they might consider?"
      },
      featured_destinations: {
        text: "Do you want to promote specific destinations, cruise lines, tour operators, or keep it more general?"
      },
      
      // Design & Format
      format_preference: {
        text: "What format are you considering - standard 4x6 postcard, 6x9 jumbo postcard, folded mailer, or letter in envelope?"
      },
      design_assets: {
        text: "Do you have existing brand guidelines, logos, or design templates we should use? Or will you need design created from scratch?"
      },
      imagery_style: {
        text: "What type of imagery resonates with your audience - destination photos, happy travelers, luxury amenities, or your team?"
      },
      personalization_level: {
        text: "Do you want to personalize the mailers with names, past travel history, or keep them more general?"
      },
      call_to_action: {
        text: "What's the primary action you want recipients to take - call you, visit a landing page, scan a QR code, or visit your office?"
      },
      
      // Timing & Frequency
      arrival_date: {
        text: "When do you want the postcards to arrive in homes? Do you have a specific date in mind or a general timeframe?"
      },
      seasonal_alignment: {
        text: "Are you targeting travel for a specific season or trying to capture early bookings for peak periods?"
      },
      booking_window: {
        text: "How far in advance do your clients typically book their travel - weeks, months, or even a year ahead?"
      },
      campaign_frequency: {
        text: "Do you envision this as a one-time campaign or part of an ongoing series (monthly, quarterly, seasonal)?"
      },
      followup_coordination: {
        text: "Will you coordinate email, social media, or phone follow-ups after the postcards hit? What's your follow-up strategy?"
      },
      
      // Budget & ROI
      campaign_budget: {
        text: "What's your total budget for this campaign, including design, printing, postage, and list costs?"
      },
      mail_volume: {
        text: "Based on your budget, how many pieces are you hoping to mail? Do you have a target number in mind?"
      },
      customer_value: {
        text: "What's the average booking value or lifetime value of a client? This helps us calculate ROI targets."
      },
      success_metrics: {
        text: "What response rate or number of bookings would make this campaign successful in your eyes?"
      },
      tracking_methods: {
        text: "How do you want to track results - unique phone numbers, promo codes, dedicated landing pages, or QR codes?"
      },
      
      // Campaign Optimization (for existing campaigns)
      past_results: {
        text: "Tell me about your last direct mail campaign. What were the response rate, conversion rate, and overall ROI?"
      },
      performance_metrics: {
        text: "Which metrics exceeded expectations and which fell short? What surprised you about the results?"
      },
      testing_history: {
        text: "Did you test different designs, offers, or headlines? What did you learn from those tests?"
      },
      delivery_issues: {
        text: "Were there any issues with list quality, deliverability, or timing that impacted results?"
      },
      improvement_areas: {
        text: "Based on your experience, what would you definitely do differently this time?"
      },
      
      // Logistics & Fulfillment
      design_responsibility: {
        text: "Who will handle the design and creative work - your team, a designer you work with, or do you need a recommendation?"
      },
      print_partner: {
        text: "Do you have a preferred printer/mail house, or would you like recommendations for reliable partners?"
      },
      mail_class: {
        text: "Are you planning to use First-Class mail for faster delivery, Marketing Mail for cost savings, or EDDM for neighborhood saturation?"
      },
      list_support_needed: {
        text: "Do you need help acquiring, cleaning, or formatting your mailing list to meet USPS requirements?"
      },
      crm_integration: {
        text: "Do you need help integrating campaign tracking with your CRM or booking system for better lead management?"
      }
    };
  }

  async generateCampaignSummary(campaign) {
    const responses = campaign.responses;
    
    const summaryPrompt = `You are a direct mail marketing expert. Based on the following campaign consultation responses, create a comprehensive campaign strategy summary and actionable recommendations.

Client Responses:
${JSON.stringify(responses, null, 2)}

Create a summary that includes:
1. Campaign Overview (2-3 sentences)
2. Target Audience Profile
3. Recommended Message Strategy
4. Design Direction
5. Campaign Timeline
6. Budget Allocation
7. Success Metrics
8. Next Steps (numbered list)

Make it specific, actionable, and directly tied to their responses.`;

    try {
      const response = await this.llm.chat([
        { role: 'system', content: 'You are an expert direct mail consultant for travel agencies.' },
        { role: 'user', content: summaryPrompt }
      ], {
        model: 'gpt-4o',
        temperature: 0.7,
        max_tokens: 800
      });
      
      return `## Your Direct Mail Campaign Strategy

Based on our comprehensive consultation, here's your personalized campaign strategy:

${response.content}

Would you like to:
1. Save this campaign plan for future reference
2. Make adjustments to any section
3. Get specific vendor recommendations
4. Start implementation immediately

Just let me know how you'd like to proceed!`;
    } catch (error) {
      return this.getFallbackSummary(campaign);
    }
  }

  getFallbackSummary(campaign) {
    return `## Your Direct Mail Campaign Strategy

Based on our consultation, here's your campaign overview:

**Business Focus:** ${campaign.responses.travel_specialty || 'Travel services'}
**Target Audience:** ${campaign.responses.ideal_client_profile || 'Your ideal clients'}
**Campaign Goal:** ${campaign.responses.primary_campaign_goal || 'Generate bookings'}
**Budget Range:** ${campaign.responses.campaign_budget || 'To be determined'}

**Recommended Next Steps:**
1. Finalize your mailing list based on the targeting criteria we discussed
2. Create compelling copy focused on your unique value proposition
3. Design eye-catching postcards that reflect your brand
4. Set up tracking mechanisms to measure results
5. Plan your follow-up strategy for maximum conversion

Would you like to save this campaign plan or make any adjustments?`;
  }

  async updateCampaignState(campaign, query, context) {
    campaign.lastUpdated = new Date();
    
    if (context.isAnswering && context.nextQuestion) {
      campaign.responses[context.nextQuestion] = query;
      
      // Check section completion
      const sectionQuestions = context.sectionData.questions;
      const sectionComplete = sectionQuestions.every(q => campaign.responses[q]);
      
      if (sectionComplete) {
        campaign.sections[context.currentSection].completed = true;
      }
    }
    
    await this.storage.updateCampaign(campaign);
  }

  calculateProgress(campaign) {
    const totalQuestions = Object.values(campaign.sections)
      .filter(s => !s.conditional || campaign.type === 'optimization')
      .reduce((sum, section) => sum + section.questions.length, 0);
    
    const answeredQuestions = Object.keys(campaign.responses).length;
    
    return {
      percentage: Math.round((answeredQuestions / totalQuestions) * 100),
      answered: answeredQuestions,
      total: totalQuestions
    };
  }

  canSaveCampaign(campaign) {
    // Campaign can be saved after at least one section is complete
    return Object.values(campaign.sections).some(s => s.completed);
  }

  getLastAssistantMessage(conversationHistory) {
    for (let i = conversationHistory.length - 1; i >= 0; i--) {
      if (conversationHistory[i].role === 'assistant') {
        return conversationHistory[i].content;
      }
    }
    return null;
  }

  getFallbackResponse(query, conversationHistory) {
    return {
      status: 'success',
      type: 'campaign_consultation',
      agent: this.name,
      content: {
        text: `I'm here to help you create a successful direct mail campaign for your travel agency. 

Would you like to start a new campaign consultation or continue working on an existing one?`,
        confidence: 'high'
      },
      metadata: { conversational: true }
    };
  }
}

// Register the agent
registerAgent(DirectMailAgentV2);

export default DirectMailAgentV2;