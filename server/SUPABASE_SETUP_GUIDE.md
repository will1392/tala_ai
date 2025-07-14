# 🗄️ **Supabase Database Setup Guide**

## Overview

This guide walks you through setting up Supabase PostgreSQL database for Tala AI, migrating from JSON file storage to a production-ready database with multi-tenancy support.

## 🚀 **Quick Start**

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new account or sign in
3. Create a new project
4. Wait for database provisioning (2-3 minutes)

### 2. Get Credentials
1. Go to **Settings** → **API** in your Supabase dashboard
2. Copy the following:
   - **Project URL** (looks like: `https://abc123.supabase.co`)
   - **Anon Public Key** (starts with `eyJ...`)
   - **Service Role Key** (starts with `eyJ...`)

### 3. Configure Environment
```bash
# Add to your .env file
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Migration settings (start with safe defaults)
ENABLE_DUAL_WRITE=false
ENABLE_DATABASE_READ=false
FALLBACK_TO_JSON=true
```

### 4. Test Setup
```bash
node test-database-setup.js
```

### 5. Run Migration
```bash
# Test first (dry run)
node db/migrate.js full --dry-run

# Run actual migration
node db/migrate.js full
```

## 📊 **Database Schema Overview**

### Core Tables

#### **organizations**
- Multi-tenant isolation
- Subscription management
- Feature flags and limits

#### **users**
- User accounts within organizations
- Roles and permissions
- Authentication integration

#### **conversations**
- Chat sessions with AI
- Model preferences
- Context management

#### **messages**
- Individual chat messages
- AI routing metadata
- Performance tracking

#### **documents**
- File storage with metadata
- Vector embedding integration
- Cloud storage support

#### **folders**
- Hierarchical organization
- Access controls
- Usage statistics

#### **tags & document_tags**
- Flexible tagging system
- AI-generated tags
- Search optimization

## 🔧 **Detailed Setup Instructions**

### Step 1: Supabase Project Setup

1. **Create Project**
   ```
   Project Name: Tala AI
   Database Password: [Generate strong password]
   Region: [Choose closest to your users]
   ```

2. **Configure Authentication (Optional)**
   - Go to **Authentication** → **Settings**
   - Configure email templates
   - Set up OAuth providers if needed

3. **Set Row Level Security**
   - Go to **Database** → **Tables**
   - RLS is enabled by default in our schema
   - Review policies as needed

### Step 2: Environment Configuration

Create or update your `.env` file:

```bash
# ==============================================
# SUPABASE DATABASE CONFIGURATION
# ==============================================

# Required: Get these from Supabase Dashboard → Settings → API
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ==============================================
# MIGRATION PHASE CONTROL
# ==============================================

# Phase 1: Setup (default)
ENABLE_DUAL_WRITE=false          # Don't write to DB yet
ENABLE_DATABASE_READ=false       # Still read from JSON
FALLBACK_TO_JSON=true           # Safe fallback mode

# Phase 2: Dual Write (after testing)
# ENABLE_DUAL_WRITE=true         # Write to both JSON and DB
# ENABLE_DATABASE_READ=false     # Still read from JSON
# FALLBACK_TO_JSON=true          # Keep fallback enabled

# Phase 3: Dual Read (after validation)
# ENABLE_DUAL_WRITE=true         # Write to both
# ENABLE_DATABASE_READ=true      # Read from DB primarily
# FALLBACK_TO_JSON=true          # Fallback if needed

# Phase 4: Full Migration (production)
# ENABLE_DUAL_WRITE=false        # DB only
# ENABLE_DATABASE_READ=true      # DB only
# FALLBACK_TO_JSON=false         # No fallback

# ==============================================
# PERFORMANCE TUNING
# ==============================================

DB_POOL_SIZE=10                  # Connection pool size
DB_QUERY_TIMEOUT=30000           # 30 second timeout
DB_ENABLE_LOGGING=false          # Enable for debugging
```

### Step 3: Test Configuration

```bash
# Test database configuration
node test-database-setup.js

# Expected output:
# ✅ Configuration is valid
# ✅ Database connection successful
# ⚠️  Database schema not found
# 💡 Run schema migration: node db/migrate.js schema
```

### Step 4: Schema Migration

```bash
# Create database schema
node db/migrate.js schema

# Expected output:
# 📋 Creating database schema...
# ✅ Schema migration completed
# ✅ Schema verification successful
# Created tables: organizations, users, conversations, messages...
```

### Step 5: Data Migration

```bash
# Test data migration first (safe)
node db/migrate.js data --dry-run

# Review the output, then run actual migration
node db/migrate.js data

# Expected output:
# 📂 MIGRATING JSON DATA TO DATABASE
# ✅ Migrated folder: Travel Documents
# ✅ Migrated conversation: What documents do I need for Japan?
# 📊 MIGRATION SUMMARY
# conversations: 15 migrated, 0 errors
# messages: 127 migrated, 0 errors
```

## 🧪 **Testing & Validation**

### Health Check
```bash
curl http://localhost:3001/api/health

# Expected database section:
{
  "database": {
    "status": "healthy",
    "configured": true,
    "connected": true,
    "schemaExists": true,
    "tables": ["organizations", "users", "conversations", ...]
  }
}
```

### Database Statistics
```bash
node test-database-setup.js

# Shows table row counts and health status
```

### Query Testing
```bash
# Test with Supabase dashboard SQL editor
SELECT COUNT(*) FROM conversations;
SELECT * FROM organizations LIMIT 5;
```

## 🔄 **Migration Phases**

### Phase 1: Setup & Testing
```bash
# .env settings
ENABLE_DUAL_WRITE=false
ENABLE_DATABASE_READ=false
FALLBACK_TO_JSON=true

# What happens:
# - Database schema created
# - JSON data migrated to database
# - Application still uses JSON files
# - Database connection tested
```

### Phase 2: Dual Write
```bash
# .env settings
ENABLE_DUAL_WRITE=true
ENABLE_DATABASE_READ=false
FALLBACK_TO_JSON=true

# What happens:
# - New data written to both JSON AND database
# - Application still reads from JSON files
# - Data consistency validation possible
# - No user-facing changes
```

### Phase 3: Dual Read
```bash
# .env settings
ENABLE_DUAL_WRITE=true
ENABLE_DATABASE_READ=true
FALLBACK_TO_JSON=true

# What happens:
# - Application reads from database primarily
# - Falls back to JSON if database unavailable
# - Still writes to both for safety
# - Performance can be measured
```

### Phase 4: Full Database
```bash
# .env settings
ENABLE_DUAL_WRITE=false
ENABLE_DATABASE_READ=true
FALLBACK_TO_JSON=false

# What happens:
# - Database only mode
# - JSON files no longer used
# - Full PostgreSQL performance
# - Production ready
```

## 🛠️ **Maintenance & Operations**

### Backup Strategy
- Supabase provides automatic daily backups
- Manual backups: Dashboard → Database → Backups
- Export critical data: `node db/migrate.js export`

### Monitoring
```bash
# Database health
curl http://localhost:3001/api/health | jq '.database'

# Table statistics
node -e "
import('./db/supabaseClient.js').then(db => 
  db.getDatabaseStats().then(console.log)
)"
```

### Performance Optimization
```sql
-- Check slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Index usage
SELECT schemaname, tablename, indexname, idx_scan 
FROM pg_stat_user_indexes 
ORDER BY idx_scan DESC;
```

## 🚨 **Troubleshooting**

### Common Issues

#### "Cannot connect to database"
```bash
# Check credentials
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY

# Test in Supabase dashboard
# Go to SQL Editor and run: SELECT NOW();
```

#### "Schema migration failed"
```bash
# Check Supabase dashboard for error details
# Try running schema in SQL Editor manually
# Check for sufficient privileges
```

#### "Data migration errors"
```bash
# Run dry run to identify issues
node db/migrate.js data --dry-run

# Check JSON file formats
# Verify file permissions
```

#### "RLS (Row Level Security) issues"
```sql
-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'conversations';

-- Disable RLS temporarily for testing (be careful!)
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
```

### Performance Issues

#### Slow queries
```sql
-- Enable query logging
ALTER SYSTEM SET log_min_duration_statement = 1000;

-- Check query plans
EXPLAIN ANALYZE SELECT * FROM conversations WHERE user_id = 'uuid';
```

#### Connection issues
```bash
# Increase connection pool
DB_POOL_SIZE=20

# Reduce timeout for faster failures
DB_QUERY_TIMEOUT=15000
```

## 📚 **Additional Resources**

### Supabase Documentation
- [Supabase Docs](https://supabase.com/docs)
- [PostgreSQL Performance](https://supabase.com/docs/guides/platform/performance)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

### SQL Reference
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Index Optimization](https://www.postgresql.org/docs/current/indexes.html)
- [JSONB Operations](https://www.postgresql.org/docs/current/datatype-json.html)

### Monitoring Tools
- Supabase Dashboard Analytics
- [pgAdmin](https://www.pgadmin.org/) for advanced management
- [Grafana](https://grafana.com/) for custom dashboards

## 🎯 **Next Steps After Setup**

1. **Test Integration**: Run your application tests
2. **Monitor Performance**: Check query response times
3. **Gradual Migration**: Follow the 4-phase approach
4. **User Acceptance**: Test with real user workflows
5. **Production Deploy**: Full database migration

---

## ✅ **Setup Checklist**

- [ ] Supabase project created
- [ ] Environment variables configured
- [ ] Database connection tested
- [ ] Schema migration completed
- [ ] Data migration completed
- [ ] Health checks passing
- [ ] Application integration tested
- [ ] Backup strategy confirmed
- [ ] Monitoring configured
- [ ] Documentation reviewed

**Congratulations! Your Tala AI database is ready for production! 🎉**