/**
 * Marketing Profile Database Model
 * Handles all database operations for marketing profiles
 */

import { createClient } from '@supabase/supabase-js';
import { databaseConfig } from '../config/database.js';

class MarketingProfileDB {
  constructor() {
    this.supabase = createClient(
      databaseConfig.supabase.url,
      databaseConfig.supabase.serviceKey
    );
  }

  /**
   * Get or create a marketing profile
   */
  async getOrCreateProfile(brandId, userId) {
    try {
      // First, try to get existing profile
      const { data: existingProfile, error: fetchError } = await this.supabase
        .from('marketing_profiles')
        .select(`
          *,
          marketing_assessments (
            id,
            score,
            confidence,
            buckets,
            inputs,
            signals,
            completed_at
          ),
          marketing_goals (
            id,
            metric,
            description,
            target,
            current_value,
            unit,
            status,
            priority,
            deadline,
            trend,
            category,
            business_stage,
            goal_milestones (
              id,
              label,
              value,
              completed
            )
          ),
          growth_plans (
            id,
            current_phase,
            phases,
            started_at,
            estimated_completion
          ),
          marketing_evidence (
            id,
            source,
            key,
            data,
            verified,
            confidence,
            related_goals
          )
        `)
        .eq('brand_id', brandId)
        .eq('user_id', userId)
        .single();

      if (existingProfile) {
        return this.formatProfile(existingProfile);
      }

      // Create new profile if doesn't exist
      const { data: newProfile, error: createError } = await this.supabase
        .from('marketing_profiles')
        .insert({
          brand_id: brandId,
          user_id: userId,
          skill_level: 'new',
          business_stage: 'pre-launch'
        })
        .select()
        .single();

      if (createError) throw createError;

      return this.formatProfile(newProfile);
    } catch (error) {
      console.error('Error getting/creating profile:', error);
      throw error;
    }
  }

  /**
   * Save assessment results
   */
  async saveAssessment(brandId, userId, assessmentData) {
    try {
      // Get profile
      const profile = await this.getOrCreateProfile(brandId, userId);

      // Save assessment
      const { data: assessment, error: assessmentError } = await this.supabase
        .from('marketing_assessments')
        .insert({
          profile_id: profile.id,
          score: assessmentData.score,
          confidence: assessmentData.confidence || 0.7,
          buckets: assessmentData.buckets || {},
          inputs: assessmentData.inputs || [],
          signals: assessmentData.signals || []
        })
        .select()
        .single();

      if (assessmentError) throw assessmentError;

      // Update profile skill level
      const skillLevel = this.calculateSkillLevel(assessmentData.score);
      const { error: updateError } = await this.supabase
        .from('marketing_profiles')
        .update({
          skill_level: skillLevel,
          business_stage: this.determineBusinessStage(assessmentData)
        })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      // Create snapshot for historical tracking
      await this.createSnapshot(profile.id, 'assessment', 'Assessment completed');

      return assessment;
    } catch (error) {
      console.error('Error saving assessment:', error);
      throw error;
    }
  }

  /**
   * Save goals
   */
  async saveGoals(brandId, userId, goals) {
    try {
      const profile = await this.getOrCreateProfile(brandId, userId);

      // Insert goals with milestones
      for (const goal of goals) {
        const { milestones, ...goalData } = goal;

        // Insert goal
        const { data: savedGoal, error: goalError } = await this.supabase
          .from('marketing_goals')
          .insert({
            ...goalData,
            profile_id: profile.id,
            current_value: goal.current || 0
          })
          .select()
          .single();

        if (goalError) throw goalError;

        // Insert milestones if they exist
        if (milestones && milestones.length > 0) {
          const milestonesData = milestones.map((m, index) => ({
            goal_id: savedGoal.id,
            label: m.label,
            value: m.value,
            completed: m.completed || false,
            sequence_order: index + 1
          }));

          const { error: milestoneError } = await this.supabase
            .from('goal_milestones')
            .insert(milestonesData);

          if (milestoneError) throw milestoneError;
        }
      }

      return goals;
    } catch (error) {
      console.error('Error saving goals:', error);
      throw error;
    }
  }

  /**
   * Save growth plan
   */
  async saveGrowthPlan(brandId, userId, growthPlan) {
    try {
      const profile = await this.getOrCreateProfile(brandId, userId);

      // Deactivate existing plans
      await this.supabase
        .from('growth_plans')
        .update({ is_active: false })
        .eq('profile_id', profile.id);

      // Insert new plan
      const { data: plan, error } = await this.supabase
        .from('growth_plans')
        .insert({
          profile_id: profile.id,
          current_phase: growthPlan.currentPhase,
          phases: growthPlan.phases,
          estimated_completion: growthPlan.estimatedCompletion,
          generated_from: 'assessment',
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;

      return plan;
    } catch (error) {
      console.error('Error saving growth plan:', error);
      throw error;
    }
  }

  /**
   * Save quarterly check-in
   */
  async saveCheckIn(brandId, userId, checkInData) {
    try {
      const profile = await this.getOrCreateProfile(brandId, userId);

      // Calculate quarter number
      const lastCheckIn = await this.getLastCheckIn(profile.id);
      const quarterNumber = lastCheckIn ? lastCheckIn.quarter_number + 1 : 1;

      // Save check-in
      const { data: checkIn, error } = await this.supabase
        .from('marketing_check_ins')
        .insert({
          profile_id: profile.id,
          quarter_number: quarterNumber,
          metrics: checkInData.metrics,
          questions: checkInData.questions || [],
          answers: checkInData.answers || {},
          performance_trend: checkInData.trend,
          insights: checkInData.insights || [],
          recommendations: checkInData.recommendations || [],
          goals_adjusted: checkInData.goalsAdjusted || 0,
          adjustment_summary: checkInData.adjustmentSummary
        })
        .select()
        .single();

      if (error) throw error;

      // Update profile
      await this.supabase
        .from('marketing_profiles')
        .update({
          last_check_in: new Date().toISOString(),
          next_check_in_due: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', profile.id);

      // Create snapshot
      await this.createSnapshot(profile.id, 'check-in', `Quarterly check-in #${quarterNumber}`);

      return checkIn;
    } catch (error) {
      console.error('Error saving check-in:', error);
      throw error;
    }
  }

  /**
   * Update goal progress
   */
  async updateGoalProgress(goalId, currentValue, trend) {
    try {
      // Update goal
      const { error: updateError } = await this.supabase
        .from('marketing_goals')
        .update({
          current_value: currentValue,
          trend: trend
        })
        .eq('id', goalId);

      if (updateError) throw updateError;

      // Add progress entry
      const { error: progressError } = await this.supabase
        .from('marketing_progress')
        .upsert({
          goal_id: goalId,
          date: new Date().toISOString().split('T')[0],
          value: currentValue,
          source: 'manual'
        });

      if (progressError) throw progressError;

      // Check if goal is completed
      const { data: goal } = await this.supabase
        .from('marketing_goals')
        .select('target, current_value')
        .eq('id', goalId)
        .single();

      if (goal && goal.current_value >= goal.target) {
        await this.supabase
          .from('marketing_goals')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', goalId);
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating goal progress:', error);
      throw error;
    }
  }

  /**
   * Save evidence
   */
  async saveEvidence(brandId, userId, evidence) {
    try {
      const profile = await this.getOrCreateProfile(brandId, userId);

      const { error } = await this.supabase
        .from('marketing_evidence')
        .insert({
          profile_id: profile.id,
          source: evidence.source,
          key: evidence.key,
          data: evidence.data,
          verified: evidence.verified || false,
          confidence: evidence.confidence || 0.5,
          related_goals: evidence.relatedGoals || []
        });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error saving evidence:', error);
      throw error;
    }
  }

  /**
   * Create historical snapshot
   */
  async createSnapshot(profileId, type, reason) {
    try {
      // Get complete profile state
      const { data: profile } = await this.supabase
        .from('marketing_profiles')
        .select(`
          *,
          marketing_assessments (*),
          marketing_goals (*),
          growth_plans (*),
          marketing_evidence (*)
        `)
        .eq('id', profileId)
        .single();

      // Save snapshot
      const { error } = await this.supabase
        .from('marketing_snapshots')
        .insert({
          profile_id: profileId,
          snapshot_type: type,
          profile_data: profile,
          reason: reason
        });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error creating snapshot:', error);
      // Non-critical, don't throw
    }
  }

  /**
   * Get progress history for a goal
   */
  async getGoalProgress(goalId, days = 90) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await this.supabase
        .from('marketing_progress')
        .select('*')
        .eq('goal_id', goalId)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error getting goal progress:', error);
      throw error;
    }
  }

  /**
   * Get analytics dashboard data
   */
  async getAnalytics(brandId, userId) {
    try {
      const { data, error } = await this.supabase
        .from('marketing_analytics')
        .select('*')
        .eq('brand_id', brandId)
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error getting analytics:', error);
      throw error;
    }
  }

  /**
   * Export profile data
   */
  async exportProfileData(brandId, userId) {
    try {
      const profile = await this.getOrCreateProfile(brandId, userId);
      
      // Get all related data
      const { data } = await this.supabase
        .from('marketing_profiles')
        .select(`
          *,
          marketing_assessments (*),
          marketing_goals (
            *,
            goal_milestones (*)
          ),
          growth_plans (*),
          marketing_evidence (*),
          marketing_check_ins (*),
          marketing_snapshots (*)
        `)
        .eq('id', profile.id)
        .single();

      return {
        exportDate: new Date().toISOString(),
        version: '1.0',
        data: data
      };
    } catch (error) {
      console.error('Error exporting profile:', error);
      throw error;
    }
  }

  // Helper methods

  calculateSkillLevel(score) {
    if (score >= 75) return 'expert';
    if (score >= 50) return 'advanced';
    if (score >= 25) return 'intermediate';
    return 'new';
  }

  determineBusinessStage(assessment) {
    const answers = assessment.inputs || [];
    const businessDefined = answers.find(a => a.id === 'business_defined')?.value;
    
    if (businessDefined === 'startup') return 'pre-launch';
    if (businessDefined === 'growing') return 'startup';
    if (businessDefined === 'established') return 'growing';
    if (businessDefined === 'scaling') return 'established';
    
    return 'startup';
  }

  async getLastCheckIn(profileId) {
    const { data } = await this.supabase
      .from('marketing_check_ins')
      .select('quarter_number')
      .eq('profile_id', profileId)
      .order('check_in_date', { ascending: false })
      .limit(1)
      .single();
    
    return data;
  }

  formatProfile(dbProfile) {
    // Format database response to match frontend expectations
    return {
      id: dbProfile.id,
      brandId: dbProfile.brand_id,
      userId: dbProfile.user_id,
      skillLevel: dbProfile.skill_level,
      businessStage: dbProfile.business_stage,
      assessment: dbProfile.marketing_assessments?.[0] || null,
      goals: dbProfile.marketing_goals || [],
      growthPlan: dbProfile.growth_plans?.[0] || null,
      evidence: dbProfile.marketing_evidence || [],
      updatedAt: dbProfile.updated_at,
      lastCheckIn: dbProfile.last_check_in,
      nextCheckInDue: dbProfile.next_check_in_due
    };
  }
}

export default MarketingProfileDB;