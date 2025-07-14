# 📖 Complete Guide: Database Schema Application

## 🎯 What is "Apply database schema using db/schema.sql"?

The `db/schema.sql` file contains the complete PostgreSQL database structure for Tala AI. Before you can migrate data from JSON files, you need to create all the tables, indexes, and constraints in your Supabase database.

## 📁 What's in the Schema File?

The `db/schema.sql` contains:

```sql
-- 🗄️ 9 Core Tables
CREATE TABLE organizations (...);
CREATE TABLE users (...);
CREATE TABLE conversations (...);
CREATE TABLE messages (...);
CREATE TABLE documents (...);
CREATE TABLE folders (...);
CREATE TABLE primary_folders (...);
CREATE TABLE tags (...);
CREATE TABLE document_tags (...);

-- 🚀 39+ Performance Indexes
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
-- ... many more

-- 🔐 Row Level Security (RLS)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can access their own conversations" ...

-- 🔧 PostgreSQL Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ⚡ Triggers and Functions
CREATE OR REPLACE FUNCTION update_updated_at_column() ...
```

**Total**: ~30KB of SQL creating a production-ready multi-tenant database.

## 🚀 Application Methods

### Method 1: Supabase Dashboard (Easiest) ⭐

**Step-by-step with screenshots concept:**

1. **Open Supabase Dashboard**
   ```
   📱 https://supabase.com/dashboard → Select your project
   ```

2. **Navigate to SQL Editor**
   ```
   🗄️ Left sidebar → SQL Editor → New Query
   ```

3. **Copy Schema Content**
   ```bash
   # In terminal:
   cd /path/to/tala_ai/server
   cat db/schema.sql | pbcopy  # Mac
   # or
   cat db/schema.sql | xclip -selection clipboard  # Linux
   ```

4. **Paste and Execute**
   ```
   📝 Paste in editor → Click "Run" (or Ctrl+Enter)
   ⏱️  Wait ~10-30 seconds for completion
   ✅ Should see "Success. No rows returned"
   ```

5. **Verify Tables Created**
   ```
   🗂️ Go to Table Editor → Should see 9 tables listed
   ```

### Method 2: Command Line with psql

**Get Connection Details:**
```
🗄️ Dashboard → Settings → Database → Connection string
Example: postgresql://postgres:[PASSWORD]@db.abc123.supabase.co:5432/postgres
```

**Apply Schema:**
```bash
# Replace [PASSWORD] with actual password
psql "postgresql://postgres:[PASSWORD]@db.abc123.supabase.co:5432/postgres" -f db/schema.sql
```

**Expected Output:**
```
CREATE EXTENSION
CREATE EXTENSION
CREATE TABLE
CREATE TABLE
... (lots of CREATE statements)
CREATE INDEX
CREATE POLICY
SUCCESS
```

### Method 3: Database GUI Tools

**Popular Tools:**
- **pgAdmin** (free, comprehensive)
- **DBeaver** (free, user-friendly)
- **TablePlus** (paid, beautiful UI)

**Connection Settings:**
```
Host: db.abc123.supabase.co  (extract from Supabase URL)
Port: 5432
Database: postgres
Username: postgres
Password: [your-database-password]
```

**Steps:**
1. Connect using above settings
2. Open SQL query window
3. Load `db/schema.sql` file
4. Execute the script

### Method 4: Automated Helper

We've created a helper script:

```bash
npm run apply:schema
```

This will:
- ✅ Check if you can connect to Supabase
- ✅ Verify schema file exists
- ✅ Check if schema is already applied
- ✅ Provide connection information
- ✅ Give step-by-step instructions

## 🔍 Verification Steps

After applying schema, verify it worked:

### 1. Check Tables Exist
```sql
-- Run in Supabase SQL Editor
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**Expected Result:** 9 tables
```
conversations
document_tags
documents
folders
messages
organizations
primary_folders
tags
users
```

### 2. Test with Migration Helper
```bash
npm run test:migrations
```

**Expected Output:**
```
3️⃣  Testing database connection...
   ✅ Database connected and schema exists
```

### 3. Check Migration Status
```bash
npm run migrate:status
```

**Expected Output:**
```
📋 Available Migrations: 3
📋 Completed Migrations: 0
⏳ Pending: 3 migrations ready to run
```

## ⚠️ Common Issues & Solutions

### Issue: "permission denied for schema public"
**Cause:** Using anon key instead of service key
**Solution:** 
- Use service role connection string
- Verify SUPABASE_SERVICE_KEY in .env

### Issue: "relation already exists"
**Cause:** Schema already applied (partially or fully)
**Solution:** 
- This is normal! Schema uses `IF NOT EXISTS`
- Continue to verification steps

### Issue: "extension does not exist"
**Cause:** Extensions not enabled in Supabase
**Solution:**
1. Go to Dashboard → Database → Extensions
2. Enable: `uuid-ossp`, `pg_trgm`

### Issue: Connection timeout/refused
**Cause:** Network or credentials issue
**Solution:**
- Check internet connection
- Verify connection string format
- Try different network (some corporate networks block PostgreSQL)

### Issue: "database does not exist"
**Cause:** Wrong database name in connection
**Solution:**
- Always use `postgres` as database name
- Don't create custom databases

## 📊 What Schema Creates

After successful application:

| Component | Count | Purpose |
|-----------|-------|---------|
| **Tables** | 9 | Core data storage |
| **Indexes** | 39+ | Query performance |
| **Constraints** | 18+ | Data integrity |
| **Policies** | 9+ | Row-level security |
| **Triggers** | 9 | Auto-updates |
| **Functions** | 4 | Utility functions |

### Tables Created:
1. **organizations** - Multi-tenant isolation
2. **users** - User accounts and preferences  
3. **conversations** - Chat sessions
4. **messages** - Individual chat messages
5. **documents** - File uploads and content
6. **folders** - Hierarchical organization
7. **primary_folders** - System folder templates
8. **tags** - Flexible labeling system
9. **document_tags** - Many-to-many tag relationships

## 🎯 After Schema Application

Once schema is successfully applied:

### 1. Test Migration Setup
```bash
npm run test:migrations
```

### 2. Check What Will Be Migrated
```bash
npm run migrate:status
```

### 3. Run the Migrations
```bash
npm run migrate
```

### 4. Verify Results
- Check Supabase Dashboard → Table Editor
- Should see data in tables
- Check migration history in `migrations` table

## 📋 Complete Workflow

```mermaid
graph TD
    A[Create Supabase Project] --> B[Apply Schema]
    B --> C[Configure .env]
    C --> D[Test Setup]
    D --> E[Run Migrations]
    E --> F[Verify Data]
    
    B1[Supabase Dashboard] --> B
    B2[psql Command] --> B
    B3[Database GUI] --> B
```

## 🎉 Success Indicators

You'll know schema application worked when:

- ✅ No errors in SQL execution
- ✅ 9 tables visible in Supabase Table Editor
- ✅ `npm run test:migrations` shows "schema exists"
- ✅ `npm run migrate:status` shows 3 pending migrations
- ✅ Ready to run `npm run migrate`

## 🆘 Need Help?

1. **Quick Help**: Run `npm run apply:schema`
2. **Step-by-step**: See `SCHEMA_QUICK_START.md`
3. **Comprehensive**: See `APPLY_SCHEMA_GUIDE.md`
4. **Troubleshooting**: Check common issues above

---

**The schema is the foundation - once it's applied, you're ready to migrate all your JSON data to PostgreSQL!** 🚀