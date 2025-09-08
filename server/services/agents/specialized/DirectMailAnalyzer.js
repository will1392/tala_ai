/**
 * DirectMailAnalyzer - GPT-5 powered agent for analyzing direct mail consultations
 * Provides strategic insights and recommendations based on consultation data
 */

import LLMRouter from '../../llm/LLMRouter.js';

class DirectMailAnalyzer {
  constructor() {
    this.model = 'gpt-4o-mini'; // Using GPT-4o mini as fallback
    this.llmRouter = new LLMRouter({
      enableLogging: true,
      costOptimization: true
    });
  }

  /**
   * Analyze consultation data and provide strategic insights
   */
  async analyzeConsultation(consultationData) {
    console.log('🔍 DirectMailAnalyzer: Starting analysis with GPT-4o-mini');
    
    try {
      const analysisPrompt = this.buildAnalysisPrompt(consultationData);
      
      // Get AI analysis using LLMRouter
      const response = await this.llmRouter.routeQuery(
        analysisPrompt,
        {
          userId: 'direct-mail-analyzer',
          mode: 'analysis',
          preferredModel: 'gpt-4o-mini'
        },
        {
          temperature: 0.7,
          maxTokens: 2000,
          systemPrompt: `You are a Direct Mail Marketing Expert specializing in travel agencies. 
            You analyze consultation data to provide strategic insights and actionable recommendations.
            Your analysis should be data-driven, specific, and tailored to the travel industry.
            Focus on ROI optimization and conversion rate improvement.`
        }
      );

      const analysis = response.result?.response || response.content;
      console.log('✅ DirectMailAnalyzer: Analysis complete');
      
      return {
        success: true,
        analysis: this.structureAnalysis(analysis, consultationData)
      };

    } catch (error) {
      console.error('❌ DirectMailAnalyzer: Analysis failed', error);
      return {
        success: false,
        error: error.message,
        fallbackAnalysis: this.getFallbackAnalysis(consultationData)
      };
    }
  }

  buildAnalysisPrompt(data) {
    return `Analyze this Direct Mail Campaign consultation for a travel agency:

BUSINESS PROFILE:
- Travel Specialty: ${data.travel_specialty || 'Not specified'}
- Business Goals: ${data.business_goals || 'Not specified'}
- Primary Campaign Goal: ${data.primary_campaign_goal || 'Not specified'}
- Previous Direct Mail Experience: ${data.previous_direct_mail || 'No'}
${data.previous_results ? `- Previous Results: ${data.previous_results}` : ''}

TARGET AUDIENCE:
- Ideal Client: ${data.ideal_client || 'Not specified'}
- Audience Type: ${data.audience_type || 'Not specified'}
- Demographics:
  - Age Range: ${data.demographics_age_range || 'Not specified'}
  - Income Level: ${data.demographics_income_level || 'Not specified'}
  - Location: ${data.demographics_location || 'Not specified'}
- Mailing List: ${data.mailing_list || 'Not specified'}
- List Size: ${data.list_size || 'Not specified'}

OFFER & MESSAGING:
- Campaign Offer: ${data.campaign_offer || 'Not specified'}
- Value Proposition: ${data.value_proposition || 'Not specified'}
- Common Objections: ${data.common_objections || 'Not specified'}
- Differentiators: ${data.differentiators || 'Not specified'}
- Featured Destinations: ${data.featured_destinations || 'Not specified'}

CAMPAIGN DETAILS:
- Format Preference: ${data.format_preference || 'Not specified'}
- Budget: ${data.campaign_budget || 'Not specified'}
- Mail Volume: ${data.mail_volume || 'Not specified'}
- Arrival Date: ${data.arrival_date || 'Not specified'}
- Customer Value: ${data.customer_value || 'Not specified'}

Please provide:

1. STRATEGIC ASSESSMENT
   - Strengths of this campaign approach
   - Potential challenges or weaknesses
   - Market positioning analysis

2. TARGET AUDIENCE INSIGHTS
   - Profile validation (is this the right audience?)
   - Additional targeting recommendations
   - Expected response rate based on audience

3. OFFER OPTIMIZATION
   - Strength of current offer
   - Suggestions for improvement
   - Urgency and scarcity tactics

4. BUDGET & ROI PROJECTIONS
   - Expected response rate (industry benchmarks)
   - Projected conversions and revenue
   - Cost per acquisition estimate
   - ROI timeline

5. COMPETITIVE ADVANTAGE
   - How to stand out in mailbox
   - Unique selling propositions to emphasize
   - Positioning against online booking sites

6. RISK MITIGATION
   - Potential failure points
   - Contingency recommendations
   - Testing strategies

Format your response with clear sections and bullet points for easy reading.`;
  }

  structureAnalysis(rawAnalysis, consultationData) {
    // Structure the analysis with metadata
    return {
      consultationId: consultationData.campaignId,
      campaignName: consultationData.campaignName || 'Direct Mail Campaign',
      analysisDate: new Date().toISOString(),
      model: this.model,
      
      // Core analysis
      strategicInsights: rawAnalysis,
      
      // Key metrics and projections
      projections: {
        estimatedResponseRate: this.estimateResponseRate(consultationData),
        estimatedROI: this.estimateROI(consultationData),
        breakEvenPoint: this.calculateBreakeven(consultationData)
      },
      
      // Quick wins
      quickWins: this.identifyQuickWins(consultationData),
      
      // Priority actions
      priorityActions: this.identifyPriorityActions(consultationData)
    };
  }

  estimateResponseRate(data) {
    // Base response rates by audience type
    const baseRates = {
      'Past Clients': 3.5,
      'Lookalike Prospects': 1.5,
      'Geographic Targeting': 1.0,
      'Interest-Based': 2.0,
      'Cold List': 0.5
    };

    let rate = baseRates[data.audience_type] || 1.0;

    // Adjust based on offer strength
    if (data.campaign_offer && data.campaign_offer.includes('$')) {
      rate += 0.5; // Monetary offers typically perform better
    }

    // Adjust based on format
    if (data.format_preference === 'Letter') {
      rate += 0.3; // Letters typically have higher response
    }

    return `${rate.toFixed(1)}% - ${(rate + 0.5).toFixed(1)}%`;
  }

  estimateROI(data) {
    const budget = parseInt(data.campaign_budget?.replace(/[^0-9]/g, '')) || 5000;
    const mailVolume = parseInt(data.mail_volume?.replace(/[^0-9]/g, '')) || 5000;
    const customerValue = parseInt(data.customer_value?.replace(/[^0-9]/g, '')) || 500;
    
    // Conservative estimate: 1% response rate, 20% conversion
    const expectedBookings = mailVolume * 0.01 * 0.2;
    const revenue = expectedBookings * customerValue;
    const roi = ((revenue - budget) / budget * 100).toFixed(0);
    
    return `${roi}% (${expectedBookings.toFixed(0)} bookings @ $${customerValue} each)`;
  }

  calculateBreakeven(data) {
    const budget = parseInt(data.campaign_budget?.replace(/[^0-9]/g, '')) || 5000;
    const customerValue = parseInt(data.customer_value?.replace(/[^0-9]/g, '')) || 500;
    
    const bookingsNeeded = Math.ceil(budget / customerValue);
    return `${bookingsNeeded} bookings`;
  }

  identifyQuickWins(data) {
    const quickWins = [];

    if (!data.campaign_offer?.includes('deadline')) {
      quickWins.push('Add urgency with a response deadline');
    }

    if (data.audience_type === 'Past Clients' && !data.personalization) {
      quickWins.push('Personalize with past travel history');
    }

    if (!data.tracking_methods?.includes('unique')) {
      quickWins.push('Use unique booking codes for tracking');
    }

    if (data.format_preference === 'Postcard' && data.value_proposition?.length > 100) {
      quickWins.push('Simplify message for postcard format');
    }

    return quickWins;
  }

  identifyPriorityActions(data) {
    const actions = [];

    if (!data.mailing_list || data.mailing_list === 'I need to purchase a targeted list') {
      actions.push({
        action: 'Secure quality mailing list',
        timeline: 'Immediately',
        importance: 'Critical'
      });
    }

    if (!data.design_assets || data.design_assets === 'None') {
      actions.push({
        action: 'Gather or create visual assets',
        timeline: 'Within 1 week',
        importance: 'High'
      });
    }

    if (!data.followup_plan) {
      actions.push({
        action: 'Develop follow-up system',
        timeline: 'Before mailing',
        importance: 'High'
      });
    }

    return actions;
  }

  getFallbackAnalysis(data) {
    return {
      strategicInsights: `Based on your consultation, here are key insights for your direct mail campaign:

**Campaign Strengths:**
- Clear target audience definition
- Specific travel specialty focus
- Defined budget and expectations

**Recommended Improvements:**
- Strengthen your offer with a clear deadline
- Add social proof (testimonials, reviews)
- Create urgency with limited availability

**Expected Performance:**
- Response Rate: 1-2% (typical for direct mail)
- Conversion Rate: 15-20% of responses
- ROI Timeline: 60-90 days post-mailing`,
      
      projections: {
        estimatedResponseRate: '1.0% - 2.0%',
        estimatedROI: '150% - 300%',
        breakEvenPoint: '10-15 bookings'
      }
    };
  }
}

// Export singleton instance
export const directMailAnalyzer = new DirectMailAnalyzer();