/**
 * Expertise Profiles Service
 * Manages granular expertise tracking across marketing channels
 */

import { apiClient } from './apiClient';

export interface ChannelExpertise {
  level: number;
  confidence: number;
  last_interaction?: string;
}

export interface ExpertiseProfile {
  user_id: string;
  overall_level: string;
  overall_confidence: number;
  channel_expertise: {
    seo: ChannelExpertise;
    email: ChannelExpertise;
    social: ChannelExpertise;
    ppc: ChannelExpertise;
    content: ChannelExpertise;
    analytics: ChannelExpertise;
    cro: ChannelExpertise;
  };
  preferred_learning_style: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  technical_comfort: number;
  industry_experience: string[];
  tools_familiar: string[];
  goals: string[];
  priority_channels: string[];
  learning_pace: 'slow' | 'medium' | 'fast';
  detail_preference: 'high-level' | 'balanced' | 'detailed';
  created_at: string;
  last_updated: string;
}

export interface TopicExpertise {
  level: number;
  confidence: number;
  source: 'channel-specific' | 'overall-level' | 'default' | 'error-fallback';
  channel?: string;
  last_interaction?: string;
}

export interface CommunicationPreferences {
  learning_style: string;
  communication_approach: string;
  technical_level: number;
  detail_preference: string;
  pace: string;
  preferred_examples: string[];
  industry_context: string[];
  tool_references: string[];
}

export interface ChannelRecommendation {
  type: 'improvement' | 'advancement';
  channel: string;
  current_level: number;
  confidence: number;
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
}

export interface ExpertiseSummary {
  overall_level: string;
  strongest_channels: Array<{
    channel: string;
    level: number;
    confidence: number;
  }>;
  weakest_channels: Array<{
    channel: string;
    level: number;
    confidence: number;
  }>;
  learning_style: string;
  technical_comfort: number;
  industry_experience: string[];
  recommendations_count: number;
  last_updated: string;
}

class ExpertiseProfilesService {
  private baseUrl = '/api/expertise';

  /**
   * Create detailed expertise profile
   */
  async createProfile(assessment: any): Promise<ExpertiseProfile> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/profile/create`, {
        assessment
      });
      return response.data.profile;
    } catch (error) {
      console.error('Error creating expertise profile:', error);
      throw error;
    }
  }

  /**
   * Get topic-specific expertise
   */
  async getTopicExpertise(topic: string): Promise<TopicExpertise> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/profile/topic/${topic}`);
      return response.data;
    } catch (error) {
      console.error('Error getting topic expertise:', error);
      return {
        level: 1,
        confidence: 0.5,
        source: 'error-fallback'
      };
    }
  }

  /**
   * Update channel expertise based on interaction
   */
  async updateChannelExpertise(topic: string, interactionData: {
    success?: boolean;
    confusion?: boolean;
    timeToComplete?: number;
    difficulty?: number;
  }): Promise<boolean> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/profile/channel/update`, {
        topic,
        interactionData
      });
      return response.data.success;
    } catch (error) {
      console.error('Error updating channel expertise:', error);
      return false;
    }
  }

  /**
   * Get communication preferences
   */
  async getCommunicationPreferences(userId: string): Promise<CommunicationPreferences> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/profile/communication/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting communication preferences:', error);
      return this.getDefaultCommunicationPreferences();
    }
  }

  /**
   * Get channel-specific recommendations
   */
  async getChannelRecommendations(userId: string): Promise<ChannelRecommendation[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/profile/recommendations/channels/${userId}`);
      return response.data.recommendations || [];
    } catch (error) {
      console.error('Error getting channel recommendations:', error);
      return [];
    }
  }

  /**
   * Get expertise summary
   */
  async getExpertiseSummary(userId: string): Promise<ExpertiseSummary> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/profile/summary/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error getting expertise summary:', error);
      throw error;
    }
  }

  /**
   * Get full profile
   */
  async getProfile(userId: string): Promise<ExpertiseProfile | null> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/profile/${userId}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error('Error getting expertise profile:', error);
      throw error;
    }
  }

  /**
   * Get channel expertise levels for display
   */
  getChannelLevels(profile: ExpertiseProfile): Array<{
    channel: string;
    displayName: string;
    level: number;
    confidence: number;
    color: string;
    description: string;
  }> {
    const channelInfo = {
      seo: {
        displayName: 'SEO',
        color: 'text-green-600 bg-green-100',
        description: 'Search engine optimization and organic traffic'
      },
      email: {
        displayName: 'Email Marketing',
        color: 'text-blue-600 bg-blue-100',
        description: 'Email campaigns and automation'
      },
      social: {
        displayName: 'Social Media',
        color: 'text-purple-600 bg-purple-100',
        description: 'Social media marketing and engagement'
      },
      ppc: {
        displayName: 'PPC Advertising',
        color: 'text-red-600 bg-red-100',
        description: 'Paid search and display advertising'
      },
      content: {
        displayName: 'Content Marketing',
        color: 'text-orange-600 bg-orange-100',
        description: 'Content strategy and creation'
      },
      analytics: {
        displayName: 'Analytics',
        color: 'text-indigo-600 bg-indigo-100',
        description: 'Data analysis and measurement'
      },
      cro: {
        displayName: 'Conversion Optimization',
        color: 'text-teal-600 bg-teal-100',
        description: 'Conversion rate optimization and testing'
      }
    };

    return Object.entries(profile.channel_expertise).map(([channel, expertise]) => ({
      channel,
      displayName: channelInfo[channel]?.displayName || channel.toUpperCase(),
      level: expertise.level,
      confidence: expertise.confidence,
      color: channelInfo[channel]?.color || 'text-gray-600 bg-gray-100',
      description: channelInfo[channel]?.description || `${channel} marketing expertise`
    }));
  }

  /**
   * Get level description
   */
  getLevelDescription(level: number): string {
    if (level <= 1.5) return 'Beginner';
    if (level <= 2.5) return 'Intermediate';
    if (level <= 3.5) return 'Advanced';
    return 'Expert';
  }

  /**
   * Get confidence description
   */
  getConfidenceDescription(confidence: number): string {
    if (confidence < 0.3) return 'Low confidence';
    if (confidence < 0.7) return 'Medium confidence';
    return 'High confidence';
  }

  /**
   * Calculate overall strength score
   */
  calculateStrengthScore(profile: ExpertiseProfile): number {
    const channels = Object.values(profile.channel_expertise);
    const totalScore = channels.reduce((sum, channel) => 
      sum + (channel.level * channel.confidence), 0
    );
    return totalScore / channels.length;
  }

  /**
   * Get recommended focus areas
   */
  getRecommendedFocusAreas(profile: ExpertiseProfile): Array<{
    channel: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
    action: string;
  }> {
    const recommendations = [];
    
    Object.entries(profile.channel_expertise).forEach(([channel, expertise]) => {
      const strengthScore = expertise.level * expertise.confidence;
      
      // Recommend improvement for weak areas
      if (strengthScore < 2.0) {
        recommendations.push({
          channel,
          reason: `Low proficiency (Level ${expertise.level.toFixed(1)})`,
          priority: strengthScore < 1.5 ? 'high' : 'medium',
          action: 'Focus on fundamentals and basic strategies'
        });
      }
      
      // Recommend advancement for strong areas
      if (strengthScore > 6.0 && expertise.level >= 3) {
        recommendations.push({
          channel,
          reason: `High proficiency (Level ${expertise.level.toFixed(1)})`,
          priority: 'low',
          action: 'Explore advanced tactics and thought leadership'
        });
      }
    });
    
    // Sort by priority
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return recommendations.sort((a, b) => 
      priorityOrder[b.priority] - priorityOrder[a.priority]
    );
  }

  /**
   * Get learning style recommendations
   */
  getLearningStyleRecommendations(learningStyle: string): {
    approach: string;
    contentTypes: string[];
    tips: string[];
  } {
    const styles = {
      visual: {
        approach: 'Include charts, diagrams, and visual examples',
        contentTypes: ['Infographics', 'Screenshots', 'Video tutorials', 'Flowcharts'],
        tips: [
          'Use bullet points and visual hierarchy',
          'Include before/after examples',
          'Provide visual templates and checklists'
        ]
      },
      auditory: {
        approach: 'Provide detailed explanations and discussions',
        contentTypes: ['Podcasts', 'Webinars', 'Audio guides', 'Verbal explanations'],
        tips: [
          'Use analogies and storytelling',
          'Provide step-by-step narration',
          'Include discussion questions'
        ]
      },
      kinesthetic: {
        approach: 'Focus on hands-on practice and exercises',
        contentTypes: ['Interactive tutorials', 'Workshops', 'Practice exercises', 'Simulations'],
        tips: [
          'Provide actionable steps',
          'Include practice assignments',
          'Use real-world scenarios'
        ]
      },
      reading: {
        approach: 'Provide comprehensive written resources',
        contentTypes: ['Guides', 'Documentation', 'Articles', 'Checklists'],
        tips: [
          'Include detailed explanations',
          'Provide reference materials',
          'Use structured formats'
        ]
      }
    };
    
    return styles[learningStyle] || styles.visual;
  }

  /**
   * Get default communication preferences
   */
  private getDefaultCommunicationPreferences(): CommunicationPreferences {
    return {
      learning_style: 'visual',
      communication_approach: 'Include visual examples and step-by-step screenshots',
      technical_level: 0.5,
      detail_preference: 'balanced',
      pace: 'medium',
      preferred_examples: ['general business scenarios'],
      industry_context: [],
      tool_references: []
    };
  }

  /**
   * Map topic to marketing channel
   */
  mapTopicToChannel(topic: string): string {
    const topicChannelMap: Record<string, string> = {
      'seo': 'seo',
      'keyword-research': 'seo',
      'email': 'email',
      'email-campaigns': 'email',
      'social': 'social',
      'social-media': 'social',
      'ppc': 'ppc',
      'google-ads': 'ppc',
      'content': 'content',
      'blog-strategy': 'content',
      'analytics': 'analytics',
      'conversion-tracking': 'analytics',
      'cro': 'cro',
      'ab-testing': 'cro'
    };
    
    const normalizedTopic = topic.toLowerCase().replace(/[_\s-]+/g, '-');
    return topicChannelMap[normalizedTopic] || 'general';
  }
}

export const expertiseProfilesService = new ExpertiseProfilesService();