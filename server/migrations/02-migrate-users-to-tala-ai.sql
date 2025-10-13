-- Migration: Move all users without an organization to Tala AI
-- Run this after 01-add-type-column-to-organizations.sql
-- Simplified version compatible with existing schema

-- Step 1: Ensure Tala AI organization exists (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = '00000000-0000-0000-0000-000000000001') THEN
    -- Create new Tala AI organization with minimal columns
    INSERT INTO organizations (
      id,
      name,
      slug,
      type,
      created_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000001',
      'Tala AI',
      'tala-ai',
      'parent',
      CURRENT_TIMESTAMP
    );
    RAISE NOTICE 'Created Tala AI organization';
  ELSE
    -- Update existing Tala AI organization
    UPDATE organizations
    SET
      name = 'Tala AI',
      slug = 'tala-ai',
      type = 'parent'
    WHERE id = '00000000-0000-0000-0000-000000000001';
    RAISE NOTICE 'Updated existing Tala AI organization';
  END IF;
END $$;

-- Step 2: Update all users with NULL organization_id to Tala AI
DO $$
DECLARE
  affected_rows INT;
BEGIN
  UPDATE user_credits
  SET organization_id = '00000000-0000-0000-0000-000000000001'
  WHERE organization_id IS NULL;
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RAISE NOTICE 'Migrated % users to Tala AI organization', affected_rows;
END $$;

-- Step 3: Verify migration results
DO $$
DECLARE
  total INT;
  tala_ai INT;
  without_org INT;
BEGIN
  SELECT 
    COUNT(*),
    COUNT(CASE WHEN organization_id = '00000000-0000-0000-0000-000000000001' THEN 1 END),
    COUNT(CASE WHEN organization_id IS NULL THEN 1 END)
  INTO total, tala_ai, without_org
  FROM user_credits;
  
  RAISE NOTICE '=== Migration Results ===';
  RAISE NOTICE 'Total users: %', total;
  RAISE NOTICE 'Users in Tala AI: %', tala_ai;
  RAISE NOTICE 'Users without org: %', without_org;
  RAISE NOTICE '========================';
END $$;

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
