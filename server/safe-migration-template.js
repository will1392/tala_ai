/**
 * Safe Migration Template
 * 
 * This template ensures migrations cannot accidentally drop tables
 * Copy this template when creating new migrations
 */

export const migration = {
  id: 'XXX_migration_name',
  name: 'Migration Name',
  description: 'What this migration does',

  async up() {
    const supabase = getSupabaseService();
    const results = {
      created: 0,
      modified: 0,
      errors: []
    };

    console.log(`\n🔄 Running migration: ${this.name}`);

    try {
      // YOUR MIGRATION CODE HERE
      // Only use CREATE TABLE IF NOT EXISTS
      // Only use ALTER TABLE for modifications
      // Never use DROP TABLE
      
      // Example safe table creation:
      /*
      const { error } = await supabase.rpc('execute_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS your_table (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      });
      */

      // Record migration completion
      await this.recordMigration(supabase, results);
      
      return results;

    } catch (error) {
      console.error('   ❌ Migration failed:', error.message);
      results.errors.push(error.message);
      throw error;
    }
  },

  async down() {
    // SAFETY: Prevent accidental data loss
    throw new Error(
      `Rollback disabled for safety. 
      To rollback this migration (${this.id}), you must:
      1. Create a backup of affected tables
      2. Manually edit this file to implement the rollback
      3. Run with explicit confirmation
      
      This prevents accidental data loss from rollback commands.`
    );
    
    // If you absolutely need to implement rollback:
    // 1. Comment out the error above
    // 2. Implement SAFE rollback below
    // 3. Use ALTER TABLE to remove columns
    // 4. NEVER use DROP TABLE in production
  },

  async recordMigration(supabase, metadata) {
    try {
      const { error } = await supabase
        .from('migrations')
        .insert({
          id: this.id,
          name: this.name,
          description: this.description,
          applied_by: process.env.USER || 'system',
          status: 'completed',
          metadata
        });

      if (error && error.code !== '23505') {
        console.log('   ⚠️  Could not record migration:', error.message);
      }
    } catch (error) {
      console.log('   ⚠️  Could not record migration:', error.message);
    }
  }
};

export default migration;