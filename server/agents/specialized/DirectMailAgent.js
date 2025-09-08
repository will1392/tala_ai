/**
 * DirectMailAgent - Specialized agent for direct mail marketing
 * 
 * Provides expert guidance on direct mail campaigns for travel agencies.
 * Self-registers with AgentRegistry when imported.
 */

import { registerAgent } from '../AgentRegistry.js';

export class DirectMailAgent {
  /**
   * Agent metadata for self-registration
   */
  static metadata = {
    channel: 'direct_mail',
    name: 'Direct Mail Marketing Expert',
    description: 'Specialized in direct mail campaigns for travel agencies',
    priority: 10, // Higher priority for explicit direct mail queries
    
    // Trigger patterns for this agent
    triggers: [
      /direct mail/i,
      /postcard/i,
      /mailer/i,
      /postal campaign/i,
      /mailing list/i,
      /print marketing/i,
      /mail campaign/i,
      /letter campaign/i,
      /catalog marketing/i,
      /brochure/i,
      /eddm/i, // Every Door Direct Mail
      /saturation mail/i
    ],
    
    // Confidence calculation function
    confidence: (message, context) => {
      const msgLower = message.toLowerCase();
      let confidence = 0;
      
      // Check explicit channel match
      if (context?.detectedChannel === 'direct_mail') {
        confidence = 0.9;
      }
      
      // Check trigger patterns
      const matchCount = DirectMailAgent.metadata.triggers
        .filter(pattern => pattern.test(msgLower)).length;
      
      if (matchCount > 0) {
        confidence = Math.max(confidence, 0.7 + (matchCount * 0.1));
      }
      
      // Boost for specific keywords
      if (msgLower.includes('postcard') || msgLower.includes('mailer')) {
        confidence = Math.max(confidence, 0.8);
      }
      
      // Lower confidence if asking about digital channels
      if (/email|social|online|digital|web/i.test(msgLower)) {
        confidence *= 0.7;
      }
      
      return Math.min(confidence, 1);
    }
  };

  constructor() {
    this.name = 'DirectMailAgent';
    this.initialized = false;
  }

  /**
   * Initialize agent (optional)
   */
  async initialize() {
    if (this.initialized) return;
    
    // Any initialization logic here
    console.log('✅ DirectMailAgent initialized');
    this.initialized = true;
  }

  /**
   * Main execution method
   */
  async execute(input) {
    console.log(`📬 DirectMailAgent executing with query: ${input.query?.substring(0, 100)}`);
    
    try {
      // Analyze the query
      const analysis = this.analyzeQuery(input.query);
      
      // Generate specialized response based on query type
      let response;
      
      if (analysis.isAskingAboutROI) {
        response = this.generateROIResponse(input, analysis);
      } else if (analysis.isAskingAboutDesign) {
        response = this.generateDesignResponse(input, analysis);
      } else if (analysis.isAskingAboutTargeting) {
        response = this.generateTargetingResponse(input, analysis);
      } else if (analysis.isAskingAboutCosts) {
        response = this.generateCostResponse(input, analysis);
      } else {
        response = this.generateComprehensiveResponse(input, analysis);
      }
      
      return response;
      
    } catch (error) {
      console.error('DirectMailAgent error:', error);
      // Return helpful fallback instead of error
      return this.generateFallbackResponse(input);
    }
  }

  /**
   * Analyze query to determine response type
   */
  analyzeQuery(query) {
    const queryLower = query?.toLowerCase() || '';
    
    return {
      isAskingAboutROI: /roi|return|profit|worth|effective|results/i.test(query),
      isAskingAboutDesign: /design|template|layout|creative|image|photo/i.test(query),
      isAskingAboutTargeting: /target|audience|list|demographic|segment/i.test(query),
      isAskingAboutCosts: /cost|price|budget|expensive|cheap|afford/i.test(query),
      isAskingAboutPostcards: /postcard/i.test(query),
      isAskingAboutLetters: /letter|envelope/i.test(query),
      isAskingAboutCatalogs: /catalog|brochure/i.test(query),
      hasUrgency: /urgent|quick|fast|asap|immediately/i.test(query),
      isComparison: /vs|versus|compare|better|difference/i.test(query)
    };
  }

  /**
   * Generate ROI-focused response
   */
  generateROIResponse(input, analysis) {
    const content = `## Direct Mail ROI for Travel Agencies

Direct mail consistently delivers strong returns for travel agencies, with industry-specific advantages that digital channels can't match.

### 📊 Travel Industry Direct Mail Performance

**Key Metrics:**
• **Response Rate**: 5.1% average (vs 2.9% general industry)
• **Booking Value**: $2,800-$4,500 per response
• **ROI**: 42% average return
• **Conversion Timeline**: 14-21 days from mail to booking

### 💰 Why Direct Mail Works for Travel

1. **Visual Impact**: Stunning destination photos create immediate desire
2. **Tangible Planning**: 68% keep travel mailers for future reference  
3. **Trust Factor**: Physical mail from local agents builds credibility
4. **Higher Demographics**: Reaches affluent travelers who value print

### 📈 Maximizing Your ROI

**Best Practices:**
• **Target Past Clients**: 3x higher response rate
• **Time It Right**: Mail 3-4 months before travel season
• **Track Everything**: Use booking codes, dedicated phone numbers
• **Test and Refine**: Start with 500-piece test, then scale

### 🎯 Expected Returns by Campaign Type

| Campaign Type | Response Rate | Avg Booking | ROI |
|--------------|---------------|-------------|-----|
| Past Client Reactivation | 8-10% | $3,500 | 65% |
| Cruise Promotions | 6-8% | $4,200 | 48% |
| Local Saturation | 3-4% | $2,100 | 28% |
| Luxury Travel | 2-3% | $8,500 | 52% |

Would you like me to calculate potential ROI for your specific campaign parameters?`;

    return {
      status: 'success',
      type: 'direct_mail_guidance',
      agent: this.name,
      content: {
        text: content,
        confidence: 'high',
        structured: {
          metrics: {
            responseRate: '5.1% average',
            bookingValue: '$2,800-$4,500',
            roi: '42% average',
            timeline: '14-21 days'
          },
          recommendations: [
            'Start with past client database for highest ROI',
            'Use test campaigns of 500 pieces before scaling',
            'Track with unique booking codes',
            'Time mailings 3-4 months before peak season'
          ],
          bestPractices: {
            targeting: 'Focus on past clients and lookalikes',
            creative: 'Use stunning destination photography',
            offer: 'Include early booking discounts',
            tracking: 'Implement unique response codes'
          }
        }
      },
      metadata: {
        agent: this.name,
        channel: 'direct_mail',
        queryType: 'roi_analysis',
        confidence: 'high'
      }
    };
  }

  /**
   * Generate design-focused response
   */
  generateDesignResponse(input, analysis) {
    let content = `## Direct Mail Design for Travel Agencies

Creating compelling direct mail for travel requires balancing stunning visuals with clear information and strong calls-to-action.

### 🎨 Design Principles for Travel Direct Mail

**Visual Hierarchy:**
1. **Hero Image** (40-50% of space): Breathtaking destination photo
2. **Headline** (20%): Create immediate wanderlust
3. **Offer Details** (20%): Dates, prices, what's included  
4. **Call-to-Action** (10%): Booking information

### 📐 Format Recommendations`;

    if (analysis.isAskingAboutPostcards) {
      content += `

**Postcard Specifications:**
• **Size**: 6"x9" or 6"x11" (jumbo for impact)
• **Paper**: 14pt-16pt cardstock with UV coating
• **Bleed**: Full bleed for edge-to-edge imagery

**Front Design:**
• Full destination photo (no text overlay)
• OR: Photo with minimal text overlay (destination name only)

**Back Design:**
• 60% message/offer space
• 40% address panel
• Clear headline: "Your Dream Vacation Awaits"
• Bullet points for trip highlights
• Prominent booking deadline
• Agency credentials (IATA/CLIA numbers)`;
    } else {
      content += `

**Multi-Format Options:**
• **Postcards**: Best for single destination promotions
• **Letters**: Ideal for exclusive/luxury travel packages
• **Catalogs**: Perfect for multiple trip options
• **Brochures**: Great for detailed itineraries`;
    }

    content += `

### 🌟 Design Best Practices

**Photography Selection:**
• Use professional, high-resolution images
• Show experiences, not just places
• Include people enjoying activities
• Ensure cultural sensitivity

**Color Psychology:**
• Blue: Trust, stability (cruises, beach)
• Green: Nature, adventure (eco-tours)
• Gold/Brown: Luxury, warmth (upscale travel)
• Red: Urgency for limited offers

**Typography Guidelines:**
• Headlines: Bold sans-serif, 24pt minimum
• Body text: Clean serif or sans-serif, 10-12pt
• Maintain high contrast for readability
• Limit to 2-3 font families

### ✍️ Copy That Converts

**Headline Formulas:**
• "Escape to [Destination] This [Season]"
• "[Number] Unforgettable Days in [Place]"
• "Your [Adjective] [Destination] Adventure Awaits"

**Power Words for Travel:**
• Discover, Explore, Experience
• Breathtaking, Stunning, Unforgettable
• Exclusive, Limited, Special
• Paradise, Dream, Escape

Would you like me to review your specific design concepts or suggest templates for your campaign?`;

    return {
      status: 'success',
      type: 'direct_mail_guidance',
      agent: this.name,
      content: {
        text: content,
        confidence: 'high',
        structured: {
          designPrinciples: {
            hierarchy: ['Hero Image', 'Headline', 'Offer Details', 'Call-to-Action'],
            colorPsychology: {
              blue: 'Trust, stability',
              green: 'Nature, adventure',
              gold: 'Luxury, warmth'
            }
          },
          specifications: {
            postcard: '6"x9" or 6"x11", 14pt cardstock',
            paper: 'UV coating recommended',
            bleed: 'Full bleed for images'
          },
          copyTips: [
            'Use power words: Discover, Explore, Experience',
            'Create urgency with limited offers',
            'Include social proof and testimonials',
            'Focus on experiences over features'
          ]
        }
      },
      metadata: {
        agent: this.name,
        channel: 'direct_mail',
        queryType: 'design_guidance',
        confidence: 'high'
      }
    };
  }

  /**
   * Generate targeting-focused response
   */
  generateTargetingResponse(input, analysis) {
    const content = `## Direct Mail Targeting for Travel Agencies

Success in travel direct mail starts with reaching the right audience at the right time with the right message.

### 🎯 Targeting Hierarchy for Travel Agents

**1. Past Clients (Highest ROI)**
• Response Rate: 8-10%
• Segment by:
  - Travel type (cruise, adventure, luxury)
  - Destination preferences
  - Booking value
  - Recency (last 24 months best)

**2. Lookalike Audiences**
• Response Rate: 4-6%
• Based on best client profiles
• Use demographic modeling
• Geographic clustering

**3. Local Saturation**
• Response Rate: 2-4%
• Target affluent neighborhoods
• Focus on zip codes with $75K+ HHI
• Age 45+ for cruises/tours

### 📊 Segmentation Strategies

**By Travel Interest:**
• **Cruise Enthusiasts**: Previous cruisers, age 55+
• **Adventure Travelers**: Age 35-55, active lifestyle indicators
• **Luxury Seekers**: High income, premium credit cards
• **Family Vacationers**: Households with children 8-18

**By Life Stage:**
• **Honeymoon**: Newly engaged/married couples
• **Empty Nesters**: Recent retirees, kids left home
• **Milestone Celebrations**: Anniversaries, birthdays
• **Multi-generational**: Grandparents planning family trips

### 🗓️ Timing Your Campaigns

**Seasonal Planning:**
• **January-February**: Summer Europe, Alaska cruises
• **March-April**: Fall foliage, holiday travel
• **September-October**: Winter escapes, spring break
• **November**: Next year's summer planning

**Booking Windows:**
• Cruises: 6-9 months advance
• International: 4-6 months advance
• Domestic: 2-3 months advance
• Last-minute: 4-6 weeks

### 📋 List Building & Management

**Data Sources:**
• Your client database (best ROI)
• Travel magazine subscribers
• Airline frequent flyer lists
• Luxury goods purchasers
• Local homeowner lists

**List Hygiene:**
• Update quarterly
• Remove duplicates
• Verify addresses (NCOA)
• Track undeliverables
• Honor opt-outs immediately

### 💡 Advanced Targeting Tactics

**Predictive Modeling:**
• Identify "cruise-likely" households
• Find "adventure-ready" demographics
• Score for luxury travel potential

**Trigger Marketing:**
• New movers (plan honeymoons)
• Recent retirees (bucket list trips)
• Home sales (upgrade vacations)

Would you like help building a specific target list for your next campaign?`;

    return {
      status: 'success',
      type: 'direct_mail_guidance',
      agent: this.name,
      content: {
        text: content,
        confidence: 'high',
        structured: {
          targetingHierarchy: [
            { segment: 'Past Clients', responseRate: '8-10%', priority: 1 },
            { segment: 'Lookalike Audiences', responseRate: '4-6%', priority: 2 },
            { segment: 'Local Saturation', responseRate: '2-4%', priority: 3 }
          ],
          segmentationOptions: {
            byInterest: ['Cruise', 'Adventure', 'Luxury', 'Family'],
            byLifeStage: ['Honeymoon', 'Empty Nesters', 'Milestones'],
            byDemographics: ['Age', 'Income', 'Geography']
          },
          timingGuide: {
            summer: 'Mail January-February',
            fall: 'Mail March-April',
            winter: 'Mail September-October',
            spring: 'Mail November-December'
          },
          dataSources: [
            'Client database',
            'Travel magazine subscribers',
            'Frequent flyer lists',
            'Luxury purchaser lists'
          ]
        }
      },
      metadata: {
        agent: this.name,
        channel: 'direct_mail',
        queryType: 'targeting_guidance',
        confidence: 'high'
      }
    };
  }

  /**
   * Generate cost-focused response
   */
  generateCostResponse(input, analysis) {
    const content = `## Direct Mail Costs for Travel Agencies

Understanding direct mail costs helps you budget effectively and maximize ROI. Here's a comprehensive breakdown for travel agency campaigns.

### 💰 Cost Components Breakdown

**1. Design & Creative**
• Professional design: $500-$2,000
• Stock photography: $50-$500 per image
• Copywriting: $300-$1,000
• *Tip: Many printers offer free templates*

**2. Printing Costs**
• Postcards (6"x9"): $0.25-$0.45 each
• Letters with envelope: $0.40-$0.70 each
• Catalogs (8-page): $0.80-$1.50 each
• *Volume discounts at 1,000+ pieces*

**3. Mailing Lists**
• Your database: Free
• Purchased lists: $50-$150 per 1,000 names
• List processing: $25-$50 per list

**4. Postage**
• First-Class postcard: $0.48 each
• Marketing Mail postcard: $0.35 each
• Letter (Marketing Mail): $0.45-$0.55 each
• EDDM (saturation): $0.19 each

### 📊 Sample Campaign Budgets

**Small Test Campaign (500 pieces)**
\`\`\`
Postcards:
Design (template):     $  200
Printing:             $  175
List (your database): $    0
Postage:             $  175
Total:               $  550
Cost per piece:      $ 1.10
\`\`\`

**Medium Campaign (2,500 pieces)**
\`\`\`
Postcards:
Design (custom):      $  750
Printing:            $  750
List purchase:       $  200
Postage:            $  875
Total:              $2,575
Cost per piece:     $ 1.03
\`\`\`

**Large Campaign (10,000 pieces)**
\`\`\`
Postcards:
Design (custom):     $1,000
Printing:           $2,500
List + processing:  $  800
Postage:           $3,500
Total:             $7,800
Cost per piece:    $ 0.78
\`\`\`

### 💡 Cost-Saving Strategies

**1. EDDM (Every Door Direct Mail)**
• No list needed
• $0.19 postage
• Target by postal route
• Best for local agencies

**2. Co-op Marketing**
• Partner with tourism boards
• Share costs with suppliers
• Access professional creative
• Typical 50-75% cost reduction

**3. Volume & Timing**
• Print larger quantities (lower unit cost)
• Mail during postal promotions
• Combine multiple offers
• Use Marketing Mail rates

### 📈 ROI Calculations

**Break-Even Analysis:**
\`\`\`
Campaign Cost: $2,500
Pieces Mailed: 2,500
Response Rate: 5% = 125 responses
Booking Rate: 40% = 50 bookings
Break-even booking value: $50 per booking

Typical booking: $2,800
Profit per booking: $2,750
Total profit: $137,500
ROI: 5,400%
\`\`\`

### 🎯 Budget Recommendations by Agency Size

**New/Small Agency**: $500-$1,500/month
• Focus on past clients
• Use templates
• Test small batches

**Established Agency**: $2,000-$5,000/month
• Mix of retention and acquisition
• Custom design
• Regular monthly mailings

**Large Agency**: $5,000-$15,000/month
• Multiple segments
• Premium production
• Integrated campaigns

Would you like me to create a specific budget for your planned campaign?`;

    return {
      status: 'success',
      type: 'direct_mail_guidance',
      agent: this.name,
      content: {
        text: content,
        confidence: 'high',
        structured: {
          costBreakdown: {
            design: '$500-$2,000',
            printing: '$0.25-$0.45 per postcard',
            lists: '$50-$150 per 1,000 names',
            postage: '$0.35-$0.48 per piece'
          },
          campaignExamples: [
            { size: 500, totalCost: '$550', perPiece: '$1.10' },
            { size: 2500, totalCost: '$2,575', perPiece: '$1.03' },
            { size: 10000, totalCost: '$7,800', perPiece: '$0.78' }
          ],
          savingStrategies: [
            'Use EDDM for local saturation',
            'Partner with tourism boards',
            'Print in larger quantities',
            'Use Marketing Mail rates'
          ],
          roiExample: {
            investment: '$2,500',
            responses: '125 (5% rate)',
            bookings: '50',
            revenue: '$140,000',
            roi: '5,400%'
          }
        }
      },
      metadata: {
        agent: this.name,
        channel: 'direct_mail',
        queryType: 'cost_analysis',
        confidence: 'high'
      }
    };
  }

  /**
   * Generate comprehensive response
   */
  generateComprehensiveResponse(input, analysis) {
    const content = `## Direct Mail Marketing for Travel Agencies

I'll help you create an effective direct mail campaign that drives bookings and builds your travel business. Direct mail remains one of the most powerful marketing channels for travel agents.

### 🎯 Why Direct Mail Works for Travel Agencies

**Unique Advantages:**
• **Visual Impact**: Showcase stunning destinations in full color
• **Tangibility**: 68% of travelers keep mail for future planning
• **Trust Building**: Physical mail from local agents creates credibility
• **Perfect Demographics**: Reaches affluent travelers who value print

### 📊 Travel Industry Performance Metrics

| Metric | Travel Industry | General Average |
|--------|----------------|-----------------|
| Response Rate | 5.1% | 2.9% |
| Booking Value | $2,800-$4,500 | N/A |
| ROI | 42% | 29% |
| Keep Rate | 68% | 42% |

### 🚀 Getting Started: Your Direct Mail Roadmap

**1. Define Your Campaign Goals**
• New client acquisition
• Past client reactivation  
• Specific destination promotion
• Seasonal booking drive

**2. Choose Your Format**
• **Postcards**: Great for single destinations, quick impact
• **Letters**: Best for exclusive offers, luxury travel
• **Catalogs**: Perfect for multiple trip options
• **Brochures**: Ideal for detailed itineraries

**3. Target Your Audience**
• Start with past clients (highest ROI)
• Create lookalike audiences
• Use geographic targeting
• Consider life stage triggers

**4. Design for Impact**
• Lead with stunning imagery
• Clear, compelling headline
• Highlight unique value
• Strong call-to-action

**5. Time It Right**
• Mail 3-4 months before travel season
• Consider booking windows by trip type
• Plan around paydays and bonuses

### 💡 Proven Campaign Ideas for Travel Agents

**"Welcome Back" Campaign**
• Target: Past clients inactive 12+ months
• Offer: Exclusive "alumni" discount
• Format: Personalized letter
• Expected response: 8-10%

**"Dream Destination" Series**
• Target: Local affluent neighborhoods
• Offer: Monthly featured destination
• Format: Oversized postcards
• Expected response: 3-4%

**"Milestone Moments" Program**
• Target: Anniversaries, retirements
• Offer: Special celebration packages
• Format: Elegant invitation style
• Expected response: 5-6%

### 📈 Measuring Success

**Key Metrics to Track:**
• Response rate (calls, emails, web visits)
• Conversion rate (bookings from responses)
• Average booking value
• Cost per acquisition
• Lifetime value of acquired clients

**Tracking Methods:**
• Unique booking codes
• Dedicated phone numbers
• Custom landing pages
• QR codes for easy response

### 💰 Budget Planning

**Typical Investment Ranges:**
• Test campaign (500 pieces): $500-$750
• Standard campaign (2,500): $2,000-$3,000  
• Major campaign (10,000+): $7,000-$12,000

**Cost per piece: $0.75-$1.50 average**

### 🎯 Next Steps

1. **Assess your database**: How many past clients can you reach?
2. **Set your goal**: Bookings needed to justify investment
3. **Choose format**: Match to your audience and offer
4. **Create timeline**: Work backwards from travel dates
5. **Design and test**: Start small, measure, then scale

Would you like me to help you develop a specific campaign strategy based on your agency's goals and budget?`;

    return {
      status: 'success',
      type: 'direct_mail_guidance',
      agent: this.name,
      content: {
        text: content,
        confidence: 'high',
        structured: {
          overview: {
            advantages: [
              'Visual destination showcase',
              '68% keep rate for planning',
              'Builds local trust',
              'Reaches affluent demographics'
            ],
            metrics: {
              responseRate: '5.1% travel vs 2.9% average',
              bookingValue: '$2,800-$4,500 average',
              roi: '42% travel industry average'
            }
          },
          campaignIdeas: [
            {
              name: 'Welcome Back Campaign',
              target: 'Inactive past clients',
              format: 'Personalized letter',
              expectedResponse: '8-10%'
            },
            {
              name: 'Dream Destination Series',
              target: 'Local affluent areas',
              format: 'Oversized postcards',
              expectedResponse: '3-4%'
            },
            {
              name: 'Milestone Moments',
              target: 'Life events',
              format: 'Invitation style',
              expectedResponse: '5-6%'
            }
          ],
          nextSteps: [
            'Audit your client database',
            'Define campaign objectives',
            'Select appropriate format',
            'Create compelling offer',
            'Design with impact',
            'Test with small batch',
            'Track and optimize'
          ],
          resources: {
            templates: 'Available from most printers',
            photography: 'Tourism board partnerships',
            lists: 'Start with your database',
            tracking: 'Use unique codes'
          }
        }
      },
      metadata: {
        agent: this.name,
        channel: 'direct_mail',
        queryType: 'comprehensive_guide',
        confidence: 'high'
      }
    };
  }

  /**
   * Generate fallback response
   */
  generateFallbackResponse(input) {
    return this.generateComprehensiveResponse(input, {});
  }
}

// Self-register when module is imported
registerAgent(DirectMailAgent);

export default DirectMailAgent;