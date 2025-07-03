/**
 * Tag Service
 * Manages tags, tag assignments, and tag-based operations
 */

import type { 
  Tag, 
  TagCategory, 
  CreateTagRequest, 
  UpdateTagRequest, 
  TagAssignment, 
  TagFilter,
  TaggableItem,
  TagSearchResult
} from '../types/tags';
import { createTagSlug, getTagColor, TAG_TEMPLATES } from '../types/tags';

class TagService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
  }

  // ===== TAG LIBRARY MANAGEMENT =====

  /**
   * Get all tags from the central library
   */
  async getAllTags(userId: string = 'admin-1', isAdmin: boolean = true): Promise<Tag[]> {
    try {
      const response = await fetch(`${this.baseUrl}/tags?userId=${userId}&isAdmin=${isAdmin}`);
      if (!response.ok) throw new Error('Failed to fetch tags');
      const data = await response.json();
      return data.tags || [];
    } catch (error) {
      console.error('Failed to get tags:', error);
      return [];
    }
  }

  /**
   * Get tags by category
   */
  async getTagsByCategory(category: TagCategory, userId: string = 'admin-1'): Promise<Tag[]> {
    try {
      const response = await fetch(`${this.baseUrl}/tags?category=${category}&userId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch tags by category');
      const data = await response.json();
      return data.tags || [];
    } catch (error) {
      console.error('Failed to get tags by category:', error);
      return [];
    }
  }

  /**
   * Create a new tag
   */
  async createTag(request: CreateTagRequest, userId: string = 'admin-1'): Promise<Tag> {
    try {
      const slug = createTagSlug(request.name);
      const color = request.color || getTagColor(request.category);
      
      const tagData = {
        ...request,
        slug,
        color,
        created_by: userId,
        usage_count: 0
      };

      const response = await fetch(`${this.baseUrl}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tagData)
      });

      if (!response.ok) throw new Error('Failed to create tag');
      const data = await response.json();
      return data.tag;
    } catch (error) {
      console.error('Failed to create tag:', error);
      throw error;
    }
  }

  /**
   * Update an existing tag
   */
  async updateTag(request: UpdateTagRequest, userId: string = 'admin-1'): Promise<Tag> {
    try {
      const updateData = {
        ...request,
        ...(request.name && { slug: createTagSlug(request.name) }),
        updated_by: userId
      };

      const response = await fetch(`${this.baseUrl}/tags/${request.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) throw new Error('Failed to update tag');
      const data = await response.json();
      return data.tag;
    } catch (error) {
      console.error('Failed to update tag:', error);
      throw error;
    }
  }

  /**
   * Delete a tag (soft delete, update usage counts)
   */
  async deleteTag(tagId: string, userId: string = 'admin-1'): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/tags/${tagId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) throw new Error('Failed to delete tag');
    } catch (error) {
      console.error('Failed to delete tag:', error);
      throw error;
    }
  }

  /**
   * Search tags by name
   */
  async searchTags(query: string, userId: string = 'admin-1'): Promise<Tag[]> {
    try {
      const response = await fetch(`${this.baseUrl}/tags/search?q=${encodeURIComponent(query)}&userId=${userId}`);
      if (!response.ok) throw new Error('Failed to search tags');
      const data = await response.json();
      return data.tags || [];
    } catch (error) {
      console.error('Failed to search tags:', error);
      return [];
    }
  }

  // ===== TAG ASSIGNMENT MANAGEMENT =====

  /**
   * Assign tags to an item
   */
  async assignTags(
    itemId: string, 
    itemType: TaggableItem['type'], 
    tagIds: string[], 
    userId: string = 'admin-1'
  ): Promise<TagAssignment[]> {
    try {
      const response = await fetch(`${this.baseUrl}/tags/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: itemId,
          item_type: itemType,
          tag_ids: tagIds,
          assigned_by: userId
        })
      });

      if (!response.ok) throw new Error('Failed to assign tags');
      const data = await response.json();
      return data.assignments || [];
    } catch (error) {
      console.error('Failed to assign tags:', error);
      throw error;
    }
  }

  /**
   * Remove tags from an item
   */
  async removeTags(
    itemId: string, 
    itemType: TaggableItem['type'], 
    tagIds: string[], 
    userId: string = 'admin-1'
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/tags/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: itemId,
          item_type: itemType,
          tag_ids: tagIds,
          removed_by: userId
        })
      });

      if (!response.ok) throw new Error('Failed to remove tags');
    } catch (error) {
      console.error('Failed to remove tags:', error);
      throw error;
    }
  }

  /**
   * Get tags assigned to a specific item
   */
  async getItemTags(itemId: string, itemType: TaggableItem['type']): Promise<Tag[]> {
    try {
      const response = await fetch(`${this.baseUrl}/tags/item/${itemType}/${itemId}`);
      if (!response.ok) throw new Error('Failed to get item tags');
      const data = await response.json();
      return data.tags || [];
    } catch (error) {
      console.error('Failed to get item tags:', error);
      return [];
    }
  }

  /**
   * Update all tags for an item (replace existing tags)
   */
  async updateItemTags(
    itemId: string, 
    itemType: TaggableItem['type'], 
    tagIds: string[], 
    userId: string = 'admin-1'
  ): Promise<Tag[]> {
    try {
      const response = await fetch(`${this.baseUrl}/tags/item/${itemType}/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tag_ids: tagIds,
          updated_by: userId
        })
      });

      if (!response.ok) throw new Error('Failed to update item tags');
      const data = await response.json();
      return data.tags || [];
    } catch (error) {
      console.error('Failed to update item tags:', error);
      throw error;
    }
  }

  // ===== TAG-BASED SEARCH AND FILTERING =====

  /**
   * Search items by tags
   */
  async searchByTags(
    filter: TagFilter, 
    userId: string = 'admin-1', 
    limit: number = 20
  ): Promise<TagSearchResult[]> {
    try {
      const response = await fetch(`${this.baseUrl}/search/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filter,
          userId,
          limit
        })
      });

      if (!response.ok) throw new Error('Failed to search by tags');
      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Failed to search by tags:', error);
      return [];
    }
  }

  /**
   * Get items with specific tags
   */
  async getItemsByTags(
    tagIds: string[], 
    itemType?: TaggableItem['type'], 
    userId: string = 'admin-1'
  ): Promise<TaggableItem[]> {
    try {
      const params = new URLSearchParams({
        tags: tagIds.join(','),
        userId
      });
      
      if (itemType) {
        params.append('type', itemType);
      }

      const response = await fetch(`${this.baseUrl}/items/by-tags?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to get items by tags');
      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('Failed to get items by tags:', error);
      return [];
    }
  }

  // ===== TAG ANALYTICS AND UTILITIES =====

  /**
   * Get tag usage statistics
   */
  async getTagUsageStats(userId: string = 'admin-1'): Promise<Array<{ tag: Tag; usage_count: number }>> {
    try {
      const response = await fetch(`${this.baseUrl}/tags/stats?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to get tag stats');
      const data = await response.json();
      return data.stats || [];
    } catch (error) {
      console.error('Failed to get tag stats:', error);
      return [];
    }
  }

  /**
   * Get suggested tags based on content analysis
   */
  async getSuggestedTags(
    content: string, 
    itemType: TaggableItem['type'], 
    limit: number = 5
  ): Promise<Tag[]> {
    try {
      const response = await fetch(`${this.baseUrl}/tags/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          item_type: itemType,
          limit
        })
      });

      if (!response.ok) throw new Error('Failed to get suggested tags');
      const data = await response.json();
      return data.suggested_tags || [];
    } catch (error) {
      console.error('Failed to get suggested tags:', error);
      return [];
    }
  }

  /**
   * Initialize default tags from templates
   */
  async initializeDefaultTags(userId: string = 'admin-1'): Promise<Tag[]> {
    try {
      const createdTags: Tag[] = [];
      
      for (const [category, templates] of Object.entries(TAG_TEMPLATES)) {
        for (const template of templates) {
          try {
            const tag = await this.createTag({
              name: template.name,
              description: template.description,
              color: template.color,
              category: category as TagCategory
            }, userId);
            createdTags.push(tag);
          } catch (error) {
            console.warn(`Failed to create default tag ${template.name}:`, error);
          }
        }
      }
      
      return createdTags;
    } catch (error) {
      console.error('Failed to initialize default tags:', error);
      return [];
    }
  }

  /**
   * Export tags and assignments for backup or migration
   */
  async exportTags(userId: string = 'admin-1'): Promise<{
    tags: Tag[];
    assignments: TagAssignment[];
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/tags/export?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to export tags');
      const data = await response.json();
      return {
        tags: data.tags || [],
        assignments: data.assignments || []
      };
    } catch (error) {
      console.error('Failed to export tags:', error);
      return { tags: [], assignments: [] };
    }
  }
}

// Export singleton instance
export const tagService = new TagService();
export default TagService;