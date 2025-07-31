import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Resource directory path
const RESOURCES_DIR = path.join(__dirname, '../../resources/cmo');

// Cache for loaded resources
const resourceCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Load resources from JSON file
async function loadResources(context) {
  try {
    // Check cache first
    const cached = resourceCache.get(context);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }

    // Load from file
    const filePath = path.join(RESOURCES_DIR, `${context}-resources.json`);
    const data = await fs.readFile(filePath, 'utf8');
    const resources = JSON.parse(data);

    // Update cache
    resourceCache.set(context, {
      data: resources,
      timestamp: Date.now()
    });

    return resources;
  } catch (error) {
    console.error(`Error loading ${context} resources:`, error);
    return { resources: [] };
  }
}

// Get resources by context
router.get('/resources/:context', async (req, res) => {
  try {
    const { context } = req.params;
    const validContexts = ['seo', 'email', 'social', 'general'];
    
    if (!validContexts.includes(context)) {
      return res.status(400).json({ 
        error: 'Invalid context',
        validContexts 
      });
    }

    const resources = await loadResources(context);
    res.json(resources);
  } catch (error) {
    console.error('Error getting resources:', error);
    res.status(500).json({ error: 'Failed to load resources' });
  }
});

// Get all resources
router.get('/resources', async (req, res) => {
  try {
    const contexts = ['seo', 'email', 'social', 'general'];
    const allResources = [];

    for (const context of contexts) {
      const { resources } = await loadResources(context);
      allResources.push(...resources);
    }

    // Remove duplicates by ID
    const uniqueResources = Array.from(
      new Map(allResources.map(r => [r.id, r])).values()
    );

    res.json({ resources: uniqueResources });
  } catch (error) {
    console.error('Error getting all resources:', error);
    res.status(500).json({ error: 'Failed to load resources' });
  }
});

// Search resources
router.get('/resources/search', async (req, res) => {
  try {
    const { q, type, context, tags } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }

    // Load all resources
    const contexts = context ? [context] : ['seo', 'email', 'social', 'general'];
    const allResources = [];

    for (const ctx of contexts) {
      const { resources } = await loadResources(ctx);
      allResources.push(...resources);
    }

    // Filter resources
    let filtered = allResources;
    const queryLower = q.toLowerCase();

    // Text search
    filtered = filtered.filter(resource => 
      resource.title.toLowerCase().includes(queryLower) ||
      resource.content.toLowerCase().includes(queryLower) ||
      resource.tags.some(tag => tag.toLowerCase().includes(queryLower))
    );

    // Type filter
    if (type) {
      filtered = filtered.filter(r => r.type === type);
    }

    // Tag filter
    if (tags) {
      const tagList = tags.split(',').map(t => t.trim().toLowerCase());
      filtered = filtered.filter(r => 
        r.tags.some(tag => tagList.includes(tag.toLowerCase()))
      );
    }

    res.json({ resources: filtered });
  } catch (error) {
    console.error('Error searching resources:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Track resource usage
router.post('/resources/usage', async (req, res) => {
  try {
    const { resourceId, action, context } = req.body;
    
    // In a real implementation, this would save to a database
    // For now, we'll just log it
    console.log('Resource usage:', { resourceId, action, context });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking usage:', error);
    res.status(500).json({ error: 'Failed to track usage' });
  }
});

// Get resource recommendations
router.post('/resources/recommend', async (req, res) => {
  try {
    const { context, keywords, recentResources } = req.body;
    
    // Load context-specific resources
    const contexts = context ? [context, 'general'] : ['general'];
    const allResources = [];

    for (const ctx of contexts) {
      const { resources } = await loadResources(ctx);
      allResources.push(...resources);
    }

    // Simple recommendation algorithm
    const recommendations = allResources
      .map(resource => {
        let score = 0;
        
        // Context match
        if (context && resource.tags.includes(context)) {
          score += 30;
        }
        
        // Keyword matches
        if (keywords && Array.isArray(keywords)) {
          keywords.forEach(keyword => {
            const keywordLower = keyword.toLowerCase();
            if (resource.tags.some(tag => tag.toLowerCase().includes(keywordLower))) {
              score += 15;
            }
            if (resource.title.toLowerCase().includes(keywordLower)) {
              score += 10;
            }
          });
        }
        
        // Priority boost
        if (resource.priority === 'high') {
          score += 20;
        }
        
        // Avoid recent resources
        if (recentResources && recentResources.includes(resource.id)) {
          score -= 10;
        }
        
        return { ...resource, relevanceScore: score };
      })
      .filter(r => r.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5);

    res.json({ recommendations });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// Clear cache endpoint (for development)
router.post('/resources/cache/clear', (req, res) => {
  resourceCache.clear();
  res.json({ success: true, message: 'Resource cache cleared' });
});

export default router;