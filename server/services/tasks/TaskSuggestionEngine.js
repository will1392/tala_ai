/**
 * TaskSuggestionEngine - Intelligent task suggestion system
 * 
 * Analyzes emails and context to suggest optimal task details,
 * including assignees, due dates, priorities, and templates.
 */

import { EventEmitter } from 'events';

export class TaskSuggestionEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      useAI: options.useAI !== false,
      learnFromHistory: options.learnFromHistory !== false,
      maxSuggestions: options.maxSuggestions || 5,
      confidenceThreshold: options.confidenceThreshold || 0.7,
      ...options
    };
    
    // Suggestion patterns database
    this.patterns = {
      booking: {
        keywords: ['booking', 'reservation', 'confirm', 'flight', 'hotel'],
        defaultPriority: 'high',
        defaultDuration: 30,
        suggestedTags: ['booking', 'confirmation'],
        reminderOffset: 24 * 60 * 60 * 1000 // 24 hours
      },
      visa: {
        keywords: ['visa', 'passport', 'document', 'embassy', 'consulate'],
        defaultPriority: 'urgent',
        defaultDuration: 120,
        suggestedTags: ['visa', 'document', 'urgent'],
        reminderOffset: 7 * 24 * 60 * 60 * 1000 // 7 days
      },
      payment: {
        keywords: ['invoice', 'payment', 'due', 'amount', 'bill'],
        defaultPriority: 'high',
        defaultDuration: 15,
        suggestedTags: ['payment', 'finance'],
        reminderOffset: 3 * 24 * 60 * 60 * 1000 // 3 days
      },
      itinerary: {
        keywords: ['itinerary', 'schedule', 'travel plan', 'trip'],
        defaultPriority: 'medium',
        defaultDuration: 60,
        suggestedTags: ['itinerary', 'planning'],
        reminderOffset: 2 * 24 * 60 * 60 * 1000 // 2 days
      },
      request: {
        keywords: ['please', 'could you', 'need', 'request', 'arrange'],
        defaultPriority: 'medium',
        defaultDuration: 45,
        suggestedTags: ['client-request'],
        reminderOffset: 24 * 60 * 60 * 1000 // 24 hours
      }
    };
    
    // Agent specializations
    this.agentSpecializations = {
      'flight_specialist': ['flight', 'airline', 'airport', 'aviation'],
      'hotel_specialist': ['hotel', 'accommodation', 'resort', 'lodging'],
      'visa_specialist': ['visa', 'passport', 'embassy', 'immigration'],
      'activity_specialist': ['tour', 'activity', 'excursion', 'sightseeing'],
      'vip_specialist': ['vip', 'luxury', 'first class', 'premium']
    };
    
    // Historical data for learning
    this.history = {
      taskCompletions: [],
      userPreferences: new Map(),
      accuracyMetrics: {
        priority: { correct: 0, total: 0 },
        dueDate: { correct: 0, total: 0 },
        assignee: { correct: 0, total: 0 }
      }
    };
    
    this.initialized = false;
  }
  
  async initialize() {
    if (!this.initialized) {
      // Load historical data if available
      if (this.options.learnFromHistory) {
        await this.loadHistoricalData();
      }
      
      this.initialized = true;
      console.log('💡 TaskSuggestionEngine initialized');
    }
  }
  
  /**
   * Generate comprehensive suggestions for tasks
   */
  async generateSuggestions(tasks, emailData, threadContext = null) {
    const suggestions = [];
    
    for (const task of tasks) {
      const suggestion = await this.generateTaskSuggestion(
        task,
        emailData,
        threadContext
      );
      suggestions.push(suggestion);
    }
    
    return suggestions;
  }
  
  /**
   * Generate suggestion for a single task
   */
  async generateTaskSuggestion(task, emailData, threadContext) {
    const suggestion = {
      taskId: task.id || this.generateId(),
      confidence: 0.8,
      
      // Enhanced task details
      title: await this.suggestTitle(task, emailData),
      description: await this.suggestDescription(task, emailData, threadContext),
      
      // Priority suggestion
      priority: this.suggestPriority(task, emailData),
      priorityReason: this.explainPriority(task, emailData),
      
      // Due date suggestion
      dueDate: this.suggestDueDate(task, emailData),
      dueDateReason: this.explainDueDate(task, emailData),
      
      // Duration estimate
      estimatedDuration: this.suggestDuration(task),
      
      // Assignee suggestions
      assignees: await this.suggestAssignees(task, emailData, threadContext),
      assigneeReasons: this.explainAssignees(task, emailData),
      
      // Travel-specific suggestions
      travelType: this.suggestTravelType(task, emailData),
      location: this.enhanceLocation(task.location, emailData),
      
      // Tags and categorization
      tags: this.suggestTags(task, emailData),
      category: this.suggestCategory(task, emailData),
      
      // Automation suggestions
      template: this.suggestTemplate(task, emailData),
      reminders: this.suggestReminders(task, emailData),
      dependencies: this.suggestDependencies(task, threadContext),
      
      // Additional fields
      customFields: this.suggestCustomFields(task, emailData),
      
      // Metadata
      suggestionMethod: this.options.useAI ? 'ai_enhanced' : 'rule_based',
      generatedAt: new Date()
    };
    
    // Calculate overall confidence
    suggestion.confidence = this.calculateConfidence(suggestion, task);
    
    return suggestion;
  }
  
  /**
   * Suggest enhanced title
   */
  async suggestTitle(task, emailData) {
    let title = task.title;
    
    // Clean up title
    title = title.trim();
    
    // Remove generic words
    const genericWords = ['task', 'to do', 'action item', 'need to'];
    genericWords.forEach(word => {
      title = title.replace(new RegExp(`^${word}:?\\s*`, 'i'), '');
    });
    
    // Capitalize first letter
    title = title.charAt(0).toUpperCase() + title.slice(1);
    
    // Add context if title is too generic
    if (title.length < 15 || this.isGenericTitle(title)) {
      const context = this.extractContext(emailData);
      if (context) {
        title = `${title} - ${context}`;
      }
    }
    
    // Add travel type prefix if not present
    const travelType = this.suggestTravelType(task, emailData);
    if (travelType && !title.toLowerCase().includes(travelType)) {
      const typePrefix = {
        flight: '✈️ Flight:',
        hotel: '🏨 Hotel:',
        visa: '📄 Visa:',
        activity: '🎭 Activity:',
        transfer: '🚗 Transfer:'
      };
      
      if (typePrefix[travelType]) {
        title = `${typePrefix[travelType]} ${title}`;
      }
    }
    
    return title;
  }
  
  /**
   * Suggest detailed description
   */
  async suggestDescription(task, emailData, threadContext) {
    let description = task.description || '';
    
    // Add email context
    const emailContext = `From: ${emailData.from.name || emailData.from.address}\n` +
                        `Subject: ${emailData.subject}\n` +
                        `Date: ${new Date(emailData.date).toLocaleString()}\n\n`;
    
    description = emailContext + description;
    
    // Add key information from email
    const keyInfo = this.extractKeyInformation(emailData);
    if (keyInfo.length > 0) {
      description += '\n\nKey Information:\n';
      keyInfo.forEach(info => {
        description += `• ${info}\n`;
      });
    }
    
    // Add thread context if available
    if (threadContext && threadContext.decisions.length > 0) {
      description += '\n\nPrevious Decisions:\n';
      threadContext.decisions.slice(-3).forEach(decision => {
        description += `• ${decision.decision}\n`;
      });
    }
    
    // Add any attachments info
    if (emailData.attachments?.length > 0) {
      description += '\n\nAttachments:\n';
      emailData.attachments.forEach(att => {
        description += `• ${att.filename} (${this.formatFileSize(att.size)})\n`;
      });
    }
    
    return description;
  }
  
  /**
   * Suggest priority based on various factors
   */
  suggestPriority(task, emailData) {
    let priorityScore = 0;
    
    // Check email urgency indicators
    const urgentWords = ['urgent', 'asap', 'immediately', 'critical', 'emergency'];
    const emailText = (emailData.subject + ' ' + emailData.body).toLowerCase();
    
    urgentWords.forEach(word => {
      if (emailText.includes(word)) {
        priorityScore += 2;
      }
    });
    
    // Check deadline proximity
    if (task.deadline) {
      const daysUntilDeadline = Math.ceil(
        (new Date(task.deadline) - new Date()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysUntilDeadline <= 1) priorityScore += 3;
      else if (daysUntilDeadline <= 3) priorityScore += 2;
      else if (daysUntilDeadline <= 7) priorityScore += 1;
    }
    
    // Check sender importance
    if (this.isVIPSender(emailData.from)) {
      priorityScore += 2;
    }
    
    // Check task type
    const pattern = this.matchPattern(task, emailData);
    if (pattern) {
      if (pattern.defaultPriority === 'urgent') priorityScore += 3;
      else if (pattern.defaultPriority === 'high') priorityScore += 2;
      else if (pattern.defaultPriority === 'medium') priorityScore += 1;
    }
    
    // Convert score to priority
    if (priorityScore >= 5) return 'urgent';
    if (priorityScore >= 3) return 'high';
    if (priorityScore >= 1) return 'medium';
    return 'low';
  }
  
  /**
   * Suggest due date
   */
  suggestDueDate(task, emailData) {
    // If task already has a deadline, use it
    if (task.deadline) {
      return new Date(task.deadline);
    }
    
    // Extract dates from email
    const dates = this.extractDatesFromEmail(emailData);
    
    // Find the most relevant future date
    const futureDates = dates
      .map(d => new Date(d))
      .filter(d => d > new Date() && !isNaN(d));
    
    if (futureDates.length > 0) {
      // Use the earliest future date
      return new Date(Math.min(...futureDates));
    }
    
    // Default based on priority
    const priority = this.suggestPriority(task, emailData);
    const now = new Date();
    
    switch (priority) {
      case 'urgent':
        now.setDate(now.getDate() + 1); // Tomorrow
        break;
      case 'high':
        now.setDate(now.getDate() + 3); // 3 days
        break;
      case 'medium':
        now.setDate(now.getDate() + 7); // 1 week
        break;
      default:
        now.setDate(now.getDate() + 14); // 2 weeks
    }
    
    // Set to business hours
    now.setHours(17, 0, 0, 0); // 5 PM
    
    return now;
  }
  
  /**
   * Suggest task duration
   */
  suggestDuration(task) {
    // Check pattern match
    const pattern = this.matchPattern(task);
    if (pattern && pattern.defaultDuration) {
      return pattern.defaultDuration;
    }
    
    // Estimate based on task complexity
    const complexity = this.estimateComplexity(task);
    
    switch (complexity) {
      case 'simple':
        return 15; // 15 minutes
      case 'medium':
        return 30; // 30 minutes
      case 'complex':
        return 60; // 1 hour
      default:
        return 30;
    }
  }
  
  /**
   * Suggest assignees based on specialization
   */
  async suggestAssignees(task, emailData, threadContext) {
    const suggestions = [];
    const taskText = (task.title + ' ' + task.description).toLowerCase();
    
    // Match against agent specializations
    for (const [agent, keywords] of Object.entries(this.agentSpecializations)) {
      let score = 0;
      
      keywords.forEach(keyword => {
        if (taskText.includes(keyword)) {
          score += 2;
        }
        if (emailData.subject.toLowerCase().includes(keyword)) {
          score += 1;
        }
      });
      
      if (score > 0) {
        suggestions.push({
          userId: agent,
          role: 'assignee',
          score,
          reason: `Specialist in ${keywords[0]}`
        });
      }
    }
    
    // Check thread participants
    if (threadContext && threadContext.participants) {
      // Suggest agents who have been involved in the thread
      const involvedAgents = threadContext.participants
        .filter(p => this.isInternalAgent(p))
        .map(p => ({
          userId: p,
          role: 'assignee',
          score: 1,
          reason: 'Previously involved in thread'
        }));
      
      suggestions.push(...involvedAgents);
    }
    
    // Sort by score and return top suggestions
    suggestions.sort((a, b) => b.score - a.score);
    
    return suggestions.slice(0, 3).map(s => ({
      userId: s.userId,
      role: s.role,
      confidence: Math.min(s.score / 5, 1),
      reason: s.reason
    }));
  }
  
  /**
   * Suggest travel type
   */
  suggestTravelType(task, emailData) {
    const text = (task.title + ' ' + task.description + ' ' + emailData.subject).toLowerCase();
    
    const typeKeywords = {
      flight: ['flight', 'airline', 'airport', 'departure', 'arrival', 'boarding'],
      hotel: ['hotel', 'accommodation', 'resort', 'check-in', 'check-out', 'room'],
      visa: ['visa', 'passport', 'embassy', 'consulate', 'immigration'],
      activity: ['tour', 'activity', 'excursion', 'ticket', 'attraction'],
      transfer: ['transfer', 'taxi', 'car', 'pickup', 'shuttle'],
      insurance: ['insurance', 'coverage', 'policy', 'claim'],
      document: ['document', 'certificate', 'form', 'application']
    };
    
    let bestMatch = null;
    let bestScore = 0;
    
    for (const [type, keywords] of Object.entries(typeKeywords)) {
      let score = 0;
      keywords.forEach(keyword => {
        if (text.includes(keyword)) {
          score++;
        }
      });
      
      if (score > bestScore) {
        bestScore = score;
        bestMatch = type;
      }
    }
    
    return bestMatch || 'general';
  }
  
  /**
   * Suggest tags
   */
  suggestTags(task, emailData) {
    const tags = new Set(task.tags || []);
    
    // Add pattern-based tags
    const pattern = this.matchPattern(task, emailData);
    if (pattern && pattern.suggestedTags) {
      pattern.suggestedTags.forEach(tag => tags.add(tag));
    }
    
    // Add priority tag
    const priority = this.suggestPriority(task, emailData);
    if (priority === 'urgent' || priority === 'high') {
      tags.add(priority);
    }
    
    // Add sender-based tags
    if (this.isVIPSender(emailData.from)) {
      tags.add('vip');
    }
    
    // Add travel type tag
    const travelType = this.suggestTravelType(task, emailData);
    if (travelType !== 'general') {
      tags.add(travelType);
    }
    
    // Add deadline tag
    if (task.deadline) {
      const daysUntil = Math.ceil(
        (new Date(task.deadline) - new Date()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntil <= 3) {
        tags.add('deadline-soon');
      }
    }
    
    return Array.from(tags);
  }
  
  /**
   * Suggest reminders
   */
  suggestReminders(task, emailData) {
    const reminders = [];
    const dueDate = this.suggestDueDate(task, emailData);
    const priority = this.suggestPriority(task, emailData);
    
    if (!dueDate) return reminders;
    
    // Pattern-based reminder
    const pattern = this.matchPattern(task, emailData);
    if (pattern && pattern.reminderOffset) {
      const reminderTime = new Date(dueDate.getTime() - pattern.reminderOffset);
      if (reminderTime > new Date()) {
        reminders.push({
          time: reminderTime,
          type: 'email',
          message: `Reminder: ${task.title}`
        });
      }
    }
    
    // Priority-based reminders
    if (priority === 'urgent' || priority === 'high') {
      // Day before reminder
      const dayBefore = new Date(dueDate);
      dayBefore.setDate(dayBefore.getDate() - 1);
      dayBefore.setHours(9, 0, 0, 0);
      
      if (dayBefore > new Date()) {
        reminders.push({
          time: dayBefore,
          type: 'email',
          message: `Tomorrow: ${task.title}`
        });
      }
      
      // Hour before reminder for urgent
      if (priority === 'urgent') {
        const hourBefore = new Date(dueDate);
        hourBefore.setHours(hourBefore.getHours() - 1);
        
        if (hourBefore > new Date()) {
          reminders.push({
            time: hourBefore,
            type: 'push',
            message: `Due in 1 hour: ${task.title}`
          });
        }
      }
    }
    
    return reminders;
  }
  
  /**
   * Suggest task dependencies
   */
  suggestDependencies(task, threadContext) {
    const dependencies = [];
    
    if (!threadContext || !threadContext.actionItems) {
      return dependencies;
    }
    
    // Look for related previous tasks
    threadContext.actionItems.forEach(item => {
      if (this.isPrerequisite(item, task)) {
        dependencies.push({
          taskId: item.id,
          type: 'blocks',
          reason: 'Must be completed first'
        });
      }
    });
    
    return dependencies;
  }
  
  /**
   * Suggest custom fields based on task type
   */
  suggestCustomFields(task, emailData) {
    const fields = {};
    const travelType = this.suggestTravelType(task, emailData);
    
    switch (travelType) {
      case 'flight':
        fields.departureDate = this.extractDate(emailData, 'departure');
        fields.returnDate = this.extractDate(emailData, 'return');
        fields.airline = this.extractAirline(emailData);
        fields.flightNumber = this.extractFlightNumber(emailData);
        break;
        
      case 'hotel':
        fields.checkInDate = this.extractDate(emailData, 'check-in');
        fields.checkOutDate = this.extractDate(emailData, 'check-out');
        fields.hotelName = this.extractHotelName(emailData);
        fields.roomType = this.extractRoomType(emailData);
        fields.guests = this.extractGuestCount(emailData);
        break;
        
      case 'visa':
        fields.nationality = this.extractNationality(emailData);
        fields.visaType = this.extractVisaType(emailData);
        fields.travelPurpose = this.extractTravelPurpose(emailData);
        fields.processingTime = this.estimateVisaProcessingTime(emailData);
        break;
    }
    
    return fields;
  }
  
  /**
   * Helper methods
   */
  
  matchPattern(task, emailData = null) {
    const text = task.title + ' ' + (task.description || '') + 
                 (emailData ? ' ' + emailData.subject : '');
    const textLower = text.toLowerCase();
    
    for (const [key, pattern] of Object.entries(this.patterns)) {
      const matchCount = pattern.keywords.filter(keyword => 
        textLower.includes(keyword)
      ).length;
      
      if (matchCount >= 2 || (matchCount === 1 && pattern.keywords.length <= 2)) {
        return pattern;
      }
    }
    
    return null;
  }
  
  isGenericTitle(title) {
    const genericTitles = [
      'task', 'to do', 'action', 'item', 'request',
      'follow up', 'check', 'review', 'process'
    ];
    
    const titleLower = title.toLowerCase();
    return genericTitles.some(generic => 
      titleLower === generic || titleLower === `${generic}:`
    );
  }
  
  extractContext(emailData) {
    // Extract key context from email
    const subject = emailData.subject;
    
    // Remove RE:, FW:, etc.
    const cleanSubject = subject.replace(/^(RE:|FW:|Fwd:)\s*/gi, '').trim();
    
    // Extract company/client name
    const fromDomain = emailData.from.address.split('@')[1];
    const companyName = fromDomain.split('.')[0];
    
    return `${companyName} - ${cleanSubject}`;
  }
  
  extractKeyInformation(emailData) {
    const info = [];
    const text = emailData.body || emailData.text || '';
    
    // Extract dates
    const dates = this.extractDatesFromEmail(emailData);
    if (dates.length > 0) {
      info.push(`Dates mentioned: ${dates.join(', ')}`);
    }
    
    // Extract amounts
    const amounts = text.match(/\$[\d,]+(?:\.\d{2})?/g) || [];
    if (amounts.length > 0) {
      info.push(`Amounts: ${amounts.join(', ')}`);
    }
    
    // Extract phone numbers
    const phones = text.match(/[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}/g) || [];
    if (phones.length > 0) {
      info.push(`Contact numbers: ${phones.join(', ')}`);
    }
    
    // Extract email addresses
    const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    const otherEmails = emails.filter(e => e !== emailData.from.address);
    if (otherEmails.length > 0) {
      info.push(`Other contacts: ${otherEmails.join(', ')}`);
    }
    
    return info;
  }
  
  isVIPSender(from) {
    // Check against VIP list
    const vipDomains = ['ceo', 'executive', 'vip', 'premium'];
    const vipNames = ['director', 'president', 'manager', 'chief'];
    
    const email = from.address.toLowerCase();
    const name = (from.name || '').toLowerCase();
    
    return vipDomains.some(domain => email.includes(domain)) ||
           vipNames.some(vipName => name.includes(vipName));
  }
  
  isInternalAgent(email) {
    // Check if email belongs to internal team
    return email.includes('@tala') || email.includes('agent');
  }
  
  extractDatesFromEmail(emailData) {
    const text = emailData.subject + ' ' + (emailData.body || '');
    const dates = [];
    
    // Common date patterns
    const patterns = [
      /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/g,
      /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/gi,
      /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/gi
    ];
    
    patterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      dates.push(...matches);
    });
    
    return [...new Set(dates)];
  }
  
  estimateComplexity(task) {
    const factors = {
      titleLength: task.title.split(' ').length,
      hasDeadline: !!task.deadline,
      hasMultipleEntities: (task.entities?.length || 0) > 2,
      hasAttachments: (task.attachments?.length || 0) > 0
    };
    
    let score = 0;
    if (factors.titleLength > 10) score++;
    if (factors.hasDeadline) score++;
    if (factors.hasMultipleEntities) score++;
    if (factors.hasAttachments) score++;
    
    if (score >= 3) return 'complex';
    if (score >= 1) return 'medium';
    return 'simple';
  }
  
  isPrerequisite(item1, item2) {
    // Simple check if item1 should be completed before item2
    const item1Text = (item1.title || '').toLowerCase();
    const item2Text = (item2.title || '').toLowerCase();
    
    // Check for common prerequisite patterns
    if (item1Text.includes('visa') && item2Text.includes('flight')) return true;
    if (item1Text.includes('approval') && item2Text.includes('book')) return true;
    if (item1Text.includes('confirm') && item2Text.includes('purchase')) return true;
    
    return false;
  }
  
  calculateConfidence(suggestion, originalTask) {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on data quality
    if (suggestion.title && suggestion.title !== originalTask.title) confidence += 0.1;
    if (suggestion.dueDate) confidence += 0.1;
    if (suggestion.assignees.length > 0) confidence += 0.1;
    if (suggestion.priority !== 'medium') confidence += 0.1;
    if (suggestion.tags.length > 2) confidence += 0.1;
    
    // Decrease confidence for uncertainty
    if (!originalTask.deadline && suggestion.dueDate) confidence -= 0.1;
    if (suggestion.assignees.length === 0) confidence -= 0.1;
    
    return Math.max(0.3, Math.min(1.0, confidence));
  }
  
  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
  
  /**
   * Learn from user feedback
   */
  async recordFeedback(suggestion, actualValues, accepted) {
    if (!this.options.learnFromHistory) return;
    
    // Record accuracy metrics
    if (actualValues.priority && suggestion.priority === actualValues.priority) {
      this.history.accuracyMetrics.priority.correct++;
    }
    this.history.accuracyMetrics.priority.total++;
    
    if (actualValues.assignee && suggestion.assignees[0]?.userId === actualValues.assignee) {
      this.history.accuracyMetrics.assignee.correct++;
    }
    this.history.accuracyMetrics.assignee.total++;
    
    // Store user preferences
    const userId = actualValues.userId;
    if (userId) {
      if (!this.history.userPreferences.has(userId)) {
        this.history.userPreferences.set(userId, {
          preferredPriority: {},
          preferredAssignees: {},
          averageDuration: 0
        });
      }
      
      const prefs = this.history.userPreferences.get(userId);
      
      // Update preferences based on actual values
      if (actualValues.priority) {
        prefs.preferredPriority[actualValues.priority] = 
          (prefs.preferredPriority[actualValues.priority] || 0) + 1;
      }
    }
    
    // Store for pattern learning
    this.history.taskCompletions.push({
      suggestion,
      actualValues,
      accepted,
      timestamp: new Date()
    });
    
    // Keep only last 1000 completions
    if (this.history.taskCompletions.length > 1000) {
      this.history.taskCompletions = this.history.taskCompletions.slice(-1000);
    }
  }
  
  /**
   * Get suggestion accuracy metrics
   */
  getAccuracyMetrics() {
    const metrics = {};
    
    for (const [key, data] of Object.entries(this.history.accuracyMetrics)) {
      metrics[key] = {
        accuracy: data.total > 0 ? data.correct / data.total : 0,
        total: data.total
      };
    }
    
    return metrics;
  }
  
  // Additional extraction methods for custom fields
  
  extractDate(emailData, type) {
    const text = emailData.body || emailData.text || '';
    const patterns = {
      departure: /depart(?:ure|ing)?\s+(?:on\s+)?([A-Za-z]+ \d{1,2},? \d{4})/i,
      return: /return(?:ing)?\s+(?:on\s+)?([A-Za-z]+ \d{1,2},? \d{4})/i,
      'check-in': /check[\s-]?in\s+(?:on\s+)?([A-Za-z]+ \d{1,2},? \d{4})/i,
      'check-out': /check[\s-]?out\s+(?:on\s+)?([A-Za-z]+ \d{1,2},? \d{4})/i
    };
    
    const pattern = patterns[type];
    if (pattern) {
      const match = text.match(pattern);
      if (match) {
        return new Date(match[1]);
      }
    }
    
    return null;
  }
  
  extractAirline(emailData) {
    const text = (emailData.body || emailData.text || '');
    const airlines = [
      'American', 'Delta', 'United', 'Southwest', 'JetBlue',
      'Alaska', 'Emirates', 'Qatar', 'Singapore', 'Lufthansa'
    ];
    
    for (const airline of airlines) {
      if (text.includes(airline)) {
        return airline;
      }
    }
    
    return null;
  }
  
  extractFlightNumber(emailData) {
    const text = (emailData.body || emailData.text || '');
    const match = text.match(/([A-Z]{2,3})\s*(\d{1,4})/);
    return match ? `${match[1]}${match[2]}` : null;
  }
  
  extractHotelName(emailData) {
    const text = (emailData.body || emailData.text || '');
    const patterns = [
      /(?:hotel|resort|inn):\s*([^,\n]+)/i,
      /staying at\s+(?:the\s+)?([^,\n]+)/i,
      /accommodation at\s+(?:the\s+)?([^,\n]+)/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    return null;
  }
  
  extractRoomType(emailData) {
    const text = (emailData.body || emailData.text || '').toLowerCase();
    const roomTypes = [
      'suite', 'deluxe', 'standard', 'king', 'queen', 'twin',
      'single', 'double', 'executive', 'presidential'
    ];
    
    for (const type of roomTypes) {
      if (text.includes(type)) {
        return type.charAt(0).toUpperCase() + type.slice(1);
      }
    }
    
    return 'Standard';
  }
  
  extractGuestCount(emailData) {
    const text = (emailData.body || emailData.text || '');
    const patterns = [
      /(\d+)\s*(?:guest|person|people|adult)/i,
      /for\s+(\d+)/i
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return parseInt(match[1]);
      }
    }
    
    return 1;
  }
  
  extractNationality(emailData) {
    // This would need a more sophisticated implementation
    // For now, return a default
    return 'US';
  }
  
  extractVisaType(emailData) {
    const text = (emailData.body || emailData.text || '').toLowerCase();
    const visaTypes = ['tourist', 'business', 'transit', 'student', 'work'];
    
    for (const type of visaTypes) {
      if (text.includes(type)) {
        return type;
      }
    }
    
    return 'tourist';
  }
  
  extractTravelPurpose(emailData) {
    const text = (emailData.body || emailData.text || '').toLowerCase();
    
    if (text.includes('business') || text.includes('meeting') || text.includes('conference')) {
      return 'business';
    }
    if (text.includes('vacation') || text.includes('holiday') || text.includes('tourism')) {
      return 'leisure';
    }
    
    return 'general';
  }
  
  estimateVisaProcessingTime(emailData) {
    // Default processing times by country (would need real data)
    return 14; // 14 days default
  }
  
  generateId() {
    return `sug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Explanation methods for transparency
  
  explainPriority(task, emailData) {
    const reasons = [];
    const priority = this.suggestPriority(task, emailData);
    
    if (emailData.subject.toLowerCase().includes('urgent')) {
      reasons.push('Email marked as urgent');
    }
    
    if (task.deadline) {
      const days = Math.ceil((new Date(task.deadline) - new Date()) / (1000 * 60 * 60 * 24));
      if (days <= 3) {
        reasons.push(`Due in ${days} days`);
      }
    }
    
    if (this.isVIPSender(emailData.from)) {
      reasons.push('From VIP sender');
    }
    
    return reasons.join('; ') || `Default ${priority} priority`;
  }
  
  explainDueDate(task, emailData) {
    if (task.deadline) {
      return 'Extracted from email content';
    }
    
    const priority = this.suggestPriority(task, emailData);
    const daysMap = {
      urgent: 1,
      high: 3,
      medium: 7,
      low: 14
    };
    
    return `Based on ${priority} priority (${daysMap[priority]} days)`;
  }
  
  explainAssignees(task, emailData) {
    const reasons = {};
    const suggestions = this.suggestAssignees(task, emailData);
    
    suggestions.forEach(s => {
      reasons[s.userId] = s.reason;
    });
    
    return reasons;
  }
  
  async loadHistoricalData() {
    // In production, load from database
    console.log('Loading historical suggestion data...');
  }
}

export default TaskSuggestionEngine;