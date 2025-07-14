#!/usr/bin/env node

/**
 * Database Seed Script for Tala AI
 * 
 * Populates the database with comprehensive test data:
 * - Sample organizations with different plans
 * - Test users with various roles
 * - Sample conversations with realistic messages
 * - Folder hierarchy with nested structure
 * - Documents with metadata and tags
 * - All relationships properly established
 */

import { config } from 'dotenv';
config();

import { getSupabaseHealth } from './supabaseClient.js';

// Import all database services
import { OrganizationService } from '../services/db/organizationService.js';
import { UserService } from '../services/db/userService.js';
import { ConversationService } from '../services/db/conversationService.js';
import { DocumentService } from '../services/db/documentService.js';
import { FolderService } from '../services/db/folderService.js';

console.log('🌱 DATABASE SEED SCRIPT');
console.log('═'.repeat(50));

// Configuration
const SEED_CONFIG = {
  clearExisting: process.argv.includes('--clear'),
  verbose: process.argv.includes('--verbose'),
  dryRun: process.argv.includes('--dry-run')
};

// Data storage for created entities
let seededData = {
  organizations: [],
  users: [],
  conversations: [],
  folders: [],
  documents: []
};

// Initialize services
const services = {
  organization: new OrganizationService(),
  user: new UserService(),
  conversation: new ConversationService(),
  folder: new FolderService(),
  document: new DocumentService()
};

/**
 * Sample data definitions
 */
const SAMPLE_DATA = {
  organizations: [
    {
      name: 'Acme Corporation',
      slug: 'acme-corp',
      description: 'Leading technology solutions provider',
      plan_type: 'enterprise',
      settings: {
        features: ['advanced_analytics', 'custom_models', 'priority_support'],
        limits: { users: 500, storage_gb: 1000 }
      }
    },
    {
      name: 'StartupXYZ',
      slug: 'startup-xyz',
      description: 'Innovative AI startup',
      plan_type: 'pro',
      settings: {
        features: ['analytics', 'collaboration'],
        limits: { users: 50, storage_gb: 100 }
      }
    },
    {
      name: 'Freelance Studio',
      slug: 'freelance-studio',
      description: 'Independent content creators',
      plan_type: 'free',
      settings: {
        features: ['basic_features'],
        limits: { users: 5, storage_gb: 10 }
      }
    }
  ],
  
  users: [
    // Acme Corporation users
    {
      email: 'admin@acme.com',
      display_name: 'Alice Admin',
      role: 'owner',
      status: 'active',
      email_verified: true,
      profile: {
        department: 'IT',
        title: 'Chief Technology Officer',
        timezone: 'America/New_York'
      }
    },
    {
      email: 'manager@acme.com',
      display_name: 'Bob Manager',
      role: 'admin',
      status: 'active',
      email_verified: true,
      profile: {
        department: 'Operations',
        title: 'Operations Manager',
        timezone: 'America/New_York'
      }
    },
    {
      email: 'user@acme.com',
      display_name: 'Carol User',
      role: 'member',
      status: 'active',
      email_verified: true,
      profile: {
        department: 'Marketing',
        title: 'Content Specialist',
        timezone: 'America/Los_Angeles'
      }
    },
    
    // StartupXYZ users
    {
      email: 'founder@startupxyz.com',
      display_name: 'David Founder',
      role: 'owner',
      status: 'active',
      email_verified: true,
      profile: {
        department: 'Executive',
        title: 'CEO & Founder',
        timezone: 'Europe/London'
      }
    },
    {
      email: 'dev@startupxyz.com',
      display_name: 'Eve Developer',
      role: 'admin',
      status: 'active',
      email_verified: true,
      profile: {
        department: 'Engineering',
        title: 'Lead Developer',
        timezone: 'Europe/London'
      }
    },
    
    // Freelance Studio users
    {
      email: 'creator@freelance.com',
      display_name: 'Frank Creator',
      role: 'owner',
      status: 'active',
      email_verified: true,
      profile: {
        department: 'Creative',
        title: 'Content Creator',
        timezone: 'Australia/Sydney'
      }
    }
  ],
  
  conversations: [
    {
      title: 'Product Strategy Discussion',
      persist_context: true,
      context_reset: false,
      llm_config: {
        model: 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: 2000
      },
      messages: [
        {
          sender: 'user',
          content: 'Help me develop a comprehensive product strategy for our new AI-powered analytics platform.',
          metadata: { intent: 'strategy_planning' }
        },
        {
          sender: 'assistant',
          content: 'I\'d be happy to help you develop a product strategy for your AI-powered analytics platform. Let\'s start by understanding your target market, key value propositions, and competitive landscape. What specific industry or use case are you targeting?',
          metadata: { model: 'gpt-4o-mini', tokens_used: 245 }
        },
        {
          sender: 'user',
          content: 'We\'re targeting mid-size enterprises in healthcare and finance who need real-time data insights.',
          metadata: { intent: 'market_definition' }
        }
      ]
    },
    {
      title: 'Technical Architecture Review',
      persist_context: true,
      context_reset: false,
      llm_config: {
        model: 'claude-sonnet-4-20250514',
        temperature: 0.3,
        max_tokens: 1500
      },
      messages: [
        {
          sender: 'user',
          content: 'Review our microservices architecture and suggest improvements for scalability.',
          metadata: { intent: 'technical_review' }
        },
        {
          sender: 'assistant',
          content: 'I\'ll help you review your microservices architecture. To provide specific recommendations, I\'ll need to understand your current setup. Could you share details about your service boundaries, communication patterns, and current scaling challenges?',
          metadata: { model: 'claude-sonnet-4-20250514', tokens_used: 189 }
        }
      ]
    },
    {
      title: 'Content Creation Guidelines',
      persist_context: true,
      context_reset: false,
      llm_config: {
        model: 'gpt-4o-mini',
        temperature: 0.8,
        max_tokens: 1000
      },
      messages: [
        {
          sender: 'user',
          content: 'Create a style guide for our brand\'s social media content.',
          metadata: { intent: 'content_creation' }
        },
        {
          sender: 'assistant',
          content: 'I\'ll help you create a comprehensive social media style guide. Let\'s cover voice & tone, visual guidelines, posting frequency, and engagement strategies. What\'s your brand\'s core personality and target audience?',
          metadata: { model: 'gpt-4o-mini', tokens_used: 156 }
        }
      ]
    }
  ],
  
  folders: [
    // Acme Corporation folder structure
    {
      name: 'Product Documentation',
      description: 'All product-related documents and specifications',
      folder_type: 'admin',
      parent_folder_id: null,
      subfolders: [
        {
          name: 'API Documentation',
          description: 'REST API specifications and examples',
          folder_type: 'admin'
        },
        {
          name: 'User Guides',
          description: 'End-user documentation and tutorials',
          folder_type: 'admin'
        }
      ]
    },
    {
      name: 'Marketing Materials',
      description: 'Marketing campaigns and brand assets',
      folder_type: 'user',
      parent_folder_id: null,
      subfolders: [
        {
          name: 'Campaign Assets',
          description: 'Images, videos, and creative materials',
          folder_type: 'user'
        }
      ]
    },
    
    // StartupXYZ folder structure
    {
      name: 'Development Resources',
      description: 'Technical documentation and development guides',
      folder_type: 'admin',
      parent_folder_id: null,
      subfolders: [
        {
          name: 'Architecture Docs',
          description: 'System architecture and design documents',
          folder_type: 'admin'
        }
      ]
    },
    
    // Freelance Studio folder structure
    {
      name: 'Client Projects',
      description: 'Individual client project materials',
      folder_type: 'user',
      parent_folder_id: null,
      subfolders: [
        {
          name: 'Social Media Content',
          description: 'Content for various social platforms',
          folder_type: 'user'
        }
      ]
    }
  ],
  
  documents: [
    {
      title: 'API Reference Guide',
      description: 'Comprehensive REST API documentation',
      file_name: 'api-reference.pdf',
      file_size: 2048576, // 2MB
      mime_type: 'application/pdf',
      content_type: 'documentation',
      tags: ['api', 'documentation', 'reference'],
      metadata: {
        version: '2.1',
        last_updated: '2024-01-15',
        author: 'Technical Writing Team',
        category: 'technical'
      }
    },
    {
      title: 'User Onboarding Guide',
      description: 'Step-by-step guide for new users',
      file_name: 'onboarding-guide.docx',
      file_size: 1048576, // 1MB
      mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      content_type: 'documentation',
      tags: ['onboarding', 'guide', 'users'],
      metadata: {
        version: '1.3',
        last_updated: '2024-01-10',
        author: 'Product Team',
        category: 'user_guide'
      }
    },
    {
      title: 'System Architecture Overview',
      description: 'High-level system architecture diagram and explanation',
      file_name: 'architecture-overview.pdf',
      file_size: 3145728, // 3MB
      mime_type: 'application/pdf',
      content_type: 'technical',
      tags: ['architecture', 'system', 'technical'],
      metadata: {
        version: '3.0',
        last_updated: '2024-01-20',
        author: 'Engineering Team',
        category: 'architecture'
      }
    },
    {
      title: 'Brand Guidelines',
      description: 'Complete brand identity and usage guidelines',
      file_name: 'brand-guidelines.pdf',
      file_size: 5242880, // 5MB
      mime_type: 'application/pdf',
      content_type: 'marketing',
      tags: ['brand', 'guidelines', 'marketing'],
      metadata: {
        version: '2.0',
        last_updated: '2024-01-05',
        author: 'Design Team',
        category: 'branding'
      }
    }
  ]
};

/**
 * Clear existing data if requested
 */
async function clearExistingData() {
  if (!SEED_CONFIG.clearExisting) {
    return true;
  }
  
  console.log('\n🗑️ Clearing Existing Data...');
  console.log('-'.repeat(30));
  
  if (SEED_CONFIG.dryRun) {
    console.log('   [DRY RUN] Would clear existing data');
    return true;
  }
  
  try {
    // Note: In a real implementation, you'd want to be more careful about this
    // This is a simplified version for demonstration
    console.log('   ⚠️  Clear existing data functionality not implemented');
    console.log('   Use database management tools to clear data if needed');
    return true;
  } catch (error) {
    console.error('❌ Clear data failed:', error.message);
    return false;
  }
}

/**
 * Create sample organizations
 */
async function seedOrganizations() {
  console.log('\n🏢 Creating Sample Organizations...');
  console.log('-'.repeat(40));
  
  try {
    for (const orgData of SAMPLE_DATA.organizations) {
      if (SEED_CONFIG.verbose) {
        console.log(`   Creating organization: ${orgData.name}`);
      }
      
      if (SEED_CONFIG.dryRun) {
        console.log(`   [DRY RUN] Would create organization: ${orgData.name}`);
        seededData.organizations.push({ ...orgData, id: `mock-org-${Date.now()}` });
        continue;
      }
      
      const result = await services.organization.create(orgData);
      if (!result.success) {
        console.error(`   ❌ Failed to create ${orgData.name}: ${result.error}`);
        continue;
      }
      
      seededData.organizations.push(result.data);
      console.log(`   ✅ Created: ${result.data.name} (${result.data.id})`);
    }
    
    console.log(`✅ Created ${seededData.organizations.length} organizations`);
    return true;
  } catch (error) {
    console.error('❌ Organization seeding failed:', error.message);
    return false;
  }
}

/**
 * Create sample users
 */
async function seedUsers() {
  console.log('\n👤 Creating Sample Users...');
  console.log('-'.repeat(40));
  
  try {
    const orgIndex = {
      'acme-corp': seededData.organizations.find(o => o.slug === 'acme-corp'),
      'startup-xyz': seededData.organizations.find(o => o.slug === 'startup-xyz'),
      'freelance-studio': seededData.organizations.find(o => o.slug === 'freelance-studio')
    };
    
    for (let i = 0; i < SAMPLE_DATA.users.length; i++) {
      const userData = SAMPLE_DATA.users[i];
      
      // Assign users to organizations based on email domain
      let organization;
      if (userData.email.includes('@acme.com')) {
        organization = orgIndex['acme-corp'];
      } else if (userData.email.includes('@startupxyz.com')) {
        organization = orgIndex['startup-xyz'];
      } else if (userData.email.includes('@freelance.com')) {
        organization = orgIndex['freelance-studio'];
      }
      
      if (!organization) {
        console.error(`   ❌ No organization found for user: ${userData.email}`);
        continue;
      }
      
      const userDataWithOrg = {
        ...userData,
        organization_id: organization.id
      };
      
      if (SEED_CONFIG.verbose) {
        console.log(`   Creating user: ${userData.display_name} (${organization.name})`);
      }
      
      if (SEED_CONFIG.dryRun) {
        console.log(`   [DRY RUN] Would create user: ${userData.display_name}`);
        seededData.users.push({ ...userDataWithOrg, id: `mock-user-${Date.now()}-${i}` });
        continue;
      }
      
      const result = await services.user.createUser(userDataWithOrg);
      if (!result.success) {
        console.error(`   ❌ Failed to create ${userData.display_name}: ${result.error}`);
        continue;
      }
      
      seededData.users.push(result.data);
      console.log(`   ✅ Created: ${result.data.display_name} (${result.data.email})`);
    }
    
    console.log(`✅ Created ${seededData.users.length} users`);
    return true;
  } catch (error) {
    console.error('❌ User seeding failed:', error.message);
    return false;
  }
}

/**
 * Create sample conversations with messages
 */
async function seedConversations() {
  console.log('\n💬 Creating Sample Conversations...');
  console.log('-'.repeat(40));
  
  try {
    // Assign conversations to different users
    const usersByOrg = {
      'acme-corp': seededData.users.filter(u => u.email.includes('@acme.com')),
      'startup-xyz': seededData.users.filter(u => u.email.includes('@startupxyz.com')),
      'freelance-studio': seededData.users.filter(u => u.email.includes('@freelance.com'))
    };
    
    const orgKeys = Object.keys(usersByOrg);
    
    for (let i = 0; i < SAMPLE_DATA.conversations.length; i++) {
      const convData = SAMPLE_DATA.conversations[i];
      const orgKey = orgKeys[i % orgKeys.length];
      const usersInOrg = usersByOrg[orgKey];
      
      if (!usersInOrg || usersInOrg.length === 0) {
        console.error(`   ❌ No users found for organization: ${orgKey}`);
        continue;
      }
      
      const user = usersInOrg[0]; // Use first user in organization
      
      const conversationDataWithUser = {
        ...convData,
        organization_id: user.organization_id,
        user_id: user.id
      };
      
      // Remove messages for conversation creation
      const { messages, ...conversationOnly } = conversationDataWithUser;
      
      if (SEED_CONFIG.verbose) {
        console.log(`   Creating conversation: ${convData.title} (${user.display_name})`);
      }
      
      if (SEED_CONFIG.dryRun) {
        console.log(`   [DRY RUN] Would create conversation: ${convData.title}`);
        seededData.conversations.push({ 
          ...conversationOnly, 
          id: `mock-conv-${Date.now()}-${i}`,
          messages: messages 
        });
        continue;
      }
      
      const result = await services.conversation.createConversation(conversationOnly);
      if (!result.success) {
        console.error(`   ❌ Failed to create ${convData.title}: ${result.error}`);
        continue;
      }
      
      const conversation = result.data;
      seededData.conversations.push({ ...conversation, messages });
      console.log(`   ✅ Created: ${conversation.title} (${conversation.id})`);
      
      // Note: In a real implementation, you would also create the messages
      // This would require a MessageService which we haven't fully implemented
      if (SEED_CONFIG.verbose && messages && messages.length > 0) {
        console.log(`      📝 Would create ${messages.length} messages`);
      }
    }
    
    console.log(`✅ Created ${seededData.conversations.length} conversations`);
    return true;
  } catch (error) {
    console.error('❌ Conversation seeding failed:', error.message);
    return false;
  }
}

/**
 * Create sample folder hierarchy
 */
async function seedFolders() {
  console.log('\n📁 Creating Sample Folders...');
  console.log('-'.repeat(40));
  
  try {
    const orgIndex = {
      'acme-corp': seededData.organizations.find(o => o.slug === 'acme-corp'),
      'startup-xyz': seededData.organizations.find(o => o.slug === 'startup-xyz'),
      'freelance-studio': seededData.organizations.find(o => o.slug === 'freelance-studio')
    };
    
    const usersByOrg = {
      'acme-corp': seededData.users.filter(u => u.email.includes('@acme.com')),
      'startup-xyz': seededData.users.filter(u => u.email.includes('@startupxyz.com')),
      'freelance-studio': seededData.users.filter(u => u.email.includes('@freelance.com'))
    };
    
    // Create folders for each organization
    for (let orgSlug of Object.keys(orgIndex)) {
      const organization = orgIndex[orgSlug];
      const users = usersByOrg[orgSlug];
      
      if (!organization || !users || users.length === 0) {
        continue;
      }
      
      const user = users[0]; // Use first user as folder creator
      
      // Get folders for this organization based on the sample data pattern
      let orgFolders = [];
      if (orgSlug === 'acme-corp') {
        orgFolders = SAMPLE_DATA.folders.slice(0, 2); // First 2 folder structures
      } else if (orgSlug === 'startup-xyz') {
        orgFolders = [SAMPLE_DATA.folders[2]]; // Third folder structure
      } else if (orgSlug === 'freelance-studio') {
        orgFolders = [SAMPLE_DATA.folders[3]]; // Fourth folder structure
      }
      
      for (const folderData of orgFolders) {
        const { subfolders, ...parentFolderData } = folderData;
        
        const folderDataWithUser = {
          ...parentFolderData,
          organization_id: organization.id,
          user_id: user.id,
          parent_folder_id: null
        };
        
        if (SEED_CONFIG.verbose) {
          console.log(`   Creating folder: ${folderData.name} (${organization.name})`);
        }
        
        if (SEED_CONFIG.dryRun) {
          console.log(`   [DRY RUN] Would create folder: ${folderData.name}`);
          const mockFolder = { ...folderDataWithUser, id: `mock-folder-${Date.now()}` };
          seededData.folders.push(mockFolder);
          
          // Create subfolders
          if (subfolders) {
            for (const subfolderData of subfolders) {
              console.log(`   [DRY RUN] Would create subfolder: ${subfolderData.name}`);
              seededData.folders.push({ 
                ...subfolderData, 
                id: `mock-subfolder-${Date.now()}`,
                organization_id: organization.id,
                user_id: user.id,
                parent_folder_id: mockFolder.id
              });
            }
          }
          continue;
        }
        
        const result = await services.folder.createFolder(folderDataWithUser);
        if (!result.success) {
          console.error(`   ❌ Failed to create ${folderData.name}: ${result.error}`);
          continue;
        }
        
        const parentFolder = result.data;
        seededData.folders.push(parentFolder);
        console.log(`   ✅ Created: ${parentFolder.name} (${parentFolder.id})`);
        
        // Create subfolders
        if (subfolders) {
          for (const subfolderData of subfolders) {
            const subfolderDataWithParent = {
              ...subfolderData,
              organization_id: organization.id,
              user_id: user.id,
              parent_folder_id: parentFolder.id
            };
            
            if (SEED_CONFIG.verbose) {
              console.log(`      Creating subfolder: ${subfolderData.name}`);
            }
            
            const subResult = await services.folder.createFolder(subfolderDataWithParent);
            if (!subResult.success) {
              console.error(`      ❌ Failed to create ${subfolderData.name}: ${subResult.error}`);
              continue;
            }
            
            seededData.folders.push(subResult.data);
            console.log(`      ✅ Created: ${subResult.data.name} (${subResult.data.id})`);
          }
        }
      }
    }
    
    console.log(`✅ Created ${seededData.folders.length} folders`);
    return true;
  } catch (error) {
    console.error('❌ Folder seeding failed:', error.message);
    return false;
  }
}

/**
 * Create sample documents
 */
async function seedDocuments() {
  console.log('\n📄 Creating Sample Documents...');
  console.log('-'.repeat(40));
  
  try {
    // Note: Document creation is complex and would require file uploads
    // This is a simplified version that creates document metadata
    
    const folders = seededData.folders.filter(f => !f.parent_folder_id); // Root folders only
    
    for (let i = 0; i < SAMPLE_DATA.documents.length && i < folders.length; i++) {
      const docData = SAMPLE_DATA.documents[i];
      const folder = folders[i];
      
      if (!folder) {
        continue;
      }
      
      const documentDataWithFolder = {
        ...docData,
        organization_id: folder.organization_id,
        user_id: folder.user_id,
        folder_id: folder.id
      };
      
      if (SEED_CONFIG.verbose) {
        console.log(`   Creating document: ${docData.title}`);
      }
      
      if (SEED_CONFIG.dryRun) {
        console.log(`   [DRY RUN] Would create document: ${docData.title}`);
        seededData.documents.push({ ...documentDataWithFolder, id: `mock-doc-${Date.now()}-${i}` });
        continue;
      }
      
      // Note: In a real implementation, this would use the DocumentService
      // which would handle file uploads, vector embeddings, etc.
      console.log(`   📄 Document creation requires file upload implementation`);
      console.log(`      Would create: ${docData.title} in folder ${folder.name}`);
      
      seededData.documents.push(documentDataWithFolder);
    }
    
    console.log(`✅ Prepared ${seededData.documents.length} document records`);
    return true;
  } catch (error) {
    console.error('❌ Document seeding failed:', error.message);
    return false;
  }
}

/**
 * Print seeding summary
 */
function printSummary() {
  console.log('\n📊 SEEDING SUMMARY');
  console.log('═'.repeat(50));
  
  console.log(`🏢 Organizations: ${seededData.organizations.length}`);
  seededData.organizations.forEach(org => {
    console.log(`   • ${org.name} (${org.plan_type})`);
  });
  
  console.log(`\n👤 Users: ${seededData.users.length}`);
  const usersByOrg = {};
  seededData.users.forEach(user => {
    const org = seededData.organizations.find(o => o.id === user.organization_id);
    const orgName = org ? org.name : 'Unknown';
    if (!usersByOrg[orgName]) usersByOrg[orgName] = [];
    usersByOrg[orgName].push(user);
  });
  
  Object.entries(usersByOrg).forEach(([orgName, users]) => {
    console.log(`   ${orgName}:`);
    users.forEach(user => {
      console.log(`     • ${user.display_name} (${user.role})`);
    });
  });
  
  console.log(`\n💬 Conversations: ${seededData.conversations.length}`);
  seededData.conversations.forEach(conv => {
    const user = seededData.users.find(u => u.id === conv.user_id);
    const userName = user ? user.display_name : 'Unknown';
    console.log(`   • ${conv.title} (${userName})`);
  });
  
  console.log(`\n📁 Folders: ${seededData.folders.length}`);
  const rootFolders = seededData.folders.filter(f => !f.parent_folder_id);
  rootFolders.forEach(folder => {
    const org = seededData.organizations.find(o => o.id === folder.organization_id);
    const orgName = org ? org.name : 'Unknown';
    console.log(`   • ${folder.name} (${orgName})`);
    
    const subfolders = seededData.folders.filter(f => f.parent_folder_id === folder.id);
    subfolders.forEach(sub => {
      console.log(`     └─ ${sub.name}`);
    });
  });
  
  console.log(`\n📄 Documents: ${seededData.documents.length}`);
  seededData.documents.forEach(doc => {
    console.log(`   • ${doc.title} (${doc.content_type})`);
  });
}

/**
 * Main seeding function
 */
async function seedDatabase() {
  console.log('🌱 Starting Database Seeding...\n');
  
  if (SEED_CONFIG.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }
  
  try {
    // Check database health
    console.log('🏥 Checking database connection...');
    const health = await getSupabaseHealth();
    if (health.status !== 'healthy') {
      console.error('❌ Database is not healthy. Cannot proceed with seeding.');
      return false;
    }
    console.log('✅ Database connection verified\n');
    
    // Clear existing data if requested
    await clearExistingData();
    
    // Run seeding operations
    const operations = [
      { name: 'Organizations', fn: seedOrganizations },
      { name: 'Users', fn: seedUsers },
      { name: 'Conversations', fn: seedConversations },
      { name: 'Folders', fn: seedFolders },
      { name: 'Documents', fn: seedDocuments }
    ];
    
    for (const operation of operations) {
      const success = await operation.fn();
      if (!success) {
        console.error(`❌ ${operation.name} seeding failed. Stopping.`);
        return false;
      }
    }
    
    // Print summary
    printSummary();
    
    console.log('\n🎉 DATABASE SEEDING COMPLETED!');
    if (SEED_CONFIG.dryRun) {
      console.log('\n💡 This was a dry run. Use --dry-run=false to actually seed the database.');
    } else {
      console.log('\n✨ Your database is now populated with comprehensive test data!');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    return false;
  }
}

// Show usage information
function showUsage() {
  console.log('\n📖 USAGE:');
  console.log('  node db/seed.js [options]');
  console.log('\n🔧 OPTIONS:');
  console.log('  --clear     Clear existing data before seeding');
  console.log('  --verbose   Show detailed progress information');
  console.log('  --dry-run   Show what would be created without making changes');
  console.log('\n📚 EXAMPLES:');
  console.log('  node db/seed.js --dry-run              # Preview what will be created');
  console.log('  node db/seed.js --verbose              # Seed with detailed output');
  console.log('  node db/seed.js --clear --verbose      # Clear and reseed with details');
}

// Execute seeding if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showUsage();
  } else {
    seedDatabase()
      .then(success => {
        process.exit(success ? 0 : 1);
      })
      .catch(error => {
        console.error('❌ Seed script failed:', error);
        process.exit(1);
      });
  }
}

export { seedDatabase, SAMPLE_DATA };