-- 014_security_hardening.sql
-- Harden views, functions, and policies flagged by Supabase's security linter.

-- Ensure helper extensions live outside the public schema
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "unaccent" WITH SCHEMA extensions;
ALTER EXTENSION "pg_trgm" SET SCHEMA extensions;
ALTER EXTENSION "unaccent" SET SCHEMA extensions;

-- Harden commonly used helper functions with a fixed search_path
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_conversation_message_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE conversations
        SET message_count = message_count + 1,
            last_message_at = NEW.created_at,
            last_activity_at = NEW.created_at
        WHERE id = NEW.conversation_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE conversations
        SET message_count = message_count - 1
        WHERE id = OLD.conversation_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION update_folder_document_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE folders
        SET document_count = document_count + 1,
            total_size_bytes = total_size_bytes + COALESCE(NEW.file_size_bytes, 0)
        WHERE id = NEW.folder_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE folders
        SET document_count = document_count - 1,
            total_size_bytes = total_size_bytes - COALESCE(OLD.file_size_bytes, 0)
        WHERE id = OLD.folder_id;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.folder_id IS DISTINCT FROM NEW.folder_id THEN
            IF OLD.folder_id IS NOT NULL THEN
                UPDATE folders
                SET document_count = document_count - 1,
                    total_size_bytes = total_size_bytes - COALESCE(OLD.file_size_bytes, 0)
                WHERE id = OLD.folder_id;
            END IF;
            IF NEW.folder_id IS NOT NULL THEN
                UPDATE folders
                SET document_count = document_count + 1,
                    total_size_bytes = total_size_bytes + COALESCE(NEW.file_size_bytes, 0)
                WHERE id = NEW.folder_id;
            END IF;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE tags SET usage_count = usage_count + 1 WHERE id = NEW.tag_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE tags SET usage_count = usage_count - 1 WHERE id = OLD.tag_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION create_migration_table()
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
END;
$$;

CREATE OR REPLACE FUNCTION drop_table_if_exists(table_name text)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', table_name);
END;
$$;

CREATE OR REPLACE FUNCTION drop_type_if_exists(type_name text)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    EXECUTE format('DROP TYPE IF EXISTS %I CASCADE', type_name);
END;
$$;

CREATE OR REPLACE FUNCTION get_task_with_relations(p_task_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'task', row_to_json(t.*),
    'assignments', COALESCE(json_agg(DISTINCT a.*) FILTER (WHERE a.id IS NOT NULL), '[]'::json),
    'dependencies', COALESCE(json_agg(DISTINCT d.*) FILTER (WHERE d.id IS NOT NULL), '[]'::json),
    'attachments', COALESCE(json_agg(DISTINCT att.*) FILTER (WHERE att.id IS NOT NULL), '[]'::json),
    'reminders', COALESCE(json_agg(DISTINCT r.*) FILTER (WHERE r.id IS NOT NULL), '[]'::json)
  )
  INTO result
  FROM tasks t
  LEFT JOIN task_assignments a ON t.id = a.task_id
  LEFT JOIN task_dependencies d ON t.id = d.task_id
  LEFT JOIN task_attachments att ON t.id = att.task_id
  LEFT JOIN task_reminders r ON t.id = r.task_id
  WHERE t.id = p_task_id
  GROUP BY t.id;

  RETURN result;
END;
$$;

-- Ensure sensitive tables have RLS enabled
ALTER TABLE IF EXISTS folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS document_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS primary_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS schema_version ENABLE ROW LEVEL SECURITY;

-- Refresh folder policies
DROP POLICY IF EXISTS "Users can view accessible folders" ON folders;
DROP POLICY IF EXISTS "Users can manage own folders" ON folders;
DROP POLICY IF EXISTS "Users can update own folders" ON folders;
DROP POLICY IF EXISTS "Users can delete own folders" ON folders;

CREATE POLICY "Users can view accessible folders" ON folders FOR SELECT USING (
    auth.role() = 'service_role'
    OR EXISTS (
        SELECT 1
        FROM users current_user
        WHERE current_user.auth_user_id = auth.uid()
          AND current_user.organization_id = folders.organization_id
          AND (
              folders.visibility IN ('organization', 'public')
              OR folders.user_id = current_user.id
              OR (folders.allowed_user_ids IS NOT NULL AND current_user.id = ANY(folders.allowed_user_ids))
          )
    )
);

CREATE POLICY "Users can manage own folders" ON folders FOR INSERT WITH CHECK (
    auth.role() = 'service_role'
    OR EXISTS (
        SELECT 1
        FROM users current_user
        WHERE current_user.auth_user_id = auth.uid()
          AND current_user.id = folders.user_id
          AND current_user.organization_id = folders.organization_id
    )
);

CREATE POLICY "Users can update own folders" ON folders FOR UPDATE USING (
    auth.role() = 'service_role'
    OR EXISTS (
        SELECT 1
        FROM users current_user
        WHERE current_user.auth_user_id = auth.uid()
          AND current_user.id = folders.user_id
          AND current_user.organization_id = folders.organization_id
    )
) WITH CHECK (
    auth.role() = 'service_role'
    OR EXISTS (
        SELECT 1
        FROM users current_user
        WHERE current_user.auth_user_id = auth.uid()
          AND current_user.id = folders.user_id
          AND current_user.organization_id = folders.organization_id
    )
);

CREATE POLICY "Users can delete own folders" ON folders FOR DELETE USING (
    auth.role() = 'service_role'
    OR EXISTS (
        SELECT 1
        FROM users current_user
        WHERE current_user.auth_user_id = auth.uid()
          AND current_user.id = folders.user_id
          AND current_user.organization_id = folders.organization_id
    )
);

-- Tag policies
DROP POLICY IF EXISTS "Users can view organization tags" ON tags;
DROP POLICY IF EXISTS "Admins manage organization tags" ON tags;

CREATE POLICY "Users can view organization tags" ON tags FOR SELECT USING (
    auth.role() = 'service_role'
    OR EXISTS (
        SELECT 1 FROM users current_user
        WHERE current_user.auth_user_id = auth.uid()
          AND current_user.organization_id = tags.organization_id
    )
);

CREATE POLICY "Admins manage organization tags" ON tags FOR ALL USING (
    auth.role() = 'service_role'
    OR EXISTS (
        SELECT 1 FROM users current_user
        WHERE current_user.auth_user_id = auth.uid()
          AND current_user.organization_id = tags.organization_id
          AND current_user.role IN ('owner', 'admin')
    )
) WITH CHECK (
    auth.role() = 'service_role'
    OR EXISTS (
        SELECT 1 FROM users current_user
        WHERE current_user.auth_user_id = auth.uid()
          AND current_user.organization_id = tags.organization_id
          AND current_user.role IN ('owner', 'admin')
    )
);

-- Document tag policies
DROP POLICY IF EXISTS "Users can view document tags" ON document_tags;
DROP POLICY IF EXISTS "Users can modify owned document tags" ON document_tags;

CREATE POLICY "Users can view document tags" ON document_tags FOR SELECT USING (
    auth.role() = 'service_role'
    OR EXISTS (
        SELECT 1
        FROM users current_user
        JOIN documents d ON d.id = document_tags.document_id
        WHERE current_user.auth_user_id = auth.uid()
          AND current_user.organization_id = d.organization_id
          AND (
              d.visibility IN ('organization', 'public')
              OR d.user_id = current_user.id
              OR (d.is_shared AND d.shared_with_user_ids IS NOT NULL AND current_user.id = ANY(d.shared_with_user_ids))
          )
    )
);

CREATE POLICY "Users can modify owned document tags" ON document_tags FOR ALL USING (
    auth.role() = 'service_role'
    OR EXISTS (
        SELECT 1
        FROM users current_user
        JOIN documents d ON d.id = document_tags.document_id
        WHERE current_user.auth_user_id = auth.uid()
          AND current_user.id = d.user_id
    )
) WITH CHECK (
    auth.role() = 'service_role'
    OR EXISTS (
        SELECT 1
        FROM users current_user
        JOIN documents d ON d.id = document_tags.document_id
        WHERE current_user.auth_user_id = auth.uid()
          AND current_user.id = d.user_id
    )
);

-- Primary folders and migration tables
DROP POLICY IF EXISTS "Authenticated users can read primary folders" ON primary_folders;
DROP POLICY IF EXISTS "Service role manages primary folders" ON primary_folders;

CREATE POLICY "Authenticated users can read primary folders" ON primary_folders FOR SELECT USING (
    auth.role() IN ('authenticated', 'service_role')
);

CREATE POLICY "Service role manages primary folders" ON primary_folders FOR ALL USING (
    auth.role() = 'service_role'
) WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role reads migrations" ON migrations;
DROP POLICY IF EXISTS "Service role manages migrations" ON migrations;

CREATE POLICY "Service role reads migrations" ON migrations FOR SELECT USING (
    auth.role() = 'service_role'
);

CREATE POLICY "Service role manages migrations" ON migrations FOR ALL USING (
    auth.role() = 'service_role'
) WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role reads schema version" ON schema_version;
DROP POLICY IF EXISTS "Service role manages schema version" ON schema_version;

CREATE POLICY "Service role reads schema version" ON schema_version FOR SELECT USING (
    auth.role() = 'service_role'
);

CREATE POLICY "Service role manages schema version" ON schema_version FOR ALL USING (
    auth.role() = 'service_role'
) WITH CHECK (auth.role() = 'service_role');

-- Replace the security sensitive views
CREATE OR REPLACE VIEW conversation_summaries AS
SELECT
    c.*,
    owner.display_name AS owner_display_name,
    latest_msg.content AS latest_message,
    latest_msg.created_at AS latest_message_at,
    latest_msg.sender AS latest_message_sender
FROM conversations c
JOIN users owner ON owner.id = c.user_id
LEFT JOIN LATERAL (
    SELECT content, created_at, sender
    FROM messages
    WHERE conversation_id = c.id
    ORDER BY created_at DESC
    LIMIT 1
) latest_msg ON TRUE
WHERE c.deleted_at IS NULL
  AND (
      auth.role() = 'service_role'
      OR EXISTS (
          SELECT 1
          FROM users current_user
          WHERE current_user.auth_user_id = auth.uid()
            AND current_user.id = c.user_id
      )
  );
ALTER VIEW conversation_summaries SET (security_invoker = true);

CREATE OR REPLACE VIEW accessible_documents AS
SELECT
    d.*
FROM documents d
WHERE d.deleted_at IS NULL
  AND (
      auth.role() = 'service_role'
      OR EXISTS (
          SELECT 1
          FROM users current_user
          WHERE current_user.auth_user_id = auth.uid()
            AND current_user.organization_id = d.organization_id
            AND (
                d.visibility IN ('organization', 'public')
                OR d.user_id = current_user.id
                OR (d.is_shared AND d.shared_with_user_ids IS NOT NULL AND current_user.id = ANY(d.shared_with_user_ids))
            )
      )
  );
ALTER VIEW accessible_documents SET (security_invoker = true);

CREATE OR REPLACE VIEW document_search AS
SELECT
    d.*,
    f.name AS folder_name,
    f.path AS folder_path,
    owner.display_name AS uploader_name,
    ARRAY_AGG(t.name) FILTER (WHERE t.name IS NOT NULL) AS tag_names
FROM accessible_documents d
LEFT JOIN folders f ON d.folder_id = f.id
LEFT JOIN users owner ON d.user_id = owner.id
LEFT JOIN document_tags dt ON d.id = dt.document_id
LEFT JOIN tags t ON dt.tag_id = t.id
GROUP BY d.id, f.name, f.path, owner.display_name;
ALTER VIEW document_search SET (security_invoker = true);

CREATE OR REPLACE VIEW user_details AS
SELECT
    u.id,
    u.organization_id,
    u.auth_user_id,
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

CREATE OR REPLACE VIEW agency_usage_summary AS
SELECT
    u.organization_id,
    u.id AS user_id,
    u.display_name,
    u.email,
    u.role,
    u.status,
    u.plan_type,
    COALESCE(uc.monthly_allocation, 0) AS total_credits,
    GREATEST(COALESCE(uc.monthly_allocation, 0) - COALESCE(uc.balance, 0), 0) AS used_credits,
    0::INTEGER AS bonus_credits,
    COALESCE(uc.balance, 0) AS available_credits,
    (u.status = 'active') AS active,
    u.updated_at AS last_activity_at
FROM users u
LEFT JOIN user_credits uc ON uc.user_id = u.id::text
WHERE
    auth.role() = 'service_role'
    OR EXISTS (
        SELECT 1
        FROM users current_user
        WHERE current_user.auth_user_id = auth.uid()
          AND current_user.organization_id = u.organization_id
          AND (
              current_user.role IN ('owner', 'admin')
              OR current_user.id = u.id
          )
    );
ALTER VIEW agency_usage_summary SET (security_invoker = true);

-- Apply task table policies only when the tables exist
DO $$
BEGIN
  IF to_regclass('public.task_assignments') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view related assignments" ON task_assignments';
    EXECUTE 'DROP POLICY IF EXISTS "Users manage assignments on owned tasks" ON task_assignments';
    EXECUTE 'CREATE POLICY "Users can view related assignments" ON task_assignments
      FOR SELECT USING (
        auth.role() = ''service_role''
        OR user_id = auth.uid()::text
        OR EXISTS (
          SELECT 1 FROM tasks t
          WHERE t.id = task_assignments.task_id
            AND (t.created_by = auth.uid()::text OR t.created_by = current_setting(''app.current_user_id'', true))
        )
      );';
    EXECUTE 'CREATE POLICY "Users manage assignments on owned tasks" ON task_assignments
      FOR ALL USING (
        auth.role() = ''service_role''
        OR EXISTS (
          SELECT 1 FROM tasks t
          WHERE t.id = task_assignments.task_id
            AND (t.created_by = auth.uid()::text OR t.created_by = current_setting(''app.current_user_id'', true))
        )
      ) WITH CHECK (
        auth.role() = ''service_role''
        OR EXISTS (
          SELECT 1 FROM tasks t
          WHERE t.id = task_assignments.task_id
            AND (t.created_by = auth.uid()::text OR t.created_by = current_setting(''app.current_user_id'', true))
        )
      );';
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.task_dependencies') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can access task dependencies" ON task_dependencies';
    EXECUTE 'DROP POLICY IF EXISTS "Users manage task dependencies" ON task_dependencies';
    EXECUTE 'CREATE POLICY "Users can access task dependencies" ON task_dependencies
      FOR SELECT USING (
        auth.role() = ''service_role''
        OR EXISTS (
          SELECT 1 FROM tasks t
          WHERE t.id = task_dependencies.task_id
            AND (t.created_by = auth.uid()::text OR t.created_by = current_setting(''app.current_user_id'', true))
        )
      );';
    EXECUTE 'CREATE POLICY "Users manage task dependencies" ON task_dependencies
      FOR ALL USING (
        auth.role() = ''service_role''
        OR EXISTS (
          SELECT 1 FROM tasks t
          WHERE t.id = task_dependencies.task_id
            AND (t.created_by = auth.uid()::text OR t.created_by = current_setting(''app.current_user_id'', true))
        )
      ) WITH CHECK (
        auth.role() = ''service_role''
        OR EXISTS (
          SELECT 1 FROM tasks t
          WHERE t.id = task_dependencies.task_id
            AND (t.created_by = auth.uid()::text OR t.created_by = current_setting(''app.current_user_id'', true))
        )
      );';
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.task_history') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can read task history" ON task_history';
    EXECUTE 'DROP POLICY IF EXISTS "Users manage task history on owned tasks" ON task_history';
    EXECUTE 'CREATE POLICY "Users can read task history" ON task_history
      FOR SELECT USING (
        auth.role() = ''service_role''
        OR user_id = auth.uid()::text
        OR EXISTS (
          SELECT 1 FROM tasks t
          WHERE t.id = task_history.task_id
            AND (t.created_by = auth.uid()::text OR t.created_by = current_setting(''app.current_user_id'', true))
        )
      );';
    EXECUTE 'CREATE POLICY "Users manage task history on owned tasks" ON task_history
      FOR ALL USING (
        auth.role() = ''service_role''
        OR EXISTS (
          SELECT 1 FROM tasks t
          WHERE t.id = task_history.task_id
            AND (t.created_by = auth.uid()::text OR t.created_by = current_setting(''app.current_user_id'', true))
        )
      ) WITH CHECK (
        auth.role() = ''service_role''
        OR EXISTS (
          SELECT 1 FROM tasks t
          WHERE t.id = task_history.task_id
            AND (t.created_by = auth.uid()::text OR t.created_by = current_setting(''app.current_user_id'', true))
        )
      );';
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.task_attachments') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view task attachments" ON task_attachments';
    EXECUTE 'DROP POLICY IF EXISTS "Users manage task attachments on owned tasks" ON task_attachments';
    EXECUTE 'CREATE POLICY "Users can view task attachments" ON task_attachments
      FOR SELECT USING (
        auth.role() = ''service_role''
        OR uploaded_by = auth.uid()::text
        OR EXISTS (
          SELECT 1 FROM tasks t
          WHERE t.id = task_attachments.task_id
            AND (t.created_by = auth.uid()::text OR t.created_by = current_setting(''app.current_user_id'', true))
        )
      );';
    EXECUTE 'CREATE POLICY "Users manage task attachments on owned tasks" ON task_attachments
      FOR ALL USING (
        auth.role() = ''service_role''
        OR EXISTS (
          SELECT 1 FROM tasks t
          WHERE t.id = task_attachments.task_id
            AND (t.created_by = auth.uid()::text OR t.created_by = current_setting(''app.current_user_id'', true))
        )
      ) WITH CHECK (
        auth.role() = ''service_role''
        OR EXISTS (
          SELECT 1 FROM tasks t
          WHERE t.id = task_attachments.task_id
            AND (t.created_by = auth.uid()::text OR t.created_by = current_setting(''app.current_user_id'', true))
        )
      );';
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.task_reminders') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users can view task reminders" ON task_reminders';
    EXECUTE 'DROP POLICY IF EXISTS "Users manage task reminders on owned tasks" ON task_reminders';
    EXECUTE 'CREATE POLICY "Users can view task reminders" ON task_reminders
      FOR SELECT USING (
        auth.role() = ''service_role''
        OR user_id = auth.uid()::text
        OR EXISTS (
          SELECT 1 FROM tasks t
          WHERE t.id = task_reminders.task_id
            AND (t.created_by = auth.uid()::text OR t.created_by = current_setting(''app.current_user_id'', true))
        )
      );';
    EXECUTE 'CREATE POLICY "Users manage task reminders on owned tasks" ON task_reminders
      FOR ALL USING (
        auth.role() = ''service_role''
        OR EXISTS (
          SELECT 1 FROM tasks t
          WHERE t.id = task_reminders.task_id
            AND (t.created_by = auth.uid()::text OR t.created_by = current_setting(''app.current_user_id'', true))
        )
      ) WITH CHECK (
        auth.role() = ''service_role''
        OR EXISTS (
          SELECT 1 FROM tasks t
          WHERE t.id = task_reminders.task_id
            AND (t.created_by = auth.uid()::text OR t.created_by = current_setting(''app.current_user_id'', true))
        )
      );';
  END IF;
END
$$;