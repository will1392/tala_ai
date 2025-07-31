/**
 * Email Connection Routes
 * Handles Gmail OAuth flow
 */

import express from 'express';
import googleOAuthService from '../services/auth/GoogleOAuthService.js';
import realGmailService from '../services/auth/RealGmailService.js';
import tokenStorageService from '../services/auth/TokenStorageService.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
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
 * Test Gmail connection
 */
router.get('/test', authenticate, async (req, res) => {
    try {
        // Get tokens from persistent storage
        const tokenResult = await tokenStorageService.getGmailTokens(req.userId);
        
        if (!tokenResult.success || !tokenResult.tokens) {
            return res.status(401).json({ error: tokenResult.error || 'Not connected to Gmail' });
        }
        
        const result = await realGmailService.testConnection(tokenResult.tokens.access_token);
        res.json(result);
    } catch (error) {
        console.error('Test connection error:', error);
        res.status(500).json({ error: 'Failed to test connection' });
    }
});

/**
 * List emails
 */
router.get('/messages', authenticate, async (req, res) => {
    try {
        // Get tokens from persistent storage
        const tokenResult = await tokenStorageService.getGmailTokens(req.userId);
        
        if (!tokenResult.success || !tokenResult.tokens) {
            console.log('❌ No Gmail tokens available');
            return res.status(401).json({
                error: 'Gmail not connected',
                message: 'Please connect your Gmail account to view emails',
                code: 'GMAIL_NOT_CONNECTED'
            });
        }
        
        let accessToken = tokenResult.tokens.access_token;
        
        // Check if token needs refresh
        if (tokenResult.needsRefresh && tokenResult.tokens.refresh_token) {
            console.log('🔄 Refreshing Gmail access token...');
            try {
                const refreshResult = await realGmailService.refreshToken(tokenResult.tokens.refresh_token);
                
                // Update stored tokens
                await tokenStorageService.updateGmailTokens(req.userId, refreshResult);
                
                accessToken = refreshResult.access_token;
                console.log('✅ Access token refreshed successfully');
            } catch (refreshError) {
                console.error('Token refresh failed:', refreshError);
                // Continue with existing token, it might still work
            }
        }
        
        // Use real Gmail API
        console.log('📧 Fetching real Gmail messages...');
        try {
            const result = await realGmailService.listMessages(accessToken, {
                maxResults: parseInt(req.query.maxResults) || 20,
                query: req.query.q || 'in:inbox',
                pageToken: req.query.pageToken
            });
            
            console.log(`✅ Fetched ${result.messages.length} real Gmail messages`);
            return res.json(result);
        } catch (gmailError) {
            console.error('Gmail API error:', gmailError);
            
            // Check if it's an authentication error
            if (gmailError.message && gmailError.message.includes('401')) {
                // Update integration status
                await tokenStorageService.updateIntegrationStatus(
                    tokenResult.integrationId,
                    'error',
                    'Authentication failed - please reconnect'
                );
                
                return res.status(401).json({
                    error: 'Gmail authentication failed',
                    message: 'Please reconnect your Gmail account',
                    code: 'GMAIL_AUTH_FAILED'
                });
            }
            
            return res.status(503).json({
                error: 'Gmail API error',
                message: 'Unable to fetch Gmail messages at this time',
                code: 'GMAIL_API_ERROR'
            });
        }
    } catch (error) {
        console.error('List messages error:', error);
        res.status(500).json({ error: 'Failed to list messages' });
    }
});

/**
 * Get single message
 */
router.get('/message/:id', authenticate, async (req, res) => {
    try {
        // Get tokens from persistent storage
        const tokenResult = await tokenStorageService.getGmailTokens(req.userId);
        
        if (!tokenResult.success || !tokenResult.tokens) {
            return res.status(401).json({
                error: 'Gmail not connected',
                message: 'Please connect your Gmail account to view this message',
                code: 'GMAIL_NOT_CONNECTED'
            });
        }
        
        let accessToken = tokenResult.tokens.access_token;
        
        // Check if token needs refresh
        if (tokenResult.needsRefresh && tokenResult.tokens.refresh_token) {
            console.log('🔄 Refreshing Gmail access token for message fetch...');
            try {
                const refreshResult = await realGmailService.refreshToken(tokenResult.tokens.refresh_token);
                await tokenStorageService.updateGmailTokens(req.userId, refreshResult);
                accessToken = refreshResult.access_token;
            } catch (refreshError) {
                console.error('Token refresh failed:', refreshError);
            }
        }
        
        // Use real Gmail API
        try {
            const message = await realGmailService.getMessage(accessToken, req.params.id);
            return res.json(message);
        } catch (gmailError) {
            console.error('Gmail API error:', gmailError);
            
            // Check if it's an authentication error
            if (gmailError.message && gmailError.message.includes('401')) {
                await tokenStorageService.updateIntegrationStatus(
                    tokenResult.integrationId,
                    'error',
                    'Authentication failed - please reconnect'
                );
                
                return res.status(401).json({
                    error: 'Gmail authentication failed',
                    message: 'Please reconnect your Gmail account',
                    code: 'GMAIL_AUTH_FAILED'
                });
            }
            
            return res.status(503).json({
                error: 'Gmail API error', 
                message: 'Unable to fetch this message at this time',
                code: 'GMAIL_API_ERROR'
            });
        }
    } catch (error) {
        console.error('Get message error:', error);
        res.status(500).json({ error: 'Failed to get message' });
    }
});

/**
 * Check Gmail connection status
 */
router.get('/status', authenticate, async (req, res) => {
    try {
        const status = await tokenStorageService.getGmailStatus(req.userId);
        res.json(status);
    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({ error: 'Failed to check connection status' });
    }
});

/**
 * Disconnect Gmail
 */
router.delete('/disconnect', authenticate, async (req, res) => {
    try {
        const result = await tokenStorageService.removeGmailIntegration(req.userId);
        
        if (result.success) {
            console.log(`✅ Gmail disconnected for user: ${req.userId}`);
            return res.json({ success: true, message: 'Gmail disconnected successfully' });
        }
        
        return res.status(400).json({ 
            success: false, 
            error: result.error || 'Failed to disconnect Gmail' 
        });
    } catch (error) {
        console.error('Disconnect error:', error);
        res.status(500).json({ error: 'Failed to disconnect Gmail' });
    }
});

/**
 * Simple test endpoint to verify OAuth flow
 */
router.get('/test-oauth', (req, res) => {
    const { state } = req.query;
    
    if (state) {
        try {
            const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
            const returnUrl = stateData.returnUrl + '&email=' + encodeURIComponent('test@example.com');
            res.redirect(returnUrl);
        } catch (error) {
            res.redirect('http://localhost:5173/email?error=test_failed');
        }
    } else {
        res.redirect('http://localhost:5173/email?connected=true&email=test@example.com');
    }
});

/**
 * Disconnect Gmail
 */
router.post('/disconnect', authenticate, async (req, res) => {
    try {
        await tokenStorageService.removeGmailIntegration(req.userId);
        
        // Clear session
        if (req.session) {
            delete req.session.gmailTokens;
            delete req.session.gmailUser;
        }
        
        console.log(`✅ Gmail disconnected for user: ${req.userId}`);
        res.json({ success: true, message: 'Gmail disconnected successfully' });
    } catch (error) {
        console.error('Disconnect error:', error);
        res.status(500).json({ error: 'Failed to disconnect Gmail' });
    }
});

/**
 * Debug endpoint to check token storage (development only)
 */
router.get('/debug/check-tokens', authenticate, async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ error: 'Not found' });
    }
    
    try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const { fileURLToPath } = await import('url');
        const { dirname } = await import('path');
        
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        const tokenPath = path.join(__dirname, '../data/oauth-tokens', `gmail-${req.userId}.json`);
        
        try {
            const stats = await fs.stat(tokenPath);
            const content = await fs.readFile(tokenPath, 'utf8');
            const data = JSON.parse(content);
            
            res.json({
                exists: true,
                path: tokenPath,
                size: stats.size,
                modified: stats.mtime,
                userId: data.user_id,
                status: data.status,
                hasTokens: !!data.config
            });
        } catch (error) {
            res.json({
                exists: false,
                path: tokenPath,
                error: error.message
            });
        }
    } catch (error) {
        res.status(500).json({ error: 'Debug check failed' });
    }
});

export default router;