-- Marketing Profiles Storage Schema
-- Stores complete marketing assessment and growth tracking data

-- Main marketing profiles table
CREATE TABLE IF NOT EXISTS marketing_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  
  -- Core profile data
  skill_level VARCHAR(50) NOT NULL DEFAULT 'new',
  business_stage VARCHAR(50),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_check_in TIMESTAMP WITH TIME ZONE,
  next_check_in_due TIMESTAMP WITH TIME ZONE,
  
  -- Unique constraint
  UNIQUE(brand_id, user_id)
);

-- Assessment results table
CREATE TABLE IF NOT EXISTS marketing_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES marketing_profiles(id) ON DELETE CASCADE,
  
  -- Assessment data
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  
  -- Category scores (stored as JSONB for flexibility)
  buckets JSONB NOT NULL DEFAULT '{}',
  
  -- Raw assessment data
  inputs JSONB NOT NULL DEFAULT '[]',
  signals JSONB DEFAULT '[]',
  
  -- Metadata
  assessment_version VARCHAR(20) DEFAULT '1.0',
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  time_to_complete INTEGER, -- seconds
  
  -- Index for profile lookups
  INDEX idx_assessment_profile (profile_id)
);

-- Goals table
CREATE TABLE IF NOT EXISTS marketing_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES marketing_profiles(id) ON DELETE CASCADE,
  
  -- Goal details
  metric VARCHAR(255) NOT NULL,
  description TEXT,
  target DECIMAL(12,2) NOT NULL,
  current_value DECIMAL(12,2) DEFAULT 0,
  baseline DECIMAL(12,2),
  unit VARCHAR(50) NOT NULL,
  
  -- Status and priority
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  
  -- Ownership and category
  owner VARCHAR(20) DEFAULT 'user',
  category VARCHAR(50),
  business_stage VARCHAR(50),
  
  -- Tracking
  trend VARCHAR(20) CHECK (trend IN ('up', 'down', 'stable')),
  confidence DECIMAL(3,2),
  
  -- Dates
  deadline DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Relationships
  source VARCHAR(50), -- 'assessment', 'manual', 'check-in'
  adjustment_reason TEXT,
  
  -- Index for profile and status lookups
  INDEX idx_goals_profile_status (profile_id, status)
);

-- Goal milestones table
CREATE TABLE IF NOT EXISTS goal_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID REFERENCES marketing_goals(id) ON DELETE CASCADE,
  
  label VARCHAR(255) NOT NULL,
  value DECIMAL(12,2) NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  sequence_order INTEGER NOT NULL,
  
  INDEX idx_milestones_goal (goal_id)
);

-- Growth plan table
CREATE TABLE IF NOT EXISTS growth_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES marketing_profiles(id) ON DELETE CASCADE,
  
  -- Plan metadata
  current_phase VARCHAR(100),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  estimated_completion TIMESTAMP WITH TIME ZONE,
  
  -- Plan data (stored as JSONB for complex structure)
  phases JSONB NOT NULL DEFAULT '[]',
  
  -- Version tracking
  plan_version VARCHAR(20) DEFAULT '1.0',
  generated_from VARCHAR(50), -- 'assessment', 'check-in', 'manual'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- One active plan per profile
  is_active BOOLEAN DEFAULT TRUE,
  
  INDEX idx_growth_plan_profile (profile_id, is_active)
);

-- Evidence tracking table
CREATE TABLE IF NOT EXISTS marketing_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES marketing_profiles(id) ON DELETE CASCADE,
  
  -- Evidence details
  source VARCHAR(100) NOT NULL,
  key VARCHAR(255) NOT NULL,
  data JSONB NOT NULL,
  
  -- Verification
  verified BOOLEAN DEFAULT FALSE,
  confidence DECIMAL(3,2),
  
  -- Timestamps
  collected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Relationships
  related_goals UUID[],
  
  INDEX idx_evidence_profile (profile_id),
  INDEX idx_evidence_key (key)
);

-- Quarterly check-ins table
CREATE TABLE IF NOT EXISTS marketing_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES marketing_profiles(id) ON DELETE CASCADE,
  
  -- Check-in number and timing
  quarter_number INTEGER NOT NULL,
  check_in_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  days_since_last INTEGER,
  
  -- Metrics at time of check-in
  metrics JSONB NOT NULL DEFAULT '{}',
  
  -- Questions and answers
  questions JSONB NOT NULL DEFAULT '[]',
  answers JSONB NOT NULL DEFAULT '{}',
  
  -- Analysis
  performance_trend VARCHAR(20),
  insights JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  
  -- Goal adjustments made
  goals_adjusted INTEGER DEFAULT 0,
  adjustment_summary JSONB,
  
  INDEX idx_check_ins_profile (profile_id, check_in_date DESC)
);

-- Historical snapshots table (for tracking changes over time)
CREATE TABLE IF NOT EXISTS marketing_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES marketing_profiles(id) ON DELETE CASCADE,
  
  -- Snapshot type
  snapshot_type VARCHAR(50) NOT NULL, -- 'assessment', 'check-in', 'manual'
  snapshot_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Complete profile state at this point
  profile_data JSONB NOT NULL,
  
  -- Reason for snapshot
  reason TEXT,
  
  INDEX idx_snapshots_profile (profile_id, snapshot_date DESC)
);

-- Progress tracking table (for detailed analytics)
CREATE TABLE IF NOT EXISTS marketing_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES marketing_profiles(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES marketing_goals(id) ON DELETE CASCADE,
  
  -- Progress entry
  date DATE NOT NULL,
  value DECIMAL(12,2) NOT NULL,
  
  -- Context
  source VARCHAR(50), -- 'manual', 'integration', 'check-in'
  notes TEXT,
  
  INDEX idx_progress_goal_date (goal_id, date DESC),
  UNIQUE(goal_id, date)
);

-- Create update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger to relevant tables
CREATE TRIGGER update_marketing_profiles_updated_at 
  BEFORE UPDATE ON marketing_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketing_goals_updated_at 
  BEFORE UPDATE ON marketing_goals 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_growth_plans_updated_at 
  BEFORE UPDATE ON growth_plans 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security policies
ALTER TABLE marketing_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_progress ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (users can only access their own data)
CREATE POLICY "Users can view own marketing profiles"
  ON marketing_profiles FOR SELECT
  USING (user_id = current_user_id());

CREATE POLICY "Users can update own marketing profiles"
  ON marketing_profiles FOR UPDATE
  USING (user_id = current_user_id());

CREATE POLICY "Users can insert own marketing profiles"
  ON marketing_profiles FOR INSERT
  WITH CHECK (user_id = current_user_id());

-- Similar policies for other tables...
-- (In production, you'd create these for each table)

-- Indexes for performance
CREATE INDEX idx_profiles_user_brand ON marketing_profiles(user_id, brand_id);
CREATE INDEX idx_goals_deadline ON marketing_goals(deadline) WHERE status = 'active';
CREATE INDEX idx_evidence_expires ON marketing_evidence(expires_at) WHERE verified = true;

-- Create view for current active goals
CREATE OR REPLACE VIEW active_marketing_goals AS
SELECT 
  g.*,
  p.skill_level,
  p.business_stage,
  COUNT(m.id) as milestone_count,
  COUNT(m.id) FILTER (WHERE m.completed = true) as completed_milestones
FROM marketing_goals g
JOIN marketing_profiles p ON g.profile_id = p.id
LEFT JOIN goal_milestones m ON m.goal_id = g.id
WHERE g.status = 'active'
GROUP BY g.id, p.skill_level, p.business_stage;

-- Create materialized view for analytics dashboard
CREATE MATERIALIZED VIEW marketing_analytics AS
SELECT 
  p.id as profile_id,
  p.brand_id,
  p.skill_level,
  p.business_stage,
  a.score as assessment_score,
  COUNT(DISTINCT g.id) as total_goals,
  COUNT(DISTINCT g.id) FILTER (WHERE g.status = 'completed') as completed_goals,
  AVG(CASE WHEN g.target > 0 THEN (g.current_value / g.target * 100) ELSE 0 END) as avg_goal_progress,
  COUNT(DISTINCT c.id) as check_in_count,
  MAX(c.check_in_date) as last_check_in
FROM marketing_profiles p
LEFT JOIN marketing_assessments a ON a.profile_id = p.id
LEFT JOIN marketing_goals g ON g.profile_id = p.id
LEFT JOIN marketing_check_ins c ON c.profile_id = p.id
GROUP BY p.id, p.brand_id, p.skill_level, p.business_stage, a.score;

-- Refresh materialized view periodically
CREATE OR REPLACE FUNCTION refresh_marketing_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY marketing_analytics;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE marketing_profiles IS 'Core marketing profile for each brand/user combination';
COMMENT ON TABLE marketing_assessments IS 'Marketing maturity assessment results';
COMMENT ON TABLE marketing_goals IS 'SMART marketing goals with progress tracking';
COMMENT ON TABLE growth_plans IS 'Phased growth plans based on skill level';
COMMENT ON TABLE marketing_evidence IS 'Evidence from integrations supporting goals';
COMMENT ON TABLE marketing_check_ins IS 'Quarterly progress check-ins and adjustments';
COMMENT ON TABLE marketing_snapshots IS 'Historical snapshots for long-term tracking';
COMMENT ON COLUMN marketing_profiles.skill_level IS 'new, intermediate, advanced, or expert';
COMMENT ON COLUMN marketing_goals.source IS 'Where the goal originated: assessment, manual, or check-in';