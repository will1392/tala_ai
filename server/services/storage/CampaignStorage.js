/**
 * CampaignStorage - Handles persistence of direct mail campaigns
 */

import { createClient } from '@supabase/supabase-js';

class CampaignStorage {
  constructor() {
    // In-memory fallback storage
    this.inMemoryStorage = new Map();
    
    // Try to initialize Supabase
    try {
      if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
        this.supabase = createClient(
          process.env.SUPABASE_URL,
          process.env.SUPABASE_ANON_KEY
        );
      } else {
        console.warn('⚠️ Supabase credentials not configured, using in-memory storage');
        this.supabase = null;
      }
    } catch (error) {
      console.warn('⚠️ Failed to initialize Supabase client:', error.message);
      this.supabase = null;
    }
  }

  /**
   * Create a new campaign
   */
  async createCampaign(userId, campaignData) {
    try {
      const campaign = {
        user_id: userId,
        type: campaignData.type || 'direct_mail',
        status: campaignData.status || 'consultation',
        name: campaignData.name || `Campaign ${new Date().toLocaleDateString()}`,
        sections: campaignData.sections || {},
        responses: campaignData.responses || {},
        metadata: campaignData.metadata || {},
        created_at: new Date(),
        updated_at: new Date()
      };

      // If Supabase is not available, use in-memory storage
      if (!this.supabase) {
        const inMemoryCampaign = {
          ...campaign,
          id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        this.inMemoryStorage.set(inMemoryCampaign.id, inMemoryCampaign);
        console.log('📝 Created campaign in memory:', inMemoryCampaign.id);
        return inMemoryCampaign;
      }

      const { data, error } = await this.supabase
        .from('direct_mail_campaigns')
        .insert([campaign])
        .select()
        .single();

      if (error) {
        console.error('Error creating campaign in database:', error.message);
        // Fallback to in-memory storage
        const inMemoryCampaign = {
          ...campaign,
          id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        this.inMemoryStorage.set(inMemoryCampaign.id, inMemoryCampaign);
        return inMemoryCampaign;
      }

      return data;
    } catch (error) {
      console.error('Campaign creation error:', error);
      // Return in-memory campaign
      const fallbackCampaign = {
        id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...campaignData,
        user_id: userId,
        created_at: new Date(),
        updated_at: new Date()
      };
      this.inMemoryStorage.set(fallbackCampaign.id, fallbackCampaign);
      return fallbackCampaign;
    }
  }

  /**
   * Get a specific campaign
   */
  async getCampaign(userId, campaignId) {
    try {
      // Check in-memory storage first
      if (this.inMemoryStorage.has(campaignId)) {
        const campaign = this.inMemoryStorage.get(campaignId);
        // Verify user owns this campaign
        if (campaign.user_id === userId) {
          return campaign;
        }
      }

      // Handle temporary campaigns or if Supabase is not available
      if (campaignId.startsWith('temp_') || !this.supabase) {
        return this.inMemoryStorage.get(campaignId) || null;
      }

      const { data, error } = await this.supabase
        .from('direct_mail_campaigns')
        .select('*')
        .eq('id', campaignId)
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching campaign from database:', error.message);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Campaign fetch error:', error);
      // Check in-memory storage as fallback
      return this.inMemoryStorage.get(campaignId) || null;
    }
  }

  /**
   * Update campaign data
   */
  async updateCampaign(campaign) {
    try {
      // Update in-memory storage first
      if (this.inMemoryStorage.has(campaign.id)) {
        const updatedCampaign = {
          ...campaign,
          updated_at: new Date()
        };
        this.inMemoryStorage.set(campaign.id, updatedCampaign);
        
        // If it's a temp campaign or Supabase is not available, return the in-memory version
        if (campaign.id.startsWith('temp_') || !this.supabase) {
          return updatedCampaign;
        }
      }

      // Don't try to update temporary campaigns in database
      if (campaign.id.startsWith('temp_') || !this.supabase) {
        return campaign;
      }

      const { data, error } = await this.supabase
        .from('direct_mail_campaigns')
        .update({
          sections: campaign.sections,
          responses: campaign.responses,
          status: campaign.status,
          metadata: campaign.metadata,
          updated_at: new Date()
        })
        .eq('id', campaign.id)
        .eq('user_id', campaign.user_id)
        .select()
        .single();

      if (error) {
        console.error('Error updating campaign in database:', error.message);
        // Update in-memory storage as fallback
        if (!this.inMemoryStorage.has(campaign.id)) {
          this.inMemoryStorage.set(campaign.id, { ...campaign, updated_at: new Date() });
        }
        return campaign;
      }

      return data;
    } catch (error) {
      console.error('Campaign update error:', error);
      // Update in-memory storage as fallback
      const updatedCampaign = { ...campaign, updated_at: new Date() };
      this.inMemoryStorage.set(campaign.id, updatedCampaign);
      return updatedCampaign;
    }
  }

  /**
   * List user's campaigns
   */
  async listCampaigns(userId, options = {}) {
    try {
      const { limit = 10, offset = 0, status } = options;
      
      // Get in-memory campaigns for this user
      const inMemoryCampaigns = Array.from(this.inMemoryStorage.values())
        .filter(c => c.user_id === userId)
        .filter(c => !status || c.status === status)
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      
      // If Supabase is not available, return only in-memory campaigns
      if (!this.supabase) {
        return inMemoryCampaigns
          .slice(offset, offset + limit)
          .map(c => ({
            id: c.id,
            name: c.name,
            type: c.type,
            status: c.status,
            created_at: c.created_at,
            updated_at: c.updated_at,
            metadata: c.metadata
          }));
      }
      
      let query = this.supabase
        .from('direct_mail_campaigns')
        .select('id, name, type, status, created_at, updated_at, metadata')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error listing campaigns from database:', error.message);
        // Return in-memory campaigns as fallback
        return inMemoryCampaigns
          .slice(offset, offset + limit)
          .map(c => ({
            id: c.id,
            name: c.name,
            type: c.type,
            status: c.status,
            created_at: c.created_at,
            updated_at: c.updated_at,
            metadata: c.metadata
          }));
      }

      // Merge database results with in-memory campaigns
      const dbCampaignIds = new Set((data || []).map(c => c.id));
      const uniqueInMemoryCampaigns = inMemoryCampaigns
        .filter(c => !dbCampaignIds.has(c.id))
        .map(c => ({
          id: c.id,
          name: c.name,
          type: c.type,
          status: c.status,
          created_at: c.created_at,
          updated_at: c.updated_at,
          metadata: c.metadata
        }));
      
      return [...(data || []), ...uniqueInMemoryCampaigns]
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        .slice(0, limit);
    } catch (error) {
      console.error('Campaign list error:', error);
      // Return in-memory campaigns as fallback
      return Array.from(this.inMemoryStorage.values())
        .filter(c => c.user_id === userId)
        .filter(c => !options.status || c.status === options.status)
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        .slice(options.offset || 0, (options.offset || 0) + (options.limit || 10))
        .map(c => ({
          id: c.id,
          name: c.name,
          type: c.type,
          status: c.status,
          created_at: c.created_at,
          updated_at: c.updated_at,
          metadata: c.metadata
        }));
    }
  }

  /**
   * Delete a campaign
   */
  async deleteCampaign(userId, campaignId) {
    try {
      if (campaignId.startsWith('temp_')) {
        return { success: true };
      }

      const { error } = await this.supabase
        .from('direct_mail_campaigns')
        .delete()
        .eq('id', campaignId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting campaign:', error);
        return { success: false, error };
      }

      return { success: true };
    } catch (error) {
      console.error('Campaign delete error:', error);
      return { success: false, error };
    }
  }

  /**
   * Archive a campaign
   */
  async archiveCampaign(userId, campaignId) {
    try {
      const { data, error } = await this.supabase
        .from('direct_mail_campaigns')
        .update({
          status: 'archived',
          archived_at: new Date(),
          updated_at: new Date()
        })
        .eq('id', campaignId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error archiving campaign:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Campaign archive error:', error);
      return null;
    }
  }

  /**
   * Get campaign statistics
   */
  async getCampaignStats(userId) {
    try {
      const { data, error } = await this.supabase
        .from('direct_mail_campaigns')
        .select('status, type')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching stats:', error);
        return {
          total: 0,
          active: 0,
          completed: 0,
          archived: 0
        };
      }

      const stats = {
        total: data.length,
        active: data.filter(c => c.status === 'active').length,
        completed: data.filter(c => c.status === 'completed').length,
        archived: data.filter(c => c.status === 'archived').length,
        consultation: data.filter(c => c.status === 'consultation').length
      };

      return stats;
    } catch (error) {
      console.error('Stats fetch error:', error);
      return {
        total: 0,
        active: 0,
        completed: 0,
        archived: 0
      };
    }
  }

  /**
   * Export campaign data
   */
  async exportCampaign(userId, campaignId) {
    try {
      const campaign = await this.getCampaign(userId, campaignId);
      if (!campaign) return null;

      // Format for export
      const exportData = {
        campaignInfo: {
          name: campaign.name,
          type: campaign.type,
          status: campaign.status,
          created: campaign.created_at,
          lastUpdated: campaign.updated_at
        },
        responses: campaign.responses,
        summary: this.generateExportSummary(campaign)
      };

      return exportData;
    } catch (error) {
      console.error('Export error:', error);
      return null;
    }
  }

  generateExportSummary(campaign) {
    const responses = campaign.responses;
    
    return {
      businessProfile: {
        specialty: responses.travel_specialty,
        goals: responses.business_goals,
        campaignGoal: responses.primary_campaign_goal
      },
      targetAudience: {
        idealClient: responses.ideal_client_profile,
        demographics: responses.demographics,
        listSize: responses.mail_volume
      },
      campaign: {
        offer: responses.campaign_offer,
        budget: responses.campaign_budget,
        timing: responses.arrival_date,
        format: responses.format_preference
      }
    };
  }
}

export default CampaignStorage;