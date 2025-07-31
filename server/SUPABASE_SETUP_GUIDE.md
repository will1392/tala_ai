# Supabase Setup Guide for Tala AI

This guide will help you set up a real PostgreSQL database using Supabase instead of the mock database.

## Why Supabase?

- **Real PostgreSQL** - Full SQL database with all PostgreSQL features
- **Free tier** - Generous free tier perfect for development
- **Built-in Auth** - Can use Supabase Auth if needed
- **REST API** - Automatic REST API for your tables
- **Realtime** - Built-in realtime subscriptions
- **Easy setup** - No need to manage servers

## Setup Steps

### 1. Create a Supabase Account

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub or email

### 2. Create a New Project

1. Click "New project"
2. Choose your organization
3. Enter project details:
   - **Name**: `tala-ai` (or your preference)
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to you
4. Click "Create new project"
5. Wait for project to be ready (takes ~2 minutes)

### 3. Get Your API Keys

Once your project is ready:

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public**: Your anonymous key
   - **service_role**: Your service key (keep this secret!)

### 4. Create the Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. Copy the entire contents of `server/db/schema/tasks.sql`
4. Paste into the SQL editor
5. Click "Run" to create all tables

### 5. Configure Your Environment

Update your `.env` file:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-key-here
```

### 6. Run the Migration

```bash
cd server
node migrate-to-supabase.js
```

This will:
- Verify your database connection
- Migrate existing tasks from JSON to PostgreSQL
- Update the app to use Supabase

### 7. Restart Your Server

```bash
npm start
```

## Verifying the Setup

### Test Task Creation

```bash
# Create a test task
curl -X POST http://localhost:3001/api/tasks \
  -H "Content-Type: application/json" \
  -H "x-user-id: test_user_123" \
  -d '{
    "title": "Test Supabase Task",
    "description": "This task is stored in PostgreSQL!",
    "priority": "high"
  }'
```

### Check in Supabase Dashboard

1. Go to **Table Editor** in Supabase
2. Click on the `tasks` table
3. You should see your tasks there!

## Benefits Over Mock Database

1. **Persistence** - Tasks survive server restarts
2. **Real SQL** - Complex queries, joins, indexes
3. **Concurrent Access** - Multiple servers can share data
4. **Backups** - Automatic daily backups
5. **Scalability** - Can handle millions of tasks

## Troubleshooting

### "Missing configuration" error
- Ensure all three environment variables are set
- Check for typos in your `.env` file

### "Tasks table not found" error
- Run the SQL schema in Supabase dashboard
- Make sure you clicked "Run" after pasting

### "Permission denied" error
- Check that Row Level Security (RLS) is configured
- Verify your API keys are correct

### Tasks not showing up
- Check the `created_by` field matches your user ID
- Verify RLS policies in Supabase dashboard

## Advanced Features

### Enable Realtime Updates

In Supabase dashboard:
1. Go to **Database** → **Replication**
2. Enable replication for `tasks` table
3. Now you can subscribe to task changes in real-time!

### Add Full-Text Search

The schema already includes a full-text index:
```sql
SELECT * FROM tasks 
WHERE to_tsvector('english', title || ' ' || description) 
@@ plainto_tsquery('english', 'your search term');
```

### Set Up Automated Backups

Supabase automatically backs up your database daily on the Pro plan.

## Next Steps

1. **Update authentication** - Use Supabase Auth instead of mock auth
2. **Add more tables** - Users, organizations, etc.
3. **Set up migrations** - Use a proper migration tool
4. **Add monitoring** - Track database performance
5. **Enable connection pooling** - For production loads

## Resources

- [Supabase Docs](https://supabase.com/docs)
- [PostgreSQL Tutorial](https://www.postgresql.org/docs/current/tutorial.html)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)

Now your tasks are stored in a real database! 🎉