/**
 * TaskDecomposer - Breaks down complex tasks into subtasks for multi-agent execution
 * 
 * Analyzes tasks to identify components that can be handled by different agents
 * either in parallel or sequential execution patterns.
 */

import { agentsConfig, getAgentsByCapability } from '../../../config/agents.js';

export class TaskDecomposer {
  constructor(options = {}) {
    this.options = {
      maxDecompositionDepth: options.maxDecompositionDepth || 3,
      minSubtaskComplexity: options.minSubtaskComplexity || 0.3,
      enableAutoDecomposition: options.enableAutoDecomposition !== false,
      ...options
    };
    
    // Decomposition patterns for travel tasks
    this.decompositionPatterns = {
      'complete-trip-planning': {
        pattern: 'hierarchical',
        subtasks: [
          { type: 'document-verification', priority: 'high', parallel: false },
          { type: 'itinerary-planning', priority: 'high', parallel: false },
          { type: 'booking-coordination', priority: 'medium', parallel: true },
          { type: 'task-generation', priority: 'medium', parallel: true }
        ]
      },
      'booking-from-email': {
        pattern: 'sequential',
        subtasks: [
          { type: 'email-parsing', priority: 'high', parallel: false },
          { type: 'booking-extraction', priority: 'high', parallel: false },
          { type: 'calendar-integration', priority: 'medium', parallel: true },
          { type: 'reminder-creation', priority: 'low', parallel: true }
        ]
      },
      'document-processing': {
        pattern: 'parallel',
        subtasks: [
          { type: 'text-extraction', priority: 'high', parallel: true },
          { type: 'data-validation', priority: 'high', parallel: true },
          { type: 'expiry-checking', priority: 'medium', parallel: true },
          { type: 'compliance-verification', priority: 'medium', parallel: true }
        ]
      },
      'multi-city-planning': {
        pattern: 'mixed',
        subtasks: [
          { type: 'route-optimization', priority: 'high', parallel: false },
          { type: 'accommodation-search', priority: 'medium', parallel: true },
          { type: 'activity-planning', priority: 'medium', parallel: true },
          { type: 'transportation-booking', priority: 'high', parallel: false }
        ]
      }
    };
    
    // Task complexity indicators
    this.complexityIndicators = {
      multiDestination: ['multiple cities', 'multi-city', 'several destinations'],
      multiDocument: ['documents', 'passport and visa', 'multiple files'],
      timeConstrained: ['urgent', 'asap', 'deadline', 'time-sensitive'],
      multiPerson: ['group', 'family', 'multiple travelers'],
      budgetConstrained: ['budget', 'cost limit', 'price constraint'],
      specialRequirements: ['dietary', 'accessibility', 'medical', 'special needs']
    };
  }

  /**
   * Decompose a complex task into subtasks
   * @param {Object} task - The task to decompose
   * @param {Object} context - Execution context
   * @returns {Object} Decomposition result
   */
  async decompose(task, context = {}) {
    try {
      console.log(`🔍 Decomposing task: ${task.type || 'complex-task'}`);
      
      // Analyze task complexity
      const complexity = this.analyzeComplexity(task);
      console.log(`📊 Task complexity: ${complexity.score.toFixed(2)} (${complexity.level})`);
      
      if (complexity.score < this.options.minSubtaskComplexity) {
        return {
          needsDecomposition: false,
          reason: 'Task is simple enough for single agent',
          originalTask: task
        };
      }
      
      // Identify decomposition strategy
      const strategy = this.selectDecompositionStrategy(task, complexity);
      console.log(`📋 Selected strategy: ${strategy.type}`);
      
      // Generate subtasks
      const subtasks = await this.generateSubtasks(task, strategy, complexity);
      
      // Build execution graph
      const executionGraph = this.buildExecutionGraph(subtasks, strategy);
      
      // Optimize decomposition
      const optimized = this.optimizeDecomposition(executionGraph, context);
      
      return {
        needsDecomposition: true,
        complexity,
        strategy,
        subtasks: optimized.subtasks,
        executionGraph: optimized.graph,
        estimatedDuration: optimized.estimatedDuration,
        requiredAgents: this.identifyRequiredAgents(optimized.subtasks),
        metadata: {
          decompositionDepth: 1,
          totalSubtasks: optimized.subtasks.length,
          parallelizableCount: optimized.subtasks.filter(st => st.canParallelize).length
        }
      };
      
    } catch (error) {
      console.error('❌ Task decomposition failed:', error);
      throw error;
    }
  }

  /**
   * Analyze task complexity
   */
  analyzeComplexity(task) {
    let complexityScore = 0;
    const factors = [];
    
    // Check task description length and structure
    const description = JSON.stringify(task).toLowerCase();
    
    // Factor 1: Multi-component indicators
    let componentCount = 0;
    for (const [indicator, keywords] of Object.entries(this.complexityIndicators)) {
      if (keywords.some(keyword => description.includes(keyword))) {
        componentCount++;
        factors.push(indicator);
      }
    }
    complexityScore += componentCount * 0.15;
    
    // Factor 2: Data complexity
    if (task.data) {
      if (task.data.destinations?.length > 1) {
        complexityScore += 0.2;
        factors.push('multipleDestinations');
      }
      if (task.data.documents?.length > 1) {
        complexityScore += 0.15;
        factors.push('multipleDocuments');
      }
      if (task.data.requirements?.length > 3) {
        complexityScore += 0.1;
        factors.push('complexRequirements');
      }
    }
    
    // Factor 3: Cross-domain requirements
    const domains = this.identifyDomains(task);
    if (domains.length > 1) {
      complexityScore += domains.length * 0.1;
      factors.push('crossDomain');
    }
    
    // Factor 4: Time constraints
    if (task.deadline || description.includes('urgent')) {
      complexityScore += 0.15;
      factors.push('timeConstrained');
    }
    
    // Factor 5: Dependencies mentioned
    if (description.includes('after') || description.includes('before') || 
        description.includes('depends') || description.includes('requires')) {
      complexityScore += 0.2;
      factors.push('hasDependencies');
    }
    
    // Normalize score
    complexityScore = Math.min(1.0, complexityScore);
    
    return {
      score: complexityScore,
      level: this.getComplexityLevel(complexityScore),
      factors,
      domains,
      requiresCoordination: complexityScore > 0.6
    };
  }

  /**
   * Select decomposition strategy
   */
  selectDecompositionStrategy(task, complexity) {
    // Check predefined patterns
    for (const [patternName, pattern] of Object.entries(this.decompositionPatterns)) {
      if (this.matchesPattern(task, patternName)) {
        return {
          type: patternName,
          pattern: pattern.pattern,
          predefined: true,
          subtaskTemplate: pattern.subtasks
        };
      }
    }
    
    // Dynamic strategy selection based on complexity factors
    if (complexity.factors.includes('hasDependencies')) {
      return {
        type: 'sequential',
        pattern: 'sequential',
        predefined: false,
        reason: 'Task has explicit dependencies'
      };
    }
    
    if (complexity.factors.includes('multipleDocuments') || 
        complexity.factors.includes('multipleDestinations')) {
      return {
        type: 'parallel',
        pattern: 'parallel',
        predefined: false,
        reason: 'Multiple independent components'
      };
    }
    
    if (complexity.domains.length > 2) {
      return {
        type: 'hierarchical',
        pattern: 'hierarchical',
        predefined: false,
        reason: 'Multiple domains require hierarchical coordination'
      };
    }
    
    // Default to mixed strategy
    return {
      type: 'mixed',
      pattern: 'mixed',
      predefined: false,
      reason: 'Complex task with various requirements'
    };
  }

  /**
   * Generate subtasks based on strategy
   */
  async generateSubtasks(task, strategy, complexity) {
    const subtasks = [];
    
    if (strategy.predefined && strategy.subtaskTemplate) {
      // Use predefined template
      for (const template of strategy.subtaskTemplate) {
        const subtask = this.createSubtaskFromTemplate(task, template);
        if (subtask) {
          subtasks.push(subtask);
        }
      }
    } else {
      // Generate dynamically based on domains and requirements
      const components = this.identifyTaskComponents(task);
      
      for (const component of components) {
        const subtask = await this.createSubtask(task, component, strategy);
        subtasks.push(subtask);
      }
    }
    
    // Add dependencies
    this.addSubtaskDependencies(subtasks, strategy);
    
    // Assign IDs
    subtasks.forEach((subtask, index) => {
      subtask.id = `${task.id || 'task'}_sub_${index + 1}`;
      subtask.parentTask = task.id || 'main';
    });
    
    return subtasks;
  }

  /**
   * Create subtask from template
   */
  createSubtaskFromTemplate(parentTask, template) {
    return {
      type: template.type,
      priority: template.priority,
      canParallelize: template.parallel,
      data: this.extractRelevantData(parentTask, template.type),
      requirements: this.extractRequirements(parentTask, template.type),
      estimatedDuration: this.estimateSubtaskDuration(template.type),
      requiredCapabilities: this.getRequiredCapabilities(template.type)
    };
  }

  /**
   * Create subtask dynamically
   */
  async createSubtask(parentTask, component, strategy) {
    const subtaskType = this.mapComponentToTaskType(component);
    const capabilities = this.getRequiredCapabilities(subtaskType);
    
    return {
      type: subtaskType,
      component: component.name,
      priority: this.assessComponentPriority(component, parentTask),
      canParallelize: strategy.pattern === 'parallel' || component.independent,
      data: component.data || this.extractRelevantData(parentTask, subtaskType),
      requirements: component.requirements || [],
      estimatedDuration: this.estimateSubtaskDuration(subtaskType),
      requiredCapabilities: capabilities,
      preferredAgents: this.getPreferredAgents(capabilities)
    };
  }

  /**
   * Build execution graph
   */
  buildExecutionGraph(subtasks, strategy) {
    const graph = {
      nodes: [],
      edges: [],
      executionOrder: [],
      parallelGroups: []
    };
    
    // Create nodes
    subtasks.forEach(subtask => {
      graph.nodes.push({
        id: subtask.id,
        task: subtask,
        status: 'pending',
        dependencies: subtask.dependencies || [],
        dependents: []
      });
    });
    
    // Create edges based on dependencies
    graph.nodes.forEach(node => {
      node.dependencies.forEach(depId => {
        graph.edges.push({
          from: depId,
          to: node.id,
          type: 'dependency'
        });
        
        // Update dependents
        const depNode = graph.nodes.find(n => n.id === depId);
        if (depNode) {
          depNode.dependents.push(node.id);
        }
      });
    });
    
    // Determine execution order
    if (strategy.pattern === 'sequential') {
      graph.executionOrder = subtasks.map(st => st.id);
    } else if (strategy.pattern === 'parallel') {
      graph.parallelGroups = [subtasks.map(st => st.id)];
    } else {
      // Mixed or hierarchical - use topological sort
      graph.executionOrder = this.topologicalSort(graph);
      graph.parallelGroups = this.identifyParallelGroups(graph);
    }
    
    return graph;
  }

  /**
   * Optimize decomposition for efficiency
   */
  optimizeDecomposition(executionGraph, context) {
    const optimized = {
      graph: { ...executionGraph },
      subtasks: [...executionGraph.nodes.map(n => n.task)],
      estimatedDuration: 0
    };
    
    // Merge similar subtasks that can be handled together
    optimized.subtasks = this.mergeSimilarSubtasks(optimized.subtasks);
    
    // Rebalance workload across agents
    this.rebalanceWorkload(optimized);
    
    // Optimize parallel execution groups
    if (optimized.graph.parallelGroups.length > 0) {
      optimized.graph.parallelGroups = this.optimizeParallelGroups(
        optimized.graph.parallelGroups,
        optimized.subtasks
      );
    }
    
    // Calculate estimated duration
    optimized.estimatedDuration = this.calculateEstimatedDuration(optimized);
    
    return optimized;
  }

  /**
   * Identify required agents for subtasks
   */
  identifyRequiredAgents(subtasks) {
    const requiredAgents = new Map();
    
    subtasks.forEach(subtask => {
      const agents = this.getPreferredAgents(subtask.requiredCapabilities);
      agents.forEach(agent => {
        if (!requiredAgents.has(agent.id)) {
          requiredAgents.set(agent.id, {
            agent,
            subtasks: []
          });
        }
        requiredAgents.get(agent.id).subtasks.push(subtask.id);
      });
    });
    
    return Array.from(requiredAgents.values());
  }

  /**
   * Check if task can be further decomposed
   */
  canDecomposeeFurther(subtask, currentDepth) {
    if (currentDepth >= this.options.maxDecompositionDepth) {
      return false;
    }
    
    const complexity = this.analyzeComplexity(subtask);
    return complexity.score > this.options.minSubtaskComplexity;
  }

  /**
   * Validate decomposition result
   */
  validateDecomposition(decomposition) {
    const validation = {
      valid: true,
      issues: []
    };
    
    // Check all original requirements are covered
    const coveredCapabilities = new Set();
    decomposition.subtasks.forEach(subtask => {
      subtask.requiredCapabilities.forEach(cap => coveredCapabilities.add(cap));
    });
    
    // Check for circular dependencies
    if (this.hasCircularDependencies(decomposition.executionGraph)) {
      validation.valid = false;
      validation.issues.push('Circular dependencies detected');
    }
    
    // Check for orphaned subtasks
    const orphaned = this.findOrphanedSubtasks(decomposition.executionGraph);
    if (orphaned.length > 0) {
      validation.issues.push(`Orphaned subtasks: ${orphaned.join(', ')}`);
    }
    
    return validation;
  }

  // Helper methods

  /**
   * Get complexity level from score
   */
  getComplexityLevel(score) {
    if (score < 0.3) return 'simple';
    if (score < 0.6) return 'moderate';
    if (score < 0.8) return 'complex';
    return 'very-complex';
  }

  /**
   * Identify domains in task
   */
  identifyDomains(task) {
    const domains = new Set();
    const description = JSON.stringify(task).toLowerCase();
    
    const domainKeywords = {
      travel: ['flight', 'hotel', 'destination', 'itinerary'],
      documentation: ['passport', 'visa', 'document', 'id'],
      finance: ['payment', 'budget', 'cost', 'price'],
      scheduling: ['calendar', 'date', 'time', 'schedule'],
      communication: ['email', 'contact', 'notify', 'message']
    };
    
    for (const [domain, keywords] of Object.entries(domainKeywords)) {
      if (keywords.some(keyword => description.includes(keyword))) {
        domains.add(domain);
      }
    }
    
    return Array.from(domains);
  }

  /**
   * Check if task matches pattern
   */
  matchesPattern(task, patternName) {
    const taskStr = JSON.stringify(task).toLowerCase();
    
    switch (patternName) {
      case 'complete-trip-planning':
        return taskStr.includes('complete') && taskStr.includes('trip');
      case 'booking-from-email':
        return task.source === 'email' || taskStr.includes('email');
      case 'document-processing':
        return task.data?.documents || taskStr.includes('document');
      case 'multi-city-planning':
        return task.data?.destinations?.length > 1;
      default:
        return false;
    }
  }

  /**
   * Identify task components
   */
  identifyTaskComponents(task) {
    const components = [];
    
    // Extract from data
    if (task.data) {
      if (task.data.destinations) {
        components.push({
          name: 'destination-planning',
          data: { destinations: task.data.destinations },
          independent: false
        });
      }
      
      if (task.data.documents) {
        components.push({
          name: 'document-processing',
          data: { documents: task.data.documents },
          independent: true
        });
      }
      
      if (task.data.requirements) {
        components.push({
          name: 'requirement-handling',
          data: { requirements: task.data.requirements },
          independent: false
        });
      }
    }
    
    // Extract from description
    const description = task.description || task.content || '';
    if (description.includes('book') || description.includes('reserve')) {
      components.push({
        name: 'booking-coordination',
        independent: false
      });
    }
    
    if (description.includes('todo') || description.includes('task')) {
      components.push({
        name: 'task-generation',
        independent: true
      });
    }
    
    return components;
  }

  /**
   * Merge similar subtasks that can be handled together
   */
  mergeSimilarSubtasks(subtasks) {
    if (!Array.isArray(subtasks) || subtasks.length <= 1) {
      return subtasks;
    }
    
    const merged = [];
    const processed = new Set();
    
    for (let i = 0; i < subtasks.length; i++) {
      if (processed.has(i)) continue;
      
      const currentTask = subtasks[i];
      const similarTasks = [currentTask];
      processed.add(i);
      
      // Find similar tasks
      for (let j = i + 1; j < subtasks.length; j++) {
        if (processed.has(j)) continue;
        
        const otherTask = subtasks[j];
        if (this.areTasksSimilar(currentTask, otherTask)) {
          similarTasks.push(otherTask);
          processed.add(j);
        }
      }
      
      // Merge similar tasks or keep single task
      if (similarTasks.length > 1) {
        merged.push(this.mergeTaskGroup(similarTasks));
      } else {
        merged.push(currentTask);
      }
    }
    
    return merged;
  }
  
  /**
   * Check if two tasks are similar enough to merge
   */
  areTasksSimilar(task1, task2) {
    // Check if tasks have the same type
    if (task1.type !== task2.type) return false;
    
    // Check if they target similar agents
    const agents1 = task1.requiredAgents || [];
    const agents2 = task2.requiredAgents || [];
    const commonAgents = agents1.filter(a => agents2.includes(a));
    
    if (commonAgents.length === 0) return false;
    
    // Check content similarity
    const desc1 = (task1.description || '').toLowerCase();
    const desc2 = (task2.description || '').toLowerCase();
    
    // Simple similarity check based on keywords
    const keywords1 = desc1.split(/\s+/);
    const keywords2 = desc2.split(/\s+/);
    const commonKeywords = keywords1.filter(k => keywords2.includes(k) && k.length > 3);
    
    return commonKeywords.length >= 2;
  }
  
  /**
   * Merge a group of similar tasks
   */
  mergeTaskGroup(tasks) {
    const baseTask = tasks[0];
    const merged = {
      ...baseTask,
      id: `merged_${Date.now()}`,
      description: `Combined task: ${tasks.map(t => t.description).join('; ')}`,
      data: this.mergeTaskData(tasks.map(t => t.data)),
      subtasks: tasks,
      merged: true
    };
    
    return merged;
  }
  
  /**
   * Merge data from multiple tasks
   */
  mergeTaskData(dataArray) {
    const merged = {};
    
    dataArray.forEach(data => {
      if (data && typeof data === 'object') {
        Object.keys(data).forEach(key => {
          if (Array.isArray(data[key])) {
            merged[key] = [...(merged[key] || []), ...data[key]];
          } else if (typeof data[key] === 'object') {
            merged[key] = { ...(merged[key] || {}), ...data[key] };
          } else {
            merged[key] = data[key];
          }
        });
      }
    });
    
    return merged;
  }
  
  /**
   * Rebalance workload across agents
   */
  rebalanceWorkload(optimized) {
    if (!optimized.subtasks || optimized.subtasks.length === 0) return;
    
    // Group tasks by required agents
    const agentWorkload = new Map();
    
    optimized.subtasks.forEach(task => {
      const agents = task.requiredAgents || ['general'];
      agents.forEach(agent => {
        if (!agentWorkload.has(agent)) {
          agentWorkload.set(agent, []);
        }
        agentWorkload.get(agent).push(task);
      });
    });
    
    // Redistribute if any agent is overloaded
    const maxTasksPerAgent = Math.ceil(optimized.subtasks.length / agentWorkload.size);
    
    for (const [agent, tasks] of agentWorkload) {
      if (tasks.length > maxTasksPerAgent) {
        // Find agents with lighter loads
        const lighterAgents = Array.from(agentWorkload.entries())
          .filter(([a, t]) => a !== agent && t.length < maxTasksPerAgent)
          .sort((a, b) => a[1].length - b[1].length);
        
        // Redistribute excess tasks
        const excessTasks = tasks.splice(maxTasksPerAgent);
        excessTasks.forEach((task, index) => {
          if (lighterAgents[index % lighterAgents.length]) {
            const [targetAgent] = lighterAgents[index % lighterAgents.length];
            task.requiredAgents = [targetAgent];
            agentWorkload.get(targetAgent).push(task);
          }
        });
      }
    }
  }
  
  /**
   * Optimize parallel execution groups
   */
  optimizeParallelGroups(parallelGroups, subtasks) {
    if (!Array.isArray(parallelGroups)) return [];
    
    return parallelGroups.map(group => {
      // Ensure group has tasks array
      const tasks = group.tasks || [];
      if (tasks.length === 0) {
        return {
          ...group,
          tasks: [],
          estimatedDuration: 0,
          parallelizable: 1
        };
      }
      
      // Sort tasks in group by estimated duration (shortest first)
      const sortedTasks = [...tasks].sort((a, b) => {
        const durationA = this.estimateTaskDuration(a);
        const durationB = this.estimateTaskDuration(b);
        return durationA - durationB;
      });
      
      // Group tasks that can run truly in parallel
      const optimizedGroup = {
        ...group,
        tasks: sortedTasks,
        estimatedDuration: Math.max(...sortedTasks.map(t => this.estimateTaskDuration(t))),
        parallelizable: this.assessParallelizability(sortedTasks)
      };
      
      return optimizedGroup;
    });
  }
  
  /**
   * Estimate task duration in seconds
   */
  estimateTaskDuration(task) {
    // Simple heuristic based on task type and complexity
    const baseTime = {
      'document-processing': 30,
      'itinerary-planning': 45,
      'booking-extraction': 20,
      'task-generation': 15,
      'email-monitoring': 10
    };
    
    const duration = baseTime[task.type] || 30;
    
    // Adjust based on data complexity
    if (task.data) {
      const dataSize = JSON.stringify(task.data).length;
      const complexityMultiplier = Math.min(dataSize / 1000, 3);
      return duration * (1 + complexityMultiplier);
    }
    
    return duration;
  }
  
  /**
   * Assess how parallelizable a group of tasks is
   */
  assessParallelizability(tasks) {
    if (tasks.length <= 1) return 1;
    
    // Check for dependencies between tasks
    let dependencies = 0;
    for (let i = 0; i < tasks.length; i++) {
      for (let j = i + 1; j < tasks.length; j++) {
        if (this.hasTaskDependency(tasks[i], tasks[j])) {
          dependencies++;
        }
      }
    }
    
    // Return parallelizability score (0-1)
    const maxDependencies = (tasks.length * (tasks.length - 1)) / 2;
    return Math.max(0, 1 - (dependencies / maxDependencies));
  }
  
  /**
   * Check if one task depends on another
   */
  hasTaskDependency(task1, task2) {
    // Simple dependency detection
    if (task1.dependencies && task1.dependencies.includes(task2.id)) return true;
    if (task2.dependencies && task2.dependencies.includes(task1.id)) return true;
    
    // Check data dependencies
    if (task1.data && task2.data) {
      // If one task produces data that another consumes
      const task1Outputs = Object.keys(task1.data);
      const task2Inputs = task2.requiredInputs || [];
      return task1Outputs.some(output => task2Inputs.includes(output));
    }
    
    return false;
  }

  /**
   * Extract requirements from parent task
   */
  extractRequirements(parentTask, subtaskType) {
    // Extract requirements from parent task based on subtask type
    const requirements = [];
    
    if (parentTask.requirements) {
      requirements.push(...parentTask.requirements);
    }
    
    // Add type-specific requirements
    switch (subtaskType) {
      case 'document-verification':
        requirements.push('Valid documents required');
        break;
      case 'itinerary-planning':
        requirements.push('Travel dates must be confirmed');
        break;
      case 'booking-extraction':
        requirements.push('Email content must be provided');
        break;
      case 'task-generation':
        requirements.push('Clear action items needed');
        break;
    }
    
    return requirements;
  }

  /**
   * Extract relevant data for subtask type
   */
  extractRelevantData(parentTask, subtaskType) {
    const data = {};
    
    switch (subtaskType) {
      case 'document-verification':
        data.documents = parentTask.data?.documents || [];
        data.requirements = parentTask.data?.documentRequirements || [];
        break;
        
      case 'itinerary-planning':
        data.destinations = parentTask.data?.destinations || [];
        data.dates = parentTask.data?.dates || {};
        data.preferences = parentTask.data?.preferences || {};
        break;
        
      case 'booking-extraction':
        data.content = parentTask.content || parentTask.data?.emailContent;
        break;
        
      case 'task-generation':
        data.conversation = parentTask.data?.conversation || [];
        data.requirements = parentTask.data?.requirements || [];
        break;
        
      default:
        data.parentData = parentTask.data;
    }
    
    return data;
  }

  /**
   * Get required capabilities for task type
   */
  getRequiredCapabilities(taskType) {
    const capabilityMap = {
      'document-verification': ['document-analysis', 'text-extraction'],
      'itinerary-planning': ['itinerary-creation', 'route-optimization'],
      'booking-extraction': ['email-parsing', 'booking-extraction'],
      'task-generation': ['task-extraction', 'priority-assignment'],
      'email-parsing': ['email-parsing'],
      'route-optimization': ['route-optimization', 'multi-city-planning']
    };
    
    return capabilityMap[taskType] || ['general-processing'];
  }

  /**
   * Get preferred agents for capabilities
   */
  getPreferredAgents(capabilities) {
    const agents = [];
    const seen = new Set();
    
    capabilities.forEach(capability => {
      const capableAgents = getAgentsByCapability(capability);
      capableAgents.forEach(agent => {
        if (!seen.has(agent.id)) {
          seen.add(agent.id);
          agents.push(agent);
        }
      });
    });
    
    return agents;
  }

  /**
   * Add dependencies between subtasks
   */
  addSubtaskDependencies(subtasks, strategy) {
    if (strategy.pattern === 'sequential') {
      // Sequential: each depends on previous
      for (let i = 1; i < subtasks.length; i++) {
        subtasks[i].dependencies = [subtasks[i - 1].id];
      }
    } else if (strategy.pattern === 'hierarchical') {
      // Hierarchical: verification before planning, planning before booking
      const verification = subtasks.find(st => st.type.includes('verification'));
      const planning = subtasks.find(st => st.type.includes('planning'));
      const booking = subtasks.find(st => st.type.includes('booking'));
      
      if (planning && verification) {
        planning.dependencies = [verification.id];
      }
      if (booking && planning) {
        booking.dependencies = [planning.id];
      }
    }
    
    // Add logical dependencies
    subtasks.forEach(subtask => {
      if (subtask.type === 'task-generation') {
        // Task generation depends on all analysis tasks
        const analysisTasks = subtasks.filter(st => 
          st.type.includes('analysis') || st.type.includes('extraction')
        );
        subtask.dependencies = analysisTasks.map(t => t.id);
      }
    });
  }

  /**
   * Topological sort for execution order
   */
  topologicalSort(graph) {
    const visited = new Set();
    const stack = [];
    
    const visit = (nodeId) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      
      const node = graph.nodes.find(n => n.id === nodeId);
      if (node) {
        node.dependencies.forEach(depId => visit(depId));
        stack.push(nodeId);
      }
    };
    
    graph.nodes.forEach(node => {
      if (!visited.has(node.id)) {
        visit(node.id);
      }
    });
    
    return stack;
  }

  /**
   * Identify parallel execution groups
   */
  identifyParallelGroups(graph) {
    const groups = [];
    const assigned = new Set();
    
    // Group nodes by dependency level
    const levels = this.calculateDependencyLevels(graph);
    
    for (const [level, nodes] of levels) {
      const group = nodes.filter(nodeId => !assigned.has(nodeId));
      if (group.length > 0) {
        groups.push(group);
        group.forEach(nodeId => assigned.add(nodeId));
      }
    }
    
    return groups;
  }

  /**
   * Calculate dependency levels
   */
  calculateDependencyLevels(graph) {
    const levels = new Map();
    const nodeLevel = new Map();
    
    const calculateLevel = (nodeId) => {
      if (nodeLevel.has(nodeId)) {
        return nodeLevel.get(nodeId);
      }
      
      const node = graph.nodes.find(n => n.id === nodeId);
      if (!node || node.dependencies.length === 0) {
        nodeLevel.set(nodeId, 0);
        return 0;
      }
      
      const maxDepLevel = Math.max(
        ...node.dependencies.map(depId => calculateLevel(depId))
      );
      const level = maxDepLevel + 1;
      nodeLevel.set(nodeId, level);
      return level;
    };
    
    // Calculate levels for all nodes
    graph.nodes.forEach(node => {
      const level = calculateLevel(node.id);
      if (!levels.has(level)) {
        levels.set(level, []);
      }
      levels.get(level).push(node.id);
    });
    
    return levels;
  }

  /**
   * Check for circular dependencies
   */
  hasCircularDependencies(graph) {
    const visited = new Set();
    const recursionStack = new Set();
    
    const hasCycle = (nodeId) => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      
      const node = graph.nodes.find(n => n.id === nodeId);
      if (node) {
        for (const depId of node.dependencies) {
          if (!visited.has(depId)) {
            if (hasCycle(depId)) return true;
          } else if (recursionStack.has(depId)) {
            return true;
          }
        }
      }
      
      recursionStack.delete(nodeId);
      return false;
    };
    
    for (const node of graph.nodes) {
      if (!visited.has(node.id)) {
        if (hasCycle(node.id)) return true;
      }
    }
    
    return false;
  }

  /**
   * Estimate subtask duration
   */
  estimateSubtaskDuration(taskType) {
    const estimatedDurations = {
      'document-verification': 5000,
      'itinerary-planning': 15000,
      'booking-extraction': 3000,
      'task-generation': 8000,
      'email-parsing': 2000,
      'route-optimization': 10000
    };
    
    return estimatedDurations[taskType] || 5000;
  }

  /**
   * Calculate total estimated duration
   */
  calculateEstimatedDuration(optimized) {
    if (optimized.graph.parallelGroups.length > 0) {
      // For parallel execution, take max duration of each group
      let totalDuration = 0;
      
      optimized.graph.parallelGroups.forEach(group => {
        // Handle both array groups and single task groups
        const tasks = Array.isArray(group) ? group : (group.tasks || [group]);
        const groupDuration = Math.max(...tasks.map(taskId => {
          const task = optimized.subtasks.find(st => st.id === taskId);
          return task?.estimatedDuration || 0;
        }));
        totalDuration += groupDuration;
      });
      
      return totalDuration;
    } else {
      // Sequential: sum all durations
      return optimized.subtasks.reduce(
        (sum, task) => sum + (task.estimatedDuration || 0), 0
      );
    }
  }
}

export default TaskDecomposer;