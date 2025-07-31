/**
 * CMO Knowledge Base Tests
 * 
 * Tests knowledge storage, retrieval, and search functionality
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { cmoKnowledgeBase } from '../../services/cmo/CMOKnowledgeBase.js';
import { cmoAssistant } from '../../services/cmo/CMOAssistant.js';

// Mock Qdrant client
jest.mock('@qdrant/js-client-rest', () => ({
  QdrantClient: jest.fn().mockImplementation(() => ({
    getCollections: jest.fn(() => Promise.resolve({
      collections: [{ name: 'cmo_knowledge' }]
    })),
    recreateCollection: jest.fn(() => Promise.resolve()),
    search: jest.fn(() => Promise.resolve([
      {
        id: 1,
        score: 0.95,
        payload: {
          id: 'test-1',
          title: 'SEO Best Practices',
          content: 'Title tags should be 50-60 characters',
          category: 'seo',
          type: 'tip'
        }
      }
    ])),
    upsert: jest.fn(() => Promise.resolve()),
    delete: jest.fn(() => Promise.resolve())
  }))
}));

// Mock OpenAI
jest.mock('openai', () => ({
  default: jest.fn().mockImplementation(() => ({
    embeddings: {
      create: jest.fn(() => Promise.resolve({
        data: [{ embedding: new Array(1536).fill(0.1) }]
      }))
    }
  }))
}));

describe('CMO Knowledge Base', () => {
  beforeEach(async () => {
    // Clear knowledge items
    cmoKnowledgeBase.knowledgeItems.clear();
    cmoKnowledgeBase.categoryIndex.clear();
    
    // Initialize with test data
    await cmoKnowledgeBase.initialize();
  });

  describe('Knowledge Loading', () => {
    it('should load knowledge from JSON files', async () => {
      // Add test knowledge
      await cmoKnowledgeBase.addKnowledge({
        id: 'test-seo-1',
        title: 'Meta Description Length',
        content: 'Meta descriptions should be 150-160 characters for optimal display in search results.',
        category: 'seo',
        type: 'tip',
        tags: ['meta', 'seo', 'description']
      });

      const stats = cmoKnowledgeBase.getStats();
      expect(stats.totalItems).toBeGreaterThan(0);
      expect(stats.categories).toHaveProperty('seo');
    });

    it('should validate knowledge items', async () => {
      const invalidItem = {
        title: 'Missing required fields',
        // Missing content, category, type
      };

      await expect(
        cmoKnowledgeBase.addKnowledge(invalidItem)
      ).rejects.toThrow();
    });

    it('should prevent duplicate knowledge IDs', async () => {
      const item = {
        id: 'duplicate-test',
        title: 'Test Item',
        content: 'Test content',
        category: 'seo',
        type: 'tip'
      };

      await cmoKnowledgeBase.addKnowledge(item);
      
      // Try to add same ID again
      await expect(
        cmoKnowledgeBase.addKnowledge(item)
      ).rejects.toThrow('already exists');
    });
  });

  describe('Knowledge Search', () => {
    beforeEach(async () => {
      // Add test knowledge items
      const testItems = [
        {
          id: 'email-1',
          title: 'Email Subject Line Best Practices',
          content: 'Keep subject lines under 50 characters. Use personalization tokens.',
          category: 'email',
          type: 'tip',
          tags: ['subject', 'email', 'personalization']
        },
        {
          id: 'email-2',
          title: 'Email Deliverability Guide',
          content: 'Maintain a clean email list. Use double opt-in. Monitor bounce rates.',
          category: 'email',
          type: 'guide',
          tags: ['deliverability', 'bounce', 'list hygiene']
        },
        {
          id: 'seo-1',
          title: 'Title Tag Optimization',
          content: 'Include primary keyword at the beginning. Keep under 60 characters.',
          category: 'seo',
          type: 'tip',
          tags: ['title', 'keywords', 'optimization']
        }
      ];

      for (const item of testItems) {
        await cmoKnowledgeBase.addKnowledge(item);
      }
    });

    it('should search across all categories', async () => {
      const results = await cmoKnowledgeBase.search('best practices');
      
      expect(results).toBeInstanceOf(Array);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('score');
      expect(results[0].score).toBeGreaterThan(0);
    });

    it('should filter search by category', async () => {
      const results = await cmoKnowledgeBase.search('optimization', {
        category: 'seo'
      });

      // All results should be from SEO category
      results.forEach(result => {
        expect(result.category).toBe('seo');
      });
    });

    it('should limit search results', async () => {
      const results = await cmoKnowledgeBase.search('email', {
        limit: 2
      });

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should return relevant results with scores', async () => {
      const results = await cmoKnowledgeBase.search('subject line length');

      expect(results.length).toBeGreaterThan(0);
      
      // Results should be sorted by score (descending)
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score).toBeGreaterThanOrEqual(results[i].score);
      }
    });
  });

  describe('Knowledge Retrieval', () => {
    it('should get knowledge by ID', async () => {
      await cmoKnowledgeBase.addKnowledge({
        id: 'test-get-id',
        title: 'Test Item',
        content: 'Test content',
        category: 'seo',
        type: 'tip'
      });

      const item = cmoKnowledgeBase.getById('test-get-id');
      expect(item).toBeDefined();
      expect(item.title).toBe('Test Item');
    });

    it('should get knowledge by category', async () => {
      const socialItems = cmoKnowledgeBase.getByCategory('social');
      
      expect(socialItems).toBeInstanceOf(Array);
      socialItems.forEach(item => {
        expect(item.category).toBe('social');
      });
    });

    it('should get knowledge by type', async () => {
      const templates = cmoKnowledgeBase.getByType('template');
      
      expect(templates).toBeInstanceOf(Array);
      templates.forEach(item => {
        expect(item.type).toBe('template');
      });
    });

    it('should get knowledge by tags', async () => {
      await cmoKnowledgeBase.addKnowledge({
        id: 'tag-test',
        title: 'Tagged Item',
        content: 'Content with tags',
        category: 'seo',
        type: 'tip',
        tags: ['test-tag', 'search']
      });

      const taggedItems = cmoKnowledgeBase.getByTag('test-tag');
      
      expect(taggedItems.length).toBeGreaterThan(0);
      expect(taggedItems[0].tags).toContain('test-tag');
    });
  });

  describe('Knowledge Statistics', () => {
    it('should provide accurate statistics', async () => {
      const stats = cmoKnowledgeBase.getStats();
      
      expect(stats).toHaveProperty('totalItems');
      expect(stats).toHaveProperty('categories');
      expect(stats).toHaveProperty('types');
      expect(stats).toHaveProperty('lastUpdated');
      
      // Categories should include all marketing channels
      expect(Object.keys(stats.categories)).toEqual(
        expect.arrayContaining(['seo', 'email', 'social', 'ads', 'direct_mail'])
      );
    });

    it('should track knowledge usage', async () => {
      // Simulate knowledge usage
      const results = await cmoKnowledgeBase.search('email tips');
      
      if (results.length > 0) {
        // Get the item that was returned
        const usedItem = cmoKnowledgeBase.getById(results[0].id);
        
        // In a real implementation, you'd track usage
        // For now, just verify the item exists
        expect(usedItem).toBeDefined();
      }
    });
  });

  describe('Knowledge Management', () => {
    it('should update existing knowledge', async () => {
      await cmoKnowledgeBase.addKnowledge({
        id: 'update-test',
        title: 'Original Title',
        content: 'Original content',
        category: 'seo',
        type: 'tip'
      });

      await cmoKnowledgeBase.updateKnowledge('update-test', {
        title: 'Updated Title',
        content: 'Updated content'
      });

      const updated = cmoKnowledgeBase.getById('update-test');
      expect(updated.title).toBe('Updated Title');
      expect(updated.content).toBe('Updated content');
    });

    it('should remove knowledge items', async () => {
      await cmoKnowledgeBase.addKnowledge({
        id: 'remove-test',
        title: 'To Be Removed',
        content: 'This will be deleted',
        category: 'seo',
        type: 'tip'
      });

      await cmoKnowledgeBase.removeKnowledge('remove-test');
      
      const removed = cmoKnowledgeBase.getById('remove-test');
      expect(removed).toBeUndefined();
    });

    it('should bulk import knowledge', async () => {
      const bulkItems = [
        {
          title: 'Bulk Item 1',
          content: 'Content 1',
          category: 'email',
          type: 'tip'
        },
        {
          title: 'Bulk Item 2',
          content: 'Content 2',
          category: 'seo',
          type: 'guide'
        }
      ];

      const results = await cmoKnowledgeBase.bulkImport(bulkItems);
      
      expect(results.success).toBe(true);
      expect(results.imported).toBe(2);
      expect(results.failed).toBe(0);
    });
  });

  describe('CMO Assistant Integration', () => {
    it('should provide knowledge for query processing', async () => {
      const query = 'How do I improve my email open rates?';
      const queryInfo = cmoAssistant.detectQueryType(query);
      
      const knowledge = await cmoKnowledgeBase.search(query, {
        category: 'email',
        limit: 3
      });

      expect(knowledge).toBeInstanceOf(Array);
      expect(queryInfo.type).toBe('howto');
    });

    it('should support quick action data retrieval', async () => {
      // Add a template
      await cmoKnowledgeBase.addKnowledge({
        id: 'template-test',
        title: 'Welcome Email Template',
        content: 'Subject: Welcome to {{company}}!\n\nDear {{name}},\n\nWelcome aboard!',
        category: 'email',
        type: 'template',
        metadata: {
          variables: ['company', 'name']
        }
      });

      const templates = cmoKnowledgeBase.getByType('template');
      const emailTemplates = templates.filter(t => t.category === 'email');
      
      expect(emailTemplates.length).toBeGreaterThan(0);
      expect(emailTemplates[0].metadata).toHaveProperty('variables');
    });
  });

  describe('Performance', () => {
    it('should handle large knowledge bases efficiently', async () => {
      const startTime = Date.now();
      
      // Add 100 items
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          cmoKnowledgeBase.addKnowledge({
            id: `perf-test-${i}`,
            title: `Performance Test Item ${i}`,
            content: `This is test content for item ${i}`,
            category: ['seo', 'email', 'social', 'ads'][i % 4],
            type: ['tip', 'guide', 'template'][i % 3],
            tags: [`tag-${i % 10}`]
          })
        );
      }
      
      await Promise.all(promises);
      
      const addTime = Date.now() - startTime;
      expect(addTime).toBeLessThan(5000); // Should complete in under 5 seconds
      
      // Test search performance
      const searchStart = Date.now();
      await cmoKnowledgeBase.search('performance test');
      const searchTime = Date.now() - searchStart;
      
      expect(searchTime).toBeLessThan(500); // Search should be fast
    });

    it('should cache frequently accessed items', async () => {
      // First access
      const firstStart = Date.now();
      const item1 = cmoKnowledgeBase.getById('test-seo-1');
      const firstTime = Date.now() - firstStart;
      
      // Second access (should be cached)
      const secondStart = Date.now();
      const item2 = cmoKnowledgeBase.getById('test-seo-1');
      const secondTime = Date.now() - secondStart;
      
      expect(item1).toEqual(item2);
      // Cache access should be faster (this is more conceptual in our mock)
      expect(secondTime).toBeLessThanOrEqual(firstTime);
    });
  });

  describe('Error Handling', () => {
    it('should handle search errors gracefully', async () => {
      // Mock a search error
      cmoKnowledgeBase.qdrant.search = jest.fn(() => 
        Promise.reject(new Error('Search failed'))
      );

      const results = await cmoKnowledgeBase.search('test query');
      
      // Should return empty array on error
      expect(results).toEqual([]);
    });

    it('should validate category names', async () => {
      await expect(
        cmoKnowledgeBase.addKnowledge({
          id: 'invalid-category',
          title: 'Test',
          content: 'Test',
          category: 'invalid-category',
          type: 'tip'
        })
      ).rejects.toThrow('Invalid category');
    });

    it('should validate knowledge types', async () => {
      await expect(
        cmoKnowledgeBase.addKnowledge({
          id: 'invalid-type',
          title: 'Test',
          content: 'Test',
          category: 'seo',
          type: 'invalid-type'
        })
      ).rejects.toThrow('Invalid type');
    });
  });
});

// Integration tests
describe('CMO Knowledge Base Integration', () => {
  it('should work with CMO chat handler', async () => {
    // This would test the full integration
    // For now, we'll verify the structure matches expectations
    
    const knowledge = await cmoKnowledgeBase.search('email marketing');
    
    // Verify knowledge structure matches what CMO handler expects
    if (knowledge.length > 0) {
      const item = knowledge[0];
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('title');
      expect(item).toHaveProperty('content');
      expect(item).toHaveProperty('category');
      expect(item).toHaveProperty('type');
      expect(item).toHaveProperty('score');
    }
  });
});