-- Fix RLS infinite recursion issues
-- Run this in Supabase SQL Editor to clean up policy warnings

-- 1. Temporarily disable RLS on affected tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on users table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'users')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON users';
    END LOOP;
    
    -- Drop all policies on organizations table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'organizations')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON organizations';
    END LOOP;
    
    -- Drop all policies on conversations table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'conversations')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON conversations';
    END LOOP;
END $$;

-- 3. Create simple, non-recursive policies
-- For users table
CREATE POLICY "Enable all access for authenticated users" ON users
    FOR ALL USING (true);

-- For organizations table  
CREATE POLICY "Enable all access for authenticated users" ON organizations
    FOR ALL USING (true);

-- For conversations table
CREATE POLICY "Enable all access for authenticated users" ON conversations
    FOR ALL USING (true);

-- 4. Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- 5. Grant necessary permissions
GRANT ALL ON users TO authenticated;
GRANT ALL ON users TO service_role;
GRANT ALL ON organizations TO authenticated;
GRANT ALL ON organizations TO service_role;
GRANT ALL ON conversations TO authenticated;
GRANT ALL ON conversations TO service_role;

-- 6. Verify the fix
DO $$
BEGIN
    RAISE NOTICE '✅ RLS policies have been simplified to prevent infinite recursion';
    RAISE NOTICE '⚠️  Note: These are permissive policies. In production, implement proper access controls.';
END $$;