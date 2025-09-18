# Credit System Setup Instructions

The credit system tables need to be created manually in your Supabase dashboard. Follow these steps:

## 1. Open Supabase SQL Editor

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Create a new query

## 2. Run the Credit System Migration

Copy and paste the entire contents of `/server/db/migrations/007_add_agency_credit_system.sql` into the SQL editor and run it.

This will create:
- `organization_credits` table for agency shared credit pools
- `agency_members` table for tracking team members
- `credit_transactions` table for usage history
- `plan_pricing` table for plan definitions
- Updates to `users` and `user_credits` tables

## 3. Verify Tables Were Created

Run this query to verify:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'organization_credits',
  'agency_members', 
  'credit_transactions',
  'plan_pricing'
);
```

You should see all 4 tables listed.

## 4. Check Column Updates

Verify the plan_type column was added:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'plan_type';
```

## 5. Test the Credit System

The credit system is now integrated into the server at `/api/credits/*` endpoints.

Test it by visiting:
- http://localhost:3001/api/credits/balance (requires x-user-id header)
- http://localhost:3001/api/credits/plans

## Alternative: Direct Table Creation

If the SQL file doesn't work, you can create the tables individually through the Supabase Table Editor:

### organization_credits
- id: uuid (primary key)
- organization_id: uuid (foreign key to organizations)
- total_credits: int4 (default: 10000)
- used_credits: int4 (default: 0) 
- bonus_credits: int4 (default: 0)
- plan_type: text (default: 'agency')
- last_reset_date: timestamptz (default: now())

### agency_members
- id: uuid (primary key)
- organization_id: uuid (foreign key)
- user_id: uuid (foreign key)
- role: text (default: 'agent')
- credits_used_this_period: int4 (default: 0)
- active: boolean (default: true)

### credit_transactions
- id: uuid (primary key)
- user_id: uuid (foreign key)
- operation: text
- credits: int4
- metadata: jsonb
- created_at: timestamptz

### plan_pricing
- id: uuid (primary key)
- plan_type: text (unique)
- name: text
- monthly_credits: int4
- monthly_price_cents: int4
- max_users: int4
- features: jsonb
- active: boolean (default: true)

## Next Steps

1. The credit routes are already integrated at `/api/credits`
2. The sidebar already shows credits (updates every 30s)
3. Test credit consumption by making API calls
4. Set up Stripe integration for payments