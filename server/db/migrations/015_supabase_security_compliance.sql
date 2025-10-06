-- Supabase security compliance adjustments
-- Ensures views do not run with definer privileges and are not exposed to the anon role
-- Also enforces row level security on utility tables flagged by Supabase linter

BEGIN;

-- Restrict anon access to sensitive views and ensure they execute as the caller
DO $$
DECLARE
    view_name text;
BEGIN
    FOR view_name IN SELECT unnest(ARRAY[
        'conversation_summaries',
        'accessible_documents',
        'document_search',
        'user_details',
        'agency_usage_summary'
    ])
    LOOP
        EXECUTE format('ALTER VIEW %I SET (security_invoker = true);', view_name);
        EXECUTE format('REVOKE ALL ON %I FROM anon;', view_name);
        EXECUTE format('GRANT SELECT ON %I TO authenticated;', view_name);
    END LOOP;
END;
$$;

-- Recreate user_details view without exposing auth-linked identifiers to anon/authenticated callers
CREATE OR REPLACE VIEW user_details AS
SELECT
    u.id,
    u.organization_id,
    u.email,
    u.first_name,
    u.last_name,
    u.display_name,
    u.avatar_url,
    u.role,
    u.status,
    u.preferences,
    u.metadata,
    u.created_at,
    u.updated_at
FROM users u
WHERE
    auth.role() = 'service_role'
    OR u.auth_user_id = auth.uid();
ALTER VIEW user_details SET (security_invoker = true);
REVOKE ALL ON user_details FROM anon;
GRANT SELECT ON user_details TO authenticated;

-- Ensure RLS is enabled on utility tables and only accessible to service role
ALTER TABLE primary_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_version ENABLE ROW LEVEL SECURITY;
ALTER TABLE migrations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'primary_folders'
          AND policyname = 'Authenticated users can read primary folders'
    ) THEN
        EXECUTE 'CREATE POLICY "Authenticated users can read primary folders" ON primary_folders
            FOR SELECT USING (
                auth.role() IN (''authenticated'', ''service_role'')
            );';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'primary_folders'
          AND policyname = 'Service role manages primary folders'
    ) THEN
        EXECUTE 'CREATE POLICY "Service role manages primary folders" ON primary_folders
            FOR ALL USING (auth.role() = ''service_role'')
            WITH CHECK (auth.role() = ''service_role'');';
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'schema_version'
          AND policyname = 'Service role manages schema version'
    ) THEN
        EXECUTE 'CREATE POLICY "Service role manages schema version" ON schema_version
            FOR ALL USING (auth.role() = ''service_role'')
            WITH CHECK (auth.role() = ''service_role'');';
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'migrations'
          AND policyname = 'Service role manages migrations'
    ) THEN
        EXECUTE 'CREATE POLICY "Service role manages migrations" ON migrations
            FOR ALL USING (auth.role() = ''service_role'')
            WITH CHECK (auth.role() = ''service_role'');';
    END IF;
END;
$$;

-- Ensure anon cannot access maintenance tables
REVOKE ALL ON schema_version FROM anon, authenticated;
REVOKE ALL ON migrations FROM anon, authenticated;
GRANT SELECT ON schema_version TO service_role;
GRANT SELECT ON migrations TO service_role;

COMMIT;
