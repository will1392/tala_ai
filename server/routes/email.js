/**
 * Email Routes
 * 
 * Handles email provider integration and email operations
 */

import express from 'express';
import googleOAuthService from '../services/auth/GoogleOAuthService.js';
import emailManager from '../services/email/EmailManager.js';
import emailSyncService from '../services/email/EmailSyncService.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
const syncService = emailSyncService;

/**
 * GET /api/email/providers
 * List available email providers
 */
router.get('/providers', requireAuth, (req, res) => {
  const providers = emailManager.getAvailableProviders();
  res.json(providers);
});

/**
 * GET /api/email/accounts
 * Get user's connected email accounts
 */
router.get('/accounts', requireAuth, async (req, res) => {
  try {
    const userId = req.userId || req.user?.id || 'test_user_123';
    const accounts = await emailManager.getUserAccounts(userId);
    res.json(accounts);
  } catch (error) {
    console.error('Failed to get email accounts:', error);
    res.status(500).json({ error: 'Failed to get email accounts' });
  }
});

/**
 * POST /api/email/connect
 * Initiate email provider connection
 */
router.post('/connect', requireAuth, async (req, res) => {
  try {
    const { provider, email, credentials } = req.body;
    
    if (!provider) {
      return res.status(400).json({ error: 'Provider required' });
    }
    
    const userId = req.userId || req.user?.id || 'test_user_123';
    const result = await emailManager.initiateConnection(userId, provider, {
      email,
      credentials,
      returnUrl: req.body.returnUrl || 'http://localhost:5173/dashboard'
    });
    
    if (result.authUrl) {
      res.json({ authUrl: result.authUrl });
    } else if (result.success) {
      res.json({ success: true, message: 'Email connected successfully' });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Failed to connect email:', error);
    res.status(500).json({ error: 'Failed to connect email provider' });
  }
});

// OAuth callback routes are handled in email-connect.js

// Gmail connect and callback routes are handled in email-connect.js

/**
 * GET /api/email/status
 * Check Gmail connection status
 */
router.get('/status', requireAuth, async (req, res) => {
  try {
    // First check session
    if (req.session && req.session.gmailConnection) {
      const conn = req.session.gmailConnection;
      return res.json({
        connected: true,
        accounts: [{
          email: conn.email,
          connectedAt: conn.connectedAt,
          picture: conn.userInfo?.picture
        }]
      });
    }
    
    // Then check in-memory service
    const userId = req.userId || req.user?.id || 'test_user_123';
    const connections = await googleOAuthService.getUserConnections(userId);
    
    res.json({
      connected: connections.length > 0,
      accounts: connections.map(conn => ({
        email: conn.email,
        connectedAt: conn.connectedAt,
        lastRefreshed: conn.lastRefreshed,
        picture: conn.userInfo?.picture
      }))
    });
  } catch (error) {
    console.error('Failed to get Gmail status:', error);
    res.status(500).json({ error: 'Failed to check Gmail status' });
  }
});

/**
 * POST /api/email/disconnect
 * Disconnect Gmail account
 */
router.post('/disconnect', requireAuth, async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email address required' });
    }
    
    const userId = req.userId || req.user?.id || 'test_user_123';
    await googleOAuthService.disconnect(userId, email);
    
    res.json({ 
      success: true, 
      message: 'Gmail disconnected successfully' 
    });
  } catch (error) {
    console.error('Failed to disconnect Gmail:', error);
    res.status(500).json({ error: 'Failed to disconnect Gmail' });
  }
});

/**
 * GET /api/email/test
 * Test Gmail connection
 */
router.get('/test/:email?', requireAuth, async (req, res) => {
  try {
    const email = req.params.email || null;
    const userId = req.userId || req.user?.id || 'test_user_123';
    const result = await googleOAuthService.testConnection(userId, email);
    
    res.json(result);
  } catch (error) {
    console.error('Gmail test failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/email/inbox
 * Fetch user's email inbox
 */
router.get('/inbox', requireAuth, async (req, res) => {
  try {
    const { email, provider = 'gmail', maxResults = 20, pageToken, query } = req.query;
    
    if (!email) {
      return res.status(400).json({ error: 'Email address required' });
    }
    
    const userId = req.userId || req.user?.id || 'test_user_123';
    const result = await emailManager.fetchInbox(userId, provider, email, {
      maxResults: parseInt(maxResults),
      pageToken,
      query
    });
    
    res.json(result);
    
  } catch (error) {
    console.error('Failed to fetch inbox:', error);
    res.status(500).json({ error: 'Failed to fetch inbox' });
  }
});

/**
 * GET /api/email/message/:id
 * Get full message details
 */
router.get('/message/:id', requireAuth, async (req, res) => {
  try {
    const { email, provider = 'gmail' } = req.query;
    const { id } = req.params;
    
    if (!email) {
      return res.status(400).json({ error: 'Email address required' });
    }
    
    const userId = req.userId || req.user?.id || 'test_user_123';
    const message = await emailManager.getMessage(userId, provider, email, id);
    
    res.json(message);
    
  } catch (error) {
    console.error('Failed to fetch message:', error);
    res.status(500).json({ error: 'Failed to fetch message' });
  }
});

/**
 * POST /api/email/message/:id/modify
 * Modify message (mark read/unread, add labels, etc.)
 */
router.post('/message/:id/modify', requireAuth, async (req, res) => {
  try {
    const { email, addLabelIds = [], removeLabelIds = [] } = req.body;
    const { id } = req.params;
    
    const userId = req.userId || req.user?.id || 'test_user_123';
    const { gmail } = await googleOAuthService.getGmailClient(userId, email);
    
    await gmail.users.messages.modify({
      userId: 'me',
      id,
      requestBody: {
        addLabelIds,
        removeLabelIds
      }
    });
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Failed to modify message:', error);
    res.status(500).json({ error: 'Failed to modify message' });
  }
});

/**
 * Helper function to parse message parts
 */
function parseMessageParts(message) {
  const headers = message.payload.headers.reduce((acc, header) => {
    acc[header.name.toLowerCase()] = header.value;
    return acc;
  }, {});
  
  let body = '';
  let htmlBody = '';
  let attachments = [];
  
  function extractParts(parts) {
    for (const part of parts) {
      if (part.parts) {
        extractParts(part.parts);
      } else {
        if (part.mimeType === 'text/plain' && part.body.data) {
          body += Buffer.from(part.body.data, 'base64').toString('utf-8');
        } else if (part.mimeType === 'text/html' && part.body.data) {
          htmlBody += Buffer.from(part.body.data, 'base64').toString('utf-8');
        } else if (part.filename) {
          attachments.push({
            filename: part.filename,
            mimeType: part.mimeType,
            size: part.body.size,
            attachmentId: part.body.attachmentId
          });
        }
      }
    }
  }
  
  if (message.payload.parts) {
    extractParts(message.payload.parts);
  } else if (message.payload.body.data) {
    body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
  }
  
  return {
    id: message.id,
    threadId: message.threadId,
    headers,
    subject: headers.subject,
    from: headers.from,
    to: headers.to,
    date: headers.date,
    body: body || htmlBody,
    htmlBody,
    snippet: message.snippet,
    labelIds: message.labelIds,
    attachments
  };
}

/**
 * POST /api/email/message/:id/send-to-tala
 * Analyze email and extract tasks/information
 */
router.post('/message/:id/send-to-tala', requireAuth, async (req, res) => {
  try {
    const { email, provider = 'gmail' } = req.body;
    const { id } = req.params;
    
    const userId = req.userId || req.user?.id || 'test_user_123';
    const result = await emailManager.analyzeEmail(userId, provider, email, id);
    
    res.json(result);
  } catch (error) {
    console.error('Failed to analyze email:', error);
    res.status(500).json({ error: 'Failed to analyze email' });
  }
});

/**
 * DELETE /api/email/disconnect
 * Remove email connection
 */
router.delete('/disconnect', requireAuth, async (req, res) => {
  try {
    const { email, provider } = req.body;
    
    if (!email || !provider) {
      return res.status(400).json({ error: 'Email and provider required' });
    }
    
    const userId = req.userId || req.user?.id || 'test_user_123';
    await emailManager.disconnectEmail(userId, provider, email);
    
    res.json({ 
      success: true, 
      message: 'Email disconnected successfully' 
    });
  } catch (error) {
    console.error('Failed to disconnect email:', error);
    res.status(500).json({ error: 'Failed to disconnect email' });
  }
});

/**
 * GET /api/email/sync/status
 * Get sync status for user's email accounts
 */
router.get('/sync/status', requireAuth, async (req, res) => {
  try {
    const userId = req.userId || req.user?.id || 'test_user_123';
    const status = await syncService.getSyncStatus(userId);
    res.json(status);
  } catch (error) {
    console.error('Failed to get sync status:', error);
    res.status(500).json({ error: 'Failed to get sync status' });
  }
});

/**
 * POST /api/email/sync
 * Trigger manual sync
 */
router.post('/sync', requireAuth, async (req, res) => {
  try {
    const { email, provider } = req.body;
    
    const userId = req.userId || req.user?.id || 'test_user_123';
    const result = await syncService.triggerSync(userId, email, provider);
    
    res.json(result);
  } catch (error) {
    console.error('Failed to trigger sync:', error);
    res.status(500).json({ error: 'Failed to trigger sync' });
  }
});

/**
 * GET /api/email/search
 * Search emails
 */
router.get('/search', requireAuth, async (req, res) => {
  try {
    const { query, email, provider = 'gmail', limit = 20 } = req.query;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query required' });
    }
    
    const userId = req.userId || req.user?.id || 'test_user_123';
    const results = await emailManager.searchEmails(userId, provider, email, {
      query,
      limit: parseInt(limit)
    });
    
    res.json(results);
  } catch (error) {
    console.error('Failed to search emails:', error);
    res.status(500).json({ error: 'Failed to search emails' });
  }
});

export default router;