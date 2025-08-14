/**
 * Hook for managing expertise profiles and channel-specific expertise
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { 
  expertiseProfilesService, 
  ExpertiseProfile, 
  ExpertiseSummary, 
  TopicExpertise,
  CommunicationPreferences,
  ChannelRecommendation
} from '../services/expertiseProfilesService';

interface UseExpertiseProfilesReturn {
  profile: ExpertiseProfile | null;
  summary: ExpertiseSummary | null;
  recommendations: ChannelRecommendation[];
  communicationPreferences: CommunicationPreferences | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  createProfile: (assessment: any) => Promise<void>;
  getTopicExpertise: (topic: string) => Promise<TopicExpertise>;
  updateChannelExpertise: (topic: string, interactionData: any) => Promise<void>;
  refreshProfile: () => Promise<void>;
  
  // Utilities
  getChannelLevels: () => any[];
  getStrengthScore: () => number;
  getLearningStyleInfo: () => any;
}

export const useExpertiseProfiles = (): UseExpertiseProfilesReturn => {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<ExpertiseProfile | null>(null);
  const [summary, setSummary] = useState<ExpertiseSummary | null>(null);
  const [recommendations, setRecommendations] = useState<ChannelRecommendation[]>([]);
  const [communicationPreferences, setCommunicationPreferences] = useState<CommunicationPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load profile data on user change
  useEffect(() => {
    if (user?.id) {
      refreshProfile();
    }
  }, [user?.id]);

  // Refresh all profile data
  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);
    
    try {
      const [profileData, summaryData, recommendationsData, preferencesData] = await Promise.all([
        expertiseProfilesService.getProfile(user.id),
        expertiseProfilesService.getExpertiseSummary(user.id).catch(() => null),
        expertiseProfilesService.getChannelRecommendations(user.id).catch(() => []),
        expertiseProfilesService.getCommunicationPreferences(user.id).catch(() => null)
      ]);
      
      setProfile(profileData);
      setSummary(summaryData);
      setRecommendations(recommendationsData);
      setCommunicationPreferences(preferencesData);
    } catch (err) {
      console.error('Error refreshing profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Create detailed profile from assessment
  const createProfile = useCallback(async (assessment: any) => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const newProfile = await expertiseProfilesService.createProfile(assessment);
      setProfile(newProfile);
      
      // Refresh related data
      await refreshProfile();
    } catch (err) {
      console.error('Error creating profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to create profile');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.id, refreshProfile]);

  // Get topic-specific expertise
  const getTopicExpertise = useCallback(async (topic: string): Promise<TopicExpertise> => {
    try {
      return await expertiseProfilesService.getTopicExpertise(topic);
    } catch (error) {
      console.error('Error getting topic expertise:', error);
      return {
        level: 1,
        confidence: 0.5,
        source: 'error-fallback'
      };
    }
  }, []);

  // Update channel expertise based on interaction
  const updateChannelExpertise = useCallback(async (topic: string, interactionData: any) => {
    try {
      const success = await expertiseProfilesService.updateChannelExpertise(topic, interactionData);
      
      if (success) {
        // Refresh profile to get updated expertise levels
        await refreshProfile();
      }
    } catch (error) {
      console.error('Error updating channel expertise:', error);
    }
  }, [refreshProfile]);

  // Get channel levels for display
  const getChannelLevels = useCallback(() => {
    if (!profile) return [];
    return expertiseProfilesService.getChannelLevels(profile);
  }, [profile]);

  // Get overall strength score
  const getStrengthScore = useCallback(() => {
    if (!profile) return 0;
    return expertiseProfilesService.calculateStrengthScore(profile);
  }, [profile]);

  // Get learning style information
  const getLearningStyleInfo = useCallback(() => {
    if (!profile) return null;
    return expertiseProfilesService.getLearningStyleRecommendations(profile.preferred_learning_style);
  }, [profile]);

  return {
    profile,
    summary,
    recommendations,
    communicationPreferences,
    loading,
    error,
    
    // Actions
    createProfile,
    getTopicExpertise,
    updateChannelExpertise,
    refreshProfile,
    
    // Utilities
    getChannelLevels,
    getStrengthScore,
    getLearningStyleInfo
  };
};

// Simplified hook for just getting topic expertise
export const useTopicExpertise = (topic: string) => {
  const [expertise, setExpertise] = useState<TopicExpertise | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!topic) return;

    setLoading(true);
    expertiseProfilesService.getTopicExpertise(topic)
      .then(setExpertise)
      .catch(error => {
        console.error('Error getting topic expertise:', error);
        setExpertise({
          level: 1,
          confidence: 0.5,
          source: 'error-fallback'
        });
      })
      .finally(() => setLoading(false));
  }, [topic]);

  return { expertise, loading };
};

// Hook for communication preferences
export const useCommunicationPreferences = () => {
  const { user } = useAuthStore();
  const [preferences, setPreferences] = useState<CommunicationPreferences | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    setLoading(true);
    expertiseProfilesService.getCommunicationPreferences(user.id)
      .then(setPreferences)
      .catch(error => {
        console.error('Error getting communication preferences:', error);
        setPreferences(null);
      })
      .finally(() => setLoading(false));
  }, [user?.id]);

  return { preferences, loading };
};