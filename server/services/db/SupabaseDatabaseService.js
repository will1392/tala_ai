/**
 * SupabaseDatabaseService - Real PostgreSQL implementation using Supabase
 * 
 * This replaces the mock database with actual PostgreSQL queries
 */

import { getSupabaseService, initializeSupabase } from '../../db/supabaseClient.js';

export class SupabaseDatabaseService {
  constructor(options = {}) {
    this.options = options;
    this.supabase = null;
    this.connected = false;
  }

  async initialize() {
    try {
      // Initialize Supabase if not already done
      const initResult = initializeSupabase();
      
      if (!initResult.success) {
        throw new Error(`Failed to initialize Supabase: ${initResult.error}`);
      }
      
      // Get the service client for admin operations
      this.supabase = getSupabaseService();
      this.connected = true;
      
      console.log('🐘 PostgreSQL Database Service initialized (Supabase)');
      
      // Test the connection
      const { error } = await this.supabase.from('tasks').select('count').limit(1);
      if (error && error.code !== 'PGRST116') { // PGRST116 = table not found
        console.warn('⚠️ Database connection test failed:', error.message);
      }
      
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Execute a SQL query
   * This method maintains compatibility with the existing TaskManager
   */
  async query(sql, params = []) {
    if (!this.connected || !this.supabase) {
      throw new Error('Database not connected');
    }

    try {
      // Parse the SQL to determine operation type
      const operation = this.parseOperation(sql);
      operation.sql = sql; // Add original SQL for ON CONFLICT detection
      
      switch (operation.type) {
        case 'INSERT':
          return this.handleInsert(operation, params);
        case 'SELECT':
          return this.handleSelect(operation, params);
        case 'UPDATE':
          return this.handleUpdate(operation, params);
        case 'DELETE':
          return this.handleDelete(operation, params);
        default:
          throw new Error(`Unsupported operation: ${operation.type}`);
      }
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  /**
   * Handle INSERT operations
   */
  async handleInsert(operation, params) {
    if (operation.table === 'tasks') {
      // Map parameters to task object
      const task = {
        id: params[0],
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
        estimated_duration: params[14]
      };

      const { data, error } = await this.supabase
        .from('tasks')
        .insert([task])
        .select()
        .single();

      if (error) throw error;

      return {
        rows: [data],
        rowCount: 1
      };
    }
    
    // Handle other tables similarly
    if (operation.table === 'task_history') {
      const history = {
        task_id: params[0],
        action: params[1],
        user_id: params[2],
        changes: params[3],
        comment: params[4]
      };

      const { data, error } = await this.supabase
        .from('task_history')
        .insert([history])
        .select()
        .single();

      if (error) throw error;

      return {
        rows: [data],
        rowCount: 1
      };
    }
    
    if (operation.table === 'task_assignments') {
      // Parse the SQL to handle ON CONFLICT
      const hasOnConflict = operation.sql.includes('ON CONFLICT');
      
      if (hasOnConflict) {
        // For upsert operations
        const assignment = {
          task_id: params[0],
          user_id: params[1],
          role: params[2],
          assigned_by: params[3]
        };
        
        const { data, error } = await this.supabase
          .from('task_assignments')
          .upsert([assignment], {
            onConflict: 'task_id,user_id',
            ignoreDuplicates: false
          })
          .select()
          .single();
        
        if (error) throw error;
        
        return {
          rows: [data],
          rowCount: 1
        };
      } else {
        // Regular insert
        const assignment = {
          task_id: params[0],
          user_id: params[1],
          role: params[2],
          assigned_by: params[3]
        };
        
        const { data, error } = await this.supabase
          .from('task_assignments')
          .insert([assignment])
          .select()
          .single();
        
        if (error) throw error;
        
        return {
          rows: [data],
          rowCount: 1
        };
      }
    }
    
    if (operation.table === 'task_attachments') {
      const attachment = {
        task_id: params[0],
        document_id: params[1],
        email_id: params[2],
        file_name: params[3],
        file_url: params[4],
        file_size: params[5],
        mime_type: params[6],
        attachment_type: params[7],
        uploaded_by: params[8]
      };
      
      const { data, error } = await this.supabase
        .from('task_attachments')
        .insert([attachment])
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        rows: [data],
        rowCount: 1
      };
    }

    throw new Error(`Insert not implemented for table: ${operation.table}`);
  }

  /**
   * Handle SELECT operations
   */
  async handleSelect(operation, params) {
    if (operation.table === 'tasks') {
      let query = this.supabase.from('tasks').select('*');

      // Handle COUNT queries
      if (operation.isCount) {
        const { count, error } = await this.supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true });

        if (error) throw error;

        return {
          rows: [{ total: count.toString() }],
          rowCount: 1
        };
      }

      // Handle WHERE clauses
      if (operation.where) {
        // Parse WHERE conditions and apply filters
        if (operation.where.includes('id = $1')) {
          query = query.eq('id', params[0]);
        }
        if (operation.where.includes('created_by = $')) {
          const paramIndex = this.extractParamIndex(operation.where, 'created_by');
          if (paramIndex > 0) {
            query = query.eq('created_by', params[paramIndex - 1]);
          }
        }
        if (operation.where.includes('status = $')) {
          const paramIndex = this.extractParamIndex(operation.where, 'status');
          if (paramIndex > 0) {
            query = query.eq('status', params[paramIndex - 1]);
          }
        }
      }

      // Handle ORDER BY
      if (operation.orderBy) {
        const [column, direction] = operation.orderBy.split(' ');
        query = query.order(column, { ascending: direction !== 'DESC' });
      }

      // Handle LIMIT and OFFSET
      if (operation.limit) {
        query = query.limit(operation.limit);
      }
      if (operation.offset) {
        query = query.range(operation.offset, operation.offset + (operation.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) throw error;

      return {
        rows: data || [],
        rowCount: data ? data.length : 0
      };
    }

    throw new Error(`Select not implemented for table: ${operation.table}`);
  }

  /**
   * Handle UPDATE operations
   */
  async handleUpdate(operation, params) {
    if (operation.table === 'tasks') {
      // In TaskManager, the UPDATE query uses $1 for WHERE id = $1
      // and $2, $3, etc. for SET values
      const taskId = params[0];
      
      // Build update object from SET clause and params (starting from index 1)
      const updates = {};
      let paramIndex = 1; // Start from 1 since 0 is the task ID
      
      // Parse SET clause to build updates object
      const setMatches = operation.set.match(/(\w+)\s*=\s*\$\d+/g);
      if (setMatches) {
        setMatches.forEach(match => {
          const [field] = match.split('=');
          const fieldName = field.trim();
          if (paramIndex < params.length) {
            updates[fieldName] = params[paramIndex++];
          }
        });
      }

      const { data, error } = await this.supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;

      return {
        rows: [data],
        rowCount: 1
      };
    }

    throw new Error(`Update not implemented for table: ${operation.table}`);
  }

  /**
   * Handle DELETE operations
   */
  async handleDelete(operation, params) {
    if (operation.table === 'tasks') {
      const taskId = params[0];

      const { data, error } = await this.supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;

      return {
        rows: [data],
        rowCount: 1
      };
    }

    throw new Error(`Delete not implemented for table: ${operation.table}`);
  }

  /**
   * Parse SQL to extract operation details
   */
  parseOperation(sql) {
    const cleanSql = sql.trim().toUpperCase();
    
    const operation = {
      type: null,
      table: null,
      where: null,
      orderBy: null,
      limit: null,
      offset: null,
      isCount: false,
      set: null
    };

    // Determine operation type
    if (cleanSql.startsWith('INSERT')) {
      operation.type = 'INSERT';
      const match = sql.match(/INSERT INTO\s+(\w+)/i);
      operation.table = match ? match[1] : null;
    } else if (cleanSql.startsWith('SELECT')) {
      operation.type = 'SELECT';
      const match = sql.match(/FROM\s+(\w+)/i);
      operation.table = match ? match[1] : null;
      
      // Check if it's a COUNT query
      operation.isCount = cleanSql.includes('COUNT(');
      
      // Extract WHERE clause
      const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER\s+BY|\s+LIMIT|\s+GROUP\s+BY|$)/i);
      operation.where = whereMatch ? whereMatch[1] : null;
      
      // Extract ORDER BY
      const orderMatch = sql.match(/ORDER\s+BY\s+(\w+)(?:\s+(ASC|DESC))?/i);
      if (orderMatch) {
        operation.orderBy = `${orderMatch[1]} ${orderMatch[2] || 'ASC'}`;
      }
      
      // Extract LIMIT
      const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
      operation.limit = limitMatch ? parseInt(limitMatch[1]) : null;
      
      // Extract OFFSET
      const offsetMatch = sql.match(/OFFSET\s+(\d+)/i);
      operation.offset = offsetMatch ? parseInt(offsetMatch[1]) : null;
    } else if (cleanSql.startsWith('UPDATE')) {
      operation.type = 'UPDATE';
      const match = sql.match(/UPDATE\s+(\w+)/i);
      operation.table = match ? match[1] : null;
      
      // Extract SET clause
      const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/i);
      operation.set = setMatch ? setMatch[1] : null;
    } else if (cleanSql.startsWith('DELETE')) {
      operation.type = 'DELETE';
      const match = sql.match(/DELETE\s+FROM\s+(\w+)/i);
      operation.table = match ? match[1] : null;
    }

    return operation;
  }

  /**
   * Extract parameter index from WHERE clause
   */
  extractParamIndex(where, field) {
    const regex = new RegExp(`${field}\\s*=\\s*\\$(\\d+)`, 'i');
    const match = where.match(regex);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Transaction support
   */
  async transaction(callback) {
    // Supabase doesn't support transactions in the same way
    // Create a client object that mimics PostgreSQL client for TaskManager
    try {
      const client = {
        query: async (sql, params) => {
          // Handle INSERT INTO tasks
          if (sql.includes('INSERT INTO tasks')) {
            const task = {
              id: params[0],
              title: params[1],
              description: params[2],
              status: params[3],
              priority: params[4],
              due_date: params[5],
              created_by: params[6],
              tags: params[12] || [],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            console.log('📦 Creating task via SQL translation:', task.title);
            
            const { data, error } = await this.supabase
              .from('tasks')
              .insert([task])
              .select();
            
            if (error) {
              console.error('❌ Supabase insert error:', error);
              throw error;
            }
            
            console.log('✅ Task created via SQL translation:', data[0].id);
            return { rows: data };
          }
          
          // Handle other queries as needed
          console.warn('⚠️ Unsupported SQL query:', sql.substring(0, 50));
          return { rows: [] };
        }
      };
      
      return await callback(client);
    } catch (error) {
      console.error('Transaction error:', error);
      throw error;
    }
  }

  /**
   * Check if connected
   */
  isConnected() {
    return this.connected && this.supabase !== null;
  }
}