-- Seed Tala AI as the parent organization
-- This organization's knowledge base will be shared with all sub-organizations

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
  '00000000-0000-0000-0000-000000000001', -- Fixed UUID for Tala AI
  'Tala AI',
  'tala-ai',
  'parent',
  NULL, -- No single owner, managed by super admins
  true,
  '{"isParent": true, "sharedKnowledge": true}'::jsonb,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  type = EXCLUDED.type,
  is_active = EXCLUDED.is_active,
  settings = EXCLUDED.settings,
  updated_at = CURRENT_TIMESTAMP;

-- Verify the organization was created
SELECT id, name, slug, type, is_active
FROM organizations
WHERE slug = 'tala-ai';
