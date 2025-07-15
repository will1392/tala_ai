/**
 * EmailToTaskConverter - Seamless email to task conversion
 * 
 * Processes emails through intelligent extraction pipeline to create
 * actionable tasks with full context preservation and thread awareness.
 */

import TaskExtractor from '../tasks/TaskExtractor.js';
import TaskEnricher from '../tasks/TaskEnricher.js';
import TaskManager from '../tasks/TaskManager.js';
import TaskSuggestionEngine from '../tasks/TaskSuggestionEngine.js';
import EmailManager from './EmailManager.js';
import { EventEmitter } from 'events';

export class EmailToTaskConverter extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      autoCreate: options.autoCreate !== false,
      preserveThread: options.preserveThread !== false,
      enrichTasks: options.enrichTasks !== false,
      generateSuggestions: options.generateSuggestions !== false,
      ...options
    };
    
    // Initialize services
    this.taskExtractor = options.taskExtractor || new TaskExtractor();
    this.taskEnricher = options.taskEnricher || new TaskEnricher();
    this.taskManager = options.taskManager || new TaskManager(options);
    this.suggestionEngine = options.suggestionEngine || new TaskSuggestionEngine(options);
    this.emailManager = options.emailManager || new EmailManager(options);
    
    // Conversion statistics
    this.stats = {
      emailsProcessed: 0,
      tasksCreated: 0,
      extractionTime: 0,
      successRate: 1.0,
      patterns: new Map()
    };
    
    this.initialized = false;
  }
  
  async initialize() {
    if (!this.initialized) {
      await Promise.all([
        this.taskExtractor.initialize(),
        this.taskEnricher.initialize(),
        this.taskManager.initialize(),
        this.suggestionEngine.initialize()
      ]);
      
      this.initialized = true;
      console.log('📧➡️✅ EmailToTaskConverter initialized');
    }
  }
  
  /**
   * Main conversion flow - "Send to Tala" functionality
   */
  async convertEmailToTasks(emailData, options = {}) {
    const startTime = Date.now();
    const conversionId = this.generateConversionId();
    
    try {
      this.emit('conversion:started', {
        conversionId,
        emailId: emailData.id,
        subject: emailData.subject
      });
      
      // Step 1: Extract email content and context
      const extractedContent = await this.extractEmailContent(emailData);
      this.emit('conversion:extracted', {
        conversionId,
        content: extractedContent
      });
      
      // Step 2: Analyze with task extraction
      const extractedTasks = await this.taskExtractor.extractTasks(extractedContent);
      this.emit('conversion:analyzed', {
        conversionId,
        tasksFound: extractedTasks.length
      });
      
      // Step 3: Maintain thread context
      let threadContext = null;
      if (this.options.preserveThread && emailData.threadId) {
        threadContext = await this.getThreadContext(emailData.threadId);
      }
      
      // Step 4: Enrich tasks with context
      const enrichedTasks = await this.enrichTasksWithContext(
        extractedTasks,
        extractedContent,
        threadContext
      );
      
      // Step 5: Generate suggestions
      const suggestions = await this.suggestionEngine.generateSuggestions(
        enrichedTasks,
        emailData,
        threadContext
      );
      
      // Step 6: Prepare task preview
      const taskPreviews = this.prepareTaskPreviews(
        enrichedTasks,
        suggestions,
        emailData
      );
      
      this.emit('conversion:preview', {
        conversionId,
        taskPreviews,
        requiresConfirmation: !options.autoCreate
      });
      
      // Step 7: Create tasks (auto or after confirmation)
      let createdTasks = [];
      if (options.autoCreate || options.confirmed) {
        createdTasks = await this.createTasksFromPreviews(
          taskPreviews,
          emailData,
          options
        );
        
        this.emit('conversion:completed', {
          conversionId,
          createdTasks,
          emailId: emailData.id
        });
      }
      
      // Update statistics
      this.updateStats(emailData, createdTasks, Date.now() - startTime);
      
      return {
        conversionId,
        success: true,
        taskPreviews,
        createdTasks,
        suggestions,
        threadContext,
        processingTime: Date.now() - startTime
      };
      
    } catch (error) {
      console.error('Email to task conversion error:', error);
      
      this.emit('conversion:error', {
        conversionId,
        emailId: emailData.id,
        error: error.message
      });
      
      throw error;
    }
  }
  
  /**
   * Extract comprehensive email content
   */
  async extractEmailContent(emailData) {
    const content = {
      // Basic email data
      id: emailData.id,
      subject: emailData.subject,
      from: emailData.from,
      to: emailData.to,
      cc: emailData.cc,
      date: emailData.date,
      
      // Content extraction
      body: this.cleanEmailBody(emailData.body || emailData.text),
      htmlBody: emailData.html,
      
      // Metadata
      threadId: emailData.threadId,
      messageId: emailData.messageId,
      inReplyTo: emailData.inReplyTo,
      references: emailData.references,
      
      // Attachments
      attachments: emailData.attachments || [],
      
      // Extracted elements
      links: this.extractLinks(emailData.body || emailData.text),
      dates: this.extractDates(emailData.body || emailData.text),
      phoneNumbers: this.extractPhoneNumbers(emailData.body || emailData.text),
      amounts: this.extractAmounts(emailData.body || emailData.text),
      
      // Email type detection
      emailType: this.detectEmailType(emailData),
      
      // Sentiment and urgency
      sentiment: this.analyzeSentiment(emailData.body || emailData.text),
      urgency: this.detectUrgency(emailData)
    };
    
    return content;
  }
  
  /**
   * Get email thread context
   */
  async getThreadContext(threadId) {
    try {
      // Get all emails in thread
      const threadEmails = await this.emailManager.getThread(threadId);
      
      // Sort by date
      threadEmails.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      // Extract key information from thread
      const context = {
        threadId,
        emailCount: threadEmails.length,
        participants: this.extractParticipants(threadEmails),
        timeline: this.extractTimeline(threadEmails),
        topics: this.extractTopics(threadEmails),
        decisions: this.extractDecisions(threadEmails),
        actionItems: this.extractPreviousActionItems(threadEmails),
        attachmentHistory: this.extractAttachmentHistory(threadEmails)
      };
      
      return context;
    } catch (error) {
      console.warn('Could not get thread context:', error);
      return null;
    }
  }
  
  /**
   * Enrich tasks with email and thread context
   */
  async enrichTasksWithContext(tasks, emailContent, threadContext) {
    const enrichedTasks = [];
    
    for (const task of tasks) {
      const enrichedTask = {
        ...task,
        
        // Email context
        sourceEmail: {
          id: emailContent.id,
          subject: emailContent.subject,
          from: emailContent.from,
          date: emailContent.date,
          threadId: emailContent.threadId
        },
        
        // Enhanced metadata
        metadata: {
          ...task.metadata,
          emailType: emailContent.emailType,
          sentiment: emailContent.sentiment,
          urgency: emailContent.urgency,
          hasAttachments: emailContent.attachments.length > 0
        }
      };
      
      // Add thread context if available
      if (threadContext) {
        enrichedTask.threadContext = {
          emailCount: threadContext.emailCount,
          participants: threadContext.participants,
          relatedDecisions: threadContext.decisions.filter(
            d => this.isRelatedToTask(d, task)
          ),
          previousActions: threadContext.actionItems.filter(
            a => this.isRelatedToTask(a, task)
          )
        };
      }
      
      // Enrich with AI if enabled
      if (this.options.enrichTasks) {
        const aiEnrichment = await this.taskEnricher.enrich(enrichedTask);
        Object.assign(enrichedTask, aiEnrichment);
      }
      
      enrichedTasks.push(enrichedTask);
    }
    
    return enrichedTasks;
  }
  
  /**
   * Prepare task previews for user confirmation
   */
  prepareTaskPreviews(tasks, suggestions, emailData) {
    return tasks.map((task, index) => {
      const suggestion = suggestions[index] || {};
      
      return {
        // Core task data
        title: suggestion.title || task.title,
        description: suggestion.description || task.description,
        
        // Suggested fields
        priority: suggestion.priority || task.priority || 'medium',
        dueDate: suggestion.dueDate || task.deadline,
        estimatedDuration: suggestion.estimatedDuration || task.estimatedDuration,
        
        // Assignments
        suggestedAssignees: suggestion.assignees || [],
        
        // Travel specific
        travelType: task.travelType || suggestion.travelType,
        location: task.location || suggestion.location,
        bookingReference: this.extractBookingReference(emailData),
        
        // Tags and categorization
        tags: [...new Set([
          ...(task.tags || []),
          ...(suggestion.tags || [])
        ])],
        
        // Automation
        suggestedReminders: suggestion.reminders || this.getDefaultReminders(task),
        suggestedTemplate: suggestion.template,
        
        // Metadata
        confidence: task.confidence || 0.8,
        extractionMethod: task.extractionMethod || 'ai',
        requiresReview: task.confidence < 0.7,
        
        // Original task data
        originalTask: task,
        
        // UI hints
        highlightedText: task.sourceText,
        editableFields: ['title', 'description', 'priority', 'dueDate', 'assignees']
      };
    });
  }
  
  /**
   * Create actual tasks from previews
   */
  async createTasksFromPreviews(taskPreviews, emailData, options = {}) {
    const createdTasks = [];
    
    for (const preview of taskPreviews) {
      try {
        // Skip if user rejected this task
        if (options.rejectedTasks?.includes(preview.id)) {
          continue;
        }
        
        // Apply user edits if any
        const taskData = this.applyUserEdits(preview, options.edits?.[preview.id]);
        
        // Create the task
        const task = await this.taskManager.createTask({
          ...taskData,
          sourceEmailId: emailData.id,
          extractedFromEmail: true,
          customFields: {
            emailSubject: emailData.subject,
            emailFrom: emailData.from,
            emailDate: emailData.date,
            threadId: emailData.threadId,
            extractionConfidence: preview.confidence
          }
        });
        
        // Link email as attachment
        if (emailData.id) {
          await this.taskManager.addAttachment(task.id, {
            emailId: emailData.id,
            attachmentType: 'email',
            description: 'Source email'
          });
        }
        
        // Create reminders
        if (taskData.reminders?.length > 0) {
          for (const reminder of taskData.reminders) {
            await this.createReminder(task.id, reminder);
          }
        }
        
        // Track pattern for learning
        this.trackPattern(emailData, task);
        
        createdTasks.push(task);
        
      } catch (error) {
        console.error(`Failed to create task from preview:`, error);
        this.emit('task:creation:failed', {
          preview,
          error: error.message
        });
      }
    }
    
    return createdTasks;
  }
  
  /**
   * Intelligent email type detection
   */
  detectEmailType(emailData) {
    const subject = emailData.subject?.toLowerCase() || '';
    const body = (emailData.body || emailData.text || '').toLowerCase();
    
    // Booking confirmations
    if (
      subject.includes('confirmation') ||
      subject.includes('booking') ||
      body.includes('booking reference') ||
      body.includes('confirmation number')
    ) {
      return 'booking_confirmation';
    }
    
    // Client requests
    if (
      subject.includes('request') ||
      subject.includes('need') ||
      subject.includes('urgent') ||
      body.includes('please book') ||
      body.includes('could you arrange')
    ) {
      return 'client_request';
    }
    
    // Itinerary
    if (
      subject.includes('itinerary') ||
      subject.includes('travel plan') ||
      body.includes('flight details') ||
      body.includes('hotel information')
    ) {
      return 'itinerary';
    }
    
    // Invoice/Payment
    if (
      subject.includes('invoice') ||
      subject.includes('payment') ||
      body.includes('amount due') ||
      body.includes('payment deadline')
    ) {
      return 'invoice';
    }
    
    // Visa/Documents
    if (
      subject.includes('visa') ||
      subject.includes('passport') ||
      subject.includes('document') ||
      body.includes('visa application') ||
      body.includes('passport expiry')
    ) {
      return 'document';
    }
    
    return 'general';
  }
  
  /**
   * Pattern tracking for learning
   */
  trackPattern(emailData, task) {
    const pattern = {
      emailType: this.detectEmailType(emailData),
      sender: emailData.from.address,
      taskType: task.travelType,
      priority: task.priority,
      extractionSuccess: true,
      timestamp: new Date()
    };
    
    const key = `${pattern.emailType}_${pattern.sender}`;
    
    if (!this.stats.patterns.has(key)) {
      this.stats.patterns.set(key, {
        count: 0,
        successRate: 1.0,
        commonTasks: []
      });
    }
    
    const patternStats = this.stats.patterns.get(key);
    patternStats.count++;
    patternStats.commonTasks.push({
      type: task.travelType,
      priority: task.priority
    });
    
    // Keep only last 10 tasks for pattern
    if (patternStats.commonTasks.length > 10) {
      patternStats.commonTasks.shift();
    }
  }
  
  /**
   * Helper methods
   */
  
  cleanEmailBody(body) {
    if (!body) return '';
    
    // Remove email signatures
    let cleaned = body.split(/--\s*$/m)[0];
    
    // Remove quoted text
    cleaned = cleaned.split(/On .+ wrote:/)[0];
    cleaned = cleaned.split(/From:/)[0];
    
    // Remove excessive whitespace
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    cleaned = cleaned.trim();
    
    return cleaned;
  }
  
  extractLinks(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return [...(text.match(urlRegex) || [])];
  }
  
  extractDates(text) {
    // Simple date extraction - in production use a proper NLP library
    const datePatterns = [
      /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g,
      /\b\d{1,2}-\d{1,2}-\d{2,4}\b/g,
      /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}\b/gi,
      /\b(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\b/gi
    ];
    
    const dates = [];
    for (const pattern of datePatterns) {
      const matches = text.match(pattern) || [];
      dates.push(...matches);
    }
    
    return dates;
  }
  
  extractPhoneNumbers(text) {
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    return [...(text.match(phoneRegex) || [])];
  }
  
  extractAmounts(text) {
    const amountRegex = /\$\d+(?:,\d{3})*(?:\.\d{2})?|\d+(?:,\d{3})*(?:\.\d{2})?\s*(?:USD|EUR|GBP)/g;
    return [...(text.match(amountRegex) || [])];
  }
  
  extractBookingReference(emailData) {
    const text = emailData.subject + ' ' + (emailData.body || emailData.text || '');
    
    // Common booking reference patterns
    const patterns = [
      /booking\s*(?:reference|ref|number|#):\s*([A-Z0-9]{6,})/i,
      /confirmation\s*(?:number|code|#):\s*([A-Z0-9]{6,})/i,
      /reference:\s*([A-Z0-9]{6,})/i,
      /\b([A-Z]{2,3}[0-9]{4,8})\b/ // Generic airline format
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return null;
  }
  
  analyzeSentiment(text) {
    // Simple sentiment analysis
    const positiveWords = ['happy', 'pleased', 'excellent', 'great', 'wonderful', 'perfect'];
    const negativeWords = ['urgent', 'problem', 'issue', 'complaint', 'unhappy', 'disappointed'];
    
    const lower = text.toLowerCase();
    let score = 0;
    
    positiveWords.forEach(word => {
      if (lower.includes(word)) score++;
    });
    
    negativeWords.forEach(word => {
      if (lower.includes(word)) score--;
    });
    
    if (score > 0) return 'positive';
    if (score < 0) return 'negative';
    return 'neutral';
  }
  
  detectUrgency(emailData) {
    const urgentIndicators = [
      'urgent', 'asap', 'immediately', 'today', 'tomorrow',
      'deadline', 'expires', 'last minute', 'emergency'
    ];
    
    const text = (emailData.subject + ' ' + (emailData.body || '')).toLowerCase();
    
    const urgentCount = urgentIndicators.filter(indicator => 
      text.includes(indicator)
    ).length;
    
    if (urgentCount >= 2) return 'high';
    if (urgentCount === 1) return 'medium';
    return 'normal';
  }
  
  extractParticipants(emails) {
    const participants = new Set();
    
    emails.forEach(email => {
      participants.add(email.from.address);
      email.to?.forEach(to => participants.add(to.address));
      email.cc?.forEach(cc => participants.add(cc.address));
    });
    
    return Array.from(participants);
  }
  
  extractTimeline(emails) {
    return emails.map(email => ({
      date: email.date,
      subject: email.subject,
      from: email.from.address,
      summary: email.body?.substring(0, 100) + '...'
    }));
  }
  
  extractTopics(emails) {
    // In production, use NLP for topic extraction
    const topics = new Set();
    
    emails.forEach(email => {
      const text = email.subject + ' ' + (email.body || '');
      
      // Extract travel destinations
      const destinations = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
      destinations.forEach(dest => {
        if (dest.length > 3) topics.add(dest);
      });
    });
    
    return Array.from(topics);
  }
  
  extractDecisions(emails) {
    const decisions = [];
    
    emails.forEach(email => {
      const text = email.body || '';
      
      // Look for decision indicators
      const decisionPhrases = [
        /confirmed\s+(.+)/gi,
        /agreed\s+to\s+(.+)/gi,
        /decided\s+on\s+(.+)/gi,
        /will\s+proceed\s+with\s+(.+)/gi
      ];
      
      decisionPhrases.forEach(pattern => {
        const matches = text.match(pattern) || [];
        matches.forEach(match => {
          decisions.push({
            decision: match,
            emailId: email.id,
            date: email.date
          });
        });
      });
    });
    
    return decisions;
  }
  
  extractPreviousActionItems(emails) {
    const actionItems = [];
    
    emails.forEach(email => {
      // Look for tasks created from previous emails
      if (email.metadata?.tasksCreated) {
        actionItems.push(...email.metadata.tasksCreated);
      }
    });
    
    return actionItems;
  }
  
  extractAttachmentHistory(emails) {
    const attachments = [];
    
    emails.forEach(email => {
      if (email.attachments?.length > 0) {
        attachments.push({
          emailId: email.id,
          date: email.date,
          files: email.attachments.map(a => ({
            name: a.filename,
            type: a.contentType,
            size: a.size
          }))
        });
      }
    });
    
    return attachments;
  }
  
  isRelatedToTask(item, task) {
    // Check if decision/action item is related to task
    const taskText = (task.title + ' ' + task.description).toLowerCase();
    const itemText = (item.decision || item.title || '').toLowerCase();
    
    // Check for common words
    const taskWords = taskText.split(/\s+/);
    const itemWords = itemText.split(/\s+/);
    
    const commonWords = taskWords.filter(word => 
      word.length > 3 && itemWords.includes(word)
    );
    
    return commonWords.length >= 2;
  }
  
  getDefaultReminders(task) {
    const reminders = [];
    
    if (task.deadline) {
      const deadlineDate = new Date(task.deadline);
      
      // 1 day before
      const dayBefore = new Date(deadlineDate);
      dayBefore.setDate(dayBefore.getDate() - 1);
      dayBefore.setHours(9, 0, 0, 0);
      
      if (dayBefore > new Date()) {
        reminders.push({
          time: dayBefore,
          type: 'email',
          message: `Reminder: ${task.title} due tomorrow`
        });
      }
      
      // 1 hour before for urgent tasks
      if (task.priority === 'urgent' || task.priority === 'high') {
        const hourBefore = new Date(deadlineDate);
        hourBefore.setHours(hourBefore.getHours() - 1);
        
        if (hourBefore > new Date()) {
          reminders.push({
            time: hourBefore,
            type: 'push',
            message: `Urgent: ${task.title} due in 1 hour`
          });
        }
      }
    }
    
    return reminders;
  }
  
  applyUserEdits(preview, edits) {
    if (!edits) return preview;
    
    return {
      ...preview,
      ...edits,
      // Preserve certain fields
      sourceEmailId: preview.sourceEmailId,
      extractedFromEmail: true,
      originalTask: preview.originalTask
    };
  }
  
  async createReminder(taskId, reminderData) {
    // Implementation depends on your reminder service
    console.log(`Creating reminder for task ${taskId}:`, reminderData);
  }
  
  generateConversionId() {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  updateStats(emailData, createdTasks, processingTime) {
    this.stats.emailsProcessed++;
    this.stats.tasksCreated += createdTasks.length;
    this.stats.extractionTime = 
      (this.stats.extractionTime * (this.stats.emailsProcessed - 1) + processingTime) / 
      this.stats.emailsProcessed;
    
    if (createdTasks.length > 0) {
      this.stats.successRate = 
        (this.stats.successRate * (this.stats.emailsProcessed - 1) + 1) / 
        this.stats.emailsProcessed;
    }
  }
  
  /**
   * Get converter statistics
   */
  getStats() {
    return {
      ...this.stats,
      patterns: Array.from(this.stats.patterns.entries()).map(([key, value]) => ({
        key,
        ...value
      }))
    };
  }
}

export default EmailToTaskConverter;