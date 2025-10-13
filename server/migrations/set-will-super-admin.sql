-- Set Will's account to super_admin role
-- Run this in Supabase SQL Editor

-- Update user_credits table to set super_admin role for will@weareapexcreatives.com
UPDATE user_credits
SET role = 'super_admin'
WHERE user_id = (
  SELECT id 
  FROM auth.users 
  WHERE email = 'will@weareapexcreatives.com'
);

-- Verify the update
SELECT 
  uc.user_id,
  au.email,
  uc.role,
  uc.full_name
FROM user_credits uc
JOIN auth.users au ON uc.user_id = au.id
WHERE au.email = 'will@weareapexcreatives.com';
