/**
 * Email Routes
 * 
 * Handles email provider integration and email operations
 */

import express from 'express';
import googleOAuthService from '../services/auth/GoogleOAuthService.js';
import emailManager from '../services/email/EmailManager.js';
import emailSyncService from '../services/email/EmailSyncService.js';
import realGmailService from '../services/auth/RealGmailService.js';
import tokenStorageService from '../services/auth/TokenStorageService.js';
import { requireAuth, authenticate } from '../middleware/auth.js';

const router = express.Router();
const syncService = emailSyncService;

/**
 * GET /api/email/connect/gmail
 * Initiate Gmail OAuth flow
 */
router.get('/connect/gmail', (req, res) => {
    try {
        // Get userId from auth middleware or query param
        const userId = req.userId || req.query.userId || 'test_user_123';
        
        // Store user ID in state for callback
        const state = Buffer.from(JSON.stringify({
            userId: userId,
            returnUrl: req.query.returnUrl || 'http://localhost:5173/email?connected=true'
        })).toString('base64');
        
        const authUrl = googleOAuthService.getAuthUrl(state);
        
        console.log('🔗 Redirecting to Google OAuth:', authUrl);
        console.log('📧 Client ID:', process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + '...');
        res.redirect(authUrl);
    } catch (error) {
        console.error('Error initiating Gmail connection:', error);
        res.status(500).json({ error: 'Failed to initiate Gmail connection', details: error.message });
    }
});

/**
 * GET /api/email/callback/gmail
 * Gmail OAuth callback
 */
router.get('/callback/gmail', async (req, res) => {
    try {
        const { code, state, error } = req.query;
        
        if (error) {
            console.error('OAuth error:', error);
            return res.redirect('http://localhost:5173/email?error=auth_denied');
        }
        
        if (!code) {
            return res.redirect('http://localhost:5173/email?error=no_code');
        }
        
        // Decode state
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
        
        try {
            // Use real Gmail API
            console.log('🔄 Exchanging OAuth code for tokens...');
            const { tokens, userInfo } = await realGmailService.exchangeCodeForTokens(code);
            console.log('✅ Gmail connected successfully for:', userInfo.email);
            
            // Save tokens persistently
            await tokenStorageService.saveGmailIntegration(
                stateData.userId,
                userInfo.email,
                tokens
            );
            
            // Also store in GoogleOAuthService for immediate access
            await googleOAuthService.storeUserConnection(
                stateData.userId,
                userInfo.email,
                tokens,
                userInfo
            );
            
            console.log('✅ Gmail tokens saved persistently for user:', stateData.userId);
            
            // Test the connection
            const testResult = await realGmailService.testConnection(tokens.access_token);
            console.log('📧 Gmail test result:', testResult);
            
            // Redirect back to app with success
            const returnUrl = stateData.returnUrl + '&email=' + encodeURIComponent(userInfo.email) + '&realGmail=true';
            res.redirect(returnUrl);
            
        } catch (oauthError) {
            console.error('📧 OAuth failed:', oauthError.message);
            
            // Redirect back to app with error
            const returnUrl = stateData.returnUrl.split('?')[0] + '?error=oauth_failed&message=' + encodeURIComponent(oauthError.message);
            res.redirect(returnUrl);
        }
        
    } catch (error) {
        console.error('OAuth callback error:', error);
        res.redirect('http://localhost:5173/email?error=callback_failed');
    }
});

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
    const userId = req.userId || req.user?.id || 'test_user_123';
    
    // First check in-memory service
    let connections = await googleOAuthService.getUserConnections(userId);
    
    // If no connections in memory, try to load from persistent storage
    if (connections.length === 0) {
      const storedResult = await tokenStorageService.getGmailTokens(userId);
      if (storedResult && storedResult.success && storedResult.tokens) {
        // Restore connection to memory
        await googleOAuthService.storeUserConnection(
          userId,
          storedResult.tokens.email,
          storedResult.tokens,
          { email: storedResult.tokens.email }
        );
        connections = await googleOAuthService.getUserConnections(userId);
      }
    }
    
    // Check session as fallback
    if (connections.length === 0 && req.session && req.session.gmailConnection) {
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
    const userId = req.userId || req.user?.id || 'test_user_123';
    
    // If no email provided, disconnect all Gmail accounts for the user
    if (!email) {
      const connections = await googleOAuthService.getUserConnections(userId);
      
      if (connections.length === 0) {
        return res.status(400).json({ error: 'No Gmail connections found' });
      }
      
      // Disconnect all Gmail accounts
      for (const conn of connections) {
        await googleOAuthService.disconnect(userId, conn.email);
        // Also remove from persistent storage
        await tokenStorageService.removeGmailIntegration(userId);
      }
      
      res.json({ 
        success: true, 
        message: 'All Gmail accounts disconnected successfully' 
      });
    } else {
      // Disconnect specific email
      await googleOAuthService.disconnect(userId, email);
      // Also remove from persistent storage
      await tokenStorageService.removeGmailIntegration(userId);
      
      res.json({ 
        success: true, 
        message: 'Gmail disconnected successfully' 
      });
    }
  } catch (error) {
    console.error('Failed to disconnect Gmail:', error);
    res.status(500).json({ error: 'Failed to disconnect Gmail' });
  }
});

/**
 * GET /api/email/test
 * Test Gmail connection
 */
router.get('/test', requireAuth, async (req, res) => {
  try {
    const email = req.query.email || null;
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
 * GET /api/email/messages
 * Fetch user's email messages (alias for inbox)
 */
router.get('/messages', requireAuth, async (req, res) => {
  try {
    const { email, provider = 'gmail', maxResults = 20, pageToken, query } = req.query;
    
    // If no email specified, get the first connected account
    let targetEmail = email;
    const userId = req.userId || req.user?.id || 'test_user_123';
    
    if (!targetEmail) {
      let connections = await googleOAuthService.getUserConnections(userId);
      
      // If no connections in memory, try to load from persistent storage
      if (connections.length === 0) {
        const storedResult = await tokenStorageService.getGmailTokens(userId);
        if (storedResult && storedResult.success && storedResult.tokens) {
          // Restore connection to memory
          await googleOAuthService.storeUserConnection(
            userId,
            storedResult.tokens.email,
            storedResult.tokens,
            { email: storedResult.tokens.email }
          );
          connections = await googleOAuthService.getUserConnections(userId);
        }
      }
      
      if (connections.length > 0) {
        targetEmail = connections[0].email;
      }
    }
    
    if (!targetEmail) {
      return res.status(400).json({ error: 'No Gmail account connected' });
    }
    
    const result = await emailManager.fetchInbox(userId, provider, targetEmail, {
      maxResults: parseInt(maxResults),
      pageToken,
      query
    });
    
    res.json(result);
    
  } catch (error) {
    console.error('Failed to fetch messages:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to fetch messages',
      details: error.message 
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