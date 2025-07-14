/**
 * AgentRegistry - Central registry for managing all available agents
 * 
 * Handles agent registration, discovery, lifecycle management, and capability tracking
 */

import EventEmitter from 'events';
import EmailMonitorAgent from './EmailMonitorAgent.js';
import ItineraryBuilderAgent from './ItineraryBuilderAgent.js';
// import DocumentAnalyzerAgent from './DocumentAnalyzerAgent.js';
import TaskExtractorAgent from './TaskExtractorAgent.js';

export class AgentRegistry extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      autoRegister: options.autoRegister !== false,
      healthCheckInterval: options.healthCheckInterval || 60000, // 1 minute
      maxAgentInstances: options.maxAgentInstances || 3,
      ...options
    };
    
    // Registry storage
    this.agents = new Map();
    this.agentClasses = new Map();
    this.agentInstances = new Map();
    this.agentCapabilities = new Map();
    
    // Health tracking
    this.healthStatus = new Map();
    this.healthCheckInterval = null;
    
    this.initialized = false;
    
    // Register built-in agent classes
    this.registerBuiltInAgents();
  }

  /**
   * Initialize the registry
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      console.log('📚 Initializing AgentRegistry...');
      
      // Auto-register agents if enabled
      if (this.options.autoRegister) {
        await this.autoRegisterAgents();
      }
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      this.initialized = true;
      console.log('✅ AgentRegistry initialized successfully');
      console.log(`📊 Registered agents: ${this.agents.size}`);
      
      this.emit('initialized', {
        agentCount: this.agents.size,
        agents: Array.from(this.agents.keys())
      });
      
    } catch (error) {
      console.error('❌ AgentRegistry initialization failed:', error);
      throw error;
    }
  }

  /**
   * Register built-in agent classes
   */
  registerBuiltInAgents() {
    this.agentClasses.set('EmailMonitorAgent', EmailMonitorAgent);
    this.agentClasses.set('ItineraryBuilderAgent', ItineraryBuilderAgent);
    // this.agentClasses.set('DocumentAnalyzerAgent', DocumentAnalyzerAgent);
    this.agentClasses.set('TaskExtractorAgent', TaskExtractorAgent);
  }

  /**
   * Register a new agent
   * @param {string} agentId - Unique agent identifier
   * @param {Object} config - Agent configuration
   */
  async registerAgent(agentId, config) {
    try {
      console.log(`📝 Registering agent: ${agentId}`);
      
      // Check if already registered
      if (this.agents.has(agentId)) {
        console.warn(`⚠️ Agent ${agentId} already registered, updating configuration`);
      }
      
      // Validate configuration
      this.validateAgentConfig(config);
      
      // Store agent configuration
      this.agents.set(agentId, {
        id: agentId,
        config,
        status: 'registered',
        registeredAt: new Date(),
        instances: 0
      });
      
      // Extract and index capabilities
      if (config.capabilities) {
        this.indexCapabilities(agentId, config.capabilities);
      }
      
      this.emit('agent-registered', { agentId, config });
      
      return { success: true, agentId };
      
    } catch (error) {
      console.error(`❌ Failed to register agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Get an agent instance
   * @param {string} agentId - Agent identifier
   * @returns {Object} Agent instance
   */
  async getAgent(agentId) {
    try {
      // Check if agent is registered
      const registration = this.agents.get(agentId);
      if (!registration) {
        throw new Error(`Agent not found: ${agentId}`);
      }
      
      // Check instance pool
      const instanceKey = this.getInstanceKey(agentId);
      let instance = this.agentInstances.get(instanceKey);
      
      if (!instance) {
        // Create new instance
        instance = await this.createAgentInstance(agentId, registration.config);
        
        // Store in pool
        this.agentInstances.set(instanceKey, instance);
        registration.instances++;
      }
      
      // Check health
      const health = this.healthStatus.get(agentId);
      if (health && health.status === 'unhealthy') {
        console.warn(`⚠️ Agent ${agentId} is unhealthy: ${health.reason}`);
      }
      
      return instance;
      
    } catch (error) {
      console.error(`❌ Failed to get agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Create an agent instance
   */
  async createAgentInstance(agentId, config) {
    try {
      console.log(`🏗️ Creating instance of ${agentId}`);
      
      const AgentClass = this.agentClasses.get(config.class);
      if (!AgentClass) {
        throw new Error(`Agent class not found: ${config.class}`);
      }
      
      // Create instance with config
      const instance = new AgentClass({
        id: agentId,
        ...config
      });
      
      // Initialize the agent
      await instance.initialize();
      
      // Track instance
      this.emit('agent-instantiated', { agentId, instance });
      
      return instance;
      
    } catch (error) {
      console.error(`❌ Failed to create agent instance:`, error);
      throw error;
    }
  }

  /**
   * Get all registered agents
   */
  async getAllAgents() {
    const agents = [];
    
    for (const [agentId, registration] of this.agents) {
      try {
        const agent = await this.getAgent(agentId);
        agents.push(agent);
      } catch (error) {
        console.error(`Failed to get agent ${agentId}:`, error);
      }
    }
    
    return agents;
  }

  /**
   * Find agents by capability
   * @param {string} capability - Required capability
   */
  async findAgentsByCapability(capability) {
    const agentIds = this.agentCapabilities.get(capability) || [];
    const agents = [];
    
    for (const agentId of agentIds) {
      try {
        const agent = await this.getAgent(agentId);
        agents.push(agent);
      } catch (error) {
        console.error(`Failed to get agent ${agentId}:`, error);
      }
    }
    
    return agents;
  }

  /**
   * Get agent status
   * @param {string} agentId - Agent identifier
   */
  getAgentStatus(agentId) {
    const registration = this.agents.get(agentId);
    if (!registration) {
      return null;
    }
    
    const health = this.healthStatus.get(agentId);
    const instance = this.agentInstances.get(this.getInstanceKey(agentId));
    
    return {
      id: agentId,
      status: registration.status,
      health: health || { status: 'unknown' },
      instances: registration.instances,
      capabilities: instance?.getCapabilities() || [],
      metrics: instance?.metrics || {}
    };
  }

  /**
   * List all agents with their status
   */
  listAgents() {
    const list = [];
    
    for (const [agentId, registration] of this.agents) {
      const status = this.getAgentStatus(agentId);
      list.push({
        ...status,
        config: registration.config,
        registeredAt: registration.registeredAt
      });
    }
    
    return list;
  }

  /**
   * Auto-register agents from configuration
   */
  async autoRegisterAgents() {
    try {
      // Import agent configurations
      const { agentsConfig } = await import('../../config/agents.js');
      
      if (!agentsConfig?.agents) {
        console.warn('⚠️ No agents found in configuration');
        return;
      }
      
      for (const [agentId, config] of Object.entries(agentsConfig.agents)) {
        try {
          await this.registerAgent(agentId, config);
        } catch (error) {
          console.error(`Failed to auto-register ${agentId}:`, error);
        }
      }
      
    } catch (error) {
      console.error('❌ Auto-registration failed:', error);
    }
  }

  /**
   * Validate agent configuration
   */
  validateAgentConfig(config) {
    if (!config.class) {
      throw new Error('Agent configuration must specify a class');
    }
    
    if (!this.agentClasses.has(config.class)) {
      throw new Error(`Unknown agent class: ${config.class}`);
    }
  }

  /**
   * Index agent capabilities for discovery
   */
  indexCapabilities(agentId, capabilities) {
    for (const capability of capabilities) {
      if (!this.agentCapabilities.has(capability)) {
        this.agentCapabilities.set(capability, []);
      }
      
      const agents = this.agentCapabilities.get(capability);
      if (!agents.includes(agentId)) {
        agents.push(agentId);
      }
    }
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    if (this.healthCheckInterval) return;
    
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, this.options.healthCheckInterval);
    
    // Perform initial health check
    this.performHealthChecks();
  }

  /**
   * Perform health checks on all agents
   */
  async performHealthChecks() {
    console.log('🏥 Performing agent health checks...');
    
    for (const [agentId, registration] of this.agents) {
      try {
        const health = await this.checkAgentHealth(agentId);
        this.healthStatus.set(agentId, health);
        
        if (health.status === 'unhealthy') {
          this.emit('agent-unhealthy', { agentId, health });
        }
        
      } catch (error) {
        console.error(`Health check failed for ${agentId}:`, error);
        this.healthStatus.set(agentId, {
          status: 'error',
          reason: error.message,
          lastCheck: new Date()
        });
      }
    }
  }

  /**
   * Check health of a specific agent
   */
  async checkAgentHealth(agentId) {
    const instanceKey = this.getInstanceKey(agentId);
    const instance = this.agentInstances.get(instanceKey);
    
    if (!instance) {
      return {
        status: 'idle',
        reason: 'No active instances',
        lastCheck: new Date()
      };
    }
    
    // Check agent metrics
    const health = instance.calculateHealth();
    
    let status = 'healthy';
    let reason = null;
    
    if (health < 0.5) {
      status = 'unhealthy';
      reason = 'Low health score';
    } else if (health < 0.7) {
      status = 'degraded';
      reason = 'Moderate health score';
    }
    
    // Check response time
    if (instance.metrics?.averageExecutionTime > 10000) {
      status = 'degraded';
      reason = 'High average execution time';
    }
    
    return {
      status,
      reason,
      score: health,
      metrics: instance.metrics,
      lastCheck: new Date()
    };
  }

  /**
   * Unregister an agent
   */
  async unregisterAgent(agentId) {
    try {
      console.log(`🗑️ Unregistering agent: ${agentId}`);
      
      // Remove from registry
      const registration = this.agents.get(agentId);
      if (!registration) {
        throw new Error(`Agent not found: ${agentId}`);
      }
      
      // Shutdown instances
      const instanceKey = this.getInstanceKey(agentId);
      const instance = this.agentInstances.get(instanceKey);
      
      if (instance) {
        await instance.shutdown();
        this.agentInstances.delete(instanceKey);
      }
      
      // Remove from registry
      this.agents.delete(agentId);
      
      // Remove from capability index
      for (const [capability, agents] of this.agentCapabilities) {
        const index = agents.indexOf(agentId);
        if (index > -1) {
          agents.splice(index, 1);
        }
      }
      
      // Remove health status
      this.healthStatus.delete(agentId);
      
      this.emit('agent-unregistered', { agentId });
      
      return { success: true };
      
    } catch (error) {
      console.error(`❌ Failed to unregister agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Reload agent configuration
   */
  async reloadAgent(agentId, newConfig) {
    try {
      console.log(`🔄 Reloading agent: ${agentId}`);
      
      // Unregister existing
      await this.unregisterAgent(agentId);
      
      // Register with new config
      await this.registerAgent(agentId, newConfig);
      
      this.emit('agent-reloaded', { agentId, config: newConfig });
      
      return { success: true };
      
    } catch (error) {
      console.error(`❌ Failed to reload agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Get instance key for agent
   */
  getInstanceKey(agentId) {
    // Simple key for now, could be enhanced for multiple instances
    return `${agentId}_default`;
  }

  /**
   * Get registry statistics
   */
  getStatistics() {
    const stats = {
      totalAgents: this.agents.size,
      activeInstances: this.agentInstances.size,
      capabilities: this.agentCapabilities.size,
      health: {
        healthy: 0,
        degraded: 0,
        unhealthy: 0,
        unknown: 0
      }
    };
    
    // Count health status
    for (const health of this.healthStatus.values()) {
      const status = health.status || 'unknown';
      if (stats.health[status] !== undefined) {
        stats.health[status]++;
      }
    }
    
    // Get capability distribution
    stats.capabilityDistribution = {};
    for (const [capability, agents] of this.agentCapabilities) {
      stats.capabilityDistribution[capability] = agents.length;
    }
    
    return stats;
  }

  /**
   * Shutdown the registry
   */
  async shutdown() {
    console.log('🛑 Shutting down AgentRegistry...');
    
    // Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    // Shutdown all agent instances
    for (const [instanceKey, instance] of this.agentInstances) {
      try {
        await instance.shutdown();
      } catch (error) {
        console.error(`Failed to shutdown instance ${instanceKey}:`, error);
      }
    }
    
    // Clear registries
    this.agents.clear();
    this.agentInstances.clear();
    this.agentCapabilities.clear();
    this.healthStatus.clear();
    
    this.initialized = false;
    this.emit('shutdown');
  }
}

export default AgentRegistry;