// Test schema and configuration structure
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Database Setup...\n');

// Test 1: Check schema file
try {
    const schema = fs.readFileSync('./db/schema.sql', 'utf8');
    const tables = schema.match(/CREATE TABLE (\w+)/g);
    console.log('✅ Schema file found and readable');
    console.log('📊 Tables defined:', tables ? tables.length : 0);
    console.log('📊 Indexes defined:', (schema.match(/CREATE INDEX/g) || []).length);
    console.log('📊 Triggers defined:', (schema.match(/CREATE TRIGGER/g) || []).length);
    console.log('📊 Functions defined:', (schema.match(/CREATE OR REPLACE FUNCTION/g) || []).length);
    
    // Check for required tables
    const requiredTables = ['organizations', 'users', 'conversations', 'messages', 'documents', 'folders', 'tags', 'document_tags', 'primary_folders'];
    console.log('\n📋 Required Tables Check:');
    requiredTables.forEach(table => {
        if (schema.includes(`CREATE TABLE ${table}`)) {
            console.log(`  ✅ ${table} table defined`);
        } else {
            console.log(`  ❌ ${table} table missing`);
        }
    });

    // Check for important features
    console.log('\n🔧 Schema Features:');
    console.log(`  ${schema.includes('uuid_generate_v4()') ? '✅' : '❌'} UUID support`);
    console.log(`  ${schema.includes('ROW LEVEL SECURITY') ? '✅' : '❌'} Row Level Security`);
    console.log(`  ${schema.includes('gin_trgm_ops') ? '✅' : '❌'} Full-text search indexes`);
    console.log(`  ${schema.includes('CASCADE') ? '✅' : '❌'} Foreign key constraints`);
    console.log(`  ${schema.includes('updated_at') ? '✅' : '❌'} Timestamp tracking`);

} catch (error) {
    console.log('❌ Schema file error:', error.message);
}

// Test 2: Check configuration files exist
console.log('\n📁 File Structure Check:');
const requiredFiles = [
    'config/database.js',
    'db/supabaseClient.js', 
    'db/migrate.js',
    'test-database-setup.js',
    'SUPABASE_SETUP_GUIDE.md'
];

requiredFiles.forEach(file => {
    try {
        fs.accessSync(file, fs.constants.F_OK);
        console.log(`  ✅ ${file} exists`);
    } catch (error) {
        console.log(`  ❌ ${file} missing`);
    }
});

// Test 3: Try to load configuration (ES modules need different approach)
console.log('\n⚙️  Configuration Loading:');
try {
    // Check if config file has proper syntax
    const configContent = fs.readFileSync('./config/database.js', 'utf8');
    console.log('  ✅ Database config file is readable');
    console.log(`  ${configContent.includes('validateDatabaseConfig') ? '✅' : '❌'} Validation function present`);
    console.log(`  ${configContent.includes('migrationPhases') ? '✅' : '❌'} Migration phases defined`);
    console.log(`  ${configContent.includes('supabase') ? '✅' : '❌'} Supabase configuration present`);
} catch (error) {
    console.log('  ❌ Database config error:', error.message);
}

// Test 4: Check environment variables are documented
console.log('\n🌍 Environment Variables:');
try {
    const envExample = fs.readFileSync('./env.example', 'utf8');
    const requiredEnvVars = [
        'SUPABASE_URL', 
        'SUPABASE_ANON_KEY', 
        'SUPABASE_SERVICE_KEY',
        'ENABLE_DUAL_WRITE',
        'ENABLE_DATABASE_READ',
        'FALLBACK_TO_JSON'
    ];
    
    requiredEnvVars.forEach(envVar => {
        console.log(`  ${envExample.includes(envVar) ? '✅' : '❌'} ${envVar}`);
    });
} catch (error) {
    console.log('  ❌ .env.example file error:', error.message);
}

// Test 5: Check package.json dependencies
console.log('\n📦 Dependencies Check:');
try {
    const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    const requiredDeps = ['@supabase/supabase-js', 'dotenv'];
    requiredDeps.forEach(dep => {
        console.log(`  ${dependencies[dep] ? '✅' : '❌'} ${dep}${dependencies[dep] ? ` (${dependencies[dep]})` : ''}`);
    });
} catch (error) {
    console.log('  ❌ Package.json error:', error.message);
}

// Test 6: Analyze schema complexity
console.log('\n📊 Schema Analysis:');
try {
    const schema = fs.readFileSync('./db/schema.sql', 'utf8');
    
    // Count different types of constraints and features
    const features = {
        'Primary Keys': (schema.match(/PRIMARY KEY/g) || []).length,
        'Foreign Keys': (schema.match(/REFERENCES/g) || []).length,
        'Unique Constraints': (schema.match(/UNIQUE/g) || []).length,
        'Check Constraints': (schema.match(/CONSTRAINT.*CHECK/g) || []).length,
        'JSONB Columns': (schema.match(/JSONB/g) || []).length,
        'Timestamp Columns': (schema.match(/TIMESTAMP WITH TIME ZONE/g) || []).length,
        'Enum Constraints': (schema.match(/CHECK.*IN \(/g) || []).length
    };

    Object.entries(features).forEach(([feature, count]) => {
        console.log(`  📈 ${feature}: ${count}`);
    });

} catch (error) {
    console.log('  ❌ Schema analysis error:', error.message);
}

// Test 7: Check for migration safety features
console.log('\n🛡️  Migration Safety Features:');
try {
    const migrateContent = fs.readFileSync('./db/migrate.js', 'utf8');
    const setupContent = fs.readFileSync('./test-database-setup.js', 'utf8');
    
    const safetyFeatures = [
        ['Dry run support', migrateContent.includes('dryRun')],
        ['Schema validation', setupContent.includes('checkSchemaStatus')],
        ['Connection testing', setupContent.includes('testDatabaseConnection')],
        ['Health checks', setupContent.includes('getSupabaseHealth')],
        ['Rollback guidance', fs.existsSync('./SUPABASE_SETUP_GUIDE.md')],
        ['Migration phases', migrateContent.includes('PHASE_')]
    ];

    safetyFeatures.forEach(([feature, present]) => {
        console.log(`  ${present ? '✅' : '❌'} ${feature}`);
    });

} catch (error) {
    console.log('  ❌ Migration safety check error:', error.message);
}

console.log('\n🏁 Database Setup Validation Complete!');
console.log('\n💡 Next Steps:');
console.log('  1. Create Supabase project at https://supabase.com');
console.log('  2. Add credentials to .env file');
console.log('  3. Run: node test-database-setup.js');
console.log('  4. Run: node db/migrate.js full --dry-run');
console.log('  5. Run: node db/migrate.js full');