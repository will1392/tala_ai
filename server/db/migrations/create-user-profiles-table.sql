-- Create user_profiles table for storing user onboarding information
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('agent', 'agency_owner')),
    company_name TEXT,
    employees INTEGER,
    monthly_marketing_budget TEXT,
    ideal_client JSONB DEFAULT '{}',
    business_goals TEXT[] DEFAULT '{}',
    current_challenges TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- Create index on role for filtering
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- Enable RLS (Row Level Security)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to manage their own profiles
CREATE POLICY "Users can manage their own profiles" ON user_profiles
    FOR ALL USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Create policy for authenticated users to read/write their profiles
CREATE POLICY "Authenticated users can access their profiles" ON user_profiles
    FOR ALL USING (true);

-- Grant permissions
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON user_profiles TO anon;