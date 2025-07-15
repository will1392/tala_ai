/**
 * Email Connection Routes
 * Handles Gmail OAuth flow
 */

import express from 'express';
import googleOAuthService from '../services/auth/GoogleOAuthService.js';
import realGmailService from '../services/auth/RealGmailService.js';
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
            
            // Store tokens temporarily in session (in production, use secure storage)
            req.session = req.session || {};
            req.session.gmailTokens = tokens;
            req.session.gmailUser = userInfo;
            
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
        // In production, get tokens from secure storage
        const tokens = req.session?.gmailTokens;
        
        if (!tokens) {
            return res.status(401).json({ error: 'Not connected to Gmail' });
        }
        
        const result = await realGmailService.testConnection(tokens.access_token);
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
        // Check for real Gmail tokens first
        const tokens = req.session?.gmailTokens;
        
        if (tokens && tokens.access_token) {
            // Use real Gmail API
            console.log('📧 Fetching real Gmail messages...');
            try {
                const result = await realGmailService.listMessages(tokens.access_token, {
                    maxResults: parseInt(req.query.maxResults) || 20,
                    query: req.query.q || 'in:inbox',
                    pageToken: req.query.pageToken
                });
                
                console.log(`✅ Fetched ${result.messages.length} real Gmail messages`);
                return res.json(result);
            } catch (gmailError) {
                console.error('Gmail API error:', gmailError);
                return res.status(503).json({
                    error: 'Gmail API error',
                    message: 'Unable to fetch Gmail messages at this time',
                    code: 'GMAIL_API_ERROR'
                });
            }
        }
        
        // No tokens available - return error
        if (!tokens) {
            console.log('❌ No Gmail tokens available');
            return res.status(401).json({
                error: 'Gmail not connected',
                message: 'Please connect your Gmail account to view emails',
                code: 'GMAIL_NOT_CONNECTED'
            });
        }
        
        const result = await googleOAuthService.listMessages(tokens, {
            maxResults: parseInt(req.query.maxResults) || 20,
            query: req.query.q || 'in:inbox',
            pageToken: req.query.pageToken
        });
        
        res.json(result);
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
        const tokens = req.session?.gmailTokens;
        
        if (tokens && tokens.access_token) {
            // Use real Gmail API
            try {
                const message = await realGmailService.getMessage(tokens.access_token, req.params.id);
                return res.json(message);
            } catch (gmailError) {
                console.error('Gmail API error:', gmailError);
                return res.status(503).json({
                    error: 'Gmail API error', 
                    message: 'Unable to fetch this message at this time',
                    code: 'GMAIL_API_ERROR'
                });
            }
        }
        
        // No tokens available - return error
        if (!tokens) {
            return res.status(401).json({
                error: 'Gmail not connected',
                message: 'Please connect your Gmail account to view this message',
                code: 'GMAIL_NOT_CONNECTED'
            });
        }
        
        res.status(500).json({ error: 'No valid tokens available' });
    } catch (error) {
        console.error('Get message error:', error);
        res.status(500).json({ error: 'Failed to get message' });
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

export default router;