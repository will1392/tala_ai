-- Create migrations tracking table
CREATE TABLE IF NOT EXISTS migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_migrations_name ON migrations(name);
CREATE INDEX IF NOT EXISTS idx_migrations_applied_at ON migrations(applied_at);

-- Create helper functions for migrations
CREATE OR REPLACE FUNCTION create_migration_table()
RETURNS void AS $$
BEGIN
  CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
END;
$$ LANGUAGE plpgsql;

-- Function to safely drop tables
CREATE OR REPLACE FUNCTION drop_table_if_exists(table_name text)
RETURNS void AS $$
BEGIN
  EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', table_name);
END;
$$ LANGUAGE plpgsql;

-- Function to safely drop types
CREATE OR REPLACE FUNCTION drop_type_if_exists(type_name text)
RETURNS void AS $$
BEGIN
  EXECUTE format('DROP TYPE IF EXISTS %I CASCADE', type_name);
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT ALL ON migrations TO authenticated;
GRANT ALL ON migrations_id_seq TO authenticated;