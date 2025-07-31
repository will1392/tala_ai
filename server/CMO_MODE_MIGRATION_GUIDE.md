# CMO Mode Migration Guide

This guide explains how to add CMO (Chief Marketing Officer) mode capabilities to Tala AI.

## Overview

The migration adds:
1. **Mode support** to conversations (travel, cmo)
2. **CMO-specific tables** for marketing assets, templates, and analytics
3. **Helper functions** for mode-aware querying

## Migration Files

### 1. `005_add_mode_support.sql`
- Adds `mode`, `sub_mode`, and `mode_context` columns to conversations
- Adds `user_preferences` to users table
- Creates indexes for performance

### 2. `006_create_cmo_tables.sql`
- Creates `marketing_assets` table for storing marketing content
- Creates `marketing_templates` table with pre-built templates
- Creates `quick_actions_history` for tracking user actions
- Creates `marketing_campaigns` and `marketing_analytics` tables
- Inserts default marketing templates

### 3. `007_update_conversation_views.sql`
- Creates helper functions for mode-aware querying
- Adds functions to switch conversation modes
- Creates views for mode statistics

## How to Apply Migrations

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste each migration file in order:
   - First: `005_add_mode_support.sql`
   - Second: `006_create_cmo_tables.sql`
   - Third: `007_update_conversation_views.sql`
4. Run each migration and verify success

### Option 2: Using the Migration Script

```bash
cd server/db/migrations
node run-mode-migrations.js
```

Note: Some complex statements may need manual execution.

## Verification

After running migrations, verify by checking:

```sql
-- Check mode columns exist
SELECT mode, sub_mode, mode_context FROM conversations LIMIT 1;

-- Check marketing tables exist
SELECT COUNT(*) FROM marketing_assets;
SELECT COUNT(*) FROM marketing_templates WHERE is_system = true;

-- Test mode functions
SELECT get_user_default_mode('test_user_123');
```

## Database Schema Changes

### Conversations Table
```sql
mode: conversation_mode (enum: 'travel', 'cmo') DEFAULT 'travel'
sub_mode: VARCHAR(50) -- e.g., 'seo', 'email', 'social'
mode_context: JSONB -- Mode-specific data
```

### New Tables
- `marketing_assets` - User-created marketing content
- `marketing_templates` - Reusable templates
- `quick_actions_history` - User action tracking
- `marketing_campaigns` - Campaign management
- `marketing_analytics` - Performance tracking

## Next Steps

After migrations are complete:

1. Update the backend services to use mode-aware queries
2. Add mode switching to the UI
3. Implement CMO-specific features
4. Test mode switching and data isolation

## Rollback

If needed, you can rollback by:

```sql
-- Remove mode columns
ALTER TABLE conversations 
DROP COLUMN IF EXISTS mode,
DROP COLUMN IF EXISTS sub_mode,
DROP COLUMN IF EXISTS mode_context;

-- Drop CMO tables
DROP TABLE IF EXISTS marketing_analytics CASCADE;
DROP TABLE IF EXISTS marketing_campaigns CASCADE;
DROP TABLE IF EXISTS quick_actions_history CASCADE;
DROP TABLE IF EXISTS marketing_templates CASCADE;
DROP TABLE IF EXISTS marketing_assets CASCADE;

-- Drop types
DROP TYPE IF EXISTS marketing_asset_type CASCADE;
DROP TYPE IF EXISTS conversation_mode CASCADE;
```