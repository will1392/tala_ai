-- Add type column to organizations table if it doesn't exist
-- This ensures compatibility with the RBAC schema

DO $$
BEGIN
  -- Check if type column exists, if not add it
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'organizations' 
    AND column_name = 'type'
  ) THEN
    ALTER TABLE organizations 
    ADD COLUMN type VARCHAR(50) DEFAULT 'agency';
    
    -- Create index on type column
    CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(type);
    
    RAISE NOTICE 'Added type column to organizations table';
  ELSE
    RAISE NOTICE 'Type column already exists in organizations table';
  END IF;
END $$;

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'organizations'
ORDER BY ordinal_position;
