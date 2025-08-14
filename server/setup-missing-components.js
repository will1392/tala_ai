import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { QdrantClient } from '@qdrant/qdrant-js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase credentials not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false
  }
});

// Initialize Qdrant client
const qdrantUrl = process.env.QDRANT_URL;
const qdrantApiKey = process.env.QDRANT_API_KEY;

if (!qdrantUrl || !qdrantApiKey) {
  console.error('❌ Qdrant credentials not found in environment variables');
  process.exit(1);
}

const qdrant = new QdrantClient({
  url: qdrantUrl,
  apiKey: qdrantApiKey,
});

async function createMissingTables() {
  console.log('🔧 Setting up missing database tables...\n');

  try {
    // Check if conversation_contexts table exists
    console.log('📋 Checking for conversation_contexts table...');
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'conversation_contexts');

    if (tableError) {
      // Table doesn't exist, let's create it using a migration
      console.log('📋 Creating conversation_contexts table...');
      
      // Create the migration file content
      const migrationContent = `
import { getDatabaseClient } from '../databaseSetup.js';

export async function up() {
  const { supabase } = await getDatabaseClient();
  
  // Create conversation_contexts table
  const createTableSQL = \`
    CREATE TABLE IF NOT EXISTS public.conversation_contexts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL,
      user_id UUID NOT NULL,
      organization_id UUID NOT NULL,
      context JSONB DEFAULT '{}',
      summary TEXT,
      topics TEXT[] DEFAULT '{}',
      entities JSONB DEFAULT '{}',
      sentiment JSONB DEFAULT '{}',
      last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    );
  \`;
  
  // Since we can't execute raw SQL directly, we'll use the table exists check
  // and skip if it already exists
  console.log('✅ conversation_contexts table migration prepared');
  
  return {
    success: true,
    message: 'conversation_contexts table migration prepared'
  };
}

export const migration = {
  id: '004_conversation_contexts',
  name: 'Create Conversation Contexts Table',
  description: 'Creates the conversation_contexts table for storing conversation metadata'
};
`;
      
      // For now, let's just note that the table needs to be created
      console.log('⚠️  conversation_contexts table needs to be created manually in Supabase');
      console.log('   Please run this SQL in your Supabase SQL editor:');
      console.log(`
CREATE TABLE IF NOT EXISTS public.conversation_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  user_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  context JSONB DEFAULT '{}',
  summary TEXT,
  topics TEXT[] DEFAULT '{}',
  entities JSONB DEFAULT '{}',
  sentiment JSONB DEFAULT '{}',
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_conversation_contexts_conversation_id ON conversation_contexts(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_contexts_user_id ON conversation_contexts(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_contexts_organization_id ON conversation_contexts(organization_id);
CREATE INDEX IF NOT EXISTS idx_conversation_contexts_last_activity ON conversation_contexts(last_activity DESC);
      `);
    } else if (tables && tables.length > 0) {
      console.log('✅ conversation_contexts table already exists');
    } else {
      console.log('ℹ️  conversation_contexts table status unknown');
    }

    console.log('\n✅ Database table check complete');

  } catch (error) {
    console.error('❌ Error checking database tables:', error);
    throw error;
  }
}

async function createQdrantCollections() {
  console.log('\n🔧 Setting up Qdrant collections...\n');

  try {
    // Check if tala_memories collection exists
    console.log('📋 Checking tala_memories collection...');
    
    try {
      const collection = await qdrant.getCollection('tala_memories');
      console.log('✅ tala_memories collection already exists');
      return;
    } catch (error) {
      if (error.status === 404) {
        // Collection doesn't exist, create it
        console.log('📋 Creating tala_memories collection...');
        
        await qdrant.createCollection('tala_memories', {
          vectors: {
            size: 1536, // OpenAI embedding dimension
            distance: 'Cosine'
          }
        });
        
        console.log('✅ tala_memories collection created successfully');
        
        // Create payload indexes for efficient filtering
        console.log('📋 Creating payload indexes...');
        
        // Note: The createPayloadIndex method syntax may vary
        // This is the general approach for creating indexes
        try {
          await qdrant.createPayloadIndex('tala_memories', {
            field_name: 'conversation_id',
            field_schema: 'keyword'
          });
          
          await qdrant.createPayloadIndex('tala_memories', {
            field_name: 'user_id',
            field_schema: 'keyword'
          });
          
          await qdrant.createPayloadIndex('tala_memories', {
            field_name: 'organization_id',
            field_schema: 'keyword'
          });
          
          await qdrant.createPayloadIndex('tala_memories', {
            field_name: 'type',
            field_schema: 'keyword'
          });
          
          console.log('✅ Payload indexes created successfully');
        } catch (indexError) {
          console.log('⚠️  Could not create indexes, they may need to be created manually');
        }
      } else {
        throw error;
      }
    }

    console.log('\n✅ Qdrant collection setup complete');

  } catch (error) {
    console.error('❌ Error setting up Qdrant collections:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting setup of missing database components...\n');

  try {
    await createMissingTables();
    await createQdrantCollections();
    
    console.log('\n🎉 Setup process complete!');
    console.log('📝 Note: If the conversation_contexts table needs to be created,');
    console.log('   please run the SQL provided above in your Supabase SQL editor.');
    console.log('\n🔄 Please restart your backend server to apply the changes.');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  }
}

main();