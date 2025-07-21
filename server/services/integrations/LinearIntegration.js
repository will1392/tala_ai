/**
 * Linear Integration - Connect Tala AI with Linear issue tracking
 * Handles issue creation, updates, and bidirectional sync
 */

import { LinearClient } from '@linear/sdk';
import { v4 as uuidv4 } from 'uuid';

// Priority mapping between Tala and Linear
const PriorityMapping = {
    tala_to_linear: {
        'urgent': 1,      // Urgent
        'high': 2,        // High
        'medium': 3,      // Normal
        'low': 4          // Low
    },
    linear_to_tala: {
        0: 'low',         // No priority
        1: 'urgent',      // Urgent
        2: 'high',        // High
        3: 'medium',      // Normal
        4: 'low'          // Low
    }
};

// Status mapping
const StatusMapping = {
    tala_to_linear: {
        'pending': 'todo',
        'in_progress': 'in_progress',
        'completed': 'done',
        'cancelled': 'canceled'
    },
    linear_to_tala: {
        'backlog': 'pending',
        'todo': 'pending',
        'in_progress': 'in_progress',
        'done': 'completed',
        'canceled': 'cancelled'
    }
};

// Label colors for tags
const LabelColors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#96CEB4', // Green
    '#FECA57', // Yellow
    '#DDA0DD', // Plum
    '#98D8C8', // Mint
    '#F8B500'  // Orange
];

class LinearIntegration {
    constructor() {
        this.id = 'linear';
        this.name = 'Linear';
        this.type = 'issue_tracking';
        this.version = '1.0.0';
        this.description = 'Sync tasks with Linear issue tracking';
        
        this.requiredConfig = [
            'apiKey',
            'teamId'
        ];
        
        this.optionalConfig = [
            'projectId',
            'defaultAssigneeId',
            'stateMapping',
            'labelPrefix',
            'syncComments',
            'syncAttachments'
        ];
        
        this.features = [
            'create_issues',
            'update_issues',
            'delete_issues',
            'sync_bidirectional',
            'team_management',
            'project_support',
            'label_sync',
            'comment_sync',
            'attachment_support',
            'workflow_states',
            'priority_levels',
            'due_dates',
            'estimates',
            'cycles',
            'milestones'
        ];
        
        this.client = null;
        this.teamCache = new Map();
        this.userCache = new Map();
        this.labelCache = new Map();
        this.stateCache = new Map();
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
        if (config.apiKey && config.apiKey.length < 40) {
            errors.push('Invalid API key format');
        }
        
        // Validate team ID format (UUID)
        if (config.teamId && !this.isValidUUID(config.teamId)) {
            errors.push('Invalid team ID format');
        }
        
        if (errors.length > 0) {
            throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
        }
        
        return true;
    }
    
    /**
     * Test connection to Linear
     */
    async testConnection(config) {
        try {
            const client = new LinearClient({
                apiKey: config.apiKey
            });
            
            // Get the team
            const team = await client.team(config.teamId);
            
            if (!team) {
                throw new Error('Team not found');
            }
            
            // Get available states for the team
            const states = await team.states();
            
            // Cache states for later use
            this.stateCache.set(config.teamId, states.nodes);
            
            return {
                success: true,
                team: {
                    id: team.id,
                    name: team.name,
                    key: team.key
                },
                states: states.nodes.map(s => ({
                    id: s.id,
                    name: s.name,
                    type: s.type
                }))
            };
            
        } catch (error) {
            throw new Error(`Connection test failed: ${error.message}`);
        }
    }
    
    /**
     * Create an issue in Linear
     */
    async createTask(taskData, config) {
        try {
            const client = this.getClient(config);
            
            // Build issue input
            const issueInput = await this.buildLinearIssue(taskData, config);
            
            // Create the issue
            const issue = await client.createIssue(issueInput);
            
            // Add labels if needed
            if (taskData.tags && taskData.tags.length > 0) {
                await this.syncLabels(issue, taskData.tags, config);
            }
            
            // Add comments if description is long
            if (taskData.description && taskData.description.length > 1000) {
                await this.addDescription(issue, taskData.description);
            }
            
            return {
                id: issue.id,
                identifier: issue.identifier,
                url: issue.url,
                created: true
            };
            
        } catch (error) {
            throw new Error(`Failed to create issue in Linear: ${error.message}`);
        }
    }
    
    /**
     * Update an issue in Linear
     */
    async updateTask(linearIssueId, taskData, config) {
        try {
            const client = this.getClient(config);
            
            // Get current issue
            const issue = await client.issue(linearIssueId);
            
            if (!issue) {
                throw new Error('Issue not found');
            }
            
            // Build update input
            const updateInput = await this.buildLinearUpdate(taskData, config, issue);
            
            // Update the issue
            await issue.update(updateInput);
            
            // Update labels
            if (taskData.tags !== undefined) {
                await this.syncLabels(issue, taskData.tags, config);
            }
            
            return {
                id: issue.id,
                identifier: issue.identifier,
                url: issue.url,
                updated: true
            };
            
        } catch (error) {
            throw new Error(`Failed to update issue in Linear: ${error.message}`);
        }
    }
    
    /**
     * Delete an issue in Linear
     */
    async deleteTask(linearIssueId, config) {
        try {
            const client = this.getClient(config);
            
            // Get the issue
            const issue = await client.issue(linearIssueId);
            
            if (!issue) {
                throw new Error('Issue not found');
            }
            
            // Linear doesn't allow deletion, so we archive it
            await issue.archive();
            
            return {
                id: issue.id,
                archived: true
            };
            
        } catch (error) {
            throw new Error(`Failed to archive issue in Linear: ${error.message}`);
        }
    }
    
    /**
     * Get issues from Linear
     */
    async getTasks(options = {}, config) {
        try {
            const client = this.getClient(config);
            const { since, limit = 100, filters = {} } = options;
            
            // Build filter
            const filter = {
                team: { id: { eq: config.teamId } }
            };
            
            // Add time filter
            if (since) {
                filter.updatedAt = { gte: since.toISOString() };
            }
            
            // Add status filter
            if (filters.status) {
                const linearStatus = StatusMapping.tala_to_linear[filters.status];
                if (linearStatus) {
                    filter.state = { type: { eq: linearStatus } };
                }
            }
            
            // Add project filter
            if (config.projectId) {
                filter.project = { id: { eq: config.projectId } };
            }
            
            // Exclude archived
            filter.archivedAt = { null: true };
            
            // Query issues
            const issues = await client.issues({
                filter,
                first: Math.min(limit, 250),
                orderBy: LinearClient.IssueOrderBy.UpdatedAt
            });
            
            // Transform results
            const tasks = [];
            for (const issue of issues.nodes) {
                const task = await this.transformFromLinear(issue, config);
                tasks.push(task);
            }
            
            return tasks;
            
        } catch (error) {
            throw new Error(`Failed to get issues from Linear: ${error.message}`);
        }
    }
    
    /**
     * Build Linear issue from task data
     */
    async buildLinearIssue(taskData, config) {
        const issueInput = {
            teamId: config.teamId,
            title: taskData.title || 'Untitled Task'
        };
        
        // Add description (Linear has 1000 char limit for description field)
        if (taskData.description) {
            issueInput.description = taskData.description.substring(0, 1000);
        }
        
        // Set priority
        if (taskData.priority) {
            issueInput.priority = PriorityMapping.tala_to_linear[taskData.priority] || 3;
        }
        
        // Set due date
        if (taskData.dueDate) {
            issueInput.dueDate = new Date(taskData.dueDate).toISOString();
        }
        
        // Set state based on status
        if (taskData.status) {
            const stateType = StatusMapping.tala_to_linear[taskData.status];
            const state = await this.getStateByType(config.teamId, stateType);
            if (state) {
                issueInput.stateId = state.id;
            }
        }
        
        // Set project
        if (config.projectId) {
            issueInput.projectId = config.projectId;
        }
        
        // Set assignee
        if (taskData.assignedTo) {
            // Would need user mapping in practice
            if (config.defaultAssigneeId) {
                issueInput.assigneeId = config.defaultAssigneeId;
            }
        }
        
        // Add estimate if available
        if (taskData.metadata?.estimate) {
            issueInput.estimate = Number(taskData.metadata.estimate);
        }
        
        // Add parent if it's a subtask
        if (taskData.parentTaskId) {
            const parentMapping = await this.getExternalMapping(taskData.parentTaskId);
            if (parentMapping) {
                issueInput.parentId = parentMapping;
            }
        }
        
        return issueInput;
    }
    
    /**
     * Build Linear update from task data
     */
    async buildLinearUpdate(taskData, config, currentIssue) {
        const updateInput = {};
        
        // Update title
        if (taskData.title !== undefined && taskData.title !== currentIssue.title) {
            updateInput.title = taskData.title;
        }
        
        // Update description
        if (taskData.description !== undefined) {
            const newDescription = taskData.description.substring(0, 1000);
            if (newDescription !== currentIssue.description) {
                updateInput.description = newDescription;
            }
        }
        
        // Update priority
        if (taskData.priority !== undefined) {
            const newPriority = PriorityMapping.tala_to_linear[taskData.priority] || 3;
            if (newPriority !== currentIssue.priority) {
                updateInput.priority = newPriority;
            }
        }
        
        // Update due date
        if (taskData.dueDate !== undefined) {
            const newDueDate = taskData.dueDate ? new Date(taskData.dueDate).toISOString() : null;
            if (newDueDate !== currentIssue.dueDate) {
                updateInput.dueDate = newDueDate;
            }
        }
        
        // Update state
        if (taskData.status !== undefined) {
            const stateType = StatusMapping.tala_to_linear[taskData.status];
            const state = await this.getStateByType(config.teamId, stateType);
            if (state && state.id !== currentIssue.state.id) {
                updateInput.stateId = state.id;
            }
        }
        
        return updateInput;
    }
    
    /**
     * Transform Linear issue to Tala task format
     */
    async transformFromLinear(issue, config) {
        const task = {
            id: issue.id,
            identifier: issue.identifier,
            title: issue.title,
            url: issue.url,
            created_at: issue.createdAt,
            updated_at: issue.updatedAt
        };
        
        // Get description (may need to fetch comments for full description)
        task.description = issue.description || '';
        
        // Map priority
        task.priority = PriorityMapping.linear_to_tala[issue.priority] || 'medium';
        
        // Map status from state
        const state = await issue.state;
        if (state) {
            task.status = StatusMapping.linear_to_tala[state.type] || 'pending';
        }
        
        // Get due date
        if (issue.dueDate) {
            task.dueDate = new Date(issue.dueDate);
        }
        
        // Get assignee
        const assignee = await issue.assignee;
        if (assignee) {
            task.assignedTo = {
                id: assignee.id,
                name: assignee.name,
                email: assignee.email
            };
        }
        
        // Get labels as tags
        const labels = await issue.labels();
        task.tags = labels.nodes
            .map(label => label.name)
            .filter(name => !config.labelPrefix || !name.startsWith(config.labelPrefix));
        
        // Get metadata
        task.metadata = {
            linearTeam: (await issue.team)?.name,
            linearProject: (await issue.project)?.name,
            estimate: issue.estimate,
            identifier: issue.identifier
        };
        
        // Get parent task
        const parent = await issue.parent;
        if (parent) {
            task.parentTaskId = parent.id;
        }
        
        // Get comments if enabled
        if (config.syncComments) {
            const comments = await issue.comments();
            if (comments.nodes.length > 0) {
                task.comments = comments.nodes.map(comment => ({
                    id: comment.id,
                    body: comment.body,
                    createdAt: comment.createdAt,
                    user: comment.user?.name
                }));
            }
        }
        
        return task;
    }
    
    /**
     * Sync labels between Tala tags and Linear labels
     */
    async syncLabels(issue, tags, config) {
        const client = this.getClient(config);
        
        // Get current labels
        const currentLabels = await issue.labels();
        const currentLabelNames = currentLabels.nodes.map(l => l.name);
        
        // Determine labels to add/remove
        const prefix = config.labelPrefix || '';
        const desiredLabels = tags.map(tag => prefix + tag);
        
        const toAdd = desiredLabels.filter(label => !currentLabelNames.includes(label));
        const toRemove = currentLabelNames
            .filter(label => !prefix || label.startsWith(prefix))
            .filter(label => !desiredLabels.includes(label));
        
        // Add new labels
        for (const labelName of toAdd) {
            const label = await this.getOrCreateLabel(labelName, config);
            await issue.addLabel(label);
        }
        
        // Remove old labels
        for (const labelName of toRemove) {
            const label = currentLabels.nodes.find(l => l.name === labelName);
            if (label) {
                await issue.removeLabel(label);
            }
        }
    }
    
    /**
     * Get or create a label
     */
    async getOrCreateLabel(name, config) {
        // Check cache
        if (this.labelCache.has(name)) {
            return this.labelCache.get(name);
        }
        
        const client = this.getClient(config);
        
        // Search for existing label
        const labels = await client.issueLabels({
            filter: {
                team: { id: { eq: config.teamId } },
                name: { eq: name }
            }
        });
        
        if (labels.nodes.length > 0) {
            const label = labels.nodes[0];
            this.labelCache.set(name, label);
            return label;
        }
        
        // Create new label
        const color = LabelColors[this.labelCache.size % LabelColors.length];
        const label = await client.createIssueLabel({
            teamId: config.teamId,
            name: name,
            color: color
        });
        
        this.labelCache.set(name, label);
        return label;
    }
    
    /**
     * Add long description as comment
     */
    async addDescription(issue, description) {
        if (description.length > 1000) {
            // Add the full description as a comment
            await issue.createComment({
                body: description
            });
        }
    }
    
    /**
     * Get workflow state by type
     */
    async getStateByType(teamId, stateType) {
        // Get from cache or fetch
        let states = this.stateCache.get(teamId);
        
        if (!states) {
            const client = this.getClient();
            const team = await client.team(teamId);
            const statesResult = await team.states();
            states = statesResult.nodes;
            this.stateCache.set(teamId, states);
        }
        
        // Find state by type
        return states.find(state => state.type === stateType);
    }
    
    /**
     * Transform for external (Linear) format
     */
    async transformForExternal(data, originalTask) {
        const transformed = { ...data };
        
        // Ensure required fields
        if (!transformed.title && originalTask.title) {
            transformed.title = originalTask.title;
        }
        
        // Transform status to Linear state type
        if (transformed.status) {
            transformed.linearStateType = StatusMapping.tala_to_linear[transformed.status];
        }
        
        // Transform priority to number
        if (transformed.priority) {
            transformed.linearPriority = PriorityMapping.tala_to_linear[transformed.priority];
        }
        
        return transformed;
    }
    
    /**
     * Transform from external (Linear) format
     */
    async transformFromExternal(data, linearData) {
        const transformed = { ...data };
        
        // Ensure Tala format consistency
        if (!transformed.status) {
            transformed.status = 'pending';
        }
        
        if (!transformed.priority) {
            transformed.priority = 'medium';
        }
        
        // Add Linear reference
        transformed.externalRef = {
            system: 'linear',
            id: linearData.id,
            identifier: linearData.identifier,
            url: linearData.url
        };
        
        return transformed;
    }
    
    /**
     * Merge conflicts between Tala and Linear
     */
    async mergeConflicts(talaTask, linearTask) {
        const merged = { ...talaTask };
        
        // Linear typically has better workflow state management
        merged.status = linearTask.status;
        
        // Combine descriptions if they differ
        if (linearTask.description && linearTask.description !== talaTask.description) {
            merged.description = `${talaTask.description}\n\n---\nLinear Update:\n${linearTask.description}`;
        }
        
        // Use Linear's priority as it's more granular
        merged.priority = linearTask.priority;
        
        // Merge tags
        const allTags = new Set([
            ...(talaTask.tags || []),
            ...(linearTask.tags || [])
        ]);
        merged.tags = Array.from(allTags);
        
        // Keep Linear's assignee as it's authoritative for team management
        if (linearTask.assignedTo) {
            merged.assignedTo = linearTask.assignedTo;
        }
        
        return merged;
    }
    
    /**
     * Get or create client
     */
    getClient(config) {
        if (!this.client || this.client._apiKey !== config.apiKey) {
            this.client = new LinearClient({
                apiKey: config.apiKey
            });
        }
        return this.client;
    }
    
    /**
     * Get external mapping (would be from database in practice)
     */
    async getExternalMapping(talaId) {
        // This would query the entity_mappings table
        // For now, return null
        return null;
    }
    
    /**
     * Validate UUID format
     */
    isValidUUID(uuid) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    }
    
    /**
     * Get team information
     */
    async getTeamInfo(teamId, config) {
        if (this.teamCache.has(teamId)) {
            return this.teamCache.get(teamId);
        }
        
        const client = this.getClient(config);
        const team = await client.team(teamId);
        
        const teamInfo = {
            id: team.id,
            name: team.name,
            key: team.key
        };
        
        this.teamCache.set(teamId, teamInfo);
        return teamInfo;
    }
    
    /**
     * Get available projects for a team
     */
    async getProjects(config) {
        const client = this.getClient(config);
        const team = await client.team(config.teamId);
        const projects = await team.projects();
        
        return projects.nodes.map(project => ({
            id: project.id,
            name: project.name,
            description: project.description,
            state: project.state
        }));
    }
    
    /**
     * Get available users for assignment
     */
    async getUsers(config) {
        const client = this.getClient(config);
        const team = await client.team(config.teamId);
        const members = await team.members();
        
        return members.nodes.map(member => ({
            id: member.id,
            name: member.name,
            email: member.email,
            active: member.active
        }));
    }
}

export default LinearIntegration;