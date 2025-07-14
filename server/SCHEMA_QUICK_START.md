# 🚀 Quick Start: Apply Database Schema

## 🎯 Goal
Apply the `db/schema.sql` file to your Supabase PostgreSQL database so you can run migrations.

## ⚡ Fastest Method: Supabase Dashboard

### Step 1: Open Supabase Dashboard
```
📱 Browser → https://supabase.com/dashboard → Your Project
```

### Step 2: Go to SQL Editor
```
🗄️ Left Sidebar → SQL Editor → New Query
```

### Step 3: Copy Schema Content
```bash
# In your terminal:
cd /path/to/tala_ai/server
cat db/schema.sql

# Copy the entire output (Ctrl+A, Ctrl+C)
```

### Step 4: Paste and Run
```
📝 Paste in SQL Editor → Click "Run" button
```

### Step 5: Verify Success
```
📊 Should see: "Success. No rows returned"
🗂️ Check: Table Editor → Should see 9 tables
```

## 🔧 Alternative: Command Line

### Get Your Connection String
```
🗄️ Supabase Dashboard → Settings → Database → Connection string
```

### Apply Schema
```bash
# Replace [PASSWORD] with your actual password
psql "postgresql://postgres:[PASSWORD]@db.abc123.supabase.co:5432/postgres" -f db/schema.sql
```

## ✅ Verification

After applying schema, test it worked:

```bash
npm run apply:schema    # Helper to check schema status
npm run test:migrations # Full migration test
```

Expected output:
```
3️⃣  Testing database connection...
   ✅ Database connected and schema exists
```

## 🚨 Troubleshooting

### "Cannot connect to database"
- ✅ Check SUPABASE_URL in .env file
- ✅ Check SUPABASE_SERVICE_KEY in .env file
- ✅ Verify internet connection

### "Permission denied"
- ✅ Use the postgres user (service key)
- ✅ Check database password is correct

### "Relation already exists"
- ✅ This is normal! Schema is idempotent
- ✅ Continue to next step

## 📋 Quick Checklist

- [ ] Supabase project created
- [ ] Database password available
- [ ] Schema applied via Dashboard or psql
- [ ] 9 tables visible in Table Editor
- [ ] `npm run test:migrations` passes
- [ ] Ready to run `npm run migrate`

## 🎉 Next Steps

Once schema is applied:

1. **Test setup**: `npm run test:migrations`
2. **Check status**: `npm run migrate:status`  
3. **Run migrations**: `npm run migrate`

---

**Need more detail? See `APPLY_SCHEMA_GUIDE.md` for comprehensive instructions!**