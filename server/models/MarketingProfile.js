/**
 * Marketing Profile Model
 * Stores user marketing profiles, assessments, and growth plans
 */

class MarketingProfile {
  constructor(db) {
    this.db = db;
    this.tableName = 'marketing_profiles';
    this.initializeTable();
  }

  async initializeTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id VARCHAR(255) PRIMARY KEY,
        brand_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        skill_level VARCHAR(50) DEFAULT 'new',
        assessment_score INTEGER DEFAULT 0,
        assessment_data JSON,
        goals JSON,
        growth_plan JSON,
        evidence JSON,
        integrations JSON,
        campaigns JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_brand_user (brand_id, user_id),
        INDEX idx_user (user_id),
        INDEX idx_brand (brand_id),
        INDEX idx_skill_level (skill_level)
      )
    `;

    try {
      await this.db.query(createTableQuery);
      console.log('Marketing profiles table initialized');
    } catch (error) {
      console.error('Error creating marketing profiles table:', error);
    }
  }

  /**
   * Create or update a marketing profile
   */
  async upsertProfile(profileData) {
    const {
      brandId,
      userId,
      skillLevel,
      assessment,
      goals,
      growthPlan,
      evidence,
      integrations,
      campaigns
    } = profileData;

    const id = `${brandId}_${userId}`;
    
    const query = `
      INSERT INTO ${this.tableName} (
        id, brand_id, user_id, skill_level, 
        assessment_score, assessment_data, 
        goals, growth_plan, evidence, 
        integrations, campaigns, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        skill_level = VALUES(skill_level),
        assessment_score = VALUES(assessment_score),
        assessment_data = VALUES(assessment_data),
        goals = VALUES(goals),
        growth_plan = VALUES(growth_plan),
        evidence = VALUES(evidence),
        integrations = VALUES(integrations),
        campaigns = VALUES(campaigns),
        updated_at = NOW()
    `;

    const values = [
      id,
      brandId,
      userId,
      skillLevel || 'new',
      assessment?.score || 0,
      JSON.stringify(assessment || {}),
      JSON.stringify(goals || []),
      JSON.stringify(growthPlan || {}),
      JSON.stringify(evidence || []),
      JSON.stringify(integrations || []),
      JSON.stringify(campaigns || [])
    ];

    try {
      await this.db.query(query, values);
      return { success: true, id };
    } catch (error) {
      console.error('Error upserting marketing profile:', error);
      throw error;
    }
  }

  /**
   * Get a marketing profile by brand and user
   */
  async getProfile(brandId, userId) {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE brand_id = ? AND user_id = ?
    `;

    try {
      const [rows] = await this.db.query(query, [brandId, userId]);
      if (rows.length === 0) return null;

      const profile = rows[0];
      return this.parseProfile(profile);
    } catch (error) {
      console.error('Error fetching marketing profile:', error);
      throw error;
    }
  }

  /**
   * Get all profiles for a user
   */
  async getUserProfiles(userId) {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE user_id = ?
      ORDER BY updated_at DESC
    `;

    try {
      const [rows] = await this.db.query(query, [userId]);
      return rows.map(row => this.parseProfile(row));
    } catch (error) {
      console.error('Error fetching user profiles:', error);
      throw error;
    }
  }

  /**
   * Update assessment results
   */
  async updateAssessment(brandId, userId, assessmentData) {
    const { score, buckets, inputs, signals, confidence } = assessmentData;
    
    // Calculate skill level based on score
    let skillLevel = 'new';
    if (score >= 75) skillLevel = 'expert';
    else if (score >= 50) skillLevel = 'advanced';
    else if (score >= 25) skillLevel = 'intermediate';

    const query = `
      UPDATE ${this.tableName}
      SET 
        skill_level = ?,
        assessment_score = ?,
        assessment_data = ?,
        updated_at = NOW()
      WHERE brand_id = ? AND user_id = ?
    `;

    const values = [
      skillLevel,
      score,
      JSON.stringify({
        score,
        buckets,
        inputs,
        signals,
        confidence,
        completedAt: new Date().toISOString()
      }),
      brandId,
      userId
    ];

    try {
      await this.db.query(query, values);
      return { success: true, skillLevel };
    } catch (error) {
      console.error('Error updating assessment:', error);
      throw error;
    }
  }

  /**
   * Add or update a goal
   */
  async upsertGoal(brandId, userId, goal) {
    const profile = await this.getProfile(brandId, userId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    const goals = profile.goals || [];
    const existingIndex = goals.findIndex(g => g.id === goal.id);
    
    if (existingIndex >= 0) {
      goals[existingIndex] = { ...goals[existingIndex], ...goal };
    } else {
      goals.push(goal);
    }

    const query = `
      UPDATE ${this.tableName}
      SET goals = ?, updated_at = NOW()
      WHERE brand_id = ? AND user_id = ?
    `;

    try {
      await this.db.query(query, [JSON.stringify(goals), brandId, userId]);
      return { success: true, goals };
    } catch (error) {
      console.error('Error updating goals:', error);
      throw error;
    }
  }

  /**
   * Update goal progress
   */
  async updateGoalProgress(brandId, userId, goalId, progress) {
    const profile = await this.getProfile(brandId, userId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    const goals = profile.goals || [];
    const goalIndex = goals.findIndex(g => g.id === goalId);
    
    if (goalIndex === -1) {
      throw new Error('Goal not found');
    }

    goals[goalIndex].progress = {
      current: progress.current,
      lastUpdated: new Date().toISOString(),
      trend: progress.trend,
      milestones: progress.milestones
    };

    const query = `
      UPDATE ${this.tableName}
      SET goals = ?, updated_at = NOW()
      WHERE brand_id = ? AND user_id = ?
    `;

    try {
      await this.db.query(query, [JSON.stringify(goals), brandId, userId]);
      return { success: true, goal: goals[goalIndex] };
    } catch (error) {
      console.error('Error updating goal progress:', error);
      throw error;
    }
  }

  /**
   * Update growth plan
   */
  async updateGrowthPlan(brandId, userId, growthPlan) {
    const query = `
      UPDATE ${this.tableName}
      SET growth_plan = ?, updated_at = NOW()
      WHERE brand_id = ? AND user_id = ?
    `;

    try {
      await this.db.query(query, [JSON.stringify(growthPlan), brandId, userId]);
      return { success: true };
    } catch (error) {
      console.error('Error updating growth plan:', error);
      throw error;
    }
  }

  /**
   * Update step status in growth plan
   */
  async updateStepStatus(brandId, userId, phaseId, stepId, status, metadata = {}) {
    const profile = await this.getProfile(brandId, userId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    const growthPlan = profile.growthPlan || { phases: [] };
    const phase = growthPlan.phases.find(p => p.id === phaseId);
    
    if (!phase) {
      throw new Error('Phase not found');
    }

    const step = phase.steps.find(s => s.id === stepId);
    if (!step) {
      throw new Error('Step not found');
    }

    step.status = status;
    if (status === 'done') {
      step.completedAt = new Date().toISOString();
      step.completedBy = metadata.completedBy || 'user';
    } else if (status === 'blocked') {
      step.blockReason = metadata.blockReason;
    }

    return this.updateGrowthPlan(brandId, userId, growthPlan);
  }

  /**
   * Add evidence item
   */
  async addEvidence(brandId, userId, evidenceItem) {
    const profile = await this.getProfile(brandId, userId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    const evidence = profile.evidence || [];
    evidence.push({
      ...evidenceItem,
      addedAt: new Date().toISOString()
    });

    const query = `
      UPDATE ${this.tableName}
      SET evidence = ?, updated_at = NOW()
      WHERE brand_id = ? AND user_id = ?
    `;

    try {
      await this.db.query(query, [JSON.stringify(evidence), brandId, userId]);
      return { success: true };
    } catch (error) {
      console.error('Error adding evidence:', error);
      throw error;
    }
  }

  /**
   * Update integration status
   */
  async updateIntegration(brandId, userId, integration) {
    const profile = await this.getProfile(brandId, userId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    const integrations = profile.integrations || [];
    const existingIndex = integrations.findIndex(i => i.platform === integration.platform);
    
    if (existingIndex >= 0) {
      integrations[existingIndex] = { ...integrations[existingIndex], ...integration };
    } else {
      integrations.push(integration);
    }

    const query = `
      UPDATE ${this.tableName}
      SET integrations = ?, updated_at = NOW()
      WHERE brand_id = ? AND user_id = ?
    `;

    try {
      await this.db.query(query, [JSON.stringify(integrations), brandId, userId]);
      return { success: true };
    } catch (error) {
      console.error('Error updating integration:', error);
      throw error;
    }
  }

  /**
   * Parse database row to profile object
   */
  parseProfile(row) {
    return {
      id: row.id,
      brandId: row.brand_id,
      userId: row.user_id,
      skillLevel: row.skill_level,
      assessment: this.parseJSON(row.assessment_data),
      goals: this.parseJSON(row.goals),
      growthPlan: this.parseJSON(row.growth_plan),
      evidence: this.parseJSON(row.evidence),
      integrations: this.parseJSON(row.integrations),
      campaigns: this.parseJSON(row.campaigns),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Safely parse JSON
   */
  parseJSON(data) {
    if (!data) return null;
    if (typeof data === 'object') return data;
    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('Error parsing JSON:', error);
      return null;
    }
  }
}

module.exports = MarketingProfile;