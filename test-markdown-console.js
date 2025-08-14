/**
 * Run this in browser console to test markdown rendering
 * This simulates what the chat does
 */

// Test the simple markdown renderer
const testMarkdown = `### Cultural Highlights
1. **Music and Dance**: 
   - Greece has a diverse musical heritage.
   - The **sirtaki dance** is iconic.

2. **Cuisine**: 
   - Greek cuisine is a must-try!
     - **Bougatsa**: A breakfast pastry
     - **Baklava**: Sweet pastries

### Practical Tips
- **Apps to Download**: 
  - The **Weather Channel App** is great
  - **Google Translate** can help`;

console.log('Testing markdown rendering...\n');
console.log('Input:', testMarkdown);
console.log('\n---\n');

// Simple renderer logic (same as our fix)
const lines = testMarkdown.split('\n');
let output = [];

lines.forEach(line => {
  const trimmed = line.trim();
  
  if (trimmed.startsWith('### ')) {
    output.push(`🔹 ${trimmed.substring(4)} (Header)`);
  } else if (trimmed.match(/^\d+\.\s/)) {
    output.push(`   ${trimmed} (Numbered)`);
  } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
    const indent = line.match(/^(\s*)/)?.[1]?.length || 0;
    const spaces = ' '.repeat(indent);
    output.push(`${spaces}• ${trimmed.substring(2)} (Bullet)`);
  } else if (trimmed) {
    output.push(`   ${trimmed}`);
  }
});

console.log('Output (what you should see):');
output.forEach(line => console.log(line));

console.log('\n✅ If you see this structure, the renderer is working');
console.log('❌ If you still see ###, **, - then refresh and try again');