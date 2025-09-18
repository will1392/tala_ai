-- Agency/Agent Credit System Enhancement
-- Adds support for team-based credit pools and plan types

-- Add plan_type to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS plan_type VARCHAR(20) DEFAULT 'agent' 
CHECK (plan_type IN ('agent', 'agency', 'enterprise'));

-- Add plan_type to user_credits table
ALTER TABLE user_credits 
ADD COLUMN IF NOT EXISTS plan_type VARCHAR(20) DEFAULT 'agent';

-- Organization Credits Table (for agency shared pools)
CREATE TABLE IF NOT EXISTS organization_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Credit balances
    total_credits INTEGER NOT NULL DEFAULT 10000, -- Agency: $10/month
    used_credits INTEGER NOT NULL DEFAULT 0,
    bonus_credits INTEGER NOT NULL DEFAULT 0,
    
    -- Plan details
    plan_type VARCHAR(20) DEFAULT 'agency',
    max_agents INTEGER DEFAULT 10, -- Max agents that can use this pool
    
    -- Billing cycle
    last_reset_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    billing_cycle VARCHAR(20) DEFAULT 'monthly',
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT positive_org_credits CHECK (total_credits >= 0),
    CONSTRAINT positive_org_used CHECK (used_credits >= 0),
    CONSTRAINT positive_org_bonus CHECK (bonus_credits >= 0),
    UNIQUE(organization_id)
);

-- Agency Members Table (track who's using agency credits)
CREATE TABLE IF NOT EXISTS agency_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Member details
    role VARCHAR(50) DEFAULT 'agent', -- agent, admin, owner
    added_by UUID REFERENCES users(id),
    added_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Usage tracking
    credits_used_this_period INTEGER DEFAULT 0,
    last_activity TIMESTAMPTZ,
    
    -- Status
    active BOOLEAN DEFAULT true,
    removed_at TIMESTAMPTZ,
    
    UNIQUE(organization_id, user_id),
    INDEX idx_agency_members_org (organization_id),
    INDEX idx_agency_members_user (user_id)
);

-- Plan Pricing Table
CREATE TABLE IF NOT EXISTS plan_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_type VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    monthly_credits INTEGER NOT NULL,
    price_cents INTEGER NOT NULL,
    features JSONB DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default plan pricing
INSERT INTO plan_pricing (plan_type, name, monthly_credits, price_cents, features) VALUES
    ('agent', 'Agent (Solo)', 5000, 0, '{"description": "Perfect for individual travel agents", "max_documents": 100, "support": "email"}'),
    ('agency', 'Agency (Team)', 10000, 0, '{"description": "Shared credits for your team", "max_agents": 10, "max_documents": 500, "support": "priority"}'),
    ('enterprise', 'Enterprise', 50000, 0, '{"description": "Custom solutions for large agencies", "max_agents": "unlimited", "max_documents": "unlimited", "support": "dedicated"}')
ON CONFLICT (plan_type) DO NOTHING;

-- Usage Summary View (for agency owners to see agent usage)
CREATE OR REPLACE VIEW agency_usage_summary AS
SELECT 
    am.organization_id,
    am.user_id,
    u.name as user_name,
    u.email as user_email,
    am.role,
    am.credits_used_this_period,
    am.last_activity,
    am.active
FROM agency_members am
JOIN users u ON u.id = am.user_id
WHERE am.active = true
ORDER BY am.credits_used_this_period DESC;

-- Function to consume credits (handles both individual and org pools)
CREATE OR REPLACE FUNCTION consume_credits(
    p_user_id UUID,
    p_credits INTEGER,
    p_operation VARCHAR
) RETURNS JSONB AS $$
DECLARE
    v_user_data RECORD;
    v_result JSONB;
    v_available_credits INTEGER;
BEGIN
    -- Get user data
    SELECT u.*, uc.*, oc.* 
    INTO v_user_data
    FROM users u
    LEFT JOIN user_credits uc ON uc.user_id = u.id
    LEFT JOIN organization_credits oc ON oc.organization_id = u.organization_id
    WHERE u.id = p_user_id;
    
    -- Determine which credit pool to use
    IF v_user_data.plan_type = 'agency' AND v_user_data.organization_id IS NOT NULL THEN
        -- Use organization pool
        v_available_credits := v_user_data.total_credits + v_user_data.bonus_credits - v_user_data.used_credits;
        
        IF v_available_credits >= p_credits THEN
            UPDATE organization_credits 
            SET used_credits = used_credits + p_credits
            WHERE organization_id = v_user_data.organization_id;
            
            -- Track individual usage within agency
            UPDATE agency_members
            SET credits_used_this_period = credits_used_this_period + p_credits,
                last_activity = NOW()
            WHERE user_id = p_user_id AND organization_id = v_user_data.organization_id;
            
            v_result := jsonb_build_object(
                'success', true,
                'credits_consumed', p_credits,
                'remaining_credits', v_available_credits - p_credits,
                'pool_type', 'organization'
            );
        ELSE
            v_result := jsonb_build_object(
                'success', false,
                'error', 'INSUFFICIENT_CREDITS',
                'available', v_available_credits,
                'required', p_credits,
                'pool_type', 'organization'
            );
        END IF;
    ELSE
        -- Use individual pool
        v_available_credits := COALESCE(v_user_data.total_credits, 0) + 
                              COALESCE(v_user_data.bonus_credits, 0) - 
                              COALESCE(v_user_data.used_credits, 0);
        
        IF v_available_credits >= p_credits THEN
            UPDATE user_credits 
            SET used_credits = used_credits + p_credits
            WHERE user_id = p_user_id;
            
            v_result := jsonb_build_object(
                'success', true,
                'credits_consumed', p_credits,
                'remaining_credits', v_available_credits - p_credits,
                'pool_type', 'individual'
            );
        ELSE
            v_result := jsonb_build_object(
                'success', false,
                'error', 'INSUFFICIENT_CREDITS',
                'available', v_available_credits,
                'required', p_credits,
                'pool_type', 'individual'
            );
        END IF;
    END IF;
    
    -- Log transaction if successful
    IF (v_result->>'success')::boolean THEN
        INSERT INTO credit_transactions (user_id, operation, credits, metadata)
        VALUES (p_user_id, p_operation, p_credits, v_result);
    END IF;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies
ALTER TABLE organization_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_members ENABLE ROW LEVEL SECURITY;

-- Organization credits visible to org members
CREATE POLICY organization_credits_policy ON organization_credits
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- Agency members visible to org members
CREATE POLICY agency_members_policy ON agency_members
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- Only agency admins can modify members
CREATE POLICY agency_members_modify_policy ON agency_members
    FOR INSERT, UPDATE, DELETE USING (
        organization_id IN (
            SELECT organization_id FROM users 
            WHERE id = auth.uid() 
            AND plan_type = 'agency'
            -- Add additional role check here if needed
        )
    );

-- Add trigger for updated_at
CREATE TRIGGER update_organization_credits_updated_at BEFORE UPDATE
    ON organization_credits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON organization_credits TO authenticated;
GRANT ALL ON agency_members TO authenticated;
GRANT SELECT ON agency_usage_summary TO authenticated;
GRANT SELECT ON plan_pricing TO authenticated;
GRANT EXECUTE ON FUNCTION consume_credits TO authenticated;