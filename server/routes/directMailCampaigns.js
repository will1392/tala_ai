/**
 * Direct Mail Campaigns API Routes
 * Handles campaign consultation data storage and retrieval
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

/**
 * POST /api/direct-mail-campaigns
 * Create a new campaign consultation
 */
router.post('/', async (req, res) => {
  console.log('\n🔄 [DirectMail API] ========== NEW SAVE REQUEST ==========');
  console.log('🔄 [DirectMail API] Timestamp:', new Date().toISOString());
  console.log('🔄 [DirectMail API] Headers:', JSON.stringify(req.headers, null, 2));
  console.log('🔄 [DirectMail API] Body:', JSON.stringify(req.body, null, 2));
  console.log('🔄 [DirectMail API] Method:', req.method);
  console.log('🔄 [DirectMail API] URL:', req.url);
  
  try {
    const userId = req.headers['x-user-id'] || 'anonymous';
    const campaignData = req.body;
    
    console.log('📬 [DirectMail API] Extracted userId from headers:', userId);
    console.log('📬 [DirectMail API] Campaign name from body:', campaignData.name);
    console.log('📬 [DirectMail API] Campaign has brandId:', campaignData.brandId);
    console.log('📬 [DirectMail API] Process CWD:', process.cwd());
    
    // Prepare campaign record
    const campaign = {
      user_id: userId,
      type: campaignData.type || 'direct_mail',
      status: campaignData.status || 'consultation_complete',
      name: campaignData.name || `Direct Mail Campaign - ${new Date().toLocaleDateString()}`,
      sections: campaignData.sections || {},
      responses: campaignData.responses || {},
      metadata: {
        ...campaignData.metadata,
        createdVia: 'consultation_form',
        version: '2.0'
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Try to save to Supabase
    // Force fallback storage for direct mail campaigns
    if (false && process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      const { data, error } = await supabase
        .from('direct_mail_campaigns')
        .insert([campaign])
        .select()
        .single();
      
      if (error) {
        console.error('Supabase error:', error);
        // Fall back to in-memory/file storage
        return saveToFallbackStorage(campaign, res);
      }
      
      console.log('✅ Campaign saved to Supabase:', data.id);
      return res.json({
        success: true,
        campaign: data
      });
    } else {
      // No Supabase configured, use fallback
      return saveToFallbackStorage(campaign, res);
    }
    
  } catch (error) {
    console.error('❌ Error creating campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create campaign',
      message: error.message
    });
  }
});

/**
 * GET /api/direct-mail-campaigns/:campaignId
 * Get a specific campaign
 */
router.get('/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const userId = req.headers['x-user-id'] || 'anonymous';
    
    // Force fallback storage for direct mail campaigns
    if (false && process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      const { data, error } = await supabase
        .from('direct_mail_campaigns')
        .select('*')
        .eq('id', campaignId)
        .eq('user_id', userId)
        .single();
      
      if (error) {
        console.error('Supabase error:', error);
        return res.status(404).json({
          success: false,
          error: 'Campaign not found'
        });
      }
      
      return res.json({
        success: true,
        campaign: data
      });
    } else {
      // Fallback storage lookup
      const campaign = await getFallbackCampaign(campaignId, userId);
      if (campaign) {
        return res.json({
          success: true,
          campaign
        });
      }
      
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }
    
  } catch (error) {
    console.error('❌ Error fetching campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaign'
    });
  }
});

/**
 * GET /api/direct-mail-campaigns
 * List user's campaigns
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || 'anonymous';
    const { limit = 10, offset = 0 } = req.query;
    console.log('📋 [DirectMail API] GET /campaigns - User:', userId, 'Limit:', limit, 'Offset:', offset);
    
    // Force use of filesystem storage
    if (false) { // Always use fallback
      const { data, error } = await supabase
        .from('direct_mail_campaigns')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) {
        console.error('Supabase error:', error);
        return res.json({
          success: true,
          campaigns: []
        });
      }
      
      return res.json({
        success: true,
        campaigns: data || []
      });
    } else {
      // Fallback storage
      const campaigns = await getFallbackCampaigns(userId);
      return res.json({
        success: true,
        campaigns: campaigns.slice(offset, offset + limit)
      });
    }
    
  } catch (error) {
    console.error('❌ Error listing campaigns:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list campaigns'
    });
  }
});

/**
 * PUT /api/direct-mail-campaigns/:campaignId
 * Update a campaign
 */
router.put('/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const userId = req.headers['x-user-id'] || 'anonymous';
    const updates = req.body;
    
    // Force fallback storage for direct mail campaigns
    if (false && process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      const { data, error } = await supabase
        .from('direct_mail_campaigns')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', campaignId)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) {
        console.error('Supabase error:', error);
        return res.status(404).json({
          success: false,
          error: 'Campaign not found or unauthorized'
        });
      }
      
      return res.json({
        success: true,
        campaign: data
      });
    } else {
      // Fallback update
      return res.json({
        success: true,
        campaign: { id: campaignId, ...updates }
      });
    }
    
  } catch (error) {
    console.error('❌ Error updating campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update campaign'
    });
  }
});

/**
 * DELETE /api/direct-mail-campaigns/:campaignId
 * Delete a campaign
 */
router.delete('/:campaignId', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const userId = req.headers['x-user-id'] || 'anonymous';
    
    console.log('🗑️ Deleting campaign:', campaignId, 'for user:', userId);
    
    // Force fallback storage for direct mail campaigns
    if (false && process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
      const { error } = await supabase
        .from('direct_mail_campaigns')
        .delete()
        .eq('id', campaignId)
        .eq('user_id', userId);
      
      if (error) {
        console.error('Supabase error:', error);
        return res.status(404).json({
          success: false,
          error: 'Campaign not found or unauthorized'
        });
      }
      
      return res.json({
        success: true,
        message: 'Campaign deleted successfully'
      });
    } else {
      // Fallback deletion
      const deleted = await deleteFallbackCampaign(campaignId, userId);
      
      if (deleted) {
        return res.json({
          success: true,
          message: 'Campaign deleted successfully'
        });
      }
      
      return res.status(404).json({
        success: false,
        error: 'Campaign not found or unauthorized'
      });
    }
    
  } catch (error) {
    console.error('❌ Error deleting campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete campaign'
    });
  }
});

// Fallback storage functions (using memory/file system)
const campaignStorage = new Map();

async function saveToFallbackStorage(campaign, res) {
  // Generate ID
  campaign.id = `camp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log('\n💾 [DirectMail API] ========== SAVING TO FALLBACK ==========');
  console.log('💾 [DirectMail API] Generated ID:', campaign.id);
  console.log('💾 [DirectMail API] User ID:', campaign.user_id);
  console.log('💾 [DirectMail API] Campaign name:', campaign.name);
  
  // Store in memory
  const userCampaigns = campaignStorage.get(campaign.user_id) || [];
  userCampaigns.push(campaign);
  campaignStorage.set(campaign.user_id, userCampaigns);
  
  console.log('💾 [DirectMail API] Stored in memory for user:', campaign.user_id);
  console.log('💾 [DirectMail API] Total campaigns in memory for this user:', userCampaigns.length);
  console.log('💾 [DirectMail API] All users in memory:', Array.from(campaignStorage.keys()));
  
  // Also save to file for persistence
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const { dirname } = await import('path');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    
    console.log('📁 [DirectMail API] Current file directory:', __dirname);
    console.log('📁 [DirectMail API] Process CWD:', process.cwd());
    
    // Try server/data/campaigns first
    let dataDir = path.join(__dirname, '..', 'data', 'campaigns');
    console.log('📁 [DirectMail API] Trying data directory:', dataDir);
    
    // Ensure parent directories exist
    const parentDir = path.join(__dirname, '..', 'data');
    await fs.mkdir(parentDir, { recursive: true });
    
    // Ensure directory exists
    await fs.mkdir(dataDir, { recursive: true });
    
    // Save campaign
    const filePath = path.join(dataDir, `${campaign.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(campaign, null, 2));
    
    console.log('💾 [DirectMail API] Campaign persisted to file:', filePath);
    
    // Verify file was written
    const exists = await fs.access(filePath).then(() => true).catch(() => false);
    console.log('💾 [DirectMail API] File exists after write:', exists);
    
    if (exists) {
      const fileStats = await fs.stat(filePath);
      console.log('💾 [DirectMail API] File size:', fileStats.size, 'bytes');
    }
  } catch (err) {
    console.error('[DirectMail API] Failed to persist to file:', err);
  }
  
  const response = {
    success: true,
    campaign
  };
  
  console.log('📲 [DirectMail API] Sending response:', JSON.stringify(response, null, 2));
  return res.json(response);
}

async function getFallbackCampaign(campaignId, userId) {
  // Check memory first
  const userCampaigns = campaignStorage.get(userId) || [];
  const campaign = userCampaigns.find(c => c.id === campaignId);
  
  if (campaign) return campaign;
  
  // Try loading from file
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const { dirname } = await import('path');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const filePath = path.join(process.cwd(), 'data', 'campaigns', `${campaignId}.json`);
    
    const data = await fs.readFile(filePath, 'utf-8');
    const loadedCampaign = JSON.parse(data);
    
    // Verify ownership
    if (loadedCampaign.user_id === userId) {
      // Cache in memory
      userCampaigns.push(loadedCampaign);
      campaignStorage.set(userId, userCampaigns);
      
      return loadedCampaign;
    }
  } catch (err) {
    // File doesn't exist or can't be read
  }
  
  return null;
}

async function getFallbackCampaigns(userId) {
  console.log('\n🔍 [DirectMail API] ========== LOADING CAMPAIGNS ==========');
  console.log('🔍 [DirectMail API] Looking for campaigns for user:', userId);
  
  const userCampaigns = campaignStorage.get(userId) || [];
  console.log('🔍 [DirectMail API] Found in memory:', userCampaigns.length, 'campaigns');
  console.log('🔍 [DirectMail API] Memory storage keys:', Array.from(campaignStorage.keys()));
  
  // Also try loading from files
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    // The data directory is in the server folder
    const dataDir = path.join(process.cwd(), 'data', 'campaigns');
    console.log('🔍 [DirectMail API] Checking directory:', dataDir);
    
    const dirExists = await fs.access(dataDir).then(() => true).catch(() => false);
    console.log('🔍 [DirectMail API] Directory exists:', dirExists);
    
    if (!dirExists) {
      console.log('🔍 [DirectMail API] Directory does not exist, returning memory campaigns only');
      return userCampaigns;
    }
    
    const files = await fs.readdir(dataDir);
    console.log('🔍 [DirectMail API] Found files:', files);
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(dataDir, file);
        const data = await fs.readFile(filePath, 'utf-8');
        const campaign = JSON.parse(data);
        
        if (campaign.user_id === userId && !userCampaigns.find(c => c.id === campaign.id)) {
          userCampaigns.push(campaign);
        }
      }
    }
    
    // Update cache
    campaignStorage.set(userId, userCampaigns);
  } catch (err) {
    // Directory doesn't exist yet
    // Directory doesn't exist yet - not an error
  }
  
  return userCampaigns.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

async function deleteFallbackCampaign(campaignId, userId) {
  // Remove from memory
  const userCampaigns = campaignStorage.get(userId) || [];
  const initialLength = userCampaigns.length;
  const filtered = userCampaigns.filter(c => c.id !== campaignId);
  campaignStorage.set(userId, filtered);
  
  // Also try to delete file
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    const { dirname } = await import('path');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const filePath = path.join(process.cwd(), 'data', 'campaigns', `${campaignId}.json`);
    
    // Check if file exists and belongs to user
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const campaign = JSON.parse(data);
      
      if (campaign.user_id === userId) {
        await fs.unlink(filePath);
        console.log('💾 Campaign file deleted:', filePath);
        return true;
      }
    } catch (err) {
      // File doesn't exist or can't be read
    }
  } catch (err) {
    console.error('Failed to delete file:', err);
  }
  
  // Return true if removed from memory
  return initialLength > filtered.length;
}

export default router;