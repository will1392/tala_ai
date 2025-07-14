/**
 * Task Enricher Service
 * 
 * Adds context from previous emails, links documents, suggests templates,
 * estimates duration
 */

import TaskPriorityAnalyzer from './TaskPriorityAnalyzer.js';
import ClientSentimentAnalyzer from './ClientSentimentAnalyzer.js';
import DeadlineParser from './DeadlineParser.js';

class TaskEnricher {
  constructor(options = {}) {
    this.priorityAnalyzer = new TaskPriorityAnalyzer();
    this.sentimentAnalyzer = new ClientSentimentAnalyzer();
    this.deadlineParser = new DeadlineParser();
    
    // Task templates for common travel scenarios
    this.taskTemplates = {
      booking: {
        hotel: {
          title: 'Book hotel accommodation',
          steps: [
            'Research available hotels',
            'Compare prices and amenities',
            'Check availability for dates',
            'Present options to customer',
            'Process booking confirmation',
            'Send confirmation details'
          ],
          estimatedDuration: '30-60 minutes',
          requiredTools: ['booking_system', 'hotel_database'],
          documentation: ['booking_confirmation', 'customer_itinerary']
        },
        flight: {
          title: 'Book flight reservation',
          steps: [
            'Search available flights',
            'Compare routes and prices',
            'Check baggage policies',
            'Present options to customer',
            'Process flight booking',
            'Arrange seat selection',
            'Send e-tickets and itinerary'
          ],
          estimatedDuration: '45-75 minutes',
          requiredTools: ['gds_system', 'airline_websites'],
          documentation: ['e_tickets', 'booking_confirmation', 'itinerary']
        },
        car: {
          title: 'Arrange car rental',
          steps: [
            'Check rental availability',
            'Compare vehicle types and prices',
            'Verify driver requirements',
            'Process rental booking',
            'Arrange pickup details',
            'Send rental confirmation'
          ],
          estimatedDuration: '20-40 minutes',
          requiredTools: ['rental_system', 'vendor_portals'],
          documentation: ['rental_agreement', 'pickup_instructions']
        }
      },
      research: {
        destination: {
          title: 'Research destination information',
          steps: [
            'Gather destination overview',
            'Research attractions and activities',
            'Check weather and season info',
            'Review travel advisories',
            'Compile recommendations',
            'Present findings to customer'
          ],
          estimatedDuration: '45-90 minutes',
          requiredTools: ['destination_guides', 'travel_advisories'],
          documentation: ['destination_report', 'activity_recommendations']
        },
        pricing: {
          title: 'Research pricing and options',
          steps: [
            'Search multiple vendors',
            'Compare prices and features',
            'Check for discounts/promotions',
            'Analyze value propositions',
            'Create pricing comparison',
            'Present recommendations'
          ],
          estimatedDuration: '30-60 minutes',
          requiredTools: ['comparison_tools', 'vendor_systems'],
          documentation: ['price_comparison', 'recommendation_report']
        }
      },
      support: {
        change: {
          title: 'Process booking change',
          steps: [
            'Review current booking details',
            'Check change policies and fees',
            'Search new options',
            'Calculate price differences',
            'Process modification',
            'Send updated confirmation'
          ],
          estimatedDuration: '30-45 minutes',
          requiredTools: ['booking_system', 'vendor_portals'],
          documentation: ['change_confirmation', 'fee_breakdown']
        },
        cancellation: {
          title: 'Process booking cancellation',
          steps: [
            'Review cancellation policies',
            'Calculate refund amounts',
            'Process cancellation request',
            'Arrange refund processing',
            'Send cancellation confirmation',
            'Update customer records'
          ],
          estimatedDuration: '20-30 minutes',
          requiredTools: ['booking_system', 'payment_system'],
          documentation: ['cancellation_confirmation', 'refund_details']
        }
      }
    };

    // Duration estimation models
    this.durationModels = {
      complexity: {
        simple: { base: 15, variance: 10 },      // 5-25 minutes
        moderate: { base: 45, variance: 20 },    // 25-65 minutes
        complex: { base: 90, variance: 30 },     // 60-120 minutes
        very_complex: { base: 150, variance: 60 } // 90-210 minutes
      },
      customerType: {
        new: 1.3,        // 30% longer for new customers
        regular: 1.0,    // Standard time
        vip: 1.2,        // 20% longer for VIP attention
        corporate: 0.9   // 10% faster for corporate accounts
      },
      urgency: {
        critical: 0.8,   // Faster due to focus
        high: 0.9,
        medium: 1.0,
        low: 1.1         // May take longer due to lower priority
      }
    };

    // Context enrichment sources
    this.contextSources = options.contextSources || {};
  }

  /**
   * Enrich a task with additional context and recommendations
   * @param {Object} task - Base task object
   * @param {Object} email - Email context
   * @param {Array} threadHistory - Previous emails in thread
   * @param {Object} customerProfile - Customer information
   * @returns {Object} Enriched task
   */
  async enrichTask(task, email, threadHistory = [], customerProfile = {}) {
    const enrichedTask = { ...task };

    // Add priority analysis
    enrichedTask.priority = this.priorityAnalyzer.analyzePriority(task, email);

    // Add sentiment analysis
    enrichedTask.sentiment = this.sentimentAnalyzer.analyzeSentiment(email, threadHistory);

    // Add deadline analysis
    if (task.text) {
      const deadlineInfo = this.deadlineParser.parseDeadline(task.text, email.date);
      if (deadlineInfo) {
        enrichedTask.deadline = deadlineInfo;
      }
    }

    // Add task template suggestions
    enrichedTask.templates = this.suggestTemplates(task, email);

    // Estimate duration
    enrichedTask.estimatedDuration = this.estimateDuration(task, email, customerProfile);

    // Add context from thread history
    enrichedTask.threadContext = this.analyzeThreadContext(threadHistory, task);

    // Suggest required resources
    enrichedTask.requiredResources = this.identifyRequiredResources(task, email);

    // Link related documents
    enrichedTask.relatedDocuments = await this.findRelatedDocuments(task, email, customerProfile);

    // Generate next steps
    enrichedTask.nextSteps = this.generateNextSteps(task, email, enrichedTask.templates);

    // Identify potential blockers
    enrichedTask.potentialBlockers = this.identifyPotentialBlockers(task, email, customerProfile);

    // Suggest assignee
    enrichedTask.recommendedAssignee = this.suggestAssignee(task, enrichedTask);

    // Add customer insights
    enrichedTask.customerInsights = this.gatherCustomerInsights(customerProfile, threadHistory);

    // Generate follow-up actions
    enrichedTask.followUpActions = this.generateFollowUpActions(task, enrichedTask);

    return enrichedTask;
  }

  /**
   * Suggest relevant task templates
   * @private
   */
  suggestTemplates(task, email) {
    const suggestions = [];
    const taskText = (task.text || task.title || '').toLowerCase();
    const emailContent = (email.content || email.subject || '').toLowerCase();
    const combinedText = `${taskText} ${emailContent}`;

    // Match booking templates
    if (this.matchesPattern(combinedText, ['hotel', 'accommodation', 'stay', 'room'])) {
      suggestions.push({
        type: 'booking.hotel',
        template: this.taskTemplates.booking.hotel,
        confidence: 0.8
      });
    }

    if (this.matchesPattern(combinedText, ['flight', 'airline', 'fly', 'ticket'])) {
      suggestions.push({
        type: 'booking.flight',
        template: this.taskTemplates.booking.flight,
        confidence: 0.8
      });
    }

    if (this.matchesPattern(combinedText, ['car', 'rental', 'vehicle', 'drive'])) {
      suggestions.push({
        type: 'booking.car',
        template: this.taskTemplates.booking.car,
        confidence: 0.7
      });
    }

    // Match research templates
    if (this.matchesPattern(combinedText, ['research', 'information', 'options', 'recommendations'])) {
      if (this.matchesPattern(combinedText, ['destination', 'city', 'country', 'place'])) {
        suggestions.push({
          type: 'research.destination',
          template: this.taskTemplates.research.destination,
          confidence: 0.7
        });
      } else {
        suggestions.push({
          type: 'research.pricing',
          template: this.taskTemplates.research.pricing,
          confidence: 0.6
        });
      }
    }

    // Match support templates
    if (this.matchesPattern(combinedText, ['change', 'modify', 'update', 'reschedule'])) {
      suggestions.push({
        type: 'support.change',
        template: this.taskTemplates.support.change,
        confidence: 0.8
      });
    }

    if (this.matchesPattern(combinedText, ['cancel', 'refund', 'cancel booking'])) {
      suggestions.push({
        type: 'support.cancellation',
        template: this.taskTemplates.support.cancellation,
        confidence: 0.9
      });
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Check if text matches any of the patterns
   * @private
   */
  matchesPattern(text, patterns) {
    return patterns.some(pattern => text.includes(pattern));
  }

  /**
   * Estimate task duration
   * @private
   */
  estimateDuration(task, email, customerProfile) {
    let complexity = this.assessComplexity(task, email);
    let baseModel = this.durationModels.complexity[complexity];
    
    let baseDuration = baseModel.base;
    let variance = baseModel.variance;

    // Apply customer type multiplier
    const customerType = customerProfile.type || 'regular';
    const customerMultiplier = this.durationModels.customerType[customerType] || 1.0;
    baseDuration *= customerMultiplier;

    // Apply urgency multiplier
    const urgency = task.urgency || 'medium';
    const urgencyMultiplier = this.durationModels.urgency[urgency] || 1.0;
    baseDuration *= urgencyMultiplier;

    // Calculate range
    const minDuration = Math.max(5, baseDuration - variance);
    const maxDuration = baseDuration + variance;

    return {
      estimated: Math.round(baseDuration),
      range: {
        min: Math.round(minDuration),
        max: Math.round(maxDuration)
      },
      factors: {
        complexity,
        customerType,
        urgency,
        adjustments: {
          customer: customerMultiplier,
          urgency: urgencyMultiplier
        }
      },
      confidence: this.calculateDurationConfidence(task, email)
    };
  }

  /**
   * Assess task complexity
   * @private
   */
  assessComplexity(task, email) {
    const taskText = (task.text || task.title || '').toLowerCase();
    const emailContent = (email.content || email.subject || '').toLowerCase();
    const combinedText = `${taskText} ${emailContent}`;

    let complexityScore = 0;

    // Multiple destinations/dates
    if (this.countMatches(combinedText, /\b(to|from|in)\s+\w+/g) > 2) complexityScore += 2;
    
    // Group bookings
    if (this.matchesPattern(combinedText, ['group', 'multiple', 'family', 'team'])) complexityScore += 2;
    
    // Multiple services
    const services = ['hotel', 'flight', 'car', 'activity', 'tour', 'insurance'];
    const serviceCount = services.filter(service => combinedText.includes(service)).length;
    complexityScore += serviceCount;

    // Special requirements
    if (this.matchesPattern(combinedText, ['special', 'dietary', 'accessibility', 'custom'])) complexityScore += 1;
    
    // International travel
    if (this.matchesPattern(combinedText, ['visa', 'passport', 'international', 'overseas'])) complexityScore += 1;

    // Urgency adds complexity
    if (this.matchesPattern(combinedText, ['urgent', 'asap', 'emergency', 'immediately'])) complexityScore += 1;

    if (complexityScore >= 6) return 'very_complex';
    if (complexityScore >= 4) return 'complex';
    if (complexityScore >= 2) return 'moderate';
    return 'simple';
  }

  /**
   * Count regex matches in text
   * @private
   */
  countMatches(text, regex) {
    const matches = text.match(regex);
    return matches ? matches.length : 0;
  }

  /**
   * Calculate duration estimation confidence
   * @private
   */
  calculateDurationConfidence(task, email) {
    let confidence = 0.5;

    // More specific task descriptions increase confidence
    const taskLength = (task.text || task.title || '').length;
    if (taskLength > 50) confidence += 0.1;
    if (taskLength > 100) confidence += 0.1;

    // Known task types increase confidence
    if (task.type && ['booking', 'research', 'communication'].includes(task.type)) {
      confidence += 0.2;
    }

    // Clear deadlines increase confidence
    if (task.deadline) confidence += 0.1;

    return Math.min(0.9, confidence);
  }

  /**
   * Analyze thread context for task insights
   * @private
   */
  analyzeThreadContext(threadHistory, task) {
    if (!threadHistory || threadHistory.length === 0) {
      return { hasHistory: false };
    }

    const context = {
      hasHistory: true,
      emailCount: threadHistory.length,
      timeSpan: this.calculateTimeSpan(threadHistory),
      topicEvolution: this.analyzeTopicEvolution(threadHistory),
      sentimentTrend: this.analyzeSentimentTrend(threadHistory),
      previousTasks: this.extractPreviousTasksFromThread(threadHistory),
      unresolved: this.identifyUnresolvedIssues(threadHistory)
    };

    return context;
  }

  /**
   * Calculate time span of email thread
   * @private
   */
  calculateTimeSpan(threadHistory) {
    if (threadHistory.length < 2) return null;

    const dates = threadHistory
      .map(email => new Date(email.date))
      .sort((a, b) => a - b);

    const spanMs = dates[dates.length - 1] - dates[0];
    const spanDays = Math.ceil(spanMs / (1000 * 60 * 60 * 24));

    return {
      days: spanDays,
      firstEmail: dates[0],
      lastEmail: dates[dates.length - 1]
    };
  }

  /**
   * Analyze how the conversation topic has evolved
   * @private
   */
  analyzeTopicEvolution(threadHistory) {
    // Simple topic extraction based on keywords
    const topics = threadHistory.map(email => {
      const content = `${email.subject} ${email.content}`.toLowerCase();
      const topicKeywords = this.extractTopicKeywords(content);
      return {
        date: email.date,
        keywords: topicKeywords
      };
    });

    return {
      topics,
      hasEvolved: this.detectTopicShift(topics)
    };
  }

  /**
   * Extract topic keywords from email content
   * @private
   */
  extractTopicKeywords(content) {
    const travelKeywords = [
      'hotel', 'flight', 'car', 'rental', 'booking', 'reservation',
      'travel', 'trip', 'vacation', 'business', 'tour', 'activity',
      'visa', 'passport', 'insurance', 'refund', 'change', 'cancel'
    ];

    return travelKeywords.filter(keyword => content.includes(keyword));
  }

  /**
   * Detect if topic has shifted in conversation
   * @private
   */
  detectTopicShift(topics) {
    if (topics.length < 2) return false;

    const firstTopics = new Set(topics[0].keywords);
    const lastTopics = new Set(topics[topics.length - 1].keywords);

    const overlap = [...firstTopics].filter(k => lastTopics.has(k));
    const overlapRatio = overlap.length / Math.max(firstTopics.size, lastTopics.size);

    return overlapRatio < 0.5; // Topic shift if less than 50% overlap
  }

  /**
   * Analyze sentiment trend across email thread
   * @private
   */
  analyzeSentimentTrend(threadHistory) {
    const sentiments = threadHistory.map(email => {
      const analysis = this.sentimentAnalyzer.analyzeSentiment(email);
      return {
        date: email.date,
        sentiment: analysis.overallSentiment,
        level: analysis.sentimentLevel
      };
    });

    let trend = 'stable';
    if (sentiments.length > 1) {
      const first = sentiments[0].sentiment;
      const last = sentiments[sentiments.length - 1].sentiment;
      const change = last - first;

      if (change > 0.3) trend = 'improving';
      else if (change < -0.3) trend = 'deteriorating';
    }

    return { sentiments, trend };
  }

  /**
   * Extract previous tasks mentioned in thread
   * @private
   */
  extractPreviousTasksFromThread(threadHistory) {
    // Simple task extraction from previous emails
    const taskKeywords = ['book', 'reserve', 'find', 'search', 'check', 'confirm'];
    const tasks = [];

    threadHistory.forEach(email => {
      const content = email.content.toLowerCase();
      taskKeywords.forEach(keyword => {
        if (content.includes(keyword)) {
          // Extract sentence containing the keyword
          const sentences = email.content.split(/[.!?]+/);
          const relevantSentences = sentences.filter(s => 
            s.toLowerCase().includes(keyword)
          );
          
          relevantSentences.forEach(sentence => {
            tasks.push({
              mention: sentence.trim(),
              email: email.id,
              date: email.date
            });
          });
        }
      });
    });

    return tasks;
  }

  /**
   * Identify unresolved issues from thread
   * @private
   */
  identifyUnresolvedIssues(threadHistory) {
    const issues = [];
    const problemKeywords = ['problem', 'issue', 'error', 'wrong', 'incorrect', 'failed'];
    const resolutionKeywords = ['resolved', 'fixed', 'solved', 'completed', 'done'];

    threadHistory.forEach(email => {
      const content = email.content.toLowerCase();
      
      // Check for problems
      const hasProblems = problemKeywords.some(keyword => content.includes(keyword));
      const hasResolution = resolutionKeywords.some(keyword => content.includes(keyword));

      if (hasProblems && !hasResolution) {
        issues.push({
          email: email.id,
          date: email.date,
          summary: this.extractProblemSummary(email.content)
        });
      }
    });

    return issues;
  }

  /**
   * Extract problem summary from email content
   * @private
   */
  extractProblemSummary(content) {
    // Find sentences containing problem keywords
    const sentences = content.split(/[.!?]+/);
    const problemKeywords = ['problem', 'issue', 'error', 'wrong', 'incorrect', 'failed'];
    
    const problemSentences = sentences.filter(sentence => 
      problemKeywords.some(keyword => sentence.toLowerCase().includes(keyword))
    );

    return problemSentences.length > 0 ? problemSentences[0].trim() : 'Unspecified issue';
  }

  /**
   * Identify required resources for task
   * @private
   */
  identifyRequiredResources(task, email) {
    const resources = {
      systems: [],
      tools: [],
      access: [],
      knowledge: []
    };

    const taskText = (task.text || task.title || '').toLowerCase();
    const emailContent = (email.content || email.subject || '').toLowerCase();
    const combinedText = `${taskText} ${emailContent}`;

    // System requirements
    if (this.matchesPattern(combinedText, ['hotel', 'accommodation'])) {
      resources.systems.push('hotel_booking_system', 'property_management_system');
    }
    if (this.matchesPattern(combinedText, ['flight', 'airline'])) {
      resources.systems.push('gds_system', 'airline_websites');
    }
    if (this.matchesPattern(combinedText, ['car', 'rental'])) {
      resources.systems.push('car_rental_system');
    }

    // Tool requirements
    if (this.matchesPattern(combinedText, ['compare', 'research', 'options'])) {
      resources.tools.push('comparison_tools', 'pricing_engines');
    }
    if (this.matchesPattern(combinedText, ['international', 'visa'])) {
      resources.tools.push('visa_requirements_database');
    }

    // Access requirements
    if (this.matchesPattern(combinedText, ['corporate', 'business'])) {
      resources.access.push('corporate_rates', 'business_travel_tools');
    }
    if (this.matchesPattern(combinedText, ['group', 'multiple'])) {
      resources.access.push('group_booking_tools');
    }

    // Knowledge requirements
    if (this.matchesPattern(combinedText, ['destination', 'local'])) {
      resources.knowledge.push('destination_expertise');
    }
    if (this.matchesPattern(combinedText, ['luxury', 'premium'])) {
      resources.knowledge.push('luxury_travel_expertise');
    }

    return resources;
  }

  /**
   * Find related documents
   * @private
   */
  async findRelatedDocuments(task, email, customerProfile) {
    // This would integrate with document management system
    // For now, return structured placeholders
    
    const documents = {
      customerFiles: [],
      templates: [],
      policies: [],
      references: []
    };

    // Customer-specific documents
    if (customerProfile.customerId) {
      documents.customerFiles = [
        {
          type: 'customer_profile',
          name: `Customer Profile - ${customerProfile.name}`,
          id: `profile_${customerProfile.customerId}`,
          relevant: true
        },
        {
          type: 'booking_history',
          name: 'Previous Bookings',
          id: `history_${customerProfile.customerId}`,
          relevant: true
        }
      ];
    }

    // Task-relevant templates
    const taskType = task.type || 'general';
    documents.templates = [
      {
        type: 'email_template',
        name: `${taskType}_response_template`,
        relevant: true
      },
      {
        type: 'process_template',
        name: `${taskType}_workflow`,
        relevant: true
      }
    ];

    return documents;
  }

  /**
   * Generate next steps for task
   * @private
   */
  generateNextSteps(task, email, templates) {
    const steps = [];

    // Use template steps if available
    if (templates && templates.length > 0) {
      const bestTemplate = templates[0];
      return bestTemplate.template.steps.map((step, index) => ({
        order: index + 1,
        action: step,
        estimated: '5-15 minutes',
        type: 'template'
      }));
    }

    // Generate generic steps based on task content
    const taskText = (task.text || task.title || '').toLowerCase();
    
    if (this.matchesPattern(taskText, ['research', 'find', 'search'])) {
      steps.push(
        { order: 1, action: 'Gather initial requirements', estimated: '5 minutes', type: 'preparation' },
        { order: 2, action: 'Search available options', estimated: '15-30 minutes', type: 'research' },
        { order: 3, action: 'Compare and analyze results', estimated: '10-20 minutes', type: 'analysis' },
        { order: 4, action: 'Present recommendations', estimated: '10 minutes', type: 'communication' }
      );
    } else if (this.matchesPattern(taskText, ['book', 'reserve'])) {
      steps.push(
        { order: 1, action: 'Verify customer requirements', estimated: '5 minutes', type: 'verification' },
        { order: 2, action: 'Check availability and pricing', estimated: '10-15 minutes', type: 'research' },
        { order: 3, action: 'Process booking', estimated: '10-20 minutes', type: 'booking' },
        { order: 4, action: 'Send confirmation', estimated: '5 minutes', type: 'communication' }
      );
    } else {
      steps.push(
        { order: 1, action: 'Review task requirements', estimated: '5 minutes', type: 'preparation' },
        { order: 2, action: 'Execute primary action', estimated: '15-30 minutes', type: 'execution' },
        { order: 3, action: 'Verify completion', estimated: '5 minutes', type: 'verification' },
        { order: 4, action: 'Follow up with customer', estimated: '5 minutes', type: 'communication' }
      );
    }

    return steps;
  }

  /**
   * Identify potential blockers
   * @private
   */
  identifyPotentialBlockers(task, email, customerProfile) {
    const blockers = [];
    const taskText = (task.text || task.title || '').toLowerCase();
    const emailContent = (email.content || email.subject || '').toLowerCase();

    // Time-based blockers
    if (task.deadline) {
      const deadline = new Date(task.deadline);
      const now = new Date();
      const hoursUntil = (deadline - now) / (1000 * 60 * 60);
      
      if (hoursUntil < 4) {
        blockers.push({
          type: 'time_constraint',
          severity: 'high',
          description: 'Very tight deadline may limit options',
          impact: 'May need to use premium/express services'
        });
      }
    }

    // Availability blockers
    if (this.matchesPattern(taskText, ['holiday', 'peak season', 'festival'])) {
      blockers.push({
        type: 'high_demand_period',
        severity: 'medium',
        description: 'High demand period may limit availability',
        impact: 'Higher prices and limited options expected'
      });
    }

    // Budget constraints
    if (this.matchesPattern(emailContent, ['budget', 'cheap', 'affordable', 'low cost'])) {
      blockers.push({
        type: 'budget_constraint',
        severity: 'medium',
        description: 'Budget limitations may restrict options',
        impact: 'May need to find creative solutions or alternatives'
      });
    }

    // Documentation requirements
    if (this.matchesPattern(taskText, ['international', 'visa', 'passport'])) {
      blockers.push({
        type: 'documentation_required',
        severity: 'medium',
        description: 'May require additional documentation or processing time',
        impact: 'Could delay booking if documents not ready'
      });
    }

    // Group booking complexity
    if (this.matchesPattern(taskText, ['group', 'multiple', 'family'])) {
      blockers.push({
        type: 'group_complexity',
        severity: 'low',
        description: 'Coordinating group requirements may be complex',
        impact: 'Additional time needed for coordination'
      });
    }

    return blockers;
  }

  /**
   * Suggest task assignee based on requirements
   * @private
   */
  suggestAssignee(task, enrichedTask) {
    const suggestions = [];

    // Priority-based assignment
    if (enrichedTask.priority?.level === 'critical') {
      suggestions.push({
        role: 'senior_agent',
        reason: 'Critical priority requires experienced agent',
        confidence: 0.9
      });
    }

    // Complexity-based assignment
    const complexity = enrichedTask.estimatedDuration?.factors?.complexity;
    if (complexity === 'very_complex') {
      suggestions.push({
        role: 'specialist',
        reason: 'Complex task requires specialist knowledge',
        confidence: 0.8
      });
    } else if (complexity === 'complex') {
      suggestions.push({
        role: 'senior_agent',
        reason: 'Complex task requires experienced agent',
        confidence: 0.7
      });
    }

    // Task type-based assignment
    const taskType = task.type;
    if (taskType === 'booking') {
      suggestions.push({
        role: 'booking_specialist',
        reason: 'Booking tasks require reservation system expertise',
        confidence: 0.7
      });
    } else if (taskType === 'research') {
      suggestions.push({
        role: 'research_specialist',
        reason: 'Research tasks require destination knowledge',
        confidence: 0.6
      });
    }

    // Default assignment
    if (suggestions.length === 0) {
      suggestions.push({
        role: 'general_agent',
        reason: 'Standard task suitable for general agent',
        confidence: 0.5
      });
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence)[0];
  }

  /**
   * Gather customer insights
   * @private
   */
  gatherCustomerInsights(customerProfile, threadHistory) {
    const insights = {
      communicationStyle: 'unknown',
      preferences: [],
      concerns: [],
      loyaltyLevel: 'unknown',
      responseExpectation: 'standard'
    };

    // Analyze communication style from thread
    if (threadHistory.length > 0) {
      const recentEmails = threadHistory.slice(-3);
      const avgLength = recentEmails.reduce((sum, email) => 
        sum + (email.content?.length || 0), 0) / recentEmails.length;

      if (avgLength > 500) {
        insights.communicationStyle = 'detailed';
      } else if (avgLength < 100) {
        insights.communicationStyle = 'brief';
      } else {
        insights.communicationStyle = 'moderate';
      }
    }

    // Extract preferences from customer profile
    if (customerProfile.preferences) {
      insights.preferences = customerProfile.preferences;
    }

    // Set loyalty level
    if (customerProfile.bookingCount > 10) {
      insights.loyaltyLevel = 'high';
    } else if (customerProfile.bookingCount > 3) {
      insights.loyaltyLevel = 'medium';
    } else {
      insights.loyaltyLevel = 'low';
    }

    return insights;
  }

  /**
   * Generate follow-up actions
   * @private
   */
  generateFollowUpActions(task, enrichedTask) {
    const actions = [];

    // Priority-based follow-ups
    if (enrichedTask.priority?.level === 'critical' || enrichedTask.priority?.level === 'high') {
      actions.push({
        type: 'immediate_confirmation',
        timing: 'within 1 hour',
        action: 'Send immediate acknowledgment and timeline',
        required: true
      });
    }

    // Deadline-based follow-ups
    if (enrichedTask.deadline) {
      actions.push({
        type: 'deadline_reminder',
        timing: '2 hours before deadline',
        action: 'Remind customer of approaching deadline',
        required: false
      });
    }

    // Sentiment-based follow-ups
    if (enrichedTask.sentiment?.sentimentLevel?.includes('negative')) {
      actions.push({
        type: 'satisfaction_check',
        timing: 'after resolution',
        action: 'Follow up to ensure customer satisfaction',
        required: true
      });
    }

    // Template-based follow-ups
    if (enrichedTask.templates && enrichedTask.templates.length > 0) {
      const template = enrichedTask.templates[0].template;
      if (template.documentation) {
        actions.push({
          type: 'documentation_delivery',
          timing: 'after completion',
          action: `Deliver ${template.documentation.join(', ')}`,
          required: true
        });
      }
    }

    // Default follow-up
    actions.push({
      type: 'completion_confirmation',
      timing: 'after task completion',
      action: 'Confirm task completion with customer',
      required: true
    });

    return actions;
  }

  /**
   * Batch enrich multiple tasks
   * @param {Array} tasks - Array of tasks to enrich
   * @param {Object} context - Shared context (email, customer profile, etc.)
   * @returns {Array} Array of enriched tasks
   */
  async batchEnrichTasks(tasks, context = {}) {
    const { email, threadHistory = [], customerProfile = {} } = context;

    const enrichedTasks = await Promise.all(
      tasks.map(task => this.enrichTask(task, email, threadHistory, customerProfile))
    );

    // Add cross-task analysis
    this.addCrossTaskInsights(enrichedTasks);

    return enrichedTasks;
  }

  /**
   * Add insights that span multiple tasks
   * @private
   */
  addCrossTaskInsights(tasks) {
    // Identify task dependencies
    for (let i = 0; i < tasks.length; i++) {
      for (let j = i + 1; j < tasks.length; j++) {
        const dependency = this.detectTaskDependency(tasks[i], tasks[j]);
        if (dependency) {
          if (!tasks[i].dependencies) tasks[i].dependencies = [];
          if (!tasks[j].dependencies) tasks[j].dependencies = [];
          
          tasks[i].dependencies.push({
            taskIndex: j,
            type: dependency.type,
            reason: dependency.reason
          });
        }
      }
    }

    // Calculate overall workload
    const totalEstimatedTime = tasks.reduce((sum, task) => 
      sum + (task.estimatedDuration?.estimated || 30), 0);

    tasks.forEach(task => {
      task.workloadContext = {
        totalTasks: tasks.length,
        totalEstimatedTime,
        isPartOfBatch: true
      };
    });
  }

  /**
   * Detect dependency between two tasks
   * @private
   */
  detectTaskDependency(task1, task2) {
    const text1 = (task1.text || task1.title || '').toLowerCase();
    const text2 = (task2.text || task2.title || '').toLowerCase();

    // Flight before hotel
    if (text1.includes('flight') && text2.includes('hotel')) {
      return {
        type: 'sequence',
        reason: 'Flight details needed for hotel booking timing'
      };
    }

    // Research before booking
    if (text1.includes('research') && text2.includes('book')) {
      return {
        type: 'sequence',
        reason: 'Research needed before making booking'
      };
    }

    // Same location dependency
    const locations1 = this.extractLocations(text1);
    const locations2 = this.extractLocations(text2);
    const sharedLocations = locations1.filter(loc => locations2.includes(loc));
    
    if (sharedLocations.length > 0) {
      return {
        type: 'location',
        reason: `Both tasks involve ${sharedLocations.join(', ')}`
      };
    }

    return null;
  }

  /**
   * Extract location mentions from text
   * @private
   */
  extractLocations(text) {
    // Simple location extraction - in practice, use NER
    const commonLocations = [
      'paris', 'london', 'tokyo', 'new york', 'rome', 'madrid',
      'berlin', 'amsterdam', 'barcelona', 'dubai', 'singapore'
    ];

    return commonLocations.filter(location => text.includes(location));
  }
}

export default TaskEnricher;