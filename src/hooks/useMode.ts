import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';

export type AppMode = 'travel' | 'cmo';
export type CMOSubMode = 'all' | 'seo' | 'email' | 'social' | 'directMail' | 'ads';

interface ModeState {
  mode: AppMode;
  subMode: CMOSubMode | null;
  isLoading: boolean;
  error: string | null;
}

interface ModePreferences {
  defaultMode: AppMode;
  lastSubMode: CMOSubMode | null;
  modeSettings: Record<string, any>;
}

interface UseModeReturn {
  mode: AppMode;
  subMode: CMOSubMode | null;
  isLoading: boolean;
  error: string | null;
  switchMode: (newMode: AppMode, newSubMode?: CMOSubMode | null) => Promise<void>;
  updateSubMode: (newSubMode: CMOSubMode) => void;
  getModeTheme: () => ModeTheme;
  getModeIcon: () => string;
  getSubModeLabel: (subMode: CMOSubMode) => string;
}

interface ModeTheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  hover: string;
  gradient: string;
}

// Theme definitions for each mode
const modeThemes: Record<AppMode, ModeTheme> = {
  travel: {
    primary: '#0fc6c6',
    secondary: '#0a9999',
    accent: '#06d6d6',
    background: '#f0fffe',
    surface: '#ffffff',
    text: '#1a202c',
    textSecondary: '#4a5568',
    border: '#e2e8f0',
    hover: '#e6fffa',
    gradient: 'linear-gradient(135deg, #0fc6c6 0%, #0a9999 100%)'
  },
  cmo: {
    primary: '#ff6b6b',
    secondary: '#ee5a5a',
    accent: '#ff8787',
    background: '#fff5f5',
    surface: '#ffffff',
    text: '#1a202c',
    textSecondary: '#4a5568',
    border: '#feb2b2',
    hover: '#fee',
    gradient: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%)'
  }
};

const subModeLabels: Record<CMOSubMode, string> = {
  all: 'All Marketing',
  seo: 'SEO',
  email: 'Email Marketing',
  social: 'Social Media',
  directMail: 'Direct Mail',
  ads: 'Paid Advertising'
};

export const useMode = (): UseModeReturn => {
  const { user } = useAuthStore();
  const [state, setState] = useState<ModeState>(() => {
    // Initialize from localStorage immediately
    const storageKey = 'mode_preferences_default';
    const cached = localStorage.getItem(storageKey);
    
    if (cached) {
      try {
        const preferences = JSON.parse(cached);
        return {
          mode: preferences.defaultMode || 'travel',
          subMode: preferences.lastSubMode || null,
          isLoading: false,
          error: null
        };
      } catch (e) {
        console.error('Failed to parse cached preferences:', e);
      }
    }
    
    return {
      mode: 'travel',
      subMode: null,
      isLoading: false,
      error: null
    };
  });

  // Sync with backend preferences (non-blocking)
  useEffect(() => {
    // Only sync if user is logged in
    if (!user?.id) return;
    
    const syncPreferences = async () => {
      try {
        const response = await fetch('/api/users/mode-preferences', {
          headers: {
            'X-API-Key': user.apiKey || ''
          }
        });

        if (response.ok) {
          const data = await response.json();
          const preferences: ModePreferences = {
            defaultMode: data.user_preferences?.default_mode || 'travel',
            lastSubMode: data.user_preferences?.last_sub_mode || null,
            modeSettings: data.user_preferences?.mode_settings || {}
          };

          // Only update if different from current state
          if (preferences.defaultMode !== state.mode || preferences.lastSubMode !== state.subMode) {
            setState(prev => ({
              ...prev,
              mode: preferences.defaultMode,
              subMode: preferences.lastSubMode
            }));

            // Update cache
            localStorage.setItem(
              `mode_preferences_${user.id}`,
              JSON.stringify(preferences)
            );
          }
        }
      } catch (error) {
        // Silently fail - don't block UI
        console.warn('Could not sync mode preferences:', error);
      }
    };

    syncPreferences();
  }, [user?.id]);

  // Switch mode function
  const switchMode = useCallback(async (
    newMode: AppMode,
    newSubMode: CMOSubMode | null = null
  ) => {
    try {
      // Update local state immediately for responsiveness
      setState(prev => ({
        ...prev,
        mode: newMode,
        subMode: newMode === 'cmo' ? newSubMode || 'all' : null,
        error: null
      }));

      // Save to localStorage (use default key if no user)
      const preferences: ModePreferences = {
        defaultMode: newMode,
        lastSubMode: newMode === 'cmo' ? newSubMode || 'all' : null,
        modeSettings: {}
      };
      const storageKey = user?.id ? `mode_preferences_${user.id}` : 'mode_preferences_default';
      localStorage.setItem(
        storageKey,
        JSON.stringify(preferences)
      );

      // Sync with backend if user is logged in
      if (user?.id) {
        try {
          const response = await fetch('/api/users/mode-preferences', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': user.apiKey || ''
            },
            body: JSON.stringify({
              defaultMode: newMode,
              modeSettings: {
                lastSubMode: newSubMode
              }
            })
          });

          if (!response.ok) {
            console.warn('Failed to save mode preference to backend');
          }
        } catch (error) {
          console.warn('Could not sync mode preference with backend:', error);
        }
      }

      // Dispatch custom event for other components to react
      window.dispatchEvent(new CustomEvent('modeChanged', {
        detail: { mode: newMode, subMode: newSubMode }
      }));

    } catch (error) {
      console.error('Failed to switch mode:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to switch mode'
      }));
    }
  }, [user]);

  // Update sub-mode only
  const updateSubMode = useCallback((newSubMode: CMOSubMode) => {
    if (state.mode !== 'cmo') return;

    setState(prev => ({ ...prev, subMode: newSubMode }));

    // Save to localStorage
    if (user?.id) {
      const cached = localStorage.getItem(`mode_preferences_${user.id}`);
      if (cached) {
        const preferences: ModePreferences = JSON.parse(cached);
        preferences.lastSubMode = newSubMode;
        localStorage.setItem(
          `mode_preferences_${user.id}`,
          JSON.stringify(preferences)
        );
      }
    }

    // Dispatch event
    window.dispatchEvent(new CustomEvent('subModeChanged', {
      detail: { subMode: newSubMode }
    }));
  }, [state.mode, user?.id]);

  // Get current mode theme
  const getModeTheme = useCallback(() => {
    return modeThemes[state.mode];
  }, [state.mode]);

  // Get mode icon
  const getModeIcon = useCallback(() => {
    return state.mode === 'travel' ? '🧳' : '🎯';
  }, [state.mode]);

  // Get sub-mode label
  const getSubModeLabel = useCallback((subMode: CMOSubMode) => {
    return subModeLabels[subMode];
  }, []);

  return {
    mode: state.mode,
    subMode: state.subMode,
    isLoading: state.isLoading,
    error: state.error,
    switchMode,
    updateSubMode,
    getModeTheme,
    getModeIcon,
    getSubModeLabel
  };
};