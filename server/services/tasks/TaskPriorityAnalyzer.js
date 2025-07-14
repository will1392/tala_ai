/**
 * Task Priority Analyzer Service
 * 
 * Scores task urgency (0-10), considers sender importance, analyzes sentiment, 
 * detects urgency keywords
 */

class TaskPriorityAnalyzer {
  constructor() {
    // Urgency keywords with weights
    this.urgencyKeywords = {
      critical: {
        weight: 10,
        keywords: [
          'critical', 'emergency', 'urgent', 'asap', 'immediately',
          'crisis', 'breaking', 'urgent attention', 'time sensitive',
          'deadline missed', 'overdue', 'escalation'
        ]
      },
      high: {
        weight: 8,
        keywords: [
          'important', 'priority', 'high priority', 'please rush',
          'needed today', 'by end of day', 'eod', 'by close of business',
          'cob', 'time-sensitive', 'deadline', 'due today'
        ]
      },
      medium: {
        weight: 6,
        keywords: [
          'soon', 'when possible', 'this week', 'by friday',
          'by end of week', 'follow up', 'reminder', 'check on',
          'update on', 'status update'
        ]
      },
      low: {
        weight: 3,
        keywords: [
          'when you can', 'no rush', 'whenever', 'at your convenience',
          'when you have time', 'low priority', 'fyi', 'for your information'
        ]
      }
    };

    // Sender importance indicators
    this.senderImportanceIndicators = {
      vip: {
        weight: 9,
        domains: ['ceo@', 'president@', 'director@', 'vp@', 'manager@'],
        titles: ['ceo', 'president', 'director', 'vice president', 'manager', 'head of'],
        emails: [] // Can be configured with specific VIP emails
      },
      important: {
        weight: 7,
        domains: ['company.com', 'client.com', 'customer.com'],
        titles: ['lead', 'senior', 'principal', 'supervisor'],
        emails: []
      },
      external: {
        weight: 5,
        domains: ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com']
      },
      internal: {
        weight: 4,
        domains: [] // Will be set based on company domain
      }
    };

    // Time-based priority multipliers
    this.timeMultipliers = {
      workingHours: 1.0,    // 9 AM - 5 PM
      afterHours: 1.3,      // 5 PM - 9 PM
      lateNight: 1.5,       // 9 PM - 6 AM
      weekend: 1.4,         // Saturday/Sunday
      holiday: 1.6          // Holidays
    };

    // Email type priority weights
    this.emailTypePriority = {
      meeting_invite: 8,
      inquiry: 7,
      booking_confirmation: 6,
      flight_ticket: 6,
      receipt: 4,
      newsletter: 2,
      general: 5
    };

    // Task type priority weights
    this.taskTypePriority = {
      booking: 8,
      research: 6,
      communication: 7,
      documentation: 5,
      coordination: 7,
      general: 5
    };

    // Business days for deadline calculations
    this.businessDays = [1, 2, 3, 4, 5]; // Monday to Friday
  }

  /**
   * Analyze task priority
   * @param {Object} task - Task object
   * @param {Object} email - Email context
   * @param {Object} options - Analysis options
   * @returns {Object} Priority analysis
   */
  analyzePriority(task, email, options = {}) {
    const analysis = {
      score: 0,
      level: 'medium',
      factors: [],
      confidence: 0.7,
      reasoning: []
    };

    // Base score from task content
    const contentScore = this.analyzeTaskContent(task.text || task.title || '');
    analysis.score += contentScore.score;
    analysis.factors.push(...contentScore.factors);
    analysis.reasoning.push(...contentScore.reasoning);

    // Email context scoring
    if (email) {
      const emailScore = this.analyzeEmailContext(email);
      analysis.score += emailScore.score;
      analysis.factors.push(...emailScore.factors);
      analysis.reasoning.push(...emailScore.reasoning);

      // Sender importance
      const senderScore = this.analyzeSenderImportance(email.from);
      analysis.score += senderScore.score;
      analysis.factors.push(...senderScore.factors);
      analysis.reasoning.push(...senderScore.reasoning);

      // Time context
      const timeScore = this.analyzeTimeContext(email.date);
      analysis.score *= timeScore.multiplier;
      analysis.factors.push(...timeScore.factors);
      analysis.reasoning.push(...timeScore.reasoning);
    }

    // Task type priority
    if (task.taskType) {
      const typeScore = this.analyzeTaskType(task.taskType);
      analysis.score += typeScore.score;
      analysis.factors.push(...typeScore.factors);
      analysis.reasoning.push(...typeScore.reasoning);
    }

    // Deadline urgency
    if (task.deadline) {
      const deadlineScore = this.analyzeDeadlineUrgency(task.deadline);
      analysis.score += deadlineScore.score;
      analysis.factors.push(...deadlineScore.factors);
      analysis.reasoning.push(...deadlineScore.reasoning);
    }

    // Normalize score to 0-10 range
    analysis.score = Math.min(10, Math.max(0, analysis.score));

    // Determine priority level
    analysis.level = this.scoreToPriorityLevel(analysis.score);

    // Calculate confidence
    analysis.confidence = this.calculateConfidence(analysis.factors);

    return analysis;
  }

  /**
   * Analyze task content for urgency keywords
   * @private
   */
  analyzeTaskContent(content) {
    const result = {
      score: 0,
      factors: [],
      reasoning: []
    };

    const contentLower = content.toLowerCase();

    // Check for urgency keywords
    for (const [level, config] of Object.entries(this.urgencyKeywords)) {
      const foundKeywords = config.keywords.filter(keyword => 
        contentLower.includes(keyword.toLowerCase())
      );

      if (foundKeywords.length > 0) {
        const score = (config.weight * foundKeywords.length) / 3; // Normalize by dividing by 3
        result.score += score;
        result.factors.push({
          type: 'urgency_keywords',
          level,
          keywords: foundKeywords,
          score,
          weight: config.weight
        });
        result.reasoning.push(
          `Found ${level} urgency keywords: ${foundKeywords.join(', ')}`
        );
      }
    }

    // Check for question marks (indicate inquiry/request)
    const questionMarks = (content.match(/\?/g) || []).length;
    if (questionMarks > 0) {
      const score = Math.min(2, questionMarks * 0.5);
      result.score += score;
      result.factors.push({
        type: 'inquiry_indicators',
        count: questionMarks,
        score
      });
      result.reasoning.push(`Contains ${questionMarks} question(s), indicating inquiry`);
    }

    // Check for exclamation marks (indicate emphasis)
    const exclamationMarks = (content.match(/!/g) || []).length;
    if (exclamationMarks > 0) {
      const score = Math.min(1.5, exclamationMarks * 0.3);
      result.score += score;
      result.factors.push({
        type: 'emphasis_indicators',
        count: exclamationMarks,
        score
      });
      result.reasoning.push(`Contains ${exclamationMarks} exclamation(s), indicating emphasis`);
    }

    // Check for capital letters (SHOUTING)
    const capsWords = content.match(/\b[A-Z]{2,}\b/g) || [];
    if (capsWords.length > 0) {
      const score = Math.min(2, capsWords.length * 0.4);
      result.score += score;
      result.factors.push({
        type: 'caps_emphasis',
        words: capsWords,
        score
      });
      result.reasoning.push(`Contains ${capsWords.length} capitalized words indicating emphasis`);
    }

    return result;
  }

  /**
   * Analyze email context
   * @private
   */
  analyzeEmailContext(email) {
    const result = {
      score: 0,
      factors: [],
      reasoning: []
    };

    // Check subject line for urgency
    if (email.subject) {
      const subjectAnalysis = this.analyzeTaskContent(email.subject);
      result.score += subjectAnalysis.score * 1.2; // Subject line gets 20% boost
      result.factors.push(...subjectAnalysis.factors.map(f => ({
        ...f,
        source: 'subject_line'
      })));
      result.reasoning.push(...subjectAnalysis.reasoning.map(r => 
        `Subject: ${r}`
      ));
    }

    // Email type priority
    if (email.emailType) {
      const typePriority = this.emailTypePriority[email.emailType] || 5;
      const score = (typePriority - 5) * 0.5; // Convert to -2.5 to 2.5 range
      result.score += score;
      result.factors.push({
        type: 'email_type',
        emailType: email.emailType,
        priority: typePriority,
        score
      });
      result.reasoning.push(`Email type '${email.emailType}' has priority ${typePriority}`);
    }

    // Check for attachments
    if (email.hasAttachments || (email.attachments && email.attachments.length > 0)) {
      const score = 1;
      result.score += score;
      result.factors.push({
        type: 'has_attachments',
        score
      });
      result.reasoning.push('Email has attachments, likely contains important information');
    }

    // Check if email is unread
    if (email.isUnread) {
      const score = 0.5;
      result.score += score;
      result.factors.push({
        type: 'unread_email',
        score
      });
      result.reasoning.push('Email is unread, may require immediate attention');
    }

    return result;
  }

  /**
   * Analyze sender importance
   * @private
   */
  analyzeSenderImportance(sender) {
    const result = {
      score: 0,
      factors: [],
      reasoning: []
    };

    if (!sender || !sender.email) return result;

    const senderEmail = sender.email.toLowerCase();
    const senderName = (sender.name || '').toLowerCase();

    // Check for VIP indicators
    for (const [level, config] of Object.entries(this.senderImportanceIndicators)) {
      let isMatch = false;
      let matchReason = '';

      // Check domains
      if (config.domains) {
        for (const domain of config.domains) {
          if (senderEmail.includes(domain)) {
            isMatch = true;
            matchReason = `sender domain '${domain}'`;
            break;
          }
        }
      }

      // Check titles in name
      if (!isMatch && config.titles) {
        for (const title of config.titles) {
          if (senderName.includes(title)) {
            isMatch = true;
            matchReason = `sender title '${title}'`;
            break;
          }
        }
      }

      // Check specific emails
      if (!isMatch && config.emails) {
        for (const email of config.emails) {
          if (senderEmail === email.toLowerCase()) {
            isMatch = true;
            matchReason = 'specific VIP email';
            break;
          }
        }
      }

      if (isMatch) {
        const score = (config.weight - 5) * 0.4; // Convert to score adjustment
        result.score += score;
        result.factors.push({
          type: 'sender_importance',
          level,
          weight: config.weight,
          reason: matchReason,
          score
        });
        result.reasoning.push(`Sender classified as '${level}' based on ${matchReason}`);
        break; // Use highest level match only
      }
    }

    return result;
  }

  /**
   * Analyze time context
   * @private
   */
  analyzeTimeContext(emailDate) {
    const result = {
      multiplier: 1.0,
      factors: [],
      reasoning: []
    };

    if (!emailDate) return result;

    const date = new Date(emailDate);
    const now = new Date();
    const hour = date.getHours();
    const day = date.getDay(); // 0 = Sunday, 6 = Saturday

    // Check if it's weekend
    if (day === 0 || day === 6) {
      result.multiplier = this.timeMultipliers.weekend;
      result.factors.push({
        type: 'weekend_email',
        multiplier: result.multiplier
      });
      result.reasoning.push('Email sent during weekend, may indicate urgency');
    }
    // Check time of day
    else if (hour >= 21 || hour < 6) {
      result.multiplier = this.timeMultipliers.lateNight;
      result.factors.push({
        type: 'late_night_email',
        hour,
        multiplier: result.multiplier
      });
      result.reasoning.push(`Email sent at ${hour}:xx (late night), may indicate urgency`);
    } else if (hour >= 17 && hour < 21) {
      result.multiplier = this.timeMultipliers.afterHours;
      result.factors.push({
        type: 'after_hours_email',
        hour,
        multiplier: result.multiplier
      });
      result.reasoning.push(`Email sent at ${hour}:xx (after hours), may indicate urgency`);
    }

    // Check how recent the email is
    const hoursAgo = (now - date) / (1000 * 60 * 60);
    if (hoursAgo < 1) {
      const recentMultiplier = 1.2;
      result.multiplier *= recentMultiplier;
      result.factors.push({
        type: 'recent_email',
        hoursAgo,
        multiplier: recentMultiplier
      });
      result.reasoning.push('Email received very recently, may require immediate attention');
    }

    return result;
  }

  /**
   * Analyze task type priority
   * @private
   */
  analyzeTaskType(taskType) {
    const result = {
      score: 0,
      factors: [],
      reasoning: []
    };

    const typePriority = this.taskTypePriority[taskType] || 5;
    const score = (typePriority - 5) * 0.3; // Convert to score adjustment

    result.score = score;
    result.factors.push({
      type: 'task_type_priority',
      taskType,
      priority: typePriority,
      score
    });
    result.reasoning.push(`Task type '${taskType}' has priority ${typePriority}`);

    return result;
  }

  /**
   * Analyze deadline urgency
   * @private
   */
  analyzeDeadlineUrgency(deadline) {
    const result = {
      score: 0,
      factors: [],
      reasoning: []
    };

    if (!deadline) return result;

    const deadlineDate = new Date(deadline);
    const now = new Date();
    const hoursUntilDeadline = (deadlineDate - now) / (1000 * 60 * 60);

    let score = 0;
    let urgencyLevel = '';

    if (hoursUntilDeadline < 0) {
      // Overdue
      score = 8;
      urgencyLevel = 'overdue';
    } else if (hoursUntilDeadline < 2) {
      // Less than 2 hours
      score = 7;
      urgencyLevel = 'immediate';
    } else if (hoursUntilDeadline < 24) {
      // Less than 24 hours
      score = 5;
      urgencyLevel = 'today';
    } else if (hoursUntilDeadline < 72) {
      // Less than 3 days
      score = 3;
      urgencyLevel = 'this_week';
    } else if (hoursUntilDeadline < 168) {
      // Less than 1 week
      score = 1;
      urgencyLevel = 'next_week';
    }

    if (score > 0) {
      result.score = score;
      result.factors.push({
        type: 'deadline_urgency',
        hoursUntilDeadline,
        urgencyLevel,
        score
      });
      
      if (hoursUntilDeadline < 0) {
        result.reasoning.push(`Task is overdue by ${Math.abs(hoursUntilDeadline).toFixed(1)} hours`);
      } else {
        result.reasoning.push(`Deadline in ${hoursUntilDeadline.toFixed(1)} hours (${urgencyLevel})`);
      }
    }

    return result;
  }

  /**
   * Convert score to priority level
   * @private
   */
  scoreToPriorityLevel(score) {
    if (score >= 8) return 'critical';
    if (score >= 6.5) return 'high';
    if (score >= 4) return 'medium';
    if (score >= 2) return 'low';
    return 'very_low';
  }

  /**
   * Calculate confidence based on factors
   * @private
   */
  calculateConfidence(factors) {
    if (factors.length === 0) return 0.3;

    // Base confidence
    let confidence = 0.5;

    // Add confidence for each factor type
    const factorTypes = new Set(factors.map(f => f.type));
    
    // More factor types = higher confidence
    confidence += factorTypes.size * 0.05;

    // Specific high-confidence factors
    if (factorTypes.has('urgency_keywords')) confidence += 0.2;
    if (factorTypes.has('deadline_urgency')) confidence += 0.15;
    if (factorTypes.has('sender_importance')) confidence += 0.1;

    return Math.min(1.0, confidence);
  }

  /**
   * Batch analyze multiple tasks
   * @param {Array} tasks - Array of tasks with email context
   * @returns {Array} Array of priority analyses
   */
  batchAnalyzePriority(tasks) {
    return tasks.map(taskData => {
      const { task, email } = taskData;
      return {
        task,
        priority: this.analyzePriority(task, email)
      };
    });
  }

  /**
   * Get priority distribution
   * @param {Array} priorityAnalyses - Array of priority analyses
   * @returns {Object} Priority distribution
   */
  getPriorityDistribution(priorityAnalyses) {
    const distribution = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      very_low: 0
    };

    priorityAnalyses.forEach(analysis => {
      const level = analysis.priority?.level || 'medium';
      if (distribution.hasOwnProperty(level)) {
        distribution[level]++;
      }
    });

    return distribution;
  }

  /**
   * Get top priority tasks
   * @param {Array} tasks - Array of tasks with priority analysis
   * @param {number} limit - Number of top tasks to return
   * @returns {Array} Top priority tasks
   */
  getTopPriorityTasks(tasks, limit = 10) {
    return tasks
      .filter(t => t.priority)
      .sort((a, b) => b.priority.score - a.priority.score)
      .slice(0, limit);
  }

  /**
   * Update sender importance configuration
   * @param {Object} config - New sender importance configuration
   */
  updateSenderImportance(config) {
    Object.assign(this.senderImportanceIndicators, config);
  }

  /**
   * Update urgency keywords configuration
   * @param {Object} config - New urgency keywords configuration
   */
  updateUrgencyKeywords(config) {
    Object.assign(this.urgencyKeywords, config);
  }
}

export default TaskPriorityAnalyzer;