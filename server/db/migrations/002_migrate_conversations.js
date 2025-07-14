/**
 * Migration: 002_migrate_conversations
 * 
 * Migrates conversations and messages from JSON file to database
 * Preserves all IDs, timestamps, and metadata
 */

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { getSupabaseService } from '../supabaseClient.js';

export const migration = {
  id: '002_migrate_conversations',
  name: 'Migrate Conversations',
  description: 'Migrates conversations and messages from conversations.json to database',

  /**
   * Run the migration
   */
  async up() {
    const supabase = getSupabaseService();
    const results = {
      conversations_migrated: 0,
      messages_migrated: 0,
      users_created: 0,
      errors: [],
      warnings: []
    };

    console.log('\n🔄 Running migration: 002_migrate_conversations');
    console.log('━'.repeat(50));

    try {
      // Step 1: Read conversations.json
      console.log('\n1️⃣  Reading conversations.json...');
      const conversationsPath = path.join(process.cwd(), 'conversations.json');
      
      let conversationsData;
      let messagesData;
      try {
        const fileContent = await fs.readFile(conversationsPath, 'utf8');
        const jsonData = JSON.parse(fileContent);
        
        // Handle the nested structure: { "conversations": [[id, data], ...], "messages": [[id, [msgs]], ...] }
        conversationsData = {};
        messagesData = {};
        
        if (jsonData.conversations && Array.isArray(jsonData.conversations)) {
          for (const [convId, convData] of jsonData.conversations) {
            conversationsData[convId] = convData;
          }
        }
        
        if (jsonData.messages && Array.isArray(jsonData.messages)) {
          for (const [convId, messages] of jsonData.messages) {
            messagesData[convId] = messages;
          }
        }
        
        console.log(`   ✅ Found ${Object.keys(conversationsData).length} conversations`);
      } catch (error) {
        if (error.code === 'ENOENT') {
          console.log('   ℹ️  No conversations.json found - skipping');
          return results;
        }
        throw error;
      }

      // Step 2: Get default organization
      console.log('\n2️⃣  Getting default organization...');
      const { data: orgs, error: orgError } = await supabase
        .from('organizations')
        .select('id')
        .limit(1)
        .single();

      if (orgError || !orgs) {
        throw new Error('No organization found. Run 001_initial_schema migration first.');
      }
      
      const defaultOrgId = orgs.id;
      console.log(`   ✅ Using organization: ${defaultOrgId}`);

      // Step 3: Get or create users map
      console.log('\n3️⃣  Preparing user mapping...');
      const userMap = new Map();
      
      // Get existing admin user
      const { data: adminUser } = await supabase
        .from('users')
        .select('id')
        .eq('organization_id', defaultOrgId)
        .limit(1)
        .single();

      if (!adminUser?.id) {
        throw new Error('No admin user found. Run 001_initial_schema migration first.');
      }
      const defaultUserId = adminUser.id;
      
      // Extract unique user IDs from conversations
      const uniqueUserIds = new Set();
      Object.values(conversationsData).forEach(conv => {
        if (conv.userId) uniqueUserIds.add(conv.userId);
        if (conv.messages) {
          conv.messages.forEach(msg => {
            if (msg.userId) uniqueUserIds.add(msg.userId);
          });
        }
      });

      console.log(`   📊 Found ${uniqueUserIds.size} unique user IDs`);

      // Create users if they don't exist (handle non-UUID user IDs)
      for (const userId of uniqueUserIds) {
        // Check if userId is a valid UUID format
        const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
        
        if (!isValidUUID) {
          console.log(`   ⚠️  Invalid UUID format for user ${userId}, mapping to default user`);
          userMap.set(userId, defaultUserId);
          results.warnings.push(`User ${userId} mapped to default user (invalid UUID format)`);
          continue;
        }

        // Check if user exists
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('id', userId)
          .eq('organization_id', defaultOrgId)
          .single();

        if (existingUser) {
          userMap.set(userId, userId);
        } else {
          // Create new user
          const { data: newUser, error: userError } = await supabase
            .from('users')
            .insert({
              id: userId,
              organization_id: defaultOrgId,
              email: `${userId}@migrated.local`,
              email_verified: true,
              display_name: userId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              role: 'member',
              status: 'active',
              preferences: {},
              llm_preferences: {
                preferredModel: null,
                costOptimization: false,
                maxTokens: 1000,
                temperature: 0.7
              },
              metadata: {
                migrated: true,
                migrationDate: new Date().toISOString()
              }
            })
            .select()
            .single();

          if (userError) {
            console.log(`   ⚠️  Could not create user ${userId}: ${userError.message}`);
            userMap.set(userId, defaultUserId); // Fallback to default user
            results.warnings.push(`User ${userId} creation failed, using default user`);
          } else {
            userMap.set(userId, newUser.id);
            results.users_created++;
          }
        }
      }

      console.log(`   ✅ User mapping ready (${results.users_created} new users created)`);

      // Step 4: Migrate conversations
      console.log('\n4️⃣  Migrating conversations...');
      let convCount = 0;
      const totalConvs = Object.keys(conversationsData).length;

      for (const [convId, conv] of Object.entries(conversationsData)) {
        convCount++;
        
        try {
          // Skip if already migrated
          const { data: existing } = await supabase
            .from('conversations')
            .select('id')
            .eq('id', convId)
            .single();

          if (existing) {
            console.log(`   ⏭️  Conversation ${convId} already exists - skipping`);
            continue;
          }

          // Generate new UUID for database, store original ID in metadata
          const { data: newConvId } = await supabase.rpc('uuid_generate_v4');
          const conversationId = newConvId || crypto.randomUUID();
          
          // Prepare conversation data
          const conversationData = {
            id: conversationId,
            organization_id: defaultOrgId,
            user_id: userMap.get(conv.userId) || defaultUserId,
            title: conv.title || 'Untitled Conversation',
            description: conv.description || null,
            status: conv.archived ? 'archived' : 'active',
            preferred_model: conv.model || null,
            temperature: conv.temperature || 0.7,
            max_tokens: conv.maxTokens || 1000,
            tags: conv.tags || [],
            metadata: {
              migrated: true,
              originalId: convId,
              originalData: {
                createdAt: conv.createdAt,
                model: conv.model,
                ...conv.metadata
              }
            },
            created_at: conv.createdAt || conv.timestamp || new Date().toISOString(),
            updated_at: conv.updatedAt || conv.lastMessageAt || conv.createdAt || new Date().toISOString(),
            last_message_at: conv.lastMessageAt || conv.updatedAt || conv.createdAt || new Date().toISOString()
          };

          // If conversation has archived_at, set it
          if (conv.archived && conv.archivedAt) {
            conversationData.archived_at = conv.archivedAt;
          }

          // Insert conversation
          const { error: convError } = await supabase
            .from('conversations')
            .insert(conversationData);

          if (convError) {
            throw new Error(`Failed to insert conversation ${convId}: ${convError.message}`);
          }

          results.conversations_migrated++;

          // Step 5: Migrate messages for this conversation
          const conversationMessages = messagesData[convId] || [];
          if (conversationMessages.length > 0) {
            console.log(`   📝 Migrating ${conversationMessages.length} messages for conversation ${convCount}/${totalConvs}...`);
            
            const messages = conversationMessages.map((msg, index) => {
              // Generate new UUID for database, store original ID in metadata
              const originalMessageId = msg.id || `${convId}_msg_${index}`;
              const messageId = crypto.randomUUID();
              
              return {
                id: messageId,
                conversation_id: conversationId,
                sender: (msg.sender === 'tala' || msg.role === 'assistant') ? 'assistant' : 'user',
                content: msg.content || '',
                model_used: msg.model || conv.model || null,
                provider: msg.provider || this.inferProvider(msg.model || conv.model),
                prompt_tokens: msg.metadata?.usage?.prompt_tokens || null,
                completion_tokens: msg.metadata?.usage?.completion_tokens || null,
                total_tokens: msg.tokens || null,
                cost: msg.metadata?.cost || null,
                response_time_ms: msg.metadata?.responseTime || null,
                status: 'sent',
                message_index: index,
                metadata: {
                  migrated: true,
                  originalId: originalMessageId,
                  originalConversationId: convId,
                  userId: msg.userId || conv.userId,
                  originalData: {
                    ...msg.metadata,
                    sources: msg.sources,
                    entities: msg.entities,
                    attachments: msg.attachments,
                    feedback: msg.feedback,
                    tokensUsed: msg.tokensUsed,
                    routing: msg.routing
                  }
                },
                created_at: msg.timestamp || msg.createdAt || new Date(Date.now() + index).toISOString()
              };
            });

            // Batch insert messages
            const batchSize = 100;
            for (let i = 0; i < messages.length; i += batchSize) {
              const batch = messages.slice(i, i + batchSize);
              const { error: msgError } = await supabase
                .from('messages')
                .insert(batch);

              if (msgError) {
                results.warnings.push(`Failed to insert messages for ${convId}: ${msgError.message}`);
                console.log(`   ⚠️  Failed to insert messages batch: ${msgError.message}`);
              } else {
                results.messages_migrated += batch.length;
              }
            }
          }

          if (convCount % 10 === 0) {
            console.log(`   📊 Progress: ${convCount}/${totalConvs} conversations migrated`);
          }

        } catch (error) {
          results.errors.push(`Conversation ${convId}: ${error.message}`);
          console.log(`   ❌ Failed to migrate conversation ${convId}: ${error.message}`);
        }
      }

      // Step 6: Update statistics
      console.log('\n5️⃣  Updating statistics...');
      console.log(`   ✅ Conversations migrated: ${results.conversations_migrated}`);
      console.log(`   ✅ Messages migrated: ${results.messages_migrated}`);
      console.log(`   ✅ Users created: ${results.users_created}`);
      if (results.warnings.length > 0) {
        console.log(`   ⚠️  Warnings: ${results.warnings.length}`);
      }

      // Record successful migration
      await this.recordMigration(supabase, 'completed', results);

      console.log('\n✅ Migration 002_migrate_conversations completed successfully');
      return results;

    } catch (error) {
      console.error('\n❌ Migration failed:', error.message);
      results.errors.push(error.message);
      
      // Record failed migration
      await this.recordMigration(supabase, 'failed', results);
      
      throw error;
    }
  },

  /**
   * Rollback the migration
   */
  async down() {
    const supabase = getSupabaseService();
    console.log('\n🔄 Rolling back migration: 002_migrate_conversations');
    console.log('━'.repeat(50));

    try {
      // Get migration metadata to know what was created
      const { data: migrationData } = await supabase
        .from('migrations')
        .select('metadata')
        .eq('id', this.id)
        .single();

      // Delete messages first (foreign key constraint)
      console.log('\n1️⃣  Removing migrated messages...');
      const { error: msgError } = await supabase
        .from('messages')
        .delete()
        .eq('metadata->>migrated', 'true');

      if (msgError) {
        console.log(`   ⚠️  Could not remove messages: ${msgError.message}`);
      } else {
        console.log('   ✅ Messages removed');
      }

      // Delete conversations
      console.log('\n2️⃣  Removing migrated conversations...');
      const { error: convError } = await supabase
        .from('conversations')
        .delete()
        .eq('metadata->>migrated', 'true');

      if (convError) {
        console.log(`   ⚠️  Could not remove conversations: ${convError.message}`);
      } else {
        console.log('   ✅ Conversations removed');
      }

      // Delete created users
      console.log('\n3️⃣  Removing migrated users...');
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('metadata->>migrated', 'true');

      if (userError) {
        console.log(`   ⚠️  Could not remove users: ${userError.message}`);
      } else {
        console.log('   ✅ Users removed');
      }

      // Remove migration record
      await supabase
        .from('migrations')
        .delete()
        .eq('id', this.id);

      console.log('\n✅ Rollback completed successfully');
      
    } catch (error) {
      console.error('\n❌ Rollback failed:', error.message);
      throw error;
    }
  },

  /**
   * Infer LLM provider from model name
   */
  inferProvider(model) {
    if (!model) return null;
    
    const modelLower = model.toLowerCase();
    if (modelLower.includes('gpt')) return 'openai';
    if (modelLower.includes('claude')) return 'anthropic';
    if (modelLower.includes('gemini')) return 'google';
    if (modelLower.includes('llama')) return 'meta';
    if (modelLower.includes('mistral')) return 'mistral';
    
    return 'unknown';
  },

  /**
   * Record migration in database
   */
  async recordMigration(supabase, status, metadata) {
    try {
      await supabase
        .from('migrations')
        .upsert({
          id: this.id,
          name: this.name,
          description: this.description,
          status,
          metadata,
          applied_at: new Date().toISOString(),
          applied_by: 'migration-script'
        });
    } catch (error) {
      console.warn('   ⚠️  Could not record migration status:', error.message);
    }
  }
};

export default migration;