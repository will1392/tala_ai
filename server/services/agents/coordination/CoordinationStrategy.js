/**
 * CoordinationStrategy - Base class and implementations for multi-agent coordination strategies
 * 
 * Defines different approaches for coordinating multiple agents to solve complex tasks
 */

import TaskDecomposer from './TaskDecomposer.js';
import ParallelExecutor from './ParallelExecutor.js';
import ResultAggregator from './ResultAggregator.js';
import ConflictResolver from './ConflictResolver.js';

/**
 * Base coordination strategy class
 */
export class CoordinationStrategy {
  constructor(options = {}) {
    this.options = options;
    this.name = 'base';
    
    // Initialize coordination components
    this.taskDecomposer = new TaskDecomposer(options.decomposer);
    this.parallelExecutor = new ParallelExecutor(options.executor);
    this.resultAggregator = new ResultAggregator(options.aggregator);
    this.conflictResolver = new ConflictResolver(options.resolver);
  }

  /**
   * Initialize strategy
   */
  async initialize() {
    await this.parallelExecutor.initialize();
    console.log(`✅ ${this.name} coordination strategy initialized`);
  }

  /**
   * Execute coordination strategy
   * @param {Object} task - Complex task to coordinate
   * @param {Array} availableAgents - Available agents
   * @param {Object} context - Execution context
   */
  async coordinate(task, availableAgents, context = {}) {
    throw new Error('Coordinate method must be implemented by subclass');
  }

  /**
   * Shutdown strategy
   */
  async shutdown() {
    await this.parallelExecutor.shutdown();
  }
}

/**
 * Hierarchical Coordination Strategy
 * Breaks down tasks into hierarchical subtasks with dependencies
 */
export class HierarchicalCoordinationStrategy extends CoordinationStrategy {
  constructor(options = {}) {
    super(options);
    this.name = 'hierarchical';
  }

  async coordinate(task, availableAgents, context = {}) {
    console.log(`🏗️ Executing hierarchical coordination for task: ${task.type}`);
    
    try {
      // Step 1: Decompose task hierarchically
      const decomposition = await this.taskDecomposer.decompose(task, {
        ...context,
        strategy: 'hierarchical'
      });
      
      if (!decomposition.needsDecomposition) {
        // Simple task - execute directly
        return this.executeSingleTask(task, availableAgents[0], context);
      }
      
      // Step 2: Execute subtasks according to hierarchy
      const executionResults = [];
      
      for (const wave of decomposition.executionGraph.parallelGroups) {
        console.log(`📊 Executing hierarchical level with ${wave.length} tasks`);
        
        // Prepare tasks for this level
        const levelTasks = wave.map(taskId => {
          const subtask = decomposition.subtasks.find(st => st.id === taskId);
          const agent = this.selectAgentForSubtask(subtask, availableAgents);
          
          return {
            id: taskId,
            execute: async (ctx) => agent.execute(subtask, ctx),
            agentId: agent.id,
            priority: subtask.priority,
            estimatedDuration: subtask.estimatedDuration
          };
        });
        
        // Execute level in parallel
        const levelResult = await this.parallelExecutor.executeBatch(levelTasks, {
          batchSize: Math.min(levelTasks.length, 3)
        });
        
        executionResults.push(levelResult);
        
        // Check for critical failures
        if (levelResult.errors.length > 0) {
          const criticalError = levelResult.errors.find(e => 
            decomposition.subtasks.find(st => st.id === e.task.id)?.critical
          );
          
          if (criticalError) {
            throw new Error(`Critical subtask failed: ${criticalError.error.message}`);
          }
        }
      }
      
      // Step 3: Aggregate results
      const allResults = executionResults.flatMap(r => r.results.map(res => ({
        ...res.result,
        agentId: res.task.agentId,
        subtaskId: res.task.id
      })));
      
      const aggregated = await this.resultAggregator.aggregate(allResults, {
        aggregationType: 'hierarchical',
        taskStructure: decomposition
      });
      
      // Step 4: Resolve conflicts if any
      if (aggregated.metadata.conflicts) {
        const resolved = await this.conflictResolver.resolveConflicts(
          allResults,
          { strategy: 'authority-based' }
        );
        
        return {
          success: true,
          strategy: 'hierarchical',
          data: resolved.resolution,
          decomposition,
          executionResults,
          conflicts: resolved.conflicts
        };
      }
      
      return {
        success: true,
        strategy: 'hierarchical',
        data: aggregated.data,
        decomposition,
        executionResults,
        metadata: aggregated.metadata
      };
      
    } catch (error) {
      console.error('❌ Hierarchical coordination failed:', error);
      throw error;
    }
  }

  selectAgentForSubtask(subtask, availableAgents) {
    // Select best agent based on capabilities
    const capableAgents = availableAgents.filter(agent =>
      subtask.requiredCapabilities.every(cap => 
        agent.getCapabilities().includes(cap)
      )
    );
    
    if (capableAgents.length === 0) {
      throw new Error(`No agent capable of handling subtask: ${subtask.type}`);
    }
    
    // Return agent with highest confidence for this task type
    return capableAgents.reduce((best, agent) => {
      const confidence = agent.evaluateTask(subtask);
      const bestConfidence = best.evaluateTask(subtask);
      return confidence > bestConfidence ? agent : best;
    });
  }

  async executeSingleTask(task, agent, context) {
    const result = await agent.execute(task, context);
    
    return {
      success: true,
      strategy: 'hierarchical-single',
      data: result,
      agent: agent.id
    };
  }
}

/**
 * Pipeline Coordination Strategy
 * Executes tasks in a sequential pipeline with data flow
 */
export class PipelineCoordinationStrategy extends CoordinationStrategy {
  constructor(options = {}) {
    super(options);
    this.name = 'pipeline';
  }

  async coordinate(task, availableAgents, context = {}) {
    console.log(`🔧 Executing pipeline coordination for task: ${task.type}`);
    
    try {
      // Define pipeline stages based on task
      const pipeline = this.definePipeline(task, availableAgents);
      
      console.log(`📋 Pipeline stages: ${pipeline.stages.map(s => s.name).join(' → ')}`);
      
      let pipelineData = task.data;
      const stageResults = [];
      
      // Execute each pipeline stage
      for (const stage of pipeline.stages) {
        console.log(`🚀 Executing stage: ${stage.name}`);
        
        const stageTask = {
          ...task,
          type: stage.taskType,
          data: pipelineData,
          stageContext: {
            previousResults: stageResults,
            stageIndex: stageResults.length,
            totalStages: pipeline.stages.length
          }
        };
        
        const result = await stage.agent.execute(stageTask, context);
        
        stageResults.push({
          stage: stage.name,
          agent: stage.agent.id,
          result
        });
        
        // Transform data for next stage
        pipelineData = this.transformDataForNextStage(
          result,
          stage,
          pipeline.stages[stageResults.length] || null
        );
      }
      
      // Aggregate pipeline results
      const aggregated = await this.aggregatePipelineResults(stageResults);
      
      return {
        success: true,
        strategy: 'pipeline',
        data: aggregated,
        pipeline: {
          stages: pipeline.stages.map(s => s.name),
          results: stageResults
        }
      };
      
    } catch (error) {
      console.error('❌ Pipeline coordination failed:', error);
      throw error;
    }
  }

  definePipeline(task, availableAgents) {
    // Define pipeline based on task type
    const pipelines = {
      'comprehensive-travel-planning': [
        { name: 'email-extraction', taskType: 'parse-email', agentType: 'email-monitor' },
        { name: 'document-analysis', taskType: 'analyze-document', agentType: 'document-analyzer' },
        { name: 'itinerary-building', taskType: 'build-itinerary', agentType: 'itinerary-builder' },
        { name: 'task-generation', taskType: 'extract-tasks', agentType: 'task-extractor' }
      ],
      'booking-processing': [
        { name: 'parse-booking', taskType: 'parse-email', agentType: 'email-monitor' },
        { name: 'validate-details', taskType: 'analyze-document', agentType: 'document-analyzer' },
        { name: 'create-tasks', taskType: 'extract-tasks', agentType: 'task-extractor' }
      ]
    };
    
    const pipelineConfig = pipelines[task.type] || this.inferPipeline(task);
    
    // Map agents to stages
    const stages = pipelineConfig.map(stage => ({
      ...stage,
      agent: availableAgents.find(a => a.config.specialization === stage.agentType) ||
             availableAgents.find(a => a.canHandle({ type: stage.taskType }))
    }));
    
    return { stages };
  }

  inferPipeline(task) {
    // Infer pipeline stages from task data
    const stages = [];
    
    if (task.data?.email || task.data?.emailContent) {
      stages.push({ name: 'email-processing', taskType: 'parse-email', agentType: 'email-parsing' });
    }
    
    if (task.data?.documents || task.data?.files) {
      stages.push({ name: 'document-processing', taskType: 'analyze-document', agentType: 'document-analysis' });
    }
    
    if (task.data?.destinations || task.data?.travelDates) {
      stages.push({ name: 'itinerary-creation', taskType: 'build-itinerary', agentType: 'complex-planning' });
    }
    
    // Always end with task extraction
    stages.push({ name: 'task-extraction', taskType: 'extract-tasks', agentType: 'task-extraction' });
    
    return stages;
  }

  transformDataForNextStage(result, currentStage, nextStage) {
    if (!nextStage) return result;
    
    // Transform data based on stage transition
    const transformations = {
      'email-extraction_document-analysis': (data) => ({
        documents: data.attachments || [],
        extractedData: data.bookingDetails || data
      }),
      'document-analysis_itinerary-building': (data) => ({
        validatedDocuments: data.documents,
        travelRequirements: data.requirements || {},
        ...data.extractedData
      }),
      'itinerary-building_task-generation': (data) => ({
        itinerary: data.itinerary,
        conversation: data.context || [],
        requirements: data.requirements || []
      })
    };
    
    const key = `${currentStage.name}_${nextStage.name}`;
    const transformer = transformations[key];
    
    return transformer ? transformer(result) : result;
  }

  async aggregatePipelineResults(stageResults) {
    // Aggregate results from all pipeline stages
    const aggregated = {};
    
    stageResults.forEach(({ stage, result }) => {
      aggregated[stage] = result;
    });
    
    // Extract key information
    return {
      ...aggregated,
      summary: this.generatePipelineSummary(stageResults)
    };
  }

  generatePipelineSummary(stageResults) {
    return {
      totalStages: stageResults.length,
      completedStages: stageResults.filter(r => r.result.success).length,
      keyOutputs: this.extractKeyOutputs(stageResults)
    };
  }

  extractKeyOutputs(stageResults) {
    const outputs = {};
    
    stageResults.forEach(({ stage, result }) => {
      if (stage.includes('email') && result.bookingDetails) {
        outputs.bookings = result.bookingDetails;
      }
      if (stage.includes('itinerary') && result.itinerary) {
        outputs.itinerary = result.itinerary;
      }
      if (stage.includes('task') && result.tasks) {
        outputs.tasks = result.tasks;
      }
    });
    
    return outputs;
  }
}

/**
 * Consensus Coordination Strategy
 * Multiple agents work on the same task and results are combined
 */
export class ConsensusCoordinationStrategy extends CoordinationStrategy {
  constructor(options = {}) {
    super({
      ...options,
      aggregator: {
        ...options.aggregator,
        mergeStrategy: 'consensus'
      },
      resolver: {
        ...options.resolver,
        resolutionStrategy: 'weighted-consensus'
      }
    });
    this.name = 'consensus';
  }

  async coordinate(task, availableAgents, context = {}) {
    console.log(`🤝 Executing consensus coordination for task: ${task.type}`);
    
    try {
      // Select subset of agents for consensus
      const consensusAgents = this.selectConsensusAgents(task, availableAgents);
      
      console.log(`👥 Using ${consensusAgents.length} agents for consensus`);
      
      // Prepare parallel tasks
      const parallelTasks = consensusAgents.map(agent => ({
        id: `${task.id}_${agent.id}`,
        execute: async (ctx) => agent.execute(task, ctx),
        agentId: agent.id,
        priority: task.priority || 'medium'
      }));
      
      // Execute all agents in parallel
      const executionResult = await this.parallelExecutor.execute(parallelTasks, context);
      
      // Transform results for aggregation
      const agentResults = Object.entries(executionResult.results).map(([taskId, result]) => ({
        ...result,
        agentId: taskId.split('_').pop(),
        success: true,
        confidence: result.confidence || 0.8
      }));
      
      // Aggregate results using consensus
      const aggregated = await this.resultAggregator.aggregate(agentResults, {
        aggregationType: 'consensus',
        minimumAgreement: 0.6
      });
      
      // Resolve any conflicts
      let finalResult = aggregated.data;
      let conflicts = null;
      
      if (this.hasSignificantDisagreement(agentResults)) {
        const resolved = await this.conflictResolver.resolveConflicts(agentResults, {
          strategy: 'weighted-consensus',
          considerConfidence: true
        });
        
        finalResult = resolved.resolution;
        conflicts = resolved.conflicts;
      }
      
      return {
        success: true,
        strategy: 'consensus',
        data: finalResult,
        consensus: {
          agents: consensusAgents.map(a => a.id),
          agreement: this.calculateAgreementLevel(agentResults),
          conflicts
        },
        metadata: aggregated.metadata
      };
      
    } catch (error) {
      console.error('❌ Consensus coordination failed:', error);
      throw error;
    }
  }

  selectConsensusAgents(task, availableAgents) {
    // Select agents that can handle the task
    const capableAgents = availableAgents.filter(agent => 
      agent.canHandle(task)
    );
    
    // Sort by expected performance
    const sorted = capableAgents.sort((a, b) => {
      const scoreA = a.evaluateTask(task);
      const scoreB = b.evaluateTask(task);
      return scoreB - scoreA;
    });
    
    // Select top agents (max 5 for efficiency)
    const maxAgents = Math.min(5, sorted.length);
    const minAgents = 3;
    
    if (sorted.length < minAgents) {
      console.warn(`⚠️ Only ${sorted.length} agents available for consensus (minimum ${minAgents} recommended)`);
    }
    
    return sorted.slice(0, maxAgents);
  }

  hasSignificantDisagreement(results) {
    // Check if results have significant disagreement
    const agreement = this.calculateAgreementLevel(results);
    return agreement < 0.7;
  }

  calculateAgreementLevel(results) {
    if (results.length < 2) return 1.0;
    
    // Simple agreement calculation based on result similarity
    let agreements = 0;
    let comparisons = 0;
    
    for (let i = 0; i < results.length - 1; i++) {
      for (let j = i + 1; j < results.length; j++) {
        comparisons++;
        const similarity = this.calculateResultSimilarity(results[i], results[j]);
        if (similarity > 0.8) agreements++;
      }
    }
    
    return comparisons > 0 ? agreements / comparisons : 0;
  }

  calculateResultSimilarity(result1, result2) {
    // Simple similarity calculation
    // Can be enhanced with more sophisticated comparison
    const data1 = JSON.stringify(result1.data || result1);
    const data2 = JSON.stringify(result2.data || result2);
    
    if (data1 === data2) return 1.0;
    
    // Check key fields
    let matchingFields = 0;
    let totalFields = 0;
    
    const fields1 = this.extractFields(result1);
    const fields2 = this.extractFields(result2);
    
    for (const field of fields1.keys()) {
      totalFields++;
      if (fields2.has(field) && fields1.get(field) === fields2.get(field)) {
        matchingFields++;
      }
    }
    
    return totalFields > 0 ? matchingFields / totalFields : 0;
  }

  extractFields(result) {
    const fields = new Map();
    const data = result.data || result;
    
    const extract = (obj, prefix = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${key}` : key;
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          extract(value, path);
        } else {
          fields.set(path, value);
        }
      }
    };
    
    if (typeof data === 'object' && data !== null) {
      extract(data);
    }
    
    return fields;
  }
}

/**
 * Adaptive Coordination Strategy
 * Dynamically selects the best strategy based on task characteristics
 */
export class AdaptiveCoordinationStrategy extends CoordinationStrategy {
  constructor(options = {}) {
    super(options);
    this.name = 'adaptive';
    
    // Initialize sub-strategies
    this.strategies = {
      hierarchical: new HierarchicalCoordinationStrategy(options),
      pipeline: new PipelineCoordinationStrategy(options),
      consensus: new ConsensusCoordinationStrategy(options)
    };
  }

  async initialize() {
    await super.initialize();
    
    // Initialize all sub-strategies
    await Promise.all(
      Object.values(this.strategies).map(s => s.initialize())
    );
  }

  async coordinate(task, availableAgents, context = {}) {
    console.log(`🧠 Executing adaptive coordination for task: ${task.type}`);
    
    try {
      // Analyze task to select best strategy
      const analysis = await this.analyzeTask(task, availableAgents, context);
      const selectedStrategy = this.selectStrategy(analysis);
      
      console.log(`📊 Task analysis: ${JSON.stringify(analysis)}`);
      console.log(`✅ Selected strategy: ${selectedStrategy}`);
      
      // Execute with selected strategy
      const strategy = this.strategies[selectedStrategy];
      const result = await strategy.coordinate(task, availableAgents, context);
      
      // Add adaptive metadata
      result.adaptive = {
        analysis,
        selectedStrategy,
        reasoning: this.explainStrategySelection(analysis, selectedStrategy)
      };
      
      return result;
      
    } catch (error) {
      console.error('❌ Adaptive coordination failed:', error);
      
      // Try fallback strategy
      console.log('🔄 Attempting fallback strategy: consensus');
      return this.strategies.consensus.coordinate(task, availableAgents, context);
    }
  }

  async analyzeTask(task, availableAgents, context) {
    const analysis = {
      complexity: 0,
      dependencies: 0,
      parallelizable: 0,
      dataFlow: 0,
      uncertainty: 0,
      agentDiversity: 0
    };
    
    // Analyze task complexity
    const decomposition = await this.taskDecomposer.decompose(task, context);
    analysis.complexity = decomposition.complexity?.score || 0.5;
    
    // Check for dependencies
    if (decomposition.executionGraph) {
      const totalTasks = decomposition.subtasks.length;
      const dependentTasks = decomposition.executionGraph.edges.length;
      analysis.dependencies = totalTasks > 0 ? dependentTasks / totalTasks : 0;
    }
    
    // Check parallelizability
    if (decomposition.executionGraph?.parallelGroups) {
      const parallelTasks = decomposition.executionGraph.parallelGroups
        .reduce((sum, group) => sum + group.length, 0);
      analysis.parallelizable = parallelTasks / (decomposition.subtasks.length || 1);
    }
    
    // Check for data flow requirements
    analysis.dataFlow = this.assessDataFlow(task);
    
    // Assess uncertainty
    analysis.uncertainty = this.assessUncertainty(task, context);
    
    // Calculate agent diversity
    const capableAgents = availableAgents.filter(a => a.canHandle(task));
    analysis.agentDiversity = capableAgents.length / availableAgents.length;
    
    return analysis;
  }

  selectStrategy(analysis) {
    // Decision tree for strategy selection
    
    // High dependencies + sequential nature = Pipeline
    if (analysis.dependencies > 0.6 && analysis.dataFlow > 0.7) {
      return 'pipeline';
    }
    
    // High complexity + hierarchical structure = Hierarchical
    if (analysis.complexity > 0.7 && analysis.dependencies > 0.3) {
      return 'hierarchical';
    }
    
    // High uncertainty + multiple capable agents = Consensus
    if (analysis.uncertainty > 0.6 && analysis.agentDiversity > 0.5) {
      return 'consensus';
    }
    
    // High parallelizability = Hierarchical (for parallel execution)
    if (analysis.parallelizable > 0.7) {
      return 'hierarchical';
    }
    
    // Default based on complexity
    if (analysis.complexity > 0.5) {
      return 'hierarchical';
    }
    
    return 'consensus';
  }

  assessDataFlow(task) {
    // Check if task requires data flow between stages
    const flowIndicators = [
      'process', 'transform', 'extract then', 'analyze then',
      'first', 'second', 'finally', 'pipeline', 'workflow'
    ];
    
    const taskStr = JSON.stringify(task).toLowerCase();
    const matches = flowIndicators.filter(indicator => taskStr.includes(indicator));
    
    return Math.min(1, matches.length / 3);
  }

  assessUncertainty(task, context) {
    // Assess task uncertainty
    let uncertainty = 0.3; // Base uncertainty
    
    // Increase for vague requirements
    if (!task.data || Object.keys(task.data).length < 3) {
      uncertainty += 0.2;
    }
    
    // Increase for complex queries
    if (task.type?.includes('complex') || task.type?.includes('comprehensive')) {
      uncertainty += 0.2;
    }
    
    // Decrease if clear structure
    if (task.data?.destinations && task.data?.dates) {
      uncertainty -= 0.1;
    }
    
    return Math.max(0, Math.min(1, uncertainty));
  }

  explainStrategySelection(analysis, selectedStrategy) {
    const explanations = {
      hierarchical: `Selected due to high complexity (${analysis.complexity.toFixed(2)}) and structured dependencies`,
      pipeline: `Selected due to sequential data flow requirements (${analysis.dataFlow.toFixed(2)}) and dependencies`,
      consensus: `Selected due to uncertainty (${analysis.uncertainty.toFixed(2)}) and available agent diversity`
    };
    
    return explanations[selectedStrategy] || 'Default strategy selection';
  }

  async shutdown() {
    await super.shutdown();
    
    // Shutdown all sub-strategies
    await Promise.all(
      Object.values(this.strategies).map(s => s.shutdown())
    );
  }
}

// Export all strategies
export default {
  CoordinationStrategy,
  HierarchicalCoordinationStrategy,
  PipelineCoordinationStrategy,
  ConsensusCoordinationStrategy,
  AdaptiveCoordinationStrategy
};