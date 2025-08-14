-- Add expertise assessment fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_expertise_level 
  VARCHAR(20) CHECK (marketing_expertise_level IN ('beginner', 'intermediate', 'advanced', 'expert')) 
  DEFAULT 'beginner';

ALTER TABLE users ADD COLUMN IF NOT EXISTS expertise_assessment_date TIMESTAMP;

ALTER TABLE users ADD COLUMN IF NOT EXISTS expertise_areas JSONB DEFAULT '{}';

ALTER TABLE users ADD COLUMN IF NOT EXISTS communication_preferences JSONB DEFAULT '{}';

-- Create expertise assessment history table
CREATE TABLE IF NOT EXISTS expertise_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  assessment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assessment_type VARCHAR(50), -- 'initial', 'periodic', 'requested'
  questions JSONB,
  answers JSONB,
  computed_level VARCHAR(20),
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  areas_assessed JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX idx_expertise_assessments_user_id ON expertise_assessments(user_id);
CREATE INDEX idx_users_expertise_level ON users(marketing_expertise_level);