import DirectMailAgent from './specialized/DirectMailAgent.js';
// Import other specialized agents as you create them
// import SEOAgent from './specialized/SEOAgent.js';
// import PPCAgent from './specialized/PPCAgent.js';
// import MetaAdsAgent from './specialized/MetaAdsAgent.js';

/**
 * Register specialized marketing agents with the agent orchestrator
 */
export function registerSpecializedAgents(agentRegistry) {
  console.log('📬 Registering specialized marketing agents...');
  
  // Register Direct Mail Agent
  try {
    const directMailAgent = new DirectMailAgent();
    agentRegistry.register('direct-mail', directMailAgent);
    console.log('✅ Registered Direct Mail Agent');
  } catch (error) {
    console.error('❌ Failed to register Direct Mail Agent:', error);
  }
  
  // Register other agents as they're created
  // TODO: Add SEO, PPC, Meta Ads agents
  
  return agentRegistry;
}

/**
 * Middleware to detect when to use specialized agents
 */
export function specializedAgentMiddleware(req, res, next) {
  const { mode, query, context } = req.body;
  
  // Check if we're in marketing/CMO mode
  if (mode === 'marketing' || mode === 'cmo') {
    // Detect which specialized agent to use based on query
    const agentType = detectSpecializedAgent(query, context);
    
    if (agentType) {
      req.specializedAgent = agentType;
      console.log(`🎯 Routing to specialized agent: ${agentType}`);
    }
  }
  
  next();
}

/**
 * Detect which specialized agent to use based on query content
 */
function detectSpecializedAgent(query, context) {
  const queryLower = query?.toLowerCase() || '';
  
  // Direct Mail keywords
  const directMailKeywords = [
    'direct mail', 'postcard', 'mailer', 'postal', 
    'mailing list', 'print marketing', 'mail campaign',
    'letter campaign', 'catalog', 'brochure'
  ];
  
  if (directMailKeywords.some(keyword => queryLower.includes(keyword))) {
    return 'direct-mail';
  }
  
  // SEO keywords (for future)
  const seoKeywords = [
    'seo', 'search engine', 'organic traffic', 'keyword',
    'backlink', 'page rank', 'meta tags', 'serp'
  ];
  
  if (seoKeywords.some(keyword => queryLower.includes(keyword))) {
    return 'seo'; // Will use this when SEO agent is ready
  }
  
  // PPC keywords (for future)
  const ppcKeywords = [
    'ppc', 'pay per click', 'google ads', 'adwords',
    'cpc', 'cost per click', 'ad campaign', 'bidding'
  ];
  
  if (ppcKeywords.some(keyword => queryLower.includes(keyword))) {
    return 'ppc'; // Will use this when PPC agent is ready
  }
  
  // Add more agent detection logic as needed
  
  return null; // No specialized agent detected
}