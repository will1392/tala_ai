import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';

interface Resource {
  id: string;
  type: 'quick-reference' | 'example' | 'template' | 'checklist';
  title: string;
  content: string;
  category: string;
  tags: string[];
  priority?: 'high' | 'medium' | 'low';
  metrics?: any;
  usage?: number;
}

interface ResourceRecommendation extends Resource {
  relevanceScore: number;
  reason: string;
}

interface ResourceUsage {
  resourceId: string;
  action: string;
  timestamp: string;
  context?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const useResourceIntelligence = (currentContext: string | null, conversation: any[] = []) => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [recommendations, setRecommendations] = useState<ResourceRecommendation[]>([]);
  const [recentlyUsed, setRecentlyUsed] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);
  const [usageHistory, setUsageHistory] = useState<ResourceUsage[]>([]);

  // Load resources based on context
  useEffect(() => {
    loadResources();
    loadUsageHistory();
  }, [currentContext]);

  // Update recommendations when context or conversation changes
  useEffect(() => {
    if (resources.length > 0) {
      generateRecommendations();
    }
  }, [currentContext, conversation, resources]);

  // Load resources from server
  const loadResources = async () => {
    try {
      setLoading(true);
      
      // Load context-specific resources
      const contexts = currentContext ? [currentContext, 'general'] : ['general'];
      const resourcePromises = contexts.map(ctx => 
        axios.get(`${API_BASE_URL}/api/cmo/resources/${ctx}`)
          .catch(() => ({ data: { resources: [] } }))
      );
      
      const responses = await Promise.all(resourcePromises);
      const allResources = responses.flatMap(r => r.data.resources || []);
      
      // Remove duplicates
      const uniqueResources = Array.from(
        new Map(allResources.map(r => [r.id, r])).values()
      );
      
      setResources(uniqueResources);
    } catch (error) {
      console.error('Error loading resources:', error);
      // Fallback to loading from local JSON files
      await loadLocalResources();
    } finally {
      setLoading(false);
    }
  };

  // Fallback: Load resources from local JSON files
  const loadLocalResources = async () => {
    try {
      const contexts = currentContext ? [currentContext, 'general'] : ['general'];
      const imports = contexts.map(ctx => 
        import(`../../server/resources/cmo/${ctx}-resources.json`)
          .catch(() => ({ resources: [] }))
      );
      
      const modules = await Promise.all(imports);
      const allResources = modules.flatMap(m => m.resources || []);
      
      // Remove duplicates
      const uniqueResources = Array.from(
        new Map(allResources.map(r => [r.id, r])).values()
      );
      
      setResources(uniqueResources);
    } catch (error) {
      console.error('Error loading local resources:', error);
    }
  };

  // Load usage history
  const loadUsageHistory = async () => {
    try {
      const saved = localStorage.getItem('cmo-resource-usage');
      if (saved) {
        const history = JSON.parse(saved);
        setUsageHistory(history);
        
        // Extract recently used resources
        const recentIds = [...new Set(history.slice(-10).map((u: ResourceUsage) => u.resourceId))];
        const recent = resources.filter(r => recentIds.includes(r.id));
        setRecentlyUsed(recent);
      }
    } catch (error) {
      console.error('Error loading usage history:', error);
    }
  };

  // Generate intelligent recommendations
  const generateRecommendations = useCallback(() => {
    const recs: ResourceRecommendation[] = [];
    
    // Analyze conversation for keywords and topics
    const conversationText = conversation
      .map(msg => msg.content || '')
      .join(' ')
      .toLowerCase();
    
    // Score each resource based on relevance
    resources.forEach(resource => {
      let score = 0;
      let reasons: string[] = [];
      
      // Context match
      if (currentContext && resource.tags.includes(currentContext)) {
        score += 30;
        reasons.push('Matches current context');
      }
      
      // High priority resources
      if (resource.priority === 'high') {
        score += 20;
        reasons.push('High priority resource');
      }
      
      // Keyword matching in conversation
      const keywordMatches = resource.tags.filter(tag => 
        conversationText.includes(tag.toLowerCase())
      );
      if (keywordMatches.length > 0) {
        score += keywordMatches.length * 15;
        reasons.push(`Related to: ${keywordMatches.join(', ')}`);
      }
      
      // Title/content relevance
      const titleWords = resource.title.toLowerCase().split(' ');
      const titleMatches = titleWords.filter(word => 
        word.length > 3 && conversationText.includes(word)
      );
      if (titleMatches.length > 0) {
        score += titleMatches.length * 10;
        reasons.push('Title matches conversation');
      }
      
      // Recent usage boost (if used recently, likely still relevant)
      const recentUsage = usageHistory.find(u => 
        u.resourceId === resource.id && 
        new Date(u.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000
      );
      if (recentUsage) {
        score += 15;
        reasons.push('Recently used');
      }
      
      // High performing resources (based on metrics)
      if (resource.metrics?.performance && parseInt(resource.metrics.performance) > 80) {
        score += 10;
        reasons.push('High performance');
      }
      
      if (score > 0) {
        recs.push({
          ...resource,
          relevanceScore: score,
          reason: reasons[0] || 'Potentially relevant'
        });
      }
    });
    
    // Sort by relevance score and take top recommendations
    const topRecs = recs
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5);
    
    setRecommendations(topRecs);
  }, [resources, currentContext, conversation, usageHistory]);

  // Track resource usage
  const trackUsage = useCallback(async (resourceId: string, action: string) => {
    const usage: ResourceUsage = {
      resourceId,
      action,
      timestamp: new Date().toISOString(),
      context: currentContext || undefined
    };
    
    // Update local history
    const newHistory = [...usageHistory, usage].slice(-100); // Keep last 100
    setUsageHistory(newHistory);
    localStorage.setItem('cmo-resource-usage', JSON.stringify(newHistory));
    
    // Send to server (optional)
    try {
      await axios.post(`${API_BASE_URL}/api/cmo/resources/usage`, usage);
    } catch (error) {
      // Silent fail - local tracking is sufficient
    }
    
    // Update recently used
    const resource = resources.find(r => r.id === resourceId);
    if (resource) {
      setRecentlyUsed(prev => {
        const filtered = prev.filter(r => r.id !== resourceId);
        return [resource, ...filtered].slice(0, 10);
      });
    }
  }, [usageHistory, resources, currentContext]);

  // Get relevant resources based on specific query
  const getRelevantResources = useCallback((query: string, type?: string): Resource[] => {
    const queryLower = query.toLowerCase();
    
    return resources.filter(resource => {
      // Type filter
      if (type && resource.type !== type) return false;
      
      // Text matching
      const titleMatch = resource.title.toLowerCase().includes(queryLower);
      const contentMatch = resource.content.toLowerCase().includes(queryLower);
      const tagMatch = resource.tags.some(tag => 
        tag.toLowerCase().includes(queryLower)
      );
      
      return titleMatch || contentMatch || tagMatch;
    });
  }, [resources]);

  // Get learning insights
  const getLearningInsights = useMemo(() => {
    const insights = {
      mostUsedResources: [] as { resource: Resource; count: number }[],
      preferredTypes: {} as Record<string, number>,
      contextPatterns: {} as Record<string, number>,
      peakUsageTimes: [] as number[]
    };
    
    // Analyze usage patterns
    const resourceCounts = new Map<string, number>();
    const typeCounts = new Map<string, number>();
    const contextCounts = new Map<string, number>();
    const hourCounts = new Array(24).fill(0);
    
    usageHistory.forEach(usage => {
      // Resource frequency
      resourceCounts.set(usage.resourceId, 
        (resourceCounts.get(usage.resourceId) || 0) + 1
      );
      
      // Type preferences
      const resource = resources.find(r => r.id === usage.resourceId);
      if (resource) {
        typeCounts.set(resource.type, 
          (typeCounts.get(resource.type) || 0) + 1
        );
      }
      
      // Context patterns
      if (usage.context) {
        contextCounts.set(usage.context, 
          (contextCounts.get(usage.context) || 0) + 1
        );
      }
      
      // Time patterns
      const hour = new Date(usage.timestamp).getHours();
      hourCounts[hour]++;
    });
    
    // Convert to insights
    insights.mostUsedResources = Array.from(resourceCounts.entries())
      .map(([id, count]) => ({
        resource: resources.find(r => r.id === id)!,
        count
      }))
      .filter(item => item.resource)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    insights.preferredTypes = Object.fromEntries(typeCounts);
    insights.contextPatterns = Object.fromEntries(contextCounts);
    insights.peakUsageTimes = hourCounts;
    
    return insights;
  }, [usageHistory, resources]);

  return {
    resources,
    recommendations,
    recentlyUsed,
    loading,
    trackUsage,
    getRelevantResources,
    learningInsights: getLearningInsights
  };
};