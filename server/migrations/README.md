# Tala AI Database Migrations

This directory contains database migration scripts for migrating Tala AI data from JSON files to Supabase PostgreSQL.

## Overview

The migration system provides:
- **Idempotent migrations** - Safe to run multiple times
- **Error handling** - Detailed logging and graceful error recovery
- **ID preservation** - Maintains existing IDs and timestamps
- **Automatic user/org creation** - Creates default organization and users as needed
- **Migration tracking** - Tracks which migrations have been applied
- **Rollback support** - Can rollback individual or all migrations

## Migration Files

1. **001_initial_schema.js** - Creates initial database schema and default organization
2. **002_migrate_conversations.js** - Migrates conversations and messages from conversations.json
3. **003_migrate_folders.js** - Migrates folders from folders.json and primaryFolders.json

## Prerequisites

1. Ensure your `.env` file contains:
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_KEY=your_service_key
   ```

2. Make sure the database schema exists (run `db/schema.sql` first)

3. Ensure the migrations table exists:
   ```sql
   CREATE TABLE IF NOT EXISTS migrations (
     id SERIAL PRIMARY KEY,
     name VARCHAR(255) UNIQUE NOT NULL,
     applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
   );
   ```

## Usage

### Run all migrations
```bash
npm run migrate
```

### Check migration status
```bash
npm run migrate:status
```

### Rollback last migration
```bash
npm run migrate:rollback:last
```

### Rollback all migrations
```bash
npm run migrate:rollback:all
```

### Rollback to specific migration
```bash
node migrations/rollback.js to 001_initial_schema
```

## Migration Process

1. **Initial Schema** (001)
   - Checks if tables exist
   - Creates default organization (slug: 'default')
   - Creates admin user (id: 'admin-1')

2. **Conversations** (002)
   - Reads conversations.json
   - Creates users if they don't exist
   - Migrates conversations with metadata
   - Migrates messages with sources and entities

3. **Folders** (003)
   - Reads primaryFolders.json for system folders
   - Reads folders.json for user folders
   - Maintains parent-child relationships
   - Preserves permissions and metadata

## Data Mapping

### Users
- Creates users based on userId from JSON files
- Assigns appropriate roles (admin/agent)
- Links to default organization

### Conversations
- Preserves original conversation IDs
- Maps userId to user_id foreign key
- Stores message count and last message in metadata

### Messages
- Maps 'tala' sender to 'assistant'
- Preserves sources and entities in metadata
- Maintains token usage and model information

### Folders
- Primary folders become top-level folders
- Regular folders maintain parent relationships
- System folders preserve special properties

## Error Handling

- Each migration checks if it has already been applied
- Errors are logged with context
- Failed items are skipped (migration continues)
- Migration stops on critical errors

## Rollback Behavior

- Removes only data that was migrated
- Preserves any data created outside migrations
- Removes migration tracking record
- Safe to re-run migrations after rollback

## Troubleshooting

1. **Migration already applied**
   - This is normal - migrations are idempotent
   - Check status with `npm run migrate:status`

2. **User already exists**
   - Expected if users were created elsewhere
   - Migration will continue with existing users

3. **Missing environment variables**
   - Ensure .env file exists and contains required keys
   - Use SUPABASE_SERVICE_KEY for full access

4. **Table doesn't exist**
   - Run schema.sql first to create tables
   - Check Supabase dashboard for table structure

## Development

To add a new migration:

1. Create new file: `00X_migration_name.js`
2. Extend base migration pattern
3. Add to migration registry in `runMigrations.js`
4. Implement `up()` and `down()` methods
5. Test rollback functionality

Example migration structure:
```javascript
class MyMigration {
  constructor(supabaseUrl, supabaseKey) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.migrationName = '00X_my_migration';
  }

  async up() {
    // Apply migration
  }

  async down() {
    // Rollback migration
  }
}
```