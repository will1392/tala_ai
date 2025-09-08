import { DirectMailAgent } from '../cmo/agents/specialized/DirectMailAgent.js';
// Future imports
// import SEOAgent from './specialized/SEOAgent.js';
// import PPCAgent from './specialized/PPCAgent.js';
// import MetaAdsAgent from './specialized/MetaAdsAgent.js';

/**
 * Marketing Agent Router
 * Routes marketing queries to appropriate specialized agents
 */
export class MarketingAgentRouter {
  constructor() {
    console.log('🚀 MarketingAgentRouter: Constructor called');
    this.agents = new Map();
    this.agentInitialized = new Map();
  }

  /**
   * Lazy initialization of agents - only create when first needed
   */
  getOrCreateAgent(agentType) {
    // Check if already initialized
    if (this.agents.has(agentType)) {
      return this.agents.get(agentType);
    }

    // Check if we already tried and failed
    if (this.agentInitialized.has(agentType)) {
      return null;
    }

    // Try to initialize the agent
    try {
      let agent = null;
      
      switch (agentType) {
        case 'direct_mail':
          agent = new DirectMailAgent();
          console.log('✅ Initialized Direct Mail Agent');
          break;
        // TODO: Add other agents as they're created
        // case 'seo':
        //   agent = new SEOAgent();
        //   break;
        default:
          console.log(`⚠️ Unknown agent type: ${agentType}`);
      }
      
      if (agent) {
        this.agents.set(agentType, agent);
      }
      this.agentInitialized.set(agentType, true);
      return agent;
      
    } catch (error) {
      console.error(`❌ Failed to initialize ${agentType} agent:`, error.message);
      this.agentInitialized.set(agentType, false);
      return null;
    }
  }

  /**
   * Route query to appropriate specialized agent
   */
  async route(query, context = {}) {
    console.log('🚦 MarketingAgentRouter: Analyzing query for routing');
    console.log('🚦 MarketingAgentRouter: Query:', query.substring(0, 50) + '...');
    console.log('🚦 MarketingAgentRouter: Context:', {
      detectedChannel: context.detectedChannel,
      detectedTopic: context.detectedTopic,
      hasContext: !!context
    });
    
    // Detect which agent should handle this query
    const agentType = this.detectAgentType(query, context);
    console.log('🚦 MarketingAgentRouter: Detected agent type:', agentType);
    
    if (!agentType) {
      console.log('🚦 MarketingAgentRouter: No specialized agent detected, returning null');
      return null; // Let default CMO assistant handle it
    }

    const agent = this.getOrCreateAgent(agentType);
    if (!agent) {
      console.log(`⚠️ Agent ${agentType} detected but not available`);
      return null;
    }

    console.log(`🎯 Routing to ${agentType} agent`);
    
    // Execute the specialized agent
    try {
      console.log(`🚀 Executing ${agentType} agent with query:`, query.substring(0, 50) + '...');
      
      const result = await agent.execute({
        query,
        ...context
      });
      
      console.log(`✅ ${agentType} agent execution complete:`, {
        status: result?.status,
        hasContent: !!result?.content,
        hasData: !!result?.data,
        resultStructure: result ? Object.keys(result) : 'null result'
      });
      
      const formattedResponse = this.formatAgentResponse(result, agentType);
      console.log('🚀 MarketingAgentRouter: Formatted response:', {
        hasResponse: !!formattedResponse,
        responseType: formattedResponse?.type,
        hasContent: !!formattedResponse?.content
      });
      
      return formattedResponse;
    } catch (error) {
      console.error(`❌ Error executing ${agentType} agent:`, error);
      return null;
    }
  }

  /**
   * Detect which agent should handle the query
   */
  detectAgentType(query, context) {
    const queryLower = query?.toLowerCase() || '';
    
    // Check if user explicitly wants V2
    if (queryLower.includes('v2') && (queryLower.includes('postcard') || queryLower.includes('direct mail'))) {
      console.log('🔍 User explicitly requested V2 direct mail agent');
      return 'direct_mail_v2';
    }
    
    // Check conversation history for ongoing conversations
    if (context.conversationHistory && context.conversationHistory.length > 0) {
      console.log('🔍 Checking conversation history for context...');
      
      // Check if V2 was used earlier in the conversation
      let v2Started = false;
      for (const msg of context.conversationHistory) {
        const msgText = (msg.content || '').toLowerCase();
        if (msgText.includes('v2') && (msgText.includes('postcard') || msgText.includes('direct mail'))) {
          v2Started = true;
          console.log('🔍 Found V2 context in conversation history - continuing with V2');
          break;
        }
      }
      
      if (v2Started) {
        return 'direct_mail_v2';
      }
      
      // Otherwise check for regular direct mail context
      const recentMessages = context.conversationHistory.slice(-3);
      for (const msg of recentMessages) {
        const msgText = (msg.content || '').toLowerCase();
        if (msgText.includes('postcard') || msgText.includes('direct mail') || msgText.includes('mailer')) {
          console.log('🔍 Found direct mail context in conversation history');
          return 'direct_mail';
        }
      }
    }
    
    // First check if we have a detected channel from context analysis
    if (context.detectedChannel) {
      console.log('🔍 Using detected channel from context analysis:', context.detectedChannel);
      // Map channels to agent types
      if (context.detectedChannel === 'direct_mail') {
        return 'direct_mail';
      }
      // TODO: Add other channel mappings as agents are implemented
    }
    
    // Fall back to pattern matching
    console.log('🔍 Using pattern matching for agent detection');
    
    // Direct Mail detection
    const directMailPatterns = [
      /direct mail/i,
      /postcard/i,
      /mailer/i,
      /postal campaign/i,
      /mailing list/i,
      /print marketing/i,
      /mail campaign/i,
      /letter campaign/i,
      /catalog marketing/i,
      /brochure/i
    ];
    
    if (directMailPatterns.some(pattern => pattern.test(queryLower))) {
      return 'direct_mail';
    }
    
    // SEO detection (for future)
    const seoPatterns = [
      /\bseo\b/i,
      /search engine optimization/i,
      /organic traffic/i,
      /keyword research/i,
      /backlink/i,
      /page rank/i,
      /meta tags/i,
      /serp/i
    ];
    
    if (seoPatterns.some(pattern => pattern.test(queryLower))) {
      return 'seo';
    }
    
    // PPC detection (for future)
    const ppcPatterns = [
      /\bppc\b/i,
      /pay per click/i,
      /google ads/i,
      /adwords/i,
      /\bcpc\b/i,
      /cost per click/i,
      /paid search/i,
      /bidding strategy/i
    ];
    
    if (ppcPatterns.some(pattern => pattern.test(queryLower))) {
      return 'ppc';
    }
    
    // Meta Ads detection (for future)
    const metaAdsPatterns = [
      /facebook ads/i,
      /instagram ads/i,
      /meta ads/i,
      /social media advertising/i,
      /facebook campaign/i,
      /instagram marketing/i
    ];
    
    if (metaAdsPatterns.some(pattern => pattern.test(queryLower))) {
      return 'meta_ads';
    }
    
    return null;
  }

  /**
   * Format agent response for CMO system integration
   */
  formatAgentResponse(agentResult, agentType) {
    if (!agentResult || agentResult.status === 'blocked') {
      return null;
    }
    
    console.log('🔍 MarketingAgentRouter formatAgentResponse:', {
      hasContent: !!agentResult.content,
      hasData: !!agentResult.data,
      resultKeys: Object.keys(agentResult)
    });
    
    // Handle new format from DirectMailAgent
    if (agentResult.content && agentResult.content.text) {
      console.log('📬 Using new agent response format');
      return {
        type: 'specialized_agent_response',
        agent: agentType,
        content: agentResult.content,  // Pass through the entire content object
        metadata: {
          ...agentResult.metadata,
          specialized: true,
          agentType: agentType
        }
      };
    }
    
    // Handle old format (fallback)
    console.log('📬 Using legacy agent response format');
    return {
      type: 'specialized_agent_response',
      agent: agentType,
      content: {
        text: this.buildResponseText(agentResult),
        structured: agentResult.data,
        citations: agentResult.data?.citations || [],
        confidence: agentResult.metadata?.confidence || 'medium'
      },
      metadata: {
        ...agentResult.metadata,
        specialized: true,
        agentType: agentType
      }
    };
  }

  /**
   * Build formatted response text from agent data
   */
  buildResponseText(agentResult) {
    const { data } = agentResult;
    let text = '';
    
    // Summary
    if (data.summary) {
      text += `${data.summary}\n\n`;
    }
    
    // Recommendations
    if (data.recommendations && data.recommendations.length > 0) {
      text += '## Recommendations\n';
      data.recommendations.forEach((rec, i) => {
        text += `${i + 1}. ${rec}\n`;
      });
      text += '\n';
    }
    
    // Action Items
    if (data.actionItems && data.actionItems.length > 0) {
      text += '## Action Items\n';
      data.actionItems.forEach((action, i) => {
        text += `${i + 1}. ${action}\n`;
      });
      text += '\n';
    }
    
    // Metrics
    if (data.metrics && Object.keys(data.metrics).length > 0) {
      text += '## Key Metrics\n';
      Object.entries(data.metrics).forEach(([key, value]) => {
        const formattedKey = key.replace(/([A-Z])/g, ' $1').trim();
        text += `- **${formattedKey}**: ${value}\n`;
      });
      text += '\n';
    }
    
    // Citations note
    if (data.citations && data.citations.length > 0) {
      text += `\n*Based on ${data.citations.length} sources from our knowledge base*`;
    }
    
    return text.trim();
  }
}

// Singleton instance
const marketingAgentRouter = new MarketingAgentRouter();
export default marketingAgentRouter;