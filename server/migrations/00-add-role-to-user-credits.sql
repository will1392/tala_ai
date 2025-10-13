-- Add role column to user_credits table
-- This migration adds the role column needed for authentication

DO $$
BEGIN
  -- Check if role column exists, if not add it
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'user_credits' 
    AND column_name = 'role'
  ) THEN
    ALTER TABLE user_credits 
    ADD COLUMN role VARCHAR(50) DEFAULT 'agent';
    
    -- Add constraint to ensure valid roles
    ALTER TABLE user_credits
    ADD CONSTRAINT check_user_role CHECK (
      role IN ('agent', 'admin', 'super_admin')
    );
    
    -- Create index on role column
    CREATE INDEX IF NOT EXISTS idx_user_credits_role ON user_credits(role);
    
    RAISE NOTICE 'Added role column to user_credits table';
  ELSE
    RAISE NOTICE 'Role column already exists in user_credits table';
  END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'user_credits'
AND column_name = 'role';
