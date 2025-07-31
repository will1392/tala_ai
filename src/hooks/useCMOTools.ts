import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

interface Tool {
  id: string;
  name: string;
  description: string;
  category: string;
  contexts: string[];
  features: string[];
  status?: string;
}

interface ToolState {
  [key: string]: any;
}

interface ToolUsage {
  userId: string;
  toolId: string;
  firstUsed: string;
  lastUsed: string;
  totalUses: number;
  actions: Record<string, any>;
}

interface UserPreferences {
  pinnedTools: string[];
  recentTools: string[];
  favoriteTools: string[];
  toolbarPosition: 'left' | 'right';
  toolbarExpanded: boolean;
  defaultContext: string | null;
}

interface UseToolsReturn {
  tools: Tool[];
  loading: boolean;
  error: string | null;
  getToolsByContext: (context: string) => Promise<Tool[]>;
  getToolState: (toolId: string) => Promise<ToolState>;
  setToolState: (toolId: string, state: ToolState) => Promise<void>;
  trackUsage: (toolId: string, action: string, data?: any) => Promise<void>;
  preferences: UserPreferences | null;
  updatePreferences: (prefs: Partial<UserPreferences>) => Promise<void>;
  recommendations: any[];
  getRecommendations: (context?: string) => Promise<void>;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const useCMOTools = (): UseToolsReturn => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  // Load all tools on mount
  useEffect(() => {
    loadTools();
    loadPreferences();
  }, []);

  // Load all active tools
  const loadTools = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/cmo/tools`);
      setTools(response.data.tools);
    } catch (err) {
      setError('Failed to load tools');
      console.error('Error loading tools:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load user preferences
  const loadPreferences = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/cmo/preferences`);
      setPreferences(response.data.preferences);
    } catch (err) {
      console.error('Error loading preferences:', err);
    }
  };

  // Get tools by context
  const getToolsByContext = useCallback(async (context: string): Promise<Tool[]> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/cmo/tools/context/${context}`);
      return response.data.tools;
    } catch (err) {
      console.error('Error getting tools by context:', err);
      return [];
    }
  }, []);

  // Get tool state
  const getToolState = useCallback(async (toolId: string): Promise<ToolState> => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/cmo/tools/${toolId}/state`);
      return response.data.state;
    } catch (err) {
      console.error('Error getting tool state:', err);
      return {};
    }
  }, []);

  // Set tool state
  const setToolState = useCallback(async (toolId: string, state: ToolState): Promise<void> => {
    try {
      await axios.post(`${API_BASE_URL}/api/cmo/tools/${toolId}/state`, { state });
    } catch (err) {
      console.error('Error setting tool state:', err);
      throw err;
    }
  }, []);

  // Track tool usage
  const trackUsage = useCallback(async (
    toolId: string, 
    action: string, 
    data?: any
  ): Promise<void> => {
    try {
      await axios.post(`${API_BASE_URL}/api/cmo/tools/${toolId}/usage`, { 
        action, 
        data 
      });
    } catch (err) {
      console.error('Error tracking usage:', err);
    }
  }, []);

  // Update preferences
  const updatePreferences = useCallback(async (
    prefs: Partial<UserPreferences>
  ): Promise<void> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/cmo/preferences`, { 
        preferences: prefs 
      });
      setPreferences(response.data.preferences);
    } catch (err) {
      console.error('Error updating preferences:', err);
      throw err;
    }
  }, []);

  // Get recommendations
  const getRecommendations = useCallback(async (context?: string): Promise<void> => {
    try {
      const params = context ? { context } : {};
      const response = await axios.get(`${API_BASE_URL}/api/cmo/recommendations`, { 
        params 
      });
      setRecommendations(response.data.recommendations);
    } catch (err) {
      console.error('Error getting recommendations:', err);
    }
  }, []);

  return {
    tools,
    loading,
    error,
    getToolsByContext,
    getToolState,
    setToolState,
    trackUsage,
    preferences,
    updatePreferences,
    recommendations,
    getRecommendations
  };
};

// Hook for individual tool state management
export const useToolState = <T = any>(toolId: string) => {
  const [state, setState] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const { getToolState, setToolState, trackUsage } = useCMOTools();

  // Load initial state
  useEffect(() => {
    if (toolId) {
      loadState();
    }
  }, [toolId]);

  const loadState = async () => {
    setLoading(true);
    try {
      const toolState = await getToolState(toolId);
      setState(toolState as T);
    } catch (err) {
      console.error('Error loading tool state:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateState = async (newState: Partial<T>) => {
    try {
      const updated = { ...state, ...newState } as T;
      setState(updated);
      await setToolState(toolId, updated as any);
    } catch (err) {
      console.error('Error updating tool state:', err);
      // Revert on error
      loadState();
    }
  };

  const track = async (action: string, data?: any) => {
    await trackUsage(toolId, action, data);
  };

  return {
    state,
    loading,
    updateState,
    track,
    refresh: loadState
  };
};