/**
 * Import knowledge from CSV files
 */

import fs from 'fs/promises';
import { parse } from 'csv-parse/sync';
import { cmoKnowledgeBase } from '../services/cmo/CMOKnowledgeBase.js';

async function importFromCSV(csvPath, category) {
  console.log(`📄 Importing knowledge from ${csvPath} to ${category}...`);
  
  try {
    // Read CSV file
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    
    // Parse CSV
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true
    });
    
    // Initialize knowledge base
    await cmoKnowledgeBase.initialize();
    
    // Add each record
    let added = 0;
    for (const record of records) {
      const knowledge = {
        type: record.type || 'reference',
        topic: record.topic || 'general',
        title: record.title,
        content: record.content || record.description,
        metadata: {
          source: 'csv-import',
          originalFile: csvPath
        }
      };
      
      // Add additional fields if present
      if (record.guidelines) {
        knowledge.guidelines = record.guidelines.split('|').map(g => g.trim());
      }
      
      if (record.examples) {
        knowledge.examples = record.examples.split('|').map(e => e.trim());
      }
      
      if (record.keywords) {
        knowledge.keywords = record.keywords.split(',').map(k => k.trim());
      }
      
      await cmoKnowledgeBase.addKnowledge(category, knowledge);
      added++;
    }
    
    console.log(`✅ Imported ${added} items to ${category}`);
    
  } catch (error) {
    console.error('❌ Import failed:', error);
  }
}

// Example CSV format:
const exampleCSV = `type,topic,title,content,guidelines,keywords
tip,subject_lines,Power Words,Use power words to increase open rates,"Free|New|Exclusive|Limited|Secret","email,subject,copywriting"
template,subject_lines,Question Subject,{{First_name}} - {{Question}}?,"Keep it short|Make it relevant|Test variations","email,personalization"
guide,segmentation,Email List Segmentation,Segment your list for better engagement,"By engagement level|By purchase history|By interests","email,targeting"`;

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const [csvPath, category] = process.argv.slice(2);
  
  if (!csvPath || !category) {
    console.log('Usage: node import-knowledge-csv.js <csv-file> <category>');
    console.log('Categories: seo, email, social, direct-mail, ads');
    console.log('\nExample CSV format:');
    console.log(exampleCSV);
    process.exit(1);
  }
  
  importFromCSV(csvPath, category);
}

export { importFromCSV };