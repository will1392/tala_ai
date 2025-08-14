/**
 * Marketing Terms Help Content
 * Explanations for marketing concepts in the assessment
 */

export interface HelpContent {
  term: string;
  simple: string;
  detailed: string;
  example?: string;
  why?: string;
  howToAnswer?: string;
}

export const marketingHelp: Record<string, HelpContent> = {
  // Business & Audience
  'ideal_client_profile': {
    term: 'Ideal Client Profile (ICP)',
    simple: 'A detailed description of your perfect customer',
    detailed: 'An ICP defines exactly who would benefit most from your product/service - their demographics (age, location), psychographics (values, interests), pain points, and buying behavior.',
    example: 'For a B2B software company: "Tech companies with 50-200 employees, $10M+ revenue, using outdated systems, needing automation"',
    why: 'Knowing your ICP helps you focus marketing efforts on the right people, saving time and money',
    howToAnswer: 'Think about your best current customers. What do they have in common? If you\'re just starting, imagine who would benefit most from what you offer.'
  },
  
  'tam_known': {
    term: 'Total Addressable Market (TAM)',
    simple: 'The total number of potential customers for your business',
    detailed: 'TAM represents the total revenue opportunity available if you achieved 100% market share. It helps you understand the size of your opportunity.',
    example: 'If there are 100,000 businesses that could use your software, and they\'d each pay $1,000/year, your TAM is $100M',
    why: 'TAM helps you understand if your market is big enough to support your growth goals',
    howToAnswer: 'Even a rough estimate is helpful. Think: How many potential customers exist? What would they pay?'
  },
  
  'unique_value_prop': {
    term: 'Unique Value Proposition (UVP)',
    simple: 'What makes your business different and better than competitors',
    detailed: 'Your UVP is the clear statement that describes the benefit you offer, how you solve customer needs, and what distinguishes you from the competition.',
    example: '"We help small businesses save 10 hours per week on accounting with AI-powered automation" - specific, measurable, unique',
    why: 'A clear UVP helps customers quickly understand why they should choose you',
    howToAnswer: 'Rate how clearly you can explain why customers should choose you over alternatives (including doing nothing)'
  },
  
  // Analytics & Tracking
  'ga4_installed': {
    term: 'Google Analytics 4 (GA4)',
    simple: 'Free tool from Google that tracks website visitors and their behavior',
    detailed: 'GA4 is the latest version of Google Analytics. It tracks who visits your website, what pages they view, how long they stay, and what actions they take.',
    example: 'GA4 can tell you: "500 people visited your site yesterday, 50 filled out a contact form, most came from Google search"',
    why: 'Without GA4, you\'re marketing blind - you can\'t see what\'s working or what needs improvement',
    howToAnswer: 'Check if you have a Google Analytics account and if the tracking code is on your website. Look for "GA4" or "G-" in your tracking ID.'
  },
  
  'gsc_access': {
    term: 'Google Search Console (GSC)',
    simple: 'Free tool that shows how your website appears in Google search results',
    detailed: 'GSC shows what keywords people use to find you, your search rankings, click-through rates, and any technical issues Google finds with your site.',
    example: 'GSC might show: "Your page ranks #3 for \'best coffee shop downtown\' and gets 200 clicks per month"',
    why: 'GSC is essential for SEO - it\'s the only way to see exactly how Google views your site',
    howToAnswer: 'Have you verified your website with Google Search Console? Can you log in and see data?'
  },
  
  'conversion_tracking': {
    term: 'Conversion Tracking',
    simple: 'Measuring when visitors complete desired actions on your website',
    detailed: 'Conversion tracking records when someone does what you want them to do - buy something, fill out a form, sign up for a newsletter, etc.',
    example: 'If 100 people visit your site and 5 make a purchase, your conversion rate is 5%',
    why: 'Without conversion tracking, you don\'t know if your marketing is actually generating results',
    howToAnswer: 'Select all the important actions you currently track on your website'
  },
  
  'tag_manager': {
    term: 'Google Tag Manager (GTM)',
    simple: 'A tool that makes it easier to add and manage tracking codes on your website',
    detailed: 'GTM is a container that holds all your tracking codes (GA4, Facebook Pixel, etc.) in one place, letting you manage them without editing website code.',
    example: 'Instead of asking a developer to add tracking codes, you can do it yourself through GTM\'s interface',
    why: 'GTM saves time and reduces errors when managing multiple tracking tools',
    howToAnswer: 'Do you have GTM installed? Look for "GTM-" in your website code or have a Tag Manager account'
  },
  
  'crm_system': {
    term: 'CRM System',
    simple: 'Software that manages your customer relationships and interactions',
    detailed: 'CRM (Customer Relationship Management) stores all customer information, tracks interactions, manages sales pipelines, and helps nurture relationships.',
    example: 'Your CRM shows: "John Smith - talked 3 times, interested in Product A, follow up next Tuesday"',
    why: 'A CRM ensures no leads fall through the cracks and helps you build stronger customer relationships',
    howToAnswer: 'How do you currently track customer information and interactions?'
  },
  
  // Marketing Channels
  'ppc_experience': {
    term: 'PPC (Pay-Per-Click) Advertising',
    simple: 'Ads where you pay each time someone clicks',
    detailed: 'PPC includes Google Ads, Facebook Ads, LinkedIn Ads - any platform where you bid on ad placement and pay per click.',
    example: 'You bid $2 per click for "plumber near me". If 100 people click, you pay $200',
    why: 'PPC can drive immediate traffic and sales, but requires skill to be profitable',
    howToAnswer: 'What\'s your experience running paid ads on Google, Facebook, or other platforms?'
  },
  
  'seo_status': {
    term: 'SEO (Search Engine Optimization)',
    simple: 'Making your website show up higher in Google search results',
    detailed: 'SEO involves optimizing your website content, structure, and links so search engines rank you higher for relevant searches.',
    example: 'Good SEO might move you from page 3 to page 1 of Google for "best Italian restaurant Chicago"',
    why: 'SEO drives "free" traffic - people finding you naturally through search',
    howToAnswer: 'What have you done to improve your website\'s search rankings?'
  },
  
  'email_marketing': {
    term: 'Email Marketing',
    simple: 'Sending promotional or informational emails to a list of subscribers',
    detailed: 'Email marketing includes newsletters, promotional campaigns, automated welcome series, and nurture sequences to build relationships and drive sales.',
    example: 'Weekly newsletter to 1,000 subscribers sharing tips and promoting your services',
    why: 'Email has the highest ROI of any marketing channel - $42 return for every $1 spent on average',
    howToAnswer: 'How sophisticated is your email marketing program?'
  },
  
  // Budget & Resources
  'monthly_budget': {
    term: 'Marketing Budget',
    simple: 'How much money you can spend on marketing each month',
    detailed: 'Your marketing budget includes ad spend, tools/software, content creation, agency fees, and any other marketing expenses.',
    example: '$2,000/month might break down as: $1,000 ads, $500 tools, $500 content creation',
    why: 'Your budget determines which marketing strategies are realistic for your business',
    howToAnswer: 'Include all marketing costs: ads, tools, freelancers, content, etc. If $0, that\'s OK - we\'ll focus on free strategies'
  },
  
  'marketing_team': {
    term: 'Marketing Team Structure',
    simple: 'Who handles your marketing activities',
    detailed: 'This ranges from doing it yourself, to having dedicated staff, to working with agencies or freelancers.',
    example: 'Many small businesses start with the owner doing marketing, then hire a part-time marketer, then build a team',
    why: 'Your team structure determines how much marketing work you can realistically accomplish',
    howToAnswer: 'Who currently handles your marketing tasks? Be honest about your current situation'
  },
  
  // Goals & Metrics
  'success_metrics': {
    term: 'Marketing Success Metrics',
    simple: 'The numbers you track to know if marketing is working',
    detailed: 'Key metrics include website traffic, leads generated, conversion rates, customer acquisition cost (CAC), lifetime value (LTV), and ROI.',
    example: 'Tracking: "We got 50 leads this month, 10 became customers, average sale $500, spent $1000 on marketing"',
    why: 'Without metrics, you can\'t improve - you don\'t know what\'s working or what\'s not',
    howToAnswer: 'Which numbers do you currently track to measure marketing success?'
  },
  
  'roas': {
    term: 'ROAS (Return on Ad Spend)',
    simple: 'How much revenue you make for every dollar spent on ads',
    detailed: 'ROAS = Revenue from ads ÷ Ad spend. A ROAS of 3:1 means you make $3 for every $1 spent on ads.',
    example: 'Spent $1,000 on Facebook ads, generated $4,000 in sales = 4:1 ROAS',
    why: 'ROAS tells you if your paid advertising is profitable',
    howToAnswer: 'If you run ads, do you track how much revenue they generate?'
  },
  
  'cac': {
    term: 'CAC (Customer Acquisition Cost)',
    simple: 'How much it costs to get one new customer',
    detailed: 'CAC = Total marketing & sales costs ÷ Number of new customers acquired',
    example: 'Spent $5,000 on marketing, got 50 new customers = $100 CAC',
    why: 'CAC must be less than customer lifetime value (LTV) for sustainable growth',
    howToAnswer: 'Do you know how much you spend to acquire each new customer?'
  },
  
  'ltv': {
    term: 'LTV (Customer Lifetime Value)',
    simple: 'Total revenue from a customer over their entire relationship with you',
    detailed: 'LTV = Average purchase value × Purchase frequency × Customer lifespan',
    example: 'Customer spends $100/month for 24 months = $2,400 LTV',
    why: 'Knowing LTV tells you how much you can afford to spend acquiring customers',
    howToAnswer: 'Do you track how much revenue an average customer generates over time?'
  }
};

/**
 * Get help content for a question
 */
export function getHelpForQuestion(questionId: string): HelpContent | undefined {
  return marketingHelp[questionId];
}

/**
 * Get simple explanation
 */
export function getSimpleExplanation(questionId: string): string {
  const help = marketingHelp[questionId];
  return help?.simple || 'No explanation available for this term.';
}

/**
 * Check if help is available for a question
 */
export function hasHelp(questionId: string): boolean {
  return !!marketingHelp[questionId];
}