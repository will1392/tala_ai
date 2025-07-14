/**
 * AgentOrchestrator - Multi-Agent Coordination System for Tala AI
 * 
 * Manages the routing, execution, and coordination of specialized AI agents
 * for complex travel-related tasks.
 */

import EventEmitter from 'events';
import { performance } from 'perf_hooks';
import AgentRegistry from './AgentRegistry.js';
import { agentsConfig } from '../../config/agents.js';
import { 
  TaskDecomposer,
  ParallelExecutor,
  ResultAggregator,
  ConflictResolver,
  AdaptiveCoordinationStrategy 
} from './coordination/index.js';

export class AgentOrchestrator extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      maxConcurrentAgents: options.maxConcurrentAgents || 5,
      defaultTimeout: options.defaultTimeout || 30000,
      retryAttempts: options.retryAttempts || 2,
      performanceTracking: options.performanceTracking !== false,
      ...options
    };
    
    // Agent registry
    this.registry = new AgentRegistry(options.registryOptions);
    
    // Coordination components
    this.taskDecomposer = new TaskDecomposer(options.decomposer);
    this.parallelExecutor = new ParallelExecutor(options.executor);
    this.resultAggregator = new ResultAggregator(options.aggregator);
    this.conflictResolver = new ConflictResolver(options.resolver);
    
    // Coordination strategy
    this.coordinationStrategy = new AdaptiveCoordinationStrategy({
      decomposer: options.decomposer,
      executor: options.executor,
      aggregator: options.aggregator,
      resolver: options.resolver
    });
    
    // Performance tracking
    this.performanceMetrics = new Map();
    
    // Active executions
    this.activeExecutions = new Map();
    
    // Execution queue
    this.executionQueue = [];
    
    this.initialized = false;
  }

  /**
   * Initialize the orchestrator
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      console.log('🎭 Initializing AgentOrchestrator...');
      
      // Initialize registry
      await this.registry.initialize();
      
      // Initialize coordination components
      await this.parallelExecutor.initialize();
      await this.coordinationStrategy.initialize();
      
      // Load agent configurations
      await this.loadAgentConfigurations();
      
      // Start performance monitoring
      if (this.options.performanceTracking) {
        this.startPerformanceMonitoring();
      }
      
      this.initialized = true;
      console.log('✅ AgentOrchestrator initialized successfully');
      
      this.emit('initialized');
      
    } catch (error) {
      console.error('❌ AgentOrchestrator initialization failed:', error);
      throw error;
    }
  }

  /**
   * Route a task to the appropriate agent(s)
   * @param {Object} task - Task to be executed
   * @param {Object} context - Execution context
   * @returns {Object} Routing decision
   */
  async routeToAgent(task, context = {}) {
    try {
      this.ensureInitialized();
      
      console.log(`🎯 Routing task: ${task.type || 'unknown'}`);
      
      // Get all registered agents
      const agents = await this.registry.getAllAgents();
      
      // Score each agent's suitability for the task
      const agentScores = await Promise.all(
        agents.map(async (agent) => {
          try {
            const canHandle = await agent.canHandle(task);
            const capabilities = agent.getCapabilities();
            const specialization = agent.getSpecialization();
            
            // Calculate suitability score
            let score = 0;
            
            // Base score from canHandle
            if (typeof canHandle === 'number') {
              score = canHandle; // Agent returned confidence score
            } else if (canHandle === true) {
              score = 0.7; // Default confidence
            } else {
              return { agent, score: 0 };
            }
            
            // Boost score based on specialization match
            if (task.type && specialization.includes(task.type)) {
              score *= 1.2;
            }
            
            // Consider agent performance history
            const performance = this.getAgentPerformance(agent.id);
            if (performance.successRate > 0) {
              score *= performance.successRate;
            }
            
            // Consider agent load
            const load = this.getAgentLoad(agent.id);
            if (load > 0) {
              score *= (1 - load * 0.1); // Reduce score for busy agents
            }
            
            return {
              agent,
              score: Math.min(1.0, score),
              capabilities,
              specialization
            };
            
          } catch (error) {
            console.error(`Error evaluating agent ${agent.id}:`, error);
            return { agent, score: 0 };
          }
        })
      );
      
      // Sort by score
      agentScores.sort((a, b) => b.score - a.score);
      
      // Filter agents that can handle the task
      const capableAgents = agentScores.filter(a => a.score > 0.5);
      
      if (capableAgents.length === 0) {
        throw new Error(`No suitable agents found for task type: ${task.type}`);
      }
      
      // Determine execution strategy
      let strategy = 'single';
      let selectedAgents = [capableAgents[0]];
      
      // Check if task requires multiple agents
      if (task.requiresMultipleAgents || context.multiAgent) {
        strategy = 'parallel';
        selectedAgents = capableAgents.slice(0, Math.min(3, capableAgents.length));
      } else if (task.fallbackRequired) {
        strategy = 'sequential-fallback';
        selectedAgents = capableAgents.slice(0, 3);
      }
      
      const decision = {
        task,
        strategy,
        selectedAgents: selectedAgents.map(a => ({
          id: a.agent.id,
          name: a.agent.constructor.name,
          score: a.score,
          capabilities: a.capabilities
        })),
        reasoning: this.explainRoutingDecision(task, selectedAgents, strategy)
      };
      
      console.log(`📋 Routing decision: ${strategy} execution with ${selectedAgents.length} agent(s)`);
      this.emit('task-routed', decision);
      
      return decision;
      
    } catch (error) {
      console.error('❌ Task routing failed:', error);
      this.emit('routing-error', { task, error });
      throw error;
    }
  }

  /**
   * Execute a task with a specific agent
   * @param {string} agentId - Agent identifier
   * @param {Object} task - Task to execute
   * @param {Object} options - Execution options
   * @returns {Object} Execution result
   */
  async executeAgentTask(agentId, task, options = {}) {
    const executionId = this.generateExecutionId();
    const startTime = performance.now();
    
    try {
      console.log(`🚀 Executing task with agent: ${agentId}`);
      
      // Get agent instance
      const agent = await this.registry.getAgent(agentId);
      if (!agent) {
        throw new Error(`Agent not found: ${agentId}`);
      }
      
      // Check execution capacity
      if (this.activeExecutions.size >= this.options.maxConcurrentAgents) {
        console.log('⏳ Queueing task - max concurrent agents reached');
        return this.queueExecution(agentId, task, options);
      }
      
      // Track active execution
      this.activeExecutions.set(executionId, {
        agentId,
        task,
        startTime,
        status: 'running'
      });
      
      // Set timeout
      const timeout = options.timeout || 
                     agent.getTimeout?.() || 
                     this.options.defaultTimeout;
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Agent execution timeout')), timeout);
      });
      
      // Execute with agent
      const executionPromise = this.executeWithRetry(
        agent, 
        task, 
        { ...options, executionId }
      );
      
      // Race between execution and timeout
      const result = await Promise.race([executionPromise, timeoutPromise]);
      
      // Validate result
      const validationResult = await agent.validateResult(result);
      if (!validationResult.valid) {
        throw new Error(`Invalid agent result: ${validationResult.reason}`);
      }
      
      // Track performance
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      await this.monitorAgentPerformance(agentId, {
        success: true,
        executionTime,
        task: task.type,
        resultSize: JSON.stringify(result).length
      });
      
      // Clean up
      this.activeExecutions.delete(executionId);
      
      // Process queue if needed
      this.processExecutionQueue();
      
      const finalResult = {
        agentId,
        executionId,
        result: result.data || result,
        metadata: {
          executionTime,
          agentVersion: agent.version || '1.0.0',
          confidence: result.confidence || 1.0,
          ...result.metadata
        }
      };
      
      this.emit('task-completed', finalResult);
      return finalResult;
      
    } catch (error) {
      console.error(`❌ Agent execution failed:`, error);
      
      // Track failure
      await this.monitorAgentPerformance(agentId, {
        success: false,
        error: error.message,
        executionTime: performance.now() - startTime
      });
      
      // Clean up
      this.activeExecutions.delete(executionId);
      this.processExecutionQueue();
      
      this.emit('task-failed', { agentId, task, error });
      throw error;
    }
  }

  /**
   * Execute with retry logic
   */
  async executeWithRetry(agent, task, options) {
    let lastError;
    const maxAttempts = options.retryAttempts || this.options.retryAttempts;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`🔄 Execution attempt ${attempt}/${maxAttempts}`);
        
        const context = {
          ...options,
          attempt,
          isRetry: attempt > 1
        };
        
        return await agent.execute(task, context);
        
      } catch (error) {
        lastError = error;
        console.error(`Attempt ${attempt} failed:`, error.message);
        
        if (attempt < maxAttempts) {
          // Exponential backoff
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Execute complex task with coordination
   * @param {Object} task - Complex task requiring multiple agents
   * @param {Object} options - Execution options
   * @returns {Object} Execution result
   */
  async executeComplexTask(task, options = {}) {
    try {
      this.ensureInitialized();
      
      console.log(`🌟 Executing complex task: ${task.type}`);
      
      // Get available agents
      const availableAgents = await this.registry.getAllAgents();
      
      // Execute with coordination strategy
      const result = await this.coordinationStrategy.coordinate(
        task,
        availableAgents,
        {
          ...options,
          orchestrator: this
        }
      );
      
      // Track performance
      if (result.success) {
        this.emit('complex-task-completed', result);
      }
      
      return result;
      
    } catch (error) {
      console.error('❌ Complex task execution failed:', error);
      this.emit('complex-task-failed', { task, error });
      throw error;
    }
  }

  /**
   * Execute multi-agent task with specific strategy
   * @param {Object} task - Task to execute
   * @param {string} strategy - Coordination strategy to use
   * @param {Object} options - Execution options
   */
  async executeWithStrategy(task, strategy, options = {}) {
    try {
      console.log(`🎯 Executing with ${strategy} strategy`);
      
      // Check if task needs decomposition
      const decomposition = await this.taskDecomposer.decompose(task);
      
      if (!decomposition.needsDecomposition) {
        // Simple task - use single agent
        const routing = await this.routeToAgent(task);
        return this.executeAgentTask(
          routing.selectedAgents[0].id,
          task,
          options
        );
      }
      
      // Get available agents
      const availableAgents = await this.registry.getAllAgents();
      
      // Create specific strategy instance
      let coordinationStrategy;
      switch (strategy) {
        case 'hierarchical':
          const { HierarchicalCoordinationStrategy } = await import('./coordination/CoordinationStrategy.js');
          coordinationStrategy = new HierarchicalCoordinationStrategy(this.options);
          break;
          
        case 'pipeline':
          const { PipelineCoordinationStrategy } = await import('./coordination/CoordinationStrategy.js');
          coordinationStrategy = new PipelineCoordinationStrategy(this.options);
          break;
          
        case 'consensus':
          const { ConsensusCoordinationStrategy } = await import('./coordination/CoordinationStrategy.js');
          coordinationStrategy = new ConsensusCoordinationStrategy(this.options);
          break;
          
        default:
          coordinationStrategy = this.coordinationStrategy;
      }
      
      await coordinationStrategy.initialize();
      
      // Execute with selected strategy
      const result = await coordinationStrategy.coordinate(
        task,
        availableAgents,
        options
      );
      
      // Cleanup if not default strategy
      if (coordinationStrategy !== this.coordinationStrategy) {
        await coordinationStrategy.shutdown();
      }
      
      return result;
      
    } catch (error) {
      console.error(`❌ Strategy execution failed:`, error);
      throw error;
    }
  }

  /**
   * Combine results from multiple agents
   * @param {Array} results - Array of agent results
   * @returns {Object} Combined result
   */
  async combineAgentResults(results) {
    try {
      console.log(`🔗 Combining results from ${results.length} agents`);
      
      // Use ResultAggregator for intelligent combination
      const aggregated = await this.resultAggregator.aggregate(results);
      
      // Check for conflicts and resolve if needed
      if (aggregated.metadata?.conflicts && aggregated.metadata.conflicts.length > 0) {
        console.log(`⚠️ Detected ${aggregated.metadata.conflicts.length} conflicts`);
        
        const resolved = await this.conflictResolver.resolveConflicts(results);
        
        return {
          combined: true,
          data: resolved.resolution,
          metadata: {
            ...aggregated.metadata,
            conflicts: resolved.conflicts,
            conflictResolution: resolved.explanations
          }
        };
      }
      
      this.emit('results-combined', aggregated);
      return aggregated;
      
    } catch (error) {
      console.error('❌ Failed to combine results:', error);
      throw error;
    }
  }

  /**
   * Monitor and track agent performance
   * @param {string} agentId - Agent identifier
   * @param {Object} result - Execution result
   */
  async monitorAgentPerformance(agentId, result) {
    try {
      // Get or create performance entry
      if (!this.performanceMetrics.has(agentId)) {
        this.performanceMetrics.set(agentId, {
          totalExecutions: 0,
          successfulExecutions: 0,
          failedExecutions: 0,
          totalExecutionTime: 0,
          averageExecutionTime: 0,
          successRate: 0,
          lastExecution: null,
          taskTypes: new Map(),
          errors: []
        });
      }
      
      const metrics = this.performanceMetrics.get(agentId);
      
      // Update metrics
      metrics.totalExecutions++;
      metrics.lastExecution = new Date();
      
      if (result.success) {
        metrics.successfulExecutions++;
      } else {
        metrics.failedExecutions++;
        metrics.errors.push({
          timestamp: new Date(),
          error: result.error,
          task: result.task
        });
        
        // Keep only last 10 errors
        if (metrics.errors.length > 10) {
          metrics.errors.shift();
        }
      }
      
      // Update execution time
      if (result.executionTime) {
        metrics.totalExecutionTime += result.executionTime;
        metrics.averageExecutionTime = metrics.totalExecutionTime / metrics.totalExecutions;
      }
      
      // Calculate success rate
      metrics.successRate = metrics.successfulExecutions / metrics.totalExecutions;
      
      // Track task types
      if (result.task) {
        const taskCount = metrics.taskTypes.get(result.task) || 0;
        metrics.taskTypes.set(result.task, taskCount + 1);
      }
      
      // Emit performance update
      this.emit('performance-update', {
        agentId,
        metrics: this.getAgentPerformance(agentId)
      });
      
      // Check for performance issues
      if (metrics.successRate < 0.7 && metrics.totalExecutions > 10) {
        console.warn(`⚠️ Agent ${agentId} performance degraded: ${(metrics.successRate * 100).toFixed(1)}% success rate`);
        this.emit('performance-warning', { agentId, metrics });
      }
      
    } catch (error) {
      console.error('❌ Failed to monitor performance:', error);
    }
  }

  /**
   * Get agent performance metrics
   */
  getAgentPerformance(agentId) {
    const metrics = this.performanceMetrics.get(agentId);
    if (!metrics) {
      return {
        successRate: 1.0,
        averageExecutionTime: 0,
        totalExecutions: 0
      };
    }
    
    return {
      successRate: metrics.successRate,
      averageExecutionTime: metrics.averageExecutionTime,
      totalExecutions: metrics.totalExecutions,
      recentErrors: metrics.errors.slice(-3)
    };
  }

  /**
   * Get current agent load
   */
  getAgentLoad(agentId) {
    let load = 0;
    for (const execution of this.activeExecutions.values()) {
      if (execution.agentId === agentId) {
        load++;
      }
    }
    return load / this.options.maxConcurrentAgents;
  }

  /**
   * Explain routing decision
   */
  explainRoutingDecision(task, selectedAgents, strategy) {
    const reasons = [];
    
    if (selectedAgents.length > 0) {
      const primary = selectedAgents[0];
      reasons.push(`Primary agent: ${primary.agent.constructor.name} (${(primary.score * 100).toFixed(1)}% confidence)`);
      
      if (primary.specialization) {
        reasons.push(`Specialization match: ${primary.specialization}`);
      }
    }
    
    if (strategy === 'parallel') {
      reasons.push('Task requires multiple perspectives for best results');
    } else if (strategy === 'sequential-fallback') {
      reasons.push('Fallback agents available if primary fails');
    }
    
    return reasons.join('. ');
  }

  /**
   * Queue execution for later
   */
  async queueExecution(agentId, task, options) {
    return new Promise((resolve, reject) => {
      this.executionQueue.push({
        agentId,
        task,
        options,
        resolve,
        reject,
        queuedAt: new Date()
      });
      
      console.log(`📥 Task queued. Queue length: ${this.executionQueue.length}`);
    });
  }

  /**
   * Process execution queue
   */
  processExecutionQueue() {
    if (this.executionQueue.length === 0) return;
    if (this.activeExecutions.size >= this.options.maxConcurrentAgents) return;
    
    const queued = this.executionQueue.shift();
    if (!queued) return;
    
    console.log(`📤 Processing queued task (waited ${Date.now() - queued.queuedAt}ms)`);
    
    this.executeAgentTask(queued.agentId, queued.task, queued.options)
      .then(queued.resolve)
      .catch(queued.reject);
  }

  /**
   * Load agent configurations
   */
  async loadAgentConfigurations() {
    try {
      for (const [agentId, config] of Object.entries(agentsConfig.agents)) {
        await this.registry.registerAgent(agentId, config);
      }
      
      console.log(`📋 Loaded ${Object.keys(agentsConfig.agents).length} agent configurations`);
    } catch (error) {
      console.error('Failed to load agent configurations:', error);
      throw error;
    }
  }

  /**
   * Start performance monitoring
   */
  startPerformanceMonitoring() {
    // Monitor every 5 minutes
    this.performanceInterval = setInterval(() => {
      const report = this.generatePerformanceReport();
      this.emit('performance-report', report);
      
      // Log summary
      console.log('📊 Agent Performance Summary:');
      report.agents.forEach(agent => {
        console.log(`  ${agent.id}: ${agent.executions} tasks, ${(agent.successRate * 100).toFixed(1)}% success, ${agent.avgTime.toFixed(0)}ms avg`);
      });
    }, 5 * 60 * 1000);
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport() {
    const agents = [];
    
    for (const [agentId, metrics] of this.performanceMetrics) {
      agents.push({
        id: agentId,
        executions: metrics.totalExecutions,
        successRate: metrics.successRate,
        avgTime: metrics.averageExecutionTime,
        lastExecution: metrics.lastExecution,
        topTasks: Array.from(metrics.taskTypes.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([task, count]) => ({ task, count }))
      });
    }
    
    return {
      timestamp: new Date(),
      totalAgents: agents.length,
      activeExecutions: this.activeExecutions.size,
      queueLength: this.executionQueue.length,
      agents: agents.sort((a, b) => b.executions - a.executions)
    };
  }

  /**
   * Generate unique execution ID
   */
  generateExecutionId() {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Ensure orchestrator is initialized
   */
  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('AgentOrchestrator not initialized. Call initialize() first.');
    }
  }

  /**
   * Shutdown orchestrator
   */
  async shutdown() {
    console.log('🛑 Shutting down AgentOrchestrator...');
    
    // Clear intervals
    if (this.performanceInterval) {
      clearInterval(this.performanceInterval);
    }
    
    // Wait for active executions
    if (this.activeExecutions.size > 0) {
      console.log(`⏳ Waiting for ${this.activeExecutions.size} active executions...`);
      // TODO: Implement graceful shutdown
    }
    
    // Clear queue
    this.executionQueue.forEach(queued => {
      queued.reject(new Error('Orchestrator shutdown'));
    });
    this.executionQueue = [];
    
    // Shutdown coordination components
    await this.parallelExecutor.shutdown();
    await this.coordinationStrategy.shutdown();
    
    // Shutdown registry
    await this.registry.shutdown();
    
    this.initialized = false;
    this.emit('shutdown');
  }
}

export default AgentOrchestrator;