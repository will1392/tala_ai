/**
 * ReminderService - Handles task reminders and notifications
 * 
 * Manages reminder scheduling, delivery, and tracking for tasks.
 * Supports multiple notification channels and recurring reminders.
 */

import { DatabaseService } from '../db/DatabaseService.js';
import { EventEmitter } from 'events';

// Dynamic import for optional dependencies
let cron;
try {
  const cronModule = await import('node-cron');
  cron = cronModule.default;
} catch (error) {
  console.warn('node-cron not available, using mock implementation');
  // Mock cron for testing
  cron = {
    schedule: (pattern, callback) => {
      console.log(`Mock cron scheduled: ${pattern}`);
      return {
        stop: () => console.log('Mock cron stopped')
      };
    }
  };
}

export class ReminderService extends EventEmitter {
  constructor(options = {}) {
    super();
    this.db = options.db || new DatabaseService();
    this.userId = options.userId;
    
    // Notification channel handlers
    this.notificationHandlers = {
      email: this.sendEmailReminder.bind(this),
      sms: this.sendSmsReminder.bind(this),
      push: this.sendPushNotification.bind(this),
      in_app: this.sendInAppNotification.bind(this)
    };
    
    // Reminder check interval (every minute)
    this.checkInterval = options.checkInterval || '* * * * *';
    this.cronJob = null;
    
    // Reminder templates
    this.reminderTemplates = {
      task_due_soon: {
        subject: 'Task Due Soon: {task.title}',
        body: 'Your task "{task.title}" is due {time_until_due}. {task.description}'
      },
      task_overdue: {
        subject: 'Overdue Task: {task.title}',
        body: 'Your task "{task.title}" is overdue by {time_overdue}. Please complete it as soon as possible.'
      },
      flight_checkin: {
        subject: 'Flight Check-in Reminder',
        body: 'Time to check in for your flight {task.bookingReference}. Flight departs {time_until_due}.'
      },
      hotel_checkin: {
        subject: 'Hotel Check-in Today',
        body: 'You have a hotel check-in today at {task.locationData.name}. Booking: {task.bookingReference}'
      },
      document_expiry: {
        subject: 'Document Expiring Soon',
        body: 'Your {task.title} expires {time_until_due}. Please renew it before the expiry date.'
      }
    };
    
    this.initialized = false;
  }
  
  async initialize() {
    if (!this.initialized) {
      await this.db.initialize();
      
      // Start reminder checker
      this.startReminderChecker();
      
      this.initialized = true;
      console.log('🔔 ReminderService initialized');
    }
  }
  
  /**
   * Create a reminder for a task
   */
  async createReminder(reminderData) {
    try {
      const {
        taskId,
        reminderTime,
        type = 'email',
        recipientId,
        message,
        reminderOffset,
        isRecurring = false,
        recurrencePattern
      } = reminderData;
      
      // Validate reminder time is in future
      if (new Date(reminderTime) <= new Date()) {
        throw new Error('Reminder time must be in the future');
      }
      
      const result = await this.db.query(`
        INSERT INTO task_reminders (
          task_id, reminder_time, type, recipient_id, message,
          reminder_offset, is_recurring, recurrence_pattern
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        taskId, reminderTime, type, recipientId || this.userId,
        message, reminderOffset, isRecurring, recurrencePattern
      ]);
      
      const reminder = result.rows[0];
      
      console.log(`✅ Created reminder for task ${taskId} at ${reminderTime}`);
      
      this.emit('reminder:created', reminder);
      
      return reminder;
    } catch (error) {
      console.error('Error creating reminder:', error);
      throw error;
    }
  }
  
  /**
   * Create multiple reminders based on task data
   */
  async createTaskReminders(taskId, taskData) {
    const reminders = [];
    
    // Determine reminder times based on task type and due date
    if (!taskData.dueDate) return reminders;
    
    const reminderConfigs = this.getDefaultReminders(taskData);
    
    for (const config of reminderConfigs) {
      try {
        const reminderTime = new Date(taskData.dueDate);
        reminderTime.setMinutes(reminderTime.getMinutes() - config.offsetMinutes);
        
        // Only create if reminder time is in future
        if (reminderTime > new Date()) {
          const reminder = await this.createReminder({
            taskId,
            reminderTime,
            type: config.type || 'email',
            message: config.message,
            reminderOffset: config.offsetMinutes
          });
          
          reminders.push(reminder);
        }
      } catch (error) {
        console.error(`Error creating reminder for offset ${config.offsetMinutes}:`, error);
      }
    }
    
    return reminders;
  }
  
  /**
   * Update reminder
   */
  async updateReminder(reminderId, updates) {
    try {
      const allowedFields = ['reminder_time', 'type', 'message', 'status'];
      const setClause = [];
      const values = [reminderId];
      let paramIndex = 2;
      
      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key)) {
          setClause.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      }
      
      if (setClause.length === 0) {
        throw new Error('No valid fields to update');
      }
      
      const result = await this.db.query(`
        UPDATE task_reminders
        SET ${setClause.join(', ')}
        WHERE id = $1
        RETURNING *
      `, values);
      
      if (result.rows.length === 0) {
        throw new Error('Reminder not found');
      }
      
      console.log(`✅ Updated reminder ${reminderId}`);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating reminder:', error);
      throw error;
    }
  }
  
  /**
   * Cancel reminder
   */
  async cancelReminder(reminderId) {
    try {
      const result = await this.db.query(`
        UPDATE task_reminders
        SET status = 'cancelled'
        WHERE id = $1 AND status = 'scheduled'
        RETURNING *
      `, [reminderId]);
      
      if (result.rows.length === 0) {
        throw new Error('Reminder not found or already processed');
      }
      
      console.log(`✅ Cancelled reminder ${reminderId}`);
      
      this.emit('reminder:cancelled', result.rows[0]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error cancelling reminder:', error);
      throw error;
    }
  }
  
  /**
   * Get reminders for task
   */
  async getTaskReminders(taskId) {
    try {
      const result = await this.db.query(`
        SELECT * FROM task_reminders
        WHERE task_id = $1
        ORDER BY reminder_time ASC
      `, [taskId]);
      
      return result.rows;
    } catch (error) {
      console.error('Error getting task reminders:', error);
      throw error;
    }
  }
  
  /**
   * Start reminder checker cron job
   */
  startReminderChecker() {
    if (this.cronJob) {
      this.cronJob.stop();
    }
    
    this.cronJob = cron.schedule(this.checkInterval, async () => {
      await this.checkAndSendReminders();
    });
    
    console.log('🔔 Reminder checker started');
  }
  
  /**
   * Stop reminder checker
   */
  stopReminderChecker() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('🔔 Reminder checker stopped');
    }
  }
  
  /**
   * Check and send due reminders
   */
  async checkAndSendReminders() {
    try {
      // Find reminders due in the next minute
      const result = await this.db.query(`
        SELECT 
          r.*,
          t.title as task_title,
          t.description as task_description,
          t.due_date as task_due_date,
          t.travel_type as task_travel_type,
          t.booking_reference as task_booking_reference,
          t.location_data as task_location_data,
          t.custom_fields as task_custom_fields
        FROM task_reminders r
        JOIN tasks t ON r.task_id = t.id
        WHERE r.status = 'scheduled'
          AND r.reminder_time <= NOW() + INTERVAL '1 minute'
          AND r.reminder_time > NOW() - INTERVAL '1 minute'
      `);
      
      const dueReminders = result.rows;
      
      if (dueReminders.length > 0) {
        console.log(`📬 Found ${dueReminders.length} due reminders`);
        
        for (const reminder of dueReminders) {
          await this.processReminder(reminder);
        }
      }
    } catch (error) {
      console.error('Error checking reminders:', error);
      this.emit('reminder:check:error', error);
    }
  }
  
  /**
   * Process individual reminder
   */
  async processReminder(reminder) {
    try {
      // Build reminder context
      const context = {
        task: {
          id: reminder.task_id,
          title: reminder.task_title,
          description: reminder.task_description,
          dueDate: reminder.task_due_date,
          travelType: reminder.task_travel_type,
          bookingReference: reminder.task_booking_reference,
          locationData: reminder.task_location_data,
          customFields: reminder.task_custom_fields
        },
        reminder: {
          id: reminder.id,
          time: reminder.reminder_time,
          type: reminder.type,
          message: reminder.message
        },
        time_until_due: this.formatTimeDifference(
          reminder.task_due_date,
          new Date()
        )
      };
      
      // Get appropriate handler
      const handler = this.notificationHandlers[reminder.type];
      if (!handler) {
        throw new Error(`Unknown reminder type: ${reminder.type}`);
      }
      
      // Send reminder
      await handler(reminder, context);
      
      // Mark as sent
      await this.db.query(`
        UPDATE task_reminders
        SET status = 'sent', sent_at = NOW()
        WHERE id = $1
      `, [reminder.id]);
      
      console.log(`✅ Sent ${reminder.type} reminder ${reminder.id}`);
      
      this.emit('reminder:sent', {
        reminder,
        context
      });
      
      // Handle recurring reminders
      if (reminder.is_recurring) {
        await this.scheduleNextRecurrence(reminder);
      }
    } catch (error) {
      console.error(`Error processing reminder ${reminder.id}:`, error);
      
      // Mark as failed
      await this.db.query(`
        UPDATE task_reminders
        SET status = 'failed', failure_reason = $2
        WHERE id = $1
      `, [reminder.id, error.message]);
      
      this.emit('reminder:failed', {
        reminder,
        error
      });
    }
  }
  
  /**
   * Notification handlers
   */
  
  async sendEmailReminder(reminder, context) {
    // Format message
    const message = this.formatReminderMessage(
      reminder.message || this.getDefaultMessage(context),
      context
    );
    
    // In production, integrate with email service
    console.log(`📧 Email reminder to ${reminder.recipient_id}:`);
    console.log(`   Subject: Task Reminder - ${context.task.title}`);
    console.log(`   Message: ${message}`);
    
    // Simulate email sending
    this.emit('notification:email:sent', {
      to: reminder.recipient_id,
      subject: `Task Reminder - ${context.task.title}`,
      body: message
    });
  }
  
  async sendSmsReminder(reminder, context) {
    const message = this.formatReminderMessage(
      reminder.message || this.getDefaultMessage(context),
      context
    );
    
    // In production, integrate with SMS service
    console.log(`📱 SMS reminder to ${reminder.recipient_id}: ${message}`);
    
    this.emit('notification:sms:sent', {
      to: reminder.recipient_id,
      message: message.substring(0, 160) // SMS length limit
    });
  }
  
  async sendPushNotification(reminder, context) {
    const message = this.formatReminderMessage(
      reminder.message || this.getDefaultMessage(context),
      context
    );
    
    // In production, integrate with push notification service
    console.log(`🔔 Push notification to ${reminder.recipient_id}: ${message}`);
    
    this.emit('notification:push:sent', {
      userId: reminder.recipient_id,
      title: `Task: ${context.task.title}`,
      body: message,
      data: {
        taskId: context.task.id,
        reminderId: reminder.id
      }
    });
  }
  
  async sendInAppNotification(reminder, context) {
    const message = this.formatReminderMessage(
      reminder.message || this.getDefaultMessage(context),
      context
    );
    
    // Store in-app notification
    console.log(`💬 In-app notification for ${reminder.recipient_id}: ${message}`);
    
    this.emit('notification:inapp:created', {
      userId: reminder.recipient_id,
      type: 'task_reminder',
      title: `Task: ${context.task.title}`,
      message,
      taskId: context.task.id,
      reminderId: reminder.id
    });
  }
  
  /**
   * Helper methods
   */
  
  getDefaultReminders(taskData) {
    const { travelType, priority } = taskData;
    const reminders = [];
    
    // Base reminders for all tasks
    if (priority === 'urgent') {
      reminders.push(
        { offsetMinutes: 60, message: 'Urgent task due in 1 hour' },
        { offsetMinutes: 15, message: 'Urgent task due in 15 minutes' }
      );
    } else if (priority === 'high') {
      reminders.push(
        { offsetMinutes: 120, message: 'High priority task due in 2 hours' },
        { offsetMinutes: 30, message: 'High priority task due in 30 minutes' }
      );
    } else {
      reminders.push(
        { offsetMinutes: 1440, message: 'Task due tomorrow' },
        { offsetMinutes: 60, message: 'Task due in 1 hour' }
      );
    }
    
    // Travel-specific reminders
    switch (travelType) {
      case 'flight':
        reminders.push(
          { offsetMinutes: 1440, message: 'Flight check-in opens in 24 hours', type: 'email' },
          { offsetMinutes: 180, message: 'Leave for airport in 3 hours', type: 'push' }
        );
        break;
        
      case 'hotel':
        reminders.push(
          { offsetMinutes: 0, message: 'Hotel check-in time', type: 'push' }
        );
        break;
        
      case 'document':
        reminders.push(
          { offsetMinutes: 10080, message: 'Document expires in 1 week', type: 'email' },
          { offsetMinutes: 43200, message: 'Document expires in 30 days', type: 'email' }
        );
        break;
    }
    
    return reminders;
  }
  
  getDefaultMessage(context) {
    const templateKey = this.getTemplateKey(context);
    const template = this.reminderTemplates[templateKey] || this.reminderTemplates.task_due_soon;
    
    return template.body;
  }
  
  getTemplateKey(context) {
    const { task } = context;
    
    if (new Date() > new Date(task.dueDate)) {
      return 'task_overdue';
    }
    
    switch (task.travelType) {
      case 'flight':
        if (task.customFields?.automationType === 'flight_checkin') {
          return 'flight_checkin';
        }
        break;
      case 'hotel':
        if (task.title.toLowerCase().includes('check-in')) {
          return 'hotel_checkin';
        }
        break;
      case 'document':
        if (task.title.toLowerCase().includes('expir')) {
          return 'document_expiry';
        }
        break;
    }
    
    return 'task_due_soon';
  }
  
  formatReminderMessage(template, context) {
    let message = template;
    
    // Replace placeholders
    const replacements = {
      '{task.title}': context.task.title,
      '{task.description}': context.task.description || '',
      '{task.bookingReference}': context.task.bookingReference || '',
      '{task.locationData.name}': context.task.locationData?.name || '',
      '{time_until_due}': context.time_until_due,
      '{time_overdue}': context.time_overdue || ''
    };
    
    for (const [placeholder, value] of Object.entries(replacements)) {
      message = message.replace(new RegExp(placeholder, 'g'), value);
    }
    
    return message;
  }
  
  formatTimeDifference(date1, date2) {
    const diff = Math.abs(new Date(date1) - new Date(date2));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `in ${days} day${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `in ${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      const minutes = Math.floor(diff / (1000 * 60));
      return `in ${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
  }
  
  async scheduleNextRecurrence(reminder) {
    // Calculate next reminder time based on pattern
    const nextTime = this.calculateNextRecurrence(
      reminder.reminder_time,
      reminder.recurrence_pattern
    );
    
    if (nextTime) {
      await this.createReminder({
        taskId: reminder.task_id,
        reminderTime: nextTime,
        type: reminder.type,
        recipientId: reminder.recipient_id,
        message: reminder.message,
        isRecurring: true,
        recurrencePattern: reminder.recurrence_pattern
      });
    }
  }
  
  calculateNextRecurrence(currentTime, pattern) {
    const next = new Date(currentTime);
    
    switch (pattern) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      default:
        return null;
    }
    
    return next;
  }
  
  /**
   * Analytics
   */
  
  async getReminderStats(options = {}) {
    const { userId, dateFrom, dateTo } = options;
    
    let query = `
      SELECT 
        status,
        type,
        COUNT(*) as count,
        AVG(EXTRACT(EPOCH FROM (sent_at - reminder_time))) as avg_delay_seconds
      FROM task_reminders
      WHERE 1=1
    `;
    
    const values = [];
    let paramIndex = 1;
    
    if (userId) {
      query += ` AND recipient_id = $${paramIndex}`;
      values.push(userId);
      paramIndex++;
    }
    
    if (dateFrom) {
      query += ` AND reminder_time >= $${paramIndex}`;
      values.push(dateFrom);
      paramIndex++;
    }
    
    if (dateTo) {
      query += ` AND reminder_time <= $${paramIndex}`;
      values.push(dateTo);
      paramIndex++;
    }
    
    query += ' GROUP BY status, type';
    
    const result = await this.db.query(query, values);
    
    return {
      byStatus: result.rows.reduce((acc, row) => {
        if (!acc[row.status]) acc[row.status] = {};
        acc[row.status][row.type] = parseInt(row.count);
        return acc;
      }, {}),
      totalReminders: result.rows.reduce((sum, row) => sum + parseInt(row.count), 0),
      averageDelay: result.rows
        .filter(row => row.avg_delay_seconds)
        .reduce((sum, row) => sum + parseFloat(row.avg_delay_seconds), 0) / 
        result.rows.filter(row => row.avg_delay_seconds).length || 0
    };
  }
  
  /**
   * Cleanup
   */
  
  async cleanup() {
    this.stopReminderChecker();
    console.log('🔔 ReminderService cleaned up');
  }
}

export default ReminderService;