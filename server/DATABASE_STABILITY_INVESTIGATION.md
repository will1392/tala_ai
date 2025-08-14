# Database Stability Investigation Report

## Summary

I've investigated the issue of database tables disappearing in your Supabase instance. Here are my findings and recommendations.

## Root Causes Identified

### 1. **Migration Rollback Functions**
The most concerning finding is that migration files contain `down()` functions that DROP tables:

- `/server/migrations/001_initial_schema.js` has a `down()` function that drops all main tables
- The rollback script at `/server/db/migrations/rollback.js` can execute these down functions
- Helper functions `drop_table_if_exists` and `drop_type_if_exists` are defined in the database

**Risk**: If someone accidentally runs `npm run migrate:rollback` or `npm run migrate:rollback:all`, it will drop tables.

### 2. **No Automatic Migration Execution**
Good news: Migrations are NOT automatically run on server startup. They must be manually triggered via:
- `npm run migrate`
- `npm run migrate:rollback`
- `npm run migrate:rollback:last`
- `npm run migrate:rollback:all`

### 3. **Missing RPC Functions**
Several migration files attempt to use `supabase.rpc('execute_sql')` which may not exist in your Supabase instance. This could cause partial migrations or unexpected behavior.

## Immediate Actions to Prevent Data Loss

### 1. **Disable Rollback Commands**
Remove or comment out dangerous rollback scripts in package.json:

```json
{
  "scripts": {
    // "migrate:rollback": "node db/migrations/rollback.js",
    // "migrate:rollback:last": "node db/migrations/rollback.js last",
    // "migrate:rollback:all": "node db/migrations/rollback.js all",
    "migrate:rollback:disabled": "echo 'Rollback disabled for safety. Contact admin.'"
  }
}
```

### 2. **Remove Down Functions**
Remove or disable the `down()` functions in migration files to prevent accidental table drops:

```javascript
async down() {
  throw new Error('Rollback disabled for safety. Manual intervention required.');
  // Original dangerous code commented out
}
```

### 3. **Enable Supabase Backups**
In your Supabase dashboard (https://xbziiqsqzxniuwhpwyic.supabase.co):
1. Go to Settings → Backups
2. Enable Point-in-Time Recovery (PITR)
3. Set up daily backups
4. Consider upgrading to Pro plan for better backup retention

### 4. **Add Table Protection**
Create a safety check script that verifies critical tables exist:

```javascript
// check-database-health.js
const criticalTables = [
  'user_profiles',
  'conversation_contexts',
  'organizations',
  'users',
  'conversations',
  'messages'
];

async function checkCriticalTables() {
  for (const table of criticalTables) {
    const { error } = await supabase
      .from(table)
      .select('id')
      .limit(1);
    
    if (error && error.code === '42P01') {
      console.error(`CRITICAL: Table '${table}' is missing!`);
      // Send alert, prevent server startup, etc.
    }
  }
}
```

### 5. **Audit Trail**
Add logging to track who runs migrations:

```javascript
// In migration files
console.log(`Migration initiated by: ${process.env.USER || 'unknown'} at ${new Date().toISOString()}`);
```

## Long-term Recommendations

### 1. **Migration Safety**
- Never include DROP TABLE statements in production migrations
- Use ALTER TABLE for schema changes instead of dropping/recreating
- Implement a two-step confirmation for any destructive operations

### 2. **Access Control**
- Limit who has access to run migrations
- Use environment-specific migration permissions
- Consider using Supabase's Row Level Security (RLS) policies

### 3. **Monitoring**
- Set up alerts for when tables are dropped
- Monitor Supabase logs for DDL operations
- Implement health checks that verify table existence

### 4. **Documentation**
- Document all migrations and their effects
- Create runbooks for disaster recovery
- Maintain a schema version history

## Investigation Commands Used

```bash
# Check for DROP TABLE statements
grep -r "DROP TABLE\|drop table" /path/to/server --include="*.js" --include="*.sql"

# Find migration files
find /path/to/server -name "*migration*" -type f

# Check for scheduled jobs
grep -r "cron\|setInterval\|schedule" /path/to/server --include="*.js"
```

## Conclusion

The most likely cause of your disappearing tables is accidental execution of migration rollback commands. The immediate priority is to disable these dangerous operations and implement safeguards to prevent future data loss.

**Critical**: Do NOT run any migration rollback commands until the down() functions have been safely disabled or removed.