/**
 * ResultAggregator - Combines and synthesizes outputs from multiple agents
 * 
 * Handles merging results, resolving conflicts, normalizing formats,
 * and creating unified outputs from multi-agent executions.
 */

export class ResultAggregator {
  constructor(options = {}) {
    this.options = {
      conflictResolution: options.conflictResolution || 'consensus',
      confidenceThreshold: options.confidenceThreshold || 0.7,
      enableDeduplication: options.enableDeduplication !== false,
      enableNormalization: options.enableNormalization !== false,
      mergeStrategy: options.mergeStrategy || 'intelligent',
      ...options
    };
    
    // Aggregation strategies
    this.strategies = {
      simple: this.simpleAggregate.bind(this),
      intelligent: this.intelligentAggregate.bind(this),
      weighted: this.weightedAggregate.bind(this),
      consensus: this.consensusAggregate.bind(this),
      hierarchical: this.hierarchicalAggregate.bind(this)
    };
    
    // Result type handlers
    this.typeHandlers = {
      booking: this.aggregateBookings.bind(this),
      itinerary: this.aggregateItineraries.bind(this),
      tasks: this.aggregateTasks.bind(this),
      documents: this.aggregateDocuments.bind(this),
      analysis: this.aggregateAnalysis.bind(this)
    };
  }

  /**
   * Aggregate results from multiple agents
   * @param {Array} agentResults - Results from different agents
   * @param {Object} context - Aggregation context
   * @returns {Object} Aggregated result
   */
  async aggregate(agentResults, context = {}) {
    try {
      console.log(`🔄 Aggregating results from ${agentResults.length} agents`);
      
      // Validate inputs
      if (!agentResults || agentResults.length === 0) {
        return this.createEmptyResult();
      }
      
      // Pre-process results
      const preprocessed = await this.preprocessResults(agentResults);
      
      // Detect result types
      const resultTypes = this.detectResultTypes(preprocessed);
      console.log(`📋 Detected result types: ${resultTypes.join(', ')}`);
      
      // Apply aggregation strategy
      const strategy = this.strategies[this.options.mergeStrategy] || this.strategies.intelligent;
      const aggregated = await strategy(preprocessed, resultTypes, context);
      
      // Post-process results
      const finalized = await this.postprocessResults(aggregated, context);
      
      // Generate metadata
      const metadata = this.generateAggregationMetadata(agentResults, finalized);
      
      return {
        success: true,
        data: finalized,
        metadata,
        sources: this.extractSources(agentResults)
      };
      
    } catch (error) {
      console.error('❌ Result aggregation failed:', error);
      throw error;
    }
  }

  /**
   * Preprocess results for aggregation
   */
  async preprocessResults(agentResults) {
    const processed = [];
    
    for (const result of agentResults) {
      // Skip failed results unless configured to include
      if (!result.success && !this.options.includeFailures) {
        continue;
      }
      
      // Normalize result structure
      const normalized = this.normalizeResult(result);
      
      // Add confidence scoring
      normalized.confidence = this.calculateConfidence(normalized);
      
      // Add source tracking
      normalized.source = {
        agentId: result.agentId,
        timestamp: result.timestamp || Date.now(),
        executionTime: result.executionTime
      };
      
      processed.push(normalized);
    }
    
    // Sort by confidence
    processed.sort((a, b) => b.confidence - a.confidence);
    
    return processed;
  }

  /**
   * Normalize result structure
   */
  normalizeResult(result) {
    // Extract actual data from various result formats
    let data = result.data || result.result || result.output || result;
    
    // Ensure consistent structure
    return {
      data: data.data || data,
      type: result.type || this.inferResultType(data),
      success: result.success !== false,
      confidence: result.confidence || 0.8,
      metadata: result.metadata || {},
      errors: result.errors || []
    };
  }

  /**
   * Detect types of results for specialized handling
   */
  detectResultTypes(results) {
    const types = new Set();
    
    results.forEach(result => {
      if (result.type) {
        types.add(result.type);
      } else {
        // Infer type from data structure
        const inferred = this.inferResultType(result.data);
        if (inferred) types.add(inferred);
      }
    });
    
    return Array.from(types);
  }

  /**
   * Infer result type from data structure
   */
  inferResultType(data) {
    if (!data) return 'unknown';
    
    // Check for booking data
    if (data.bookingDetails || data.confirmationNumber || data.bookings) {
      return 'booking';
    }
    
    // Check for itinerary data
    if (data.itinerary || data.destinations || data.schedule) {
      return 'itinerary';
    }
    
    // Check for task data
    if (data.tasks || data.todos || Array.isArray(data)) {
      return 'tasks';
    }
    
    // Check for document data
    if (data.documents || data.passportData || data.documentType) {
      return 'documents';
    }
    
    // Check for analysis data
    if (data.analysis || data.insights || data.recommendations) {
      return 'analysis';
    }
    
    return 'general';
  }

  /**
   * Simple aggregation - just combine all results
   */
  async simpleAggregate(results, types, context) {
    const aggregated = {};
    
    results.forEach(result => {
      Object.assign(aggregated, result.data);
    });
    
    return aggregated;
  }

  /**
   * Intelligent aggregation - type-aware merging
   */
  async intelligentAggregate(results, types, context) {
    const aggregated = {};
    
    // Group results by type
    const groupedByType = this.groupResultsByType(results);
    
    // Process each type with specialized handler
    for (const [type, typeResults] of Object.entries(groupedByType)) {
      const handler = this.typeHandlers[type];
      
      if (handler) {
        aggregated[type] = await handler(typeResults, context);
      } else {
        // Default handling
        aggregated[type] = this.mergeResults(typeResults);
      }
    }
    
    // Flatten if only one type
    if (Object.keys(aggregated).length === 1) {
      return Object.values(aggregated)[0];
    }
    
    return aggregated;
  }

  /**
   * Weighted aggregation based on confidence
   */
  async weightedAggregate(results, types, context) {
    const aggregated = {};
    const weights = this.calculateWeights(results);
    
    // Weighted merge for each field
    const allFields = this.extractAllFields(results);
    
    for (const field of allFields) {
      const values = results
        .filter(r => r.data[field] !== undefined)
        .map((r, i) => ({
          value: r.data[field],
          weight: weights[i]
        }));
      
      if (values.length > 0) {
        aggregated[field] = this.weightedMerge(values);
      }
    }
    
    return aggregated;
  }

  /**
   * Consensus-based aggregation
   */
  async consensusAggregate(results, types, context) {
    const aggregated = {};
    const threshold = this.options.consensusThreshold || 0.6;
    
    // Find consensus for each field
    const allFields = this.extractAllFields(results);
    
    for (const field of allFields) {
      const values = results
        .filter(r => r.data[field] !== undefined)
        .map(r => r.data[field]);
      
      if (values.length > 0) {
        const consensus = this.findConsensus(values, threshold);
        if (consensus !== null) {
          aggregated[field] = consensus;
        }
      }
    }
    
    return aggregated;
  }

  /**
   * Hierarchical aggregation - respects agent priorities
   */
  async hierarchicalAggregate(results, types, context) {
    // Use highest confidence result as base
    const base = { ...results[0].data };
    
    // Supplement with additional data from other results
    for (let i = 1; i < results.length; i++) {
      const result = results[i];
      
      for (const [key, value] of Object.entries(result.data)) {
        // Only add if not present in base or if confidence is higher
        if (base[key] === undefined || 
            (result.confidence > results[0].confidence && this.options.allowOverride)) {
          base[key] = value;
        }
      }
    }
    
    return base;
  }

  /**
   * Aggregate booking results
   */
  async aggregateBookings(results, context) {
    const bookings = [];
    const seen = new Set();
    
    results.forEach(result => {
      const data = result.data;
      
      // Extract bookings from various formats
      const resultBookings = data.bookings || 
                            (data.bookingDetails ? [data.bookingDetails] : []) ||
                            [];
      
      resultBookings.forEach(booking => {
        // Deduplicate by confirmation number
        const key = booking.confirmationNumber || booking.bookingReference;
        if (key && !seen.has(key)) {
          seen.add(key);
          bookings.push(this.normalizeBooking(booking));
        }
      });
    });
    
    // Sort by date
    bookings.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return {
      bookings,
      summary: this.generateBookingSummary(bookings)
    };
  }

  /**
   * Aggregate itinerary results
   */
  async aggregateItineraries(results, context) {
    const itineraries = results.map(r => r.data);
    
    if (itineraries.length === 1) {
      return itineraries[0];
    }
    
    // Merge multiple itineraries
    const merged = {
      destinations: this.mergeDestinations(itineraries),
      dates: this.mergeDateRanges(itineraries),
      activities: this.mergeActivities(itineraries),
      accommodations: this.mergeAccommodations(itineraries),
      transportation: this.mergeTransportation(itineraries),
      budget: this.mergeBudgets(itineraries)
    };
    
    // Optimize merged itinerary
    return this.optimizeItinerary(merged);
  }

  /**
   * Aggregate task results
   */
  async aggregateTasks(results, context) {
    const allTasks = [];
    const taskMap = new Map();
    
    results.forEach(result => {
      const tasks = result.data.tasks || result.data.todos || result.data || [];
      
      tasks.forEach(task => {
        const key = this.generateTaskKey(task);
        
        if (taskMap.has(key)) {
          // Merge duplicate tasks
          const existing = taskMap.get(key);
          taskMap.set(key, this.mergeTasks(existing, task));
        } else {
          taskMap.set(key, task);
          allTasks.push(task);
        }
      });
    });
    
    // Sort by priority and deadline
    const sorted = this.sortTasks(Array.from(taskMap.values()));
    
    return {
      tasks: sorted,
      summary: this.generateTaskSummary(sorted),
      categories: this.categorizeTasks(sorted)
    };
  }

  /**
   * Aggregate document analysis results
   */
  async aggregateDocuments(results, context) {
    const documents = [];
    const insights = [];
    
    results.forEach(result => {
      const data = result.data;
      
      if (data.documents) {
        documents.push(...data.documents);
      }
      
      if (data.analysis || data.insights) {
        insights.push(data.analysis || data.insights);
      }
    });
    
    return {
      documents: this.deduplicateDocuments(documents),
      analysis: this.mergeInsights(insights),
      validationStatus: this.aggregateValidationStatus(results)
    };
  }

  /**
   * Aggregate analysis results
   */
  async aggregateAnalysis(results, context) {
    const analyses = results.map(r => r.data);
    
    return {
      insights: this.mergeInsights(analyses),
      recommendations: this.mergeRecommendations(analyses),
      risks: this.mergeRisks(analyses),
      opportunities: this.mergeOpportunities(analyses),
      consensus: this.findAnalysisConsensus(analyses)
    };
  }

  /**
   * Post-process aggregated results
   */
  async postprocessResults(aggregated, context) {
    let processed = { ...aggregated };
    
    // Remove duplicates if enabled
    if (this.options.enableDeduplication) {
      processed = this.deduplicateResults(processed);
    }
    
    // Normalize formats if enabled
    if (this.options.enableNormalization) {
      processed = this.normalizeFormats(processed);
    }
    
    // Apply confidence filtering
    processed = this.filterByConfidence(processed);
    
    // Add computed fields
    processed = this.addComputedFields(processed, context);
    
    return processed;
  }

  /**
   * Calculate confidence score for result
   */
  calculateConfidence(result) {
    let confidence = result.confidence || 0.8;
    
    // Adjust based on success
    if (!result.success) {
      confidence *= 0.5;
    }
    
    // Adjust based on errors
    if (result.errors && result.errors.length > 0) {
      confidence *= (1 - 0.1 * result.errors.length);
    }
    
    // Adjust based on data completeness
    const completeness = this.assessDataCompleteness(result.data);
    confidence *= completeness;
    
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Assess data completeness
   */
  assessDataCompleteness(data) {
    if (!data || typeof data !== 'object') return 0.5;
    
    const fields = Object.keys(data);
    const nonNullFields = fields.filter(key => 
      data[key] !== null && data[key] !== undefined && data[key] !== ''
    );
    
    return nonNullFields.length / Math.max(fields.length, 1);
  }

  /**
   * Calculate weights for weighted aggregation
   */
  calculateWeights(results) {
    const weights = results.map(r => r.confidence || 0.5);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    
    // Normalize weights
    return weights.map(w => w / totalWeight);
  }

  /**
   * Extract all unique fields from results
   */
  extractAllFields(results) {
    const fields = new Set();
    
    results.forEach(result => {
      if (result.data && typeof result.data === 'object') {
        Object.keys(result.data).forEach(key => fields.add(key));
      }
    });
    
    return Array.from(fields);
  }

  /**
   * Merge results with deduplication
   */
  mergeResults(results) {
    const merged = {};
    
    results.forEach(result => {
      for (const [key, value] of Object.entries(result.data)) {
        if (!merged[key]) {
          merged[key] = value;
        } else if (Array.isArray(merged[key]) && Array.isArray(value)) {
          // Merge arrays with deduplication
          merged[key] = [...new Set([...merged[key], ...value])];
        } else if (typeof merged[key] === 'object' && typeof value === 'object') {
          // Deep merge objects
          merged[key] = this.deepMerge(merged[key], value);
        }
      }
    });
    
    return merged;
  }

  /**
   * Deep merge objects
   */
  deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  /**
   * Find consensus value
   */
  findConsensus(values, threshold) {
    const valueCounts = new Map();
    
    // Count occurrences
    values.forEach(value => {
      const key = JSON.stringify(value);
      valueCounts.set(key, (valueCounts.get(key) || 0) + 1);
    });
    
    // Find value that meets threshold
    const totalCount = values.length;
    for (const [key, count] of valueCounts) {
      if (count / totalCount >= threshold) {
        return JSON.parse(key);
      }
    }
    
    // No consensus, return most common
    let maxCount = 0;
    let mostCommon = null;
    
    for (const [key, count] of valueCounts) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = JSON.parse(key);
      }
    }
    
    return mostCommon;
  }

  /**
   * Generate aggregation metadata
   */
  generateAggregationMetadata(originalResults, aggregatedData) {
    return {
      totalResults: originalResults.length,
      successfulResults: originalResults.filter(r => r.success).length,
      aggregationStrategy: this.options.mergeStrategy,
      confidence: this.calculateOverallConfidence(originalResults),
      timestamp: Date.now(),
      statistics: {
        averageConfidence: this.calculateAverageConfidence(originalResults),
        consensusLevel: this.calculateConsensusLevel(originalResults),
        dataCompleteness: this.assessDataCompleteness(aggregatedData)
      }
    };
  }

  /**
   * Deduplicate results
   */
  deduplicateResults(results) {
    if (!results || typeof results !== 'object') return results;
    
    // If it's an array, remove duplicates
    if (Array.isArray(results)) {
      return [...new Set(results.map(item => JSON.stringify(item)))].map(item => JSON.parse(item));
    }
    
    // For objects, recursively deduplicate arrays
    const deduplicated = {};
    for (const [key, value] of Object.entries(results)) {
      if (Array.isArray(value)) {
        deduplicated[key] = [...new Set(value.map(item => 
          typeof item === 'object' ? JSON.stringify(item) : item
        ))].map(item => 
          typeof item === 'string' && item.startsWith('{') ? JSON.parse(item) : item
        );
      } else if (value && typeof value === 'object') {
        deduplicated[key] = this.deduplicateResults(value);
      } else {
        deduplicated[key] = value;
      }
    }
    
    return deduplicated;
  }

  /**
   * Normalize formats in results
   */
  normalizeFormats(results) {
    if (!results || typeof results !== 'object') return results;
    
    const normalized = {};
    for (const [key, value] of Object.entries(results)) {
      if (Array.isArray(value)) {
        // Normalize array formats
        normalized[key] = value.map(item => {
          if (typeof item === 'string') {
            // Trim whitespace and normalize case for strings
            return item.trim();
          }
          return item;
        });
      } else if (value && typeof value === 'object') {
        // Recursively normalize objects
        normalized[key] = this.normalizeFormats(value);
      } else if (typeof value === 'string') {
        // Normalize string values
        normalized[key] = value.trim();
      } else {
        normalized[key] = value;
      }
    }
    
    return normalized;
  }

  /**
   * Filter results by confidence threshold
   */
  filterByConfidence(results) {
    if (!results || typeof results !== 'object') return results;
    
    const threshold = this.options.confidenceThreshold || 0.5;
    const filtered = {};
    
    for (const [key, value] of Object.entries(results)) {
      if (Array.isArray(value)) {
        // Filter array items by confidence
        filtered[key] = value.filter(item => {
          if (item && typeof item === 'object' && 'confidence' in item) {
            return item.confidence >= threshold;
          }
          return true; // Keep items without confidence scores
        });
      } else if (value && typeof value === 'object' && 'confidence' in value) {
        // Filter object by confidence
        if (value.confidence >= threshold) {
          filtered[key] = value;
        }
      } else {
        // Keep items without confidence scores
        filtered[key] = value;
      }
    }
    
    return filtered;
  }

  /**
   * Add computed fields to results
   */
  addComputedFields(results, context) {
    if (!results || typeof results !== 'object') return results;
    
    const enhanced = { ...results };
    
    // Add metadata if not present
    if (!enhanced.metadata) {
      enhanced.metadata = {
        processedAt: new Date().toISOString(),
        processingContext: context?.type || 'unknown',
        resultCount: this.countResults(results)
      };
    }
    
    // Add summary statistics
    if (Array.isArray(enhanced.data)) {
      enhanced.summary = {
        totalItems: enhanced.data.length,
        averageConfidence: this.calculateAverageConfidence(enhanced.data)
      };
    }
    
    return enhanced;
  }

  /**
   * Count results in a data structure
   */
  countResults(data) {
    if (Array.isArray(data)) {
      return data.length;
    }
    if (data && typeof data === 'object') {
      return Object.keys(data).length;
    }
    return 1;
  }

  /**
   * Calculate overall confidence
   */
  calculateOverallConfidence(results) {
    if (results.length === 0) return 0;
    
    const confidences = results.map(r => r.confidence || 0.5);
    const average = confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
    
    // Penalize for low consensus
    const consensusLevel = this.calculateConsensusLevel(results);
    
    return average * consensusLevel;
  }

  /**
   * Calculate consensus level
   */
  calculateConsensusLevel(results) {
    // Simple consensus: how similar are the results?
    // This is a simplified implementation
    return 0.8; // Placeholder - implement actual consensus calculation
  }

  /**
   * Calculate average confidence from an array of items
   */
  calculateAverageConfidence(items) {
    if (!Array.isArray(items) || items.length === 0) return 0.5;
    
    const confidences = items
      .map(item => item.confidence || item.score || 0.5)
      .filter(conf => typeof conf === 'number');
    
    if (confidences.length === 0) return 0.5;
    
    return confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
  }

  /**
   * Assess data completeness
   */
  assessDataCompleteness(data) {
    if (!data || typeof data !== 'object') return 0;
    
    const requiredFields = ['content', 'data', 'results', 'response'];
    let score = 0;
    let totalFields = 0;
    
    for (const field of requiredFields) {
      if (field in data) {
        totalFields++;
        if (data[field] && 
            (Array.isArray(data[field]) ? data[field].length > 0 : 
             typeof data[field] === 'object' ? Object.keys(data[field]).length > 0 : 
             true)) {
          score++;
        }
      }
    }
    
    return totalFields > 0 ? score / totalFields : 0;
  }

  /**
   * Extract sources information
   */
  extractSources(results) {
    return results.map(r => ({
      agentId: r.agentId,
      confidence: r.confidence,
      timestamp: r.timestamp,
      success: r.success
    }));
  }

  /**
   * Group results by type
   */
  groupResultsByType(results) {
    const grouped = {};
    
    results.forEach(result => {
      const type = result.type || 'general';
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(result);
    });
    
    return grouped;
  }

  /**
   * Create empty result
   */
  createEmptyResult() {
    return {
      success: true,
      data: {},
      metadata: {
        empty: true,
        reason: 'No results to aggregate'
      }
    };
  }

  /**
   * Helper methods for specific aggregations
   */
  
  normalizeBooking(booking) {
    return {
      confirmationNumber: booking.confirmationNumber || booking.bookingReference,
      type: booking.type || 'unknown',
      date: booking.date || booking.departureDate,
      provider: booking.provider || booking.airline || booking.hotel,
      status: booking.status || 'confirmed',
      details: booking
    };
  }

  generateTaskKey(task) {
    // Generate unique key for task deduplication
    const description = (task.description || task.title || '').toLowerCase();
    return description.replace(/[^a-z0-9]/g, '');
  }

  mergeTasks(task1, task2) {
    // Merge two similar tasks
    return {
      ...task1,
      ...task2,
      priority: this.higherPriority(task1.priority, task2.priority),
      confidence: Math.max(task1.confidence || 0, task2.confidence || 0)
    };
  }

  higherPriority(p1, p2) {
    const priorities = { high: 3, medium: 2, low: 1 };
    return (priorities[p1] || 0) > (priorities[p2] || 0) ? p1 : p2;
  }

  sortTasks(tasks) {
    return tasks.sort((a, b) => {
      // Sort by priority first
      const priorityDiff = this.comparePriority(a.priority, b.priority);
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by deadline
      if (a.deadline && b.deadline) {
        return new Date(a.deadline) - new Date(b.deadline);
      }
      
      return 0;
    });
  }

  comparePriority(a, b) {
    const priorities = { high: 3, medium: 2, low: 1 };
    return (priorities[b] || 0) - (priorities[a] || 0);
  }

  generateTaskSummary(tasks) {
    return {
      total: tasks.length,
      byPriority: this.groupBy(tasks, 'priority'),
      byStatus: this.groupBy(tasks, 'status'),
      urgent: tasks.filter(t => t.urgent || t.priority === 'high').length
    };
  }

  groupBy(items, key) {
    return items.reduce((groups, item) => {
      const value = item[key] || 'unknown';
      groups[value] = (groups[value] || 0) + 1;
      return groups;
    }, {});
  }

  categorizeTasks(tasks) {
    const categories = {};
    
    tasks.forEach(task => {
      const category = task.category || 'uncategorized';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(task);
    });
    
    return categories;
  }
}

export default ResultAggregator;