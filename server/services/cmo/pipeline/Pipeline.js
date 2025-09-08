/**
 * Pipeline - Base class for processing pipelines
 * 
 * Manages the flow of data through multiple stages with error handling,
 * timing, and debugging capabilities.
 */

import { EventEmitter } from 'events';
import { CMOResponse } from './CMOResponse.js';

export class Pipeline extends EventEmitter {
  constructor(name = 'Pipeline') {
    super();
    this.name = name;
    this.stages = [];
    this.metrics = {
      totalRuns: 0,
      errors: 0,
      totalTime: 0,
      stageMetrics: new Map()
    };
  }

  /**
   * Add a stage to the pipeline
   * @param {Stage} stage - Stage instance
   * @returns {Pipeline} - For chaining
   */
  addStage(stage) {
    if (!stage || typeof stage.process !== 'function') {
      throw new Error('Stage must have a process method');
    }
    
    this.stages.push(stage);
    this.metrics.stageMetrics.set(stage.name, {
      runs: 0,
      errors: 0,
      skips: 0,
      totalTime: 0
    });
    
    console.log(`📦 Added stage "${stage.name}" to ${this.name}`);
    return this;
  }

  /**
   * Process input through all stages
   * @param {any} input - Initial input
   * @param {object} context - Processing context
   * @returns {CMOResponse} - Final response
   */
  async process(input, context = {}) {
    const runId = `${this.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    console.log(`🚀 Starting ${this.name} run: ${runId}`);
    console.log(`📥 Pipeline input:`, {
      inputType: typeof input,
      inputPreview: typeof input === 'string' ? input.substring(0, 50) : 'Not a string',
      hasContext: !!context,
      contextKeys: Object.keys(context)
    });
    this.emit('pipeline:start', { runId, input, context });
    
    this.metrics.totalRuns++;
    
    // Initialize with CMOResponse if needed
    let current = input instanceof CMOResponse 
      ? input 
      : new CMOResponse({ content: '', source: 'input', metadata: { originalMessage: input } });
    
    const executionLog = [];
    
    // Create mutable context that persists across stages
    const mutableContext = { ...context };
    
    try {
      // Process through each stage
      for (let i = 0; i < this.stages.length; i++) {
        const stage = this.stages[i];
        const stageStartTime = Date.now();
        const stageMetrics = this.metrics.stageMetrics.get(stage.name);
        
        try {
          // Check if stage should process
          if (stage.shouldProcess && !await stage.shouldProcess(current, mutableContext)) {
            console.log(`⏭️  Skipping stage "${stage.name}"`);
            stageMetrics.skips++;
            executionLog.push({
              stage: stage.name,
              skipped: true,
              reason: 'shouldProcess returned false'
            });
            continue;
          }
          
          // Check if response is final
          if (current.final) {
            console.log(`🏁 Response marked as final at stage "${stage.name}"`);
            executionLog.push({
              stage: stage.name,
              skipped: true,
              reason: 'Response marked as final'
            });
            break;
          }
          
          console.log(`▶️  Processing stage "${stage.name}"`);
          this.emit('stage:start', { runId, stage: stage.name, input: current });
          
          // Process the stage
          stageMetrics.runs++;
          // Pass mutableContext directly and add extra props
          mutableContext.runId = runId;
          mutableContext.stageIndex = i;
          mutableContext.totalStages = this.stages.length;
          mutableContext.previousStages = executionLog;
          
          const stageResult = await stage.process(current, mutableContext);
          
          // Ensure we have a CMOResponse
          const newResponse = stageResult instanceof CMOResponse
            ? stageResult
            : new CMOResponse(stageResult);
          
          const stageTime = Date.now() - stageStartTime;
          stageMetrics.totalTime += stageTime;
          
          executionLog.push({
            stage: stage.name,
            processed: true,
            time: stageTime,
            changed: newResponse !== current,
            metrics: stage.getMetrics ? stage.getMetrics() : null
          });
          
          this.emit('stage:complete', {
            runId,
            stage: stage.name,
            time: stageTime,
            output: newResponse
          });
          
          current = newResponse;
          
          // Check if the new response is marked as final
          if (newResponse.final) {
            console.log(`🏁 Stage "${stage.name}" returned final response - stopping pipeline`);
            executionLog[executionLog.length - 1].final = true;
            break;
          }
          
        } catch (stageError) {
          stageMetrics.errors++;
          console.error(`❌ Error in stage "${stage.name}":`, stageError);
          
          executionLog.push({
            stage: stage.name,
            error: stageError.message,
            stack: stageError.stack
          });
          
          this.emit('stage:error', {
            runId,
            stage: stage.name,
            error: stageError
          });
          
          // Decide whether to continue or fail
          if (stage.continueOnError === false) {
            throw new Error(`Pipeline failed at stage "${stage.name}": ${stageError.message}`);
          }
          
          // Continue with current response
          console.log(`⚠️  Continuing pipeline despite error in "${stage.name}"`);
        }
      }
      
      const totalTime = Date.now() - startTime;
      this.metrics.totalTime += totalTime;
      
      // Add execution metadata to response
      const finalResponse = current.withUI({
        pipelineMetadata: {
          runId,
          pipeline: this.name,
          totalTime,
          stages: executionLog,
          stagesRun: executionLog.filter(s => s.processed).length,
          totalStages: this.stages.length
        }
      });
      
      console.log(`✅ ${this.name} completed in ${totalTime}ms`);
      this.emit('pipeline:complete', {
        runId,
        totalTime,
        output: finalResponse,
        executionLog
      });
      
      return finalResponse;
      
    } catch (error) {
      this.metrics.errors++;
      console.error(`❌ ${this.name} failed:`, error);
      
      this.emit('pipeline:error', {
        runId,
        error,
        executionLog
      });
      
      // Return error response
      return new CMOResponse({
        content: `An error occurred: ${error.message}`,
        source: `${this.name}:error`,
        confidence: 0,
        metadata: {
          error: error.message,
          stack: error.stack,
          executionLog
        }
      });
    }
  }

  /**
   * Get pipeline metrics
   * @returns {object} - Metrics object
   */
  getMetrics() {
    const stageStats = {};
    
    for (const [stageName, metrics] of this.metrics.stageMetrics) {
      stageStats[stageName] = {
        ...metrics,
        avgTime: metrics.runs > 0 ? metrics.totalTime / metrics.runs : 0,
        errorRate: metrics.runs > 0 ? metrics.errors / metrics.runs : 0,
        skipRate: metrics.runs > 0 ? metrics.skips / metrics.runs : 0
      };
    }
    
    return {
      ...this.metrics,
      avgTime: this.metrics.totalRuns > 0 
        ? this.metrics.totalTime / this.metrics.totalRuns 
        : 0,
      errorRate: this.metrics.totalRuns > 0 
        ? this.metrics.errors / this.metrics.totalRuns 
        : 0,
      stageStats
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics.totalRuns = 0;
    this.metrics.errors = 0;
    this.metrics.totalTime = 0;
    
    for (const metrics of this.metrics.stageMetrics.values()) {
      metrics.runs = 0;
      metrics.errors = 0;
      metrics.skips = 0;
      metrics.totalTime = 0;
    }
  }

  /**
   * Clone pipeline with same stages
   * @param {string} name - New pipeline name
   * @returns {Pipeline} - Cloned pipeline
   */
  clone(name) {
    const newPipeline = new Pipeline(name || `${this.name}-clone`);
    
    for (const stage of this.stages) {
      newPipeline.addStage(stage);
    }
    
    return newPipeline;
  }
}

export default Pipeline;