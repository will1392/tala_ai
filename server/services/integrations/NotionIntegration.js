/**
 * Notion Integration - Connect Tala AI with Notion databases
 * Handles task creation, updates, and bidirectional sync
 */

import { Client } from '@notionhq/client';
import { v4 as uuidv4 } from 'uuid';

// Notion property types mapping
const NotionPropertyTypes = {
    TITLE: 'title',
    RICH_TEXT: 'rich_text',
    NUMBER: 'number',
    SELECT: 'select',
    MULTI_SELECT: 'multi_select',
    DATE: 'date',
    PEOPLE: 'people',
    CHECKBOX: 'checkbox',
    URL: 'url',
    EMAIL: 'email',
    PHONE_NUMBER: 'phone_number',
    RELATION: 'relation',
    STATUS: 'status'
};

// Priority mapping
const PriorityMapping = {
    tala_to_notion: {
        'urgent': 'Urgent',
        'high': 'High',
        'medium': 'Medium',
        'low': 'Low'
    },
    notion_to_tala: {
        'Urgent': 'urgent',
        'High': 'high',
        'Medium': 'medium',
        'Low': 'low'
    }
};

// Status mapping
const StatusMapping = {
    tala_to_notion: {
        'pending': 'To Do',
        'in_progress': 'In Progress',
        'completed': 'Done',
        'cancelled': 'Cancelled'
    },
    notion_to_tala: {
        'To Do': 'pending',
        'In Progress': 'in_progress',
        'Done': 'completed',
        'Cancelled': 'cancelled'
    }
};

class NotionIntegration {
    constructor() {
        this.id = 'notion';
        this.name = 'Notion';
        this.type = 'task_management';
        this.version = '1.0.0';
        this.description = 'Sync tasks with Notion databases';
        
        this.requiredConfig = [
            'apiKey',
            'databaseId'
        ];
        
        this.optionalConfig = [
            'defaultView',
            'syncArchived',
            'propertyMappings'
        ];
        
        this.features = [
            'create_tasks',
            'update_tasks',
            'delete_tasks',
            'sync_bidirectional',
            'custom_properties',
            'rich_text_support',
            'file_attachments',
            'mentions',
            'relations'
        ];
        
        this.client = null;
        this.databaseSchema = null;
    }
    
    /**
     * Validate configuration
     */
    async validateConfig(config) {
        const errors = [];
        
        // Check required fields
        for (const field of this.requiredConfig) {
            if (!config[field]) {
                errors.push(`Missing required field: ${field}`);
            }
        }
        
        // Validate API key format
        if (config.apiKey && !config.apiKey.startsWith('secret_')) {
            errors.push('Invalid API key format. Notion API keys start with "secret_"');
        }
        
        // Validate database ID format
        if (config.databaseId && !this.isValidUUID(config.databaseId)) {
            errors.push('Invalid database ID format');
        }
        
        if (errors.length > 0) {
            throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
        }
        
        return true;
    }
    
    /**
     * Test connection to Notion
     */
    async testConnection(config) {
        try {
            const client = new Client({
                auth: config.apiKey
            });
            
            // Try to retrieve the database
            const database = await client.databases.retrieve({
                database_id: config.databaseId
            });
            
            if (!database) {
                throw new Error('Database not found');
            }
            
            // Store database schema for later use
            this.databaseSchema = database.properties;
            
            return {
                success: true,
                database: {
                    id: database.id,
                    title: this.extractTitle(database.title),
                    properties: Object.keys(database.properties)
                }
            };
            
        } catch (error) {
            throw new Error(`Connection test failed: ${error.message}`);
        }
    }
    
    /**
     * Create a task in Notion
     */
    async createTask(taskData, config) {
        try {
            const client = this.getClient(config);
            
            // Transform task data to Notion properties
            const properties = await this.buildNotionProperties(taskData, config);
            
            // Create the page
            const response = await client.pages.create({
                parent: {
                    database_id: config.databaseId
                },
                properties: properties,
                children: this.buildNotionContent(taskData)
            });
            
            return {
                id: response.id,
                url: response.url,
                created: true
            };
            
        } catch (error) {
            throw new Error(`Failed to create task in Notion: ${error.message}`);
        }
    }
    
    /**
     * Update a task in Notion
     */
    async updateTask(notionPageId, taskData, config) {
        try {
            const client = this.getClient(config);
            
            // Get current page to preserve certain properties
            const currentPage = await client.pages.retrieve({
                page_id: notionPageId
            });
            
            // Build updated properties
            const properties = await this.buildNotionProperties(taskData, config, currentPage);
            
            // Update the page
            const response = await client.pages.update({
                page_id: notionPageId,
                properties: properties
            });
            
            // Update content if description changed
            if (taskData.description) {
                await this.updatePageContent(client, notionPageId, taskData);
            }
            
            return {
                id: response.id,
                url: response.url,
                updated: true
            };
            
        } catch (error) {
            throw new Error(`Failed to update task in Notion: ${error.message}`);
        }
    }
    
    /**
     * Delete a task in Notion (archive)
     */
    async deleteTask(notionPageId, config) {
        try {
            const client = this.getClient(config);
            
            // Notion doesn't support deletion, only archiving
            const response = await client.pages.update({
                page_id: notionPageId,
                archived: true
            });
            
            return {
                id: response.id,
                archived: true
            };
            
        } catch (error) {
            throw new Error(`Failed to archive task in Notion: ${error.message}`);
        }
    }
    
    /**
     * Get tasks from Notion
     */
    async getTasks(options = {}, config) {
        try {
            const client = this.getClient(config);
            const { since, limit = 100, filters = {} } = options;
            
            // Build query
            const query = {
                database_id: config.databaseId,
                page_size: Math.min(limit, 100)
            };
            
            // Add filters
            const notionFilters = [];
            
            // Filter by last edited time
            if (since) {
                notionFilters.push({
                    timestamp: 'last_edited_time',
                    last_edited_time: {
                        after: since.toISOString()
                    }
                });
            }
            
            // Filter by archived status
            if (!config.syncArchived) {
                notionFilters.push({
                    property: 'Archived',
                    checkbox: {
                        equals: false
                    }
                });
            }
            
            // Add custom filters
            if (filters.status) {
                notionFilters.push({
                    property: 'Status',
                    status: {
                        equals: StatusMapping.tala_to_notion[filters.status] || filters.status
                    }
                });
            }
            
            if (notionFilters.length > 0) {
                query.filter = {
                    and: notionFilters
                };
            }
            
            // Query the database
            const response = await client.databases.query(query);
            
            // Transform results
            const tasks = [];
            for (const page of response.results) {
                const task = await this.transformFromNotion(page, config);
                tasks.push(task);
            }
            
            return tasks;
            
        } catch (error) {
            throw new Error(`Failed to get tasks from Notion: ${error.message}`);
        }
    }
    
    /**
     * Build Notion properties from task data
     */
    async buildNotionProperties(taskData, config, existingPage = null) {
        const properties = {};
        
        // Get property mappings
        const mappings = config.propertyMappings || this.getDefaultMappings();
        
        // Title (required)
        if (taskData.title && mappings.title) {
            properties[mappings.title] = {
                title: [{
                    text: {
                        content: taskData.title
                    }
                }]
            };
        }
        
        // Status
        if (taskData.status && mappings.status) {
            const notionStatus = StatusMapping.tala_to_notion[taskData.status] || taskData.status;
            properties[mappings.status] = {
                status: {
                    name: notionStatus
                }
            };
        }
        
        // Priority
        if (taskData.priority && mappings.priority) {
            const notionPriority = PriorityMapping.tala_to_notion[taskData.priority] || taskData.priority;
            properties[mappings.priority] = {
                select: {
                    name: notionPriority
                }
            };
        }
        
        // Due date
        if (taskData.dueDate && mappings.dueDate) {
            properties[mappings.dueDate] = {
                date: {
                    start: new Date(taskData.dueDate).toISOString()
                }
            };
        }
        
        // Assignee (if people property exists)
        if (taskData.assignedTo && mappings.assignee) {
            // Note: This requires the assignee to be a Notion user
            // In practice, you'd need to map Tala users to Notion users
            properties[mappings.assignee] = {
                people: []  // Would need user mapping
            };
        }
        
        // Tags
        if (taskData.tags && taskData.tags.length > 0 && mappings.tags) {
            properties[mappings.tags] = {
                multi_select: taskData.tags.map(tag => ({ name: tag }))
            };
        }
        
        // Custom properties from metadata
        if (taskData.metadata && config.customMappings) {
            for (const [metaKey, notionProp] of Object.entries(config.customMappings)) {
                if (taskData.metadata[metaKey] !== undefined) {
                    properties[notionProp] = this.buildCustomProperty(
                        taskData.metadata[metaKey],
                        this.databaseSchema?.[notionProp]?.type
                    );
                }
            }
        }
        
        // Source reference
        if (mappings.source) {
            properties[mappings.source] = {
                rich_text: [{
                    text: {
                        content: `Tala AI: ${taskData.id || 'imported'}`
                    }
                }]
            };
        }
        
        // Last synced
        if (mappings.lastSynced) {
            properties[mappings.lastSynced] = {
                date: {
                    start: new Date().toISOString()
                }
            };
        }
        
        return properties;
    }
    
    /**
     * Build Notion content blocks
     */
    buildNotionContent(taskData) {
        const blocks = [];
        
        // Add description as content
        if (taskData.description) {
            const paragraphs = taskData.description.split('\n\n');
            
            for (const paragraph of paragraphs) {
                if (paragraph.trim()) {
                    blocks.push({
                        object: 'block',
                        type: 'paragraph',
                        paragraph: {
                            rich_text: [{
                                type: 'text',
                                text: {
                                    content: paragraph.trim()
                                }
                            }]
                        }
                    });
                }
            }
        }
        
        // Add metadata section if present
        if (taskData.metadata && Object.keys(taskData.metadata).length > 0) {
            blocks.push({
                object: 'block',
                type: 'heading_3',
                heading_3: {
                    rich_text: [{
                        type: 'text',
                        text: { content: 'Additional Information' }
                    }]
                }
            });
            
            blocks.push({
                object: 'block',
                type: 'bulleted_list_item',
                bulleted_list_item: {
                    rich_text: Object.entries(taskData.metadata).map(([key, value]) => ({
                        type: 'text',
                        text: { content: `${key}: ${value}` }
                    }))
                }
            });
        }
        
        // Add source information
        if (taskData.sourceEmailId) {
            blocks.push({
                object: 'block',
                type: 'callout',
                callout: {
                    rich_text: [{
                        type: 'text',
                        text: { content: `Created from email: ${taskData.sourceEmailId}` }
                    }],
                    icon: { emoji: '📧' }
                }
            });
        }
        
        return blocks;
    }
    
    /**
     * Transform Notion page to Tala task format
     */
    async transformFromNotion(page, config) {
        const mappings = config.propertyMappings || this.getDefaultMappings();
        const properties = page.properties;
        
        const task = {
            id: page.id,
            url: page.url,
            created_at: page.created_time,
            updated_at: page.last_edited_time
        };
        
        // Extract title
        if (mappings.title && properties[mappings.title]) {
            task.title = this.extractTextFromProperty(properties[mappings.title]);
        }
        
        // Extract status
        if (mappings.status && properties[mappings.status]) {
            const notionStatus = properties[mappings.status].status?.name;
            task.status = StatusMapping.notion_to_tala[notionStatus] || 'pending';
        }
        
        // Extract priority
        if (mappings.priority && properties[mappings.priority]) {
            const notionPriority = properties[mappings.priority].select?.name;
            task.priority = PriorityMapping.notion_to_tala[notionPriority] || 'medium';
        }
        
        // Extract due date
        if (mappings.dueDate && properties[mappings.dueDate]) {
            const date = properties[mappings.dueDate].date?.start;
            if (date) {
                task.dueDate = new Date(date);
            }
        }
        
        // Extract tags
        if (mappings.tags && properties[mappings.tags]) {
            task.tags = properties[mappings.tags].multi_select?.map(tag => tag.name) || [];
        }
        
        // Extract custom properties
        if (config.customMappings) {
            task.metadata = {};
            for (const [metaKey, notionProp] of Object.entries(config.customMappings)) {
                if (properties[notionProp]) {
                    task.metadata[metaKey] = this.extractValueFromProperty(properties[notionProp]);
                }
            }
        }
        
        // Get page content as description
        try {
            const content = await this.getPageContent(config, page.id);
            if (content) {
                task.description = content;
            }
        } catch (error) {
            console.error('Failed to get page content:', error);
        }
        
        return task;
    }
    
    /**
     * Get page content
     */
    async getPageContent(config, pageId) {
        try {
            const client = this.getClient(config);
            
            const response = await client.blocks.children.list({
                block_id: pageId,
                page_size: 100
            });
            
            const content = [];
            
            for (const block of response.results) {
                const text = this.extractTextFromBlock(block);
                if (text) {
                    content.push(text);
                }
            }
            
            return content.join('\n\n');
            
        } catch (error) {
            console.error('Failed to get page content:', error);
            return null;
        }
    }
    
    /**
     * Update page content
     */
    async updatePageContent(client, pageId, taskData) {
        try {
            // Get existing blocks
            const response = await client.blocks.children.list({
                block_id: pageId
            });
            
            // Delete existing blocks
            for (const block of response.results) {
                await client.blocks.delete({
                    block_id: block.id
                });
            }
            
            // Add new content
            const blocks = this.buildNotionContent(taskData);
            if (blocks.length > 0) {
                await client.blocks.children.append({
                    block_id: pageId,
                    children: blocks
                });
            }
            
        } catch (error) {
            console.error('Failed to update page content:', error);
        }
    }
    
    /**
     * Transform for external (Notion) format
     */
    async transformForExternal(data, originalTask) {
        // Add any Notion-specific transformations
        const transformed = { ...data };
        
        // Ensure required fields
        if (!transformed.title && originalTask.title) {
            transformed.title = originalTask.title;
        }
        
        // Transform dates to ISO format
        if (transformed.dueDate && !(transformed.dueDate instanceof Date)) {
            transformed.dueDate = new Date(transformed.dueDate);
        }
        
        return transformed;
    }
    
    /**
     * Transform from external (Notion) format
     */
    async transformFromExternal(data, notionData) {
        // Add any Tala-specific transformations
        const transformed = { ...data };
        
        // Ensure Tala format consistency
        if (!transformed.status) {
            transformed.status = 'pending';
        }
        
        if (!transformed.priority) {
            transformed.priority = 'medium';
        }
        
        // Add Notion reference
        transformed.externalRef = {
            system: 'notion',
            id: notionData.id,
            url: notionData.url
        };
        
        return transformed;
    }
    
    /**
     * Merge conflicts between Tala and Notion
     */
    async mergeConflicts(talaTask, notionTask) {
        // Simple merge strategy - combine non-conflicting fields
        const merged = { ...talaTask };
        
        // If Notion has a later update time, prefer its status
        if (new Date(notionTask.updated_at) > new Date(talaTask.updated_at)) {
            merged.status = notionTask.status;
        }
        
        // Combine tags
        const allTags = new Set([
            ...(talaTask.tags || []),
            ...(notionTask.tags || [])
        ]);
        merged.tags = Array.from(allTags);
        
        // Keep the most specific description
        if (notionTask.description && notionTask.description.length > (talaTask.description || '').length) {
            merged.description = notionTask.description;
        }
        
        return merged;
    }
    
    /**
     * Get default property mappings
     */
    getDefaultMappings() {
        return {
            title: 'Name',
            status: 'Status',
            priority: 'Priority',
            dueDate: 'Due Date',
            assignee: 'Assignee',
            tags: 'Tags',
            source: 'Source',
            lastSynced: 'Last Synced'
        };
    }
    
    /**
     * Get or create client
     */
    getClient(config) {
        if (!this.client || this.client.auth !== config.apiKey) {
            this.client = new Client({
                auth: config.apiKey
            });
        }
        return this.client;
    }
    
    /**
     * Extract text from various property types
     */
    extractTextFromProperty(property) {
        if (property.title) {
            return property.title.map(t => t.plain_text).join('');
        }
        if (property.rich_text) {
            return property.rich_text.map(t => t.plain_text).join('');
        }
        if (property.select) {
            return property.select.name;
        }
        if (property.multi_select) {
            return property.multi_select.map(s => s.name).join(', ');
        }
        if (property.number !== undefined) {
            return property.number.toString();
        }
        if (property.checkbox !== undefined) {
            return property.checkbox;
        }
        if (property.url) {
            return property.url;
        }
        if (property.email) {
            return property.email;
        }
        if (property.phone_number) {
            return property.phone_number;
        }
        return null;
    }
    
    /**
     * Extract value from property
     */
    extractValueFromProperty(property) {
        const propertyType = property.type;
        
        switch (propertyType) {
            case 'title':
            case 'rich_text':
                return this.extractTextFromProperty(property);
            case 'number':
                return property.number;
            case 'select':
                return property.select?.name;
            case 'multi_select':
                return property.multi_select?.map(s => s.name);
            case 'date':
                return property.date?.start;
            case 'checkbox':
                return property.checkbox;
            case 'url':
                return property.url;
            case 'email':
                return property.email;
            case 'people':
                return property.people?.map(p => p.id);
            default:
                return null;
        }
    }
    
    /**
     * Extract text from block
     */
    extractTextFromBlock(block) {
        const type = block.type;
        const content = block[type];
        
        if (content?.rich_text) {
            return content.rich_text.map(t => t.plain_text).join('');
        }
        
        return null;
    }
    
    /**
     * Build custom property based on type
     */
    buildCustomProperty(value, propertyType) {
        switch (propertyType) {
            case 'rich_text':
                return {
                    rich_text: [{
                        text: { content: value.toString() }
                    }]
                };
            case 'number':
                return { number: Number(value) };
            case 'checkbox':
                return { checkbox: Boolean(value) };
            case 'url':
                return { url: value.toString() };
            case 'select':
                return { select: { name: value.toString() } };
            default:
                return {
                    rich_text: [{
                        text: { content: value.toString() }
                    }]
                };
        }
    }
    
    /**
     * Extract title from database title
     */
    extractTitle(title) {
        if (Array.isArray(title)) {
            return title.map(t => t.plain_text).join('');
        }
        return 'Untitled Database';
    }
    
    /**
     * Validate UUID format
     */
    isValidUUID(uuid) {
        const uuidRegex = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid.replace(/-/g, ''));
    }
}

export default NotionIntegration;