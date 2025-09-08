#!/usr/bin/env node

/**
 * Script to help upload knowledge base files for AI agents
 * Usage: node upload-knowledge.js
 */

const path = require('path');
const fs = require('fs');

// Configuration
const KNOWLEDGE_BASE_ROOT = path.join(__dirname, '../knowledge');
const CHANNELS = ['direct_mail', 'seo', 'ppc', 'meta_ads', 'email_marketing'];

console.log('🚀 Tala AI Knowledge Base Upload Helper\n');

console.log('Current knowledge base structure:');
console.log(`📁 ${KNOWLEDGE_BASE_ROOT}`);

CHANNELS.forEach(channel => {
  const channelPath = path.join(KNOWLEDGE_BASE_ROOT, channel);
  if (fs.existsSync(channelPath)) {
    console.log(`  ├── 📂 ${channel}/`);
    const subdirs = fs.readdirSync(channelPath).filter(f => 
      fs.statSync(path.join(channelPath, f)).isDirectory()
    );
    subdirs.forEach((dir, idx) => {
      const prefix = idx === subdirs.length - 1 ? '└──' : '├──';
      console.log(`  │   ${prefix} ${dir}/`);
    });
  } else {
    console.log(`  ├── 📂 ${channel}/ (not created yet)`);
  }
});

console.log('\n📝 Instructions for adding your files:\n');

console.log('1. Copy your files directly:');
console.log(`   cp /path/to/your/files/*.md ${KNOWLEDGE_BASE_ROOT}/direct_mail/fundamentals/`);

console.log('\n2. Or drag and drop files into these folders:');
console.log(`   ${KNOWLEDGE_BASE_ROOT}/direct_mail/fundamentals/`);
console.log(`   ${KNOWLEDGE_BASE_ROOT}/direct_mail/design/`);
console.log(`   ${KNOWLEDGE_BASE_ROOT}/direct_mail/campaigns/`);

console.log('\n3. Supported file formats:');
console.log('   - .md (Markdown) - Preferred');
console.log('   - .txt (Plain text)');
console.log('   - .pdf (Will need conversion)');
console.log('   - .docx (Will need conversion)');

console.log('\n4. File naming conventions:');
console.log('   - Use kebab-case: direct-mail-basics.md');
console.log('   - Be descriptive: audience-segmentation-strategies.md');
console.log('   - Avoid spaces and special characters');

console.log('\n✨ After adding files, run the ingestion script:');
console.log('   npm run ingest:direct-mail');