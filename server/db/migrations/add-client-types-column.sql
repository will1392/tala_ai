-- Add client_types column to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS client_types TEXT[] DEFAULT '{}';

-- Optional: Update existing profiles to migrate from businessSize to client_types
-- This is commented out as it may not be needed in development
-- UPDATE user_profiles 
-- SET client_types = CASE 
--   WHEN ideal_client->>'businessSize' = 'corporate' THEN ARRAY['corporate']
--   ELSE ARRAY['leisure']
-- END
-- WHERE ideal_client->>'businessSize' IS NOT NULL;