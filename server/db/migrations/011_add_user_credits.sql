-- Migration: Add user credits system
-- Description: Creates tables for tracking user credits, transactions, and tier management

-- User credits table
CREATE TABLE IF NOT EXISTS user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL UNIQUE,
  tier VARCHAR(50) NOT NULL DEFAULT 'free',
  balance INTEGER NOT NULL DEFAULT 1000,
  monthly_allocation INTEGER NOT NULL DEFAULT 1000,
  daily_limit INTEGER NOT NULL DEFAULT 50,
  daily_used INTEGER NOT NULL DEFAULT 0,
  last_monthly_reset TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_daily_reset TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  overage_charges DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX idx_user_credits_user_id ON user_credits(user_id);
CREATE INDEX idx_user_credits_tier ON user_credits(tier);

-- Credit transactions table for audit trail
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  operation VARCHAR(100) NOT NULL,
  cost INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_credits(user_id) ON DELETE CASCADE
);

-- Create indexes for transaction queries
CREATE INDEX idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created_at ON credit_transactions(created_at);
CREATE INDEX idx_credit_transactions_operation ON credit_transactions(operation);

-- Credit packages for purchase
CREATE TABLE IF NOT EXISTS credit_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  credits INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User credit purchases
CREATE TABLE IF NOT EXISTS credit_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  package_id UUID,
  credits INTEGER NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50),
  payment_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user_credits(user_id) ON DELETE CASCADE,
  FOREIGN KEY (package_id) REFERENCES credit_packages(id)
);

-- Credit tier configurations
CREATE TABLE IF NOT EXISTS credit_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name VARCHAR(50) NOT NULL UNIQUE,
  monthly_credits INTEGER NOT NULL,
  daily_limit INTEGER NOT NULL,
  price_per_credit DECIMAL(10, 4),
  features JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default tiers
INSERT INTO credit_tiers (tier_name, monthly_credits, daily_limit, price_per_credit, features) VALUES
  ('free', 1000, 50, NULL, '{"ai_calls": 100, "uploads": 20, "searches": "unlimited"}'),
  ('premium', 10000, 500, NULL, '{"ai_calls": 1000, "uploads": 200, "searches": "unlimited", "priority_support": true}'),
  ('enterprise', 100000, 5000, NULL, '{"ai_calls": 10000, "uploads": 2000, "searches": "unlimited", "priority_support": true, "custom_models": true}'),
  ('payAsYouGo', 0, 10000, 0.01, '{"ai_calls": "unlimited", "uploads": "unlimited", "searches": "unlimited"}')
ON CONFLICT (tier_name) DO NOTHING;

-- Insert default credit packages
INSERT INTO credit_packages (name, credits, price, description) VALUES
  ('Starter Pack', 500, 4.99, 'Perfect for trying out premium features'),
  ('Power User', 2000, 14.99, 'Great value for regular users'),
  ('Professional', 5000, 29.99, 'Best for professionals and small teams'),
  ('Enterprise', 20000, 99.99, 'Bulk credits for large operations')
ON CONFLICT DO NOTHING;

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_user_credits_updated_at BEFORE UPDATE ON user_credits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to check and reset daily credits
CREATE OR REPLACE FUNCTION reset_daily_credits()
RETURNS void AS $$
BEGIN
  UPDATE user_credits
  SET daily_used = 0,
      last_daily_reset = CURRENT_TIMESTAMP
  WHERE DATE(last_daily_reset) < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Function to check and reset monthly credits
CREATE OR REPLACE FUNCTION reset_monthly_credits()
RETURNS void AS $$
BEGIN
  UPDATE user_credits
  SET balance = monthly_allocation,
      last_monthly_reset = CURRENT_TIMESTAMP,
      overage_charges = 0
  WHERE DATE_PART('month', last_monthly_reset) != DATE_PART('month', CURRENT_DATE)
     OR DATE_PART('year', last_monthly_reset) != DATE_PART('year', CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

-- Function to deduct credits with transaction logging
CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id VARCHAR(255),
  p_operation VARCHAR(100),
  p_cost INTEGER,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, new_balance INTEGER, message TEXT) AS $$
DECLARE
  v_current_balance INTEGER;
  v_daily_used INTEGER;
  v_daily_limit INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Get current balance and limits
  SELECT balance, daily_used, daily_limit
  INTO v_current_balance, v_daily_used, v_daily_limit
  FROM user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  -- Check if user exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0, 'User credits not initialized';
    RETURN;
  END IF;
  
  -- Check daily limit
  IF v_daily_used + p_cost > v_daily_limit THEN
    RETURN QUERY SELECT FALSE, v_current_balance, 'Daily credit limit exceeded';
    RETURN;
  END IF;
  
  -- Check balance
  IF v_current_balance < p_cost THEN
    RETURN QUERY SELECT FALSE, v_current_balance, 'Insufficient credits';
    RETURN;
  END IF;
  
  -- Deduct credits
  v_new_balance := v_current_balance - p_cost;
  
  UPDATE user_credits
  SET balance = v_new_balance,
      daily_used = daily_used + p_cost,
      updated_at = CURRENT_TIMESTAMP
  WHERE user_id = p_user_id;
  
  -- Log transaction
  INSERT INTO credit_transactions (user_id, operation, cost, balance_after, description, metadata)
  VALUES (p_user_id, p_operation, p_cost, v_new_balance, p_description, p_metadata);
  
  RETURN QUERY SELECT TRUE, v_new_balance, 'Credits deducted successfully';
END;
$$ LANGUAGE plpgsql;

-- Function to add credits (for purchases, bonuses, etc.)
CREATE OR REPLACE FUNCTION add_credits(
  p_user_id VARCHAR(255),
  p_amount INTEGER,
  p_description TEXT DEFAULT 'Credit added',
  p_metadata JSONB DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, new_balance INTEGER) AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  UPDATE user_credits
  SET balance = balance + p_amount,
      updated_at = CURRENT_TIMESTAMP
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 0;
    RETURN;
  END IF;
  
  -- Log transaction
  INSERT INTO credit_transactions (user_id, operation, cost, balance_after, description, metadata)
  VALUES (p_user_id, 'credit_added', -p_amount, v_new_balance, p_description, p_metadata);
  
  RETURN QUERY SELECT TRUE, v_new_balance;
END;
$$ LANGUAGE plpgsql;

-- View for user credit status with tier info
CREATE OR REPLACE VIEW user_credit_status AS
SELECT 
  uc.*,
  ct.features as tier_features,
  ct.price_per_credit,
  CASE 
    WHEN uc.balance <= uc.monthly_allocation * 0.1 THEN 'critical'
    WHEN uc.balance <= uc.monthly_allocation * 0.25 THEN 'low'
    WHEN uc.balance <= uc.monthly_allocation * 0.5 THEN 'medium'
    ELSE 'healthy'
  END as balance_status,
  ROUND((uc.balance::DECIMAL / uc.monthly_allocation) * 100, 2) as balance_percentage
FROM user_credits uc
LEFT JOIN credit_tiers ct ON uc.tier = ct.tier_name;