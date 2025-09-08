/**
 * PostcardCopywriter - Claude Opus 4.1 powered agent for creating compelling direct mail copy
 * Specializes in travel industry postcard and mail piece copywriting
 */

import LLMRouter from '../../llm/LLMRouter.js';

class PostcardCopywriter {
  constructor() {
    this.model = 'gpt-4o-mini'; // Using GPT-4o mini for reliable copywriting
    this.llmRouter = new LLMRouter({
      enableLogging: true,
      costOptimization: true
    });
  }

  /**
   * Generate compelling copy for direct mail pieces
   */
  async generateCopy(consultationData, analysisResults) {
    console.log('✍️ PostcardCopywriter: Starting copy generation with GPT-4o mini');
    
    try {
      const copyPrompts = this.buildCopyPrompts(consultationData, analysisResults);
      const copyResults = {};

      // Generate different copy elements
      for (const [element, prompt] of Object.entries(copyPrompts)) {
        // Get copy using LLMRouter
        const response = await this.llmRouter.routeQuery(
          prompt,
          {
            userId: 'postcard-copywriter',
            mode: 'copywriting',
            preferredModel: 'gpt-4o-mini'
          },
          {
            temperature: 0.8,
            maxTokens: 1000,
            systemPrompt: `You are an expert direct mail copywriter specializing in the travel industry. 
              You create compelling, conversion-focused copy that drives immediate action.
              Your writing style is engaging, benefit-driven, and creates urgency without being pushy.
              You understand the psychology of luxury travel buyers and how to appeal to their desires.`
          }
        );

        copyResults[element] = response.result?.response || response.content;
        console.log(`✅ Generated ${element} copy:`, 
          element === 'bodyCopy' ? 
            (copyResults[element] ? `${copyResults[element].substring(0, 100)}...` : 'EMPTY') : 
            'Generated'
        );
      }

      console.log('✅ PostcardCopywriter: All copy elements generated');
      
      return {
        success: true,
        copy: this.structureCopyResults(copyResults, consultationData)
      };

    } catch (error) {
      console.error('❌ PostcardCopywriter: Copy generation failed', error);
      return {
        success: false,
        error: error.message,
        fallbackCopy: this.getFallbackCopy(consultationData)
      };
    }
  }

  buildCopyPrompts(data, analysis) {
    const format = data.format_preference || 'Postcard';
    const baseContext = `
Travel Agency: ${data.business_name || 'Premier Travel Agency'}
Specialty: ${data.travel_specialty}
Target Audience: ${data.ideal_client}
Unique Offer: ${data.campaign_offer}
Value Proposition: ${data.value_proposition}
Featured Destinations: ${data.featured_destinations}
Budget Range: ${data.campaign_budget}
Customer Value: ${data.customer_value}

Key Insights from Analysis:
${analysis?.strategicInsights ? this.extractKeyInsights(analysis.strategicInsights) : 'Focus on expertise and personal service'}
`;

    const prompts = {
      headline: `${baseContext}

Create 3 compelling headline options for a ${format.toLowerCase()} targeting travel buyers.
Requirements:
- Maximum 10 words
- Include a benefit or outcome
- Create curiosity or urgency
- Speak directly to the target audience's desires

Format as:
Option 1: [headline]
Option 2: [headline]
Option 3: [headline]`,

      subheadline: `${baseContext}

Write a compelling subheadline for a ${format.toLowerCase()} that:
Requirements:
- Maximum 20 words
- Expand on the main benefit
- Add credibility or specificity
- Include emotional appeal
- Complement the headline options above`,

      bodyCopy: `${baseContext}

Write compelling body copy for a ${format.toLowerCase()}.
Requirements:
- ${format === 'Postcard' ? '75-100 words' : '150-200 words'}
- Focus on benefits, not features
- Address common objections: ${data.common_objections}
- Include social proof if possible
- Create urgency
- Use "you" language
- Paint a picture of the experience`,

      offer: `${baseContext}

Rewrite this offer to be more compelling: "${data.campaign_offer}"
Requirements:
- Make it specific and valuable
- Add urgency (deadline, limited availability)
- Easy to understand
- Include any restrictions clearly
- Format for easy scanning`,

      callToAction: `${baseContext}

Create 3 strong call-to-action options.
Requirements:
- Action-oriented (use strong verbs)
- Create urgency
- Specific next step
- Include contact method
- Maximum 8 words each

Format as:
Primary CTA: [call to action]
Secondary CTA: [call to action]
Soft CTA: [call to action]`,

      testimonial: `${baseContext}

Write a compelling testimonial that would resonate with the target audience.
Requirements:
- 30-50 words
- Specific destination or experience
- Include emotional outcome
- Believable and authentic
- Mentions the agency's expertise
- Sign with realistic name and location`,

      guarantee: `${baseContext}

Write a risk-reversal guarantee that addresses the main objection: "${data.common_objections}"
Requirements:
- Clear and specific
- Builds confidence
- Easy to understand
- Maximum 30 words`,

      postscript: `${baseContext}

Write a powerful P.S. for the ${format.toLowerCase()}.
Requirements:
- Restate the offer OR add urgency OR provide additional benefit
- Maximum 20 words
- Start with "P.S."
- Drive action`
    };

    // Adjust prompts based on format
    if (format === 'Postcard') {
      prompts.frontDesign = `${baseContext}

Describe the visual concept for the postcard front that would appeal to ${data.ideal_client}.
Include:
- Main image theme
- Color palette
- Emotional tone
- Text overlay (if any)
- How it relates to ${data.featured_destinations}`;

      prompts.backLayout = `${baseContext}

Create a layout description for the postcard back:
- Headline placement
- Body copy arrangement
- Offer callout box
- Contact information placement
- White space usage
- Visual hierarchy`;
    }

    return prompts;
  }

  structureCopyResults(rawCopy, consultationData) {
    // Parse and structure the copy results
    const structured = {
      format: consultationData.format_preference || 'Postcard',
      campaignName: consultationData.campaignName,
      generatedDate: new Date().toISOString(),
      model: this.model,
      
      // Headlines (parse the options)
      headlines: this.parseHeadlineOptions(rawCopy.headline),
      
      // Core copy elements
      subheadline: rawCopy.subheadline,
      bodyCopy: rawCopy.bodyCopy || this.getFallbackCopy(consultationData).bodyCopy,
      offer: rawCopy.offer,
      guarantee: rawCopy.guarantee,
      testimonial: rawCopy.testimonial,
      postscript: rawCopy.postscript,
      
      // CTAs (parse the options)
      callsToAction: this.parseCTAOptions(rawCopy.callToAction),
      
      // Visual elements (if postcard)
      visuals: {
        frontDesign: rawCopy.frontDesign,
        backLayout: rawCopy.backLayout
      },
      
      // Complete versions
      versions: this.createCompleteVersions(rawCopy, consultationData)
    };

    return structured;
  }

  parseHeadlineOptions(headlineText) {
    const options = [];
    const lines = headlineText.split('\n');
    
    lines.forEach(line => {
      const match = line.match(/Option \d+:\s*(.+)/);
      if (match) {
        options.push(match[1].trim());
      }
    });
    
    return options.length > 0 ? options : [headlineText.trim()];
  }

  parseCTAOptions(ctaText) {
    const ctas = {};
    const lines = ctaText.split('\n');
    
    lines.forEach(line => {
      if (line.includes('Primary CTA:')) {
        ctas.primary = line.split(':')[1].trim();
      } else if (line.includes('Secondary CTA:')) {
        ctas.secondary = line.split(':')[1].trim();
      } else if (line.includes('Soft CTA:')) {
        ctas.soft = line.split(':')[1].trim();
      }
    });
    
    return ctas;
  }

  createCompleteVersions(rawCopy, data) {
    // Create 3 complete versions using different headlines
    const headlines = this.parseHeadlineOptions(rawCopy.headline);
    const versions = [];

    headlines.forEach((headline, index) => {
      versions.push({
        version: `Version ${index + 1}`,
        headline: headline,
        complete: `${headline}

${rawCopy.subheadline}

${rawCopy.bodyCopy}

${rawCopy.offer}

"${rawCopy.testimonial}"

${rawCopy.guarantee}

${this.parseCTAOptions(rawCopy.callToAction).primary || 'Book Your Dream Trip Today!'}

${rawCopy.postscript}`
      });
    });

    return versions;
  }

  extractKeyInsights(analysisText) {
    // Extract key points from the analysis to inform copywriting
    const insights = [];
    
    if (analysisText.includes('luxury')) {
      insights.push('Emphasize exclusivity and premium experiences');
    }
    if (analysisText.includes('value')) {
      insights.push('Highlight value and ROI of using a travel agent');
    }
    if (analysisText.includes('expertise')) {
      insights.push('Showcase deep destination knowledge');
    }
    
    return insights.join('\n');
  }

  getFallbackCopy(data) {
    const destination = data.featured_destinations || 'dream destinations';
    const offer = data.campaign_offer || 'exclusive savings';
    
    return {
      headlines: [
        `Your ${destination} Awaits`,
        `Exclusive ${destination} Offers Inside`,
        `Save on ${destination} - Limited Time`
      ],
      subheadline: `Discover extraordinary journeys with expert planning and ${offer}`,
      bodyCopy: `Imagine stepping onto the deck of a luxury river cruise ship, watching castles drift by as you sip champagne. Or picture yourself on a pristine beach, every detail handled by your personal travel expert. This isn't just a vacation—it's the trip you've been dreaming about, planned perfectly and priced better than you'd find online.`,
      offer: `Book by [DATE] and receive ${offer}. Plus, enjoy our exclusive perks and upgrades available only through our agency. Limited availability.`,
      callsToAction: {
        primary: 'Call Now to Book Your Journey',
        secondary: 'Schedule Your Free Consultation',
        soft: 'Visit Our Website for More'
      },
      guarantee: `Your perfect trip is guaranteed, or we'll work with you until it is.`,
      testimonial: `"They handled every detail of our European river cruise perfectly. We'll never book travel any other way!" - Sarah M., Chicago`,
      postscript: `P.S. These special rates expire [DATE]. Don't miss out!`
    };
  }
}

// Export singleton instance
export const postcardCopywriter = new PostcardCopywriter();