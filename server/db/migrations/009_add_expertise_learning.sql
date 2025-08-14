-- Create expertise interactions table
CREATE TABLE IF NOT EXISTS expertise_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  comprehension_level VARCHAR(20) CHECK (comprehension_level IN ('confused', 'neutral', 'understood', 'advanced')),
  confusion_score DECIMAL(3,2) CHECK (confusion_score >= 0 AND confusion_score <= 1),
  mastery_score DECIMAL(3,2) CHECK (mastery_score >= 0 AND mastery_score <= 1),
  success_score DECIMAL(3,2) CHECK (success_score >= 0 AND success_score <= 1),
  topic_area VARCHAR(50),
  interaction_type VARCHAR(30),
  response_complexity JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create expertise adjustments table
CREATE TABLE IF NOT EXISTS expertise_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  previous_level VARCHAR(20),
  new_level VARCHAR(20),
  reason TEXT,
  confidence DECIMAL(3,2),
  metrics JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_by VARCHAR(20) DEFAULT 'system' -- 'system', 'user', 'admin'
);

-- Add indexes for performance
CREATE INDEX idx_expertise_interactions_user_timestamp 
  ON expertise_interactions(user_id, timestamp DESC);

CREATE INDEX idx_expertise_interactions_user_topic 
  ON expertise_interactions(user_id, topic_area);

CREATE INDEX idx_expertise_adjustments_user 
  ON expertise_adjustments(user_id, timestamp DESC);

-- Add expertise adjustment date to users table
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS expertise_adjustment_date TIMESTAMPTZ;

-- Create view for user expertise analytics
CREATE OR REPLACE VIEW user_expertise_analytics AS
SELECT 
  u.id as user_id,
  u.marketing_expertise_level as current_level,
  u.expertise_assessment_date,
  u.expertise_adjustment_date,
  COUNT(DISTINCT ei.id) as total_interactions,
  AVG(ei.confusion_score) as avg_confusion,
  AVG(ei.mastery_score) as avg_mastery,
  AVG(ei.success_score) as avg_success,
  COUNT(DISTINCT ei.topic_area) as topics_engaged,
  COUNT(DISTINCT ea.id) as total_adjustments,
  MAX(ea.timestamp) as last_adjustment
FROM users u
LEFT JOIN expertise_interactions ei ON u.id = ei.user_id
  AND ei.timestamp > NOW() - INTERVAL '30 days'
LEFT JOIN expertise_adjustments ea ON u.id = ea.user_id
WHERE u.marketing_expertise_level IS NOT NULL
GROUP BY u.id, u.marketing_expertise_level, u.expertise_assessment_date, u.expertise_adjustment_date;