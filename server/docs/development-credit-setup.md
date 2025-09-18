# Development Credit System Setup

## Overview

This document explains how the credit system has been configured for development and testing, ensuring that specified users have adequate credits for document search and other operations.

## Changes Made

### 1. Super Admin Unlimited Credits

The credit system now automatically bypasses credit checks for users with `super_admin` role:

- **File Modified**: `/server/services/creditSystem.js`
- **Changes**:
  - `checkCredits()` method now returns unlimited access for super_admin users
  - `consumeCredits()` method logs usage but doesn't deduct credits for super_admin users
  - Maintains audit trail while providing unlimited access

### 2. High Credit Allocation

The existing super_admin user has been allocated extensive credits:

- **User ID**: `59b70373-ba68-4d89-8420-5c3723aef01f`
- **Total Credits**: 1,000,000
- **Bonus Credits**: 1,000,000 
- **Available Credits**: ~2,000,000
- **Role**: `super_admin`

### 3. Management Script

Created a comprehensive script for managing test user credits:

- **Location**: `/server/scripts/manage-test-user-credits.js`
- **Features**:
  - Check user credits
  - Add credits to users
  - Grant super_admin status
  - Create new test users with high credit allocations

## User Status

### Working Users

✅ **59b70373-ba68-4d89-8420-5c3723aef01f**
- Role: super_admin
- Credits: Unlimited (bypass enabled)
- Status: Ready for development/testing

### Invalid Users

❌ **test_user_123**
- Issue: Not a valid UUID format
- Solution: Use the script to create a proper test user or use the existing super_admin user

## Document Search Credits

Document search operations now cost 5 credits per search. With the super_admin bypass:

- Super admin users: **Unlimited searches**
- Regular users: **Limited by their credit balance**
- Cost per search: **5 credits**

## Usage Instructions

### For Development Testing

Use the existing super_admin user ID:
```
59b70373-ba68-4d89-8420-5c3723aef01f
```

### Create New Test Users

```bash
# Create a regular test user with high credits
node scripts/manage-test-user-credits.js create-test-user dev-user@test.com agent 500000

# Create a super admin test user (unlimited credits)
node scripts/manage-test-user-credits.js create-test-user admin@test.com super_admin 1000000
```

### Check User Credits

```bash
node scripts/manage-test-user-credits.js check 59b70373-ba68-4d89-8420-5c3723aef01f
```

### Add More Credits

```bash
node scripts/manage-test-user-credits.js add-credits <user-id> 1000000
```

## Credit System Features

### Bypass Logic

Super admin users automatically bypass credit checks:
- No credits are deducted
- All operations are allowed
- Usage is still logged for audit purposes
- Marked with `bypassReason: 'super_admin_unlimited_access'`

### Cost Structure

Operation costs for reference:
- **Document Search**: 5 credits
- **Document Upload**: 50 credits
- **Chat Message**: 10-150 credits (model dependent)
- **Knowledge Base Search**: 10 credits

### Admin Management

Super admins can manage credits through:
- Admin panel: `/admin/users`
- API endpoints: `/api/admin/users`
- Management script: `scripts/manage-test-user-credits.js`

## Environment Variables

The credit system respects these environment variables:
- `CREDITS_ENABLED`: Set to `false` to disable credits entirely
- Credit costs are configurable in `creditSystem.js`

## Best Practices

1. **Use Super Admin for Development**: Assign super_admin role to development users
2. **Monitor Credit Usage**: Even with unlimited credits, monitor usage patterns
3. **Create Dedicated Test Users**: Don't use production user IDs for testing
4. **Regular Cleanup**: Remove test users periodically

## Troubleshooting

### Common Issues

1. **"Invalid UUID format"**: Ensure user IDs are proper UUIDs
2. **"User not found"**: Create the user first using the management script
3. **"Insufficient credits"**: Add credits or grant super_admin status

### Support Commands

```bash
# Check if user exists
node scripts/manage-test-user-credits.js check <user-id>

# Grant unlimited access
node scripts/manage-test-user-credits.js grant-super-admin <user-id>

# Emergency credit top-up
node scripts/manage-test-user-credits.js add-credits <user-id> 1000000
```

## Security Notes

- Super admin bypass only applies to credit checks, not other security measures
- All operations are still logged and audited
- Role permissions are still enforced separately from credits
- The bypass is clearly marked in transaction logs