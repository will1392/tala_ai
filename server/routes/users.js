import express from 'express';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/users/mode-preferences
 * Get user's chat mode preferences
 */
router.get('/mode-preferences', authenticate, (req, res) => {
  try {
    // For now, return default mode preferences
    // In a real implementation, this would fetch from database
    const defaultPreferences = {
      defaultMode: 'travel',
      availableModes: ['travel', 'cmo', 'general'],
      lastUsedMode: 'travel',
      modeSettings: {
        travel: {
          searchKnowledge: true,
          maxResults: 5
        },
        cmo: {
          enableAnalytics: true,
          autoSuggest: true
        },
        general: {
          contextLength: 'medium'
        }
      }
    };

    console.log(`📊 Fetching mode preferences for user: ${req.userId}`);
    
    res.json({
      success: true,
      preferences: defaultPreferences
    });
  } catch (error) {
    console.error('❌ Error fetching mode preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch mode preferences'
    });
  }
});

/**
 * POST /api/users/mode-preferences
 * Update user's chat mode preferences
 */
router.post('/mode-preferences', authenticate, (req, res) => {
  try {
    const { defaultMode, modeSettings, lastUsedMode } = req.body;
    
    console.log(`📝 Updating mode preferences for user: ${req.userId}`, req.body);
    
    // In a real implementation, this would save to database
    // For now, just return success
    
    res.json({
      success: true,
      message: 'Mode preferences updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating mode preferences:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update mode preferences'
    });
  }
});

/**
 * GET /api/users/settings
 * Get user's general settings
 */
router.get('/settings', authenticate, (req, res) => {
  try {
    const defaultSettings = {
      theme: 'light',
      language: 'en',
      notifications: {
        email: true,
        browser: true,
        sound: false
      },
      ui: {
        sidebarCollapsed: false,
        compactMode: false
      }
    };

    console.log(`⚙️ Fetching settings for user: ${req.userId}`);
    
    res.json({
      success: true,
      settings: defaultSettings
    });
  } catch (error) {
    console.error('❌ Error fetching settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch settings'
    });
  }
});

/**
 * POST /api/users/settings
 * Update user's general settings
 */
router.post('/settings', authenticate, (req, res) => {
  try {
    console.log(`⚙️ Updating settings for user: ${req.userId}`, req.body);
    
    res.json({
      success: true,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update settings'
    });
  }
});

export default router;