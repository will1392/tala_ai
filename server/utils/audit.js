/**
 * Comprehensive Audit Logging System for Tala AI
 * 
 * Provides detailed audit logging for:
 * - Authentication events
 * - Permission changes
 * - Document access
 * - API key usage
 * - Security incidents
 * - Administrative actions
 */

import { createClient } from '@supabase/supabase-js';
import { generateSecureToken } from './crypto.js';

class AuditLogger {
  constructor() {
    this.initialized = false;
    this.db = null;
    this.logQueue = [];
    this.batchSize = 100;
    this.flushInterval = 5000; // 5 seconds
    this.maxRetries = 3;
    
    // Event type definitions
    this.eventTypes = {
      // Authentication events
      AUTHENTICATION: {
        LOGIN_SUCCESS: 'login_success',
        LOGIN_FAILED: 'login_failed',
        LOGOUT: 'logout',
        SESSION_EXPIRED: 'session_expired',
        PASSWORD_CHANGED: 'password_changed',
        PASSWORD_RESET: 'password_reset',
        MFA_ENABLED: 'mfa_enabled',
        MFA_DISABLED: 'mfa_disabled',
        ACCOUNT_LOCKED: 'account_locked',
        ACCOUNT_UNLOCKED: 'account_unlocked'
      },
      
      // API Key events
      API_KEY: {
        CREATED: 'api_key_created',
        USED: 'api_key_used',
        REVOKED: 'api_key_revoked',
        EXPIRED: 'api_key_expired',
        RATE_LIMITED: 'api_key_rate_limited'
      },
      
      // Document events
      DOCUMENT: {
        CREATED: 'document_created',
        VIEWED: 'document_viewed',
        EDITED: 'document_edited',
        DELETED: 'document_deleted',
        SHARED: 'document_shared',
        UNSHARED: 'document_unshared',
        DOWNLOADED: 'document_downloaded',
        UPLOADED: 'document_uploaded'
      },
      
      // Encryption events
      ENCRYPTION: {
        KEY_GENERATED: 'encryption_key_generated',
        KEY_ROTATED: 'encryption_key_rotated',
        DOCUMENT_ENCRYPTED: 'document_encrypted',
        DOCUMENT_DECRYPTED: 'document_decrypted',
        ACCESS_GRANTED: 'encryption_access_granted',
        ACCESS_REVOKED: 'encryption_access_revoked'
      },
      
      // Permission events
      PERMISSION: {
        ROLE_ASSIGNED: 'role_assigned',
        ROLE_REMOVED: 'role_removed',
        PERMISSION_GRANTED: 'permission_granted',
        PERMISSION_REVOKED: 'permission_revoked',
        ACCESS_DENIED: 'access_denied'
      },
      
      // Organization events
      ORGANIZATION: {
        CREATED: 'organization_created',
        UPDATED: 'organization_updated',
        DELETED: 'organization_deleted',
        USER_ADDED: 'organization_user_added',
        USER_REMOVED: 'organization_user_removed',
        SETTINGS_CHANGED: 'organization_settings_changed'
      },
      
      // Security events
      SECURITY: {
        SUSPICIOUS_ACTIVITY: 'suspicious_activity',
        RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
        SECURITY_INCIDENT: 'security_incident',
        VULNERABILITY_DETECTED: 'vulnerability_detected',
        SECURITY_SCAN: 'security_scan',
        FIREWALL_BLOCK: 'firewall_block'
      },
      
      // Administrative events
      ADMIN: {
        USER_CREATED: 'admin_user_created',
        USER_DELETED: 'admin_user_deleted',
        SYSTEM_CONFIG_CHANGED: 'admin_system_config_changed',
        BACKUP_CREATED: 'admin_backup_created',
        BACKUP_RESTORED: 'admin_backup_restored',
        MAINTENANCE_MODE: 'admin_maintenance_mode'
      },
      
      // System events
      SYSTEM: {
        STARTUP: 'system_startup',
        SHUTDOWN: 'system_shutdown',
        ERROR: 'system_error',
        PERFORMANCE_ALERT: 'system_performance_alert',
        HEALTH_CHECK: 'system_health_check',
        UPDATE_APPLIED: 'system_update_applied'
      }
    };
    
    // Risk levels
    this.riskLevels = {
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high',
      CRITICAL: 'critical'
    };
  }

  /**
   * Initialize the audit logger
   */
  async initialize() {
    try {
      // Initialize database connection
      this.db = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );
      
      // Ensure audit logs table exists
      await this.ensureAuditTableExists();
      
      // Start batch processing
      this.startBatchProcessor();
      
      this.initialized = true;
      this.log('AuditLogger initialized successfully');
      
      // Log system startup
      await this.logEvent(this.eventTypes.SYSTEM.STARTUP, 'system', null, null, {
        version: process.env.APP_VERSION || '1.0.0',
        nodeVersion: process.version,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      this.log(`Failed to initialize AuditLogger: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Ensure audit logs table exists
   */
  async ensureAuditTableExists() {
    try {
      // Check if table exists by attempting to query it
      const { data, error } = await this.db
        .from('audit_logs')
        .select('id')
        .limit(1);
      
      if (error && error.message.includes('relation "audit_logs" does not exist')) {
        this.log('Audit logs table does not exist - please run database migrations', 'warn');
      }
    } catch (error) {
      this.log('Could not verify audit logs table existence', 'warn');
    }
  }

  /**
   * Log an audit event
   */
  async logEvent(eventType, category, userId = null, ipAddress = null, eventData = {}, riskLevel = this.riskLevels.LOW) {
    try {
      const auditEntry = {
        id: generateSecureToken(16, 'hex'),
        event_type: eventType,
        category,
        user_id: userId,
        ip_address: ipAddress,
        user_agent: eventData.userAgent || null,
        event_data: JSON.stringify(eventData),
        risk_level: riskLevel,
        timestamp: new Date().toISOString(),
        session_id: eventData.sessionId || null,
        organization_id: eventData.organizationId || null,
        resource_type: eventData.resourceType || null,
        resource_id: eventData.resourceId || null,
        success: eventData.success !== false, // Default to true unless explicitly false
        error_message: eventData.error || null,
        request_id: eventData.requestId || null,
        correlation_id: eventData.correlationId || null
      };

      // Add to queue for batch processing
      this.logQueue.push(auditEntry);

      // For critical events, flush immediately
      if (riskLevel === this.riskLevels.CRITICAL) {
        await this.flushLogs();
      }

      // Also log to console for development/debugging
      if (process.env.NODE_ENV === 'development' || process.env.AUDIT_CONSOLE_LOG === 'true') {
        this.logToConsole(auditEntry);
      }

      return auditEntry.id;

    } catch (error) {
      this.log(`Failed to log audit event: ${error.message}`, 'error');
      // Don't throw - audit logging shouldn't break the application
    }
  }

  /**
   * Log authentication events
   */
  async logAuthentication(eventType, userId, ipAddress, eventData = {}) {
    const riskLevel = this.getAuthenticationRiskLevel(eventType, eventData);
    
    return await this.logEvent(
      eventType,
      'authentication',
      userId,
      ipAddress,
      {
        ...eventData,
        authMethod: eventData.authMethod || 'unknown',
        userAgent: eventData.userAgent
      },
      riskLevel
    );
  }

  /**
   * Log API key usage
   */
  async logAPIKeyUsage(eventType, apiKeyId, userId, ipAddress, eventData = {}) {
    return await this.logEvent(
      eventType,
      'api_key',
      userId,
      ipAddress,
      {
        ...eventData,
        apiKeyId,
        endpoint: eventData.endpoint,
        method: eventData.method,
        responseCode: eventData.responseCode
      },
      this.riskLevels.LOW
    );
  }

  /**
   * Log document access
   */
  async logDocumentAccess(eventType, documentId, userId, ipAddress, eventData = {}) {
    const riskLevel = this.getDocumentRiskLevel(eventType, eventData);
    
    return await this.logEvent(
      eventType,
      'document',
      userId,
      ipAddress,
      {
        ...eventData,
        resourceType: 'document',
        resourceId: documentId,
        documentType: eventData.documentType,
        isEncrypted: eventData.isEncrypted || false,
        fileSize: eventData.fileSize
      },
      riskLevel
    );
  }

  /**
   * Log encryption events
   */
  async logEncryption(eventType, userId, ipAddress, eventData = {}) {
    const riskLevel = this.getEncryptionRiskLevel(eventType, eventData);
    
    return await this.logEvent(
      eventType,
      'encryption',
      userId,
      ipAddress,
      {
        ...eventData,
        keyId: eventData.keyId,
        algorithm: eventData.algorithm,
        keySize: eventData.keySize
      },
      riskLevel
    );
  }

  /**
   * Log permission changes
   */
  async logPermissionChange(eventType, targetUserId, performedByUserId, ipAddress, eventData = {}) {
    return await this.logEvent(
      eventType,
      'permission',
      performedByUserId,
      ipAddress,
      {
        ...eventData,
        targetUserId,
        role: eventData.role,
        permission: eventData.permission,
        resource: eventData.resource
      },
      this.riskLevels.MEDIUM
    );
  }

  /**
   * Log security incidents
   */
  async logSecurityIncident(eventType, userId, ipAddress, eventData = {}) {
    return await this.logEvent(
      eventType,
      'security',
      userId,
      ipAddress,
      {
        ...eventData,
        incidentType: eventData.incidentType,
        severity: eventData.severity,
        threatSignature: eventData.threatSignature,
        blocked: eventData.blocked || false
      },
      this.riskLevels.HIGH
    );
  }

  /**
   * Log administrative actions
   */
  async logAdminAction(eventType, adminUserId, ipAddress, eventData = {}) {
    return await this.logEvent(
      eventType,
      'admin',
      adminUserId,
      ipAddress,
      {
        ...eventData,
        targetResource: eventData.targetResource,
        action: eventData.action,
        previousValue: eventData.previousValue,
        newValue: eventData.newValue
      },
      this.riskLevels.MEDIUM
    );
  }

  /**
   * Query audit logs with filtering and pagination
   */
  async queryLogs(filters = {}, pagination = {}) {
    try {
      const {
        eventTypes,
        categories,
        userIds,
        ipAddresses,
        riskLevels,
        startDate,
        endDate,
        success,
        organizationId,
        resourceType,
        resourceId
      } = filters;

      const {
        page = 1,
        pageSize = 50,
        sortBy = 'timestamp',
        sortOrder = 'desc'
      } = pagination;

      let query = this.db
        .from('audit_logs')
        .select('*')
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range((page - 1) * pageSize, page * pageSize - 1);

      // Apply filters
      if (eventTypes && eventTypes.length > 0) {
        query = query.in('event_type', eventTypes);
      }

      if (categories && categories.length > 0) {
        query = query.in('category', categories);
      }

      if (userIds && userIds.length > 0) {
        query = query.in('user_id', userIds);
      }

      if (ipAddresses && ipAddresses.length > 0) {
        query = query.in('ip_address', ipAddresses);
      }

      if (riskLevels && riskLevels.length > 0) {
        query = query.in('risk_level', riskLevels);
      }

      if (startDate) {
        query = query.gte('timestamp', startDate);
      }

      if (endDate) {
        query = query.lte('timestamp', endDate);
      }

      if (success !== undefined) {
        query = query.eq('success', success);
      }

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      if (resourceType) {
        query = query.eq('resource_type', resourceType);
      }

      if (resourceId) {
        query = query.eq('resource_id', resourceId);
      }

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to query audit logs: ${error.message}`);
      }

      // Parse event_data JSON for each log entry
      const logs = data.map(log => ({
        ...log,
        event_data: this.safeJsonParse(log.event_data)
      }));

      return {
        logs,
        pagination: {
          page,
          pageSize,
          totalCount: count,
          totalPages: Math.ceil(count / pageSize)
        }
      };

    } catch (error) {
      this.log(`Failed to query audit logs: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Generate audit report
   */
  async generateReport(filters = {}, format = 'json') {
    try {
      const allLogs = [];
      let page = 1;
      const pageSize = 1000;

      // Fetch all matching logs
      while (true) {
        const result = await this.queryLogs(filters, { page, pageSize });
        allLogs.push(...result.logs);

        if (result.logs.length < pageSize) {
          break;
        }
        page++;
      }

      const report = {
        generatedAt: new Date().toISOString(),
        filters,
        totalEvents: allLogs.length,
        summary: this.generateSummary(allLogs),
        events: allLogs
      };

      if (format === 'csv') {
        return this.convertToCSV(allLogs);
      }

      return report;

    } catch (error) {
      this.log(`Failed to generate audit report: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Generate summary statistics
   */
  generateSummary(logs) {
    const summary = {
      byCategory: {},
      byEventType: {},
      byRiskLevel: {},
      byUser: {},
      byIPAddress: {},
      successRate: 0,
      timeRange: {}
    };

    if (logs.length === 0) {
      return summary;
    }

    // Group by various dimensions
    logs.forEach(log => {
      // By category
      summary.byCategory[log.category] = (summary.byCategory[log.category] || 0) + 1;

      // By event type
      summary.byEventType[log.event_type] = (summary.byEventType[log.event_type] || 0) + 1;

      // By risk level
      summary.byRiskLevel[log.risk_level] = (summary.byRiskLevel[log.risk_level] || 0) + 1;

      // By user
      if (log.user_id) {
        summary.byUser[log.user_id] = (summary.byUser[log.user_id] || 0) + 1;
      }

      // By IP address
      if (log.ip_address) {
        summary.byIPAddress[log.ip_address] = (summary.byIPAddress[log.ip_address] || 0) + 1;
      }
    });

    // Calculate success rate
    const successfulEvents = logs.filter(log => log.success).length;
    summary.successRate = (successfulEvents / logs.length) * 100;

    // Time range
    const timestamps = logs.map(log => new Date(log.timestamp)).sort();
    summary.timeRange = {
      earliest: timestamps[0].toISOString(),
      latest: timestamps[timestamps.length - 1].toISOString(),
      duration: timestamps[timestamps.length - 1] - timestamps[0]
    };

    return summary;
  }

  /**
   * Start batch processor for log entries
   */
  startBatchProcessor() {
    setInterval(async () => {
      if (this.logQueue.length > 0) {
        await this.flushLogs();
      }
    }, this.flushInterval);
  }

  /**
   * Flush queued logs to database
   */
  async flushLogs() {
    if (this.logQueue.length === 0) {
      return;
    }

    const logsToFlush = this.logQueue.splice(0, this.batchSize);

    try {
      const { error } = await this.db
        .from('audit_logs')
        .insert(logsToFlush);

      if (error) {
        throw new Error(`Failed to insert audit logs: ${error.message}`);
      }

      this.log(`Flushed ${logsToFlush.length} audit log entries`);

    } catch (error) {
      this.log(`Failed to flush audit logs: ${error.message}`, 'error');
      
      // Re-queue failed logs (with retry limit)
      logsToFlush.forEach(log => {
        log._retryCount = (log._retryCount || 0) + 1;
        if (log._retryCount <= this.maxRetries) {
          this.logQueue.unshift(log);
        }
      });
    }
  }

  /**
   * Get risk level for authentication events
   */
  getAuthenticationRiskLevel(eventType, eventData) {
    if (eventType.includes('failed') || eventType.includes('locked')) {
      return this.riskLevels.MEDIUM;
    }
    if (eventType.includes('password_reset') || eventType.includes('mfa_disabled')) {
      return this.riskLevels.MEDIUM;
    }
    return this.riskLevels.LOW;
  }

  /**
   * Get risk level for document events
   */
  getDocumentRiskLevel(eventType, eventData) {
    if (eventData.isEncrypted && eventType.includes('shared')) {
      return this.riskLevels.MEDIUM;
    }
    if (eventType.includes('deleted')) {
      return this.riskLevels.MEDIUM;
    }
    return this.riskLevels.LOW;
  }

  /**
   * Get risk level for encryption events
   */
  getEncryptionRiskLevel(eventType, eventData) {
    if (eventType.includes('key_rotated') || eventType.includes('access_revoked')) {
      return this.riskLevels.MEDIUM;
    }
    return this.riskLevels.LOW;
  }

  /**
   * Convert logs to CSV format
   */
  convertToCSV(logs) {
    if (logs.length === 0) {
      return '';
    }

    const headers = Object.keys(logs[0]).filter(key => key !== 'event_data');
    const csvHeaders = [...headers, 'event_data'].join(',');

    const csvRows = logs.map(log => {
      const values = headers.map(header => {
        const value = log[header];
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
      });
      
      // Add event_data as JSON string
      const eventDataStr = JSON.stringify(log.event_data || {}).replace(/"/g, '""');
      values.push(`"${eventDataStr}"`);
      
      return values.join(',');
    });

    return [csvHeaders, ...csvRows].join('\n');
  }

  /**
   * Safe JSON parsing
   */
  safeJsonParse(jsonString) {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      return {};
    }
  }

  /**
   * Log to console (for development)
   */
  logToConsole(auditEntry) {
    const logLevel = auditEntry.risk_level === this.riskLevels.CRITICAL ? 'error' :
                   auditEntry.risk_level === this.riskLevels.HIGH ? 'warn' : 'info';
    
    console[logLevel]('[AUDIT]', {
      eventType: auditEntry.event_type,
      category: auditEntry.category,
      userId: auditEntry.user_id,
      ipAddress: auditEntry.ip_address,
      riskLevel: auditEntry.risk_level,
      timestamp: auditEntry.timestamp,
      data: this.safeJsonParse(auditEntry.event_data)
    });
  }

  /**
   * Get audit statistics
   */
  async getStatistics(timeframe = '24h') {
    try {
      const endDate = new Date();
      const startDate = new Date();

      switch (timeframe) {
        case '1h':
          startDate.setHours(startDate.getHours() - 1);
          break;
        case '24h':
          startDate.setDate(startDate.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        default:
          startDate.setDate(startDate.getDate() - 1);
      }

      const { data, error } = await this.db
        .from('audit_logs')
        .select('category, risk_level, success')
        .gte('timestamp', startDate.toISOString())
        .lte('timestamp', endDate.toISOString());

      if (error) {
        throw new Error(`Failed to get audit statistics: ${error.message}`);
      }

      return this.generateSummary(data);

    } catch (error) {
      this.log(`Failed to get audit statistics: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Clean up old audit logs
   */
  async cleanupOldLogs(retentionDays = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const { error, count } = await this.db
        .from('audit_logs')
        .delete()
        .lt('timestamp', cutoffDate.toISOString());

      if (error) {
        throw new Error(`Failed to cleanup old audit logs: ${error.message}`);
      }

      this.log(`Cleaned up ${count} old audit log entries (older than ${retentionDays} days)`);
      return count;

    } catch (error) {
      this.log(`Failed to cleanup old audit logs: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Shutdown audit logger
   */
  async shutdown() {
    try {
      // Flush remaining logs
      await this.flushLogs();
      
      // Log system shutdown
      await this.logEvent(this.eventTypes.SYSTEM.SHUTDOWN, 'system', null, null, {
        timestamp: new Date().toISOString()
      });
      
      // Final flush
      await this.flushLogs();
      
      this.initialized = false;
      this.log('AuditLogger shutdown completed');
      
    } catch (error) {
      this.log(`AuditLogger shutdown error: ${error.message}`, 'error');
    }
  }

  /**
   * Log messages
   */
  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      component: 'AuditLogger',
      level,
      message
    };

    switch (level) {
      case 'error':
        console.error('[AuditLogger]', logData);
        break;
      case 'warn':
        console.warn('[AuditLogger]', logData);
        break;
      default:
        console.log('[AuditLogger]', logData);
    }
  }
}

// Create singleton instance
const auditLogger = new AuditLogger();

// Export convenience function for quick logging
export async function auditLog(eventType, category, userId = null, ipAddress = null, eventData = {}, riskLevel = 'low') {
  if (!auditLogger.initialized) {
    try {
      await auditLogger.initialize();
    } catch (error) {
      console.error('Failed to initialize audit logger:', error);
      return null;
    }
  }
  
  return await auditLogger.logEvent(eventType, category, userId, ipAddress, eventData, riskLevel);
}

// Export the audit logger instance and class
export { auditLogger, AuditLogger };
export default auditLogger;