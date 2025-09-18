-- Credit System Schema for Tala AI
-- This migration creates all necessary tables for the credit system

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user_credits table
CREATE TABLE IF NOT EXISTS user_credits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL UNIQUE,
  organization_id VARCHAR(255),
  total_credits INTEGER NOT NULL DEFAULT 5000,
  used_credits INTEGER NOT NULL DEFAULT 0,
  bonus_credits INTEGER NOT NULL DEFAULT 0,
  plan_type VARCHAR(50) NOT NULL DEFAULT 'agent',
  last_reset_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT check_credits_non_negative CHECK (
    total_credits >= 0 AND 
    used_credits >= 0 AND 
    bonus_credits >= 0
  ),
  CONSTRAINT check_plan_type CHECK (
    plan_type IN ('agent', 'agency', 'enterprise')
  )
);

-- Create organization_credits table
CREATE TABLE IF NOT EXISTS organization_credits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL UNIQUE,
  total_credits INTEGER NOT NULL DEFAULT 10000,
  used_credits INTEGER NOT NULL DEFAULT 0,
  bonus_credits INTEGER NOT NULL DEFAULT 0,
  plan_type VARCHAR(50) NOT NULL DEFAULT 'agency',
  last_reset_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT check_org_credits_non_negative CHECK (
    total_credits >= 0 AND 
    used_credits >= 0 AND 
    bonus_credits >= 0
  ),
  CONSTRAINT check_org_plan_type CHECK (
    plan_type IN ('agency', 'enterprise')
  )
);

-- Create credit_transactions table
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  operation VARCHAR(100) NOT NULL,
  credits INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Index for faster queries
  INDEX idx_credit_transactions_user_date (user_id, created_at DESC),
  INDEX idx_credit_transactions_operation (operation)
);

-- Create agency_members table
CREATE TABLE IF NOT EXISTS agency_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  added_by VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'agent',
  credits_used_this_period INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  last_activity TIMESTAMP WITH TIME ZONE,
  removed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicate memberships
  UNIQUE(organization_id, user_id),
  
  -- Role constraint
  CONSTRAINT check_member_role CHECK (
    role IN ('agent', 'admin', 'owner')
  )
);

-- Create plan_pricing table
CREATE TABLE IF NOT EXISTS plan_pricing (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  plan_type VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  monthly_credits INTEGER NOT NULL,
  monthly_price_cents INTEGER NOT NULL,
  max_users INTEGER NOT NULL DEFAULT 1,
  features JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT check_plan_pricing CHECK (
    monthly_credits > 0 AND
    monthly_price_cents >= 0 AND
    max_users > 0
  )
);

-- Insert default pricing plans
INSERT INTO plan_pricing (plan_type, name, monthly_credits, monthly_price_cents, max_users, features) VALUES
  ('agent', 'Agent (Solo)', 5000, 999, 1, '{"individual_pool": true, "basic_support": true}'),
  ('agency', 'Agency (Team)', 10000, 2999, 10, '{"shared_pool": true, "team_management": true, "priority_support": true}'),
  ('enterprise', 'Enterprise', 50000, 9999, 100, '{"shared_pool": true, "team_management": true, "dedicated_support": true, "custom_features": true}')
ON CONFLICT (plan_type) DO NOTHING;

-- Create view for agency usage summary
CREATE OR REPLACE VIEW agency_usage_summary AS
SELECT 
  am.organization_id,
  am.user_id,
  am.role,
  am.credits_used_this_period,
  am.active,
  am.last_activity,
  u.email as user_email,
  u.name as user_name,
  oc.total_credits as org_total_credits,
  oc.used_credits as org_used_credits,
  oc.bonus_credits as org_bonus_credits,
  (oc.total_credits + oc.bonus_credits - oc.used_credits) as org_available_credits
FROM agency_members am
LEFT JOIN users u ON am.user_id = u.id
LEFT JOIN organization_credits oc ON am.organization_id = oc.organization_id
WHERE am.active = TRUE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_credits_org_id ON user_credits(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_credits_org_id ON organization_credits(organization_id);
CREATE INDEX IF NOT EXISTS idx_agency_members_org_id ON agency_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_agency_members_user_id ON agency_members(user_id);

-- Create update trigger for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
CREATE TRIGGER update_user_credits_updated_at 
  BEFORE UPDATE ON user_credits 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_credits_updated_at 
  BEFORE UPDATE ON organization_credits 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agency_members_updated_at 
  BEFORE UPDATE ON agency_members 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plan_pricing_updated_at 
  BEFORE UPDATE ON plan_pricing 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (adjust based on your Supabase setup)
GRANT ALL ON user_credits TO authenticated;
GRANT ALL ON organization_credits TO authenticated;
GRANT ALL ON credit_transactions TO authenticated;
GRANT ALL ON agency_members TO authenticated;
GRANT SELECT ON plan_pricing TO authenticated;
GRANT SELECT ON agency_usage_summary TO authenticated;

-- Row Level Security (RLS) policies
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_members ENABLE ROW LEVEL SECURITY;

-- User credits policy: users can only see/update their own credits
CREATE POLICY user_credits_policy ON user_credits
  FOR ALL USING (auth.uid()::text = user_id);

-- Organization credits policy: only organization members can view
CREATE POLICY org_credits_view_policy ON organization_credits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM agency_members 
      WHERE agency_members.organization_id = organization_credits.organization_id 
      AND agency_members.user_id = auth.uid()::text
      AND agency_members.active = TRUE
    )
  );

-- Credit transactions policy: users can only see their own transactions
CREATE POLICY credit_transactions_policy ON credit_transactions
  FOR SELECT USING (auth.uid()::text = user_id);

-- Agency members policy: members can see their organization's members
CREATE POLICY agency_members_policy ON agency_members
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM agency_members 
      WHERE user_id = auth.uid()::text AND active = TRUE
    )
  );

-- Add comment to tables
COMMENT ON TABLE user_credits IS 'Stores individual user credit allocations and usage';
COMMENT ON TABLE organization_credits IS 'Stores organization-wide credit pools for agencies';
COMMENT ON TABLE credit_transactions IS 'Logs all credit consumption and purchase transactions';
COMMENT ON TABLE agency_members IS 'Manages agency membership and individual usage within organizations';
COMMENT ON TABLE plan_pricing IS 'Defines available subscription plans and their credit allocations';