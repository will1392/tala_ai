/**
 * Run Integration Tables Migration
 * Creates the integration_configs table needed for Gmail OAuth token storage
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSupabaseService } from './db/supabaseClient.js';


const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function runIntegrationMigration() {
    console.log('🚀 Running integration tables migration...\n');

    try {
        const supabase = getSupabaseService();
        
        // First, check if the table already exists
        console.log('🔍 Checking if integration_configs table exists...');
        const { data: checkData, error: checkError } = await supabase
            .from('integration_configs')
            .select('id')
            .limit(1);

        if (!checkError || !checkError.message.includes('does not exist')) {
            console.log('✅ integration_configs table already exists!');
            return;
        }

        console.log('📋 Table does not exist. Creating integration_configs table...');
        
        // Since we can't execute raw SQL through Supabase client,
        // we'll provide instructions for manual migration
        console.log('\n⚠️  MANUAL MIGRATION REQUIRED');
        console.log('=' .repeat(50));
        console.log('\nThe integration_configs table needs to be created manually.');
        console.log('\n📋 Steps to create the table:');
        console.log('\n1. Go to your Supabase Dashboard');
        console.log('2. Navigate to the SQL Editor');
        console.log('3. Run the following SQL:\n');
        
        const createTableSQL = `-- Create integration_configs table for OAuth token storage
CREATE TABLE IF NOT EXISTS integration_configs (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    integration_id VARCHAR(50) NOT NULL,
    config TEXT NOT NULL, -- Encrypted OAuth tokens
    status VARCHAR(20) DEFAULT 'active',
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_sync_at TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_user_integration (user_id, integration_id),
    INDEX idx_status (status),
    INDEX idx_enabled (enabled)
);

-- Enable Row Level Security
ALTER TABLE integration_configs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own integrations" ON integration_configs
    FOR SELECT USING (user_id = auth.uid()::text);

CREATE POLICY "Users can insert own integrations" ON integration_configs
    FOR INSERT WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Users can update own integrations" ON integration_configs
    FOR UPDATE USING (user_id = auth.uid()::text);

CREATE POLICY "Users can delete own integrations" ON integration_configs
    FOR DELETE USING (user_id = auth.uid()::text);`;
        
        console.log(createTableSQL);
        console.log('\n4. After running the SQL, restart your backend server');
        console.log('\n💡 Alternative: Use the full migration at server/migrations/003_create_integration_tables.sql');
        console.log('=' .repeat(50));

    } catch (error) {
        console.error('❌ Migration check failed:', error.message);
        process.exit(1);
    }
}

// Run the migration
runIntegrationMigration();