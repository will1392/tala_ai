/**
 * TaskManager - Core service for task CRUD operations
 * 
 * Handles all basic task operations including create, read, update, delete,
 * as well as assignment management and dependency tracking.
 */

import { getSharedDb } from '../db/sharedDatabase.js';
import { randomUUID } from 'crypto';

// Use built-in crypto.randomUUID for UUID generation
const uuidv4 = () => randomUUID();

export class TaskManager {
  constructor(options = {}) {
    this.db = options.db || getSharedDb();
    this.userId = options.userId;
    this.initialized = false;
  }

  async initialize() {
    if (!this.initialized) {
      await this.db.initialize();
      this.initialized = true;
      console.log('✅ TaskManager initialized');
    }
  }

  /**
   * Create a new task
   */
  async createTask(taskData) {
    try {
      const {
        title,
        description,
        status = 'pending',
        priority = 'medium',
        dueDate,
        travelType,
        bookingReference,
        locationData,
        sourceEmailId,
        tags = [],
        customFields = {},
        estimatedDuration,
        assignees = []
      } = taskData;

      // Validate required fields
      if (!title) {
        throw new Error('Task title is required');
      }

      // Create task
      const taskId = uuidv4();
      const task = await this.db.transaction(async (client) => {
        // Insert task
        const taskResult = await client.query(`
          INSERT INTO tasks (
            id, title, description, status, priority, due_date,
            created_by, travel_type, booking_reference, location_data,
            source_email_id, extracted_from_email, tags, custom_fields,
            estimated_duration
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
          ) RETURNING *
        `, [
          taskId, title, description, status, priority, dueDate,
          this.userId, travelType, bookingReference, locationData,
          sourceEmailId, !!sourceEmailId, tags, customFields,
          estimatedDuration
        ]);

        const task = taskResult.rows[0];

        // Add task history entry
        await this.addHistory(client, taskId, 'created', this.userId, {
          comment: 'Task created'
        });

        // Handle assignees
        if (assignees.length > 0) {
          for (const assignee of assignees) {
            await this.assignTask(client, taskId, assignee.userId, assignee.role || 'assignee');
          }
        }

        return task;
      });

      console.log(`✅ Task created: ${taskId}`);
      return this.formatTask(task);
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  /**
   * Get task by ID
   */
  async getTask(taskId) {
    try {
      const result = await this.db.query(`
        SELECT 
          t.*,
          array_agg(
            DISTINCT jsonb_build_object(
              'id', ta.id,
              'userId', ta.user_id,
              'role', ta.role,
              'assignedAt', ta.assigned_at
            )
          ) FILTER (WHERE ta.id IS NOT NULL) as assignments,
          array_agg(
            DISTINCT jsonb_build_object(
              'id', td.id,
              'dependsOnTaskId', td.depends_on_task_id,
              'dependencyType', td.dependency_type
            )
          ) FILTER (WHERE td.id IS NOT NULL) as dependencies,
          array_agg(
            DISTINCT jsonb_build_object(
              'id', tatt.id,
              'documentId', tatt.document_id,
              'emailId', tatt.email_id,
              'fileName', tatt.file_name,
              'attachmentType', tatt.attachment_type
            )
          ) FILTER (WHERE tatt.id IS NOT NULL) as attachments,
          COUNT(DISTINCT tr.id) FILTER (WHERE tr.status = 'scheduled') as pending_reminders
        FROM tasks t
        LEFT JOIN task_assignments ta ON t.id = ta.task_id
        LEFT JOIN task_dependencies td ON t.id = td.task_id
        LEFT JOIN task_attachments tatt ON t.id = tatt.task_id
        LEFT JOIN task_reminders tr ON t.id = tr.task_id
        WHERE t.id = $1
        GROUP BY t.id
      `, [taskId]);

      if (result.rows.length === 0) {
        throw new Error('Task not found');
      }

      return this.formatTask(result.rows[0]);
    } catch (error) {
      console.error('Error getting task:', error);
      throw error;
    }
  }

  /**
   * Update task
   */
  async updateTask(taskId, updates) {
    try {
      const allowedFields = [
        'title', 'description', 'status', 'priority', 'due_date',
        'travel_type', 'booking_reference', 'location_data',
        'tags', 'custom_fields', 'estimated_duration', 'actual_duration'
      ];

      // Filter updates to allowed fields
      const validUpdates = {};
      const changes = [];
      
      for (const [key, value] of Object.entries(updates)) {
        const dbField = this.camelToSnake(key);
        if (allowedFields.includes(dbField)) {
          validUpdates[dbField] = value;
        }
      }

      if (Object.keys(validUpdates).length === 0) {
        throw new Error('No valid fields to update');
      }

      const task = await this.db.transaction(async (client) => {
        // Get current task state for history
        const currentResult = await client.query(
          'SELECT * FROM tasks WHERE id = $1',
          [taskId]
        );
        
        if (currentResult.rows.length === 0) {
          throw new Error('Task not found');
        }
        
        const currentTask = currentResult.rows[0];

        // Build update query
        const setClause = [];
        const values = [taskId];
        let paramIndex = 2;

        for (const [field, value] of Object.entries(validUpdates)) {
          setClause.push(`${field} = $${paramIndex}`);
          values.push(value);
          
          // Track changes for history
          if (currentTask[field] !== value) {
            changes.push({
              field,
              oldValue: currentTask[field],
              newValue: value
            });
          }
          
          paramIndex++;
        }

        // Special handling for status changes
        if (validUpdates.status === 'completed' && currentTask.status !== 'completed') {
          setClause.push(`completed_at = $${paramIndex}`);
          values.push(new Date());
        }

        // Update task
        const updateResult = await client.query(`
          UPDATE tasks 
          SET ${setClause.join(', ')}
          WHERE id = $1
          RETURNING *
        `, values);

        const updatedTask = updateResult.rows[0];

        // Add history entries for each change
        for (const change of changes) {
          await this.addHistory(client, taskId, 'updated', this.userId, {
            fieldName: change.field,
            oldValue: change.oldValue,
            newValue: change.newValue
          });
        }

        return updatedTask;
      });

      console.log(`✅ Task updated: ${taskId}`);
      return this.formatTask(task);
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  /**
   * Delete task
   */
  async deleteTask(taskId) {
    try {
      await this.db.transaction(async (client) => {
        // Check if task exists
        const checkResult = await client.query(
          'SELECT id FROM tasks WHERE id = $1',
          [taskId]
        );
        
        if (checkResult.rows.length === 0) {
          throw new Error('Task not found');
        }

        // Delete task (cascades to related tables)
        await client.query('DELETE FROM tasks WHERE id = $1', [taskId]);
      });

      console.log(`✅ Task deleted: ${taskId}`);
      return { success: true, taskId };
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  /**
   * List tasks with filters
   */
  async listTasks(filters = {}) {
    try {
      const {
        status,
        priority,
        assignedTo,
        createdBy,
        dueAfter,
        dueBefore,
        tags,
        travelType,
        search,
        limit = 50,
        offset = 0,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = filters;

      let query = `
        SELECT 
          t.*,
          array_agg(DISTINCT ta.user_id) FILTER (WHERE ta.role = 'assignee') as assignees,
          COUNT(DISTINCT td.depends_on_task_id) as dependency_count,
          COUNT(DISTINCT tr.id) FILTER (WHERE tr.status = 'scheduled') as pending_reminders
        FROM tasks t
        LEFT JOIN task_assignments ta ON t.id = ta.task_id
        LEFT JOIN task_dependencies td ON t.id = td.task_id
        LEFT JOIN task_reminders tr ON t.id = tr.task_id
        WHERE 1=1
      `;

      const values = [];
      let paramIndex = 1;

      // Apply filters
      if (status) {
        query += ` AND t.status = $${paramIndex}`;
        values.push(status);
        paramIndex++;
      }

      if (priority) {
        query += ` AND t.priority = $${paramIndex}`;
        values.push(priority);
        paramIndex++;
      }

      if (createdBy) {
        query += ` AND t.created_by = $${paramIndex}`;
        values.push(createdBy);
        paramIndex++;
      }

      if (dueAfter) {
        query += ` AND t.due_date >= $${paramIndex}`;
        values.push(dueAfter);
        paramIndex++;
      }

      if (dueBefore) {
        query += ` AND t.due_date <= $${paramIndex}`;
        values.push(dueBefore);
        paramIndex++;
      }

      if (tags && tags.length > 0) {
        query += ` AND t.tags && $${paramIndex}`;
        values.push(tags);
        paramIndex++;
      }

      if (travelType) {
        query += ` AND t.travel_type = $${paramIndex}`;
        values.push(travelType);
        paramIndex++;
      }

      if (search) {
        query += ` AND (t.title ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`;
        values.push(`%${search}%`);
        paramIndex++;
      }

      // Group by and having clause for assignee filter
      query += ' GROUP BY t.id';
      
      if (assignedTo) {
        query += ` HAVING $${paramIndex} = ANY(array_agg(ta.user_id))`;
        values.push(assignedTo);
        paramIndex++;
      }

      // Add sorting
      const allowedSortFields = ['created_at', 'due_date', 'priority', 'status', 'title'];
      const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
      const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
      query += ` ORDER BY t.${sortField} ${order}`;

      // Add pagination
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      values.push(limit, offset);

      const result = await this.db.query(query, values);

      // Get total count
      let countQuery = `
        SELECT COUNT(DISTINCT t.id) as total
        FROM tasks t
        LEFT JOIN task_assignments ta ON t.id = ta.task_id
        WHERE 1=1
      `;
      
      // Apply same filters for count (excluding pagination)
      const countValues = values.slice(0, -2);
      if (status) countQuery += ' AND t.status = $1';
      // ... (apply other filters similarly)

      const countResult = await this.db.query(countQuery, countValues);
      const total = parseInt(countResult.rows[0].total);

      return {
        tasks: result.rows.map(task => this.formatTask(task)),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      };
    } catch (error) {
      console.error('Error listing tasks:', error);
      throw error;
    }
  }

  /**
   * Assign task to user
   */
  async assignTask(client, taskId, userId, role = 'assignee') {
    try {
      // Use provided client or default db
      const dbClient = client || this.db;

      await dbClient.query(`
        INSERT INTO task_assignments (task_id, user_id, role, assigned_by)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (task_id, user_id) DO UPDATE 
        SET role = $3, assigned_by = $4, assigned_at = CURRENT_TIMESTAMP
      `, [taskId, userId, role, this.userId]);

      // Add history entry
      await this.addHistory(dbClient, taskId, 'assigned', this.userId, {
        comment: `Task assigned to user ${userId} as ${role}`
      });

      console.log(`✅ Task ${taskId} assigned to ${userId} as ${role}`);
    } catch (error) {
      console.error('Error assigning task:', error);
      throw error;
    }
  }

  /**
   * Unassign task from user
   */
  async unassignTask(taskId, userId, role = 'assignee') {
    try {
      await this.db.query(`
        DELETE FROM task_assignments 
        WHERE task_id = $1 AND user_id = $2 AND role = $3
      `, [taskId, userId, role]);

      // Add history entry
      await this.addHistory(this.db, taskId, 'unassigned', this.userId, {
        comment: `Task unassigned from user ${userId} (role: ${role})`
      });

      console.log(`✅ Task ${taskId} unassigned from ${userId}`);
    } catch (error) {
      console.error('Error unassigning task:', error);
      throw error;
    }
  }

  /**
   * Add task dependency
   */
  async addDependency(taskId, dependsOnTaskId, dependencyType = 'blocks') {
    try {
      await this.db.query(`
        INSERT INTO task_dependencies (task_id, depends_on_task_id, dependency_type)
        VALUES ($1, $2, $3)
      `, [taskId, dependsOnTaskId, dependencyType]);

      // Add history entry
      await this.addHistory(this.db, taskId, 'dependency_added', this.userId, {
        comment: `Added dependency: ${dependencyType} task ${dependsOnTaskId}`
      });

      console.log(`✅ Dependency added: ${taskId} ${dependencyType} ${dependsOnTaskId}`);
    } catch (error) {
      if (error.message.includes('Circular dependency')) {
        throw new Error('Cannot add dependency: would create circular dependency');
      }
      console.error('Error adding dependency:', error);
      throw error;
    }
  }

  /**
   * Remove task dependency
   */
  async removeDependency(taskId, dependsOnTaskId) {
    try {
      await this.db.query(`
        DELETE FROM task_dependencies 
        WHERE task_id = $1 AND depends_on_task_id = $2
      `, [taskId, dependsOnTaskId]);

      // Add history entry
      await this.addHistory(this.db, taskId, 'dependency_removed', this.userId, {
        comment: `Removed dependency on task ${dependsOnTaskId}`
      });

      console.log(`✅ Dependency removed: ${taskId} -> ${dependsOnTaskId}`);
    } catch (error) {
      console.error('Error removing dependency:', error);
      throw error;
    }
  }

  /**
   * Add attachment to task
   */
  async addAttachment(taskId, attachment) {
    try {
      const {
        documentId,
        emailId,
        attachmentType,
        fileName,
        fileSize,
        mimeType,
        url,
        description
      } = attachment;

      const result = await this.db.query(`
        INSERT INTO task_attachments (
          task_id, document_id, email_id, attachment_type,
          file_name, file_size, mime_type, url, description, uploaded_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `, [
        taskId, documentId, emailId, attachmentType,
        fileName, fileSize, mimeType, url, description, this.userId
      ]);

      // Add history entry
      await this.addHistory(this.db, taskId, 'attachment_added', this.userId, {
        comment: `Added ${attachmentType} attachment: ${fileName || 'Untitled'}`
      });

      console.log(`✅ Attachment added to task ${taskId}`);
      return result.rows[0];
    } catch (error) {
      console.error('Error adding attachment:', error);
      throw error;
    }
  }

  /**
   * Remove attachment from task
   */
  async removeAttachment(taskId, attachmentId) {
    try {
      // Get attachment info for history
      const attachmentResult = await this.db.query(
        'SELECT file_name, attachment_type FROM task_attachments WHERE id = $1 AND task_id = $2',
        [attachmentId, taskId]
      );

      if (attachmentResult.rows.length === 0) {
        throw new Error('Attachment not found');
      }

      const attachment = attachmentResult.rows[0];

      await this.db.query(
        'DELETE FROM task_attachments WHERE id = $1 AND task_id = $2',
        [attachmentId, taskId]
      );

      // Add history entry
      await this.addHistory(this.db, taskId, 'attachment_removed', this.userId, {
        comment: `Removed ${attachment.attachment_type} attachment: ${attachment.file_name || 'Untitled'}`
      });

      console.log(`✅ Attachment removed from task ${taskId}`);
    } catch (error) {
      console.error('Error removing attachment:', error);
      throw error;
    }
  }

  /**
   * Get task history
   */
  async getTaskHistory(taskId, limit = 50) {
    try {
      const result = await this.db.query(`
        SELECT * FROM task_history 
        WHERE task_id = $1 
        ORDER BY timestamp DESC 
        LIMIT $2
      `, [taskId, limit]);

      return result.rows.map(entry => ({
        id: entry.id,
        action: entry.action,
        userId: entry.user_id,
        timestamp: entry.timestamp,
        fieldName: entry.field_name,
        oldValue: entry.old_value,
        newValue: entry.new_value,
        comment: entry.comment,
        metadata: entry.metadata
      }));
    } catch (error) {
      console.error('Error getting task history:', error);
      throw error;
    }
  }

  /**
   * Get overdue tasks
   */
  async getOverdueTasks(userId = null) {
    try {
      let query = `
        SELECT * FROM overdue_tasks
        WHERE 1=1
      `;
      const values = [];

      if (userId) {
        query += ' AND created_by = $1';
        values.push(userId);
      }

      const result = await this.db.query(query, values);
      return result.rows.map(task => this.formatTask(task));
    } catch (error) {
      console.error('Error getting overdue tasks:', error);
      throw error;
    }
  }

  /**
   * Get task statistics for user
   */
  async getUserTaskStats(userId) {
    try {
      const result = await this.db.query(
        'SELECT * FROM task_completion_stats WHERE user_id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return {
          userId,
          totalTasks: 0,
          completedTasks: 0,
          inProgressTasks: 0,
          pendingTasks: 0,
          avgCompletionHours: null
        };
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error getting user task stats:', error);
      throw error;
    }
  }

  /**
   * Helper: Add history entry
   */
  async addHistory(client, taskId, action, userId, details = {}) {
    const { comment, ...changes } = details;
    
    // Store all details in the JSONB changes column
    const changesJson = Object.keys(changes).length > 0 ? JSON.stringify(changes) : null;

    await client.query(`
      INSERT INTO task_history (
        task_id, action, user_id, changes, comment
      ) VALUES ($1, $2, $3, $4, $5)
    `, [
      taskId, action, userId, changesJson, comment || null
    ]);
  }

  /**
   * Helper: Format task for response
   */
  formatTask(task) {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.due_date,
      createdBy: task.created_by,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
      completedAt: task.completed_at,
      travelType: task.travel_type,
      bookingReference: task.booking_reference,
      locationData: task.location_data,
      sourceEmailId: task.source_email_id,
      extractedFromEmail: task.extracted_from_email,
      tags: task.tags || [],
      customFields: task.custom_fields || {},
      estimatedDuration: task.estimated_duration,
      actualDuration: task.actual_duration,
      assignees: task.assignees || [],
      assignments: task.assignments || [],
      dependencies: task.dependencies || [],
      attachments: task.attachments || [],
      dependencyCount: parseInt(task.dependency_count || 0),
      pendingReminders: parseInt(task.pending_reminders || 0),
      daysOverdue: task.days_overdue
    };
  }

  /**
   * Helper: Convert camelCase to snake_case
   */
  camelToSnake(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}

export default TaskManager;