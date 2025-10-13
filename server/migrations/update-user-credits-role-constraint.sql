-- Update user_credits role constraint to include 'admin' role
-- This allows creating admin users in addition to agent, agency_owner, and super_admin

-- Drop the existing check constraint
ALTER TABLE user_credits DROP CONSTRAINT IF EXISTS user_credits_role_check;

-- Add updated constraint that includes 'admin'
ALTER TABLE user_credits ADD CONSTRAINT user_credits_role_check 
CHECK (role IN ('agent', 'admin', 'agency_owner', 'super_admin'));

-- Verify the constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'user_credits'::regclass 
AND conname = 'user_credits_role_check';
