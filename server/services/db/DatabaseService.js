/**
 * DatabaseService - Mock implementation for testing
 * 
 * In production, this would connect to your actual database
 */

// Singleton instance for mock data persistence
let instance = null;

export class DatabaseService {
  constructor(options = {}) {
    if (instance) {
      return instance;
    }
    
    this.options = options;
    this.connected = false;
    this.mockData = new Map();
    
    instance = this;
  }

  async initialize() {
    this.connected = true;
    console.log('📊 Mock Database Service initialized');
  }

  async query(sql, params = []) {
    // Mock implementation - in production, this would execute real SQL
    console.log('Mock query:', sql.substring(0, 50) + '...');
    
    // Return mock results based on query type
    if (sql.includes('INSERT')) {
      // Special handling for tasks table
      if (sql.includes('INSERT INTO tasks')) {
        const task = {
          id: params[0], // Task ID is the first parameter
          title: params[1],
          description: params[2],
          status: params[3],
          priority: params[4],
          due_date: params[5],
          created_by: params[6],
          travel_type: params[7],
          booking_reference: params[8],
          location_data: params[9],
          source_email_id: params[10],
          extracted_from_email: params[11],
          tags: params[12],
          custom_fields: params[13],
          estimated_duration: params[14],
          created_at: new Date(),
          updated_at: new Date()
        };
        
        // Store in mock data
        if (!this.mockData.has('tasks')) {
          this.mockData.set('tasks', new Map());
        }
        this.mockData.get('tasks').set(task.id, task);
        
        return {
          rows: [task],
          rowCount: 1
        };
      }
      
      return {
        rows: [{
          id: `mock_${Date.now()}`,
          ...this.extractInsertData(sql, params)
        }],
        rowCount: 1
      };
    }
    
    if (sql.includes('SELECT')) {
      // Mock storage for tasks
      if (!this.mockData.has('tasks')) {
        this.mockData.set('tasks', new Map());
      }
      
      // Handle task queries
      if (sql.includes('FROM tasks')) {
        const tasksMap = this.mockData.get('tasks');
        const tasks = Array.from(tasksMap.values());
        
        // Handle COUNT queries (but not queries that have COUNT in aggregations)
        if (sql.includes('COUNT(') && sql.includes('SELECT COUNT(')) {
          // Simple filtering based on WHERE clause
          let filteredTasks = tasks;
          if (sql.includes('WHERE')) {
            // Very basic filtering - in production this would parse SQL properly
            if (sql.includes('status =') && params.length > 0) {
              const statusMatch = params.find(p => ['pending', 'in_progress', 'completed', 'cancelled'].includes(p));
              if (statusMatch) {
                filteredTasks = tasks.filter(t => t.status === statusMatch);
              }
            }
          }
          
          return {
            rows: [{ total: filteredTasks.length.toString() }],
            rowCount: 1
          };
        }
        
        // Handle regular SELECT queries
        let filteredTasks = tasks;
        if (sql.includes('WHERE')) {
          // Very basic filtering - in production this would parse SQL properly
          
          // Filter by created_by
          if (sql.includes('created_by =')) {
            // Find the parameter index for created_by
            const createdByIndex = (sql.match(/created_by = \$(\d+)/)?.[1] || 0) - 1;
            if (createdByIndex >= 0 && params[createdByIndex]) {
              const createdBy = params[createdByIndex];
              filteredTasks = filteredTasks.filter(t => t.created_by === createdBy || t.createdBy === createdBy);
            }
          }
          
          // Filter by status
          if (sql.includes('status =')) {
            const statusMatch = params.find(p => ['pending', 'in_progress', 'completed', 'cancelled'].includes(p));
            if (statusMatch) {
              filteredTasks = filteredTasks.filter(t => t.status === statusMatch);
            }
          }
          
          // Filter by ID
          if (sql.includes('WHERE') && sql.includes('t.id = $')) {
            // Only filter by ID if we're querying for a specific task ID
            const taskId = params[0]; // Assume first param is ID for single task queries
            filteredTasks = filteredTasks.filter(t => t.id === taskId);
          }
        }
        
        // Handle LIMIT and OFFSET
        let limit = 50;
        let offset = 0;
        
        // Extract limit and offset from params (they're usually the last two params)
        if (params.length >= 2) {
          const lastTwo = params.slice(-2);
          if (typeof lastTwo[0] === 'number' && typeof lastTwo[1] === 'number') {
            limit = lastTwo[0];
            offset = lastTwo[1];
          }
        }
        
        // Apply pagination
        const paginatedTasks = filteredTasks.slice(offset, offset + limit);
        
        // Add mock aggregated fields that the SQL query would normally add
        const tasksWithAggregates = paginatedTasks.map(task => {
          // Ensure all task fields are present, preserving original structure
          return {
            ...task,  // Include all original task fields
            // Add aggregated fields that would come from JOINs
            assignees: null,
            dependency_count: '0',  // These come as strings from COUNT queries
            pending_reminders: '0'
          };
        });
        
        return {
          rows: tasksWithAggregates,
          rowCount: tasksWithAggregates.length
        };
      }
      
      return {
        rows: [],
        rowCount: 0
      };
    }
    
    if (sql.includes('DELETE')) {
      // Handle DELETE queries
      if (sql.includes('DELETE FROM tasks')) {
        const tasksMap = this.mockData.get('tasks') || new Map();
        
        // Extract task ID from params (usually first param for DELETE)
        const taskId = params[0];
        
        if (taskId && tasksMap.has(taskId)) {
          tasksMap.delete(taskId);
          
          // Also delete related data
          const historyMap = this.mockData.get('task_history') || new Map();
          const assignmentsMap = this.mockData.get('task_assignments') || new Map();
          const dependenciesMap = this.mockData.get('task_dependencies') || new Map();
          const remindersMap = this.mockData.get('task_reminders') || new Map();
          
          // Delete related entries
          Array.from(historyMap.keys()).forEach(key => {
            if (historyMap.get(key)?.task_id === taskId) {
              historyMap.delete(key);
            }
          });
          
          Array.from(assignmentsMap.keys()).forEach(key => {
            if (assignmentsMap.get(key)?.task_id === taskId) {
              assignmentsMap.delete(key);
            }
          });
          
          Array.from(dependenciesMap.keys()).forEach(key => {
            const dep = dependenciesMap.get(key);
            if (dep?.task_id === taskId || dep?.depends_on_task_id === taskId) {
              dependenciesMap.delete(key);
            }
          });
          
          Array.from(remindersMap.keys()).forEach(key => {
            if (remindersMap.get(key)?.task_id === taskId) {
              remindersMap.delete(key);
            }
          });
          
          console.log(`✅ Deleted task ${taskId} and related data`);
          
          return {
            rows: [],
            rowCount: 1
          };
        }
        
        return {
          rows: [],
          rowCount: 0
        };
      }
      
      return {
        rows: [],
        rowCount: 1
      };
    }
    
    if (sql.includes('UPDATE')) {
      return {
        rows: [],
        rowCount: 1
      };
    }
    
    return { rows: [], rowCount: 0 };
  }

  async transaction(callback) {
    // Mock transaction - in production, this would handle real transactions
    const client = {
      query: this.query.bind(this),
      release: () => {}
    };
    
    try {
      const result = await callback(client);
      return result;
    } catch (error) {
      throw error;
    }
  }

  extractInsertData(sql, params) {
    // Simple extraction for mock purposes
    const data = {};
    params.forEach((param, index) => {
      data[`field${index}`] = param;
    });
    return data;
  }

  async close() {
    this.connected = false;
    console.log('📊 Mock Database Service closed');
  }
}

export default DatabaseService;