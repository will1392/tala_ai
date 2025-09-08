/**
 * SpecializedStage - Routes queries to specialized marketing agents
 * 
 * Attempts to find and execute the best specialized agent for the query.
 * If no agent matches or execution fails, passes through to next stage.
 */

import { Stage } from '../Stage.js';
import { CMOResponse } from '../CMOResponse.js';
import agentRegistry from '../../agents/AgentRegistry.js';

export class SpecializedStage extends Stage {
  constructor(options = {}) {
    super('SpecializedStage', options);
    this.registry = options.registry || agentRegistry;
    this.confidenceThreshold = options.confidenceThreshold || 0.5;
  }

  async shouldProcess(input, context) {
    // Skip if already processed by an agent
    if (input.source?.startsWith('agent:')) {
      this.log('debug', 'Already processed by agent, skipping');
      return false;
    }
    
    // Skip if no channel detected
    if (!context.detected?.channel) {
      this.log('debug', 'No channel detected, skipping');
      return false;
    }
    
    return true;
  }

  async process(input, context) {
    const startTime = Date.now();
    
    try {
      // Try to get agent based on detected channel
      let agent = null;
      let agentChannel = null;
      
      if (context.detected?.channel) {
        // First try direct channel lookup
        this.log('info', `Looking for agent: ${context.detected.channel}`);
        agent = await this.registry.getAgent(context.detected.channel);
        agentChannel = context.detected.channel;
        
        // If not found, try to find best matching agent
        if (!agent) {
          this.log('info', 'Direct lookup failed, trying best match');
          agent = await this.registry.getBestAgent(input.content, {
            ...context,
            detectedChannel: context.detected.channel,
            detectedTopic: context.detected.topic
          });
          
          // Get the channel from the agent
          if (agent) {
            const agentInfo = this.registry.listAgents()
              .find(a => a.name === agent.constructor.name);
            agentChannel = agentInfo?.channel;
          }
        }
      }
      
      if (!agent) {
        this.log('info', 'No specialized agent found');
        this.metrics.skipped++;
        return input; // Pass through
      }
      
      this.log('info', `Executing agent: ${agentChannel}`);
      
      // Prepare agent input
      const agentInput = {
        query: input.content,
        userId: context.userId,
        expertise: context.expertise,
        ...context.detected,
        // Include any specific context from detection
        businessType: context.businessType,
        campaignGoal: context.campaignGoal,
        targetAudience: context.targetAudience,
        budget: context.budget,
        timeline: context.timeline
      };
      
      // Execute agent
      const agentResult = await agent.execute(agentInput);
      
      this.log('info', 'Agent execution complete', {
        status: agentResult?.status,
        hasContent: !!agentResult?.content
      });
      
      // Convert agent result to CMOResponse
      const response = this.convertAgentResponse(agentResult, agentChannel);
      
      // Mark as final if agent says so
      if (agentResult.final || response.confidence >= 0.9) {
        return response.asFinal();
      }
      
      this.metrics.processed++;
      this.metrics.totalTime += Date.now() - startTime;
      
      return response;
      
    } catch (error) {
      this.log('error', 'Agent execution failed', error);
      this.metrics.errors++;
      
      // Continue to next stage on error
      return input;
    }
  }

  /**
   * Convert agent response to CMOResponse format
   */
  convertAgentResponse(agentResult, agentChannel) {
    // Handle new format from DirectMailAgent
    if (agentResult.content && typeof agentResult.content === 'object') {
      return new CMOResponse({
        content: agentResult.content.text || '',
        structured: agentResult.content.structured || {},
        source: `agent:${agentChannel}`,
        confidence: this.parseConfidence(agentResult.content.confidence),
        metadata: {
          ...agentResult.metadata,
          agent: agentChannel,
          agentType: agentResult.type
        },
        ui: {
          citations: agentResult.content.citations || [],
          quickActions: this.extractQuickActions(agentResult),
          followUpQuestions: this.extractFollowUpQuestions(agentResult)
        }
      });
    }
    
    // Handle legacy format
    if (agentResult.status === 'success' && agentResult.data) {
      return new CMOResponse({
        content: agentResult.data.narrative || agentResult.data.summary || '',
        structured: {
          recommendations: agentResult.data.recommendations || [],
          actionItems: agentResult.data.actionItems || [],
          metrics: agentResult.data.metrics || {},
          examples: agentResult.data.examples || []
        },
        source: `agent:${agentChannel}`,
        confidence: 0.8,
        metadata: agentResult.metadata || {},
        ui: {
          citations: agentResult.data.citations || []
        }
      });
    }
    
    // Fallback for unknown formats
    return new CMOResponse({
      content: JSON.stringify(agentResult, null, 2),
      source: `agent:${agentChannel}`,
      confidence: 0.5,
      metadata: { rawResponse: agentResult }
    });
  }

  /**
   * Parse confidence value from various formats
   */
  parseConfidence(confidence) {
    if (typeof confidence === 'number') return confidence;
    if (confidence === 'high') return 0.9;
    if (confidence === 'medium') return 0.7;
    if (confidence === 'low') return 0.5;
    return 0.7; // default
  }

  /**
   * Extract quick actions from agent response
   */
  extractQuickActions(agentResult) {
    const actions = [];
    
    // From structured data
    if (agentResult.content?.structured?.nextSteps) {
      agentResult.content.structured.nextSteps.forEach(step => {
        actions.push({
          label: step,
          action: 'follow_up',
          data: { query: step }
        });
      });
    }
    
    // From legacy format
    if (agentResult.data?.actionItems) {
      agentResult.data.actionItems.slice(0, 3).forEach(item => {
        actions.push({
          label: item,
          action: 'task',
          data: { task: item }
        });
      });
    }
    
    return actions;
  }

  /**
   * Extract follow-up questions
   */
  extractFollowUpQuestions(agentResult) {
    const questions = [];
    
    // Look for questions in content
    if (agentResult.content?.text) {
      const questionMatches = agentResult.content.text.match(/Would you like.*\?/g);
      if (questionMatches) {
        questions.push(...questionMatches.slice(0, 2));
      }
    }
    
    // From structured data
    if (agentResult.content?.structured?.followUp) {
      questions.push(...agentResult.content.structured.followUp);
    }
    
    return questions;
  }
}

export default SpecializedStage;