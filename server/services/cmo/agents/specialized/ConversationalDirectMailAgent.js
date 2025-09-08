/**
 * ConversationalDirectMailAgent - Acts as a consultant, not a lecturer
 * 
 * Asks investigative questions to understand user needs before providing guidance
 * Adapts to user expertise level from onboarding
 */

import { registerAgent } from '../AgentRegistry.js';
import { layeredKnowledge } from '../../../knowledge/LayeredKnowledgeSystem.js';

export class ConversationalDirectMailAgent {
  static metadata = {
    channel: 'direct_mail',
    name: 'Direct Mail Consultant',
    description: 'Conversational expert who asks questions to guide users',
    priority: 10,
    triggers: [
      /direct mail/i,
      /postcard/i,
      /mailer/i,
      /flyer/i,
      /brochure/i,
      /catalog/i,
      /mail campaign/i
    ],
    confidence: (message, context) => {
      const msgLower = message.toLowerCase();
      let confidence = 0;
      
      if (/postcard|direct mail|mailer/i.test(msgLower)) {
        confidence = 0.9;
      }
      
      return confidence;
    }
  };

  constructor() {
    this.name = 'ConversationalDirectMailAgent';
  }

  async execute(input) {
    const { query, userId, expertise, conversationHistory = [] } = input;
    
    console.log(`🗣️ ConversationalDirectMailAgent: Analyzing conversation context`);
    
    // Determine user's expertise level
    const userLevel = this.getUserLevel(expertise);
    
    // Analyze conversation state
    const conversationState = this.analyzeConversation(query, conversationHistory);
    
    // Generate appropriate response based on state
    let response;
    
    switch (conversationState.stage) {
      case 'initial_inquiry':
        response = this.handleInitialInquiry(query, userLevel, conversationState);
        break;
        
      case 'gathering_details':
        response = this.handleDetailGathering(query, userLevel, conversationState);
        break;
        
      case 'providing_guidance':
        response = this.provideGuidance(query, userLevel, conversationState);
        break;
        
      case 'refining_strategy':
        response = this.refineStrategy(query, userLevel, conversationState);
        break;
        
      default:
        response = this.handleGeneralQuestion(query, userLevel);
    }
    
    return response;
  }

  /**
   * Determine user's expertise level
   */
  getUserLevel(expertise) {
    if (!expertise || !expertise.overall_level) {
      return 'beginner';
    }
    return expertise.overall_level;
  }

  /**
   * Analyze where we are in the conversation
   */
  analyzeConversation(currentQuery, history) {
    const state = {
      stage: 'initial_inquiry',
      hasGoal: false,
      hasAudience: false,
      hasBudget: false,
      hasTimeline: false,
      hasPreviousExperience: false,
      specificQuestions: []
    };
    
    // Check what we already know from conversation
    const allMessages = [...history, { content: currentQuery }];
    
    allMessages.forEach(msg => {
      const content = msg.content?.toLowerCase() || '';
      
      // Check for goal mentions
      if (/promote|sell|market|increase|boost|launch/i.test(content)) {
        state.hasGoal = true;
      }
      
      // Check for audience mentions
      if (/clients?|customers?|audience|target|demographic/i.test(content)) {
        state.hasAudience = true;
      }
      
      // Check for budget mentions
      if (/\$|budget|spend|cost|afford|invest/i.test(content)) {
        state.hasBudget = true;
      }
      
      // Check for timeline mentions
      if (/when|deadline|date|month|soon|asap/i.test(content)) {
        state.hasTimeline = true;
      }
    });
    
    // Determine conversation stage
    if (!state.hasGoal && !state.hasAudience) {
      state.stage = 'initial_inquiry';
    } else if (state.hasGoal && (!state.hasAudience || !state.hasBudget)) {
      state.stage = 'gathering_details';
    } else if (state.hasGoal && state.hasAudience) {
      state.stage = 'providing_guidance';
    }
    
    return state;
  }

  /**
   * Handle initial inquiry - Ask investigative questions
   */
  handleInitialInquiry(query, userLevel, state) {
    const responses = {
      beginner: {
        text: `I'd love to help you with a postcard campaign! 

To give you the best guidance, could you tell me a bit more about what you have in mind?

For example:
- Are you looking to attract new clients or reconnect with past ones?
- Is there a specific trip or destination you want to promote?
- Or are you just exploring whether postcards might work for your business?

Whatever stage you're at is perfectly fine - I'm here to help! 😊`,
        followUp: [
          "I want to promote our new Alaska cruises",
          "I'm trying to reconnect with past clients", 
          "I'm not sure, just exploring options"
        ]
      },
      
      intermediate: {
        text: `Great timing for a postcard campaign! I can help you create something effective.

What's your main objective with this campaign?

- **Reactivation**: Re-engage past clients who haven't booked recently
- **Acquisition**: Attract new clients in your local market
- **Promotion**: Fill specific departures or promote seasonal offers
- **Retention**: Stay top-of-mind with regular clients

Once I know your goal, I can guide you on the best approach, targeting, and messaging.`,
        followUp: [
          "I need to fill some river cruise cabins",
          "Want to reactivate clients from 2022",
          "Looking to grow my client base locally"
        ]
      },
      
      advanced: {
        text: `Let's craft an effective postcard campaign. What are you looking to accomplish?

- Specific departure/inventory to move?
- Target audience segment?
- Campaign objective (acquisition, retention, reactivation)?
- Part of a multi-channel strategy?

The more specific you can be about your goals, the more targeted my recommendations will be.`,
        followUp: [
          "Need to move 12 cabins on Rhine cruise",
          "Targeting empty nesters for luxury travel",
          "Part of our Q2 acquisition strategy"
        ]
      },
      
      expert: {
        text: `Postcard campaign - excellent choice. What's your primary KPI for this campaign?

- ROAS target?
- Specific inventory pressure?
- Segment you're targeting?
- Integration with your marketing stack?

Let's optimize for your specific objectives.`,
        followUp: []
      }
    };
    
    const response = responses[userLevel] || responses.beginner;
    
    return {
      status: 'success',
      type: 'investigative_question',
      agent: this.name,
      content: {
        text: response.text,
        confidence: 'high',
        structured: {
          stage: 'gathering_information',
          nextQuestions: response.followUp,
          waitingFor: ['goal', 'audience', 'context']
        }
      },
      metadata: {
        conversational: true,
        requiresFollowUp: true
      }
    };
  }

  /**
   * Handle detail gathering - Ask specific follow-up questions
   */
  handleDetailGathering(query, userLevel, state) {
    let text = '';
    let waitingFor = [];
    
    // We know they have a goal, now get specifics
    if (!state.hasAudience) {
      const audienceQuestions = {
        beginner: `That sounds great! Who would be the best audience for this?

- Your past clients who've traveled with you before?
- New people in your local area?
- A specific age group or interest (like cruise lovers)?

Don't worry if you're not sure - we can figure it out together!`,
        
        intermediate: `Perfect! Now let's think about targeting.

Who's your ideal recipient for this campaign?
- **Past clients** (when did they last book?)
- **Geographic area** (radius from your office?)
- **Demographics** (age, income, interests?)
- **Behavioral** (cruise enthusiasts, luxury travelers?)

The more specific we get, the better your results will be.`,
        
        advanced: `Got it. Let's define your target segment:

- List source (house list, purchased, EDDM?)
- Recency/frequency criteria?
- Geographic parameters?
- Demographic overlays needed?
- Estimated universe size?`,
        
        expert: `Understood. Audience parameters?

- List composition and source
- RFM segmentation applied?
- Overlay data available?
- Suppression criteria?
- Universe size and CPM?`
      };
      
      text = audienceQuestions[userLevel] || audienceQuestions.beginner;
      waitingFor.push('audience');
      
    } else if (!state.hasBudget) {
      const budgetQuestions = {
        beginner: `Great choice of audience! Now, let's talk investment.

Postcard campaigns can work with almost any budget:
- **Small test**: $300-500 (about 300-500 postcards)
- **Standard campaign**: $1,000-2,000 (1,500-2,500 postcards)
- **Larger reach**: $2,500+ (3,000+ postcards)

What feels comfortable for you to start with? (Remember, even small campaigns can be very profitable!)`,
        
        intermediate: `Excellent targeting. What's your budget range for this campaign?

Typical ranges:
- **Test campaign**: $500-1,000 (500-1,000 pieces)
- **Standard**: $2,000-3,500 (2,500-5,000 pieces)
- **Volume**: $5,000+ (7,500+ pieces)

This includes design, printing, lists, and postage. What range works for your goals?`,
        
        advanced: `Target defined. Budget parameters?

- Total campaign budget?
- Target CPM acceptable?
- Minimum test quantity?
- Roll-out budget if test succeeds?

What's your investment range?`,
        
        expert: `Segment confirmed. Budget allocation?

- Test cell budget?
- Control vs. test split?
- Rollout provisions?
- Acceptable CPA threshold?`
      };
      
      text = budgetQuestions[userLevel] || budgetQuestions.beginner;
      waitingFor.push('budget');
      
    } else if (!state.hasTimeline) {
      const timelineQuestions = {
        beginner: `Perfect! One last thing - when would you like to mail these?

Best times for travel postcards:
- **6-8 weeks before** your promoted travel dates
- **Tuesday or Wednesday** arrival (best response days)
- Avoid holidays and long weekends

When were you thinking? I can help you work backwards from your travel dates!`,
        
        intermediate: `Good budget range. What's your timeline?

- In-home date target?
- Travel dates you're promoting?
- Design/approval time needed?
- Any co-op deadlines to meet?

When do you need these in mailboxes?`,
        
        advanced: `Budget approved. Timeline requirements?

- Target in-home date?
- Production schedule flexibility?
- Testing phase duration?
- Rollout timing if test succeeds?`,
        
        expert: `Investment level set. Deployment schedule?

- Test drop date?
- Read period required?
- Rollout waves planned?
- Backend capacity constraints?`
      };
      
      text = timelineQuestions[userLevel] || timelineQuestions.beginner;
      waitingFor.push('timeline');
    }
    
    return {
      status: 'success',
      type: 'follow_up_question',
      agent: this.name,
      content: {
        text,
        confidence: 'high',
        structured: {
          stage: 'gathering_details',
          stillNeeded: waitingFor,
          progress: {
            hasGoal: state.hasGoal,
            hasAudience: state.hasAudience,
            hasBudget: state.hasBudget,
            hasTimeline: state.hasTimeline
          }
        }
      },
      metadata: {
        conversational: true,
        requiresFollowUp: true
      }
    };
  }

  /**
   * Provide specific guidance once we have enough information
   */
  provideGuidance(query, userLevel, state) {
    // This is where we'd pull in knowledge and create a specific plan
    const guidanceTemplates = {
      beginner: `Based on what you've told me, here's your personalized postcard plan:

**Your Campaign Summary:**
✅ Goal: {goal}
✅ Audience: {audience}
✅ Budget: {budget}
✅ Timeline: {timeline}

**Here's exactly what to do:**

1. **This Week**: {immediate_action}
2. **Next Week**: {next_action}
3. **Week 3**: {final_action}

**What Success Looks Like:**
- Expect {expected_responses} responses
- Around {expected_bookings} bookings
- Approximately {expected_revenue} in revenue

Would you like me to walk you through any of these steps in more detail? Or shall we talk about the design and message for your postcard?`,

      intermediate: `Here's your strategic postcard campaign plan:

**Campaign Parameters:**
- Objective: {goal}
- Target: {audience}
- Investment: {budget}
- Deploy: {timeline}

**Recommended Approach:**
{strategic_recommendations}

**Expected Metrics:**
- Response Rate: {response_rate}
- Conversion: {conversion_rate}
- ROI Projection: {roi}

**Next Steps:**
1. {action_1}
2. {action_2}
3. {action_3}

Should we dive into creative strategy or discuss testing approaches?`,

      advanced: `Campaign architecture based on your parameters:

**Strategy Matrix:**
{detailed_strategy}

**Performance Projections:**
{detailed_metrics}

**Optimization Opportunities:**
{optimization_points}

**Implementation Roadmap:**
{implementation_timeline}

Which element should we optimize first?`
    };
    
    // For now, return a placeholder that shows we understand their needs
    return {
      status: 'success',
      type: 'personalized_guidance',
      agent: this.name,
      content: {
        text: `Perfect! Now I have a clear picture of what you need.

Based on what you've shared:
- You want to ${state.extractedGoal || 'reach your marketing goals'}
- Targeting ${state.extractedAudience || 'your ideal clients'}
- With a budget of ${state.extractedBudget || 'your specified amount'}
- Timeline: ${state.extractedTimeline || 'your timeframe'}

Let me create a specific plan for you...

[This is where detailed, personalized guidance would appear based on their inputs]

What part would you like me to explain first?`,
        confidence: 'high',
        structured: {
          stage: 'providing_guidance',
          planReady: true,
          canDrillDown: true
        }
      }
    };
  }

  /**
   * Handle general questions when we don't need full context
   */
  handleGeneralQuestion(query, userLevel) {
    // For specific questions like "what's the best paper stock" or "how much does postage cost"
    const queryLower = query.toLowerCase();
    
    if (/cost|price|budget|expensive/i.test(queryLower)) {
      return this.answerCostQuestion(query, userLevel);
    }
    
    if (/design|image|photo|layout/i.test(queryLower)) {
      return this.answerDesignQuestion(query, userLevel);
    }
    
    if (/size|dimension|format/i.test(queryLower)) {
      return this.answerFormatQuestion(query, userLevel);
    }
    
    // Default back to initial inquiry
    return this.handleInitialInquiry(query, userLevel, {});
  }

  /**
   * Answer specific cost questions
   */
  answerCostQuestion(query, userLevel) {
    const costResponses = {
      beginner: `Great question about costs! Postcards are actually quite affordable:

**Simple breakdown:**
- 500 postcards: About $400 total
- 1,000 postcards: About $650 total
- 2,500 postcards: About $1,200 total

This includes everything - design, printing, and mailing!

To give you a more specific quote, could you tell me:
- How many past clients you have?
- Or what area you'd like to target?

That way I can calculate exactly what you'd need to invest.`,

      intermediate: `Postcard campaign costs break down like this:

**Per piece costs:**
- Design: $0.10-0.20 (amortized)
- Printing: $0.15-0.25
- List/Processing: $0.05-0.10
- Postage: $0.35-0.48

**Total: $0.65-1.03 per piece**

Volume discounts apply above 2,500 pieces. What quantity are you considering?`,

      advanced: `Direct mail CPM varies by execution:

- EDDM: $180-220/thousand
- Targeted: $650-850/thousand
- Premium: $1,000-1,500/thousand

Depends on:
- List quality/selects
- Creative complexity
- Postal optimization
- Volume breaks

What's your target CPM?`
    };
    
    return {
      status: 'success',
      type: 'specific_answer',
      agent: this.name,
      content: {
        text: costResponses[userLevel] || costResponses.beginner,
        confidence: 'high',
        structured: {
          answeredQuestion: 'cost',
          followUpNeeded: true
        }
      }
    };
  }

  /**
   * Refine strategy based on additional inputs
   */
  refineStrategy(query, userLevel, state) {
    return {
      status: 'success',
      type: 'strategy_refinement',
      agent: this.name,
      content: {
        text: `Let me refine that recommendation based on your feedback...

[Adjusted strategy based on their input]

Does this better match what you had in mind?`,
        confidence: 'high'
      }
    };
  }
}

// Self-register when imported
registerAgent(ConversationalDirectMailAgent);

export default ConversationalDirectMailAgent;