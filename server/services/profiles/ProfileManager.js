/**
 * Profile Manager - Mock Implementation
 * 
 * Manages user profiles and preferences
 */

export class ProfileManager {
  constructor(options = {}) {
    this.options = options;
    this.profiles = new Map();
    this.initialized = false;
  }
  
  async initialize() {
    this.initialized = true;
    console.log('👤 Profile Manager initialized (mock)');
  }
  
  async createProfile(userId, profileData) {
    const profile = {
      id: userId,
      userId,
      preferences: {
        responseStyle: 'balanced',
        memoryThreshold: 0.5,
        outputFormat: 'text',
        detailed: false,
        includeContext: true,
        ...profileData.preferences
      },
      expertise: profileData.expertise || [],
      metadata: profileData.metadata || {},
      created: new Date(),
      updated: new Date()
    };
    
    this.profiles.set(userId, profile);
    return profile;
  }
  
  async getProfile(userId) {
    let profile = this.profiles.get(userId);
    
    if (!profile) {
      // Create default profile
      profile = await this.createProfile(userId, {
        preferences: {
          responseStyle: 'balanced',
          memoryThreshold: 0.5,
          outputFormat: 'text'
        }
      });
    }
    
    return profile;
  }
  
  async updateProfile(userId, updates) {
    const profile = await this.getProfile(userId);
    
    if (updates.preferences) {
      Object.assign(profile.preferences, updates.preferences);
    }
    
    if (updates.expertise) {
      profile.expertise = updates.expertise;
    }
    
    if (updates.metadata) {
      Object.assign(profile.metadata, updates.metadata);
    }
    
    profile.updated = new Date();
    this.profiles.set(userId, profile);
    
    return profile;
  }
  
  async updateActivity(userId, activity) {
    const profile = await this.getProfile(userId);
    
    if (!profile.metadata.activities) {
      profile.metadata.activities = [];
    }
    
    profile.metadata.activities.push(activity);
    
    // Keep only last 100 activities
    if (profile.metadata.activities.length > 100) {
      profile.metadata.activities = profile.metadata.activities.slice(-100);
    }
    
    profile.updated = new Date();
    this.profiles.set(userId, profile);
  }
  
  async updateFromFeedback(userId, feedback) {
    const profile = await this.getProfile(userId);
    
    if (!profile.metadata.feedback) {
      profile.metadata.feedback = [];
    }
    
    profile.metadata.feedback.push(feedback);
    
    // Adjust preferences based on feedback patterns
    if (feedback.rating >= 4) {
      // Positive feedback - no changes needed
    } else if (feedback.rating <= 2) {
      // Negative feedback - might adjust response style
      if (feedback.comment?.includes('too long')) {
        profile.preferences.responseStyle = 'concise';
      } else if (feedback.comment?.includes('too short')) {
        profile.preferences.responseStyle = 'detailed';
      }
    }
    
    profile.updated = new Date();
    this.profiles.set(userId, profile);
  }
  
  async shutdown() {
    this.initialized = false;
    console.log('🛑 Profile Manager shut down');
  }
}

export default ProfileManager;