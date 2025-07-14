/**
 * ParallelExecutor - Manages concurrent execution of multiple agents
 * 
 * Handles parallel task execution, resource allocation, rate limiting,
 * and performance optimization for multi-agent workflows.
 */

import { EventEmitter } from 'events';
import { agentsConfig } from '../../../config/agents.js';

export class ParallelExecutor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      maxConcurrentAgents: options.maxConcurrentAgents || agentsConfig.global?.maxConcurrentAgents || 5,
      maxConcurrentPerAgent: options.maxConcurrentPerAgent || 2,
      executionTimeout: options.executionTimeout || 30000,
      retryAttempts: options.retryAttempts || 2,
      retryDelay: options.retryDelay || 1000,
      enableLoadBalancing: options.enableLoadBalancing !== false,
      enablePrioritization: options.enablePrioritization !== false,
      ...options
    };
    
    // Execution state
    this.activeExecutions = new Map();
    this.executionQueue = [];
    this.agentUsage = new Map();
    this.executionMetrics = new Map();
    
    // Resource management
    this.resourcePool = {
      available: this.options.maxConcurrentAgents,
      allocated: 0,
      waiting: 0
    };
    
    // Performance tracking
    this.performanceStats = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      peakConcurrency: 0
    };
    
    this.initialized = false;
  }

  /**
   * Initialize the executor
   */
  async initialize() {
    if (this.initialized) return;
    
    console.log('⚡ Initializing ParallelExecutor...');
    console.log(`📊 Max concurrent agents: ${this.options.maxConcurrentAgents}`);
    
    // Start monitoring
    this.startResourceMonitoring();
    
    this.initialized = true;
    this.emit('initialized');
  }

  /**
   * Execute multiple agent tasks in parallel
   * @param {Array} tasks - Array of tasks with agent assignments
   * @param {Object} context - Execution context
   * @returns {Object} Execution results
   */
  async execute(tasks, context = {}) {
    const executionId = this.generateExecutionId();
    const startTime = Date.now();
    
    console.log(`🚀 Starting parallel execution ${executionId} with ${tasks.length} tasks`);
    
    try {
      // Validate tasks
      this.validateTasks(tasks);
      
      // Group tasks by priority and dependencies
      const executionPlan = this.createExecutionPlan(tasks, context);
      
      // Track execution
      this.activeExecutions.set(executionId, {
        id: executionId,
        tasks: tasks.length,
        startTime,
        status: 'running',
        plan: executionPlan
      });
      
      // Execute based on plan
      const results = await this.executeByPlan(executionPlan, context);
      
      // Update metrics
      const duration = Date.now() - startTime;
      this.updateExecutionMetrics(executionId, {
        duration,
        success: true,
        results
      });
      
      console.log(`✅ Parallel execution ${executionId} completed in ${duration}ms`);
      
      return {
        executionId,
        success: true,
        duration,
        results,
        metrics: this.getExecutionMetrics(executionId)
      };
      
    } catch (error) {
      console.error(`❌ Parallel execution ${executionId} failed:`, error);
      
      // Update metrics
      this.updateExecutionMetrics(executionId, {
        duration: Date.now() - startTime,
        success: false,
        error: error.message
      });
      
      throw error;
      
    } finally {
      // Cleanup
      this.activeExecutions.delete(executionId);
    }
  }

  /**
   * Execute batch of independent tasks
   * @param {Array} tasks - Independent tasks that can run in parallel
   * @param {Object} options - Execution options
   */
  async executeBatch(tasks, options = {}) {
    const batchSize = options.batchSize || this.options.maxConcurrentAgents;
    const results = [];
    const errors = [];
    
    console.log(`📦 Executing batch of ${tasks.length} tasks in chunks of ${batchSize}`);
    
    // Process in batches
    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      
      const batchResults = await Promise.allSettled(
        batch.map(task => this.executeTask(task, options))
      );
      
      // Separate results and errors
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push({
            taskIndex: i + index,
            task: batch[index],
            result: result.value
          });
        } else {
          errors.push({
            taskIndex: i + index,
            task: batch[index],
            error: result.reason
          });
        }
      });
      
      // Brief pause between batches to prevent overload
      if (i + batchSize < tasks.length) {
        await this.delay(100);
      }
    }
    
    return {
      success: errors.length === 0,
      results,
      errors,
      summary: {
        total: tasks.length,
        successful: results.length,
        failed: errors.length,
        successRate: results.length / tasks.length
      }
    };
  }

  /**
   * Create execution plan based on dependencies and priorities
   */
  createExecutionPlan(tasks, context) {
    const plan = {
      waves: [],
      dependencies: new Map(),
      priorities: new Map()
    };
    
    // Analyze task relationships
    const taskMap = new Map();
    tasks.forEach(task => {
      taskMap.set(task.id, task);
      
      // Track dependencies
      if (task.dependencies && task.dependencies.length > 0) {
        plan.dependencies.set(task.id, task.dependencies);
      }
      
      // Track priorities
      plan.priorities.set(task.id, task.priority || 'medium');
    });
    
    // Build execution waves
    const executed = new Set();
    const remaining = new Set(tasks.map(t => t.id));
    
    while (remaining.size > 0) {
      const wave = [];
      
      // Find tasks that can execute in this wave
      for (const taskId of remaining) {
        const task = taskMap.get(taskId);
        const dependencies = plan.dependencies.get(taskId) || [];
        
        // Check if all dependencies are satisfied
        const canExecute = dependencies.every(depId => executed.has(depId));
        
        if (canExecute) {
          wave.push(task);
        }
      }
      
      if (wave.length === 0 && remaining.size > 0) {
        // Circular dependency detected
        throw new Error('Circular dependency detected in task graph');
      }
      
      // Sort wave by priority
      if (this.options.enablePrioritization) {
        wave.sort((a, b) => this.comparePriority(
          plan.priorities.get(a.id),
          plan.priorities.get(b.id)
        ));
      }
      
      // Add wave to plan
      plan.waves.push(wave);
      
      // Mark as executed
      wave.forEach(task => {
        executed.add(task.id);
        remaining.delete(task.id);
      });
    }
    
    console.log(`📋 Execution plan created: ${plan.waves.length} waves`);
    plan.waves.forEach((wave, i) => {
      console.log(`  Wave ${i + 1}: ${wave.length} tasks`);
    });
    
    return plan;
  }

  /**
   * Execute tasks according to plan
   */
  async executeByPlan(plan, context) {
    const results = new Map();
    const errors = new Map();
    
    // Execute each wave
    for (let waveIndex = 0; waveIndex < plan.waves.length; waveIndex++) {
      const wave = plan.waves[waveIndex];
      console.log(`🌊 Executing wave ${waveIndex + 1}/${plan.waves.length} with ${wave.length} tasks`);
      
      // Wait for resources if needed
      await this.waitForResources(wave.length);
      
      // Execute wave in parallel
      const wavePromises = wave.map(task => 
        this.executeTaskWithRetry(task, context)
          .then(result => ({ task, result, success: true }))
          .catch(error => ({ task, error, success: false }))
      );
      
      const waveResults = await Promise.all(wavePromises);
      
      // Process wave results
      waveResults.forEach(({ task, result, error, success }) => {
        if (success) {
          results.set(task.id, result);
        } else {
          errors.set(task.id, error);
          
          // Check if error should stop execution
          if (task.critical) {
            throw new Error(`Critical task ${task.id} failed: ${error.message}`);
          }
        }
      });
      
      // Update resource pool
      this.releaseResources(wave.length);
    }
    
    return {
      results: Object.fromEntries(results),
      errors: Object.fromEntries(errors),
      summary: {
        total: results.size + errors.size,
        successful: results.size,
        failed: errors.size
      }
    };
  }

  /**
   * Execute single task with resource management
   */
  async executeTask(task, context) {
    const taskId = task.id || this.generateTaskId();
    
    try {
      // Acquire resources
      await this.acquireResources(1);
      
      // Track agent usage
      this.trackAgentUsage(task.agentId, 'start');
      
      // Execute with timeout
      const result = await this.executeWithTimeout(
        task.execute(context),
        task.timeout || this.options.executionTimeout
      );
      
      // Track success
      this.trackAgentUsage(task.agentId, 'success');
      
      return result;
      
    } catch (error) {
      // Track failure
      this.trackAgentUsage(task.agentId, 'failure');
      throw error;
      
    } finally {
      // Release resources
      this.releaseResources(1);
    }
  }

  /**
   * Execute task with retry logic
   */
  async executeTaskWithRetry(task, context) {
    let lastError;
    
    for (let attempt = 0; attempt <= this.options.retryAttempts; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`🔄 Retry attempt ${attempt} for task ${task.id}`);
          await this.delay(this.options.retryDelay * attempt);
        }
        
        return await this.executeTask(task, context);
        
      } catch (error) {
        lastError = error;
        
        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          throw error;
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Execute with timeout
   */
  async executeWithTimeout(promise, timeout) {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Execution timeout')), timeout)
      )
    ]);
  }

  /**
   * Wait for resources to become available
   */
  async waitForResources(count) {
    if (this.resourcePool.available >= count) {
      return;
    }
    
    console.log(`⏳ Waiting for ${count} resources (${this.resourcePool.available} available)`);
    
    return new Promise(resolve => {
      const checkResources = () => {
        if (this.resourcePool.available >= count) {
          this.removeListener('resources-released', checkResources);
          resolve();
        }
      };
      
      this.on('resources-released', checkResources);
    });
  }

  /**
   * Acquire resources for execution
   */
  async acquireResources(count) {
    // Wait if not enough resources
    await this.waitForResources(count);
    
    // Acquire resources
    this.resourcePool.available -= count;
    this.resourcePool.allocated += count;
    
    // Update peak concurrency
    if (this.resourcePool.allocated > this.performanceStats.peakConcurrency) {
      this.performanceStats.peakConcurrency = this.resourcePool.allocated;
    }
    
    this.emit('resources-acquired', { count, available: this.resourcePool.available });
  }

  /**
   * Release resources after execution
   */
  releaseResources(count) {
    this.resourcePool.available += count;
    this.resourcePool.allocated -= count;
    
    this.emit('resources-released', { count, available: this.resourcePool.available });
  }

  /**
   * Track agent usage for load balancing
   */
  trackAgentUsage(agentId, event) {
    if (!agentId) return;
    
    if (!this.agentUsage.has(agentId)) {
      this.agentUsage.set(agentId, {
        executions: 0,
        active: 0,
        successful: 0,
        failed: 0,
        totalTime: 0,
        lastUsed: null
      });
    }
    
    const usage = this.agentUsage.get(agentId);
    
    switch (event) {
      case 'start':
        usage.executions++;
        usage.active++;
        usage.lastUsed = Date.now();
        break;
        
      case 'success':
        usage.successful++;
        usage.active--;
        break;
        
      case 'failure':
        usage.failed++;
        usage.active--;
        break;
    }
  }

  /**
   * Get least loaded agent for task
   */
  selectOptimalAgent(availableAgents) {
    if (!this.options.enableLoadBalancing) {
      return availableAgents[0];
    }
    
    let bestAgent = availableAgents[0];
    let lowestLoad = Infinity;
    
    availableAgents.forEach(agent => {
      const usage = this.agentUsage.get(agent.id) || { active: 0 };
      const load = usage.active;
      
      if (load < lowestLoad) {
        lowestLoad = load;
        bestAgent = agent;
      }
    });
    
    return bestAgent;
  }

  /**
   * Optimize execution order for performance
   */
  optimizeExecutionOrder(tasks) {
    if (!this.options.enablePrioritization) {
      return tasks;
    }
    
    return tasks.sort((a, b) => {
      // Priority comparison
      const priorityDiff = this.comparePriority(a.priority, b.priority);
      if (priorityDiff !== 0) return priorityDiff;
      
      // Estimated duration comparison (shorter first)
      const durationA = a.estimatedDuration || 5000;
      const durationB = b.estimatedDuration || 5000;
      return durationA - durationB;
    });
  }

  /**
   * Compare priorities
   */
  comparePriority(a, b) {
    const priorities = { high: 3, medium: 2, low: 1 };
    return (priorities[b] || 2) - (priorities[a] || 2);
  }

  /**
   * Monitor resource usage
   */
  startResourceMonitoring() {
    // Monitor every 5 seconds
    this.monitoringInterval = setInterval(() => {
      const usage = {
        allocated: this.resourcePool.allocated,
        available: this.resourcePool.available,
        utilization: this.resourcePool.allocated / this.options.maxConcurrentAgents,
        queueLength: this.executionQueue.length,
        activeExecutions: this.activeExecutions.size
      };
      
      this.emit('resource-usage', usage);
      
      // Log if high utilization
      if (usage.utilization > 0.8) {
        console.log(`⚠️ High resource utilization: ${(usage.utilization * 100).toFixed(1)}%`);
      }
    }, 5000);
  }

  /**
   * Validate tasks before execution
   */
  validateTasks(tasks) {
    if (!Array.isArray(tasks) || tasks.length === 0) {
      throw new Error('Tasks must be a non-empty array');
    }
    
    const seenIds = new Set();
    tasks.forEach(task => {
      if (!task.id) {
        throw new Error('Each task must have an id');
      }
      
      if (seenIds.has(task.id)) {
        throw new Error(`Duplicate task id: ${task.id}`);
      }
      seenIds.add(task.id);
      
      if (!task.execute || typeof task.execute !== 'function') {
        throw new Error(`Task ${task.id} must have an execute function`);
      }
    });
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(error) {
    const retryableErrors = [
      'ETIMEDOUT',
      'ECONNRESET',
      'ECONNREFUSED',
      'timeout',
      'rate limit'
    ];
    
    const errorMessage = error.message?.toLowerCase() || '';
    return retryableErrors.some(retryable => 
      errorMessage.includes(retryable.toLowerCase())
    );
  }

  /**
   * Update execution metrics
   */
  updateExecutionMetrics(executionId, metrics) {
    this.executionMetrics.set(executionId, {
      ...this.executionMetrics.get(executionId),
      ...metrics,
      timestamp: Date.now()
    });
    
    // Update global stats
    this.performanceStats.totalExecutions++;
    if (metrics.success) {
      this.performanceStats.successfulExecutions++;
    } else {
      this.performanceStats.failedExecutions++;
    }
    
    // Update average execution time
    if (metrics.duration) {
      const prevAvg = this.performanceStats.averageExecutionTime;
      const prevCount = this.performanceStats.totalExecutions - 1;
      this.performanceStats.averageExecutionTime = 
        (prevAvg * prevCount + metrics.duration) / this.performanceStats.totalExecutions;
    }
  }

  /**
   * Get execution metrics
   */
  getExecutionMetrics(executionId) {
    return this.executionMetrics.get(executionId);
  }

  /**
   * Get performance report
   */
  getPerformanceReport() {
    const agentStats = [];
    
    for (const [agentId, usage] of this.agentUsage) {
      agentStats.push({
        agentId,
        ...usage,
        successRate: usage.executions > 0 
          ? usage.successful / usage.executions 
          : 0,
        averageTime: usage.executions > 0
          ? usage.totalTime / usage.executions
          : 0
      });
    }
    
    return {
      global: this.performanceStats,
      agents: agentStats,
      resources: {
        ...this.resourcePool,
        utilization: this.resourcePool.allocated / this.options.maxConcurrentAgents
      },
      activeExecutions: Array.from(this.activeExecutions.values())
    };
  }

  /**
   * Generate unique execution ID
   */
  generateExecutionId() {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique task ID
   */
  generateTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Delay helper
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Shutdown executor
   */
  async shutdown() {
    console.log('🛑 Shutting down ParallelExecutor...');
    
    // Stop monitoring
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    // Wait for active executions
    if (this.activeExecutions.size > 0) {
      console.log(`⏳ Waiting for ${this.activeExecutions.size} active executions to complete...`);
      
      // Set timeout for graceful shutdown
      const shutdownTimeout = setTimeout(() => {
        console.warn('⚠️ Force shutting down with active executions');
      }, 10000);
      
      // Wait for executions to complete
      while (this.activeExecutions.size > 0) {
        await this.delay(100);
      }
      
      clearTimeout(shutdownTimeout);
    }
    
    // Clear all state
    this.activeExecutions.clear();
    this.executionQueue = [];
    this.agentUsage.clear();
    this.executionMetrics.clear();
    
    this.emit('shutdown');
  }
}

export default ParallelExecutor;