/**
 * EnhancementStage - Enhances responses with formatting, structure, and metadata
 * 
 * Final stage that adds presentation elements, formatting, and additional
 * context to responses without overwriting specialized content.
 */

import { Stage } from '../Stage.js';
import { CMOResponse } from '../CMOResponse.js';

export class EnhancementStage extends Stage {
  constructor(responseEnhancer, options = {}) {
    super('EnhancementStage', options);
    this.responseEnhancer = responseEnhancer;
    this.preserveSpecialized = options.preserveSpecialized !== false; // Default true
  }

  async shouldProcess(input, context) {
    // Never enhance if response is from specialized agent and flag is set
    if (this.preserveSpecialized && input.source?.startsWith('agent:')) {
      this.log('info', 'Preserving specialized agent response');
      return false;
    }
    
    // Skip if explicitly disabled
    if (context.skipEnhancement) {
      this.log('debug', 'Enhancement disabled by context');
      return false;
    }
    
    // Skip if no content to enhance
    if (!input.hasContent()) {
      this.log('debug', 'No content to enhance');
      return false;
    }
    
    return true;
  }

  async process(input, context) {
    const startTime = Date.now();
    
    try {
      this.log('info', 'Enhancing response', {
        source: input.source,
        hasStructured: Object.keys(input.structured).length > 0
      });
      
      // Different enhancement strategies based on source
      let enhanced;
      
      if (input.source === 'knowledge_base') {
        enhanced = await this.enhanceKnowledgeResponse(input, context);
      } else if (input.source?.startsWith('merged:')) {
        enhanced = await this.enhanceMergedResponse(input, context);
      } else {
        enhanced = await this.enhanceGenericResponse(input, context);
      }
      
      // Add final touches
      enhanced = this.addFinalTouches(enhanced, context);
      
      this.metrics.processed++;
      this.metrics.totalTime += Date.now() - startTime;
      
      return enhanced;
      
    } catch (error) {
      this.log('error', 'Enhancement failed', error);
      this.metrics.errors++;
      return input; // Return original on error
    }
  }

  /**
   * Enhance knowledge base responses
   */
  async enhanceKnowledgeResponse(input, context) {
    let enhanced = input;
    
    // Add contextual introduction if missing
    if (!input.content.includes('knowledge base')) {
      const intro = this.getContextualIntro(context);
      enhanced = enhanced.withContent(content => intro + content);
    }
    
    // Add benchmarks if relevant
    if (context.detected?.patterns?.includes('hasGoal')) {
      const benchmarks = await this.getBenchmarks(context.detected.channel);
      if (benchmarks) {
        enhanced = enhanced.withStructured(structured => ({
          ...structured,
          benchmarks
        }));
        
        // Add to content
        let benchmarkContent = '\n\n📊 **Industry Benchmarks:**\n';
        Object.entries(benchmarks).forEach(([metric, value]) => {
          benchmarkContent += `• ${metric}: ${value}\n`;
        });
        
        enhanced = enhanced.withContent(content => content + benchmarkContent);
      }
    }
    
    // Add tips based on expertise
    if (context.expertise === 'beginner') {
      const tips = this.getBeginnerTips(context.detected?.channel);
      if (tips.length > 0) {
        enhanced = enhanced.withUI({
          tips: tips
        });
      }
    }
    
    return enhanced;
  }

  /**
   * Enhance merged responses (agent + KB)
   */
  async enhanceMergedResponse(input, context) {
    // Ensure smooth transitions between sections
    let content = input.content;
    
    // Add section headers if missing
    if (content.includes('---') && !content.includes('Additional Resources')) {
      content = content.replace('---', '---\n\n## Additional Resources from Knowledge Base');
    }
    
    return input.withContent(content);
  }

  /**
   * Enhance generic responses
   */
  async enhanceGenericResponse(input, context) {
    // Use the response enhancer for generic responses
    const enhancedData = await this.responseEnhancer.enhance({
      content: input.content,
      queryType: context.detected?.intent || 'general',
      topic: context.detected?.channel || 'general'
    });
    
    return input
      .withContent(enhancedData.content || input.content)
      .withStructured(structured => ({
        ...structured,
        ...enhancedData.structured
      }))
      .withUI({
        quickTip: enhancedData.quickTip,
        relatedTopics: enhancedData.relatedTopics
      });
  }

  /**
   * Add final touches to any response
   */
  addFinalTouches(response, context) {
    let enhanced = response;
    
    // Add call-to-action if missing
    if (!response.content.includes('?') && 
        !response.content.includes('Would you') && 
        !response.content.includes('Let me know')) {
      const cta = this.getCallToAction(context);
      enhanced = enhanced.withContent(content => content + '\n\n' + cta);
    }
    
    // Add metadata about processing
    enhanced = enhanced.withUI({
      processingMetadata: {
        enhanced: true,
        channel: context.detected?.channel,
        intent: context.detected?.intent,
        patterns: context.detected?.patterns || []
      }
    });
    
    // Ensure proper markdown formatting
    enhanced = enhanced.withContent(content => this.ensureMarkdownFormatting(content));
    
    return enhanced;
  }

  /**
   * Get contextual introduction
   */
  getContextualIntro(context) {
    const { intent, channel } = context.detected || {};
    
    const intros = {
      howto: `I'll guide you through this ${channel || 'marketing'} process step by step.\n\n`,
      comparison: `Let me help you compare these ${channel || 'marketing'} options.\n\n`,
      analysis: `Here's my analysis of your ${channel || 'marketing'} situation.\n\n`,
      general: `Here's what you need to know about ${channel || 'this marketing topic'}.\n\n`
    };
    
    return intros[intent] || intros.general;
  }

  /**
   * Get relevant benchmarks
   */
  async getBenchmarks(channel) {
    // In production, these would come from a data source
    const benchmarks = {
      direct_mail: {
        'Response Rate': '2-5% (industry average)',
        'ROI': '$1.20-$1.50 per $1 spent',
        'Cost per Piece': '$0.50-$2.00'
      },
      email: {
        'Open Rate': '20-25% (industry average)',
        'Click Rate': '2-3% (industry average)',
        'Conversion Rate': '1-2%'
      },
      social: {
        'Engagement Rate': '1-3% (industry average)',
        'Click-Through Rate': '0.9-1.5%',
        'Cost per Click': '$0.50-$2.00'
      }
    };
    
    return benchmarks[channel] || null;
  }

  /**
   * Get tips for beginners
   */
  getBeginnerTips(channel) {
    const tips = {
      direct_mail: [
        'Start with a small test mailing before scaling up',
        'Always include a clear call-to-action',
        'Track responses with unique codes or phone numbers'
      ],
      email: [
        'Test your subject lines with A/B testing',
        'Keep emails mobile-friendly',
        'Send at optimal times (Tuesday-Thursday, 10am-2pm)'
      ],
      social: [
        'Post consistently rather than sporadically',
        'Use high-quality visuals',
        'Engage with comments within the first hour'
      ]
    };
    
    return tips[channel] || [];
  }

  /**
   * Get appropriate call-to-action
   */
  getCallToAction(context) {
    const { patterns = [] } = context.detected || {};
    
    if (patterns.includes('hasProblem')) {
      return "Would you like me to help you develop a specific solution for this challenge?";
    }
    
    if (patterns.includes('hasGoal')) {
      return "I can help you create a detailed plan to achieve this goal. Would you like to explore specific strategies?";
    }
    
    if (patterns.includes('hasTimeline')) {
      return "Given your timeline, would you like me to prioritize the most impactful actions you can take?";
    }
    
    return "Is there any specific aspect of this topic you'd like me to elaborate on?";
  }

  /**
   * Ensure proper markdown formatting
   */
  ensureMarkdownFormatting(content) {
    // Fix common markdown issues
    return content
      // Ensure headers have proper spacing
      .replace(/\n(#{1,6})\s*([^\n]+)/g, '\n\n$1 $2')
      // Ensure lists have proper spacing
      .replace(/\n([-*•])\s+/g, '\n$1 ')
      // Remove excessive blank lines
      .replace(/\n{3,}/g, '\n\n')
      // Ensure ending newline
      .trim() + '\n';
  }
}

export default EnhancementStage;