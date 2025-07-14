# 🗄️ Applying Database Schema to Supabase

This guide explains how to apply the `db/schema.sql` file to your Supabase PostgreSQL database before running migrations.

## 📋 Overview

The `db/schema.sql` file contains:
- All table definitions (9 core tables + migrations table)
- Indexes for performance (39+ indexes)
- Constraints and relationships
- Row Level Security (RLS) policies
- Triggers and functions
- PostgreSQL extensions (UUID, trigram search)

**You must apply this schema before running migrations!**

## 🚀 Method 1: Supabase Dashboard (Recommended)

This is the easiest method for most users.

### Step 1: Access SQL Editor
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Copy Schema Content
1. Open your local `db/schema.sql` file
2. Copy the entire contents (Ctrl+A, Ctrl+C)
3. Paste into the Supabase SQL Editor

### Step 3: Execute Schema
1. Click **Run** button (or Ctrl+Enter)
2. Wait for execution to complete
3. Check for any errors in the output panel

### Step 4: Verify Tables Created
1. Go to **Table Editor** in the left sidebar
2. You should see 9 tables:
   - organizations
   - users
   - conversations
   - messages
   - documents
   - folders
   - primary_folders
   - tags
   - document_tags

## 🔧 Method 2: Command Line with psql

If you prefer command line or need to automate the process.

### Step 1: Get Connection String
1. In Supabase Dashboard, go to **Settings** → **Database**
2. Copy the **Connection string** 
3. Replace `[YOUR-PASSWORD]` with your database password

Example connection string:
```
postgresql://postgres:[YOUR-PASSWORD]@db.abc123.supabase.co:5432/postgres
```

### Step 2: Apply Schema via psql
```bash
# Navigate to your server directory
cd /path/to/tala_ai/server

# Apply schema (replace with your connection string)
psql "postgresql://postgres:[PASSWORD]@db.abc123.supabase.co:5432/postgres" -f db/schema.sql
```

### Alternative: Environment Variable
```bash
# Set environment variable
export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.abc123.supabase.co:5432/postgres"

# Apply schema
psql $DATABASE_URL -f db/schema.sql
```

## 📱 Method 3: Using Database Client (GUI)

For those who prefer graphical database tools.

### Popular Database Clients:
- **pgAdmin** (free, full-featured)
- **DBeaver** (free, cross-platform)
- **TablePlus** (paid, Mac/Windows)
- **Postico** (paid, Mac only)

### Steps:
1. **Connect to Supabase**:
   - Host: `db.abc123.supabase.co` (from your connection string)
   - Port: `5432`
   - Database: `postgres`
   - Username: `postgres`
   - Password: Your database password

2. **Execute Schema**:
   - Open SQL query window
   - Load or paste `db/schema.sql` content
   - Execute the script

## 🐳 Method 4: Docker with psql

If you have Docker but not psql installed locally.

```bash
# Navigate to server directory
cd /path/to/tala_ai/server

# Run psql in Docker container
docker run --rm -i -v $(pwd):/workspace postgres:15 \
  psql "postgresql://postgres:[PASSWORD]@db.abc123.supabase.co:5432/postgres" \
  -f /workspace/db/schema.sql
```

## 🔍 Verification Steps

After applying the schema, verify it worked correctly:

### 1. Check Tables Exist
Run this query in Supabase SQL Editor:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Expected tables:
- conversations
- document_tags
- documents
- folders
- messages
- organizations
- primary_folders
- tags
- users

### 2. Check Indexes Created
```sql
SELECT indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY indexname;
```

Should show 39+ indexes for performance.

### 3. Check RLS Policies
```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
```

Should show Row Level Security policies for multi-tenancy.

### 4. Test Migrations Table
```sql
-- This should work without errors
CREATE TABLE IF NOT EXISTS migrations (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## ⚠️ Common Issues & Solutions

### Issue: "Permission denied for schema public"
**Solution**: Ensure you're using the service role (postgres user), not anon key.

### Issue: "relation already exists"
**Solution**: This is normal if running schema multiple times. The script uses `IF NOT EXISTS`.

### Issue: "extension does not exist"
**Solution**: Some extensions need to be enabled in Supabase Dashboard:
1. Go to **Database** → **Extensions**
2. Enable: `uuid-ossp`, `pg_trgm`

### Issue: Connection timeout
**Solution**: 
- Check your internet connection
- Verify connection string is correct
- Try from different network (some corporate networks block PostgreSQL ports)

### Issue: "database does not exist"
**Solution**: Make sure you're connecting to the `postgres` database, not a custom one.

## 🧪 Testing Schema Application

After applying schema, test with our migration test:

```bash
# This should now show schema exists
npm run test:migrations
```

Expected output:
```
3️⃣  Testing database connection...
   ✅ Database connected and schema exists
```

## 📋 Schema Application Checklist

- [ ] Supabase project created
- [ ] Database password retrieved
- [ ] Schema applied via chosen method
- [ ] All 9 tables visible in Table Editor
- [ ] No errors in SQL execution
- [ ] Migration test passes: `npm run test:migrations`
- [ ] Ready to run: `npm run migrate`

## 🚨 What if Schema Application Fails?

### Backup Plan 1: Manual Table Creation
If the full schema fails, you can create just the migrations table manually:

```sql
CREATE TABLE migrations (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    applied_by VARCHAR(255),
    status VARCHAR(50) DEFAULT 'completed',
    metadata JSONB DEFAULT '{}'::jsonb
);
```

Then run the first migration which will create other tables.

### Backup Plan 2: Incremental Application
Apply schema in smaller chunks:

1. **First, create extensions**:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
```

2. **Then create core tables** (copy table definitions only)

3. **Finally add indexes and constraints**

## 💡 Pro Tips

### For Development
- Use Supabase Dashboard SQL Editor for quick iterations
- Keep schema.sql in version control
- Test schema changes in development project first

### For Production
- Use command line psql for automated deployments
- Always backup before applying schema changes
- Consider using migration tools for incremental changes

### For Teams
- Document any manual changes made outside schema.sql
- Use consistent connection methods across team
- Share connection details securely (not in code)

## 🔄 Next Steps After Schema Application

1. **Verify Schema**: `npm run test:migrations`
2. **Check Migration Status**: `npm run migrate:status`
3. **Run Migrations**: `npm run migrate`
4. **Verify Data**: Check Supabase Dashboard tables

---

**Ready to apply your schema? Choose the method that works best for your setup!** 🚀