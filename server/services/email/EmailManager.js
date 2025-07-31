/**
 * Email Manager Service
 * 
 * Central service for managing email provider connections and operations
 */

import { BaseService } from '../db/baseService.js';
import googleOAuthService from '../auth/GoogleOAuthService.js';
import encryptionUtils from '../../utils/encryption.js';
import EmailParser from './EmailParser.js';
import mockEmailProvider from './MockEmailProvider.js';
// Use Map as LRU cache fallback since lru-cache import is causing issues
class SimpleLRUCache extends Map {
  constructor(options = {}) {
    super();
    this.maxSize = options.max || 500;
    this.ttl = options.ttl || 1000 * 60 * 30;
    this.timestamps = new Map();
  }

  set(key, value) {
    // Remove oldest if at capacity
    if (this.size >= this.maxSize) {
      const firstKey = this.keys().next().value;
      this.delete(firstKey);
      this.timestamps.delete(firstKey);
    }
    
    super.set(key, value);
    this.timestamps.set(key, Date.now());
    return this;
  }

  get(key) {
    const value = super.get(key);
    if (value === undefined) return undefined;
    
    // Check TTL
    const timestamp = this.timestamps.get(key);
    if (timestamp && Date.now() - timestamp > this.ttl) {
      this.delete(key);
      this.timestamps.delete(key);
      return undefined;
    }
    
    return value;
  }

  delete(key) {
    this.timestamps.delete(key);
    return super.delete(key);
  }

  clear() {
    this.timestamps.clear();
    return super.clear();
  }

  keys() {
    // Clean expired entries first
    const now = Date.now();
    for (const [key, timestamp] of this.timestamps.entries()) {
      if (now - timestamp > this.ttl) {
        this.delete(key);
      }
    }
    return super.keys();
  }
}

const LRUCache = SimpleLRUCache;

class EmailManager extends BaseService {
  constructor() {
    super('user_email_accounts', {
      enableLogging: true,
      enableSoftDelete: false
    });

    // Email parser instance
    this.emailParser = new EmailParser();

    // Cache for recent emails
    this.emailCache = new LRUCache({
      max: 500,
      ttl: 1000 * 60 * 30, // 30 minutes
      updateAgeOnGet: true
    });

    // Mock accounts for testing
    this.mockAccounts = [];

    // Available providers configuration
    this.providers = {
      gmail: {
        name: 'Gmail',
        type: 'oauth',
        icon: 'gmail',
        description: 'Connect your Gmail account',
        scopes: [
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/gmail.modify'
        ]
      },
      outlook: {
        name: 'Outlook',
        type: 'oauth',
        icon: 'outlook',
        description: 'Connect your Outlook/Hotmail account',
        scopes: ['Mail.Read', 'Mail.ReadWrite']
      },
      imap: {
        name: 'IMAP',
        type: 'credentials',
        icon: 'mail',
        description: 'Connect any email account via IMAP',
        fields: ['host', 'port', 'username', 'password', 'secure']
      },
      mock: {
        name: 'Mock Provider',
        type: 'mock',
        icon: 'mail',
        description: 'Mock email provider for testing',
        fields: []
      }
    };
  }

  /**
   * Get available email providers
   * @returns {Array} List of providers
   */
  getAvailableProviders() {
    return Object.entries(this.providers).map(([key, provider]) => ({
      id: key,
      ...provider
    }));
  }

  /**
   * Initiate email provider connection
   * @param {string} userId - User ID
   * @param {string} provider - Provider ID
   * @param {Object} options - Connection options
   * @returns {Object} Connection result
   */
  async initiateConnection(userId, provider, options = {}) {
    const providerConfig = this.providers[provider];
    if (!providerConfig) {
      throw new Error('Invalid email provider');
    }

    if (providerConfig.type === 'oauth') {
      // OAuth providers
      switch (provider) {
        case 'gmail':
          const authUrl = googleOAuthService.generateAuthUrl(userId, {
            returnUrl: options.returnUrl
          });
          return { authUrl };

        case 'outlook':
          // TODO: Implement Outlook OAuth
          throw new Error('Outlook OAuth not implemented yet');

        default:
          throw new Error('Unknown OAuth provider');
      }
    } else if (providerConfig.type === 'credentials') {
      // IMAP/SMTP providers
      return await this.connectIMAPAccount(userId, options);
    } else if (providerConfig.type === 'mock') {
      // Mock provider for testing
      const email = options.email || options.credentials?.email || 'test@example.com';
      await this.storeEmailAccount(userId, 'mock', email, {
        mock: true
      });
      return { 
        success: true, 
        message: 'Mock email connected successfully' 
      };
    }
  }

  /**
   * Handle OAuth callback
   * @param {string} provider - Provider ID
   * @param {string} code - Authorization code
   * @param {string} state - State parameter
   * @returns {Object} Connection result
   */
  async handleOAuthCallback(provider, code, state) {
    switch (provider) {
      case 'gmail':
        const stateData = googleOAuthService.parseState(state);
        const tokenData = await googleOAuthService.getTokens(code);
        const email = await googleOAuthService.storeUserTokens(stateData.userId, tokenData);
        
        // Store in our email accounts table too
        await this.storeEmailAccount(stateData.userId, 'gmail', email, {
          oauth: true,
          userInfo: tokenData.userInfo
        });
        
        return {
          success: true,
          userId: stateData.userId,
          email,
          returnUrl: stateData.returnUrl
        };

      case 'outlook':
        // TODO: Implement Outlook callback
        throw new Error('Outlook callback not implemented yet');

      default:
        throw new Error('Unknown provider');
    }
  }

  /**
   * Connect IMAP account
   * @param {string} userId - User ID
   * @param {Object} credentials - IMAP credentials
   * @returns {Object} Connection result
   */
  async connectIMAPAccount(userId, credentials) {
    const { email, host, port, username, password, secure = true } = credentials;

    // Validate credentials
    if (!email || !host || !port || !username || !password) {
      return { 
        success: false, 
        error: 'All IMAP credentials required' 
      };
    }

    // Encrypt credentials
    const encryptedCredentials = {
      host,
      port,
      username,
      password: encryptionUtils.encrypt(password),
      secure
    };

    // Store account
    await this.storeEmailAccount(userId, 'imap', email, {
      credentials: encryptedCredentials
    });

    return { 
      success: true, 
      message: 'IMAP account connected successfully' 
    };
  }

  /**
   * Store email account
   * @param {string} userId - User ID
   * @param {string} provider - Provider ID
   * @param {string} email - Email address
   * @param {Object} settings - Account settings
   */
  async storeEmailAccount(userId, provider, email, settings = {}) {
    try {
      // Check if database methods are available
      if (this.findOne && this.create && this.updateById) {
        const existingAccount = await this.findOne({
          user_id: userId,
          provider,
          email_address: email
        });

        const accountData = {
          user_id: userId,
          provider,
          email_address: email,
          settings: settings,
          is_active: true,
          connected_at: new Date(),
          last_sync: null
        };

        if (existingAccount) {
          await this.updateById(existingAccount.id, accountData);
          this.log(`Updated ${provider} account for user ${userId}`, 'info');
        } else {
          await this.create(accountData);
          this.log(`Connected new ${provider} account for user ${userId}`, 'info');
        }
      } else {
        // Fallback for testing without database
        this.log(`Mock storing ${provider} account for user ${userId}`, 'info');
        
        // Store in mock accounts
        const mockAccount = {
          id: `mock-${Date.now()}`,
          provider,
          email,
          connectedAt: new Date(),
          lastSync: null,
          settings,
          userId
        };
        
        // Remove any existing account for this email
        this.mockAccounts = this.mockAccounts.filter(acc => 
          !(acc.email === email && acc.provider === provider && acc.userId === userId)
        );
        
        this.mockAccounts.push(mockAccount);
      }
    } catch (error) {
      // Fallback for testing
      this.log(`Failed to store account in DB, using mock: ${error.message}`, 'warn');
      
      // Store in mock accounts
      const mockAccount = {
        id: `mock-${Date.now()}`,
        provider,
        email,
        connectedAt: new Date(),
        lastSync: null,
        settings,
        userId
      };
      
      this.mockAccounts.push(mockAccount);
    }
  }

  /**
   * Get user's email accounts
   * @param {string} userId - User ID
   * @returns {Array} Email accounts
   */
  async getUserAccounts(userId) {
    try {
      if (this.findMany) {
        const accounts = await this.findMany({
          user_id: userId,
          is_active: true
        });

        return accounts.map(account => ({
          id: account.id,
          provider: account.provider,
          email: account.email_address,
          connectedAt: account.connected_at,
          lastSync: account.last_sync,
          settings: account.settings
        }));
      } else {
        // Fallback for testing
        return this.mockAccounts.filter(acc => acc.userId === userId) || [];
      }
    } catch (error) {
      this.log(`Failed to get accounts from DB, using mock: ${error.message}`, 'warn');
      return this.mockAccounts.filter(acc => acc.userId === userId) || [];
    }
  }

  /**
   * Get email client for provider
   * @param {string} userId - User ID
   * @param {string} provider - Provider ID
   * @param {string} email - Email address
   * @returns {Object} Email client
   */
  async getEmailClient(userId, provider, email) {
    switch (provider) {
      case 'gmail':
        return await googleOAuthService.getGmailClient(userId, email);

      case 'imap':
        const account = await this.findOne({
          user_id: userId,
          provider: 'imap',
          email_address: email
        });

        if (!account) {
          throw new Error('IMAP account not found');
        }

        // Decrypt password
        const credentials = account.settings.credentials;
        credentials.password = encryptionUtils.decrypt(credentials.password);

        // TODO: Return IMAP client
        return { type: 'imap', credentials };

      case 'mock':
        return { type: 'mock', provider: mockEmailProvider };

      default:
        throw new Error('Unsupported provider');
    }
  }

  /**
   * Fetch inbox with pagination
   * @param {string} userId - User ID
   * @param {string} provider - Provider ID
   * @param {string} email - Email address
   * @param {Object} options - Fetch options
   * @returns {Object} Inbox data
   */
  async fetchInbox(userId, provider, email, options = {}) {
    const {
      maxResults = 20,
      pageToken = null,
      query = 'in:inbox',
      includeSpam = false
    } = options;

    console.log('📧 EmailManager.fetchInbox called:', { userId, provider, email, maxResults, query });

    // Check cache first
    const cacheKey = `inbox:${userId}:${provider}:${email}:${query}:${pageToken}`;
    const cached = this.emailCache.get(cacheKey);
    if (cached) {
      console.log('📧 Returning cached results');
      return cached;
    }

    console.log('📧 Getting email client...');
    const client = await this.getEmailClient(userId, provider, email);

    let result;
    if (provider === 'gmail') {
      const { gmail } = client;
      
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults,
        pageToken,
        q: query,
        includeSpamTrash: includeSpam
      });

      // Get message details in parallel
      const messages = await Promise.all(
        (response.data.messages || []).map(async (message) => {
          // Check if message is already parsed (from RealGmailService)
          if (message.subject && message.from) {
            return message; // Already parsed
          }
          return this.getGmailMessage(gmail, message.id, 'metadata');
        })
      );

      result = {
        messages,
        nextPageToken: response.data.nextPageToken,
        resultSizeEstimate: response.data.resultSizeEstimate
      };
    } else if (provider === 'mock') {
      result = await client.provider.getInbox({
        maxResults,
        pageToken,
        query
      });
    } else {
      // TODO: Implement IMAP inbox fetch
      throw new Error('IMAP inbox not implemented yet');
    }

    // Cache result
    this.emailCache.set(cacheKey, result);

    return result;
  }

  /**
   * Get Gmail message
   * @param {Object} gmail - Gmail client
   * @param {string} id - Message ID
   * @param {string} format - Format type
   * @returns {Object} Message data
   */
  async getGmailMessage(gmail, id, format = 'full') {
    const details = await gmail.users.messages.get({
      userId: 'me',
      id,
      format,
      metadataHeaders: ['From', 'To', 'Subject', 'Date', 'Message-ID']
    });

    if (format === 'metadata') {
      const headers = details.data.payload.headers.reduce((acc, header) => {
        acc[header.name.toLowerCase()] = header.value;
        return acc;
      }, {});

      return {
        id: details.data.id,
        threadId: details.data.threadId,
        from: headers.from,
        to: headers.to,
        subject: headers.subject,
        date: headers.date,
        snippet: details.data.snippet,
        labelIds: details.data.labelIds,
        isUnread: details.data.labelIds?.includes('UNREAD'),
        hasAttachments: details.data.payload.parts?.some(p => p.filename) || false
      };
    }

    // Parse full message
    return this.emailParser.parseGmailMessage(details.data);
  }

  /**
   * Get full message details
   * @param {string} userId - User ID
   * @param {string} provider - Provider ID
   * @param {string} email - Email address
   * @param {string} messageId - Message ID
   * @returns {Object} Full message
   */
  async getMessage(userId, provider, email, messageId) {
    // Check cache
    const cacheKey = `message:${userId}:${provider}:${email}:${messageId}`;
    const cached = this.emailCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const client = await this.getEmailClient(userId, provider, email);

    let message;
    if (provider === 'gmail') {
      const { gmail } = client;
      message = await this.getGmailMessage(gmail, messageId, 'full');
    } else if (provider === 'mock') {
      message = await client.provider.getMessage(messageId);
    } else {
      // TODO: Implement IMAP message fetch
      throw new Error('IMAP message fetch not implemented yet');
    }

    // Cache result
    this.emailCache.set(cacheKey, message);

    return message;
  }

  /**
   * Analyze email and extract tasks/information
   * @param {string} userId - User ID
   * @param {string} provider - Provider ID
   * @param {string} email - Email address
   * @param {string} messageId - Message ID
   * @returns {Object} Analysis result
   */
  async analyzeEmail(userId, provider, email, messageId) {
    try {
      // Get full message
      const message = await this.getMessage(userId, provider, email, messageId);

      // Check if already analyzed
      const existingAnalysis = await this.query(`
        SELECT * FROM analyzed_emails 
        WHERE user_id = $1 AND email_id = $2
      `, [userId, messageId]);

      if (existingAnalysis.rows.length > 0) {
        return existingAnalysis.rows[0].analysis_result;
      }

      // Extract and analyze content
      const analysis = await this.emailParser.analyzeEmail(message);

      // Store analysis
      await this.query(`
        INSERT INTO analyzed_emails (
          user_id, email_id, provider, email_address,
          subject, from_email, date_received,
          analysis_result, tasks_extracted,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      `, [
        userId, messageId, provider, email,
        message.subject, message.from, message.date,
        analysis, analysis.tasks || [],
      ]);

      // Mark as processed in Gmail
      if (provider === 'gmail') {
        const client = await this.getEmailClient(userId, provider, email);
        await client.gmail.users.messages.modify({
          userId: 'me',
          id: messageId,
          requestBody: {
            removeLabelIds: ['UNREAD'],
            addLabelIds: ['Label_Tala_Processed'] // Create this label first
          }
        }).catch(err => {
          console.warn('Failed to mark as processed:', err.message);
        });
      }

      return analysis;
    } catch (error) {
      this.log('Failed to analyze email', 'error', { userId, messageId, error: error.message });
      throw error;
    }
  }

  /**
   * Search emails
   * @param {string} userId - User ID
   * @param {string} provider - Provider ID
   * @param {string} email - Email address
   * @param {Object} searchOptions - Search options
   * @returns {Object} Search results
   */
  async searchEmails(userId, provider, email, searchOptions) {
    const { query, limit = 20 } = searchOptions;

    const client = await this.getEmailClient(userId, provider, email);

    if (provider === 'gmail') {
      const { gmail } = client;
      
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: limit
      });

      const messages = await Promise.all(
        (response.data.messages || []).map(async (message) => {
          return this.getGmailMessage(gmail, message.id, 'metadata');
        })
      );

      return {
        messages,
        totalResults: response.data.resultSizeEstimate
      };
    } else if (provider === 'mock') {
      return await client.provider.searchMessages(query, limit);
    } else {
      // TODO: Implement IMAP search
      throw new Error('IMAP search not implemented yet');
    }
  }

  /**
   * Disconnect email account
   * @param {string} userId - User ID
   * @param {string} provider - Provider ID
   * @param {string} email - Email address
   */
  async disconnectEmail(userId, provider, email) {
    if (provider === 'gmail') {
      await googleOAuthService.disconnect(userId, email);
    }

    await this.updateOne(
      { user_id: userId, provider, email_address: email },
      { is_active: false, disconnected_at: new Date() }
    );

    // Clear cache
    const cacheKeys = this.emailCache.keys();
    for (const key of cacheKeys) {
      if (key.includes(`${userId}:${provider}:${email}`)) {
        this.emailCache.delete(key);
      }
    }

    this.log(`Disconnected ${provider} account for user ${userId}`, 'info', { email });
  }

  /**
   * Get connection status
   * @param {string} userId - User ID
   * @returns {Object} Connection status
   */
  async getConnectionStatus(userId) {
    const accounts = await this.getUserAccounts(userId);
    
    const status = {
      connected: accounts.length > 0,
      accounts: []
    };

    for (const account of accounts) {
      const accountStatus = {
        ...account,
        isHealthy: true,
        lastError: null
      };

      // Test connection
      try {
        if (account.provider === 'gmail') {
          await googleOAuthService.testConnection(userId, account.email);
        }
      } catch (error) {
        accountStatus.isHealthy = false;
        accountStatus.lastError = error.message;
      }

      status.accounts.push(accountStatus);
    }

    return status;
  }
}

// Export singleton instance
const emailManager = new EmailManager();
export default emailManager;