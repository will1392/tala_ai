/**
 * KnowledgeBaseStage - Searches CMO knowledge base for relevant information
 * 
 * Fallback stage that searches the knowledge base when specialized agents
 * don't have high-confidence responses.
 */

import { Stage } from '../Stage.js';
import { CMOResponse } from '../CMOResponse.js';

export class KnowledgeBaseStage extends Stage {
  constructor(knowledgeBase, options = {}) {
    super('KnowledgeBaseStage', options);
    this.knowledgeBase = knowledgeBase;
    this.minResults = options.minResults || 1;
    this.maxResults = options.maxResults || 5;
    this.relevanceThreshold = options.relevanceThreshold || 0.7;
  }

  async shouldProcess(input, context) {
    // Skip if already has high-confidence content
    if (input.confidence >= 0.8 && input.hasContent()) {
      this.log('debug', 'High confidence content exists, skipping KB search');
      return false;
    }
    
    // Skip if explicitly disabled
    if (context.includeKnowledge === false) {
      this.log('debug', 'Knowledge base search disabled');
      return false;
    }
    
    return true;
  }

  async process(input, context) {
    const startTime = Date.now();
    
    try {
      // Build search query
      const searchQuery = this.buildSearchQuery(input, context);
      
      this.log('info', 'Searching knowledge base', {
        query: searchQuery.substring(0, 50) + '...',
        category: context.detected?.channel
      });
      
      // Search knowledge base
      const searchOptions = {
        category: context.detected?.channel,
        limit: this.maxResults,
        threshold: this.relevanceThreshold,
        includeMetadata: true
      };
      
      const results = await this.knowledgeBase.search(searchQuery, searchOptions);
      
      this.log('info', `Found ${results.length} results`);
      
      if (results.length === 0) {
        this.metrics.skipped++;
        return input; // Pass through with no changes
      }
      
      // Build response from KB results
      const kbResponse = this.buildKnowledgeResponse(results, input, context);
      
      // Merge with existing response if needed
      if (input.hasContent() && input.confidence > 0.5) {
        this.log('debug', 'Merging KB results with existing content');
        return input.merge(kbResponse);
      }
      
      this.metrics.processed++;
      this.metrics.totalTime += Date.now() - startTime;
      
      return kbResponse;
      
    } catch (error) {
      this.log('error', 'Knowledge base search failed', error);
      this.metrics.errors++;
      return input; // Pass through on error
    }
  }

  /**
   * Build optimized search query
   */
  buildSearchQuery(input, context) {
    let query = input.content;
    
    // Enhance with detected context
    if (context.detected) {
      if (context.detected.keywords?.length > 0) {
        query += ' ' + context.detected.keywords.join(' ');
      }
      
      if (context.detected.topic && context.detected.topic !== 'general') {
        query += ' ' + context.detected.topic;
      }
    }
    
    // Add business context if available
    if (context.businessType) {
      query += ' ' + context.businessType;
    }
    
    return query;
  }

  /**
   * Build response from knowledge base results
   */
  buildKnowledgeResponse(results, input, context) {
    const topResults = results.slice(0, Math.min(3, results.length));
    
    // Build content from results
    let content = '';
    const structured = {
      sources: [],
      concepts: new Set(),
      tools: [],
      templates: []
    };
    
    // Add intro based on query type
    if (context.detected?.intent === 'howto') {
      content = "Based on our knowledge base, here's how to approach this:\n\n";
    } else if (context.detected?.intent === 'comparison') {
      content = "Here's what our knowledge base says about this comparison:\n\n";
    } else {
      content = "Here's relevant information from our marketing knowledge base:\n\n";
    }
    
    // Process each result
    topResults.forEach((result, index) => {
      // Add to content
      if (index > 0) content += '\n\n---\n\n';
      
      // Format based on result type
      if (result.type === 'guide' || result.type === 'howto') {
        content += `### ${result.title}\n\n${result.content}`;
      } else if (result.type === 'template') {
        content += `### Template: ${result.title}\n\n${result.content}`;
        structured.templates.push({
          name: result.title,
          category: result.category,
          description: result.metadata?.description
        });
      } else if (result.type === 'tool') {
        content += `### Tool: ${result.title}\n\n${result.content}`;
        structured.tools.push({
          name: result.title,
          purpose: result.metadata?.purpose,
          link: result.metadata?.link
        });
      } else {
        content += `### ${result.title}\n\n${result.content}`;
      }
      
      // Track sources
      structured.sources.push({
        title: result.title,
        type: result.type,
        category: result.category,
        relevance: result.score
      });
      
      // Extract concepts
      if (result.metadata?.tags) {
        result.metadata.tags.forEach(tag => structured.concepts.add(tag));
      }
    });
    
    // Add helpful footer
    if (topResults.length < results.length) {
      content += `\n\n*Found ${results.length} relevant resources. Showing top ${topResults.length}.*`;
    }
    
    // Convert concepts to array
    structured.concepts = Array.from(structured.concepts);
    
    // Build citations
    const citations = topResults.map(result => ({
      type: 'knowledge_base',
      source: result.title,
      category: result.category,
      relevance: result.score
    }));
    
    return new CMOResponse({
      content,
      structured,
      source: 'knowledge_base',
      confidence: this.calculateConfidence(results),
      metadata: {
        totalResults: results.length,
        resultsShown: topResults.length,
        avgRelevance: this.avgScore(topResults)
      },
      ui: {
        citations,
        quickActions: this.extractQuickActions(topResults)
      }
    });
  }

  /**
   * Calculate confidence based on search results
   */
  calculateConfidence(results) {
    if (results.length === 0) return 0;
    
    const topScore = results[0].score;
    const resultCount = Math.min(results.length, 5);
    
    // Higher confidence with better matches and more results
    return Math.min(0.9, (topScore * 0.7) + (resultCount * 0.06));
  }

  /**
   * Calculate average score
   */
  avgScore(results) {
    if (results.length === 0) return 0;
    const sum = results.reduce((acc, r) => acc + r.score, 0);
    return sum / results.length;
  }

  /**
   * Extract quick actions from KB results
   */
  extractQuickActions(results) {
    const actions = [];
    
    // Add template actions
    const templates = results.filter(r => r.type === 'template').slice(0, 2);
    templates.forEach(template => {
      actions.push({
        label: `Use ${template.title} template`,
        action: 'use_template',
        data: { templateId: template.id, title: template.title }
      });
    });
    
    // Add tool actions
    const tools = results.filter(r => r.type === 'tool').slice(0, 2);
    tools.forEach(tool => {
      actions.push({
        label: `Open ${tool.title}`,
        action: 'open_tool',
        data: { toolId: tool.id, link: tool.metadata?.link }
      });
    });
    
    // Add learning action if many results
    if (results.length > 3) {
      actions.push({
        label: 'View all resources',
        action: 'view_all',
        data: { resultCount: results.length }
      });
    }
    
    return actions;
  }
}

export default KnowledgeBaseStage;