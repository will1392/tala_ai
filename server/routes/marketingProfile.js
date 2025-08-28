/**
 * Marketing Profile API Routes
 * Handles all marketing profile operations with in-memory storage
 */

import express from 'express';
const router = express.Router();

// In-memory storage for marketing profiles
const marketingProfiles = new Map();

/**
 * GET /api/marketing-profile/:profileId
 * Get marketing profile
 */
router.get('/:profileId', async (req, res) => {
  try {
    const { profileId } = req.params;
    const userId = req.headers['x-user-id'] || req.user?.id || 'admin-1';
    const profileKey = `${userId}_${profileId}`;

    const profile = marketingProfiles.get(profileKey);
    
    if (!profile) {
      // Return a default profile structure if none exists
      return res.json({
        id: profileId,
        userId,
        skillLevel: 'new',
        assessment: null,
        goals: [],
        growthPlan: null,
        evidence: [],
        integrations: [],
        campaigns: [],
        timestamp: new Date().toISOString()
      });
    }

    res.json(profile);
  } catch (error) {
    console.error('Error fetching marketing profile:', error);
    res.status(500).json({ error: 'Failed to fetch marketing profile' });
  }
});

/**
 * POST /api/marketing-profile/:profileId
 * Create or update marketing profile
 */
router.post('/:profileId', async (req, res) => {
  try {
    const { profileId } = req.params;
    const userId = req.headers['x-user-id'] || req.user?.id || 'admin-1';
    const profileKey = `${userId}_${profileId}`;
    
    const profile = {
      id: profileId,
      userId,
      ...req.body,
      updatedAt: new Date().toISOString()
    };

    marketingProfiles.set(profileKey, profile);
    
    console.log(`📊 Saved marketing profile for ${profileId}`);
    res.json({ success: true, profile });
  } catch (error) {
    console.error('Error saving marketing profile:', error);
    res.status(500).json({ error: 'Failed to save marketing profile' });
  }
});

/**
 * DELETE /api/marketing-profile/:profileId
 * Delete marketing profile
 */
router.delete('/:profileId', async (req, res) => {
  try {
    const { profileId } = req.params;
    const userId = req.headers['x-user-id'] || req.user?.id || 'admin-1';
    const profileKey = `${userId}_${profileId}`;

    const deleted = marketingProfiles.delete(profileKey);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    console.log(`🗑️ Deleted marketing profile for ${profileId}`);
    res.json({ success: true, message: 'Profile deleted' });
  } catch (error) {
    console.error('Error deleting marketing profile:', error);
    res.status(500).json({ error: 'Failed to delete marketing profile' });
  }
});

/**
 * GET /api/marketing-profile
 * Get all profiles for user
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] || req.user?.id || 'admin-1';
    
    const userProfiles = [];
    for (const [key, profile] of marketingProfiles) {
      if (profile.userId === userId) {
        userProfiles.push(profile);
      }
    }

    res.json(userProfiles);
  } catch (error) {
    console.error('Error fetching marketing profiles:', error);
    res.status(500).json({ error: 'Failed to fetch marketing profiles' });
  }
});

export default router;