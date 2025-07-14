/**
 * LearningEngine - Machine Learning and Pattern Recognition
 * 
 * Tracks agent performance, identifies patterns in user requests,
 * and improves routing decisions over time through feedback analysis.
 */

import { createReadStream, createWriteStream } from 'fs';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class LearningEngine {
  constructor(options = {}) {
    this.options = {
      dataPath: options.dataPath || path.join(__dirname, '../../../data/learning'),
      historyRetention: options.historyRetention || 90, // days
      minDataPoints: options.minDataPoints || 10,
      confidenceThreshold: options.confidenceThreshold || 0.7,
      updateInterval: options.updateInterval || 3600000, // 1 hour
      ...options
    };
    
    // Learning data structures
    this.agentPerformance = new Map(); // agentId -> performance metrics
    this.taskPatterns = new Map(); // taskType -> pattern data
    this.userPatterns = new Map(); // userId -> usage patterns
    this.routingSuccess = new Map(); // routing key -> success rate
    this.feedbackData = new Map(); // requestId -> feedback
    
    // Statistical models
    this.models = {
      agentSelection: null,
      taskClassification: null,
      complexityEstimation: null
    };
    
    // Performance tracking
    this.metrics = {
      totalInteractions: 0,
      successfulRoutings: 0,
      feedbackReceived: 0,
      modelAccuracy: 0,
      lastUpdate: null
    };
    
    this.initialized = false;
    this.updateTimer = null;
  }
  
  /**
   * Initialize the learning engine
   */
  async initialize() {
    try {
      console.log('🧮 Initializing Learning Engine...');
      
      // Ensure data directory exists
      await fs.mkdir(this.options.dataPath, { recursive: true });
      
      // Load historical data
      await this.loadHistoricalData();
      
      // Initialize models
      await this.initializeModels();
      
      // Start periodic updates
      this.startPeriodicUpdates();
      
      this.initialized = true;
      console.log('✅ Learning Engine initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Learning Engine:', error);
      throw error;
    }
  }
  
  /**
   * Load historical learning data
   */
  async loadHistoricalData() {
    try {
      // Load agent performance data
      const performancePath = path.join(this.options.dataPath, 'agent_performance.json');
      if (await this.fileExists(performancePath)) {
        const data = await fs.readFile(performancePath, 'utf8');
        const parsed = JSON.parse(data);
        this.agentPerformance = new Map(Object.entries(parsed));
      }
      
      // Load task patterns
      const patternsPath = path.join(this.options.dataPath, 'task_patterns.json');
      if (await this.fileExists(patternsPath)) {
        const data = await fs.readFile(patternsPath, 'utf8');
        const parsed = JSON.parse(data);
        this.taskPatterns = new Map(Object.entries(parsed));
      }
      
      // Load user patterns
      const userPath = path.join(this.options.dataPath, 'user_patterns.json');
      if (await this.fileExists(userPath)) {
        const data = await fs.readFile(userPath, 'utf8');
        const parsed = JSON.parse(data);
        this.userPatterns = new Map(Object.entries(parsed));
      }
      
      // Load routing success data
      const routingPath = path.join(this.options.dataPath, 'routing_success.json');
      if (await this.fileExists(routingPath)) {
        const data = await fs.readFile(routingPath, 'utf8');
        const parsed = JSON.parse(data);
        this.routingSuccess = new Map(Object.entries(parsed));
      }
      
      console.log(`📊 Loaded historical data: ${this.agentPerformance.size} agents, ${this.taskPatterns.size} patterns`);
      
    } catch (error) {
      console.warn('⚠️ Could not load historical data:', error.message);
    }
  }
  
  /**
   * Initialize learning models
   */
  async initializeModels() {
    // Initialize simple statistical models
    // In a production system, these would be actual ML models
    
    this.models.agentSelection = {
      predict: (taskType, complexity, userProfile) => {
        return this.predictBestAgent(taskType, complexity, userProfile);
      }
    };
    
    this.models.taskClassification = {
      predict: (content) => {
        return this.classifyTask(content);
      }
    };
    
    this.models.complexityEstimation = {
      predict: (content, context) => {
        return this.estimateComplexity(content, context);
      }
    };
  }
  
  /**
   * Start periodic model updates
   */
  startPeriodicUpdates() {
    this.updateTimer = setInterval(async () => {
      await this.updateModels();
      await this.saveData();
      await this.cleanOldData();
    }, this.options.updateInterval);
  }
  
  /**
   * Record an interaction for learning
   */
  async recordInteraction(interaction) {
    const {
      userId,
      taskType,
      complexity,
      selectedAgents,
      executionTime,
      success,
      userSatisfaction
    } = interaction;
    
    this.metrics.totalInteractions++;
    
    // Update agent performance
    selectedAgents.forEach(agent => {
      if (!this.agentPerformance.has(agent.id)) {
        this.agentPerformance.set(agent.id, {
          totalTasks: 0,
          successfulTasks: 0,
          averageExecutionTime: 0,
          taskTypes: {},
          userSatisfaction: []
        });
      }
      
      const perf = this.agentPerformance.get(agent.id);
      perf.totalTasks++;
      if (success) perf.successfulTasks++;
      
      // Update average execution time
      perf.averageExecutionTime = 
        (perf.averageExecutionTime * (perf.totalTasks - 1) + executionTime) / perf.totalTasks;
      
      // Track task type performance
      if (!perf.taskTypes[taskType]) {
        perf.taskTypes[taskType] = {
          count: 0,
          successes: 0,
          avgTime: 0
        };
      }
      perf.taskTypes[taskType].count++;
      if (success) perf.taskTypes[taskType].successes++;
    });
    
    // Update task patterns
    if (!this.taskPatterns.has(taskType)) {
      this.taskPatterns.set(taskType, {
        totalOccurrences: 0,
        complexityDistribution: [],
        typicalAgents: {},
        successRate: 0,
        averageExecutionTime: 0
      });
    }
    
    const pattern = this.taskPatterns.get(taskType);
    pattern.totalOccurrences++;
    pattern.complexityDistribution.push(complexity);
    
    selectedAgents.forEach(agent => {
      pattern.typicalAgents[agent.id] = (pattern.typicalAgents[agent.id] || 0) + 1;
    });
    
    // Update user patterns
    if (!this.userPatterns.has(userId)) {
      this.userPatterns.set(userId, {
        taskHistory: [],
        preferredAgents: {},
        averageComplexity: 0,
        interactionTimes: [],
        feedbackHistory: []
      });
    }
    
    const userPattern = this.userPatterns.get(userId);
    userPattern.taskHistory.push({
      taskType,
      complexity,
      timestamp: new Date(),
      success
    });
    
    selectedAgents.forEach(agent => {
      userPattern.preferredAgents[agent.id] = 
        (userPattern.preferredAgents[agent.id] || 0) + 1;
    });
    
    // Update routing success
    const routingKey = `${taskType}:${selectedAgents.map(a => a.id).join(',')}`;
    if (!this.routingSuccess.has(routingKey)) {
      this.routingSuccess.set(routingKey, {
        attempts: 0,
        successes: 0,
        averageTime: 0,
        satisfactionScores: []
      });
    }
    
    const routing = this.routingSuccess.get(routingKey);
    routing.attempts++;
    if (success) {
      routing.successes++;
      this.metrics.successfulRoutings++;
    }
    
    // Keep only recent history
    this.pruneUserHistory(userId);
  }
  
  /**
   * Recommend agents for a task
   */
  async recommendAgents(params) {
    const { taskType, complexity, userProfile, historicalSuccess } = params;
    const recommendations = [];
    
    // Get agents that have handled this task type
    const taskPattern = this.taskPatterns.get(taskType);
    if (taskPattern && taskPattern.typicalAgents) {
      // Sort agents by frequency and success rate
      const agentScores = Object.entries(taskPattern.typicalAgents)
        .map(([agentId, count]) => {
          const performance = this.agentPerformance.get(agentId);
          const taskPerf = performance?.taskTypes[taskType];
          
          let score = count / taskPattern.totalOccurrences; // Frequency score
          
          if (taskPerf) {
            const successRate = taskPerf.successes / taskPerf.count;
            score *= successRate; // Weight by success rate
          }
          
          // Consider user preferences
          if (userProfile && this.userPatterns.has(userProfile.userId)) {
            const userPattern = this.userPatterns.get(userProfile.userId);
            const userPreference = userPattern.preferredAgents[agentId] || 0;
            score *= (1 + userPreference / 100); // Boost for user preference
          }
          
          return { agentId, score, confidence: this.calculateConfidence(taskPerf) };
        })
        .sort((a, b) => b.score - a.score);
      
      // Add top recommendations
      agentScores.slice(0, 3).forEach(({ agentId, score, confidence }) => {
        recommendations.push({
          agentId,
          score,
          confidence,
          reasoning: `Historical success rate: ${(score * 100).toFixed(1)}%`
        });
      });
    }
    
    // Consider complexity-based recommendations
    if (complexity > 0.7) {
      // For complex tasks, recommend agents with good performance on complex tasks
      this.agentPerformance.forEach((perf, agentId) => {
        const complexTasks = Object.entries(perf.taskTypes)
          .filter(([type, data]) => {
            const pattern = this.taskPatterns.get(type);
            if (!pattern) return false;
            const avgComplexity = pattern.complexityDistribution.reduce((a, b) => a + b, 0) / 
                                 pattern.complexityDistribution.length;
            return avgComplexity > 0.6;
          });
        
        if (complexTasks.length > 0) {
          const avgSuccess = complexTasks.reduce((sum, [_, data]) => 
            sum + (data.successes / data.count), 0) / complexTasks.length;
          
          if (avgSuccess > 0.7) {
            recommendations.push({
              agentId,
              score: avgSuccess,
              confidence: 0.6,
              reasoning: 'Strong performance on complex tasks'
            });
          }
        }
      });
    }
    
    // Remove duplicates and sort by score
    const unique = Array.from(new Map(recommendations.map(r => [r.agentId, r])).values());
    return unique.sort((a, b) => b.score - a.score).slice(0, 5);
  }
  
  /**
   * Update with user feedback
   */
  async updateWithFeedback(feedback) {
    const { requestId, userId, rating, comment, timestamp } = feedback;
    
    this.metrics.feedbackReceived++;
    
    // Store feedback
    this.feedbackData.set(requestId, {
      userId,
      rating,
      comment,
      timestamp
    });
    
    // Update user satisfaction in agent performance
    // This would need to be linked with the original interaction data
    
    // Update user patterns with feedback
    if (this.userPatterns.has(userId)) {
      const userPattern = this.userPatterns.get(userId);
      userPattern.feedbackHistory.push({
        rating,
        timestamp,
        sentiment: this.analyzeSentiment(comment)
      });
      
      // Adjust agent preferences based on feedback
      if (rating >= 4) {
        // Positive feedback - increase preference for agents used
        // (This would need the original interaction data)
      } else if (rating <= 2) {
        // Negative feedback - decrease preference
      }
    }
    
    // Trigger model update if significant feedback accumulated
    if (this.feedbackData.size % 100 === 0) {
      await this.updateModels();
    }
  }
  
  /**
   * Get agent performance score
   */
  getAgentPerformanceScore(agentId, taskType, userId = null) {
    const performance = this.agentPerformance.get(agentId);
    if (!performance) return 0.5; // Default neutral score
    
    let score = 0.5;
    
    if (taskType === 'overall') {
      // Overall performance
      score = performance.successfulTasks / Math.max(performance.totalTasks, 1);
    } else if (performance.taskTypes[taskType]) {
      // Task-specific performance
      const taskPerf = performance.taskTypes[taskType];
      score = taskPerf.successes / Math.max(taskPerf.count, 1);
    }
    
    // Adjust for user preference if provided
    if (userId && this.userPatterns.has(userId)) {
      const userPattern = this.userPatterns.get(userId);
      const preference = userPattern.preferredAgents[agentId] || 0;
      const totalInteractions = Object.values(userPattern.preferredAgents)
        .reduce((sum, count) => sum + count, 0);
      
      if (totalInteractions > 0) {
        const preferenceScore = preference / totalInteractions;
        score = score * 0.7 + preferenceScore * 0.3; // Blend performance and preference
      }
    }
    
    return Math.max(0, Math.min(1, score));
  }
  
  /**
   * Predict best agent for task
   */
  predictBestAgent(taskType, complexity, userProfile) {
    const candidates = [];
    
    this.agentPerformance.forEach((perf, agentId) => {
      let score = this.getAgentPerformanceScore(agentId, taskType, userProfile?.userId);
      
      // Adjust for complexity alignment
      if (complexity > 0.7 && perf.averageExecutionTime > 5000) {
        score *= 1.1; // Prefer agents that handle complex tasks
      } else if (complexity < 0.3 && perf.averageExecutionTime < 2000) {
        score *= 1.1; // Prefer fast agents for simple tasks
      }
      
      candidates.push({ agentId, score });
    });
    
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0] || { agentId: 'default', score: 0.5 };
  }
  
  /**
   * Classify task from content
   */
  classifyTask(content) {
    const classifications = [];
    const lowerContent = content.toLowerCase();
    
    // Simple keyword-based classification
    const taskKeywords = {
      'parse-email': ['email', 'parse', 'extract', 'message'],
      'build-itinerary': ['itinerary', 'travel', 'trip', 'plan'],
      'analyze-document': ['document', 'analyze', 'passport', 'scan'],
      'extract-tasks': ['task', 'todo', 'action', 'to-do'],
      'booking-search': ['flight', 'hotel', 'book', 'reservation']
    };
    
    for (const [taskType, keywords] of Object.entries(taskKeywords)) {
      const matches = keywords.filter(kw => lowerContent.includes(kw)).length;
      if (matches > 0) {
        classifications.push({
          type: taskType,
          confidence: matches / keywords.length
        });
      }
    }
    
    // Sort by confidence
    classifications.sort((a, b) => b.confidence - a.confidence);
    
    return classifications[0] || { type: 'general', confidence: 0.3 };
  }
  
  /**
   * Estimate task complexity
   */
  estimateComplexity(content, context) {
    let complexity = 0.3; // Base complexity
    
    // Length factor
    if (content.length > 200) complexity += 0.1;
    if (content.length > 500) complexity += 0.1;
    
    // Multiple requirements
    const requirementIndicators = ['and', 'also', 'then', 'after', 'plus'];
    const requirementCount = requirementIndicators.filter(ind => 
      content.toLowerCase().includes(ind)
    ).length;
    complexity += requirementCount * 0.1;
    
    // Context size
    if (context && context.relevantMemories?.length > 5) {
      complexity += 0.1;
    }
    
    // Technical terms
    const technicalTerms = ['api', 'integrate', 'synchronize', 'optimize', 'analyze'];
    const technicalCount = technicalTerms.filter(term => 
      content.toLowerCase().includes(term)
    ).length;
    complexity += technicalCount * 0.05;
    
    return Math.min(1.0, complexity);
  }
  
  /**
   * Calculate confidence score
   */
  calculateConfidence(performanceData) {
    if (!performanceData || performanceData.count < this.options.minDataPoints) {
      return 0.3; // Low confidence with insufficient data
    }
    
    const successRate = performanceData.successes / performanceData.count;
    const dataPointFactor = Math.min(performanceData.count / 100, 1); // More data = higher confidence
    
    return successRate * 0.7 + dataPointFactor * 0.3;
  }
  
  /**
   * Analyze sentiment from comment
   */
  analyzeSentiment(comment) {
    if (!comment) return 'neutral';
    
    const lower = comment.toLowerCase();
    const positive = ['great', 'excellent', 'perfect', 'awesome', 'helpful', 'thanks'];
    const negative = ['bad', 'poor', 'wrong', 'incorrect', 'useless', 'terrible'];
    
    const positiveCount = positive.filter(word => lower.includes(word)).length;
    const negativeCount = negative.filter(word => lower.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }
  
  /**
   * Update learning models
   */
  async updateModels() {
    console.log('🔄 Updating learning models...');
    
    // Calculate model accuracy based on feedback
    if (this.feedbackData.size > 0) {
      let correctPredictions = 0;
      let totalPredictions = 0;
      
      this.feedbackData.forEach((feedback) => {
        if (feedback.rating >= 4) correctPredictions++;
        totalPredictions++;
      });
      
      this.metrics.modelAccuracy = correctPredictions / totalPredictions;
    }
    
    // Update success rates
    this.taskPatterns.forEach((pattern, taskType) => {
      let totalSuccess = 0;
      let totalCount = 0;
      
      this.routingSuccess.forEach((routing, key) => {
        if (key.startsWith(taskType + ':')) {
          totalSuccess += routing.successes;
          totalCount += routing.attempts;
        }
      });
      
      if (totalCount > 0) {
        pattern.successRate = totalSuccess / totalCount;
      }
    });
    
    this.metrics.lastUpdate = new Date();
  }
  
  /**
   * Save learning data
   */
  async saveData() {
    try {
      // Save agent performance
      await fs.writeFile(
        path.join(this.options.dataPath, 'agent_performance.json'),
        JSON.stringify(Object.fromEntries(this.agentPerformance), null, 2)
      );
      
      // Save task patterns
      await fs.writeFile(
        path.join(this.options.dataPath, 'task_patterns.json'),
        JSON.stringify(Object.fromEntries(this.taskPatterns), null, 2)
      );
      
      // Save user patterns
      await fs.writeFile(
        path.join(this.options.dataPath, 'user_patterns.json'),
        JSON.stringify(Object.fromEntries(this.userPatterns), null, 2)
      );
      
      // Save routing success
      await fs.writeFile(
        path.join(this.options.dataPath, 'routing_success.json'),
        JSON.stringify(Object.fromEntries(this.routingSuccess), null, 2)
      );
      
      console.log('💾 Learning data saved successfully');
      
    } catch (error) {
      console.error('❌ Failed to save learning data:', error);
    }
  }
  
  /**
   * Clean old data
   */
  async cleanOldData() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.options.historyRetention);
    
    // Clean user patterns
    this.userPatterns.forEach((pattern) => {
      pattern.taskHistory = pattern.taskHistory.filter(task => 
        new Date(task.timestamp) > cutoffDate
      );
      pattern.feedbackHistory = pattern.feedbackHistory.filter(feedback => 
        new Date(feedback.timestamp) > cutoffDate
      );
    });
    
    // Clean old feedback
    const oldFeedback = [];
    this.feedbackData.forEach((feedback, requestId) => {
      if (new Date(feedback.timestamp) <= cutoffDate) {
        oldFeedback.push(requestId);
      }
    });
    
    oldFeedback.forEach(id => this.feedbackData.delete(id));
  }
  
  /**
   * Prune user history to keep it manageable
   */
  pruneUserHistory(userId) {
    const pattern = this.userPatterns.get(userId);
    if (!pattern) return;
    
    // Keep only last 1000 interactions
    if (pattern.taskHistory.length > 1000) {
      pattern.taskHistory = pattern.taskHistory.slice(-1000);
    }
    
    // Keep only last 100 feedback items
    if (pattern.feedbackHistory.length > 100) {
      pattern.feedbackHistory = pattern.feedbackHistory.slice(-100);
    }
  }
  
  /**
   * Check if file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Get learning metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      totalAgents: this.agentPerformance.size,
      totalTaskTypes: this.taskPatterns.size,
      totalUsers: this.userPatterns.size,
      totalRoutings: this.routingSuccess.size,
      averageSuccessRate: this.calculateAverageSuccessRate()
    };
  }
  
  /**
   * Calculate average success rate
   */
  calculateAverageSuccessRate() {
    if (this.routingSuccess.size === 0) return 0;
    
    let totalSuccess = 0;
    let totalAttempts = 0;
    
    this.routingSuccess.forEach(routing => {
      totalSuccess += routing.successes;
      totalAttempts += routing.attempts;
    });
    
    return totalAttempts > 0 ? totalSuccess / totalAttempts : 0;
  }
  
  /**
   * Get pattern insights
   */
  getPatternInsights() {
    const insights = {
      mostCommonTasks: [],
      bestPerformingAgents: [],
      complexityTrends: {},
      userPreferences: {}
    };
    
    // Most common tasks
    const taskFrequency = Array.from(this.taskPatterns.entries())
      .map(([type, pattern]) => ({
        type,
        count: pattern.totalOccurrences,
        successRate: pattern.successRate
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    insights.mostCommonTasks = taskFrequency;
    
    // Best performing agents
    const agentPerf = Array.from(this.agentPerformance.entries())
      .map(([id, perf]) => ({
        agentId: id,
        successRate: perf.successfulTasks / Math.max(perf.totalTasks, 1),
        totalTasks: perf.totalTasks
      }))
      .filter(a => a.totalTasks >= this.options.minDataPoints)
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 5);
    
    insights.bestPerformingAgents = agentPerf;
    
    return insights;
  }
  
  /**
   * Shutdown learning engine
   */
  async shutdown() {
    console.log('🛑 Shutting down Learning Engine...');
    
    // Stop periodic updates
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
    
    // Save final data
    await this.saveData();
    
    this.initialized = false;
    console.log('✅ Learning Engine shut down successfully');
  }
}

export default LearningEngine;