/**
 * Real Gmail Service using direct API calls
 * Uses fetch instead of googleapis to avoid package installation issues
 */

class RealGmailService {
    constructor() {
        this.baseUrl = 'https://www.googleapis.com/gmail/v1';
        console.log('📧 Real Gmail Service initialized (Direct API)');
    }

    /**
     * Exchange OAuth code for tokens using direct API
     */
    async exchangeCodeForTokens(code) {
        try {
            const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    code: code,
                    client_id: process.env.GOOGLE_CLIENT_ID,
                    client_secret: process.env.GOOGLE_CLIENT_SECRET,
                    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
                    grant_type: 'authorization_code'
                })
            });

            if (!tokenResponse.ok) {
                throw new Error(`Token exchange failed: ${tokenResponse.status}`);
            }

            const tokens = await tokenResponse.json();
            
            // Get user info
            const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: {
                    'Authorization': `Bearer ${tokens.access_token}`
                }
            });

            const userInfo = await userInfoResponse.json();

            return {
                tokens,
                userInfo
            };
        } catch (error) {
            console.error('Token exchange error:', error);
            throw error;
        }
    }

    /**
     * List Gmail messages using direct API
     */
    async listMessages(accessToken, options = {}) {
        try {
            const params = new URLSearchParams({
                maxResults: options.maxResults || 20,
                q: options.query || 'in:inbox'
            });

            if (options.pageToken) {
                params.append('pageToken', options.pageToken);
            }

            const response = await fetch(`${this.baseUrl}/users/me/messages?${params}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Gmail API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            // Get full details for each message
            const messagesWithDetails = await Promise.all(
                (data.messages || []).slice(0, 10).map(async (message) => {
                    return this.getMessage(accessToken, message.id);
                })
            );

            return {
                messages: messagesWithDetails,
                nextPageToken: data.nextPageToken,
                resultSizeEstimate: data.resultSizeEstimate
            };
        } catch (error) {
            console.error('List messages error:', error);
            throw error;
        }
    }

    /**
     * Get single Gmail message using direct API
     */
    async getMessage(accessToken, messageId) {
        try {
            const response = await fetch(`${this.baseUrl}/users/me/messages/${messageId}`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Gmail API error: ${response.status} ${response.statusText}`);
            }

            const message = await response.json();
            
            // Parse headers
            const headers = {};
            if (message.payload && message.payload.headers) {
                message.payload.headers.forEach(header => {
                    headers[header.name.toLowerCase()] = header.value;
                });
            }

            // Extract body
            let body = '';
            if (message.payload) {
                body = this.extractMessageBody(message.payload);
            }

            // Format date
            const date = new Date(parseInt(message.internalDate));

            return {
                id: message.id,
                threadId: message.threadId,
                from: headers.from || 'Unknown',
                to: headers.to || '',
                subject: headers.subject || '(No Subject)',
                date: date.toISOString(),
                snippet: message.snippet || '',
                body: body,
                labelIds: message.labelIds || [],
                isUnread: message.labelIds?.includes('UNREAD') || false,
                hasAttachments: this.hasAttachments(message.payload)
            };
        } catch (error) {
            console.error('Get message error:', error);
            throw error;
        }
    }

    /**
     * Extract message body from payload
     */
    extractMessageBody(payload) {
        if (payload.body && payload.body.data) {
            return Buffer.from(payload.body.data, 'base64').toString('utf-8');
        }

        if (payload.parts) {
            for (const part of payload.parts) {
                if (part.mimeType === 'text/plain' && part.body && part.body.data) {
                    return Buffer.from(part.body.data, 'base64').toString('utf-8');
                }
                
                // Recursively check nested parts
                if (part.parts) {
                    const nestedBody = this.extractMessageBody(part);
                    if (nestedBody) return nestedBody;
                }
            }

            // If no plain text, try HTML
            for (const part of payload.parts) {
                if (part.mimeType === 'text/html' && part.body && part.body.data) {
                    const html = Buffer.from(part.body.data, 'base64').toString('utf-8');
                    // Simple HTML to text conversion
                    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
                }
            }
        }

        return '';
    }

    /**
     * Check if message has attachments
     */
    hasAttachments(payload) {
        if (payload.parts) {
            return payload.parts.some(part => 
                part.filename && part.filename.length > 0
            );
        }
        return false;
    }

    /**
     * Test Gmail connection
     */
    async testConnection(accessToken) {
        try {
            const response = await fetch(`${this.baseUrl}/users/me/profile`, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                return {
                    success: false,
                    error: `Gmail API error: ${response.status}`
                };
            }

            const profile = await response.json();
            
            return {
                success: true,
                email: profile.emailAddress,
                totalMessages: profile.messagesTotal,
                totalThreads: profile.threadsTotal
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Refresh access token
     */
    async refreshToken(refreshToken) {
        try {
            const response = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    refresh_token: refreshToken,
                    client_id: process.env.GOOGLE_CLIENT_ID,
                    client_secret: process.env.GOOGLE_CLIENT_SECRET,
                    grant_type: 'refresh_token'
                })
            });

            if (!response.ok) {
                throw new Error(`Token refresh failed: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Token refresh error:', error);
            throw error;
        }
    }
}

export default new RealGmailService();