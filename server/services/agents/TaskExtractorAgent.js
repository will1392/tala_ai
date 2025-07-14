/**
 * TaskExtractorAgent - Specialized agent for extracting actionable tasks from conversations
 * 
 * Identifies tasks, creates todo items, sets priorities and deadlines based on
 * conversation context and travel requirements.
 */

import BaseAgent from './BaseAgent.js';

export class TaskExtractorAgent extends BaseAgent {
  constructor(options = {}) {
    super({
      ...options,
      preferredLLM: 'llama-3.1',
      confidence_threshold: 0.75,
      temperature: 0.4
    });
    
    // Task categories for travel
    this.taskCategories = {
      booking: {
        keywords: ['book', 'reserve', 'purchase', 'buy', 'confirm'],
        priority: 'high',
        typicalDeadline: 7 // days
      },
      documentation: {
        keywords: ['passport', 'visa', 'document', 'paperwork', 'form'],
        priority: 'high',
        typicalDeadline: 14
      },
      preparation: {
        keywords: ['pack', 'prepare', 'arrange', 'organize', 'plan'],
        priority: 'medium',
        typicalDeadline: 3
      },
      research: {
        keywords: ['research', 'find', 'check', 'look up', 'investigate'],
        priority: 'medium',
        typicalDeadline: 7
      },
      communication: {
        keywords: ['contact', 'call', 'email', 'notify', 'inform'],
        priority: 'medium',
        typicalDeadline: 2
      },
      payment: {
        keywords: ['pay', 'payment', 'transfer', 'send money', 'fee'],
        priority: 'high',
        typicalDeadline: 1
      }
    };
    
    // Action verb patterns
    this.actionPatterns = [
      /(?:need to|have to|must|should|will|going to|want to|plan to)\s+(\w+)/gi,
      /(?:don't forget to|remember to|make sure to)\s+(\w+)/gi,
      /(?:please|kindly|could you|can you)\s+(\w+)/gi,
      /(?:i'll|we'll|let's|shall we)\s+(\w+)/gi
    ];
  }

  /**
   * Get agent capabilities
   */
  getCapabilities() {
    return [
      'task-extraction',
      'todo-creation',
      'priority-assignment',
      'deadline-detection',
      'dependency-analysis',
      'action-categorization',
      'reminder-generation'
    ];
  }

  /**
   * Get agent specialization
   */
  getSpecialization() {
    return 'task-extraction-planning';
  }

  /**
   * Get preferred LLM
   */
  getPreferredLLM() {
    return 'llama-3.1';
  }

  /**
   * Get supported task types
   */
  getSupportedTaskTypes() {
    return [
      'extract-tasks',
      'create-todos',
      'prioritize-tasks',
      'set-deadlines',
      'analyze-dependencies'
    ];
  }

  /**
   * Evaluate if agent can handle task
   */
  async evaluateTask(task) {
    // High confidence for task extraction
    if (task.type && task.type.includes('task')) {
      return 0.95;
    }
    
    // Check for todo/action keywords
    const keywords = ['todo', 'task', 'action', 'need to', 'must', 'should', 'deadline'];
    const taskText = JSON.stringify(task).toLowerCase();
    
    const matches = keywords.filter(keyword => taskText.includes(keyword));
    if (matches.length >= 2) {
      return 0.85;
    }
    
    // Check if analyzing conversation for tasks
    if (task.data?.conversation || task.data?.messages) {
      return 0.8;
    }
    
    return 0.4;
  }

  /**
   * Validate task
   */
  async validateTask(task) {
    if (!task.data?.conversation && !task.data?.messages && !task.content) {
      return { 
        valid: false, 
        reason: 'No conversation or content provided for task extraction' 
      };
    }
    
    return { valid: true };
  }

  /**
   * Perform task extraction
   */
  async performTask(task, context) {
    const taskType = task.type || 'extract-tasks';
    
    console.log(`📝 Extracting tasks: ${taskType}`);
    
    let result;
    
    switch (taskType) {
      case 'extract-tasks':
        result = await this.extractTasks(task.data, context);
        break;
        
      case 'create-todos':
        result = await this.createTodoItems(task.data, context);
        break;
        
      case 'prioritize-tasks':
        result = await this.prioritizeTasks(task.data, context);
        break;
        
      case 'set-deadlines':
        result = await this.setDeadlines(task.data, context);
        break;
        
      case 'analyze-dependencies':
        result = await this.analyzeDependencies(task.data, context);
        break;
        
      default:
        result = await this.extractTasks(task.data, context);
    }
    
    return result;
  }

  /**
   * Extract tasks from conversation
   */
  async extractTasks(data, context) {
    const content = this.prepareContent(data);
    
    const prompt = `Analyze this travel planning conversation and extract all actionable tasks:

${content}

For each task identified, provide:
1. Task description (clear, actionable statement)
2. Category (booking, documentation, preparation, research, communication, payment, other)
3. Priority (high, medium, low)
4. Suggested deadline (specific date or relative like "3 days before departure")
5. Dependencies (other tasks that must be completed first)
6. Assigned to (traveler, agent, or third party)
7. Status (not started, in progress, completed, blocked)
8. Notes or context

Also identify:
- Implicit tasks (not directly stated but necessary)
- Time-sensitive tasks that need immediate attention
- Tasks that can be automated or delegated

Format as a JSON array of task objects.`;

    try {
      const response = await this.callLLM(prompt, {
        temperature: 0.4,
        maxTokens: 2000,
        responseFormat: { type: 'json_object' }
      });
      
      const extracted = this.parseAIResponse(response);
      
      // Enhance with pattern matching
      const patternTasks = this.extractTasksFromPatterns(content);
      
      // Merge and deduplicate
      const allTasks = this.mergeExtractedTasks(
        extracted.tasks || extracted,
        patternTasks
      );
      
      // Process and validate tasks
      const processed = await this.processTasks(allTasks, data);
      
      // Group by category and priority
      const organized = this.organizeTasks(processed);
      
      return {
        tasks: processed,
        summary: this.generateTaskSummary(processed),
        organized,
        timeline: this.createTaskTimeline(processed, data)
      };
      
    } catch (error) {
      console.error('Task extraction error:', error);
      throw error;
    }
  }

  /**
   * Create todo items from extracted tasks
   */
  async createTodoItems(data, context) {
    let tasks = data.tasks;
    
    // Extract tasks first if not provided
    if (!tasks) {
      const extraction = await this.extractTasks(data, context);
      tasks = extraction.tasks;
    }
    
    const todos = tasks.map(task => ({
      id: this.generateTodoId(),
      title: this.createTodoTitle(task),
      description: task.description,
      category: task.category,
      priority: task.priority,
      deadline: this.calculateDeadline(task, data),
      status: task.status || 'pending',
      assignee: task.assignedTo || 'user',
      dependencies: task.dependencies || [],
      tags: this.generateTags(task),
      created: new Date().toISOString(),
      metadata: {
        source: 'conversation',
        confidence: task.confidence || 0.8,
        originalTask: task
      }
    }));
    
    // Sort by priority and deadline
    const sorted = this.sortTodos(todos);
    
    // Identify quick wins
    const quickWins = sorted.filter(todo => 
      todo.priority === 'low' && !todo.dependencies.length
    );
    
    return {
      todos: sorted,
      quickWins,
      statistics: {
        total: todos.length,
        byPriority: this.countByPriority(todos),
        byCategory: this.countByCategory(todos),
        overdue: todos.filter(t => new Date(t.deadline) < new Date()).length
      }
    };
  }

  /**
   * Prioritize tasks based on context
   */
  async prioritizeTasks(data, context) {
    const tasks = data.tasks || [];
    const travelDate = data.travelDate || this.extractTravelDate(data);
    
    const prompt = `Prioritize these travel tasks based on urgency and importance:

Travel Date: ${travelDate || 'Not specified'}
Current Date: ${new Date().toISOString().split('T')[0]}

Tasks:
${tasks.map((t, i) => `${i + 1}. ${t.description || t}`).join('\n')}

Consider:
1. Legal requirements (visas, passports) - highest priority
2. Time-sensitive bookings (flights, accommodations)
3. Dependencies between tasks
4. Cancellation deadlines
5. Personal preferences vs necessities

Provide prioritized list with reasoning for each priority level.`;

    try {
      const response = await this.callLLM(prompt, {
        temperature: 0.3,
        maxTokens: 1000
      });
      
      const prioritization = this.parseAIResponse(response);
      
      // Apply prioritization rules
      const prioritized = this.applyPrioritizationRules(tasks, prioritization, {
        travelDate,
        currentDate: new Date()
      });
      
      // Create priority matrix
      const matrix = this.createPriorityMatrix(prioritized);
      
      return {
        prioritizedTasks: prioritized,
        matrix,
        criticalPath: this.identifyCriticalPath(prioritized),
        recommendations: this.generatePriorityRecommendations(prioritized, travelDate)
      };
      
    } catch (error) {
      console.error('Task prioritization error:', error);
      throw error;
    }
  }

  /**
   * Set deadlines for tasks
   */
  async setDeadlines(data, context) {
    const tasks = data.tasks || [];
    const travelDate = data.travelDate || this.extractTravelDate(data);
    const preferences = data.preferences || {};
    
    const deadlines = await Promise.all(tasks.map(async task => {
      if (task.deadline) {
        return {
          ...task,
          deadline: this.standardizeDeadline(task.deadline, travelDate)
        };
      }
      
      // Calculate deadline based on task type and travel date
      const deadline = await this.calculateOptimalDeadline(task, {
        travelDate,
        category: task.category || this.categorizeTask(task),
        dependencies: task.dependencies,
        preferences
      });
      
      return {
        ...task,
        deadline,
        deadlineType: deadline.type,
        deadlineReasoning: deadline.reasoning
      };
    }));
    
    // Check for conflicts
    const conflicts = this.identifyDeadlineConflicts(deadlines);
    
    // Optimize schedule
    const optimized = this.optimizeDeadlines(deadlines, conflicts);
    
    return {
      tasks: optimized,
      conflicts,
      timeline: this.createDeadlineTimeline(optimized),
      alerts: this.generateDeadlineAlerts(optimized)
    };
  }

  /**
   * Analyze task dependencies
   */
  async analyzeDependencies(data, context) {
    const tasks = data.tasks || [];
    
    const prompt = `Analyze dependencies between these travel tasks:

${tasks.map((t, i) => `${i + 1}. ${t.description || t}`).join('\n')}

Identify:
1. Direct dependencies (task X must be completed before task Y)
2. Soft dependencies (task X should preferably be done before Y)
3. Parallel tasks (can be done simultaneously)
4. Blocking tasks (prevent other tasks from starting)
5. Optional dependencies

Create a dependency graph showing the relationships.`;

    try {
      const response = await this.callLLM(prompt, {
        temperature: 0.3,
        maxTokens: 1200
      });
      
      const dependencies = this.parseAIResponse(response);
      
      // Build dependency graph
      const graph = this.buildDependencyGraph(tasks, dependencies);
      
      // Find critical path
      const criticalPath = this.findCriticalPath(graph);
      
      // Identify bottlenecks
      const bottlenecks = this.identifyBottlenecks(graph);
      
      // Generate execution order
      const executionOrder = this.topologicalSort(graph);
      
      return {
        dependencies: graph,
        criticalPath,
        bottlenecks,
        executionOrder,
        parallelizableTasks: this.findParallelizableTasks(graph),
        visualization: this.generateDependencyVisualization(graph)
      };
      
    } catch (error) {
      console.error('Dependency analysis error:', error);
      throw error;
    }
  }

  // Helper methods

  /**
   * Prepare content from various formats
   */
  prepareContent(data) {
    if (typeof data === 'string') return data;
    
    if (data.content) return data.content;
    
    if (data.conversation) {
      return Array.isArray(data.conversation) 
        ? data.conversation.map(msg => `${msg.role}: ${msg.content}`).join('\n')
        : data.conversation;
    }
    
    if (data.messages) {
      return data.messages.map(msg => `${msg.role || 'user'}: ${msg.content}`).join('\n');
    }
    
    return JSON.stringify(data);
  }

  /**
   * Extract tasks using patterns
   */
  extractTasksFromPatterns(content) {
    const tasks = [];
    const lines = content.split('\n');
    
    lines.forEach(line => {
      // Check action patterns
      for (const pattern of this.actionPatterns) {
        const matches = line.matchAll(pattern);
        for (const match of matches) {
          const action = match[1];
          if (action && action.length > 2) {
            tasks.push({
              description: this.cleanTaskDescription(match[0]),
              category: this.categorizeByKeywords(line),
              source: 'pattern',
              confidence: 0.7
            });
          }
        }
      }
      
      // Check for explicit task indicators
      if (line.match(/^[-*•]\s*.+/) || line.match(/^\d+\.\s*.+/)) {
        tasks.push({
          description: line.replace(/^[-*•\d.]\s*/, '').trim(),
          category: this.categorizeByKeywords(line),
          source: 'list',
          confidence: 0.8
        });
      }
    });
    
    return tasks;
  }

  /**
   * Categorize task by keywords
   */
  categorizeByKeywords(text) {
    const textLower = text.toLowerCase();
    
    for (const [category, config] of Object.entries(this.taskCategories)) {
      const matches = config.keywords.filter(keyword => textLower.includes(keyword));
      if (matches.length > 0) {
        return category;
      }
    }
    
    return 'other';
  }

  /**
   * Merge extracted tasks and deduplicate
   */
  mergeExtractedTasks(aiTasks, patternTasks) {
    const allTasks = [...(Array.isArray(aiTasks) ? aiTasks : []), ...patternTasks];
    const uniqueTasks = [];
    const seen = new Set();
    
    allTasks.forEach(task => {
      const key = this.normalizeTaskDescription(task.description || task);
      if (!seen.has(key)) {
        seen.add(key);
        uniqueTasks.push(task);
      }
    });
    
    return uniqueTasks;
  }

  /**
   * Process and enhance tasks
   */
  async processTasks(tasks, data) {
    return Promise.all(tasks.map(async task => {
      // Ensure proper structure
      const processed = {
        id: task.id || this.generateTaskId(),
        description: task.description || task,
        category: task.category || this.categorizeByKeywords(task.description || task),
        priority: task.priority || await this.assessPriority(task, data),
        deadline: task.deadline,
        dependencies: task.dependencies || [],
        assignedTo: task.assignedTo || 'user',
        status: task.status || 'pending',
        confidence: task.confidence || 0.8
      };
      
      // Add category-specific enhancements
      if (processed.category === 'booking') {
        processed.urgent = true;
        processed.requiresPayment = true;
      }
      
      if (processed.category === 'documentation') {
        processed.requiresVerification = true;
      }
      
      return processed;
    }));
  }

  /**
   * Assess task priority
   */
  async assessPriority(task, data) {
    const category = task.category || 'other';
    const config = this.taskCategories[category];
    
    // Base priority from category
    let priority = config?.priority || 'medium';
    
    // Adjust based on keywords
    const description = (task.description || task).toLowerCase();
    if (description.includes('urgent') || description.includes('asap') || description.includes('immediately')) {
      priority = 'high';
    }
    
    // Adjust based on deadline proximity
    if (task.deadline) {
      const daysUntil = this.daysUntilDeadline(task.deadline);
      if (daysUntil < 3) priority = 'high';
      else if (daysUntil < 7) priority = 'medium';
    }
    
    return priority;
  }

  /**
   * Calculate deadline for task
   */
  calculateDeadline(task, data) {
    if (task.deadline) {
      return this.standardizeDeadline(task.deadline, data.travelDate);
    }
    
    const category = task.category || 'other';
    const config = this.taskCategories[category];
    const typicalDays = config?.typicalDeadline || 7;
    
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + typicalDays);
    
    // Adjust based on travel date if available
    if (data.travelDate) {
      const travelDate = new Date(data.travelDate);
      const maxDate = new Date(travelDate);
      maxDate.setDate(maxDate.getDate() - 1); // Day before travel
      
      if (deadline > maxDate) {
        return maxDate.toISOString();
      }
    }
    
    return deadline.toISOString();
  }

  /**
   * Calculate optimal deadline
   */
  async calculateOptimalDeadline(task, context) {
    const category = context.category || 'other';
    const config = this.taskCategories[category];
    
    let deadline;
    let reasoning = '';
    
    if (context.travelDate) {
      const travelDate = new Date(context.travelDate);
      
      // Calculate based on category
      switch (category) {
        case 'documentation':
          deadline = new Date(travelDate);
          deadline.setDate(deadline.getDate() - 30); // 30 days before
          reasoning = 'Documentation should be ready well in advance';
          break;
          
        case 'booking':
          deadline = new Date(travelDate);
          deadline.setDate(deadline.getDate() - 21); // 3 weeks before
          reasoning = 'Bookings should be made early for better prices';
          break;
          
        case 'payment':
          deadline = new Date();
          deadline.setDate(deadline.getDate() + 1); // Tomorrow
          reasoning = 'Payments are typically urgent';
          break;
          
        default:
          deadline = new Date(travelDate);
          deadline.setDate(deadline.getDate() - (config?.typicalDeadline || 7));
          reasoning = `Standard ${category} deadline`;
      }
    } else {
      // No travel date, use typical deadline
      deadline = new Date();
      deadline.setDate(deadline.getDate() + (config?.typicalDeadline || 7));
      reasoning = 'Default deadline without travel date';
    }
    
    return {
      date: deadline.toISOString(),
      type: 'calculated',
      reasoning
    };
  }

  /**
   * Generate task summary
   */
  generateTaskSummary(tasks) {
    const total = tasks.length;
    const byPriority = this.countByPriority(tasks);
    const byCategory = this.countByCategory(tasks);
    const urgent = tasks.filter(t => this.isUrgent(t)).length;
    
    return {
      total,
      urgent,
      byPriority,
      byCategory,
      estimatedHours: this.estimateTaskHours(tasks),
      nextDeadline: this.findNextDeadline(tasks)
    };
  }

  /**
   * Create priority matrix (Eisenhower Matrix)
   */
  createPriorityMatrix(tasks) {
    return {
      urgentImportant: tasks.filter(t => 
        t.priority === 'high' && this.isUrgent(t)
      ),
      notUrgentImportant: tasks.filter(t => 
        t.priority === 'high' && !this.isUrgent(t)
      ),
      urgentNotImportant: tasks.filter(t => 
        t.priority !== 'high' && this.isUrgent(t)
      ),
      notUrgentNotImportant: tasks.filter(t => 
        t.priority !== 'high' && !this.isUrgent(t)
      )
    };
  }

  /**
   * Check if task is urgent
   */
  isUrgent(task) {
    if (task.urgent) return true;
    
    if (task.deadline) {
      const daysUntil = this.daysUntilDeadline(task.deadline);
      return daysUntil < 3;
    }
    
    const urgentKeywords = ['urgent', 'asap', 'immediately', 'today', 'tomorrow'];
    const description = (task.description || '').toLowerCase();
    
    return urgentKeywords.some(keyword => description.includes(keyword));
  }

  /**
   * Calculate days until deadline
   */
  daysUntilDeadline(deadline) {
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const diffTime = deadlineDate - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Normalize task description
   */
  normalizeTaskDescription(description) {
    return description
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Generate unique task ID
   */
  generateTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique todo ID
   */
  generateTodoId() {
    return `todo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clean task description
   */
  cleanTaskDescription(text) {
    return text
      .replace(/^(need to|have to|must|should|will)\s+/i, '')
      .replace(/^\W+/, '')
      .trim()
      .charAt(0).toUpperCase() + text.slice(1);
  }

  /**
   * Count tasks by priority
   */
  countByPriority(tasks) {
    return tasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Count tasks by category
   */
  countByCategory(tasks) {
    return tasks.reduce((acc, task) => {
      acc[task.category] = (acc[task.category] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Get required result fields
   */
  getRequiredResultFields() {
    return ['tasks'];
  }

  /**
   * Perform result validation
   */
  async performResultValidation(result) {
    if (!result.tasks && !result.todos) {
      return { valid: false, reason: 'No tasks or todos in result' };
    }
    
    const tasks = result.tasks || result.todos;
    if (!Array.isArray(tasks)) {
      return { valid: false, reason: 'Tasks must be an array' };
    }
    
    return { valid: true };
  }
}

export default TaskExtractorAgent;