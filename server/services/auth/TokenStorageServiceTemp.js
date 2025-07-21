/**
 * Temporary Token Storage Service
 * File-based storage for OAuth tokens until database table is created
 * IMPORTANT: This is a temporary solution. Use database storage in production.
 */

import { encrypt, decrypt } from '../../utils/encryption.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class TokenStorageServiceTemp {
    constructor() {
        this.storageDir = path.join(__dirname, '../../data/oauth-tokens');
        this.ensureStorageDir();
    }

    async ensureStorageDir() {
        try {
            await fs.mkdir(this.storageDir, { recursive: true });
        } catch (error) {
            console.error('Failed to create token storage directory:', error);
        }
    }

    getTokenFilePath(userId) {
        return path.join(this.storageDir, `gmail-${userId}.json`);
    }

    /**
     * Save Gmail OAuth tokens for a user
     */
    async saveGmailIntegration(userId, email, tokens) {
        try {
            // Encrypt sensitive token data
            const encryptedTokens = encrypt(JSON.stringify({
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expiry_date: tokens.expiry_date || tokens.expires_at,
                email: email
            }));

            const integration = {
                id: `temp-${Date.now()}`,
                user_id: userId,
                integration_id: 'gmail',
                config: encryptedTokens,
                status: 'active',
                enabled: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                last_sync_at: new Date().toISOString()
            };

            // Save to file
            const filePath = this.getTokenFilePath(userId);
            await fs.writeFile(filePath, JSON.stringify(integration, null, 2));

            console.log('✅ Gmail integration saved (temporary file storage) for:', email);
            console.log('⚠️  Remember to migrate to database storage when integration_configs table is created');
            
            return integration;
        } catch (error) {
            console.error('Error saving Gmail integration:', error);
            throw error;
        }
    }

    /**
     * Get Gmail integration for a user
     */
    async getGmailIntegration(userId) {
        try {
            const filePath = this.getTokenFilePath(userId);
            
            // Check if file exists
            try {
                await fs.access(filePath);
            } catch {
                return null; // File doesn't exist
            }

            // Read and parse file
            const fileContent = await fs.readFile(filePath, 'utf8');
            const integration = JSON.parse(fileContent);

            return this.decryptIntegration(integration);
        } catch (error) {
            console.error('Error getting Gmail integration:', error);
            return null;
        }
    }

    /**
     * Decrypt integration tokens
     */
    decryptIntegration(integration) {
        if (!integration) return null;

        try {
            const decryptedTokens = JSON.parse(decrypt(integration.config));
            
            return {
                id: integration.id,
                email: decryptedTokens.email,
                tokens: {
                    access_token: decryptedTokens.access_token,
                    refresh_token: decryptedTokens.refresh_token,
                    expiry_date: decryptedTokens.expiry_date
                },
                metadata: {},
                lastSync: integration.last_sync_at
            };
        } catch (error) {
            console.error('Error decrypting tokens:', error);
            return null;
        }
    }

    /**
     * Update Gmail tokens (e.g., after refresh)
     */
    async updateGmailTokens(userId, newTokens) {
        try {
            const existing = await this.getGmailIntegration(userId);
            if (!existing) {
                throw new Error('No existing Gmail integration found');
            }

            // Save updated tokens
            await this.saveGmailIntegration(userId, existing.email, newTokens);
            
            console.log('✅ Gmail tokens updated for user:', userId);
            return true;
        } catch (error) {
            console.error('Error updating Gmail tokens:', error);
            throw error;
        }
    }

    /**
     * Remove Gmail integration
     */
    async removeGmailIntegration(userId) {
        try {
            const filePath = this.getTokenFilePath(userId);
            
            try {
                await fs.unlink(filePath);
                console.log('✅ Gmail integration removed for user:', userId);
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    throw error;
                }
            }

            return { success: true };
        } catch (error) {
            console.error('Error removing Gmail integration:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Check if Gmail is connected for a user
     */
    async getGmailStatus(userId) {
        try {
            const integration = await this.getGmailIntegration(userId);
            
            if (!integration) {
                return { connected: false };
            }

            // Check if token is expired
            const expiryDate = new Date(integration.tokens.expiry_date);
            const isExpired = expiryDate < new Date();

            return {
                connected: !isExpired,
                email: integration.email,
                lastSync: integration.lastSync,
                needsRefresh: isExpired
            };
        } catch (error) {
            console.error('Error checking Gmail status:', error);
            return { connected: false };
        }
    }

    /**
     * Get Gmail tokens with status
     */
    async getGmailTokens(userId) {
        try {
            const integration = await this.getGmailIntegration(userId);
            
            if (!integration) {
                return {
                    success: false,
                    error: 'No Gmail integration found'
                };
            }

            // Check if token needs refresh
            const expiryDate = new Date(integration.tokens.expiry_date);
            const needsRefresh = expiryDate < new Date();

            return {
                success: true,
                tokens: integration.tokens,
                needsRefresh,
                integrationId: integration.id
            };
        } catch (error) {
            console.error('Error getting Gmail tokens:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Update integration status (compatibility method)
     */
    async updateIntegrationStatus(integrationId, status, message) {
        // This is a no-op for file storage
        console.log(`Status update: ${integrationId} - ${status} - ${message}`);
        return true;
    }
}

export default new TokenStorageServiceTemp();