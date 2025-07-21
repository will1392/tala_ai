/**
 * WebSocket Handler for Real-time Processing Updates
 * 
 * Provides real-time updates for document processing status,
 * pipeline events, and smart feature notifications
 */

import { WebSocketServer } from 'ws';
import smartPipeline from '../services/documents/SmartPipeline.js';
import { verifyToken } from '../middleware/authentication.js';

class ProcessingWebSocketHandler {
  constructor(server, options = {}) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws/processing',
      ...options.wsOptions 
    });
    
    this.clients = new Map(); // Map of userId -> Set of WebSocket connections
    this.subscriptions = new Map(); // Map of processingId -> Set of userId
    
    this.setupWebSocketServer();
    this.setupPipelineListeners();
    
    console.log('Processing WebSocket handler initialized');
  }

  /**
   * Setup WebSocket server event handlers
   */
  setupWebSocketServer() {
    this.wss.on('connection', async (ws, req) => {
      try {
        // Extract and verify token from query or headers
        const token = this.extractToken(req);
        const user = await this.authenticateUser(token);
        
        if (!user) {
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Authentication required'
          }));
          ws.close(1008, 'Authentication required');
          return;
        }

        // Store client connection
        this.addClient(user.id, ws);
        
        // Send connection confirmation
        ws.send(JSON.stringify({
          type: 'connected',
          userId: user.id,
          timestamp: new Date().toISOString()
        }));

        // Setup client event handlers
        this.setupClientHandlers(ws, user);

      } catch (error) {
        console.error('WebSocket connection error:', error);
        ws.close(1011, 'Server error');
      }
    });
  }

  /**
   * Setup client-specific event handlers
   * @param {WebSocket} ws - WebSocket connection
   * @param {Object} user - Authenticated user
   */
  setupClientHandlers(ws, user) {
    // Handle incoming messages
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        await this.handleClientMessage(ws, user, message);
      } catch (error) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });

    // Handle client disconnect
    ws.on('close', () => {
      this.removeClient(user.id, ws);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error(`WebSocket error for user ${user.id}:`, error);
      this.removeClient(user.id, ws);
    });

    // Send heartbeat
    const heartbeat = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'heartbeat',
          timestamp: new Date().toISOString()
        }));
      } else {
        clearInterval(heartbeat);
      }
    }, 30000);

    ws.on('close', () => clearInterval(heartbeat));
  }

  /**
   * Handle client messages
   * @param {WebSocket} ws - WebSocket connection
   * @param {Object} user - Authenticated user
   * @param {Object} message - Client message
   */
  async handleClientMessage(ws, user, message) {
    switch (message.type) {
      case 'subscribe':
        await this.handleSubscribe(ws, user, message);
        break;
        
      case 'unsubscribe':
        await this.handleUnsubscribe(ws, user, message);
        break;
        
      case 'get_status':
        await this.handleGetStatus(ws, user, message);
        break;
        
      case 'ping':
        ws.send(JSON.stringify({
          type: 'pong',
          timestamp: new Date().toISOString()
        }));
        break;
        
      default:
        ws.send(JSON.stringify({
          type: 'error',
          message: `Unknown message type: ${message.type}`
        }));
    }
  }

  /**
   * Handle subscription to processing updates
   * @param {WebSocket} ws - WebSocket connection
   * @param {Object} user - User object
   * @param {Object} message - Subscribe message
   */
  async handleSubscribe(ws, user, message) {
    const { processingId, documentId } = message;

    if (processingId) {
      // Subscribe to specific processing job
      this.addSubscription(processingId, user.id);
      
      // Send current status
      const status = smartPipeline.getProcessingStatus(processingId);
      ws.send(JSON.stringify({
        type: 'status_update',
        processingId,
        status,
        timestamp: new Date().toISOString()
      }));
      
      ws.send(JSON.stringify({
        type: 'subscribed',
        processingId,
        message: 'Subscribed to processing updates'
      }));
      
    } else if (documentId) {
      // Subscribe to all processing for a document
      ws.send(JSON.stringify({
        type: 'subscribed',
        documentId,
        message: 'Subscribed to document processing updates'
      }));
    } else {
      // Subscribe to all user's processing
      ws.send(JSON.stringify({
        type: 'subscribed',
        userId: user.id,
        message: 'Subscribed to all processing updates'
      }));
    }
  }

  /**
   * Handle unsubscribe from processing updates
   * @param {WebSocket} ws - WebSocket connection
   * @param {Object} user - User object
   * @param {Object} message - Unsubscribe message
   */
  async handleUnsubscribe(ws, user, message) {
    const { processingId } = message;

    if (processingId) {
      this.removeSubscription(processingId, user.id);
      
      ws.send(JSON.stringify({
        type: 'unsubscribed',
        processingId,
        message: 'Unsubscribed from processing updates'
      }));
    }
  }

  /**
   * Handle status request
   * @param {WebSocket} ws - WebSocket connection
   * @param {Object} user - User object
   * @param {Object} message - Status request message
   */
  async handleGetStatus(ws, user, message) {
    const { processingId } = message;

    if (!processingId) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Processing ID required'
      }));
      return;
    }

    const status = smartPipeline.getProcessingStatus(processingId);
    ws.send(JSON.stringify({
      type: 'status_response',
      processingId,
      status,
      timestamp: new Date().toISOString()
    }));
  }

  /**
   * Setup pipeline event listeners
   */
  setupPipelineListeners() {
    // Document queued
    smartPipeline.on('document:queued', (event) => {
      this.broadcastToSubscribers(event.processingId, {
        type: 'processing_queued',
        ...event
      });
    });

    // Processing started
    smartPipeline.on('document:processing', (event) => {
      this.broadcastToSubscribers(event.processingId, {
        type: 'processing_started',
        ...event
      });
    });

    // Stage update
    smartPipeline.on('document:stage', (event) => {
      this.broadcastToSubscribers(event.processingId, {
        type: 'stage_update',
        ...event
      });
    });

    // Processing completed
    smartPipeline.on('document:completed', (event) => {
      this.broadcastToSubscribers(event.processingId, {
        type: 'processing_completed',
        ...event
      });
      
      // Clean up subscription after completion
      setTimeout(() => {
        this.cleanupSubscription(event.processingId);
      }, 60000); // Keep for 1 minute after completion
    });

    // Processing failed
    smartPipeline.on('document:failed', (event) => {
      this.broadcastToSubscribers(event.processingId, {
        type: 'processing_failed',
        ...event
      });
      
      // Clean up subscription after failure
      setTimeout(() => {
        this.cleanupSubscription(event.processingId);
      }, 60000);
    });

    // Processing retry
    smartPipeline.on('document:retry', (event) => {
      this.broadcastToSubscribers(event.processingId, {
        type: 'processing_retry',
        ...event
      });
    });

    // Processing cancelled
    smartPipeline.on('document:cancelled', (event) => {
      this.broadcastToSubscribers(event.processingId, {
        type: 'processing_cancelled',
        ...event
      });
      
      this.cleanupSubscription(event.processingId);
    });

    // Stage errors
    smartPipeline.on('stage:error', (event) => {
      // Broadcast to all connected clients (admin notification)
      this.broadcastToAll({
        type: 'stage_error',
        ...event
      }, { adminOnly: true });
    });
  }

  /**
   * Broadcast message to subscribers of a processing job
   * @param {string} processingId - Processing ID
   * @param {Object} message - Message to broadcast
   */
  broadcastToSubscribers(processingId, message) {
    const subscribers = this.subscriptions.get(processingId);
    if (!subscribers) return;

    subscribers.forEach(userId => {
      const userClients = this.clients.get(userId);
      if (userClients) {
        userClients.forEach(ws => {
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify(message));
          }
        });
      }
    });
  }

  /**
   * Broadcast message to all connected clients
   * @param {Object} message - Message to broadcast
   * @param {Object} options - Broadcast options
   */
  broadcastToAll(message, options = {}) {
    this.clients.forEach((clientSet, userId) => {
      // Apply filters if needed
      if (options.adminOnly && !this.isAdmin(userId)) {
        return;
      }

      clientSet.forEach(ws => {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify(message));
        }
      });
    });
  }

  /**
   * Add client connection
   * @param {string} userId - User ID
   * @param {WebSocket} ws - WebSocket connection
   */
  addClient(userId, ws) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId).add(ws);
  }

  /**
   * Remove client connection
   * @param {string} userId - User ID
   * @param {WebSocket} ws - WebSocket connection
   */
  removeClient(userId, ws) {
    const userClients = this.clients.get(userId);
    if (userClients) {
      userClients.delete(ws);
      if (userClients.size === 0) {
        this.clients.delete(userId);
      }
    }
  }

  /**
   * Add subscription
   * @param {string} processingId - Processing ID
   * @param {string} userId - User ID
   */
  addSubscription(processingId, userId) {
    if (!this.subscriptions.has(processingId)) {
      this.subscriptions.set(processingId, new Set());
    }
    this.subscriptions.get(processingId).add(userId);
  }

  /**
   * Remove subscription
   * @param {string} processingId - Processing ID
   * @param {string} userId - User ID
   */
  removeSubscription(processingId, userId) {
    const subscribers = this.subscriptions.get(processingId);
    if (subscribers) {
      subscribers.delete(userId);
      if (subscribers.size === 0) {
        this.subscriptions.delete(processingId);
      }
    }
  }

  /**
   * Clean up subscription
   * @param {string} processingId - Processing ID
   */
  cleanupSubscription(processingId) {
    this.subscriptions.delete(processingId);
  }

  /**
   * Extract token from request
   * @param {Object} req - HTTP request
   * @returns {string} Token
   */
  extractToken(req) {
    // Check query parameter
    const url = new URL(req.url, `http://${req.headers.host}`);
    const queryToken = url.searchParams.get('token');
    if (queryToken) return queryToken;

    // Check authorization header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }

  /**
   * Authenticate user from token
   * @param {string} token - JWT token
   * @returns {Object} User object or null
   */
  async authenticateUser(token) {
    if (!token) return null;

    try {
      const decoded = await verifyToken(token);
      return {
        id: decoded.userId,
        organizationId: decoded.organizationId,
        role: decoded.role
      };
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  /**
   * Check if user is admin
   * @param {string} userId - User ID
   * @returns {boolean} Is admin
   */
  isAdmin(userId) {
    // This would be implemented based on your user role system
    // For now, return false
    return false;
  }

  /**
   * Get connection statistics
   * @returns {Object} Connection stats
   */
  getStats() {
    let totalConnections = 0;
    this.clients.forEach(clientSet => {
      totalConnections += clientSet.size;
    });

    return {
      connectedUsers: this.clients.size,
      totalConnections,
      activeSubscriptions: this.subscriptions.size,
      uptime: process.uptime()
    };
  }

  /**
   * Gracefully shutdown
   */
  async shutdown() {
    // Notify all clients
    this.broadcastToAll({
      type: 'server_shutdown',
      message: 'Server is shutting down',
      timestamp: new Date().toISOString()
    });

    // Close all connections
    this.clients.forEach(clientSet => {
      clientSet.forEach(ws => {
        ws.close(1001, 'Server shutdown');
      });
    });

    // Clear data
    this.clients.clear();
    this.subscriptions.clear();

    // Close WebSocket server
    this.wss.close();
  }
}

export default ProcessingWebSocketHandler;