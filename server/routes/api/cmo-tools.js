import express from 'express';
import { getToolStateManager } from '../../services/cmo/ToolStateManager.js';
import { 
  getToolsByContext, 
  getToolById, 
  getActiveTools,
  suggestTools 
} from '../../config/cmo-tools.js';

const router = express.Router();

// Middleware to get user ID (simplified for now)
const getUserId = (req) => {
  return req.user?.id || req.session?.userId || 'anonymous';
};

// Get tools by context
router.get('/tools/context/:context', (req, res) => {
  try {
    const { context } = req.params;
    const tools = getToolsByContext(context);
    res.json({ tools });
  } catch (error) {
    console.error('Error getting tools by context:', error);
    res.status(500).json({ error: 'Failed to get tools' });
  }
});

// Get all active tools
router.get('/tools', (req, res) => {
  try {
    const tools = getActiveTools();
    res.json({ tools });
  } catch (error) {
    console.error('Error getting tools:', error);
    res.status(500).json({ error: 'Failed to get tools' });
  }
});

// Get tool details
router.get('/tools/:toolId', (req, res) => {
  try {
    const { toolId } = req.params;
    const tool = getToolById(toolId);
    
    if (!tool) {
      return res.status(404).json({ error: 'Tool not found' });
    }
    
    res.json({ tool });
  } catch (error) {
    console.error('Error getting tool:', error);
    res.status(500).json({ error: 'Failed to get tool' });
  }
});

// Get tool suggestions
router.post('/tools/suggest', (req, res) => {
  try {
    const { input, context } = req.body;
    const suggestions = suggestTools(input, context);
    res.json({ suggestions });
  } catch (error) {
    console.error('Error getting suggestions:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

// Get tool state
router.get('/tools/:toolId/state', (req, res) => {
  try {
    const userId = getUserId(req);
    const { toolId } = req.params;
    const stateManager = getToolStateManager();
    
    const state = stateManager.getToolState(userId, toolId);
    res.json({ state: state || {} });
  } catch (error) {
    console.error('Error getting tool state:', error);
    res.status(500).json({ error: 'Failed to get tool state' });
  }
});

// Update tool state
router.post('/tools/:toolId/state', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { toolId } = req.params;
    const { state } = req.body;
    const stateManager = getToolStateManager();
    
    const updatedState = await stateManager.setToolState(userId, toolId, state);
    res.json({ state: updatedState });
  } catch (error) {
    console.error('Error updating tool state:', error);
    res.status(500).json({ error: 'Failed to update tool state' });
  }
});

// Track tool usage
router.post('/tools/:toolId/usage', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { toolId } = req.params;
    const { action, data } = req.body;
    const stateManager = getToolStateManager();
    
    const usage = await stateManager.trackUsage(userId, toolId, action, data);
    res.json({ success: true, usage });
  } catch (error) {
    console.error('Error tracking usage:', error);
    res.status(500).json({ error: 'Failed to track usage' });
  }
});

// Get user preferences
router.get('/preferences', (req, res) => {
  try {
    const userId = getUserId(req);
    const stateManager = getToolStateManager();
    
    const preferences = stateManager.getUserPreferences(userId);
    res.json({ preferences });
  } catch (error) {
    console.error('Error getting preferences:', error);
    res.status(500).json({ error: 'Failed to get preferences' });
  }
});

// Update user preferences
router.post('/preferences', async (req, res) => {
  try {
    const userId = getUserId(req);
    const { preferences } = req.body;
    const stateManager = getToolStateManager();
    
    const updated = await stateManager.updateUserPreferences(userId, preferences);
    res.json({ preferences: updated });
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Get tool recommendations
router.get('/recommendations', (req, res) => {
  try {
    const userId = getUserId(req);
    const { context } = req.query;
    const stateManager = getToolStateManager();
    
    const recommendations = stateManager.getToolRecommendations(userId, context);
    res.json({ recommendations });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// Get usage analytics
router.get('/analytics', (req, res) => {
  try {
    const userId = getUserId(req);
    const { allUsers } = req.query;
    const stateManager = getToolStateManager();
    
    // Only allow all users analytics for admin users
    const targetUserId = allUsers === 'true' ? null : userId;
    const analytics = stateManager.getUsageAnalytics(targetUserId);
    
    res.json({ analytics });
  } catch (error) {
    console.error('Error getting analytics:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Export user data
router.get('/export', async (req, res) => {
  try {
    const userId = getUserId(req);
    const stateManager = getToolStateManager();
    
    const userData = await stateManager.exportUserData(userId);
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="cmo-tools-data-${userId}.json"`);
    res.json(userData);
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    service: 'cmo-tools',
    timestamp: new Date().toISOString()
  });
});

export default router;