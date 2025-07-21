/**
 * Token Storage Service
 * Handles persistent storage of OAuth tokens with encryption
 */

import { encrypt, decrypt } from '../../utils/encryption.js';
import { getSupabaseService } from '../../db/supabaseClient.js';
import { v4 as uuidv4 } from 'uuid';
import TokenStorageServiceTemp from './TokenStorageServiceTemp.js';

const supabaseAdmin = getSupabaseService();

class TokenStorageService {
    constructor() {
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    generateId() {
        return uuidv4();
    }

    /**
     * Save Gmail OAuth tokens for a user
     */
    async saveGmailIntegration(userId, email, tokens) {
        try {
            // Check if database table exists
            const { error: tableCheckError } = await supabaseAdmin
                .from('integration_configs')
                .select('id')
                .limit(1);
            
            if (tableCheckError && tableCheckError.message.includes('does not exist')) {
                console.log('⚠️  integration_configs table not found, using temporary file storage');
                return TokenStorageServiceTemp.saveGmailIntegration(userId, email, tokens);
            }
            // Encrypt sensitive token data
            const encryptedTokens = encrypt(JSON.stringify({
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expiry_date: tokens.expiry_date || tokens.expires_at,
                email: email
            }));

            const integration = {
                id: this.generateId(),
                user_id: userId,
                integration_id: 'gmail',
                config: encryptedTokens, // Store encrypted tokens in config field
                status: 'active',
                enabled: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                last_sync_at: new Date().toISOString()
            };

            // Check if integration already exists
            const { data: existing } = await supabaseAdmin
                .from('integration_configs')
                .select('id')
                .eq('user_id', userId)
                .eq('integration_id', 'gmail')
                .single();

            let result;
            if (existing) {
                // Update existing integration
                const { data, error } = await supabaseAdmin
                    .from('integration_configs')
                    .update(integration)
                    .eq('id', existing.id)
                    .select()
                    .single();

                if (error) throw error;
                result = data;
            } else {
                // Create new integration
                const { data, error } = await supabaseAdmin
                    .from('integration_configs')
                    .insert(integration)
                    .select()
                    .single();

                if (error) throw error;
                result = data;
            }

            // Update cache
            this.cache.set(userId, {
                data: result,
                timestamp: Date.now()
            });

            console.log('✅ Gmail integration saved for:', email);
            return result;
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
            // Check if database table exists
            const { error: tableCheckError } = await supabaseAdmin
                .from('integration_configs')
                .select('id')
                .limit(1);
            
            if (tableCheckError && tableCheckError.message.includes('does not exist')) {
                return TokenStorageServiceTemp.getGmailIntegration(userId);
            }
            // Check cache first
            const cached = this.cache.get(userId);
            if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
                return this.decryptIntegration(cached.data);
            }

            // Get from database
            const { data, error } = await supabaseAdmin
                .from('integration_configs')
                .select('*')
                .eq('user_id', userId)
                .eq('integration_id', 'gmail')
                .eq('status', 'active')
                .eq('enabled', true)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return null; // No integration found
                }
                throw error;
            }

            // Update cache
            this.cache.set(userId, {
                data: data,
                timestamp: Date.now()
            });

            return this.decryptIntegration(data);
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
                email: decryptedTokens.email || integration.user_id,
                tokens: {
                    access_token: decryptedTokens.access_token,
                    refresh_token: decryptedTokens.refresh_token,
                    expiry_date: decryptedTokens.expiry_date
                },
                metadata: integration.filters || {},
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
            // Check if database table exists
            const { error: tableCheckError } = await supabaseAdmin
                .from('integration_configs')
                .select('id')
                .limit(1);
            
            if (tableCheckError && tableCheckError.message.includes('does not exist')) {
                return TokenStorageServiceTemp.updateGmailTokens(userId, newTokens);
            }
            const encryptedTokens = encrypt(JSON.stringify({
                access_token: newTokens.access_token,
                refresh_token: newTokens.refresh_token,
                expiry_date: newTokens.expiry_date || newTokens.expires_at
            }));

            const { data, error } = await supabaseAdmin
                .from('integration_configs')
                .update({
                    config: encryptedTokens,
                    last_sync_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .eq('integration_id', 'gmail')
                .select()
                .single();

            if (error) throw error;

            // Invalidate cache
            this.cache.delete(userId);

            console.log('✅ Gmail tokens updated for user:', userId);
            return data;
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
            // Check if database table exists
            const { error: tableCheckError } = await supabaseAdmin
                .from('integration_configs')
                .select('id')
                .limit(1);
            
            if (tableCheckError && tableCheckError.message.includes('does not exist')) {
                return TokenStorageServiceTemp.removeGmailIntegration(userId);
            }
            // Soft delete
            const { error } = await supabaseAdmin
                .from('integration_configs')
                .update({
                    status: 'inactive',
                    enabled: false,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId)
                .eq('integration_id', 'gmail');

            if (error) throw error;

            // Remove from cache
            this.cache.delete(userId);

            console.log('✅ Gmail integration removed for user:', userId);
            return true;
        } catch (error) {
            console.error('Error removing Gmail integration:', error);
            throw error;
        }
    }

    /**
     * Check if Gmail is connected for a user
     */
    async getGmailStatus(userId) {
        try {
            // Check if database table exists
            const { error: tableCheckError } = await supabaseAdmin
                .from('integration_configs')
                .select('id')
                .limit(1);
            
            if (tableCheckError && tableCheckError.message.includes('does not exist')) {
                return TokenStorageServiceTemp.getGmailStatus(userId);
            }
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
     * Clear cache for a user
     */
    clearCache(userId) {
        this.cache.delete(userId);
    }

    /**
     * Clear all cache
     */
    clearAllCache() {
        this.cache.clear();
    }
}

// Extended class that adds getGmailTokens and updateIntegrationStatus methods
class ExtendedTokenStorageService extends TokenStorageService {
    async getGmailTokens(userId) {
        try {
            // Check if database table exists
            const { error: tableCheckError } = await supabaseAdmin
                .from('integration_configs')
                .select('id')
                .limit(1);
            
            if (tableCheckError && tableCheckError.message.includes('does not exist')) {
                return TokenStorageServiceTemp.getGmailTokens(userId);
            }

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

    async updateIntegrationStatus(integrationId, status, message) {
        try {
            // Check if database table exists
            const { error: tableCheckError } = await supabaseAdmin
                .from('integration_configs')
                .select('id')
                .limit(1);
            
            if (tableCheckError && tableCheckError.message.includes('does not exist')) {
                return TokenStorageServiceTemp.updateIntegrationStatus(integrationId, status, message);
            }

            const { error } = await supabaseAdmin
                .from('integration_configs')
                .update({
                    status: status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', integrationId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error updating integration status:', error);
            return false;
        }
    }
}

export default new ExtendedTokenStorageService();