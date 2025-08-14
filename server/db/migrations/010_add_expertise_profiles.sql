-- Create user expertise profiles table
CREATE TABLE IF NOT EXISTS user_expertise_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profile_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one profile per user
  UNIQUE(user_id)
);

-- Create indexes for performance
CREATE INDEX idx_user_expertise_profiles_user_id 
  ON user_expertise_profiles(user_id);

CREATE INDEX idx_user_expertise_profiles_updated 
  ON user_expertise_profiles(updated_at DESC);

-- Create GIN index for JSONB queries
CREATE INDEX idx_user_expertise_profiles_data 
  ON user_expertise_profiles USING GIN (profile_data);

-- Create view for expertise analytics
CREATE OR REPLACE VIEW expertise_profile_analytics AS
SELECT 
  uep.user_id,
  u.email,
  u.marketing_expertise_level as overall_level,
  (uep.profile_data->>'preferred_learning_style') as learning_style,
  (uep.profile_data->>'technical_comfort')::decimal as technical_comfort,
  (uep.profile_data->>'learning_pace') as learning_pace,
  (uep.profile_data->>'detail_preference') as detail_preference,
  jsonb_array_length(COALESCE(uep.profile_data->'industry_experience', '[]'::jsonb)) as industry_count,
  jsonb_array_length(COALESCE(uep.profile_data->'tools_familiar', '[]'::jsonb)) as tools_count,
  jsonb_array_length(COALESCE(uep.profile_data->'goals', '[]'::jsonb)) as goals_count,
  
  -- Channel expertise levels
  (uep.profile_data->'channel_expertise'->'seo'->>'level')::decimal as seo_level,
  (uep.profile_data->'channel_expertise'->'email'->>'level')::decimal as email_level,
  (uep.profile_data->'channel_expertise'->'social'->>'level')::decimal as social_level,
  (uep.profile_data->'channel_expertise'->'ppc'->>'level')::decimal as ppc_level,
  (uep.profile_data->'channel_expertise'->'content'->>'level')::decimal as content_level,
  (uep.profile_data->'channel_expertise'->'analytics'->>'level')::decimal as analytics_level,
  (uep.profile_data->'channel_expertise'->'cro'->>'level')::decimal as cro_level,
  
  -- Channel confidence scores
  (uep.profile_data->'channel_expertise'->'seo'->>'confidence')::decimal as seo_confidence,
  (uep.profile_data->'channel_expertise'->'email'->>'confidence')::decimal as email_confidence,
  (uep.profile_data->'channel_expertise'->'social'->>'confidence')::decimal as social_confidence,
  (uep.profile_data->'channel_expertise'->'ppc'->>'confidence')::decimal as ppc_confidence,
  (uep.profile_data->'channel_expertise'->'content'->>'confidence')::decimal as content_confidence,
  (uep.profile_data->'channel_expertise'->'analytics'->>'confidence')::decimal as analytics_confidence,
  (uep.profile_data->'channel_expertise'->'cro'->>'confidence')::decimal as cro_confidence,
  
  uep.created_at as profile_created,
  uep.updated_at as profile_updated
FROM user_expertise_profiles uep
JOIN users u ON uep.user_id = u.id;

-- Function to update channel expertise
CREATE OR REPLACE FUNCTION update_channel_expertise(
  p_user_id UUID,
  p_channel VARCHAR,
  p_level_change DECIMAL DEFAULT 0,
  p_confidence_change DECIMAL DEFAULT 0
) RETURNS BOOLEAN AS $$
DECLARE
  current_profile JSONB;
  updated_profile JSONB;
  channel_data JSONB;
  new_level DECIMAL;
  new_confidence DECIMAL;
BEGIN
  -- Get current profile
  SELECT profile_data INTO current_profile
  FROM user_expertise_profiles
  WHERE user_id = p_user_id;
  
  IF current_profile IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get current channel data
  channel_data := current_profile->'channel_expertise'->p_channel;
  
  IF channel_data IS NULL THEN
    -- Initialize channel if not exists
    channel_data := jsonb_build_object(
      'level', 1,
      'confidence', 0.5,
      'last_interaction', NOW()
    );
  END IF;
  
  -- Calculate new values
  new_level := GREATEST(1, LEAST(4, 
    (channel_data->>'level')::decimal + p_level_change
  ));
  
  new_confidence := GREATEST(0.1, LEAST(0.95,
    (channel_data->>'confidence')::decimal + p_confidence_change
  ));
  
  -- Update channel data
  channel_data := jsonb_set(channel_data, '{level}', to_jsonb(new_level));
  channel_data := jsonb_set(channel_data, '{confidence}', to_jsonb(new_confidence));
  channel_data := jsonb_set(channel_data, '{last_interaction}', to_jsonb(NOW()));
  
  -- Update profile
  updated_profile := jsonb_set(
    current_profile,
    ARRAY['channel_expertise', p_channel],
    channel_data
  );
  
  -- Save updated profile
  UPDATE user_expertise_profiles
  SET profile_data = updated_profile,
      updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to get channel expertise summary
CREATE OR REPLACE FUNCTION get_channel_expertise_summary(p_user_id UUID)
RETURNS TABLE(
  channel VARCHAR,
  level DECIMAL,
  confidence DECIMAL,
  last_interaction TIMESTAMPTZ,
  strength_score DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    channel_info.key as channel,
    (channel_info.value->>'level')::decimal as level,
    (channel_info.value->>'confidence')::decimal as confidence,
    (channel_info.value->>'last_interaction')::timestamptz as last_interaction,
    ((channel_info.value->>'level')::decimal * (channel_info.value->>'confidence')::decimal) as strength_score
  FROM user_expertise_profiles uep,
       jsonb_each(uep.profile_data->'channel_expertise') as channel_info
  WHERE uep.user_id = p_user_id
  ORDER BY strength_score DESC;
END;
$$ LANGUAGE plpgsql;