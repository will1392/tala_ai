/**
 * UserProfileService - Manages user profile data and personalization
 */

import { SupabaseDatabaseService } from '../db/SupabaseDatabaseService.js';

class UserProfileService {
  constructor() {
    this.db = new SupabaseDatabaseService();
  }

  /**
   * Create or update user profile
   */
  async createUserProfile(userId, profileData) {
    try {
      await this.db.initialize();

      const profile = {
        user_id: userId,
        name: profileData.name,
        role: profileData.role, // 'agent' or 'agency_owner'
        company_name: profileData.companyName,
        employees: profileData.employees,
        monthly_marketing_budget: profileData.monthlyMarketingBudget,
        ideal_client: profileData.idealClient || {},
        business_goals: profileData.businessGoals || [],
        current_challenges: profileData.currentChallenges || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Check if profile exists
      const { data: existingProfile } = await this.db.supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      let result;
      if (existingProfile) {
        // Update existing profile
        const { data, error } = await this.db.supabase
          .from('user_profiles')
          .update({
            ...profile,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;
        result = data;
      } else {
        // Create new profile
        const { data, error } = await this.db.supabase
          .from('user_profiles')
          .insert(profile)
          .select()
          .single();

        if (error) throw error;
        result = data;
      }

      console.log(`✅ User profile ${existingProfile ? 'updated' : 'created'} for user ${userId}`);
      return { success: true, profile: result };

    } catch (error) {
      console.error('Error creating/updating user profile:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user profile by user ID
   */
  async getUserProfile(userId) {
    try {
      await this.db.initialize();

      const { data, error } = await this.db.supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error getting user profile:', error);
      return null;
    }
  }

  /**
   * Update specific profile fields
   */
  async updateProfileField(userId, field, value) {
    try {
      await this.db.initialize();

      const updateData = {
        [field]: value,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await this.db.supabase
        .from('user_profiles')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;

      console.log(`✅ Updated ${field} for user ${userId}`);
      return { success: true, profile: data };

    } catch (error) {
      console.error(`Error updating ${field} for user ${userId}:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get personalized greeting for user
   */
  async getPersonalizedGreeting(userId) {
    try {
      const profile = await this.getUserProfile(userId);
      
      if (!profile || !profile.name) {
        return "Hello! How can I help you today?";
      }

      const greetings = [
        `Hi ${profile.name}! What can I help you with today?`,
        `Hello ${profile.name}! Ready to tackle some marketing challenges?`,
        `Hey ${profile.name}! What marketing questions do you have for me?`,
        `Hi there, ${profile.name}! How can I assist you today?`
      ];

      // Add role-specific context
      const roleContext = {
        'agent': 'As a travel agent',
        'agency_owner': 'As an agency owner'
      };

      const baseGreeting = greetings[Math.floor(Math.random() * greetings.length)];
      
      if (profile.role && roleContext[profile.role]) {
        return `${baseGreeting} ${roleContext[profile.role]}, I can help you with marketing strategies tailored to your client base.`;
      }

      return baseGreeting;
    } catch (error) {
      console.error('Error getting personalized greeting:', error);
      return "Hello! How can I help you today?";
    }
  }

  /**
   * Get context for marketing assistance
   */
  async getMarketingContext(userId) {
    try {
      const profile = await this.getUserProfile(userId);
      
      if (!profile) {
        return {
          hasProfile: false,
          context: {}
        };
      }

      const context = {
        hasProfile: true,
        name: profile.name,
        role: profile.role,
        companyName: profile.company_name,
        employees: profile.employees,
        budget: profile.monthly_marketing_budget,
        idealClient: profile.ideal_client,
        goals: profile.business_goals,
        challenges: profile.current_challenges,
        isAgencyOwner: profile.role === 'agency_owner',
        isAgent: profile.role === 'agent'
      };

      return context;
    } catch (error) {
      console.error('Error getting marketing context:', error);
      return {
        hasProfile: false,
        context: {},
        error: error.message
      };
    }
  }

  /**
   * Generate personalized recommendations based on profile
   */
  async getPersonalizedRecommendations(userId) {
    try {
      const profile = await this.getUserProfile(userId);
      
      if (!profile) {
        return [];
      }

      const recommendations = [];

      // Budget-based recommendations
      if (profile.monthly_marketing_budget) {
        const budgetRecs = this.getBudgetBasedRecommendations(profile.monthly_marketing_budget);
        recommendations.push(...budgetRecs);
      }

      // Role-based recommendations
      if (profile.role) {
        const roleRecs = this.getRoleBasedRecommendations(profile.role, profile.employees);
        recommendations.push(...roleRecs);
      }

      // Goal-based recommendations
      if (profile.business_goals && profile.business_goals.length > 0) {
        const goalRecs = this.getGoalBasedRecommendations(profile.business_goals);
        recommendations.push(...goalRecs);
      }

      // Challenge-based recommendations
      if (profile.current_challenges && profile.current_challenges.length > 0) {
        const challengeRecs = this.getChallengeBasedRecommendations(profile.current_challenges);
        recommendations.push(...challengeRecs);
      }

      return recommendations.slice(0, 5); // Limit to top 5
    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      return [];
    }
  }

  /**
   * Get budget-based marketing recommendations
   */
  getBudgetBasedRecommendations(budget) {
    const recommendations = [];

    switch (budget) {
      case 'under-1k':
        recommendations.push({
          type: 'strategy',
          title: 'Focus on Organic Marketing',
          description: 'With a smaller budget, focus on social media, content marketing, and referrals',
          priority: 'high'
        });
        break;
      case '1k-5k':
        recommendations.push({
          type: 'strategy',
          title: 'Mix Organic with Targeted Ads',
          description: 'Combine content marketing with targeted social media advertising',
          priority: 'high'
        });
        break;
      case '5k-10k':
      case '10k-25k':
        recommendations.push({
          type: 'strategy',
          title: 'Multi-Channel Marketing Strategy',
          description: 'Invest in Google Ads, social media advertising, and email marketing',
          priority: 'high'
        });
        break;
      case 'over-50k':
        recommendations.push({
          type: 'strategy',
          title: 'Advanced Marketing Automation',
          description: 'Implement sophisticated marketing funnels and automation systems',
          priority: 'high'
        });
        break;
    }

    return recommendations;
  }

  /**
   * Get role-based recommendations
   */
  getRoleBasedRecommendations(role, employees) {
    const recommendations = [];

    if (role === 'agent') {
      recommendations.push({
        type: 'tactic',
        title: 'Personal Branding Strategy',
        description: 'Build your personal brand as a trusted travel expert',
        priority: 'medium'
      });
    } else if (role === 'agency_owner') {
      if (employees && employees > 10) {
        recommendations.push({
          type: 'strategy',
          title: 'Team Marketing Training',
          description: 'Train your team on marketing best practices and brand consistency',
          priority: 'medium'
        });
      } else {
        recommendations.push({
          type: 'strategy',
          title: 'Agency Brand Development',
          description: 'Focus on building a strong agency brand and reputation',
          priority: 'medium'
        });
      }
    }

    return recommendations;
  }

  /**
   * Get goal-based recommendations
   */
  getGoalBasedRecommendations(goals) {
    const recommendations = [];

    if (goals.includes('increase-leads')) {
      recommendations.push({
        type: 'tactic',
        title: 'Lead Generation Campaigns',
        description: 'Set up targeted advertising campaigns to attract qualified leads',
        priority: 'high'
      });
    }

    if (goals.includes('improve-roi')) {
      recommendations.push({
        type: 'analytics',
        title: 'Marketing Attribution Setup',
        description: 'Implement proper tracking to measure marketing ROI accurately',
        priority: 'high'
      });
    }

    return recommendations;
  }

  /**
   * Get challenge-based recommendations
   */
  getChallengeBasedRecommendations(challenges) {
    const recommendations = [];

    if (challenges.includes('limited-budget')) {
      recommendations.push({
        type: 'strategy',
        title: 'Low-Cost Marketing Tactics',
        description: 'Focus on referral programs, social media, and content marketing',
        priority: 'high'
      });
    }

    if (challenges.includes('time-constraints')) {
      recommendations.push({
        type: 'tool',
        title: 'Marketing Automation Tools',
        description: 'Implement tools to automate repetitive marketing tasks',
        priority: 'high'
      });
    }

    return recommendations;
  }
}

export default UserProfileService;