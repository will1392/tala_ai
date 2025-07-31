/**
 * TaskCreatorAgent - Agent for creating new tasks directly from user requests
 * 
 * Handles direct task creation when users ask to create tasks, todos, or reminders
 */

import BaseAgent from './BaseAgent.js';
import TaskManager from '../tasks/TaskManager.js';
import { getSharedDb, initializeSharedDb } from '../db/sharedDatabase.js';
import userResolver from '../auth/UserResolver.js';
import { getSupabaseService } from '../../db/supabaseClient.js';
import { v4 as uuidv4 } from 'uuid';

export class TaskCreatorAgent extends BaseAgent {
  constructor(options = {}) {
    super({
      ...options,
      preferredLLM: 'gpt-4o-mini',
      confidence_threshold: 0.8,
      temperature: 0.3
    });
    
    this.userId = options.userId; // May be provided in constructor
    this.taskManager = null;
    this.initialized = false;
  }

  async initialize() {
    if (!this.initialized) {
      console.log('🔧 TaskCreatorAgent initializing...');
      const sharedDb = await initializeSharedDb();
      console.log('🔧 Got shared DB instance:', !!sharedDb);
      console.log('🔧 DB mockData has tasks:', sharedDb.mockData?.has('tasks'));
      
      this.taskManager = new TaskManager({ 
        userId: this.userId,
        db: sharedDb 
      });
      await this.taskManager.initialize();
      this.initialized = true;
      console.log('🔧 TaskCreatorAgent initialized with TaskManager');
    }
  }

  /**
   * Get agent capabilities
   */
  getCapabilities() {
    return [
      'task-creation',
      'todo-creation',
      'reminder-creation',
      'task-management'
    ];
  }

  /**
   * Get agent specialization
   */
  getSpecialization() {
    return 'task-creation';
  }

  /**
   * Get preferred LLM
   */
  getPreferredLLM() {
    return 'gpt-4o-mini';
  }

  /**
   * Get supported task types
   */
  getSupportedTaskTypes() {
    return [
      'create-task',
      'create-todo',
      'create-reminder',
      'add-task'
    ];
  }

  /**
   * Evaluate if agent can handle task
   */
  async evaluateTask(task) {
    // High confidence for task creation
    if (task.type && task.type.includes('create-task')) {
      return 0.95;
    }
    
    // Check for creation keywords
    const keywords = ['create', 'add', 'make', 'new', 'task', 'todo', 'reminder'];
    const taskText = JSON.stringify(task).toLowerCase();
    
    const createKeywords = ['create', 'add', 'make', 'new'];
    const taskKeywords = ['task', 'todo', 'reminder'];
    
    const hasCreateKeyword = createKeywords.some(keyword => taskText.includes(keyword));
    const hasTaskKeyword = taskKeywords.some(keyword => taskText.includes(keyword));
    
    if (hasCreateKeyword && hasTaskKeyword) {
      return 0.9;
    }
    
    return 0.2;
  }

  /**
   * Validate task
   */
  async validateTask(task) {
    // Ensure we're initialized
    if (!this.initialized) {
      await this.initialize();
    }
    
    // We can work with minimal information
    return { valid: true };
  }

  /**
   * Perform task creation
   */
  async performTask(task, context) {
    console.log('📝 Creating new task');
    console.log('📊 Task object:', { 
      hasUserId: !!task.userId, 
      hasDataUserId: !!task.data?.userId,
      constructorUserId: this.userId 
    });
    
    try {
      // Get userId from task object if not already set
      const originalUserId = task.userId || task.data?.userId || this.userId;
      console.log(`👤 Original userId: ${originalUserId}`);
      
      if (!originalUserId) {
        throw new Error('No userId provided for task creation');
      }
      
      // Resolve to proper UUID
      const userId = await userResolver.resolveUserId(originalUserId);
      console.log(`🔄 Resolved to UUID: ${userId}`);
      
      // Ensure task manager has the correct UUID
      if (this.taskManager && this.taskManager.userId !== userId) {
        console.log(`🔄 Updating TaskManager userId from ${this.taskManager.userId} to ${userId}`);
        this.taskManager.userId = userId;
      }
      
      // Extract task details from the request
      const taskDetails = await this.extractTaskDetails(task, context);
      
      // Create the task
      // Create task directly in Supabase
      const supabase = getSupabaseService();
      const taskId = uuidv4();
      
      const supabaseTask = {
        id: taskId,
        title: taskDetails.title,
        description: taskDetails.description || '',
        status: taskDetails.status || 'pending',
        priority: taskDetails.priority || 'medium',
        due_date: taskDetails.dueDate ? new Date(taskDetails.dueDate).toISOString() : null,
        created_by: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tags: taskDetails.tags || []
        // TODO: Add metadata once column is added to database
        // metadata: {
        //   source: 'chat',
        //   originalUserId: originalUserId,
        //   agentId: this.id,
        //   ...(taskDetails.metadata || {})
        // }
      };
      
      console.log('📝 Creating task in Supabase:', supabaseTask);
      
      const { data: createdTask, error } = await supabase
        .from('tasks')
        .insert([supabaseTask])
        .select()
        .single();
      
      if (error) {
        console.error('❌ Supabase task creation error:', error);
        throw new Error(`Failed to create task: ${error.message}`);
      }
      
      console.log('✅ Task created in Supabase:', createdTask.id);
      
      // Task is now stored in Supabase PostgreSQL database
      
      // Return the task directly - BaseAgent will wrap it
      return {
        task: createdTask,
        message: `Task "${createdTask.title}" has been created successfully.`,
        actions: this.suggestNextActions(createdTask),
        metadata: {
          taskId: createdTask.id,
          title: createdTask.title,
          priority: createdTask.priority
        }
      };
      
    } catch (error) {
      console.error('Task creation error:', error);
      throw error;
    }
  }

  /**
   * Extract task details from request
   */
  async extractTaskDetails(task, context) {
    const content = task.content || '';
    const data = task.data || {};
    
    // Start with any pre-extracted data
    let taskDetails = {
      title: data.taskTitle || '',
      description: '',
      priority: 'medium',
      status: 'pending',
      tags: []
    };
    
    // If we have a full task description in the content, use simple extraction
    if (content && !taskDetails.title) {
      // Simple extraction without LLM for now
      taskDetails.title = this.extractSimpleTitle(content);
      
      // Set the full content as description
      taskDetails.description = this.fullTaskContent || content;
      
      // Extract priority from keywords
      if (content.toLowerCase().includes('urgent') || content.toLowerCase().includes('asap')) {
        taskDetails.priority = 'high';
      } else if (content.toLowerCase().includes('low priority') || content.toLowerCase().includes('whenever')) {
        taskDetails.priority = 'low';
      }
      
      // Extract due date patterns with time
      const timePattern = /(\d{1,2})(:\d{2})?\s*(am|pm|AM|PM)/;
      const timeMatch = content.match(timePattern);
      
      const tomorrowMatch = content.match(/tomorrow/i);
      const todayMatch = content.match(/today|tonight/i);
      const nextWeekMatch = content.match(/next week/i);
      
      if (todayMatch) {
        taskDetails.dueDate = new Date();
        if (timeMatch) {
          this.setTimeFromMatch(taskDetails.dueDate, timeMatch);
        }
      } else if (tomorrowMatch) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        taskDetails.dueDate = tomorrow;
        if (timeMatch) {
          this.setTimeFromMatch(taskDetails.dueDate, timeMatch);
        }
      } else if (nextWeekMatch) {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        taskDetails.dueDate = nextWeek;
      }
    }
    
    // Ensure we have at least a title
    if (!taskDetails.title) {
      taskDetails.title = 'New Task';
    }
    
    // Add context-based enhancements
    if (context?.userProfile?.preferences) {
      // Apply user preferences
      if (context.userProfile.preferences.defaultPriority) {
        taskDetails.priority = context.userProfile.preferences.defaultPriority;
      }
    }
    
    return taskDetails;
  }

  /**
   * Extract simple title from content
   */
  extractSimpleTitle(content) {
    // Save the full content for description
    this.fullTaskContent = content;
    
    // Remove common prefixes - be more specific to avoid removing too much
    let cleanContent = content
      .replace(/^(can you\s+|could you\s+|please\s+|would you\s+)?/i, '') // Remove polite prefixes
      .replace(/^(create|add|make)\s+(a\s+)?(new\s+)?(task|todo|reminder)\s+(to\s+|for\s+|that\s+|about\s+)?/i, '') // Remove task creation phrases
      .replace(/^remind me to\s+/i, '') // Remove "remind me to"
      .trim();
    
    // If we removed too much and have nothing left, try a simpler approach
    if (!cleanContent || cleanContent.length < 5) {
      // Try to find the actual task content after common patterns
      const patterns = [
        /(?:create|add|make)\s+(?:a\s+)?(?:task|todo|reminder)\s+(?:to|for|that|about)\s+(.+)/i,
        /remind me to\s+(.+)/i,
        /(?:can you|could you|please)\s+(.+)/i,
        /(?:i need to|need to|have to)\s+(.+)/i
      ];
      
      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match && match[1]) {
          cleanContent = match[1].trim();
          break;
        }
      }
    }
    
    // Extract the main action/subject for the title
    let title = this.extractConciseTitle(cleanContent);
    
    // Capitalize first letter
    if (title.length > 0) {
      title = title.charAt(0).toUpperCase() + title.slice(1);
    }
    
    return title || 'New Task';
  }
  
  /**
   * Extract a concise title from the task content
   */
  extractConciseTitle(content) {
    // Common patterns to extract concise titles
    const patterns = [
      // "reach out to X" -> "Reach out to X"
      /^(reach out to|contact|call|email|message|text)\s+([^\s]+(?:\s+[^\s]+)?)/i,
      // "book/schedule X" -> "Book X" or "Schedule X"
      /^(book|schedule|reserve|arrange)\s+([^\s]+(?:\s+[^\s]+)?)/i,
      // "review/check X" -> "Review X" or "Check X"
      /^(review|check|verify|confirm|look at|go over)\s+([^\s]+(?:\s+[^\s]+)?)/i,
      // "send/submit X" -> "Send X" or "Submit X"
      /^(send|submit|deliver|forward)\s+([^\s]+(?:\s+[^\s]+)?)/i,
      // "prepare/create X" -> "Prepare X" or "Create X"
      /^(prepare|create|write|draft|make)\s+([^\s]+(?:\s+[^\s]+)?)/i,
      // "follow up on/with X" -> "Follow up with X"
      /^(follow up (?:on|with))\s+([^\s]+(?:\s+[^\s]+)?)/i,
      // "X needs to be done" -> "X"
      /^([^\s]+(?:\s+[^\s]+)?)\s+needs?\s+to\s+be/i,
      // "need to X" -> "X"
      /^need(?:s)?\s+to\s+(.+)/i,
      // "have to X" -> "X"
      /^(?:I\s+)?(?:have|need)\s+to\s+(.+)/i
    ];
    
    // Try each pattern
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        // Get the captured groups
        if (match[2]) {
          // Pattern with action + object
          const action = match[1];
          const object = match[2];
          
          // Clean up the object part - remove time/date info
          const cleanObject = object
            .replace(/\s+(by|before|after|at|on|tomorrow|today|tonight|this\s+\w+|next\s+\w+).*$/i, '')
            .replace(/\s+\d{1,2}(:\d{2})?\s*(am|pm)?.*$/i, '')
            .trim();
          
          return `${action} ${cleanObject}`.toLowerCase();
        } else if (match[1]) {
          // Pattern with just the main part
          const mainPart = match[1]
            .replace(/\s+(by|before|after|at|on|tomorrow|today|tonight|this\s+\w+|next\s+\w+).*$/i, '')
            .replace(/\s+\d{1,2}(:\d{2})?\s*(am|pm)?.*$/i, '')
            .trim();
          
          return mainPart.toLowerCase();
        }
      }
    }
    
    // If no pattern matches, extract first few important words
    const words = content.split(' ');
    const importantWords = [];
    const skipWords = ['the', 'a', 'an', 'to', 'for', 'and', 'or', 'but', 'in', 'on', 'at', 'by'];
    
    for (const word of words) {
      if (!skipWords.includes(word.toLowerCase())) {
        importantWords.push(word);
        if (importantWords.length >= 3) break;
      }
    }
    
    return importantWords.join(' ').toLowerCase();
  }

  /**
   * Suggest next actions for created task
   */
  /**
   * Set time from regex match
   */
  setTimeFromMatch(date, timeMatch) {
    let hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2].substring(1)) : 0;
    const isPM = timeMatch[3].toLowerCase() === 'pm';
    
    if (isPM && hours !== 12) {
      hours += 12;
    } else if (!isPM && hours === 12) {
      hours = 0;
    }
    
    date.setHours(hours, minutes, 0, 0);
  }
  
  suggestNextActions(task) {
    const actions = [];
    
    // Suggest setting a due date if none
    if (!task.dueDate) {
      actions.push({
        type: 'set-due-date',
        label: 'Set a due date',
        prompt: `When should "${task.title}" be completed?`
      });
    }
    
    // Suggest adding details if description is empty
    if (!task.description) {
      actions.push({
        type: 'add-description',
        label: 'Add more details',
        prompt: 'Would you like to add more details to this task?'
      });
    }
    
    // Suggest priority adjustment
    if (task.priority === 'medium') {
      actions.push({
        type: 'adjust-priority',
        label: 'Adjust priority',
        prompt: 'Is this task high priority or can it wait?'
      });
    }
    
    return actions;
  }

  /**
   * Get required result fields
   */
  getRequiredResultFields() {
    return ['task'];
  }

  /**
   * Perform result validation
   */
  async performResultValidation(result) {
    // Check for task in data field (wrapped by BaseAgent) or at top level
    const task = result.data?.task || result.task;
    
    if (!task) {
      return { valid: false, reason: 'No task created' };
    }
    
    if (!task.id || !task.title) {
      return { valid: false, reason: 'Invalid task object' };
    }
    
    return { valid: true };
  }
}

export default TaskCreatorAgent;