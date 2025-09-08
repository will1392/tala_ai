/**
 * DirectMailOrchestrator - Coordinates multi-agent direct mail strategy
 * Combines GPT-5 analysis with Claude Opus 4.1 copywriting
 */

import { directMailAnalyzer } from './DirectMailAnalyzer.js';
import { postcardCopywriter } from './PostcardCopywriter.js';
import { cmoKnowledgeBase } from '../../cmo/CMOKnowledgeBase.js';

class DirectMailOrchestrator {
  constructor() {
    this.analyzer = directMailAnalyzer;
    this.copywriter = postcardCopywriter;
  }

  /**
   * Process direct mail consultation through multi-agent system
   */
  async processConsultation(consultationData, brandId) {
    console.log('🎯 DirectMailOrchestrator: Starting multi-agent processing');
    
    try {
      // Step 1: Analyze consultation with GPT-5
      console.log('📊 Step 1: Analyzing consultation data with GPT-5...');
      const analysisResult = await this.analyzer.analyzeConsultation(consultationData.responses || consultationData);
      
      if (!analysisResult.success) {
        console.warn('⚠️ Analysis failed, using fallback');
      }
      
      // Step 2: Generate copy with Claude Opus 4.1
      console.log('✍️ Step 2: Generating copy with Claude Opus 4.1...');
      const copyResult = await this.copywriter.generateCopy(
        consultationData.responses || consultationData,
        analysisResult.analysis || analysisResult.fallbackAnalysis
      );
      
      if (!copyResult.success) {
        console.warn('⚠️ Copywriting failed, using fallback');
      }
      
      // Step 3: Retrieve foundational knowledge
      console.log('📚 Step 3: Retrieving foundational direct mail knowledge...');
      const foundationalKnowledge = await this.getFoundationalKnowledge();
      
      // Step 4: Compile comprehensive strategy
      console.log('🔧 Step 4: Compiling comprehensive strategy...');
      const strategy = this.compileStrategy(
        consultationData,
        analysisResult.analysis || analysisResult.fallbackAnalysis,
        copyResult.copy || copyResult.fallbackCopy,
        foundationalKnowledge
      );
      
      // Step 5: Format for Tala presentation
      console.log('📝 Step 5: Formatting for Tala presentation...');
      const talaMessage = this.formatForTala(strategy);
      
      console.log('✅ DirectMailOrchestrator: Processing complete');
      
      return {
        success: true,
        strategy: strategy,
        talaMessage: talaMessage,
        metadata: {
          processedAt: new Date().toISOString(),
          brandId: brandId,
          campaignName: consultationData.name || consultationData.campaignName,
          models: {
            analysis: 'gpt-5-2025-08-07',
            copywriting: 'claude-opus-4-20250514'
          }
        }
      };
      
    } catch (error) {
      console.error('❌ DirectMailOrchestrator: Processing failed', error);
      return {
        success: false,
        error: error.message,
        talaMessage: this.getFallbackMessage(consultationData)
      };
    }
  }

  async getFoundationalKnowledge() {
    try {
      // Search for direct mail best practices
      const searchResults = await cmoKnowledgeBase.search('direct mail marketing travel agency best practices ROI', {
        maxResults: 5,
        threshold: 0.7
      });
      
      if (searchResults.length > 0) {
        return searchResults.map(result => ({
          topic: result.metadata?.title || 'Best Practice',
          insight: result.content,
          relevance: result.score
        }));
      }
    } catch (error) {
      console.warn('Could not retrieve foundational knowledge:', error);
    }
    
    // Fallback foundational knowledge
    return [
      {
        topic: 'Response Rates',
        insight: 'Travel agency direct mail typically achieves 1-3% response rates, higher with past client lists.'
      },
      {
        topic: 'Timing',
        insight: 'Mail 60-90 days before peak booking seasons for best results.'
      },
      {
        topic: 'Personalization',
        insight: 'Personalized mail pieces see 30% higher response rates than generic mailings.'
      }
    ];
  }

  compileStrategy(consultation, analysis, copy, knowledge) {
    return {
      // Campaign Overview
      campaign: {
        name: consultation.name || consultation.campaignName,
        objective: consultation.responses?.primary_campaign_goal || 'Generate bookings',
        budget: consultation.responses?.campaign_budget,
        timeline: consultation.responses?.arrival_date,
        format: consultation.responses?.format_preference || 'Postcard'
      },
      
      // Strategic Analysis (from GPT-5)
      analysis: {
        strengths: this.extractStrengths(analysis),
        opportunities: this.extractOpportunities(analysis),
        risks: this.extractRisks(analysis),
        projections: analysis.projections || {
          responseRate: '1-2%',
          roi: '200%',
          breakeven: '10 bookings'
        },
        recommendations: analysis.priorityActions || []
      },
      
      // Creative Copy (from Claude Opus 4.1)
      creative: {
        headlines: copy.headlines || [],
        primaryMessage: copy.bodyCopy,
        offer: copy.offer,
        callToAction: copy.callsToAction,
        testimonial: copy.testimonial,
        guarantee: copy.guarantee,
        versions: copy.versions || []
      },
      
      // Implementation Guide
      implementation: {
        immediateActions: this.getImmediateActions(consultation, analysis),
        timeline: this.createTimeline(consultation),
        checklist: this.createChecklist(consultation),
        vendors: this.recommendVendors(consultation)
      },
      
      // Foundational Best Practices
      bestPractices: knowledge,
      
      // Success Metrics
      metrics: {
        tracking: consultation.responses?.tracking_methods,
        kpis: [
          'Response Rate',
          'Cost Per Response',
          'Conversion Rate',
          'Revenue Per Booking',
          'ROI'
        ],
        reportingSchedule: 'Weekly for first month, then monthly'
      }
    };
  }

  formatForTala(strategy) {
    return `# Direct Mail Campaign Strategy Report

## Campaign: ${strategy.campaign.name}

I've coordinated our specialized AI agents to create a comprehensive direct mail strategy for your travel agency. Here's your complete campaign blueprint:

### 📊 Strategic Analysis (Powered by GPT-5)

**Campaign Strengths:**
${strategy.analysis.strengths.map(s => `• ${s}`).join('\n')}

**Opportunities to Maximize:**
${strategy.analysis.opportunities.map(o => `• ${o}`).join('\n')}

**Performance Projections:**
• Expected Response Rate: ${strategy.analysis.projections.responseRate}
• Projected ROI: ${strategy.analysis.projections.roi}
• Break-even Point: ${strategy.analysis.projections.breakeven}

### ✍️ Campaign Copy (Created by Claude Opus 4.1)

**Recommended Headlines:**
${strategy.creative.headlines.map((h, i) => `${i + 1}. "${h}"`).join('\n')}

**Core Message:**
${strategy.creative.primaryMessage}

**Irresistible Offer:**
${strategy.creative.offer}

**Call to Action:**
Primary: ${strategy.creative.callToAction.primary}
Secondary: ${strategy.creative.callToAction.secondary}

**Social Proof:**
${strategy.creative.testimonial}

### 🎯 Implementation Roadmap

**Immediate Actions (This Week):**
${strategy.implementation.immediateActions.map(a => `□ ${a}`).join('\n')}

**Campaign Timeline:**
${strategy.implementation.timeline.map(t => `• ${t.phase}: ${t.timing}`).join('\n')}

### 💡 Foundational Best Practices

Based on our knowledge base of successful travel agency campaigns:
${strategy.bestPractices.map(bp => `\n**${bp.topic}:**\n${bp.insight}`).join('\n')}

### 📈 Success Tracking

**Key Metrics to Monitor:**
${strategy.metrics.kpis.map(kpi => `• ${kpi}`).join('\n')}

**Tracking Methods:**
${strategy.metrics.tracking || 'Unique booking codes, dedicated phone line, custom landing page'}

### 🚀 Next Steps

1. **Review and Approve Copy:** Choose your preferred headline and review the complete copy
2. **Secure Your List:** ${strategy.campaign.format === 'Postcard' ? 'Finalize your mailing list selection' : 'Clean and segment your mailing list'}
3. **Design Production:** Work with a designer to bring the copy to life
4. **Schedule Mailing:** Lock in your mail date to hit your target arrival time

Would you like me to:
- Refine any specific copy element?
- Adjust the strategy based on new information?
- Create alternative versions for A/B testing?
- Provide vendor recommendations for design and printing?

*This comprehensive strategy combines cutting-edge AI analysis with proven direct mail expertise to maximize your campaign's success.*`;
  }

  extractStrengths(analysis) {
    const strengths = [];
    const text = analysis.strategicInsights || '';
    
    if (text.includes('clear target')) strengths.push('Well-defined target audience');
    if (text.includes('compelling offer')) strengths.push('Strong value proposition');
    if (text.includes('experience')) strengths.push('Leveraging travel expertise effectively');
    if (text.includes('budget')) strengths.push('Appropriate budget for goals');
    
    return strengths.length > 0 ? strengths : ['Clear campaign objectives', 'Defined target market'];
  }

  extractOpportunities(analysis) {
    const opportunities = [];
    const text = analysis.strategicInsights || '';
    
    if (text.includes('personalization')) opportunities.push('Add personalization for higher response');
    if (text.includes('urgency')) opportunities.push('Create urgency with limited-time offers');
    if (text.includes('social proof')) opportunities.push('Include testimonials and reviews');
    if (text.includes('follow-up')) opportunities.push('Implement multi-touch follow-up');
    
    return opportunities.length > 0 ? opportunities : ['Test multiple headlines', 'Add urgency elements'];
  }

  extractRisks(analysis) {
    const risks = [];
    if (analysis.quickWins) {
      analysis.quickWins.forEach(win => {
        if (win.includes('deadline')) risks.push('Lack of urgency in current offer');
        if (win.includes('tracking')) risks.push('Insufficient response tracking');
      });
    }
    return risks.length > 0 ? risks : ['Generic messaging', 'Poor list quality'];
  }

  getImmediateActions(consultation, analysis) {
    const actions = [];
    const responses = consultation.responses || consultation;
    
    if (!responses.mailing_list || responses.mailing_list.includes('need')) {
      actions.push('Research and select mailing list provider');
    }
    if (!responses.design_assets) {
      actions.push('Gather high-quality destination images');
    }
    actions.push('Finalize copy and offer details');
    actions.push('Set up tracking systems (phone, web, codes)');
    
    return actions;
  }

  createTimeline(consultation) {
    const arrivalDate = consultation.responses?.arrival_date;
    const timeline = [
      { phase: 'Week 1', timing: 'Finalize copy and design concept' },
      { phase: 'Week 2', timing: 'Design production and revisions' },
      { phase: 'Week 3', timing: 'Print production and list processing' },
      { phase: 'Week 4', timing: 'Mail house processing and drop' },
      { phase: 'Week 5-6', timing: 'In-home delivery window' },
      { phase: 'Week 6-10', timing: 'Peak response period' }
    ];
    return timeline;
  }

  createChecklist(consultation) {
    return [
      'Copy approved and proofread',
      'Design approved (front and back)',
      'Mailing list cleaned and formatted',
      'Merge fields tested',
      'Postal permits verified',
      'Tracking systems active',
      'Staff briefed on campaign',
      'Follow-up sequences ready'
    ];
  }

  recommendVendors(consultation) {
    return {
      design: 'Local creative agencies or Canva Pro for DIY',
      printing: 'Local print shops for small runs, online for volume',
      lists: 'InfoUSA, Melissa Data, or your postal service',
      mailing: 'Local mail houses or DIY with USPS'
    };
  }

  getFallbackMessage(consultation) {
    return `I'll analyze your direct mail campaign consultation and provide strategic recommendations. 

Based on your input, I'll create a comprehensive plan including strategic analysis, compelling copy, and implementation guidelines.

Please allow me a moment to process your consultation data through our specialized AI systems...`;
  }

  /**
   * Generate postcard-specific analysis for multiple sizes
   */
  async generatePostcardAnalysis(consultationData, sizes = ['4x6', '6x9', '6x11']) {
    console.log('📐 DirectMailOrchestrator: Generating postcard analysis for sizes:', sizes);
    
    try {
      // First, get base analysis
      const analysisResult = await this.analyzer.analyzeConsultation(consultationData.responses || consultationData);
      
      // Generate size-specific copy and recommendations
      const analyses = [];
      
      for (const size of sizes) {
        console.log(`📏 Generating analysis for ${size} postcard...`);
        
        const sizeAnalysis = await this.generateSizeSpecificAnalysis(
          size,
          consultationData.responses || consultationData,
          analysisResult.analysis || analysisResult.fallbackAnalysis
        );
        
        analyses.push(sizeAnalysis);
      }
      
      return {
        campaignId: consultationData.id || consultationData.campaignId,
        campaignName: consultationData.name || consultationData.campaignName || 'Direct Mail Campaign',
        analyses,
        metadata: {
          generatedAt: new Date().toISOString(),
          models: {
            analysis: 'gpt-4o-mini',
            copywriting: 'gpt-4o-mini'
          }
        }
      };
      
    } catch (error) {
      console.error('❌ DirectMailOrchestrator: Postcard analysis failed', error);
      throw error;
    }
  }

  async generateSizeSpecificAnalysis(size, consultationData, baseAnalysis) {
    const sizeSpecs = {
      '4x6': {
        wordCount: { headline: 8, body: 50 },
        layout: 'compact',
        imageSpace: '40%',
        printSpecs: {
          bleed: '0.125"',
          safeZone: '0.25"',
          resolution: '300 DPI'
        }
      },
      '6x9': {
        wordCount: { headline: 12, body: 100 },
        layout: 'balanced',
        imageSpace: '50%',
        printSpecs: {
          bleed: '0.125"',
          safeZone: '0.375"',
          resolution: '300 DPI'
        }
      },
      '6x11': {
        wordCount: { headline: 15, body: 150 },
        layout: 'expansive',
        imageSpace: '60%',
        printSpecs: {
          bleed: '0.125"',
          safeZone: '0.5"',
          resolution: '300 DPI'
        }
      }
    };

    const specs = sizeSpecs[size];
    
    // Generate size-specific copy
    const copyPrompt = `
Create postcard copy for a ${size} postcard with these constraints:
- Headline: Maximum ${specs.wordCount.headline} words
- Body: Maximum ${specs.wordCount.body} words
- Layout: ${specs.layout} (${specs.imageSpace} for images)

Campaign details:
${JSON.stringify(consultationData, null, 2)}

Provide:
1. Headline
2. Subheadline
3. Body copy
4. Offer text
5. Primary and secondary CTAs
`;

    const copyResult = await this.copywriter.generateCopy(
      { ...consultationData, format_preference: `${size} Postcard` },
      baseAnalysis
    );

    // Generate visual recommendations
    const visualRecommendations = this.getVisualRecommendations(size, consultationData);
    const colorPalette = this.getColorPalette(consultationData);
    const layoutNotes = this.getLayoutNotes(size, consultationData);

    return {
      size,
      headline: copyResult.copy?.headlines?.[0] || this.getFallbackHeadline(consultationData),
      subheadline: copyResult.copy?.subheadline || this.getFallbackSubheadline(consultationData),
      bodyCopy: this.adjustCopyForSize(
        copyResult.copy?.bodyCopy || 
        copyResult.fallbackCopy?.bodyCopy || 
        this.getFallbackBodyCopy(consultationData, specs.wordCount.body), 
        specs.wordCount.body
      ),
      offer: copyResult.copy?.offer || consultationData.campaign_offer || 'Special offer for valued clients',
      callToAction: {
        primary: copyResult.copy?.callsToAction?.primary || 'Call Today',
        secondary: copyResult.copy?.callsToAction?.secondary || 'Visit Our Website'
      },
      imageRecommendations: visualRecommendations,
      colorPalette: colorPalette,
      layoutNotes: layoutNotes,
      printSpecs: specs.printSpecs
    };
  }

  getVisualRecommendations(size, data) {
    const baseRecommendations = [
      `Hero image of ${data.featured_destinations || 'stunning destination'}`,
      'Professional headshot or team photo for trust',
      'Small destination thumbnails as accent images'
    ];

    if (size === '4x6') {
      return [
        'Single impactful hero image covering 40% of front',
        'Keep visuals simple and uncluttered',
        'Use high contrast for small text readability'
      ];
    } else if (size === '6x9') {
      return [
        ...baseRecommendations,
        'Map or route visual to show journey',
        'Customer testimonial with photo if space allows'
      ];
    } else { // 6x11
      return [
        ...baseRecommendations,
        'Multiple destination photos in grid layout',
        'Infographic showing value/savings',
        'QR code for easy digital connection',
        'Award badges or certifications'
      ];
    }
  }

  getColorPalette(data) {
    // Base colors on travel type
    if (data.travel_specialty?.includes('luxury') || data.travel_specialty?.includes('Luxury')) {
      return ['#1e3a8a', '#fbbf24', '#ffffff', '#1f2937', '#dbbf94'];
    } else if (data.travel_specialty?.includes('adventure')) {
      return ['#059669', '#f97316', '#ffffff', '#1f2937', '#fde047'];
    } else if (data.travel_specialty?.includes('cruise')) {
      return ['#0891b2', '#1e40af', '#ffffff', '#f0f9ff', '#fbbf24'];
    } else {
      return ['#1e40af', '#dc2626', '#ffffff', '#1f2937', '#fbbf24'];
    }
  }

  getLayoutNotes(size, data) {
    const format = data.format_preference || 'standard';
    
    if (size === '4x6') {
      return 'Keep design simple with clear hierarchy. Front: hero image with headline overlay. Back: offer prominently displayed, brief copy, clear CTA. Use larger fonts (min 10pt).';
    } else if (size === '6x9') {
      return 'Balanced layout with 50/50 image-to-text ratio. Front: compelling visual with headline. Back: structured sections for offer, benefits, testimonial, and CTA. Good size for detailed information.';
    } else { // 6x11
      return 'Maximize visual impact with 60% imagery. Front: multi-image collage or stunning panoramic. Back: magazine-style layout with columns, multiple offers, detailed copy, and clear response mechanisms. Include map to office if local.';
    }
  }

  adjustCopyForSize(copy, maxWords) {
    const words = copy.split(' ');
    if (words.length <= maxWords) return copy;
    
    // Intelligently truncate to max words
    const truncated = words.slice(0, maxWords - 3).join(' ');
    return truncated + '...';
  }

  getFallbackHeadline(data) {
    const destination = data.featured_destinations || 'Dream Destinations';
    return `Your ${destination} Awaits`;
  }

  getFallbackSubheadline(data) {
    return `Expert planning. Exclusive perks. Unforgettable memories.`;
  }

  getFallbackBodyCopy(data, maxWords) {
    const specialty = data.travel_specialty || 'travel';
    const offer = data.campaign_offer || 'exclusive savings';
    const idealClient = data.ideal_client || 'discerning travelers';
    
    const fullBody = `Imagine yourself ${specialty.includes('Cruise') ? 'on the deck of a luxury ship' : 'exploring breathtaking destinations'}, every detail perfectly arranged by your personal travel expert. As ${idealClient}, you deserve more than online booking sites can offer. Our expertise, insider connections, and personalized service ensure you experience the trip of your dreams while enjoying ${offer}. Don't let another season pass without the journey you've been planning. Your adventure begins with one simple call.`;
    
    return this.adjustCopyForSize(fullBody, maxWords);
  }
}

// Export singleton instance
export const directMailOrchestrator = new DirectMailOrchestrator();