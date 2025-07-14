/**
 * ConflictResolver - Resolves contradictions and conflicts between agent outputs
 * 
 * Identifies conflicts, applies resolution strategies, and ensures consistency
 * in multi-agent results.
 */

export class ConflictResolver {
  constructor(options = {}) {
    this.options = {
      resolutionStrategy: options.resolutionStrategy || 'weighted-consensus',
      conflictThreshold: options.conflictThreshold || 0.3,
      requireExplanation: options.requireExplanation !== false,
      maxResolutionAttempts: options.maxResolutionAttempts || 3,
      ...options
    };
    
    // Resolution strategies
    this.strategies = {
      'majority-vote': this.majorityVoteResolution.bind(this),
      'weighted-consensus': this.weightedConsensusResolution.bind(this),
      'authority-based': this.authorityBasedResolution.bind(this),
      'evidence-based': this.evidenceBasedResolution.bind(this),
      'compromise': this.compromiseResolution.bind(this),
      'escalation': this.escalationResolution.bind(this)
    };
    
    // Conflict detection methods
    this.conflictDetectors = {
      value: this.detectValueConflicts.bind(this),
      semantic: this.detectSemanticConflicts.bind(this),
      temporal: this.detectTemporalConflicts.bind(this),
      logical: this.detectLogicalConflicts.bind(this)
    };
    
    // Domain-specific conflict rules
    this.domainRules = this.initializeDomainRules();
  }

  /**
   * Detect and resolve conflicts in agent results
   * @param {Array} results - Results from multiple agents
   * @param {Object} context - Resolution context
   * @returns {Object} Resolved results
   */
  async resolveConflicts(results, context = {}) {
    try {
      console.log(`🔍 Analyzing ${results.length} results for conflicts`);
      
      // Detect all conflicts
      const conflicts = await this.detectConflicts(results, context);
      
      if (conflicts.length === 0) {
        console.log('✅ No conflicts detected');
        return {
          resolved: true,
          conflicts: [],
          resolution: this.mergeNonConflictingResults(results)
        };
      }
      
      console.log(`⚠️ Found ${conflicts.length} conflicts to resolve`);
      
      // Apply resolution strategy
      const resolved = await this.applyResolutionStrategy(conflicts, results, context);
      
      // Validate resolution
      const validation = await this.validateResolution(resolved, conflicts);
      
      if (!validation.valid) {
        console.warn('❌ Resolution validation failed:', validation.reason);
        
        // Apply fallback strategy
        resolved.data = await this.applyFallbackStrategy(conflicts, results);
      }
      
      return {
        resolved: true,
        conflicts: conflicts.map(c => c.summary),
        resolution: resolved.data,
        explanations: resolved.explanations,
        confidence: resolved.confidence
      };
      
    } catch (error) {
      console.error('❌ Conflict resolution failed:', error);
      throw error;
    }
  }

  /**
   * Detect all types of conflicts
   */
  async detectConflicts(results, context) {
    const conflicts = [];
    
    // Apply each conflict detector
    for (const [type, detector] of Object.entries(this.conflictDetectors)) {
      const detected = await detector(results, context);
      
      detected.forEach(conflict => {
        conflicts.push({
          ...conflict,
          type,
          severity: this.assessConflictSeverity(conflict)
        });
      });
    }
    
    // Sort by severity
    conflicts.sort((a, b) => b.severity - a.severity);
    
    return conflicts;
  }

  /**
   * Detect value conflicts (different values for same field)
   */
  async detectValueConflicts(results, context) {
    const conflicts = [];
    const fieldValues = new Map();
    
    // Collect all field values
    results.forEach((result, agentIndex) => {
      const data = result.data || result;
      
      this.extractFieldValues(data).forEach(({ path, value }) => {
        if (!fieldValues.has(path)) {
          fieldValues.set(path, []);
        }
        
        fieldValues.get(path).push({
          value,
          agentIndex,
          agentId: result.agentId,
          confidence: result.confidence || 0.8
        });
      });
    });
    
    // Check for conflicts
    for (const [path, values] of fieldValues) {
      if (values.length < 2) continue;
      
      const uniqueValues = this.getUniqueValues(values);
      
      if (uniqueValues.length > 1) {
        const conflict = {
          field: path,
          values: uniqueValues,
          agents: values,
          conflictScore: this.calculateConflictScore(uniqueValues)
        };
        
        if (conflict.conflictScore > this.options.conflictThreshold) {
          conflicts.push(conflict);
        }
      }
    }
    
    return conflicts;
  }

  /**
   * Detect semantic conflicts (contradictory meanings)
   */
  async detectSemanticConflicts(results, context) {
    const conflicts = [];
    
    // Check for semantic contradictions in text fields
    const textFields = this.extractTextFields(results);
    
    for (const field of textFields) {
      const values = field.values;
      
      // Simple semantic conflict detection
      const contradictions = this.findContradictions(values);
      
      if (contradictions.length > 0) {
        conflicts.push({
          field: field.path,
          type: 'semantic',
          contradictions,
          summary: `Contradictory information in ${field.path}`
        });
      }
    }
    
    return conflicts;
  }

  /**
   * Detect temporal conflicts (inconsistent dates/times)
   */
  async detectTemporalConflicts(results, context) {
    const conflicts = [];
    const dateFields = new Map();
    
    // Extract all date/time fields
    results.forEach((result, agentIndex) => {
      this.extractDateFields(result.data || result).forEach(({ path, value }) => {
        if (!dateFields.has(path)) {
          dateFields.set(path, []);
        }
        
        dateFields.get(path).push({
          value,
          date: new Date(value),
          agentIndex,
          agentId: result.agentId
        });
      });
    });
    
    // Check for temporal inconsistencies
    for (const [path, dates] of dateFields) {
      if (dates.length < 2) continue;
      
      // Check for conflicts
      const conflicts = this.findTemporalConflicts(dates);
      
      if (conflicts.length > 0) {
        conflicts.push({
          field: path,
          type: 'temporal',
          conflicts,
          summary: `Conflicting dates/times in ${path}`
        });
      }
    }
    
    return conflicts;
  }

  /**
   * Detect logical conflicts (contradictory logic)
   */
  async detectLogicalConflicts(results, context) {
    const conflicts = [];
    
    // Check for logical inconsistencies
    for (let i = 0; i < results.length - 1; i++) {
      for (let j = i + 1; j < results.length; j++) {
        const logicalConflicts = this.checkLogicalConsistency(
          results[i].data || results[i],
          results[j].data || results[j]
        );
        
        if (logicalConflicts.length > 0) {
          conflicts.push({
            type: 'logical',
            agents: [results[i].agentId, results[j].agentId],
            conflicts: logicalConflicts,
            summary: 'Logical inconsistencies detected'
          });
        }
      }
    }
    
    return conflicts;
  }

  /**
   * Apply resolution strategy
   */
  async applyResolutionStrategy(conflicts, results, context) {
    const strategy = this.strategies[this.options.resolutionStrategy] || 
                    this.strategies['weighted-consensus'];
    
    console.log(`📋 Applying ${this.options.resolutionStrategy} resolution strategy`);
    
    const resolved = await strategy(conflicts, results, context);
    
    // Add explanations if required
    if (this.options.requireExplanation) {
      resolved.explanations = this.generateExplanations(conflicts, resolved);
    }
    
    return resolved;
  }

  /**
   * Majority vote resolution
   */
  async majorityVoteResolution(conflicts, results, context) {
    const resolved = {};
    const explanations = [];
    
    for (const conflict of conflicts) {
      if (conflict.field) {
        // Count votes for each value
        const votes = new Map();
        
        conflict.values.forEach(({ value, count }) => {
          votes.set(JSON.stringify(value), count);
        });
        
        // Find majority
        let maxVotes = 0;
        let winningValue = null;
        
        for (const [valueStr, count] of votes) {
          if (count > maxVotes) {
            maxVotes = count;
            winningValue = JSON.parse(valueStr);
          }
        }
        
        resolved[conflict.field] = winningValue;
        
        explanations.push({
          field: conflict.field,
          method: 'majority-vote',
          reason: `${maxVotes} out of ${results.length} agents agreed on this value`
        });
      }
    }
    
    return {
      data: resolved,
      explanations,
      confidence: this.calculateResolutionConfidence(conflicts, 'majority')
    };
  }

  /**
   * Weighted consensus resolution
   */
  async weightedConsensusResolution(conflicts, results, context) {
    const resolved = {};
    const explanations = [];
    
    for (const conflict of conflicts) {
      if (conflict.field && conflict.agents) {
        // Calculate weighted scores
        const weightedScores = new Map();
        
        conflict.agents.forEach(agent => {
          const valueKey = JSON.stringify(agent.value);
          const weight = agent.confidence * this.getAgentWeight(agent.agentId, context);
          
          weightedScores.set(valueKey, 
            (weightedScores.get(valueKey) || 0) + weight
          );
        });
        
        // Find highest weighted value
        let maxScore = 0;
        let bestValue = null;
        
        for (const [valueStr, score] of weightedScores) {
          if (score > maxScore) {
            maxScore = score;
            bestValue = JSON.parse(valueStr);
          }
        }
        
        resolved[conflict.field] = bestValue;
        
        explanations.push({
          field: conflict.field,
          method: 'weighted-consensus',
          reason: `Highest confidence-weighted score: ${maxScore.toFixed(2)}`
        });
      }
    }
    
    // Merge with non-conflicting data
    const merged = this.mergeWithNonConflicting(resolved, results);
    
    return {
      data: merged,
      explanations,
      confidence: this.calculateResolutionConfidence(conflicts, 'weighted')
    };
  }

  /**
   * Authority-based resolution
   */
  async authorityBasedResolution(conflicts, results, context) {
    const resolved = {};
    const explanations = [];
    
    // Define authority levels for different agent types
    const authorityLevels = {
      'document-analyzer': 3,  // High authority for document data
      'email-monitor': 2,      // Medium authority for email data
      'itinerary-builder': 2,  // Medium authority for travel plans
      'task-extractor': 1      // Lower authority for general tasks
    };
    
    for (const conflict of conflicts) {
      if (conflict.agents) {
        // Find agent with highest authority
        let highestAuthority = 0;
        let authoritativeValue = null;
        let authoritativeAgent = null;
        
        conflict.agents.forEach(agent => {
          const authority = authorityLevels[agent.agentId] || 1;
          const score = authority * agent.confidence;
          
          if (score > highestAuthority) {
            highestAuthority = score;
            authoritativeValue = agent.value;
            authoritativeAgent = agent.agentId;
          }
        });
        
        resolved[conflict.field] = authoritativeValue;
        
        explanations.push({
          field: conflict.field,
          method: 'authority-based',
          reason: `${authoritativeAgent} has domain authority for this type of data`
        });
      }
    }
    
    return {
      data: resolved,
      explanations,
      confidence: 0.85  // Authority-based has high confidence
    };
  }

  /**
   * Evidence-based resolution
   */
  async evidenceBasedResolution(conflicts, results, context) {
    const resolved = {};
    const explanations = [];
    
    for (const conflict of conflicts) {
      // Analyze evidence for each conflicting value
      const evidenceScores = await this.analyzeEvidence(conflict, results, context);
      
      // Select value with strongest evidence
      let bestValue = null;
      let bestScore = 0;
      let bestEvidence = null;
      
      for (const [value, evidence] of evidenceScores) {
        if (evidence.score > bestScore) {
          bestScore = evidence.score;
          bestValue = value;
          bestEvidence = evidence;
        }
      }
      
      resolved[conflict.field] = bestValue;
      
      explanations.push({
        field: conflict.field,
        method: 'evidence-based',
        reason: bestEvidence.reason,
        evidenceScore: bestScore
      });
    }
    
    return {
      data: resolved,
      explanations,
      confidence: this.calculateEvidenceConfidence(explanations)
    };
  }

  /**
   * Compromise resolution (find middle ground)
   */
  async compromiseResolution(conflicts, results, context) {
    const resolved = {};
    const explanations = [];
    
    for (const conflict of conflicts) {
      const compromiseValue = this.findCompromise(conflict);
      
      if (compromiseValue !== null) {
        resolved[conflict.field] = compromiseValue;
        
        explanations.push({
          field: conflict.field,
          method: 'compromise',
          reason: 'Found middle ground between conflicting values'
        });
      } else {
        // Fall back to weighted consensus if compromise not possible
        const fallback = await this.weightedConsensusResolution([conflict], results, context);
        resolved[conflict.field] = fallback.data[conflict.field];
        explanations.push(...fallback.explanations);
      }
    }
    
    return {
      data: resolved,
      explanations,
      confidence: 0.75  // Compromise has moderate confidence
    };
  }

  /**
   * Escalation resolution (flag for human review)
   */
  async escalationResolution(conflicts, results, context) {
    const resolved = {};
    const explanations = [];
    const escalations = [];
    
    for (const conflict of conflicts) {
      if (conflict.severity > 0.8) {
        // High severity - escalate
        escalations.push({
          field: conflict.field,
          conflict,
          requiresHumanReview: true
        });
        
        // Use most confident value as placeholder
        const placeholder = this.getMostConfidentValue(conflict);
        resolved[conflict.field] = placeholder.value;
        
        explanations.push({
          field: conflict.field,
          method: 'escalation',
          reason: 'High-severity conflict requires human review',
          placeholder: true
        });
      } else {
        // Low severity - auto-resolve
        const fallback = await this.weightedConsensusResolution([conflict], results, context);
        resolved[conflict.field] = fallback.data[conflict.field];
        explanations.push(...fallback.explanations);
      }
    }
    
    return {
      data: resolved,
      explanations,
      escalations,
      confidence: 0.6  // Lower confidence due to escalations
    };
  }

  /**
   * Initialize domain-specific rules
   */
  initializeDomainRules() {
    return {
      travel: {
        dateConflicts: {
          // Prefer earlier dates for deadlines
          resolution: 'earliest',
          fields: ['deadline', 'expiry', 'dueDate']
        },
        priceConflicts: {
          // Prefer most recent price
          resolution: 'most-recent',
          fields: ['price', 'cost', 'fare']
        }
      },
      booking: {
        confirmationConflicts: {
          // Prefer longer confirmation numbers
          resolution: 'longest',
          fields: ['confirmationNumber', 'bookingReference']
        }
      }
    };
  }

  /**
   * Helper methods
   */

  extractFieldValues(data, path = '') {
    const values = [];
    
    if (data === null || data === undefined) return values;
    
    if (typeof data === 'object' && !Array.isArray(data)) {
      for (const [key, value] of Object.entries(data)) {
        const fieldPath = path ? `${path}.${key}` : key;
        
        if (typeof value === 'object' && value !== null) {
          values.push(...this.extractFieldValues(value, fieldPath));
        } else {
          values.push({ path: fieldPath, value });
        }
      }
    } else if (!Array.isArray(data)) {
      values.push({ path, value: data });
    }
    
    return values;
  }

  getUniqueValues(values) {
    const uniqueMap = new Map();
    
    values.forEach(({ value, agentId }) => {
      const key = JSON.stringify(value);
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, { value, count: 0, agents: [] });
      }
      uniqueMap.get(key).count++;
      uniqueMap.get(key).agents.push(agentId);
    });
    
    return Array.from(uniqueMap.values());
  }

  calculateConflictScore(uniqueValues) {
    // Higher score = more severe conflict
    const valueCount = uniqueValues.length;
    const totalAgents = uniqueValues.reduce((sum, v) => sum + v.count, 0);
    
    // Calculate entropy-like score
    let entropy = 0;
    uniqueValues.forEach(({ count }) => {
      const probability = count / totalAgents;
      if (probability > 0) {
        entropy -= probability * Math.log2(probability);
      }
    });
    
    // Normalize to 0-1
    const maxEntropy = Math.log2(totalAgents);
    return maxEntropy > 0 ? entropy / maxEntropy : 0;
  }

  assessConflictSeverity(conflict) {
    let severity = conflict.conflictScore || 0.5;
    
    // Adjust based on field importance
    const importantFields = ['date', 'price', 'confirmationNumber', 'deadline'];
    if (conflict.field && importantFields.some(f => conflict.field.includes(f))) {
      severity *= 1.5;
    }
    
    // Adjust based on conflict type
    if (conflict.type === 'logical') severity *= 1.3;
    if (conflict.type === 'temporal') severity *= 1.2;
    
    return Math.min(1, severity);
  }

  findContradictions(values) {
    const contradictions = [];
    
    // Simple contradiction patterns
    const opposites = [
      ['confirmed', 'cancelled'],
      ['available', 'unavailable'],
      ['valid', 'invalid'],
      ['approved', 'rejected']
    ];
    
    for (let i = 0; i < values.length - 1; i++) {
      for (let j = i + 1; j < values.length; j++) {
        const v1 = String(values[i].value).toLowerCase();
        const v2 = String(values[j].value).toLowerCase();
        
        for (const [word1, word2] of opposites) {
          if ((v1.includes(word1) && v2.includes(word2)) ||
              (v1.includes(word2) && v2.includes(word1))) {
            contradictions.push({
              values: [values[i], values[j]],
              type: 'opposite-meaning'
            });
          }
        }
      }
    }
    
    return contradictions;
  }

  extractDateFields(data, path = '') {
    const dateFields = [];
    const dateKeywords = ['date', 'time', 'deadline', 'expiry', 'departure', 'arrival'];
    
    if (typeof data === 'object' && data !== null) {
      for (const [key, value] of Object.entries(data)) {
        const fieldPath = path ? `${path}.${key}` : key;
        
        if (typeof value === 'string' && this.isDateValue(value)) {
          dateFields.push({ path: fieldPath, value });
        } else if (dateKeywords.some(kw => key.toLowerCase().includes(kw))) {
          dateFields.push({ path: fieldPath, value });
        } else if (typeof value === 'object') {
          dateFields.push(...this.extractDateFields(value, fieldPath));
        }
      }
    }
    
    return dateFields;
  }

  isDateValue(value) {
    // Simple date detection
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}/,  // ISO date
      /^\d{2}\/\d{2}\/\d{4}/,  // US date
      /^\d{2}-\d{2}-\d{4}/     // Other date format
    ];
    
    return datePatterns.some(pattern => pattern.test(value));
  }

  findTemporalConflicts(dates) {
    const conflicts = [];
    
    for (let i = 0; i < dates.length - 1; i++) {
      for (let j = i + 1; j < dates.length; j++) {
        const diff = Math.abs(dates[i].date - dates[j].date);
        
        // Significant difference (more than 1 day)
        if (diff > 24 * 60 * 60 * 1000) {
          conflicts.push({
            agents: [dates[i].agentId, dates[j].agentId],
            values: [dates[i].value, dates[j].value],
            difference: diff
          });
        }
      }
    }
    
    return conflicts;
  }

  checkLogicalConsistency(data1, data2) {
    const inconsistencies = [];
    
    // Check for logical conflicts in travel data
    if (data1.departure && data2.arrival) {
      const dep = new Date(data1.departure);
      const arr = new Date(data2.arrival);
      
      if (dep > arr) {
        inconsistencies.push({
          type: 'temporal-logic',
          issue: 'Departure after arrival'
        });
      }
    }
    
    // Check for capacity conflicts
    if (data1.travelers && data2.capacity) {
      if (data1.travelers > data2.capacity) {
        inconsistencies.push({
          type: 'capacity-logic',
          issue: 'More travelers than capacity'
        });
      }
    }
    
    return inconsistencies;
  }

  generateExplanations(conflicts, resolved) {
    const explanations = resolved.explanations || [];
    
    // Add conflict summary
    explanations.unshift({
      summary: `Resolved ${conflicts.length} conflicts using ${this.options.resolutionStrategy} strategy`,
      conflicts: conflicts.map(c => ({
        field: c.field,
        type: c.type,
        severity: c.severity
      }))
    });
    
    return explanations;
  }

  mergeNonConflictingResults(results) {
    // Simple merge for non-conflicting data
    const merged = {};
    
    results.forEach(result => {
      const data = result.data || result;
      Object.assign(merged, data);
    });
    
    return merged;
  }

  getAgentWeight(agentId, context) {
    // Get agent-specific weight based on performance, specialization, etc.
    const weights = context.agentWeights || {};
    return weights[agentId] || 1.0;
  }

  calculateResolutionConfidence(conflicts, method) {
    const baseConfidence = {
      'majority': 0.85,
      'weighted': 0.9,
      'authority': 0.85,
      'evidence': 0.95,
      'compromise': 0.75,
      'escalation': 0.6
    };
    
    let confidence = baseConfidence[method] || 0.8;
    
    // Adjust based on conflict severity
    const avgSeverity = conflicts.reduce((sum, c) => sum + c.severity, 0) / conflicts.length;
    confidence *= (1 - avgSeverity * 0.2);
    
    return Math.max(0.5, confidence);
  }

  validateResolution(resolved, conflicts) {
    const validation = { valid: true, reason: null };
    
    // Check if all conflicts were addressed
    const resolvedFields = new Set(Object.keys(resolved.data || {}));
    const conflictFields = new Set(conflicts.map(c => c.field).filter(f => f));
    
    for (const field of conflictFields) {
      if (!resolvedFields.has(field)) {
        validation.valid = false;
        validation.reason = `Conflict in field '${field}' was not resolved`;
        break;
      }
    }
    
    return validation;
  }

  applyFallbackStrategy(conflicts, results) {
    // Simple fallback: use first result
    console.warn('⚠️ Applying fallback strategy: using first agent result');
    return results[0].data || results[0];
  }

  getMostConfidentValue(conflict) {
    let bestConfidence = 0;
    let bestValue = null;
    
    conflict.agents.forEach(agent => {
      if (agent.confidence > bestConfidence) {
        bestConfidence = agent.confidence;
        bestValue = agent;
      }
    });
    
    return bestValue;
  }

  mergeWithNonConflicting(resolved, results) {
    // Start with resolved conflicts
    const merged = { ...resolved };
    
    // Add non-conflicting fields from all results
    results.forEach(result => {
      const data = result.data || result;
      
      for (const [key, value] of Object.entries(data)) {
        if (!merged.hasOwnProperty(key)) {
          merged[key] = value;
        }
      }
    });
    
    return merged;
  }

  analyzeEvidence(conflict, results, context) {
    const evidenceMap = new Map();
    
    conflict.agents.forEach(agent => {
      const evidence = {
        score: agent.confidence,
        sources: 1,
        reason: 'Based on agent confidence'
      };
      
      // Check for supporting evidence in other results
      results.forEach(result => {
        if (result.agentId !== agent.agentId) {
          const support = this.checkSupportingEvidence(agent.value, result);
          if (support) {
            evidence.score += support.score;
            evidence.sources++;
          }
        }
      });
      
      evidenceMap.set(agent.value, evidence);
    });
    
    return evidenceMap;
  }

  checkSupportingEvidence(value, result) {
    // Simple evidence check - can be enhanced
    const data = result.data || result;
    const dataStr = JSON.stringify(data).toLowerCase();
    const valueStr = String(value).toLowerCase();
    
    if (dataStr.includes(valueStr)) {
      return { score: 0.3, type: 'mentioned' };
    }
    
    return null;
  }

  calculateEvidenceConfidence(explanations) {
    const scores = explanations
      .filter(e => e.evidenceScore)
      .map(e => e.evidenceScore);
    
    if (scores.length === 0) return 0.8;
    
    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    return Math.min(0.95, avgScore);
  }

  findCompromise(conflict) {
    // Only works for numeric values
    const numericValues = conflict.agents
      .map(a => a.value)
      .filter(v => typeof v === 'number');
    
    if (numericValues.length > 1) {
      // Return average as compromise
      const sum = numericValues.reduce((s, v) => s + v, 0);
      return sum / numericValues.length;
    }
    
    // For dates, find middle date
    const dateValues = conflict.agents
      .map(a => a.value)
      .filter(v => this.isDateValue(String(v)))
      .map(v => new Date(v));
    
    if (dateValues.length > 1) {
      const timestamps = dateValues.map(d => d.getTime());
      const avgTimestamp = timestamps.reduce((s, t) => s + t, 0) / timestamps.length;
      return new Date(avgTimestamp).toISOString();
    }
    
    return null;
  }

  extractTextFields(results) {
    const textFields = [];
    
    results.forEach((result, index) => {
      const data = result.data || result;
      
      this.extractFieldValues(data).forEach(({ path, value }) => {
        if (typeof value === 'string' && value.length > 10) {
          textFields.push({
            path,
            values: [{ value, agentId: result.agentId, index }]
          });
        }
      });
    });
    
    // Group by path
    const grouped = new Map();
    textFields.forEach(field => {
      if (!grouped.has(field.path)) {
        grouped.set(field.path, { path: field.path, values: [] });
      }
      grouped.get(field.path).values.push(...field.values);
    });
    
    return Array.from(grouped.values());
  }
}

export default ConflictResolver;