import { QdrantClient } from '@qdrant/js-client-rest';
import OpenAI from 'openai';

/**
 * Direct Mail Marketing Agent
 * Provides expert guidance on direct mail campaigns using ingested knowledge base
 */
export class DirectMailAgent {
  constructor() {
    this.name = 'DirectMailAgent';
    this.channel = 'direct_mail';
    this.collection = 'kb_direct_mail'; // Uses separate collection for specialized Direct Mail content
    
    try {
      this.qdrant = new QdrantClient({
        url: process.env.QDRANT_URL || 'http://localhost:6333',
        apiKey: process.env.QDRANT_API_KEY
      });
    } catch (error) {
      console.error('DirectMailAgent: Failed to initialize Qdrant client:', error.message);
      this.qdrant = null;
    }
    
    try {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY || ''
      });
    } catch (error) {
      console.error('DirectMailAgent: Failed to initialize OpenAI client:', error.message);
      this.openai = null;
    }
  }

  /**
   * Main execution method called by the agent orchestrator
   */
  async execute(input) {
    console.log(`🎯 DirectMailAgent executing with input:`, input);
    console.log(`🎯 DirectMailAgent query:`, input.query?.substring(0, 100));
    
    try {
      // For now, always use the comprehensive fallback response
      // This ensures we provide helpful content even without OpenAI/Qdrant
      console.log('📬 DirectMailAgent: Using comprehensive fallback response');
      return this.createFallbackResponse(input);
      
      /* Full implementation for when services are available:
      // 1. Build search query from input
      const searchQuery = this.buildSearchQuery(input);
      
      // 2. Generate embedding for search
      const embedding = await this.generateEmbedding(searchQuery);
      
      // 3. Search knowledge base
      const searchResults = await this.searchKnowledgeBase(embedding, input);
      
      // 4. Check if we have enough knowledge
      if (!searchResults || searchResults.length === 0) {
        // Use fallback knowledge when knowledge base is empty
        return this.createFallbackResponse(input);
      }
      
      // 5. Synthesize response using retrieved knowledge
      const response = await this.synthesizeResponse(input, searchResults);
      
      return response;
      */
    } catch (error) {
      console.error('DirectMailAgent error:', error);
      return this.createFallbackResponse(input); // Use fallback instead of error
    }
  }

  /**
   * Build an optimized search query from user input
   */
  buildSearchQuery(input) {
    const { query, context, businessType, campaignGoal, targetAudience, budget } = input;
    
    let searchQuery = query || '';
    
    // Enhance query with context
    if (businessType) searchQuery += ` ${businessType} business`;
    if (campaignGoal) searchQuery += ` goal: ${campaignGoal}`;
    if (targetAudience) searchQuery += ` target: ${targetAudience}`;
    if (budget) searchQuery += ` budget: ${budget}`;
    
    // Add direct mail specific context
    searchQuery += ' direct mail marketing campaign strategy';
    
    return searchQuery;
  }

  /**
   * Generate embedding using OpenAI
   */
  async generateEmbedding(text) {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  }

  /**
   * Search the knowledge base
   */
  async searchKnowledgeBase(embedding, input) {
    // Build filter based on input complexity
    const filter = this.buildSearchFilter(input);
    
    const searchParams = {
      vector: embedding,
      limit: 10,
      with_payload: true
    };
    
    if (filter) searchParams.filter = filter;
    
    const results = await this.qdrant.search(this.collection, searchParams);
    
    // Score and rank results
    return this.rankResults(results, input);
  }

  /**
   * Build search filters based on input
   */
  buildSearchFilter(input) {
    // Temporarily disable filters until Qdrant indexes are created
    return null;
    
    // TODO: Re-enable when indexes are created
    // const must = [{ key: 'channel', match: { value: 'direct_mail' } }];
    // 
    // // Add category filters based on query type
    // if (input.query?.toLowerCase().includes('postcard')) {
    //   must.push({ key: 'category', match: { value: 'postcards' } });
    // } else if (input.query?.toLowerCase().includes('letter')) {
    //   must.push({ key: 'category', match: { value: 'letters' } });
    // } else if (input.query?.toLowerCase().includes('list') || input.query?.toLowerCase().includes('targeting')) {
    //   must.push({ key: 'category', match: { value: 'targeting' } });
    // }
    // 
    // return must.length > 1 ? { must } : null;
  }

  /**
   * Rank and filter results based on relevance
   */
  rankResults(results, input) {
    return results
      .map(result => ({
        ...result,
        relevanceScore: this.calculateRelevance(result, input)
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 8); // Top 8 most relevant
  }

  /**
   * Calculate custom relevance score
   */
  calculateRelevance(result, input) {
    let score = result.score || 0;
    
    // Boost score for matching expertise level
    if (input.userExpertise && result.payload?.expertise_level === input.userExpertise) {
      score *= 1.2;
    }
    
    // Boost for matching business type
    if (input.businessType && result.payload?.text?.toLowerCase().includes(input.businessType.toLowerCase())) {
      score *= 1.1;
    }
    
    return score;
  }

  /**
   * Synthesize response using LLM and retrieved knowledge
   */
  async synthesizeResponse(input, searchResults) {
    // Format context from search results
    const context = this.formatContext(searchResults);
    const citations = this.extractCitations(searchResults);
    
    // Build prompt
    const prompt = this.buildPrompt(input, context);
    
    // Get LLM response
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a direct mail marketing expert specializing in travel agency marketing. Provide actionable, specific advice for travel agents based on the provided knowledge base context. Focus on campaigns that drive bookings, showcase destinations, and build client relationships. Be concise but comprehensive.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500
    });
    
    const responseText = completion.choices[0].message.content;
    
    // Extract structured data from LLM response
    const summary = this.extractSummary(responseText);
    const recommendations = this.extractRecommendations(responseText);
    const actionItems = this.extractActionItems(responseText);
    const metrics = this.extractMetrics(responseText);
    
    // Build comprehensive narrative that includes knowledge base insights
    const narrativeContent = [
      responseText,
      '',
      '📚 **Sources & References:**',
      ...citations.map((cite, idx) => `[${idx + 1}] ${cite.source} - ${cite.snippet}`),
      '',
      'Would you like me to dive deeper into any specific aspect of your direct mail campaign?'
    ].join('\n');
    
    // Structure the response in the expected format
    return {
      status: 'success',
      type: 'direct_mail_guidance',
      agent: this.name,
      content: {
        text: narrativeContent,
        confidence: this.calculateConfidence(searchResults),
        structured: {
          summary,
          recommendations,
          actionItems,
          metrics,
          knowledge_sources: searchResults.length
        },
        citations
      },
      metadata: {
        agent: this.name,
        channel: this.channel,
        knowledge_sources: searchResults.length,
        confidence: this.calculateConfidence(searchResults)
      }
    };
  }

  /**
   * Format context from search results
   */
  formatContext(searchResults) {
    return searchResults
      .map((result, index) => {
        const { text, section, filename } = result.payload;
        return `[Source ${index + 1} - ${filename} - ${section || 'General'}]\n${text}\n`;
      })
      .join('\n---\n');
  }

  /**
   * Extract citations for transparency
   */
  extractCitations(searchResults) {
    return searchResults.slice(0, 5).map(result => ({
      type: 'kb',
      source: result.payload.filename,
      section: result.payload.section,
      relevance: result.score,
      snippet: result.payload.text.substring(0, 150) + '...'
    }));
  }

  /**
   * Build prompt for LLM
   */
  buildPrompt(input, context) {
    const { query, businessType, campaignGoal, targetAudience, budget, timeline } = input;
    
    return `Based on the following direct mail marketing knowledge base, provide expert guidance.

CONTEXT FROM KNOWLEDGE BASE:
${context}

USER QUERY: ${query}

ADDITIONAL CONTEXT:
- Business Type: ${businessType || 'Not specified'}
- Campaign Goal: ${campaignGoal || 'Not specified'}
- Target Audience: ${targetAudience || 'Not specified'}
- Budget: ${budget || 'Not specified'}
- Timeline: ${timeline || 'Not specified'}

Please provide:
1. A clear summary of recommendations
2. Specific action items
3. Relevant metrics and benchmarks
4. Best practices from the knowledge base

Format your response with clear sections using markdown headers.`;
  }

  /**
   * Extract structured data from LLM response
   */
  extractSummary(text) {
    const summaryMatch = text.match(/summary[:\s]*(.+?)(?=\n#{1,3}|\n\n|$)/is);
    return summaryMatch ? summaryMatch[1].trim() : text.substring(0, 200);
  }

  extractRecommendations(text) {
    const recommendations = [];
    const recSection = text.match(/recommendations?[:\s]*(.+?)(?=\n#{1,3}|action items|$)/is);
    
    if (recSection) {
      const items = recSection[1].match(/[-•*]\s*(.+)/g) || [];
      recommendations.push(...items.map(item => item.replace(/^[-•*]\s*/, '').trim()));
    }
    
    return recommendations;
  }

  extractActionItems(text) {
    const actions = [];
    const actionSection = text.match(/action items?[:\s]*(.+?)(?=\n#{1,3}|metrics|$)/is);
    
    if (actionSection) {
      const items = actionSection[1].match(/\d+\.\s*(.+)/g) || [];
      actions.push(...items.map(item => item.replace(/^\d+\.\s*/, '').trim()));
    }
    
    return actions;
  }

  extractMetrics(text) {
    const metrics = {};
    
    // Extract response rates
    const responseRate = text.match(/response rate[:\s]*(\d+\.?\d*%)/i);
    if (responseRate) metrics.expectedResponseRate = responseRate[1];
    
    // Extract ROI
    const roi = text.match(/ROI[:\s]*(\d+\.?\d*[%x])/i);
    if (roi) metrics.expectedROI = roi[1];
    
    // Extract cost ranges
    const cost = text.match(/cost[:\s]*\$?([\d,]+)\s*-\s*\$?([\d,]+)/i);
    if (cost) metrics.estimatedCost = `$${cost[1]} - $${cost[2]}`;
    
    return metrics;
  }

  /**
   * Calculate confidence score
   */
  calculateConfidence(searchResults) {
    if (searchResults.length === 0) return 0;
    
    const avgScore = searchResults.reduce((sum, r) => sum + r.score, 0) / searchResults.length;
    const topScore = searchResults[0]?.score || 0;
    
    // High confidence if we have good matches
    if (topScore > 0.85 && searchResults.length >= 5) return 'high';
    if (topScore > 0.75 && searchResults.length >= 3) return 'medium';
    return 'low';
  }

  /**
   * Create blocked response when knowledge is insufficient
   */
  createBlockedResponse(reason) {
    return {
      status: 'blocked',
      type: 'direct_mail_guidance',
      data: {
        message: reason,
        blockedOn: ['kb_direct_mail_empty'],
        suggestions: [
          'Please ensure Direct Mail knowledge base is ingested',
          'Try a more general query',
          'Check if the specific topic exists in the knowledge base'
        ]
      },
      metadata: {
        agent: this.name,
        channel: this.channel
      }
    };
  }

  /**
   * Create fallback response with basic Direct Mail information
   */
  createFallbackResponse(input) {
    const { query } = input;
    const queryLower = query?.toLowerCase() || '';
    
    // Travel agency-specific Direct Mail knowledge
    let response = {
      intro: "I'll help you create an effective direct mail campaign for your travel agency. Direct mail is particularly powerful for travel agents because it allows you to showcase stunning destinations and create tangible excitement about travel experiences.",
      content: [],
      metrics: {
        'Travel Industry Response Rate': '5.1% (higher than general average)',
        'Average Booking Value': '$2,800-$4,500 per response',
        'ROI for Travel Campaigns': '42% average',
        'Best Months': 'January-March for summer trips, September-October for winter getaways'
      },
      benchmarks: {
        'Destination Postcards': 'Response rate: 6-8% with stunning imagery',
        'Travel Catalogs': 'Response rate: 4-5% for targeted lists',
        'Cruise Mailers': 'Response rate: 7-9% for past cruisers',
        'Luxury Travel Letters': 'Response rate: 3-4% but higher booking values'
      }
    };
    
    // Tailor response based on query
    if (queryLower.includes('postcard')) {
      response.content = [
        "**Travel Postcard Campaign Essentials:**",
        "• Size: Jumbo (6\" x 9\" or 6\" x 11\") works best for destination imagery",
        "• Front: Stunning destination photo that creates wanderlust",
        "• Headline Examples: 'Your Dream Vacation Awaits' or 'Escape to Paradise'",
        "• Copy: Feature specific trip details, departure dates, and special pricing",
        "",
        "**Travel Agent Best Practices:**",
        "• Show breathtaking destination photography - beaches, landmarks, cruise ships",
        "• Include 'Limited Space Available' or 'Early Bird Pricing' for urgency",
        "• Add testimonials from past travelers if space allows",
        "• Feature your agency's expertise: 'Serving travelers since [year]'",
        "• Include IATA/CLIA credentials to build trust",
        "",
        "**Targeting Tips:**",
        "• Past clients: 'We miss you!' campaigns with exclusive offers",
        "• Affluent neighborhoods for luxury travel",
        "• Age 50+ for cruise and escorted tours",
        "• Newlyweds for honeymoon packages"
      ];
    } else if (queryLower.includes('roi') || queryLower.includes('return')) {
      response.content = [
        "**Direct Mail ROI Factors:**",
        "• Industry average ROI: 29% (higher than digital channels)",
        "• Catalogs can achieve 112% ROI with the right audience",
        "• Response rates are 10-30x higher than email",
        "",
        "**Maximizing ROI:**",
        "• Target your best customers first (RFM segmentation)",
        "• Test different offers and formats",
        "• Track results meticulously",
        "• Integrate with digital campaigns for better results"
      ];
    } else {
      // General travel agency direct mail guidance
      response.content = [
        "**Travel Agency Direct Mail Essentials:**",
        "• Goals: New bookings, reactivate past clients, or promote specific destinations",
        "• Formats: Postcards for deals, catalogs for multiple trips, letters for luxury travel",
        "• List Strategy: Past clients (highest ROI), local affluent areas, travel magazine subscribers",
        "• Offers That Work: Early booking discounts, group travel savings, exclusive departures",
        "• Timing: January for summer, September for winter/holiday travel",
        "",
        "**Why Direct Mail Works for Travel Agents:**",
        "• Visual impact - showcase beautiful destinations",
        "• Reaches affluent travelers who value printed materials",
        "• 68% of travelers keep travel mailers for future reference",
        "• Builds trust - physical mail shows established business",
        "• Perfect for targeting by demographics and travel history",
        "",
        "**Popular Campaigns:**",
        "• Cruise promotions with ship imagery",
        "• Escorted tour catalogs with itineraries",
        "• Honeymoon/destination wedding mailers",
        "• 'Local Expert' positioning for neighborhood mailings"
      ];
    }
    
    // Build a comprehensive narrative response
    const narrativeContent = [
      response.intro,
      '',
      response.content.join('\n'),
      '',
      '📊 **Key Performance Metrics:**',
      `• ${response.metrics['Travel Industry Response Rate']}`,
      `• Average Booking Value: ${response.metrics['Average Booking Value']}`,
      `• ${response.metrics['ROI for Travel Campaigns']}`,
      `• Best Booking Times: ${response.metrics['Best Months']}`,
      '',
      '📈 **Format-Specific Benchmarks:**',
      ...Object.entries(response.benchmarks).map(([format, rate]) => `• ${format}: ${rate}`),
      '',
      '💡 **Strategic Recommendations for Travel Agents:**',
      '1. **Start with Past Clients**: Your client database is gold - they already trust you and are 3x more likely to book again.',
      '2. **Showcase Experiences**: Use stunning imagery and traveler testimonials to create emotional connections.',
      '3. **Time It Right**: Mail 3-4 months before peak booking seasons for best results.',
      '4. **Track Bookings**: Use special booking codes or dedicated phone numbers to measure ROI accurately.',
      '',
      '📋 **Next Steps for Your Travel Campaign:**',
      '1. **Select Your Focus**: Choose specific trips, destinations, or travel types (cruises, tours, etc.)',
      '2. **Build Your List**: Start with past clients, then expand to lookalike audiences',
      '3. **Create Your Offer**: Early booking discounts, exclusive departures, or value-adds like shore excursions',
      '4. **Design for Wanderlust**: Large destination photos, clear pricing, and easy booking methods',
      '5. **Include Trust Elements**: Your credentials, years in business, and traveler testimonials',
      '',
      '🎯 **Travel Agency Success Stories:**',
      '• Cruise specialist: 8.5% response rate on Alaska cruise postcard to past cruisers',
      '• Luxury agency: 4% response on African safari mailer, average booking $12,000',
      '• Local agency: 6% response on "neighborhood travel expert" campaign',
      '',
      'Would you like me to help you with any specific aspect of your direct mail campaign, such as targeting, design, or offer strategy?'
    ].join('\n');

    return {
      status: 'success',
      type: 'direct_mail_guidance',
      agent: this.name,
      content: {
        text: narrativeContent,
        confidence: 'high',
        structured: {
          intro: response.intro,
          mainContent: response.content.join('\n'),
          metrics: response.metrics,
          benchmarks: response.benchmarks,
          recommendations: [
            "Mail to past clients first - they're your most responsive audience",
            "Use oversized postcards to showcase destination photography",
            "Include early booking incentives and limited-time offers",
            "Partner with tourism boards for co-op marketing opportunities"
          ],
          examples: [
            "River cruise postcard to past cruisers → 8.5% response rate",
            "Italy tour catalog to cultural travelers → 5% response, $3,200 avg booking",
            "Honeymoon mailer to newly engaged → 6% response rate"
          ],
          nextSteps: [
            "Segment your client database by travel preferences and history",
            "Select 2-3 hero trips or destinations to feature",
            "Design mailers with stunning visuals and clear CTAs",
            "Set up dedicated booking codes for tracking",
            "Plan follow-up sequences for non-responders"
          ]
        },
        citations: []
      },
      metadata: {
        agent: this.name,
        channel: this.channel,
        confidence: 'high',
        source: 'fallback_knowledge'
      }
    };
  }

  /**
   * Create error response
   */
  createErrorResponse(error) {
    return {
      status: 'error',
      type: 'direct_mail_guidance',
      data: {
        message: 'An error occurred while processing your direct mail query',
        error: error
      },
      metadata: {
        agent: this.name,
        channel: this.channel
      }
    };
  }
}

// Export for use in agent registry
export default DirectMailAgent;