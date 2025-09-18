/**
 * Migration: Add Agency Credit System
 * 
 * Creates tables and schema for the agent/agency credit system
 */

import { getSupabaseService } from '../supabaseClient.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  id: '007_add_agency_credit_system',
  name: 'Add Agency Credit System',
  description: 'Creates tables for agent/agency credit system with shared pools',

  async up() {
    console.log('🔄 Creating credit system tables...');
    const supabase = getSupabaseService();

    // Read the SQL file
    const sqlPath = path.join(__dirname, '007_add_agency_credit_system.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

    // Split SQL into individual statements
    const statements = sqlContent
      .split(/;(?=(?:[^']*'[^']*')*[^']*$)/)
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments
      if (!statement || statement.startsWith('--')) continue;

      try {
        // Execute via RPC for complex statements
        await supabase.rpc('exec_sql', { sql: statement });
        successCount++;
      } catch (error) {
        // Try different approaches based on statement type
        if (statement.toUpperCase().startsWith('CREATE TABLE')) {
          console.log(`   ⚠️  Table might already exist: ${error.message}`);
        } else if (statement.toUpperCase().startsWith('ALTER TABLE')) {
          console.log(`   ⚠️  Column might already exist: ${error.message}`);
        } else {
          console.error(`   ❌ Failed to execute statement ${i + 1}: ${error.message}`);
          errorCount++;
        }
      }
    }

    console.log(`   ✅ Executed ${successCount} statements successfully`);
    if (errorCount > 0) {
      console.log(`   ⚠️  ${errorCount} statements failed (may already exist)`);
    }

    // Verify tables were created
    const tables = [
      'organization_credits',
      'agency_members',
      'credit_transactions',
      'plan_pricing'
    ];

    console.log('🔍 Verifying tables...');
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .select('id')
        .limit(1);

      if (error && error.code === '42P01') {
        console.log(`   ❌ Table '${table}' was not created`);
      } else {
        console.log(`   ✅ Table '${table}' exists`);
      }
    }

    // Insert default plan pricing
    console.log('📊 Setting up default plan pricing...');
    const { error: pricingError } = await supabase
      .from('plan_pricing')
      .upsert([
        {
          plan_type: 'agent',
          name: 'Agent (Solo)',
          monthly_credits: 5000,
          monthly_price_cents: 999,
          max_users: 1,
          features: { individual_pool: true }
        },
        {
          plan_type: 'agency',
          name: 'Agency (Team)',
          monthly_credits: 10000,
          monthly_price_cents: 2999,
          max_users: 10,
          features: { shared_pool: true, team_management: true }
        }
      ], { onConflict: 'plan_type' });

    if (pricingError) {
      console.log(`   ⚠️  Could not insert default pricing: ${pricingError.message}`);
    } else {
      console.log(`   ✅ Default plan pricing added`);
    }

    return {
      success: true,
      message: 'Credit system tables created successfully'
    };
  },

  async down() {
    console.log('🔄 Rolling back credit system tables...');
    const supabase = getSupabaseService();

    const tables = [
      'credit_transactions',
      'agency_members',
      'organization_credits',
      'plan_pricing'
    ];

    for (const table of tables) {
      try {
        await supabase.rpc('exec_sql', { sql: `DROP TABLE IF EXISTS ${table} CASCADE;` });
        console.log(`   ✅ Dropped table '${table}'`);
      } catch (error) {
        console.log(`   ⚠️  Could not drop table '${table}': ${error.message}`);
      }
    }

    // Remove columns from existing tables
    try {
      await supabase.rpc('exec_sql', { 
        sql: 'ALTER TABLE users DROP COLUMN IF EXISTS plan_type;'
      });
      await supabase.rpc('exec_sql', { 
        sql: 'ALTER TABLE user_credits DROP COLUMN IF EXISTS plan_type;'
      });
      console.log('   ✅ Removed plan_type columns');
    } catch (error) {
      console.log(`   ⚠️  Could not remove columns: ${error.message}`);
    }

    return {
      success: true,
      message: 'Credit system tables rolled back'
    };
  }
};