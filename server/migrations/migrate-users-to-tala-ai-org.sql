-- Migration: Move all users without an organization to Tala AI
-- Compatible with existing organizations table schema

-- Step 1: Ensure Tala AI organization exists (idempotent)
-- First check if it exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = '00000000-0000-0000-0000-000000000001') THEN
    INSERT INTO organizations (
      id,
      name,
      slug,
      type,
      owner_id,
      is_active,
      settings,
      created_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000001',
      'Tala AI',
      'tala-ai',
      'parent',
      NULL,
      true,
      '{"isParent": true, "sharedKnowledge": true}'::jsonb,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    );
  ELSE
    -- Update existing Tala AI organization
    UPDATE organizations
    SET
      name = 'Tala AI',
      slug = 'tala-ai',
      type = 'parent',
      is_active = true,
      settings = '{"isParent": true, "sharedKnowledge": true}'::jsonb,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = '00000000-0000-0000-0000-000000000001';
  END IF;
END $$;

-- Step 2: Update all users with NULL organization_id to Tala AI
UPDATE user_credits
SET 
  organization_id = '00000000-0000-0000-0000-000000000001',
  updated_at = CURRENT_TIMESTAMP
WHERE organization_id IS NULL;

-- Step 3: Verify migration results
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN organization_id = '00000000-0000-0000-0000-000000000001' THEN 1 END) as tala_ai_users,
  COUNT(CASE WHEN organization_id IS NULL THEN 1 END) as users_without_org
FROM user_credits;

-- Step 4: Show sample of migrated users
SELECT 
  u.full_name,
  u.role,
  u.organization_id,
  o.name as organization_name,
  u.created_at
FROM user_credits u
LEFT JOIN organizations o ON u.organization_id = o.id
ORDER BY u.created_at DESC
LIMIT 10;
