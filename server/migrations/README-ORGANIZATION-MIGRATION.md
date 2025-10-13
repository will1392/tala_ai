# Organization Migration Guide

This guide will help you migrate all existing users to the Tala AI parent organization.

## Prerequisites

1. Access to your Supabase SQL Editor
2. Admin/Owner access to the Supabase project

## Migration Steps

### Step 1: Add Type Column to Organizations Table

Navigate to your Supabase project:
1. Go to **SQL Editor**
2. Click **New Query**
3. Copy and paste the contents of `01-add-type-column-to-organizations.sql`
4. Click **Run**

This will:
- ✅ Add `type` column to organizations table if it doesn't exist
- ✅ Create index on the type column
- ✅ Show confirmation message

### Step 2: Run the User Migration

1. In **SQL Editor**, click **New Query**
2. Copy and paste the contents of `02-migrate-users-to-tala-ai.sql`
3. Click **Run**

This will:
- ✅ Create the Tala AI parent organization (if it doesn't exist)
- ✅ Move all users with `NULL` organization_id to Tala AI
- ✅ Show verification results with user counts
- ✅ Display sample of migrated users

### Step 2: Verify Results

After running the migration, you should see output showing:
```
total_users | tala_ai_users | users_without_org
------------|---------------|------------------
     10     |      10       |         0
```

And a sample of migrated users:
```
full_name       | role        | organization_id                      | organization_name
----------------|-------------|--------------------------------------|------------------
Will Smith      | super_admin | 00000000-0000-0000-0000-000000000001 | Tala AI
John Doe        | admin       | 00000000-0000-0000-0000-000000000001 | Tala AI
Jane Agent      | agent       | 00000000-0000-0000-0000-000000000001 | Tala AI
```

### Step 3: Deploy Backend & Frontend

After the database migration is complete:

1. **Deploy Backend to Railway**
   - Push changes to GitHub
   - Railway will auto-deploy with updated organization logic

2. **Deploy Frontend to Vercel**
   - Push changes to GitHub
   - Vercel will auto-deploy with new User Management interface

### Step 4: Test the Changes

1. **Login Test**: Log in to the application
   - Existing users should automatically be assigned to Tala AI on login (if not already assigned)
   - Check that User Management shows Tala AI organization

2. **Create User Test**: Go to Admin → User Management
   - Super-admins should see "Create Organization" button
   - Create a new user without selecting an organization
   - Verify user is assigned to Tala AI by default

3. **Organization Management Test**: In User Management
   - Verify you can see Tala AI organization in the left panel
   - Click Tala AI to see all existing users
   - Verify user counts are correct

## What This Changes

### Database
- All existing users now have `organization_id = '00000000-0000-0000-0000-000000000001'`
- Tala AI organization exists with type 'parent'

### Backend
- New users default to Tala AI organization if no org specified
- Admin users automatically create users in their own organization
- Super-admins can create users in any organization

### Frontend
- Login automatically assigns users to Tala AI if they have no organization
- User Management shows organization-centric interface
- Organizations list in left panel, users in right panel

## Organization Structure After Migration

```
Tala AI (Parent Organization)
├── All existing users (migrated)
├── New users (by default)
└── Shared knowledge base (for all sub-organizations)

Future Sub-Organizations
├── Acme Travel Agency
│   ├── Private users
│   └── Private knowledge base
└── Sunrise Travel
    ├── Private users
    └── Private knowledge base
```

## Rollback (If Needed)

If you need to rollback the migration:

```sql
-- WARNING: This will remove organization assignments
UPDATE user_credits
SET organization_id = NULL
WHERE organization_id = '00000000-0000-0000-0000-000000000001';
```

**Note**: This is NOT recommended as it will break the organization-based access control.

## Troubleshooting

### Users not showing in organization
- Check that migration completed successfully
- Verify organization_id is set in user_credits table
- Clear browser cache and re-login

### Cannot create organization
- Ensure you're logged in as super_admin
- Check Railway logs for any backend errors
- Verify organizations table exists in Supabase

### Organization not appearing in list
- Check that is_active = true for the organization
- Verify frontend is loading organizations from API
- Check browser console for errors

## Support

If you encounter issues:
1. Check Railway logs for backend errors
2. Check browser console for frontend errors
3. Verify all migrations ran successfully in Supabase
4. Ensure environment variables are set correctly in Railway and Vercel
