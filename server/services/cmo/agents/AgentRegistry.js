/**
 * AgentRegistry - Central registry for all specialized marketing agents
 * 
 * Provides automatic registration, confidence-based selection, and lazy loading
 * of specialized agents. Agents self-register when imported.
 */

import { EventEmitter } from 'events';

class AgentRegistry extends EventEmitter {
  constructor() {
    super();
    this.agents = new Map();
    this.initialized = false;
    this.initPromise = null;
  }

  /**
   * Register an agent class
   * @param {Class} AgentClass - Agent class with static metadata
   */
  register(AgentClass) {
    if (!AgentClass.metadata) {
      throw new Error(`Agent ${AgentClass.name} must have static metadata property`);
    }

    const meta = AgentClass.metadata;
    const requiredFields = ['channel', 'triggers', 'confidence'];
    
    for (const field of requiredFields) {
      if (!meta[field]) {
        throw new Error(`Agent ${AgentClass.name} metadata missing required field: ${field}`);
      }
    }

    // Validate confidence function
    if (typeof meta.confidence !== 'function') {
      throw new Error(`Agent ${AgentClass.name} confidence must be a function`);
    }

    console.log(`📝 Registering agent: ${meta.channel} (${AgentClass.name})`);
    
    this.agents.set(meta.channel, {
      class: AgentClass,
      instance: null,
      metadata: meta,
      stats: {
        registered: Date.now(),
        invocations: 0,
        errors: 0,
        totalTime: 0
      }
    });

    this.emit('agent:registered', {
      channel: meta.channel,
      name: AgentClass.name
    });

    return this;
  }

  /**
   * Get the best agent for a given message
   * @param {string} message - User message
   * @param {object} context - Additional context
   * @returns {object|null} - Agent instance or null
   */
  async getBestAgent(message, context = {}) {
    const candidates = [];
    
    // If context explicitly specifies a channel, use it
    if (context.detectedChannel) {
      const agent = this.agents.get(context.detectedChannel);
      if (agent) {
        return this._getOrCreateInstance(agent);
      }
    }
    
    // Otherwise, calculate confidence for each agent
    for (const [channel, agent] of this.agents) {
      try {
        const confidence = agent.metadata.confidence(message, context);
        
        if (confidence > 0) {
          candidates.push({
            channel,
            confidence,
            agent,
            priority: agent.metadata.priority || 0
          });
        }
      } catch (error) {
        console.error(`Error calculating confidence for ${channel}:`, error);
        agent.stats.errors++;
      }
    }
    
    if (candidates.length === 0) {
      return null;
    }
    
    // Sort by confidence first, then priority
    candidates.sort((a, b) => {
      const confDiff = b.confidence - a.confidence;
      return confDiff !== 0 ? confDiff : b.priority - a.priority;
    });
    
    // Log decision for debugging
    console.log('🎯 Agent selection:', {
      winner: candidates[0].channel,
      confidence: candidates[0].confidence,
      allCandidates: candidates.map(c => ({
        channel: c.channel,
        confidence: c.confidence
      }))
    });
    
    return this._getOrCreateInstance(candidates[0].agent);
  }

  /**
   * Get agent by channel name (direct lookup)
   * @param {string} channel - Channel name
   * @returns {object|null} - Agent instance or null
   */
  async getAgent(channel) {
    const agent = this.agents.get(channel);
    return agent ? this._getOrCreateInstance(agent) : null;
  }

  /**
   * List all registered agents
   * @returns {Array} - Array of agent metadata
   */
  listAgents() {
    return Array.from(this.agents.entries()).map(([channel, agent]) => ({
      channel,
      name: agent.class.name,
      triggers: agent.metadata.triggers.length,
      priority: agent.metadata.priority || 0,
      stats: agent.stats
    }));
  }

  /**
   * Get statistics for all agents
   * @returns {object} - Agent statistics
   */
  getStats() {
    const stats = {};
    
    for (const [channel, agent] of this.agents) {
      stats[channel] = {
        ...agent.stats,
        avgTime: agent.stats.invocations > 0 
          ? agent.stats.totalTime / agent.stats.invocations 
          : 0
      };
    }
    
    return stats;
  }

  /**
   * Execute an agent with timing and error tracking
   * @param {string} channel - Agent channel
   * @param {object} input - Input for agent
   * @returns {object} - Agent response
   */
  async executeAgent(channel, input) {
    const agentData = this.agents.get(channel);
    if (!agentData) {
      throw new Error(`No agent registered for channel: ${channel}`);
    }

    const agent = await this._getOrCreateInstance(agentData);
    const startTime = Date.now();
    
    try {
      agentData.stats.invocations++;
      
      const result = await agent.execute(input);
      
      agentData.stats.totalTime += Date.now() - startTime;
      
      return result;
    } catch (error) {
      agentData.stats.errors++;
      throw error;
    }
  }

  /**
   * Clear all agents (useful for testing)
   */
  clear() {
    for (const [channel, agent] of this.agents) {
      if (agent.instance && typeof agent.instance.cleanup === 'function') {
        agent.instance.cleanup();
      }
    }
    this.agents.clear();
    this.emit('registry:cleared');
  }

  /**
   * Get or create agent instance (lazy loading)
   * @private
   */
  async _getOrCreateInstance(agentData) {
    if (agentData.instance) {
      return agentData.instance;
    }

    try {
      console.log(`🔧 Creating instance of ${agentData.class.name}`);
      agentData.instance = new agentData.class();
      
      // Initialize if agent has init method
      if (typeof agentData.instance.initialize === 'function') {
        await agentData.instance.initialize();
      }
      
      this.emit('agent:instantiated', {
        channel: agentData.metadata.channel,
        name: agentData.class.name
      });
      
      return agentData.instance;
    } catch (error) {
      console.error(`Failed to instantiate ${agentData.class.name}:`, error);
      throw error;
    }
  }

  /**
   * Auto-discover and register agents from a directory
   * @param {string} directory - Directory path
   */
  async autoRegister(directory) {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    try {
      const files = await fs.readdir(directory);
      const agentFiles = files.filter(f => 
        f.endsWith('Agent.js') && 
        !f.includes('Base') && 
        !f.includes('Abstract')
      );
      
      for (const file of agentFiles) {
        try {
          const modulePath = path.join(directory, file);
          const module = await import(modulePath);
          
          // Support both default and named exports
          const AgentClass = module.default || module[file.replace('.js', '')];
          
          if (AgentClass && AgentClass.metadata) {
            this.register(AgentClass);
          }
        } catch (error) {
          console.error(`Failed to load agent from ${file}:`, error);
        }
      }
      
      console.log(`✅ Auto-registered ${this.agents.size} agents from ${directory}`);
    } catch (error) {
      console.error('Auto-registration failed:', error);
    }
  }
}

// Create singleton instance
const agentRegistry = new AgentRegistry();

// Helper function for self-registration
export function registerAgent(AgentClass) {
  return agentRegistry.register(AgentClass);
}

// Export both the class and singleton
export { AgentRegistry };
export default agentRegistry;