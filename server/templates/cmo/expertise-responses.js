/**
 * Adaptive Response Templates for Different Expertise Levels
 * Each template adjusts language, depth, and examples based on user knowledge
 */

const ResponseTemplates = {
  // SEO Response Templates
  SEO: {
    title_tags: {
      beginner: {
        intro: "A title tag is like the headline of your webpage - it's what people see in Google search results.",
        explanation: "Think of it as your webpage's name tag at a party. You want it to be clear, interesting, and tell people what you're about.",
        technical: "Keep it under 60 characters so it doesn't get cut off.",
        example: "❌ Bad: 'Home'\n✅ Good: 'Best Pizza in Chicago - Tony's Pizza Restaurant'",
        action: "Let's write a title tag together. What's your webpage about?",
        tips: [
          "Include what you do or sell",
          "Add your location if you're a local business", 
          "Make it interesting so people want to click"
        ]
      },
      intermediate: {
        intro: "Title tags are crucial HTML elements that impact both CTR and rankings.",
        explanation: "They appear in SERPs as clickable headlines and should balance keyword optimization with user appeal.",
        technical: "Optimal length: 50-60 characters. Front-load primary keywords. CTR typically peaks at 15-40 characters.",
        example: "Format: Primary Keyword - Secondary Keyword | Brand Name\nExample: 'Chicago Pizza Delivery - Order Online | Tony's Pizza'",
        action: "Share your current title tag and target keywords - I'll help optimize it.",
        tips: [
          "Place important keywords at the beginning",
          "Include emotional triggers or value propositions",
          "A/B test different variations"
        ]
      },
      advanced: {
        intro: "Let's optimize your title tags for maximum SERP performance and CTR.",
        explanation: "Consider search intent matching, SERP analysis, and psychological triggers while maintaining keyword relevance.",
        technical: "Analyze SERP features, test CTR with GSC data, implement structured data for enhanced snippets. Consider pixel width over character count.",
        example: "Test variations:\n• [2024] prefix for freshness\n• Numbers for specificity (5 Best...)\n• Emotional triggers (Ultimate, Essential)\n• Unicode characters for differentiation ✓",
        action: "What's your current CTR, average position, and main competitor's approach?",
        tips: [
          "Use SERP analysis tools to identify patterns",
          "Test power words based on user intent",
          "Monitor seasonal CTR variations"
        ]
      },
      expert: {
        intro: "Title tag optimization at scale with data-driven methodology.",
        explanation: "Leverage NLP, competitor gap analysis, and programmatic optimization based on SERP volatility and intent clusters.",
        technical: "Implement dynamic title generation using TF-IDF analysis, entity salience scores, and BERT-optimized semantic structures. Correlate with Core Web Vitals impact.",
        example: "Pattern: {Intent Modifier} + {Primary Entity} + {Attribute} + {Geo-modifier} | {Brand}\nDynamic insertion based on query intent classification",
        action: "Current title tag performance metrics, SERP feature presence, and click-through rate curve analysis?",
        data_points: [
          "CTR by position correlation",
          "Title tag A/B test results",
          "SERP feature impact on CTR",
          "Semantic similarity scores"
        ]
      }
    },
    
    meta_descriptions: {
      beginner: {
        intro: "A meta description is like a movie trailer for your webpage - it gives people a preview of what they'll find.",
        explanation: "While Google shows your title in blue, the meta description is the gray text underneath that describes your page.",
        technical: "Aim for 150-160 characters. It won't directly help rankings, but it can make more people click your link.",
        example: "❌ Bad: 'Welcome to our website'\n✅ Good: 'Chicago's favorite pizza since 1985. Order online for delivery in 30 minutes. Fresh ingredients, family recipes.'",
        action: "What key information would make someone want to visit your page?",
        tips: [
          "Include a clear benefit or value",
          "Add a call-to-action like 'Learn more' or 'Order now'",
          "Mention what makes you unique"
        ]
      },
      intermediate: {
        intro: "Meta descriptions influence CTR by providing compelling SERP snippets.",
        explanation: "While not a direct ranking factor, they impact user behavior metrics. Google may rewrite them based on query context.",
        technical: "Target 155-160 characters. Include target keywords for bold highlighting. Use active voice and clear CTAs.",
        example: "Formula: [Value Prop] + [Key Features] + [CTA]\n'Save 30% on Chicago pizza delivery. Fresh ingredients, 30-min delivery, order tracking. Order online now →'",
        action: "What's your primary value proposition and target search query?",
        tips: [
          "Match search intent with appropriate CTAs",
          "Include emotional triggers and urgency",
          "Use numbers and specifics when possible"
        ]
      },
      advanced: {
        intro: "Optimize meta descriptions for maximum SERP real estate and user engagement.",
        explanation: "Focus on query-specific optimization, SERP feature triggers, and psychological persuasion principles.",
        technical: "Test variations by search intent. Monitor Google's rewrite frequency. Optimize for featured snippets and FAQ schema.",
        example: "Intent-based templates:\n• Transactional: Urgency + Offer + CTA\n• Informational: Question + Answer + Authority\n• Commercial: Comparison + USP + Social Proof",
        action: "Share your top queries and current Google rewrite percentage.",
        optimization_factors: [
          "Query-description relevance score",
          "Snippet rewrite frequency",
          "Mobile vs desktop CTR variance",
          "Rich snippet eligibility"
        ]
      },
      expert: {
        intro: "Meta description strategy for scalable CTR optimization.",
        explanation: "Dynamic generation based on query intent, SERP features, and user journey stage. Correlation with dwell time and pogo-sticking.",
        technical: "Implement ML-based description generation using click prediction models. A/B test at scale with statistical significance.",
        example: "Dynamic variables: {{intent_modifier}} {{primary_benefit}} {{social_proof}} {{urgency_trigger}} {{cta_variant}}",
        action: "Current CTR distribution, description rewrite rate, and correlation with engagement metrics?",
        advanced_tactics: [
          "Query cluster-based templates",
          "Seasonal variation modeling",
          "Competitor CTR gap analysis",
          "SERP feature optimization"
        ]
      }
    },

    keyword_research: {
      beginner: {
        intro: "Keywords are the words people type into Google when looking for businesses like yours.",
        explanation: "It's like learning the language your customers use. If they search for 'pizza delivery', but you only say 'pizza restaurant', they might not find you.",
        technical: "Start with 5-10 main keywords that describe what you offer.",
        example: "If you sell shoes:\n• 'running shoes' (what you sell)\n• 'comfortable running shoes' (benefit)\n• 'running shoes Chicago' (location)",
        action: "List 5 things your customers might search for to find you.",
        tools: "Try Google's autocomplete - start typing and see what Google suggests!"
      },
      intermediate: {
        intro: "Effective keyword research balances search volume, competition, and intent alignment.",
        explanation: "Focus on long-tail keywords with commercial intent. Analyze difficulty scores and search volume trends.",
        technical: "Target keywords with 100-1000 monthly searches initially. KEI (Keyword Efficiency Index) = Volume²/Competition.",
        example: "Keyword funnel:\n• Head: 'running shoes' (high volume, high competition)\n• Body: 'best running shoes for flat feet'\n• Long-tail: 'waterproof trail running shoes size 12'",
        action: "What's your domain authority and primary conversion goal?",
        process: [
          "Start with seed keywords",
          "Expand using related searches",
          "Analyze competitor gaps",
          "Prioritize by intent and difficulty"
        ]
      },
      advanced: {
        intro: "Strategic keyword research using competitive intelligence and intent mapping.",
        explanation: "Build topical authority through semantic keyword clusters. Focus on SERP feature opportunities.",
        technical: "Use TF-IDF analysis, co-occurrence mapping, and latent semantic indexing. Target featured snippet opportunities.",
        example: "Cluster approach:\n• Core topic: 'running shoes'\n• Supporting: 'pronation', 'gait analysis', 'shoe rotation'\n• Intent variants: 'how to choose', 'vs comparison', 'reviews'",
        action: "Share your content gap analysis and current topical authority scores.",
        methodology: [
          "SERP analysis for intent classification",
          "Competitor keyword gap analysis",
          "Search volume seasonality modeling",
          "Content cluster planning"
        ]
      },
      expert: {
        intro: "Advanced keyword research leveraging NLP and predictive analytics.",
        explanation: "Entity-based optimization, BERT understanding, and predictive keyword modeling for emerging trends.",
        technical: "Implement knowledge graph optimization, query intent prediction, and semantic similarity scoring at scale.",
        example: "Entity mapping: [Product] + [Attributes] + [Use Cases] + [Related Entities]\nPredictive modeling for zero-volume keywords with high future potential.",
        action: "Current entity coverage, topical authority distribution, and predictive keyword pipeline?",
        advanced_analysis: [
          "Entity salience optimization",
          "Query space modeling",
          "Trend prediction algorithms",
          "Multi-language keyword arbitrage"
        ]
      }
    }
  },

  // Email Marketing Response Templates
  EMAIL: {
    open_rates: {
      beginner: {
        intro: "Great question! Email open rates tell you what percentage of people open your emails. Think of it like this - if you send 100 emails and 20 people open them, that's a 20% open rate.",
        explanation: "Here are the main things that affect whether people open your emails:",
        sections: {
          subject_line: {
            title: "Subject Line - This is like the headline that makes people want to read more",
            tips: [
              "Keep it short (under 50 characters)",
              "Make it interesting or useful",
              "Example: \"5 tips to save on travel\" instead of \"Newsletter #12\""
            ]
          },
          sender_name: {
            title: "Sender Name - Use a name people recognize",
            tips: [
              "\"Sarah from TravelCo\" is better than \"noreply@company.com\""
            ]
          },
          timing: {
            title: "Timing - Send when people check email",
            tips: [
              "Tuesdays and Thursdays often work well",
              "Try 10 AM or 2 PM in your audience's timezone"
            ]
          }
        },
        action: "Would you like me to help you write some subject lines to test?"
      },
      expert: {
        intro: "Current industry benchmarks: 21.5% average, 25%+ is excellent. Let's optimize:",
        sections: {
          technical_factors: {
            title: "Technical Factors:",
            items: [
              "Authentication: Ensure SPF/DKIM/DMARC are properly configured",
              "List hygiene: Remove unengaged subscribers (no opens in 6+ months)",
              "Segmentation: Behavior-based segments typically see 14% higher open rates"
            ]
          },
          content_optimization: {
            title: "Content Optimization:",
            items: [
              "Subject lines: A/B test length (6-10 words optimal), personalization tokens, urgency indicators",
              "Preheader text: Complement subject, 40-100 characters",
              "From name: Test personal vs brand (varies by industry)"
            ]
          },
          advanced_tactics: {
            title: "Advanced Tactics:",
            items: [
              "Send time optimization using engagement data",
              "Re-engagement campaigns for dormant segments",
              "Dynamic content based on user behavior"
            ]
          }
        },
        action: "What's your current open rate and list composition?"
      }
    },
    
    subject_lines: {
      beginner: {
        intro: "Your subject line is like a doorbell - it needs to make people want to open the door!",
        explanation: "It's the first thing people see in their inbox. Make it interesting enough that they want to read more.",
        technical: "Keep it under 50 characters so it doesn't get cut off on phones.",
        example: "❌ Bad: 'Newsletter #47'\n✅ Good: 'Sarah, your 20% discount expires tonight'",
        action: "What's the main benefit or news in your email?",
        formulas: [
          "[Name], [benefit]",
          "Quick question about [topic]",
          "You're invited: [event/offer]"
        ]
      },
      intermediate: {
        intro: "Subject lines directly impact open rates and deliverability.",
        explanation: "Balance personalization, urgency, and value while avoiding spam triggers.",
        technical: "Optimal length: 30-50 characters. Personalization increases opens by 26%. Avoid spam words.",
        example: "Formulas that work:\n• Question: 'Is your [pain point] costing you $$$?'\n• Urgency: '24 hours left: [benefit]'\n• Curiosity: 'The #1 mistake [audience] makes'",
        action: "What's your current open rate and primary email goal?",
        testing_ideas: [
          "Emoji vs no emoji",
          "Question vs statement",
          "Personalization placement",
          "Urgency levels"
        ]
      },
      advanced: {
        intro: "Optimize subject lines through systematic A/B testing and segmentation.",
        explanation: "Leverage behavioral triggers, dynamic content, and preview text optimization.",
        technical: "Test significance at 95% confidence. Segment by engagement level. Use re-engagement specific lines.",
        example: "Segment-based approach:\n• Engaged: Direct value prop\n• Lapsed: 'We miss you' + incentive\n• VIP: Exclusive access angles\n• New: Welcome + expectation setting",
        action: "Share your segment performance and testing velocity.",
        advanced_tactics: [
          "Preheader optimization",
          "Time-based personalization",
          "Behavioral trigger alignment",
          "Multi-variant testing"
        ]
      },
      expert: {
        intro: "Subject line optimization using predictive analytics and ML.",
        explanation: "Implement dynamic optimization based on user behavior, send time, and contextual factors.",
        technical: "Use NLP for sentiment analysis, predictive open rate modeling, and automated variant generation.",
        example: "ML-driven variables: {{predicted_interest}} {{optimal_emotion}} {{personalization_level}} {{urgency_score}}",
        action: "Current subject line testing framework and performance distribution?",
        optimization_stack: [
          "Predictive open rate modeling",
          "Automated variant generation",
          "Send time optimization",
          "Contextual personalization"
        ]
      }
    },

    email_design: {
      beginner: {
        intro: "Your email should be like a clear path - easy to follow from start to finish.",
        explanation: "People scan emails quickly, so make it easy to understand what you want them to do.",
        technical: "Use one main image, short paragraphs, and one clear button.",
        example: "Simple structure:\n1. Greeting\n2. Main message (2-3 sentences)\n3. Big button with action\n4. Sign-off",
        action: "What's the ONE thing you want people to do after reading?",
        tips: [
          "Use plenty of white space",
          "Make buttons big and colorful",
          "Keep paragraphs to 2-3 lines"
        ]
      },
      intermediate: {
        intro: "Email design impacts engagement and conversion rates significantly.",
        explanation: "Follow mobile-first design principles with clear hierarchy and CTA prominence.",
        technical: "Single column, 600px max width, 14px+ fonts, 44px+ tap targets. Image-to-text ratio 20:80.",
        example: "F-pattern layout:\n• Hero image/headline\n• Value proposition\n• Supporting points\n• Primary CTA\n• Secondary content",
        action: "What's your mobile open rate and primary conversion metric?",
        best_practices: [
          "Inverted pyramid content structure",
          "Contrasting CTA colors",
          "Responsive design testing",
          "Alt text optimization"
        ]
      },
      advanced: {
        intro: "Design for engagement using psychology and advanced personalization.",
        explanation: "Implement dynamic content blocks, behavioral triggers, and conversion optimization.",
        technical: "Use modular design systems, AMP for email, dynamic content APIs. Test across 15+ clients.",
        example: "Dynamic modules:\n• Product recommendations\n• Countdown timers\n• Live inventory\n• Social proof widgets\n• Progressive profiling forms",
        action: "Current email client breakdown and dynamic content usage?",
        optimization_areas: [
          "Interactive email elements",
          "Dark mode optimization",
          "Accessibility compliance",
          "Load time optimization"
        ]
      },
      expert: {
        intro: "Advanced email design systems for scalable personalization.",
        explanation: "ML-driven layout optimization, predictive content modules, and real-time rendering.",
        technical: "Implement design tokens, component libraries, and automated testing frameworks. CDN optimization.",
        example: "Component matrix: [User Segment] × [Journey Stage] × [Device] × [Context] = Optimal Layout",
        action: "Current design system maturity and personalization engine capabilities?",
        technical_stack: [
          "Design system architecture",
          "Real-time content APIs",
          "Performance monitoring",
          "Automated QA testing"
        ]
      }
    }
  },

  // Social Media Response Templates
  SOCIAL: {
    content_strategy: {
      beginner: {
        intro: "Social media is like hosting a party - you want to be interesting and make people feel welcome!",
        explanation: "Share content that your audience finds helpful, entertaining, or inspiring. It's not just about selling.",
        technical: "Post consistently - aim for 3-4 times per week to start.",
        example: "Mix it up:\n• Monday: Helpful tip\n• Wednesday: Behind the scenes\n• Friday: Customer story\n• Sunday: Inspiring quote",
        action: "What does your audience care about besides your product?",
        content_ideas: [
          "How-to tips",
          "Customer success stories",
          "Team highlights",
          "Industry news"
        ]
      },
      intermediate: {
        intro: "Strategic content planning drives engagement and brand building.",
        explanation: "Use the 80/20 rule: 80% valuable content, 20% promotional. Align with platform best practices.",
        technical: "Optimal posting times vary by platform. Track engagement rate, not just followers.",
        example: "Content pillars:\n• Educational (40%): Tips, how-tos\n• Entertaining (30%): Behind-scenes, trends\n• Engaging (20%): Questions, polls\n• Promotional (10%): Offers, products",
        action: "What are your top 3 content pillars and engagement goals?",
        metrics_to_track: [
          "Engagement rate",
          "Share/save ratio",
          "Click-through rate",
          "Follower growth rate"
        ]
      },
      advanced: {
        intro: "Data-driven content strategy optimization for community building.",
        explanation: "Leverage platform algorithms, user-generated content, and multi-format storytelling.",
        technical: "Focus on share-worthy content. Optimize for platform-specific features (Reels, Stories, etc.).",
        example: "Algorithm optimization:\n• First 60 min engagement crucial\n• Reply to comments quickly\n• Use all platform features\n• Create shareable moments",
        action: "Share your content performance data and algorithm insights.",
        advanced_strategies: [
          "Cross-platform storytelling",
          "Community management tactics",
          "Influencer collaboration",
          "Social listening integration"
        ]
      },
      expert: {
        intro: "Integrated social strategy with predictive content optimization.",
        explanation: "AI-driven content creation, real-time trend capitalization, and omnichannel orchestration.",
        technical: "Implement social listening APIs, automated content generation, and predictive performance modeling.",
        example: "Content intelligence: Trend Detection → Content Creation → Distribution → Performance Analysis → Optimization",
        action: "Current tech stack and content velocity requirements?",
        enterprise_features: [
          "AI content generation",
          "Trend prediction models",
          "Automated A/B testing",
          "ROI attribution modeling"
        ]
      }
    }
  },

  // PPC Response Templates
  PPC: {
    campaign_structure: {
      beginner: {
        intro: "Think of PPC like placing different ads in different store windows - each one should attract the right shoppers.",
        explanation: "You pay when someone clicks your ad, so you want to show it to people most likely to buy.",
        technical: "Start with one campaign, 2-3 ad groups, and 3-5 keywords per group.",
        example: "Pizza shop structure:\n• Campaign: Pizza Delivery\n  • Ad Group: Pepperoni Pizza\n  • Ad Group: Vegetarian Pizza\n  • Ad Group: Gluten-Free Pizza",
        action: "What are your main product or service categories?",
        tips: [
          "Group similar products together",
          "Write ads specific to each group",
          "Start with a small daily budget"
        ]
      },
      intermediate: {
        intro: "Strategic campaign structure improves Quality Score and reduces CPC.",
        explanation: "Use Single Keyword Ad Groups (SKAGs) or close variants for maximum relevance.",
        technical: "Aim for QS 7+. Use negative keywords. Implement proper match types. Track conversion actions.",
        example: "SKAG structure:\n• Campaign: [Product] - [Match Type]\n  • Ad Group: [exact match keyword]\n    • Keywords: exact, phrase, BMM\n    • 3-4 ad variations",
        action: "What's your average Quality Score and target CPA?",
        optimization_checklist: [
          "Ad relevance optimization",
          "Landing page alignment",
          "Negative keyword lists",
          "Bid strategy selection"
        ]
      },
      advanced: {
        intro: "Advanced campaign architecture for scalable performance.",
        explanation: "Implement portfolio bid strategies, audience layering, and cross-campaign optimization.",
        technical: "Use shared budgets, portfolio strategies, and automated rules. Leverage all ad extensions.",
        example: "Portfolio approach:\n• Brand Defense (Target IS)\n• Generic Terms (Target CPA)\n• Competitors (Manual CPC)\n• Remarketing (Target ROAS)",
        action: "Share your account structure and performance by campaign type.",
        advanced_features: [
          "Custom audience combinations",
          "Dayparting optimization",
          "Device bid adjustments",
          "Geographic performance analysis"
        ]
      },
      expert: {
        intro: "Enterprise PPC architecture with machine learning optimization.",
        explanation: "Full-funnel approach with cross-channel attribution and automated optimization.",
        technical: "Implement custom bidding algorithms, API-based management, and predictive budget allocation.",
        example: "ML-driven structure: Intent Scoring → Dynamic Campaigns → Real-time Bidding → Attribution Modeling",
        action: "Current automation level and cross-channel attribution model?",
        enterprise_stack: [
          "Custom bidding algorithms",
          "API automation",
          "Cross-channel attribution",
          "Incrementality testing"
        ]
      }
    }
  },

  // Content Marketing Response Templates
  CONTENT: {
    blog_strategy: {
      beginner: {
        intro: "A blog is like having helpful conversations with your customers, but in writing!",
        explanation: "Share your knowledge to help people solve problems. This builds trust and brings visitors to your website.",
        technical: "Start with one blog post every two weeks. Aim for 500-800 words.",
        example: "Blog ideas for a fitness trainer:\n• '5 Easy Exercises You Can Do at Home'\n• 'What to Eat Before a Workout'\n• 'How to Stay Motivated'",
        action: "What questions do your customers ask you most often?",
        getting_started: [
          "Answer common questions",
          "Share your expertise",
          "Include helpful images",
          "End with a question to encourage comments"
        ]
      },
      intermediate: {
        intro: "Strategic blogging drives organic traffic and establishes thought leadership.",
        explanation: "Focus on search intent, topic clusters, and consistent publishing schedule.",
        technical: "Target 1,500+ words for competitive keywords. Update old content quarterly.",
        example: "Topic cluster:\n• Pillar: 'Complete Guide to Running'\n• Supporting: 'Running shoes', 'Training plans', 'Injury prevention', 'Nutrition'",
        action: "What's your current organic traffic and top performing content?",
        content_calendar: [
          "Keyword-driven topics",
          "Seasonal content",
          "Product-related guides",
          "Industry news analysis"
        ]
      },
      advanced: {
        intro: "Data-driven content strategy for predictable organic growth.",
        explanation: "Use competitive analysis, search intent mapping, and content gap identification.",
        technical: "Implement hub-and-spoke model, optimize for featured snippets, track content ROI.",
        example: "Content types by funnel stage:\n• TOFU: Ultimate guides, statistics posts\n• MOFU: Comparison posts, case studies\n• BOFU: Product guides, ROI calculators",
        action: "Share your content performance metrics and link building results.",
        optimization_framework: [
          "Content refresh calendar",
          "Internal linking strategy",
          "Featured snippet optimization",
          "Multi-format repurposing"
        ]
      },
      expert: {
        intro: "Programmatic content strategy with predictive topic modeling.",
        explanation: "AI-assisted content creation, automated optimization, and multi-channel distribution.",
        technical: "Implement NLG for scale, semantic optimization, and dynamic content updates.",
        example: "Automated pipeline: Trend Detection → Content Brief → AI Draft → Human Edit → Multi-channel Distribution",
        action: "Content velocity needs and current automation stack?",
        scaling_tactics: [
          "Programmatic SEO",
          "AI content assistance",
          "Automated distribution",
          "Performance prediction models"
        ]
      }
    }
  },

  // Analytics Response Templates
  ANALYTICS: {
    conversion_tracking: {
      beginner: {
        intro: "Conversion tracking is like keeping score in a game - it tells you when you're winning!",
        explanation: "It shows you when someone does what you want them to do, like buying something or signing up.",
        technical: "Start by tracking one main action, like purchases or contact form submissions.",
        example: "If you have an online store:\n• Track when someone buys\n• See which ads brought them\n• Learn which products are popular",
        action: "What's the main action you want visitors to take on your website?",
        simple_metrics: [
          "How many people bought",
          "Where they came from",
          "What they bought",
          "How much they spent"
        ]
      },
      intermediate: {
        intro: "Proper conversion tracking enables data-driven optimization.",
        explanation: "Track micro and macro conversions across the customer journey.",
        technical: "Implement enhanced ecommerce, cross-domain tracking, and proper attribution windows.",
        example: "Conversion funnel:\n1. Page view\n2. Product view (micro)\n3. Add to cart (micro)\n4. Purchase (macro)\n5. Repeat purchase (macro)",
        action: "What's your current conversion rate and average order value?",
        tracking_checklist: [
          "Goal completions",
          "E-commerce tracking",
          "Event tracking",
          "Multi-channel funnels"
        ]
      },
      advanced: {
        intro: "Advanced conversion tracking for full-funnel optimization.",
        explanation: "Implement cross-device tracking, offline conversions, and custom attribution models.",
        technical: "Use data import API, measurement protocol, and custom dimensions. Build attribution models.",
        example: "Multi-touch attribution:\n• First touch: Blog post\n• Assist: Email nurture\n• Assist: Retargeting ad\n• Last touch: Brand search",
        action: "Current attribution model and conversion lag analysis?",
        advanced_tracking: [
          "Cross-device journeys",
          "Offline conversion import",
          "Custom channel groupings",
          "Calculated metrics"
        ]
      },
      expert: {
        intro: "Enterprise conversion tracking with predictive analytics.",
        explanation: "Machine learning attribution, incrementality testing, and customer lifetime value modeling.",
        technical: "Implement server-side tracking, BigQuery export, and custom ML models.",
        example: "Predictive model: Historical Data → Feature Engineering → Conversion Probability → Bid Optimization",
        action: "Data infrastructure and predictive modeling requirements?",
        enterprise_analytics: [
          "Server-side tracking",
          "Real-time dashboards",
          "Predictive modeling",
          "Data warehouse integration"
        ]
      }
    }
  }
};

/**
 * Helper function to get appropriate response template
 */
function getResponseTemplate(topic, subtopic, level) {
  const topicTemplates = ResponseTemplates[topic.toUpperCase()];
  if (!topicTemplates) return null;
  
  const subtopicTemplates = topicTemplates[subtopic];
  if (!subtopicTemplates) return null;
  
  return subtopicTemplates[level] || subtopicTemplates.beginner;
}

/**
 * Generate complete response based on template and context
 */
function generateAdaptiveResponse(topic, subtopic, level, context = {}) {
  const template = getResponseTemplate(topic, subtopic, level);
  if (!template) return null;
  
  let response = '';
  
  // Handle special structured templates (like email open_rates)
  if (template.sections) {
    response = `${template.intro}\n\n`;
    if (template.explanation) {
      response += `${template.explanation}\n\n`;
    }
    
    // Process sections
    Object.keys(template.sections).forEach(sectionKey => {
      const section = template.sections[sectionKey];
      if (level === 'beginner') {
        response += `**${section.title}**\n\n`;
        if (section.tips) {
          section.tips.forEach(tip => {
            response += `• ${tip}\n`;
          });
          response += '\n';
        }
      } else if (level === 'expert') {
        response += `**${section.title}**\n`;
        if (section.items) {
          section.items.forEach(item => {
            response += `• ${item}\n`;
          });
          response += '\n';
        }
      }
    });
    
    response += `${template.action}`;
    return response;
  }
  
  // Original template processing for standard formats
  if (level === 'beginner') {
    response = `${template.intro}\n\n`;
    if (template.explanation) {
      response += `${template.explanation}\n\n`;
    }
    if (template.technical) {
      response += `💡 **Quick tip**: ${template.technical}\n\n`;
    }
    if (template.example) {
      response += `**Example**:\n${template.example}\n\n`;
    }
    if (template.tips) {
      response += `**Getting started**:\n${template.tips.map(tip => `• ${tip}`).join('\n')}\n\n`;
    }
    response += `**Your turn**: ${template.action}`;
  } else if (level === 'intermediate') {
    response += `${template.intro}\n\n${template.explanation}\n\n`;
    response += `**Technical details**: ${template.technical}\n\n`;
    response += `**Example**:\n${template.example}\n\n`;
    if (template.testing_ideas || template.process) {
      const items = template.testing_ideas || template.process || template.best_practices;
      response += `**Key considerations**:\n${items.map(item => `• ${item}`).join('\n')}\n\n`;
    }
    response += `**Next step**: ${template.action}`;
  } else if (level === 'advanced') {
    response += `${template.intro}\n\n${template.technical}\n\n`;
    if (template.example) {
      response += `**Implementation**:\n${template.example}\n\n`;
    }
    if (template.optimization_factors || template.advanced_tactics) {
      const items = template.optimization_factors || template.advanced_tactics || template.optimization_areas;
      response += `**Optimization priorities**:\n${items.map(item => `• ${item}`).join('\n')}\n\n`;
    }
    response += `**Action**: ${template.action}`;
  } else if (level === 'expert') {
    response += `${template.intro}\n\n`;
    if (template.technical) {
      response += `${template.technical}\n\n`;
    }
    if (template.example) {
      response += `**Architecture**:\n${template.example}\n\n`;
    }
    if (template.advanced_analysis || template.enterprise_features) {
      const items = template.advanced_analysis || template.enterprise_features || template.enterprise_stack;
      response += `**Capabilities**:\n${items.map(item => `• ${item}`).join('\n')}\n\n`;
    }
    response += `**Requirements**: ${template.action}`;
  }
  
  // Add context-specific information
  if (context.includeMetrics && template.metrics_to_track) {
    response += `\n\n**Metrics to track**:\n${template.metrics_to_track.map(m => `• ${m}`).join('\n')}`;
  }
  
  if (context.includeTools && level === 'beginner' && template.tools) {
    response += `\n\n**Helpful tool**: ${template.tools}`;
  }
  
  return response;
}

export {
  ResponseTemplates,
  getResponseTemplate,
  generateAdaptiveResponse
};