/**
 * EmailActionHandler - Handles "Send to Tala" and email actions
 * 
 * Manages the complete flow from email selection to task creation,
 * including WebSocket updates, progress tracking, and user interaction.
 */

import { EmailToTaskConverter } from './EmailToTaskConverter.js';
import { EventEmitter } from 'events';
import WebSocket from 'ws';

export class EmailActionHandler extends EventEmitter {
  constructor(options = {}) {
    super();
    this.options = {
      enableWebSocket: options.enableWebSocket !== false,
      autoProcess: options.autoProcess !== false,
      showProgress: options.showProgress !== false,
      allowEditing: options.allowEditing !== false,
      batchProcessing: options.batchProcessing !== false,
      maxBatchSize: options.maxBatchSize || 10,
      ...options
    };
    
    // Initialize converter
    this.converter = options.converter || new EmailToTaskConverter(options);
    
    // Active conversions tracking
    this.activeConversions = new Map();
    
    // WebSocket connections for real-time updates
    this.wsConnections = new Map();
    
    // Processing queue for batch operations
    this.processingQueue = [];
    this.isProcessing = false;
    
    // Action templates for common operations
    this.actionTemplates = {
      sendToTala: {
        id: 'send_to_tala',
        name: 'Send to Tala',
        icon: '🤖',
        description: 'Convert email to actionable tasks',
        shortcut: 'Ctrl+T'
      },
      createFlightTask: {
        id: 'create_flight_task',
        name: 'Create Flight Booking',
        icon: '✈️',
        description: 'Quick flight booking task',
        template: 'flight_booking'
      },
      createHotelTask: {
        id: 'create_hotel_task',
        name: 'Create Hotel Booking',
        icon: '🏨',
        description: 'Quick hotel reservation task',
        template: 'hotel_booking'
      },
      createItinerary: {
        id: 'create_itinerary',
        name: 'Create Trip Itinerary',
        icon: '📅',
        description: 'Generate complete trip tasks',
        template: 'trip_itinerary'
      },
      extractAllTasks: {
        id: 'extract_all_tasks',
        name: 'Extract All Tasks',
        icon: '📋',
        description: 'Find all action items in email',
        aggressive: true
      }
    };
    
    this.initialized = false;
  }
  
  async initialize() {
    if (!this.initialized) {
      await this.converter.initialize();
      
      // Setup converter event listeners
      this.setupConverterListeners();
      
      // Start WebSocket server if enabled
      if (this.options.enableWebSocket) {
        await this.setupWebSocketServer();
      }
      
      this.initialized = true;
      console.log('📧🎯 EmailActionHandler initialized');
    }
  }
  
  /**
   * Main handler for "Send to Tala" action
   */
  async handleSendToTala(emailData, userId, options = {}) {
    const sessionId = this.generateSessionId();
    
    try {
      // Initialize conversion session
      const session = {
        id: sessionId,
        userId,
        emailId: emailData.id,
        status: 'initializing',
        startTime: Date.now(),
        options,
        results: null,
        error: null
      };
      
      this.activeConversions.set(sessionId, session);
      
      // Notify start
      this.notifyProgress(sessionId, {
        status: 'started',
        message: 'Processing email...',
        progress: 0
      });
      
      // Step 1: Pre-process email
      session.status = 'preprocessing';
      this.notifyProgress(sessionId, {
        status: 'preprocessing',
        message: 'Analyzing email content...',
        progress: 10
      });
      
      const preprocessed = await this.preprocessEmail(emailData);
      
      // Step 2: Convert to tasks
      session.status = 'converting';
      this.notifyProgress(sessionId, {
        status: 'converting',
        message: 'Extracting tasks...',
        progress: 30
      });
      
      const conversionResult = await this.converter.convertEmailToTasks(
        preprocessed,
        {
          ...options,
          autoCreate: false // Always preview first
        }
      );
      
      session.results = conversionResult;
      
      // Step 3: Present preview
      session.status = 'preview';
      this.notifyProgress(sessionId, {
        status: 'preview',
        message: 'Tasks extracted successfully',
        progress: 70,
        data: {
          taskPreviews: conversionResult.taskPreviews,
          suggestions: conversionResult.suggestions
        }
      });
      
      // If auto-process is enabled, create tasks immediately
      if (this.options.autoProcess && !options.requireConfirmation) {
        await this.confirmAndCreateTasks(sessionId, {
          confirmed: true,
          edits: {}
        });
      }
      
      return {
        sessionId,
        success: true,
        taskCount: conversionResult.taskPreviews.length,
        requiresConfirmation: !this.options.autoProcess || options.requireConfirmation
      };
      
    } catch (error) {
      console.error('Send to Tala error:', error);
      
      const session = this.activeConversions.get(sessionId);
      if (session) {
        session.status = 'error';
        session.error = error.message;
      }
      
      this.notifyProgress(sessionId, {
        status: 'error',
        message: error.message,
        progress: 0
      });
      
      throw error;
    }
  }
  
  /**
   * Confirm and create tasks after preview
   */
  async confirmAndCreateTasks(sessionId, confirmation) {
    const session = this.activeConversions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    try {
      session.status = 'creating';
      this.notifyProgress(sessionId, {
        status: 'creating',
        message: 'Creating tasks...',
        progress: 80
      });
      
      // Apply user edits and create tasks
      const createdTasks = await this.converter.createTasksFromPreviews(
        session.results.taskPreviews,
        session.results.emailData || {},
        {
          confirmed: confirmation.confirmed,
          edits: confirmation.edits,
          rejectedTasks: confirmation.rejectedTasks
        }
      );
      
      session.results.createdTasks = createdTasks;
      session.status = 'completed';
      
      // Final notification
      this.notifyProgress(sessionId, {
        status: 'completed',
        message: `Created ${createdTasks.length} tasks successfully`,
        progress: 100,
        data: {
          createdTasks,
          emailId: session.emailId
        }
      });
      
      // Emit completion event
      this.emit('conversion:completed', {
        sessionId,
        emailId: session.emailId,
        tasksCreated: createdTasks.length,
        userId: session.userId
      });
      
      // Clean up session after a delay
      setTimeout(() => {
        this.activeConversions.delete(sessionId);
      }, 5 * 60 * 1000); // 5 minutes
      
      return {
        success: true,
        tasksCreated: createdTasks.length,
        tasks: createdTasks
      };
      
    } catch (error) {
      session.status = 'error';
      session.error = error.message;
      
      this.notifyProgress(sessionId, {
        status: 'error',
        message: `Failed to create tasks: ${error.message}`,
        progress: 0
      });
      
      throw error;
    }
  }
  
  /**
   * Handle batch email processing
   */
  async handleBatchSendToTala(emailDataArray, userId, options = {}) {
    if (!this.options.batchProcessing) {
      throw new Error('Batch processing not enabled');
    }
    
    const batchId = this.generateBatchId();
    const results = {
      batchId,
      total: emailDataArray.length,
      processed: 0,
      successful: 0,
      failed: 0,
      results: []
    };
    
    // Process in chunks
    const chunks = this.chunkArray(emailDataArray, this.options.maxBatchSize);
    
    for (const chunk of chunks) {
      const chunkResults = await Promise.allSettled(
        chunk.map(emailData => 
          this.handleSendToTala(emailData, userId, {
            ...options,
            batchId
          })
        )
      );
      
      chunkResults.forEach((result, index) => {
        results.processed++;
        
        if (result.status === 'fulfilled') {
          results.successful++;
          results.results.push({
            emailId: chunk[index].id,
            success: true,
            sessionId: result.value.sessionId,
            taskCount: result.value.taskCount
          });
        } else {
          results.failed++;
          results.results.push({
            emailId: chunk[index].id,
            success: false,
            error: result.reason.message
          });
        }
        
        // Notify batch progress
        this.emit('batch:progress', {
          batchId,
          processed: results.processed,
          total: results.total,
          percentage: Math.round((results.processed / results.total) * 100)
        });
      });
    }
    
    this.emit('batch:completed', results);
    return results;
  }
  
  /**
   * Handle quick action templates
   */
  async handleQuickAction(actionId, emailData, userId, options = {}) {
    const template = this.actionTemplates[actionId];
    if (!template) {
      throw new Error(`Unknown action: ${actionId}`);
    }
    
    switch (actionId) {
      case 'createFlightTask':
        return this.createQuickTask('flight', emailData, userId, options);
        
      case 'createHotelTask':
        return this.createQuickTask('hotel', emailData, userId, options);
        
      case 'createItinerary':
        return this.createItineraryFromEmail(emailData, userId, options);
        
      case 'extractAllTasks':
        return this.handleSendToTala(emailData, userId, {
          ...options,
          aggressive: true
        });
        
      default:
        return this.handleSendToTala(emailData, userId, options);
    }
  }
  
  /**
   * Create quick task with minimal extraction
   */
  async createQuickTask(type, emailData, userId, options = {}) {
    const sessionId = this.generateSessionId();
    
    try {
      // Create task with template
      const taskData = {
        title: `${type === 'flight' ? '✈️ Flight' : '🏨 Hotel'}: ${emailData.subject}`,
        description: `Created from email: ${emailData.subject}`,
        travelType: type,
        sourceEmailId: emailData.id,
        priority: 'medium',
        tags: [type, 'quick-create']
      };
      
      // Extract basic information
      if (type === 'flight') {
        const dates = this.extractDates(emailData.body || emailData.text);
        if (dates.length > 0) {
          taskData.customFields = { departureDate: dates[0] };
        }
      } else if (type === 'hotel') {
        const dates = this.extractDates(emailData.body || emailData.text);
        if (dates.length > 0) {
          taskData.customFields = { checkInDate: dates[0] };
        }
      }
      
      // Create task immediately
      const task = await this.createTask(taskData, userId);
      
      this.notifyProgress(sessionId, {
        status: 'completed',
        message: `Quick ${type} task created`,
        progress: 100,
        data: { task }
      });
      
      return {
        sessionId,
        success: true,
        task
      };
      
    } catch (error) {
      console.error('Quick task creation error:', error);
      throw error;
    }
  }
  
  /**
   * Create itinerary from email
   */
  async createItineraryFromEmail(emailData, userId, options = {}) {
    // Extract trip details from email
    const tripDetails = await this.extractTripDetails(emailData);
    
    if (!tripDetails.destination || !tripDetails.startDate) {
      throw new Error('Could not extract trip details from email');
    }
    
    // Create itinerary tasks
    const tasks = await this.createItineraryTasks(tripDetails, userId);
    
    return {
      success: true,
      tripDetails,
      tasksCreated: tasks.length,
      tasks
    };
  }
  
  /**
   * Get active conversion status
   */
  getConversionStatus(sessionId) {
    const session = this.activeConversions.get(sessionId);
    if (!session) {
      return null;
    }
    
    return {
      sessionId,
      status: session.status,
      progress: this.calculateProgress(session),
      emailId: session.emailId,
      startTime: session.startTime,
      duration: Date.now() - session.startTime,
      results: session.results,
      error: session.error
    };
  }
  
  /**
   * Cancel active conversion
   */
  cancelConversion(sessionId) {
    const session = this.activeConversions.get(sessionId);
    if (!session) {
      return false;
    }
    
    session.status = 'cancelled';
    this.activeConversions.delete(sessionId);
    
    this.notifyProgress(sessionId, {
      status: 'cancelled',
      message: 'Conversion cancelled',
      progress: 0
    });
    
    return true;
  }
  
  /**
   * Setup converter event listeners
   */
  setupConverterListeners() {
    this.converter.on('conversion:started', (data) => {
      this.emit('converter:started', data);
    });
    
    this.converter.on('conversion:extracted', (data) => {
      this.emit('converter:extracted', data);
    });
    
    this.converter.on('conversion:analyzed', (data) => {
      this.emit('converter:analyzed', data);
    });
    
    this.converter.on('conversion:preview', (data) => {
      this.emit('converter:preview', data);
    });
    
    this.converter.on('conversion:completed', (data) => {
      this.emit('converter:completed', data);
    });
    
    this.converter.on('conversion:error', (data) => {
      this.emit('converter:error', data);
    });
  }
  
  /**
   * WebSocket support for real-time updates
   */
  async setupWebSocketServer() {
    if (!this.options.wsPort) {
      console.log('WebSocket port not configured, skipping setup');
      return;
    }
    
    this.wss = new WebSocket.Server({ 
      port: this.options.wsPort,
      perMessageDeflate: {
        zlibDeflateOptions: {
          chunkSize: 1024,
          memLevel: 7,
          level: 3
        },
        zlibInflateOptions: {
          chunkSize: 10 * 1024
        }
      }
    });
    
    this.wss.on('connection', (ws, req) => {
      const connectionId = this.generateConnectionId();
      const userId = this.extractUserId(req);
      
      this.wsConnections.set(connectionId, {
        ws,
        userId,
        subscriptions: new Set()
      });
      
      console.log(`WebSocket connected: ${connectionId} (user: ${userId})`);
      
      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        connectionId,
        timestamp: new Date()
      }));
      
      // Handle messages
      ws.on('message', (message) => {
        this.handleWebSocketMessage(connectionId, message);
      });
      
      // Handle disconnect
      ws.on('close', () => {
        this.wsConnections.delete(connectionId);
        console.log(`WebSocket disconnected: ${connectionId}`);
      });
      
      // Handle errors
      ws.on('error', (error) => {
        console.error(`WebSocket error for ${connectionId}:`, error);
      });
    });
    
    console.log(`📡 WebSocket server listening on port ${this.options.wsPort}`);
  }
  
  /**
   * Handle WebSocket messages
   */
  handleWebSocketMessage(connectionId, message) {
    try {
      const data = JSON.parse(message);
      const connection = this.wsConnections.get(connectionId);
      
      if (!connection) return;
      
      switch (data.type) {
        case 'subscribe':
          this.handleSubscribe(connectionId, data.sessionId);
          break;
          
        case 'unsubscribe':
          this.handleUnsubscribe(connectionId, data.sessionId);
          break;
          
        case 'getStatus':
          this.handleGetStatus(connectionId, data.sessionId);
          break;
          
        case 'confirmTasks':
          this.handleConfirmTasks(connectionId, data.sessionId, data.confirmation);
          break;
          
        case 'cancelConversion':
          this.handleCancelConversion(connectionId, data.sessionId);
          break;
          
        default:
          console.warn(`Unknown WebSocket message type: ${data.type}`);
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  }
  
  /**
   * Handle subscription to conversion updates
   */
  handleSubscribe(connectionId, sessionId) {
    const connection = this.wsConnections.get(connectionId);
    if (connection) {
      connection.subscriptions.add(sessionId);
      
      // Send current status
      const status = this.getConversionStatus(sessionId);
      if (status) {
        connection.ws.send(JSON.stringify({
          type: 'status',
          sessionId,
          data: status
        }));
      }
    }
  }
  
  /**
   * Handle unsubscribe
   */
  handleUnsubscribe(connectionId, sessionId) {
    const connection = this.wsConnections.get(connectionId);
    if (connection) {
      connection.subscriptions.delete(sessionId);
    }
  }
  
  /**
   * Handle status request
   */
  handleGetStatus(connectionId, sessionId) {
    const connection = this.wsConnections.get(connectionId);
    if (!connection) return;
    
    const status = this.getConversionStatus(sessionId);
    connection.ws.send(JSON.stringify({
      type: 'status',
      sessionId,
      data: status || { error: 'Session not found' }
    }));
  }
  
  /**
   * Handle task confirmation via WebSocket
   */
  async handleConfirmTasks(connectionId, sessionId, confirmation) {
    const connection = this.wsConnections.get(connectionId);
    if (!connection) return;
    
    try {
      const result = await this.confirmAndCreateTasks(sessionId, confirmation);
      
      connection.ws.send(JSON.stringify({
        type: 'confirmationResult',
        sessionId,
        success: true,
        data: result
      }));
    } catch (error) {
      connection.ws.send(JSON.stringify({
        type: 'confirmationResult',
        sessionId,
        success: false,
        error: error.message
      }));
    }
  }
  
  /**
   * Handle conversion cancellation
   */
  handleCancelConversion(connectionId, sessionId) {
    const connection = this.wsConnections.get(connectionId);
    if (!connection) return;
    
    const cancelled = this.cancelConversion(sessionId);
    
    connection.ws.send(JSON.stringify({
      type: 'cancellationResult',
      sessionId,
      success: cancelled
    }));
  }
  
  /**
   * Notify progress to WebSocket subscribers
   */
  notifyProgress(sessionId, progress) {
    // Emit event
    this.emit('progress', {
      sessionId,
      ...progress
    });
    
    // Send to WebSocket subscribers
    if (this.wss) {
      const message = JSON.stringify({
        type: 'progress',
        sessionId,
        ...progress
      });
      
      this.wsConnections.forEach((connection) => {
        if (connection.subscriptions.has(sessionId)) {
          try {
            connection.ws.send(message);
          } catch (error) {
            console.error('Failed to send progress:', error);
          }
        }
      });
    }
  }
  
  /**
   * Helper methods
   */
  
  async preprocessEmail(emailData) {
    // Add any preprocessing steps here
    return {
      ...emailData,
      preprocessed: true,
      timestamp: new Date()
    };
  }
  
  extractDates(text) {
    const dates = [];
    const patterns = [
      /(\d{1,2}\/\d{1,2}\/\d{2,4})/g,
      /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/gi
    ];
    
    patterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      dates.push(...matches);
    });
    
    return dates;
  }
  
  async extractTripDetails(emailData) {
    const text = emailData.subject + ' ' + (emailData.body || emailData.text || '');
    
    // Simple extraction - in production use NLP
    const details = {
      destination: null,
      startDate: null,
      endDate: null,
      travelers: 1
    };
    
    // Extract destination (simple pattern matching)
    const destMatch = text.match(/(?:to|in|at)\s+([A-Z][a-zA-Z\s]+)(?:,|\.|\s|$)/);
    if (destMatch) {
      details.destination = destMatch[1].trim();
    }
    
    // Extract dates
    const dates = this.extractDates(text);
    if (dates.length > 0) {
      details.startDate = new Date(dates[0]);
      if (dates.length > 1) {
        details.endDate = new Date(dates[1]);
      }
    }
    
    // Extract traveler count
    const travelersMatch = text.match(/(\d+)\s*(?:people|persons|travelers|guests)/i);
    if (travelersMatch) {
      details.travelers = parseInt(travelersMatch[1]);
    }
    
    return details;
  }
  
  async createTask(taskData, userId) {
    // This would integrate with your TaskManager
    console.log('Creating task:', taskData);
    return {
      id: this.generateTaskId(),
      ...taskData,
      createdBy: userId,
      createdAt: new Date()
    };
  }
  
  async createItineraryTasks(tripDetails, userId) {
    // This would integrate with your TaskAutomation service
    console.log('Creating itinerary tasks:', tripDetails);
    return [];
  }
  
  calculateProgress(session) {
    const statusProgress = {
      initializing: 5,
      preprocessing: 10,
      converting: 50,
      preview: 70,
      creating: 85,
      completed: 100,
      error: 0,
      cancelled: 0
    };
    
    return statusProgress[session.status] || 0;
  }
  
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
  
  extractUserId(req) {
    // Extract user ID from request headers or query
    return req.headers['x-user-id'] || 
           req.url.match(/userId=([^&]+)/)?.[1] || 
           'anonymous';
  }
  
  generateSessionId() {
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  generateBatchId() {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  generateConnectionId() {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  generateTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Get action templates
   */
  getAvailableActions() {
    return Object.values(this.actionTemplates);
  }
  
  /**
   * Register custom action template
   */
  registerActionTemplate(template) {
    this.actionTemplates[template.id] = template;
    this.emit('action:registered', template);
  }
  
  /**
   * Get statistics
   */
  getStatistics() {
    return {
      activeConversions: this.activeConversions.size,
      wsConnections: this.wsConnections.size,
      converterStats: this.converter.getStats()
    };
  }
}

export default EmailActionHandler;