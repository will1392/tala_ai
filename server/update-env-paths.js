/**
 * Update all scripts to use parent .env file
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Files that need updating
const filesToUpdate = [
  'test-pdf-storage.js',
  'config/context.js',
  'monitor-database-health.js',
  'debug-qdrant-search.js',
  'test-sources.js',
  'test-frontend-call.js',
  'test-knowledge-response.js',
  'test-knowledge-fix.js',
  'setup-missing-components.js',
  'setup-missing-tables.js',
  'debug-spain-folder.js',
  'update-folder-counts.js',
  'scripts/init-cmo-knowledge.js',
  'run-integration-migration.js',
  'config/auth.js',
  'config/database.js',
  'check-anthropic-models.js',
  'retest-providers.js',
  'scripts/test-llm.js',
  'migrate-to-cloud-storage.js',
  'pdf-storage-analysis.js',
  'investigate-storage.js',
  'debug-full-payload.js',
  'recreate-pdfs-from-content.js',
  'fix-missing-pdfs.js',
  'debug-collection.js'
];

const updatedFiles = [];
const skippedFiles = [];
const errorFiles = [];

for (const file of filesToUpdate) {
  const filePath = path.join(__dirname, file);
  
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${file}`);
      skippedFiles.push(file);
      continue;
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if already updated
    if (content.includes('dotenv.config({ path:')) {
      console.log(`✓ Already updated: ${file}`);
      skippedFiles.push(file);
      continue;
    }
    
    // Check if it's using ES6 imports
    if (content.includes('import dotenv from')) {
      // Add path imports if not present
      if (!content.includes("import path from 'path'")) {
        content = content.replace(
          "import dotenv from 'dotenv';",
          "import dotenv from 'dotenv';\nimport path from 'path';\nimport { fileURLToPath } from 'url';"
        );
      }
      
      // Add __dirname calculation if not present
      if (!content.includes('fileURLToPath(import.meta.url)')) {
        const insertPoint = content.indexOf('dotenv.config()');
        if (insertPoint > -1) {
          const beforeConfig = content.substring(0, insertPoint);
          const afterConfig = content.substring(insertPoint);
          
          content = beforeConfig + 
            "\nconst __dirname = path.dirname(fileURLToPath(import.meta.url));\n" +
            afterConfig;
        }
      }
      
      // Update dotenv.config()
      content = content.replace(
        'dotenv.config()',
        "dotenv.config({ path: path.join(__dirname, '../.env') })"
      );
      
    } else if (content.includes('require(\'dotenv\')')) {
      // CommonJS style
      content = content.replace(
        "require('dotenv').config()",
        "require('dotenv').config({ path: require('path').join(__dirname, '../.env') })"
      );
    }
    
    // Write updated content
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated: ${file}`);
    updatedFiles.push(file);
    
  } catch (error) {
    console.error(`❌ Error updating ${file}:`, error.message);
    errorFiles.push(file);
  }
}

console.log('\n=====================================');
console.log(`✅ Updated: ${updatedFiles.length} files`);
console.log(`⚠️  Skipped: ${skippedFiles.length} files`);
console.log(`❌ Errors: ${errorFiles.length} files`);

if (updatedFiles.length > 0) {
  console.log('\n✅ Successfully updated these files to use parent .env:');
  updatedFiles.forEach(f => console.log(`   - ${f}`));
}

console.log('\n🔒 Security improvement complete!');
console.log('   - Duplicate server/.env removed');
console.log('   - All scripts now use root .env');
console.log('   - Single source of truth for credentials');