# 🚀 Tala AI Database Migrations

A comprehensive migration system to move your Tala AI data from JSON files to Supabase PostgreSQL.

## 📋 Overview

This migration system provides:
- **Safe, idempotent migrations** that can be run multiple times
- **Complete data preservation** with original IDs and timestamps
- **Automatic user and organization creation** for seamless transition
- **Comprehensive error handling** with detailed logging
- **Full rollback support** for emergency recovery
- **Migration tracking** to know what's been applied

## 🏗️ Migration Architecture

### Migration Files

| File | Purpose | Description |
|------|---------|-------------|
| `001_initial_schema.js` | Schema Setup | Creates migrations table, verifies schema, creates default org/user |
| `002_migrate_conversations.js` | Conversations | Migrates conversations.json and all messages |
| `003_migrate_folders.js` | Folders | Migrates primaryFolders.json and folders.json |
| `runMigrations.js` | Runner | Executes migrations in order with progress tracking |
| `rollback.js` | Rollback | Provides rollback functionality with confirmation |

### Key Features

- **Idempotent Operations**: Run migrations multiple times safely
- **ID Preservation**: Maintains existing conversation/folder IDs
- **Automatic User Creation**: Creates users from conversation data
- **Hierarchy Preservation**: Maintains folder parent-child relationships
- **Metadata Migration**: Preserves all original data in metadata fields
- **Transaction Safety**: Uses transactions where possible
- **Comprehensive Logging**: Detailed progress and error reporting

## 🚀 Quick Start

### 1. Prerequisites

Ensure you have:
- Supabase project created
- Database schema applied (`db/schema.sql`)
- Environment variables configured
- JSON data files available

### 2. Test Setup

```bash
# Test migration setup
npm run test:migrations
```

### 3. Check Status

```bash
# Check what migrations are pending
npm run migrate:status
```

### 4. Run Migrations

```bash
# Run all pending migrations
npm run migrate
```

### 5. Verify Results

Check your Supabase dashboard or:
```bash
# Check status again to see completed migrations
npm run migrate:status
```

## 📊 Data Mapping

### Conversations Migration

**Source**: `conversations.json`
```json
{
  "conv_123": {
    "title": "Example Chat",
    "userId": "user_456",
    "model": "gpt-4",
    "createdAt": "2024-01-01T00:00:00Z",
    "messages": [...]
  }
}
```

**Target**: `conversations` + `messages` tables
- Preserves original conversation IDs
- Creates users automatically if they don't exist
- Maps messages with full metadata (tokens, costs, sources)
- Maintains conversation settings and LLM parameters

### Folders Migration

**Source**: `primaryFolders.json` + `folders.json`
```json
// primaryFolders.json
[
  {
    "id": "default",
    "name": "Default Folder",
    "isDefault": true
  }
]

// folders.json  
[
  {
    "id": "folder_123",
    "name": "My Folder",
    "parentId": null,
    "userId": "user_456"
  }
]
```

**Target**: `primary_folders` + `folders` tables
- Migrates primary folders to both tables
- Builds complete folder hierarchy
- Calculates folder paths and depths
- Preserves permissions and sharing settings

## 🔧 Available Commands

```bash
# Migration commands
npm run migrate                    # Run all migrations
npm run migrate:status             # Check migration status  
npm run migrate:rollback           # Interactive rollback
npm run migrate:rollback:last      # Rollback last migration
npm run migrate:rollback:all       # Rollback all migrations
npm run test:migrations            # Test migration setup
```

## 🛡️ Safety Features

### Idempotent Design
- Migrations check for existing data before creating
- Can be run multiple times without duplicating data
- Skips already migrated items automatically

### Error Handling
- Detailed error logging with context
- Graceful handling of missing files
- Continues processing other items on individual failures
- Records migration status for tracking

### Rollback Protection
- Interactive confirmation for destructive operations
- Multiple confirmation levels for "rollback all"
- Only removes data created by migrations
- Preserves manually created data

## 📈 Migration Process Flow

```
1. Initial Schema (001)
   ├── Create migrations table
   ├── Verify database schema
   ├── Create default organization
   └── Create default admin user

2. Migrate Conversations (002)
   ├── Read conversations.json
   ├── Create users from conversation data
   ├── Migrate conversations with metadata
   └── Migrate messages with full history

3. Migrate Folders (003)
   ├── Migrate primary folders
   ├── Migrate user folders  
   ├── Build folder hierarchy
   └── Update folder paths
```

## 🔍 Troubleshooting

### Common Issues

**"Migrations table not found"**
```bash
# Run this SQL manually in Supabase:
psql -f db/migrations/create_migrations_table.sql [connection-string]
```

**"Schema not found" errors**
```bash
# Apply the schema first:
psql -f db/schema.sql [connection-string]
```

**Environment variable errors**
```bash
# Check your .env file has:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
```

**Migration fails partway**
```bash
# Check what completed:
npm run migrate:status

# Rollback if needed:
npm run migrate:rollback:last

# Fix issue and retry:
npm run migrate
```

### Debugging

Add `--force` flag to continue on errors:
```bash
node db/migrations/runMigrations.js --force
```

Check migration logs in the `migrations` table:
```sql
SELECT * FROM migrations ORDER BY applied_at DESC;
```

## 📋 Pre-Migration Checklist

- [ ] Supabase project created
- [ ] Database schema applied (`db/schema.sql`)
- [ ] Environment variables configured
- [ ] JSON data files backed up
- [ ] Migration setup tested (`npm run test:migrations`)
- [ ] Migration status checked (`npm run migrate:status`)

## 🎯 Post-Migration Steps

1. **Verify Data**: Check Supabase dashboard for migrated data
2. **Update Application**: Switch from JSON files to database
3. **Test Thoroughly**: Ensure all functionality works
4. **Backup Database**: Create backup of migrated data
5. **Archive JSON Files**: Keep original files as backup

## 🔄 Rollback Scenarios

### Rollback Last Migration
```bash
npm run migrate:rollback:last
```
Safe for undoing a single problematic migration.

### Interactive Rollback
```bash
npm run migrate:rollback
```
Choose specific migration to rollback to.

### Emergency Rollback
```bash
npm run migrate:rollback:all
```
⚠️ **WARNING**: This removes ALL migrated data!

## 📊 Migration Results

After successful migration, you'll have:

- **Organizations**: Default organization for all data
- **Users**: Auto-created from conversation participants  
- **Conversations**: All chats with preserved IDs and metadata
- **Messages**: Complete message history with LLM data
- **Folders**: Hierarchical folder structure
- **Primary Folders**: System folder templates

## 🤝 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Run `npm run test:migrations` to verify setup
3. Check migration status with `npm run migrate:status`
4. Review error logs in the console output
5. Check Supabase logs for database-level errors

## 📝 Development

To create new migrations:

1. Follow naming convention: `00X_description.js`
2. Export migration object with `id`, `name`, `description`, `up()`, `down()`
3. Make migrations idempotent
4. Include comprehensive error handling
5. Update this README with new migration details

---

*Migration system ready for production use! 🚀*