/**
 * Migration: 002_migrate_conversations
 * Description: Migrates conversations and messages from JSON files to PostgreSQL
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

class MigrateConversationsMigration {
  constructor(supabaseUrl, supabaseKey) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.migrationName = '002_migrate_conversations';
  }

  async up() {
    console.log(`Running migration: ${this.migrationName}`);
    
    try {
      // Check if migration has already been run
      const hasRun = await this.hasMigrationRun();
      if (hasRun) {
        console.log(`Migration ${this.migrationName} has already been applied. Skipping...`);
        return;
      }

      // Get default organization
      const { data: org } = await this.supabase
        .from('organizations')
        .select('*')
        .eq('slug', 'default')
        .single();

      if (!org) {
        throw new Error('Default organization not found. Run 001_initial_schema first.');
      }

      // Load conversations from JSON
      const conversationsPath = path.join(__dirname, '..', 'conversations.json');
      const conversationsData = await fs.readFile(conversationsPath, 'utf8');
      const { conversations, messages } = JSON.parse(conversationsData);

      // Migrate conversations
      console.log(`Migrating ${conversations.length} conversations...`);
      let conversationCount = 0;
      let messageCount = 0;

      for (const [conversationId, conversationData] of conversations) {
        try {
          // Check if user exists
          const { data: user } = await this.supabase
            .from('users')
            .select('*')
            .eq('id', conversationData.userId)
            .single();

          if (!user) {
            console.log(`User ${conversationData.userId} not found. Creating...`);
            const { error: userError } = await this.supabase
              .from('users')
              .insert({
                id: conversationData.userId,
                email: `${conversationData.userId}@tala.ai`,
                role: 'agent',
                organization_id: org.id,
                profile: {
                  firstName: conversationData.userId.split('-')[0],
                  lastName: 'User'
                }
              });

            if (userError && !userError.message.includes('duplicate')) {
              console.error(`Error creating user ${conversationData.userId}:`, userError);
              continue;
            }
          }

          // Insert conversation
          const { error: convError } = await this.supabase
            .from('conversations')
            .insert({
              id: conversationData.id,
              user_id: conversationData.userId,
              organization_id: org.id,
              title: conversationData.title,
              created_at: conversationData.createdAt,
              updated_at: conversationData.lastActivity,
              metadata: {
                messageCount: conversationData.messageCount,
                lastMessage: conversationData.lastMessage
              }
            });

          if (convError && !convError.message.includes('duplicate')) {
            console.error(`Error inserting conversation ${conversationId}:`, convError);
            continue;
          }

          conversationCount++;

          // Migrate messages for this conversation
          const conversationMessages = messages.find(([id]) => id === conversationId);
          if (conversationMessages && conversationMessages[1]) {
            for (const message of conversationMessages[1]) {
              const { error: msgError } = await this.supabase
                .from('messages')
                .insert({
                  id: message.id,
                  conversation_id: conversationData.id,
                  content: message.content,
                  sender: message.sender === 'tala' ? 'assistant' : message.sender,
                  created_at: message.timestamp,
                  metadata: {
                    sources: message.sources || [],
                    tokensUsed: message.tokensUsed,
                    model: message.model,
                    routing: message.routing,
                    entities: message.entities || []
                  }
                });

              if (msgError && !msgError.message.includes('duplicate')) {
                console.error(`Error inserting message ${message.id}:`, msgError);
                continue;
              }

              messageCount++;
            }
          }
        } catch (error) {
          console.error(`Error processing conversation ${conversationId}:`, error);
        }
      }

      console.log(`Migrated ${conversationCount} conversations and ${messageCount} messages`);

      // Record migration as complete
      await this.recordMigration();
      
      console.log(`Migration ${this.migrationName} completed successfully`);
    } catch (error) {
      console.error(`Error running migration ${this.migrationName}:`, error);
      throw error;
    }
  }

  async down() {
    console.log(`Rolling back migration: ${this.migrationName}`);
    
    try {
      // Load conversation IDs from JSON to delete only migrated data
      const conversationsPath = path.join(__dirname, '..', 'conversations.json');
      const conversationsData = await fs.readFile(conversationsPath, 'utf8');
      const { conversations } = JSON.parse(conversationsData);

      const conversationIds = conversations.map(([id]) => id);

      // Delete messages
      const { error: msgError } = await this.supabase
        .from('messages')
        .delete()
        .in('conversation_id', conversationIds);

      if (msgError) {
        console.error('Error deleting messages:', msgError);
      }

      // Delete conversations
      const { error: convError } = await this.supabase
        .from('conversations')
        .delete()
        .in('id', conversationIds);

      if (convError) {
        console.error('Error deleting conversations:', convError);
      }

      // Remove migration record
      await this.removeMigrationRecord();
      
      console.log(`Migration ${this.migrationName} rolled back successfully`);
    } catch (error) {
      console.error(`Error rolling back migration ${this.migrationName}:`, error);
      throw error;
    }
  }

  async hasMigrationRun() {
    const { data, error } = await this.supabase
      .from('migrations')
      .select('*')
      .eq('name', this.migrationName)
      .single();
    
    return !!data;
  }

  async recordMigration() {
    const { error } = await this.supabase
      .from('migrations')
      .insert({
        name: this.migrationName,
        applied_at: new Date().toISOString()
      });

    if (error) {
      throw error;
    }
  }

  async removeMigrationRecord() {
    const { error } = await this.supabase
      .from('migrations')
      .delete()
      .eq('name', this.migrationName);

    if (error) {
      throw error;
    }
  }
}

module.exports = MigrateConversationsMigration;