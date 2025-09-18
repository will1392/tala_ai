-- Credit System Tables
-- Migration: Add credit system for usage tracking and billing

-- User Credits Table
CREATE TABLE IF NOT EXISTS user_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Credit balances
    total_credits INTEGER NOT NULL DEFAULT 10000, -- Monthly allocation + purchased
    used_credits INTEGER NOT NULL DEFAULT 0,      -- Credits consumed this month
    bonus_credits INTEGER NOT NULL DEFAULT 0,     -- Promotional/referral credits
    
    -- Billing cycle
    last_reset_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    billing_cycle VARCHAR(20) DEFAULT 'monthly',
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT positive_credits CHECK (total_credits >= 0),
    CONSTRAINT positive_used CHECK (used_credits >= 0),
    CONSTRAINT positive_bonus CHECK (bonus_credits >= 0),
    UNIQUE(user_id)
);

-- Credit Transactions Log
CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Transaction details
    operation VARCHAR(100) NOT NULL,  -- chat_message, document_upload, etc.
    credits INTEGER NOT NULL,         -- Positive for consumption, negative for credits added
    metadata JSONB DEFAULT '{}',      -- Additional details (model used, file size, etc.)
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes for performance
    INDEX idx_credit_transactions_user_id (user_id),
    INDEX idx_credit_transactions_created_at (created_at),
    INDEX idx_credit_transactions_operation (operation)
);

-- Credit Packages (for purchases)
CREATE TABLE IF NOT EXISTS credit_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    credits INTEGER NOT NULL,
    price_cents INTEGER NOT NULL,     -- Price in cents to avoid floating point
    discount_percentage INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchase History
CREATE TABLE IF NOT EXISTS credit_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    package_id UUID REFERENCES credit_packages(id),
    
    -- Purchase details
    credits_purchased INTEGER NOT NULL,
    amount_cents INTEGER NOT NULL,
    payment_method VARCHAR(50),
    payment_id VARCHAR(255),          -- Stripe/PayPal transaction ID
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed, refunded
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    -- Indexes
    INDEX idx_credit_purchases_user_id (user_id),
    INDEX idx_credit_purchases_status (status)
);

-- Organization Credit Limits (for enterprise accounts)
CREATE TABLE IF NOT EXISTS organization_credit_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Limits
    monthly_credit_pool INTEGER,      -- Shared pool for organization
    per_user_limit INTEGER,           -- Max credits per user
    auto_refill BOOLEAN DEFAULT false,
    
    -- Billing
    billing_contact_email VARCHAR(255),
    billing_method VARCHAR(50),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(organization_id)
);

-- Insert default credit packages
INSERT INTO credit_packages (name, credits, price_cents, discount_percentage) VALUES
    ('Starter', 5000, 500, 0),
    ('Basic', 10000, 1000, 0),
    ('Pro', 25000, 2400, 4),
    ('Business', 50000, 4500, 10),
    ('Enterprise', 100000, 8500, 15);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_credits_updated_at BEFORE UPDATE
    ON user_credits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_packages_updated_at BEFORE UPDATE
    ON credit_packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_credit_limits_updated_at BEFORE UPDATE
    ON organization_credit_limits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_purchases ENABLE ROW LEVEL SECURITY;

-- Users can only see their own credit info
CREATE POLICY user_credits_policy ON user_credits
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY credit_transactions_policy ON credit_transactions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY credit_purchases_policy ON credit_purchases
    FOR ALL USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON user_credits TO authenticated;
GRANT ALL ON credit_transactions TO authenticated;
GRANT SELECT ON credit_packages TO authenticated;
GRANT ALL ON credit_purchases TO authenticated;
GRANT SELECT ON organization_credit_limits TO authenticated;