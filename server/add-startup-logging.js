/**
 * Add startup logging to intelligentChat.js to verify code version
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function addStartupLogging() {
  const filePath = path.join(__dirname, 'routes/intelligentChat.js');
  
  // Read the file
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check if we have the updated code
  if (content.includes('ANY query in travel mode should use the simple, proven flow')) {
    console.log('✅ intelligentChat.js has the UPDATED code with simple flow fix');
    
    // Check specific lines
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('const isTravelInfoQuery = mode === \'travel\'')) {
        console.log(`✅ Line ${index + 1}: Simple flow condition found: ${line.trim()}`);
      }
      if (line.includes('console.log(\'🌍 USING SIMPLE TRAVEL FLOW')) {
        console.log(`✅ Line ${index + 1}: Simple flow logging found`);
      }
    });
  } else {
    console.log('❌ intelligentChat.js does NOT have the updated code!');
  }
  
  // Add a startup message at the beginning of the router
  const startupLog = `
// STARTUP VERIFICATION - Added ${new Date().toISOString()}
console.log('🚀 intelligentChat.js loaded - VERSION: Simple flow for ALL travel queries');
console.log('   - Code updated to use: const isTravelInfoQuery = mode === "travel"');
console.log('   - This should fix Greece/Iceland document access');
`;

  // Check if startup log already exists
  if (!content.includes('STARTUP VERIFICATION')) {
    // Find where to insert (after imports)
    const insertPoint = content.indexOf('const router = express.Router();');
    
    if (insertPoint > -1) {
      const newContent = 
        content.slice(0, insertPoint) + 
        startupLog + '\n' +
        content.slice(insertPoint);
      
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log('\n✅ Added startup logging to intelligentChat.js');
      console.log('   - Restart server to see verification message');
    }
  } else {
    console.log('\n✅ Startup logging already exists');
  }
}

addStartupLogging();