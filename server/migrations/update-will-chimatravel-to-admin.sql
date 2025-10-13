-- Update will@chimatravel.net to admin role
UPDATE user_credits
SET role = 'admin'
WHERE user_id = (
  SELECT id 
  FROM auth.users 
  WHERE email = 'will@chimatravel.net'
);

-- Verify the update
SELECT 
  uc.user_id,
  au.email,
  uc.role,
  uc.full_name
FROM user_credits uc
JOIN auth.users au ON uc.user_id = au.id
WHERE au.email = 'will@chimatravel.net';
