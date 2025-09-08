/**
 * Stage - Base class for pipeline stages
 * 
 * Provides common functionality for all pipeline stages including
 * error handling, metrics, and lifecycle hooks.
 */

export class Stage {
  constructor(name = 'Stage', options = {}) {
    this.name = name;
    this.options = options;
    this.continueOnError = options.continueOnError !== false; // Default true
    this.metrics = {
      processed: 0,
      errors: 0,
      skipped: 0,
      totalTime: 0
    };
  }

  /**
   * Process the input and return output
   * Must be implemented by subclasses
   * @param {CMOResponse} input - Input response
   * @param {object} context - Processing context
   * @returns {CMOResponse} - Output response
   */
  async process(input, context) {
    throw new Error(`Stage ${this.name} must implement process method`);
  }

  /**
   * Determine if this stage should process the input
   * Can be overridden by subclasses
   * @param {CMOResponse} input - Input response
   * @param {object} context - Processing context
   * @returns {boolean} - Whether to process
   */
  async shouldProcess(input, context) {
    // Default: always process unless response is final
    return !input.final;
  }

  /**
   * Called before processing (can be overridden)
   * @param {CMOResponse} input - Input response
   * @param {object} context - Processing context
   */
  async beforeProcess(input, context) {
    // Override in subclasses for setup
  }

  /**
   * Called after processing (can be overridden)
   * @param {CMOResponse} input - Original input
   * @param {CMOResponse} output - Stage output
   * @param {object} context - Processing context
   */
  async afterProcess(input, output, context) {
    // Override in subclasses for cleanup
  }

  /**
   * Get stage-specific metrics
   * @returns {object} - Metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      avgTime: this.metrics.processed > 0 
        ? this.metrics.totalTime / this.metrics.processed 
        : 0,
      errorRate: this.metrics.processed > 0 
        ? this.metrics.errors / this.metrics.processed 
        : 0
    };
  }

  /**
   * Reset stage metrics
   */
  resetMetrics() {
    this.metrics.processed = 0;
    this.metrics.errors = 0;
    this.metrics.skipped = 0;
    this.metrics.totalTime = 0;
  }

  /**
   * Log with stage prefix
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {any} data - Additional data
   */
  log(level, message, data = null) {
    const prefix = `[${this.name}]`;
    const logData = data ? ` ${JSON.stringify(data)}` : '';
    
    switch (level) {
      case 'error':
        console.error(`❌ ${prefix} ${message}${logData}`);
        break;
      case 'warn':
        console.warn(`⚠️  ${prefix} ${message}${logData}`);
        break;
      case 'info':
        console.log(`ℹ️  ${prefix} ${message}${logData}`);
        break;
      case 'debug':
        if (this.options.debug) {
          console.log(`🐛 ${prefix} ${message}${logData}`);
        }
        break;
      default:
        console.log(`${prefix} ${message}${logData}`);
    }
  }
}

/**
 * ConditionalStage - Stage that processes based on a condition
 */
export class ConditionalStage extends Stage {
  constructor(name, condition, processor, options = {}) {
    super(name, options);
    this.condition = condition;
    this.processor = processor;
  }

  async shouldProcess(input, context) {
    const baseCheck = await super.shouldProcess(input, context);
    if (!baseCheck) return false;
    
    return typeof this.condition === 'function'
      ? await this.condition(input, context)
      : this.condition;
  }

  async process(input, context) {
    return this.processor(input, context);
  }
}

/**
 * TransformStage - Simple transformation stage
 */
export class TransformStage extends Stage {
  constructor(name, transformer, options = {}) {
    super(name, options);
    this.transformer = transformer;
  }

  async process(input, context) {
    return this.transformer(input, context);
  }
}

/**
 * ParallelStage - Run multiple processors in parallel
 */
export class ParallelStage extends Stage {
  constructor(name, processors, options = {}) {
    super(name, options);
    this.processors = processors;
    this.mergeStrategy = options.mergeStrategy || 'first'; // 'first', 'merge', 'best'
  }

  async process(input, context) {
    const startTime = Date.now();
    
    // Run all processors in parallel
    const results = await Promise.allSettled(
      this.processors.map(processor => 
        processor(input, context)
      )
    );
    
    // Filter successful results
    const successful = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);
    
    if (successful.length === 0) {
      throw new Error('All parallel processors failed');
    }
    
    // Apply merge strategy
    switch (this.mergeStrategy) {
      case 'first':
        return successful[0];
        
      case 'merge':
        // Merge all responses
        let merged = successful[0];
        for (let i = 1; i < successful.length; i++) {
          merged = merged.merge(successful[i]);
        }
        return merged;
        
      case 'best':
        // Return highest confidence response
        return successful.reduce((best, current) => 
          current.confidence > best.confidence ? current : best
        );
        
      default:
        return successful[0];
    }
  }
}

/**
 * CacheStage - Cache responses based on input
 */
export class CacheStage extends Stage {
  constructor(name, options = {}) {
    super(name, options);
    this.cache = new Map();
    this.ttl = options.ttl || 300000; // 5 minutes default
    this.maxSize = options.maxSize || 100;
    this.keyGenerator = options.keyGenerator || (input => input.content);
  }

  async process(input, context) {
    const key = this.keyGenerator(input, context);
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      this.log('debug', 'Cache hit', { key });
      this.metrics.skipped++;
      return cached.response;
    }
    
    // Not in cache, continue pipeline
    return input;
  }

  async afterProcess(input, output, context) {
    // Cache the output
    const key = this.keyGenerator(input, context);
    
    this.cache.set(key, {
      response: output,
      timestamp: Date.now()
    });
    
    // Evict old entries if needed
    if (this.cache.size > this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

export default Stage;