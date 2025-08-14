import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { QdrantClient } from '@qdrant/qdrant-js';

// Load environment variables

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase credentials not found in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    // Create conversation_contexts table
    console.log('📋 Creating conversation_contexts table...');
    const { error: contextError } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    });

    if (contextError) {
      console.error('❌ Error creating conversation_contexts table:', contextError);
    } else {
      console.log('✅ conversation_contexts table created successfully');
    }

    // Create any other missing tables here
    console.log('\n✅ Database table setup complete');

  } catch (error) {
    console.error('❌ Error setting up database tables:', error);
    throw error;
  }
}

async function createQdrantCollections() {
  console.log('\n🔧 Setting up Qdrant collections...\n');

  try {
    // Create tala_memories collection
    console.log('📋 Creating tala_memories collection...');
    
    try {
      await qdrant.createCollection('tala_memories', {
        vectors: {
          size: 1536, // OpenAI embedding dimension
          distance: 'Cosine'
        },
        payload_schema: {
          conversation_id: { type: 'keyword' },
          user_id: { type: 'keyword' },
          organization_id: { type: 'keyword' },
          type: { type: 'keyword' },
          timestamp: { type: 'datetime' },
          content: { type: 'text' },
          metadata: { type: 'json' }
        }
      });
      console.log('✅ tala_memories collection created successfully');
    } catch (error) {
      if (error.data?.status?.error?.includes('already exists')) {
        console.log('ℹ️  tala_memories collection already exists');
      } else {
        throw error;
      }
    }

    // Create indexes
    console.log('📋 Creating indexes for tala_memories...');
    await qdrant.createFieldIndex('tala_memories', 'conversation_id', 'keyword');
    await qdrant.createFieldIndex('tala_memories', 'user_id', 'keyword');
    await qdrant.createFieldIndex('tala_memories', 'organization_id', 'keyword');
    await qdrant.createFieldIndex('tala_memories', 'type', 'keyword');
    console.log('✅ Indexes created successfully');

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
    
    console.log('\n🎉 All missing components have been set up successfully!');
    console.log('🔄 Please restart your backend server to apply the changes.');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  }
}

main();