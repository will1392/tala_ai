-- BRUTE FORCE FIX: Reset Will's account completely
-- This will ensure everything is set up correctly

-- Step 1: Update password in auth.users
UPDATE auth.users 
SET 
  encrypted_password = crypt('tala$9416', gen_salt('bf')),
  email_confirmed_at = now(),
  updated_at = now()
WHERE email = 'will@weareapexcreatives.com';

-- Step 2: Get the user_id from auth.users
DO $$
DECLARE
  auth_user_id UUID;
BEGIN
  -- Get the auth user ID
  SELECT id INTO auth_user_id
  FROM auth.users
  WHERE email = 'will@weareapexcreatives.com';
  
  -- If no auth user found, raise error
  IF auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Auth user not found for will@weareapexcreatives.com';
  END IF;
  
  RAISE NOTICE 'Found auth user ID: %', auth_user_id;
  
  -- Step 3: Upsert into user_credits with super_admin role and Tala AI org
  INSERT INTO user_credits (
    user_id,
    role,
    organization_id,
    total_credits,
    used_credits,
    bonus_credits,
    plan_type,
    full_name,
    created_at,
    updated_at
  ) VALUES (
    auth_user_id,
    'super_admin',
    '00000000-0000-0000-0000-000000000001',
    999999,
    0,
    0,
    'enterprise',
    'Will Smith',
    now(),
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    role = 'super_admin',
    organization_id = '00000000-0000-0000-0000-000000000001',
    full_name = 'Will Smith',
    updated_at = now();
  
  RAISE NOTICE 'User_credits updated successfully';
END $$;

-- Step 4: Verify everything
SELECT 
  'Auth User' as table_name,
  au.id,
  au.email,
  au.email_confirmed_at IS NOT NULL as email_confirmed,
  au.encrypted_password IS NOT NULL as has_password
FROM auth.users au
WHERE au.email = 'will@weareapexcreatives.com'

UNION ALL

SELECT 
  'User Credits' as table_name,
  uc.user_id as id,
  uc.role as email,
  (uc.organization_id = '00000000-0000-0000-0000-000000000001')::text::boolean as email_confirmed,
  (uc.role = 'super_admin')::text::boolean as has_password
FROM user_credits uc
WHERE uc.user_id = (SELECT id FROM auth.users WHERE email = 'will@weareapexcreatives.com');

-- Step 5: Show final state
SELECT 
  au.email,
  au.id as auth_user_id,
  uc.role,
  uc.organization_id,
  o.name as organization_name,
  uc.total_credits,
  uc.full_name
FROM auth.users au
LEFT JOIN user_credits uc ON au.id = uc.user_id
LEFT JOIN organizations o ON uc.organization_id = o.id
WHERE au.email = 'will@weareapexcreatives.com';
