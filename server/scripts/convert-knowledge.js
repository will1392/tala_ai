/**
 * Knowledge Conversion Script
 * 
 * Converts marketing documents (MD, TXT, PDF) to structured JSON format
 * for the CMO Knowledge Base.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { remark } from 'remark';
import strip from 'strip-markdown';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class KnowledgeConverter {
  constructor() {
    this.outputBase = path.join(__dirname, '../knowledge/cmo');
    this.remarkProcessor = remark().use(strip);
  }

  /**
   * Convert a markdown file to knowledge JSON
   */
  async convertMarkdown(filePath, category, options = {}) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const { data: frontmatter, content: mainContent } = matter(content);
      
      // Extract sections from markdown
      const sections = this.extractSections(mainContent);
      
      // Create knowledge items from sections
      const knowledgeItems = [];
      
      // Main document as a guide
      if (sections.introduction || sections.overview) {
        knowledgeItems.push({
          id: this.generateId(category, frontmatter.title || 'guide'),
          type: 'guide',
          topic: options.topic || this.inferTopic(frontmatter.title),
          title: frontmatter.title || path.basename(filePath, '.md'),
          description: frontmatter.description || '',
          content: sections.introduction || sections.overview || '',
          metadata: {
            source: path.basename(filePath),
            author: frontmatter.author || 'CMO Team',
            lastUpdated: frontmatter.date || new Date().toISOString().split('T')[0],
            tags: frontmatter.tags || []
          }
        });
      }
      
      // Convert specific sections to knowledge items
      for (const [sectionName, sectionContent] of Object.entries(sections)) {
        const item = this.sectionToKnowledgeItem(
          sectionName,
          sectionContent,
          category,
          frontmatter
        );
        
        if (item) {
          knowledgeItems.push(item);
        }
      }
      
      return knowledgeItems;
      
    } catch (error) {
      console.error(`Failed to convert ${filePath}:`, error);
      return [];
    }
  }

  /**
   * Extract sections from markdown content
   */
  extractSections(content) {
    const sections = {};
    const lines = content.split('\n');
    let currentSection = 'introduction';
    let sectionContent = [];
    
    for (const line of lines) {
      if (line.startsWith('# ')) {
        // Save previous section
        if (sectionContent.length > 0) {
          sections[currentSection] = sectionContent.join('\n').trim();
        }
        
        // Start new section
        currentSection = this.slugify(line.replace(/^#+\s+/, ''));
        sectionContent = [];
      } else if (line.startsWith('## ')) {
        // Sub-section - include in current section
        sectionContent.push(line);
      } else {
        sectionContent.push(line);
      }
    }
    
    // Save last section
    if (sectionContent.length > 0) {
      sections[currentSection] = sectionContent.join('\n').trim();
    }
    
    return sections;
  }

  /**
   * Convert a section to a knowledge item
   */
  sectionToKnowledgeItem(sectionName, content, category, frontmatter) {
    // Detect section type
    const sectionLower = sectionName.toLowerCase();
    
    // Templates section
    if (sectionLower.includes('template') || sectionLower.includes('example')) {
      return this.extractTemplates(sectionName, content, category, frontmatter);
    }
    
    // Best practices section
    if (sectionLower.includes('best practice') || sectionLower.includes('tip')) {
      return this.extractBestPractices(sectionName, content, category, frontmatter);
    }
    
    // Tools or calculators
    if (sectionLower.includes('tool') || sectionLower.includes('calculator')) {
      return this.extractTool(sectionName, content, category, frontmatter);
    }
    
    // Checklist
    if (sectionLower.includes('checklist')) {
      return this.extractChecklist(sectionName, content, category, frontmatter);
    }
    
    // Default: create as reference
    return {
      id: this.generateId(category, sectionName),
      type: 'reference',
      topic: this.inferTopic(sectionName),
      title: this.titleCase(sectionName),
      content: content,
      metadata: {
        source: frontmatter.title || 'unknown',
        section: sectionName
      }
    };
  }

  /**
   * Extract templates from content
   */
  extractTemplates(sectionName, content, category, frontmatter) {
    const templates = [];
    const templateRegex = /(?:^|\n)(?:[-*]|\d+\.)\s*\*\*([^*]+)\*\*:?\s*([^\n]+)/g;
    let match;
    
    while ((match = templateRegex.exec(content)) !== null) {
      templates.push({
        name: match[1].trim(),
        pattern: match[2].trim()
      });
    }
    
    if (templates.length === 0) {
      // Try to extract code blocks as templates
      const codeBlockRegex = /```[^\n]*\n([\s\S]*?)```/g;
      while ((match = codeBlockRegex.exec(content)) !== null) {
        templates.push({
          name: `Template ${templates.length + 1}`,
          pattern: match[1].trim()
        });
      }
    }
    
    return {
      id: this.generateId(category, sectionName),
      type: 'template',
      topic: this.inferTopic(frontmatter.title),
      title: this.titleCase(sectionName),
      description: content.split('\n')[0],
      templates: templates,
      metadata: {
        source: frontmatter.title || 'unknown'
      }
    };
  }

  /**
   * Extract best practices
   */
  extractBestPractices(sectionName, content, category, frontmatter) {
    const practices = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (line.match(/^[-*]\s+/) || line.match(/^\d+\.\s+/)) {
        practices.push(line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '').trim());
      }
    }
    
    return {
      id: this.generateId(category, sectionName),
      type: 'guide',
      topic: this.inferTopic(frontmatter.title),
      title: this.titleCase(sectionName),
      content: content,
      guidelines: practices,
      metadata: {
        source: frontmatter.title || 'unknown'
      }
    };
  }

  /**
   * Extract tool information
   */
  extractTool(sectionName, content, category, frontmatter) {
    return {
      id: this.generateId(category, sectionName),
      type: 'tool',
      topic: this.inferTopic(frontmatter.title),
      title: this.titleCase(sectionName),
      description: content.split('\n')[0],
      content: content,
      metadata: {
        source: frontmatter.title || 'unknown'
      }
    };
  }

  /**
   * Extract checklist
   */
  extractChecklist(sectionName, content, category, frontmatter) {
    const items = [];
    const checklistRegex = /\[[ x]\]\s+(.+)/g;
    let match;
    
    while ((match = checklistRegex.exec(content)) !== null) {
      items.push(match[1].trim());
    }
    
    // Fallback to bullet points if no checkbox syntax
    if (items.length === 0) {
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.match(/^[-*]\s+/) || line.match(/^\d+\.\s+/)) {
          items.push(line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '').trim());
        }
      }
    }
    
    return {
      id: this.generateId(category, sectionName),
      type: 'checklist',
      topic: this.inferTopic(frontmatter.title),
      title: this.titleCase(sectionName),
      description: content.split('\n')[0],
      items: items,
      metadata: {
        source: frontmatter.title || 'unknown'
      }
    };
  }

  /**
   * Convert text file to knowledge
   */
  async convertTextFile(filePath, category, options = {}) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      const title = lines[0] || path.basename(filePath, '.txt');
      
      return [{
        id: this.generateId(category, title),
        type: options.type || 'reference',
        topic: options.topic || this.inferTopic(title),
        title: title,
        content: lines.slice(1).join('\n').trim(),
        metadata: {
          source: path.basename(filePath),
          converted: new Date().toISOString()
        }
      }];
      
    } catch (error) {
      console.error(`Failed to convert ${filePath}:`, error);
      return [];
    }
  }

  /**
   * Batch convert directory
   */
  async convertDirectory(inputDir, category, options = {}) {
    const results = {
      success: 0,
      failed: 0,
      items: []
    };
    
    try {
      const files = await fs.readdir(inputDir);
      
      for (const file of files) {
        const filePath = path.join(inputDir, file);
        const stat = await fs.stat(filePath);
        
        if (stat.isFile()) {
          let items = [];
          
          if (file.endsWith('.md')) {
            items = await this.convertMarkdown(filePath, category, options);
          } else if (file.endsWith('.txt')) {
            items = await this.convertTextFile(filePath, category, options);
          }
          
          if (items.length > 0) {
            results.items.push(...items);
            results.success++;
          } else {
            results.failed++;
          }
        }
      }
      
      // Save converted items
      if (results.items.length > 0) {
        await this.saveKnowledge(category, results.items);
      }
      
    } catch (error) {
      console.error(`Failed to convert directory ${inputDir}:`, error);
    }
    
    return results;
  }

  /**
   * Save knowledge items to JSON
   */
  async saveKnowledge(category, items) {
    const outputDir = path.join(this.outputBase, category);
    await fs.mkdir(outputDir, { recursive: true });
    
    // Group by topic
    const byTopic = {};
    for (const item of items) {
      const topic = item.topic || 'general';
      if (!byTopic[topic]) byTopic[topic] = [];
      byTopic[topic].push(item);
    }
    
    // Save each topic to separate file
    for (const [topic, topicItems] of Object.entries(byTopic)) {
      const filename = `${topic}.json`;
      const filePath = path.join(outputDir, filename);
      
      await fs.writeFile(
        filePath,
        JSON.stringify(topicItems, null, 2),
        'utf-8'
      );
      
      console.log(`✅ Saved ${topicItems.length} items to ${category}/${filename}`);
    }
  }

  /**
   * Utility functions
   */
  generateId(category, name) {
    return `${category}-${this.slugify(name)}-${Date.now()}`;
  }

  slugify(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  titleCase(text) {
    return text
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  inferTopic(title) {
    const titleLower = title.toLowerCase();
    
    // SEO topics
    if (titleLower.includes('title')) return 'title_tags';
    if (titleLower.includes('meta')) return 'meta_descriptions';
    if (titleLower.includes('keyword')) return 'keyword_research';
    
    // Email topics
    if (titleLower.includes('subject')) return 'subject_lines';
    if (titleLower.includes('deliverability')) return 'deliverability';
    if (titleLower.includes('segment')) return 'segmentation';
    
    // Social topics
    if (titleLower.includes('hashtag')) return 'hashtags';
    if (titleLower.includes('engagement')) return 'engagement';
    
    return 'general';
  }
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const converter = new KnowledgeConverter();
  
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Usage: node convert-knowledge.js <input-file-or-dir> <category> [topic]');
    console.log('Categories: seo, email, social, direct-mail, ads');
    process.exit(1);
  }
  
  const [input, category, topic] = args;
  
  (async () => {
    const stat = await fs.stat(input);
    
    if (stat.isDirectory()) {
      const results = await converter.convertDirectory(input, category, { topic });
      console.log(`\n📊 Conversion complete:`);
      console.log(`✅ Success: ${results.success} files`);
      console.log(`❌ Failed: ${results.failed} files`);
      console.log(`📝 Total items: ${results.items.length}`);
    } else {
      let items = [];
      
      if (input.endsWith('.md')) {
        items = await converter.convertMarkdown(input, category, { topic });
      } else if (input.endsWith('.txt')) {
        items = await converter.convertTextFile(input, category, { topic });
      }
      
      if (items.length > 0) {
        await converter.saveKnowledge(category, items);
        console.log(`✅ Converted ${items.length} items from ${input}`);
      } else {
        console.log(`❌ No items converted from ${input}`);
      }
    }
  })();
}

export default KnowledgeConverter;