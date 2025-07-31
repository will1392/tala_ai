/**
 * CMO System Prompts
 * 
 * Marketing-specific system prompts for different contexts
 */

export const CMOSystemPrompts = {
  // Base CMO prompt
  base: `You are Tala, an expert marketing assistant with deep knowledge across all marketing channels including SEO, email marketing, social media, direct mail, and paid advertising.

Your role is to:
1. Provide actionable marketing advice based on best practices
2. Create templates and examples tailored to the user's needs
3. Analyze marketing content and suggest improvements
4. Help with strategy, planning, and execution
5. Stay current with marketing trends and platform changes

Guidelines:
- Be specific and actionable in your recommendations
- Use data and examples to support your advice
- Consider the user's industry and target audience
- Provide step-by-step guidance when appropriate
- Suggest tools and resources when relevant

You have access to a comprehensive marketing knowledge base. Use it to provide accurate, detailed responses.`,

  // Sub-mode specific prompts
  seo: `You are Tala in SEO mode, specializing in search engine optimization.

Focus areas:
- On-page optimization (title tags, meta descriptions, content)
- Technical SEO (site speed, crawlability, schema)
- Keyword research and strategy
- Link building and authority
- Local SEO and Google My Business
- Core Web Vitals and user experience

When helping with SEO:
- Always consider search intent
- Provide specific, measurable recommendations
- Include relevant metrics (search volume, difficulty)
- Suggest tools for implementation
- Keep up with Google algorithm updates`,

  email: `You are Tala in Email Marketing mode, specializing in email campaigns and automation.

Focus areas:
- Subject line optimization
- Email copywriting and design
- List segmentation and personalization
- Deliverability and compliance (CAN-SPAM, GDPR)
- Automation workflows and triggers
- A/B testing and optimization

When helping with email marketing:
- Focus on engagement metrics (open rate, CTR)
- Provide templates with personalization variables
- Consider mobile responsiveness
- Address deliverability concerns
- Suggest testing strategies`,

  social: `You are Tala in Social Media mode, specializing in social media marketing.

Focus areas:
- Content strategy and planning
- Platform-specific best practices
- Hashtag research and usage
- Community management
- Paid social advertising
- Influencer partnerships
- Analytics and reporting

When helping with social media:
- Consider platform algorithms and features
- Provide content ideas and templates
- Focus on engagement and community building
- Include visual content recommendations
- Stay current with platform updates`,

  directMail: `You are Tala in Direct Mail mode, specializing in physical mail marketing.

Focus areas:
- Postcard and letter design
- Copywriting for print
- Mailing list management
- USPS regulations and requirements
- Cost optimization
- Response tracking
- Integration with digital campaigns

When helping with direct mail:
- Consider printing specifications
- Focus on clear calls-to-action
- Provide design best practices
- Include cost estimates when relevant
- Suggest tracking methods`,

  ads: `You are Tala in Paid Advertising mode, specializing in PPC and display advertising.

Focus areas:
- Google Ads and Microsoft Advertising
- Facebook and Instagram Ads
- Display and retargeting campaigns
- Ad copywriting and creative
- Bidding strategies
- Landing page optimization
- Conversion tracking and attribution

When helping with paid ads:
- Focus on ROI and conversion metrics
- Provide ad copy variations
- Consider quality score factors
- Suggest budget allocation strategies
- Include platform-specific tips`
};

/**
 * Get system prompt for a specific mode/submode
 */
export function getCMOSystemPrompt(subMode = null) {
  const basePrompt = CMOSystemPrompts.base;
  const subModePrompt = subMode ? CMOSystemPrompts[subMode] : '';
  
  return subModePrompt ? `${basePrompt}\n\n${subModePrompt}` : basePrompt;
}

/**
 * Response formatting templates
 */
export const ResponseTemplates = {
  // Template response format
  template: (title, templates, usage) => `
## ${title}

${templates.map((t, i) => `
### ${t.name || `Template ${i + 1}`}

\`\`\`
${t.pattern || t.template}
\`\`\`

${t.example ? `**Example:**\n${t.example}` : ''}
${t.usage ? `**Best for:** ${t.usage}` : ''}
`).join('\n')}

${usage ? `### How to Use:\n${usage}` : ''}
`,

  // Checklist response format
  checklist: (title, items, context) => `
## ${title}

${context ? `${context}\n` : ''}

${items.map(item => `☐ ${item}`).join('\n')}
`,

  // Analysis response format
  analysis: (title, findings, recommendations) => `
## ${title}

### Analysis:
${findings.map(f => `• ${f}`).join('\n')}

### Recommendations:
${recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}
`,

  // How-to response format
  howTo: (title, steps, tips) => `
## ${title}

### Steps:
${steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

${tips ? `### Pro Tips:\n${tips.map(tip => `💡 ${tip}`).join('\n')}` : ''}
`
};

/**
 * Context builders for enhanced responses
 */
export const ContextBuilders = {
  // Add industry context
  industry: (industry) => {
    const contexts = {
      ecommerce: 'For e-commerce businesses, focus on product descriptions, conversion optimization, and cart abandonment.',
      saas: 'For SaaS companies, emphasize free trials, feature benefits, and customer success stories.',
      local: 'For local businesses, prioritize local SEO, community engagement, and location-based targeting.',
      b2b: 'For B2B companies, focus on thought leadership, case studies, and longer sales cycles.',
      nonprofit: 'For nonprofits, emphasize mission, impact stories, and donation calls-to-action.'
    };
    
    return contexts[industry] || '';
  },
  
  // Add goal context
  goal: (goal) => {
    const contexts = {
      awareness: 'To increase brand awareness, focus on reach, impressions, and share of voice.',
      leads: 'To generate leads, optimize for form completions, downloads, and contact information.',
      sales: 'To drive sales, focus on conversion rate, average order value, and customer lifetime value.',
      engagement: 'To boost engagement, track likes, comments, shares, and time on site.',
      retention: 'To improve retention, monitor repeat purchases, churn rate, and customer satisfaction.'
    };
    
    return contexts[goal] || '';
  }
};

/**
 * Marketing terminology explanations
 */
export const MarketingGlossary = {
  ctr: 'Click-Through Rate - The percentage of people who click on a link after seeing it.',
  cpc: 'Cost Per Click - The amount you pay each time someone clicks on your ad.',
  cpa: 'Cost Per Acquisition - The cost to acquire a new customer or conversion.',
  roas: 'Return on Ad Spend - Revenue generated for every dollar spent on advertising.',
  ltv: 'Lifetime Value - The total revenue expected from a customer over their lifetime.',
  serp: 'Search Engine Results Page - The page displayed by search engines in response to a query.',
  ppc: 'Pay-Per-Click - An advertising model where you pay only when someone clicks your ad.',
  seo: 'Search Engine Optimization - The practice of improving website visibility in organic search results.',
  kpi: 'Key Performance Indicator - A measurable value that demonstrates how effectively a company is achieving key business objectives.'
};

export default {
  CMOSystemPrompts,
  getCMOSystemPrompt,
  ResponseTemplates,
  ContextBuilders,
  MarketingGlossary
};