/**
 * Expertise Assessment Service - Frontend
 * Handles communication with backend expertise assessment endpoints
 */

import { apiClient } from './apiClient';

export interface ExpertiseLevel {
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  confidence: number;
  areas: Record<string, any>;
  communicationStyle: string;
  recommendations: Array<{
    type: string;
    priority: string;
    title: string;
    description: string;
  }>;
}

export interface AssessmentQuestion {
  id: string;
  question: string;
  type: 'single-select' | 'multi-select';
  required: boolean;
  options: Array<{
    value: string;
    label: string;
    description?: string;
  }>;
}

class ExpertiseService {
  /**
   * Get assessment questions
   */
  async getAssessmentQuestions(): Promise<{ questions: AssessmentQuestion[] }> {
    try {
      const response = await apiClient.get('/api/expertise/questions');
      return response.data;
    } catch (error) {
      console.error('Error fetching assessment questions:', error);
      throw error;
    }
  }

  /**
   * Submit assessment answers and get expertise level
   */
  async assessExpertise(answers: Record<string, any>): Promise<ExpertiseLevel & { 
    needsValidation?: boolean; 
    validationQuestions?: AssessmentQuestion[] 
  }> {
    try {
      const response = await apiClient.post('/api/expertise/assess', { answers });
      return response.data;
    } catch (error) {
      console.error('Error assessing expertise:', error);
      throw error;
    }
  }

  /**
   * Validate expertise with follow-up questions
   */
  async validateExpertise(
    level: string, 
    validationAnswers: Record<string, any>
  ): Promise<{ 
    validated: boolean; 
    adjustedLevel?: string; 
    message?: string 
  }> {
    try {
      const response = await apiClient.post('/api/expertise/validate', {
        level,
        answers: validationAnswers
      });
      return response.data;
    } catch (error) {
      console.error('Error validating expertise:', error);
      throw error;
    }
  }

  /**
   * Save assessment results
   */
  async saveAssessment(
    userId: string,
    assessment: ExpertiseLevel,
    answers: Record<string, any>
  ): Promise<{ success: boolean; assessmentId?: string }> {
    try {
      const response = await apiClient.post('/api/expertise/save', {
        userId,
        assessment,
        answers
      });
      return response.data;
    } catch (error) {
      console.error('Error saving assessment:', error);
      throw error;
    }
  }

  /**
   * Get user's current expertise profile
   */
  async getUserExpertise(userId: string): Promise<ExpertiseLevel | null> {
    try {
      const response = await apiClient.get(`/api/expertise/user/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user expertise:', error);
      return null;
    }
  }

  /**
   * Update communication preferences
   */
  async updateCommunicationPreferences(
    userId: string,
    preferences: {
      style: 'simple' | 'balanced' | 'technical';
      includeExamples: boolean;
      showBenchmarks: boolean;
    }
  ): Promise<{ success: boolean }> {
    try {
      const response = await apiClient.put(`/api/expertise/preferences/${userId}`, preferences);
      return response.data;
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    }
  }

  /**
   * Get adapted response based on user's expertise
   */
  async getAdaptedResponse(
    userId: string,
    message: string,
    context?: {
      topic?: string;
      includeSteps?: boolean;
      hasData?: boolean;
    }
  ): Promise<string> {
    try {
      const response = await apiClient.post('/api/expertise/adapt-response', {
        userId,
        message,
        context
      });
      return response.data.adaptedResponse;
    } catch (error) {
      console.error('Error getting adapted response:', error);
      throw error;
    }
  }

  /**
   * Track skill progression
   */
  async trackProgress(
    userId: string,
    area: string,
    action: {
      type: 'completed' | 'struggled' | 'skipped';
      topic: string;
      difficulty: number;
    }
  ): Promise<void> {
    try {
      await apiClient.post('/api/expertise/track-progress', {
        userId,
        area,
        action
      });
    } catch (error) {
      console.error('Error tracking progress:', error);
    }
  }

  /**
   * Check if reassessment is needed
   */
  async checkReassessmentNeeded(userId: string): Promise<{
    needed: boolean;
    reason?: string;
    lastAssessment?: Date;
  }> {
    try {
      const response = await apiClient.get(`/api/expertise/check-reassessment/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Error checking reassessment:', error);
      return { needed: false };
    }
  }

  /**
   * Get learning recommendations
   */
  async getLearningRecommendations(userId: string): Promise<Array<{
    id: string;
    title: string;
    description: string;
    difficulty: string;
    estimatedTime: string;
    topics: string[];
  }>> {
    try {
      const response = await apiClient.get(`/api/expertise/recommendations/${userId}`);
      return response.data.recommendations;
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      return [];
    }
  }
}

export const expertiseService = new ExpertiseService();