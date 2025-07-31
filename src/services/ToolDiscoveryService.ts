/**
 * Tool Discovery Service
 * Provides intelligent tool recommendations, usage tutorials, and search functionality
 */

interface Tool {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  prerequisites?: string[];
}

interface ToolRecommendation {
  toolId: string;
  reason: string;
  confidence: number;
  context: string[];
}

interface UserContext {
  currentTask?: string;
  recentTools: string[];
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
  industry?: string;
  goals?: string[];
}

interface Tutorial {
  id: string;
  toolId: string;
  title: string;
  steps: TutorialStep[];
  estimatedTime: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

interface TutorialStep {
  title: string;
  description: string;
  action: string;
  tips?: string[];
  screenshot?: string;
}

class ToolDiscoveryService {
  private tools: Map<string, Tool> = new Map();
  private tutorials: Map<string, Tutorial[]> = new Map();
  private userPatterns: Map<string, any> = new Map();
  
  constructor() {
    this.initializeTools();
    this.initializeTutorials();
  }

  /**
   * Initialize tool registry
   */
  private initializeTools() {
    // This would typically load from a database or API
    const toolsData: Tool[] = [
      {
        id: 'title-tag-tester',
        name: 'Title Tag Tester',
        description: 'Optimize title tags for SEO',
        category: 'seo',
        tags: ['seo', 'optimization', 'meta', 'search'],
        difficulty: 'beginner',
        estimatedTime: '2-5 minutes',
        prerequisites: []
      },
      {
        id: 'schema-markup-generator',
        name: 'Schema Markup Generator',
        description: 'Create structured data for better search visibility',
        category: 'seo',
        tags: ['seo', 'schema', 'structured-data', 'technical'],
        difficulty: 'advanced',
        estimatedTime: '10-15 minutes',
        prerequisites: ['basic-html-knowledge']
      },
      {
        id: 'hashtag-generator',
        name: 'Hashtag Generator',
        description: 'Generate relevant hashtags for social media',
        category: 'social',
        tags: ['social', 'hashtags', 'instagram', 'twitter'],
        difficulty: 'beginner',
        estimatedTime: '2-3 minutes',
        prerequisites: []
      },
      {
        id: 'campaign-builder',
        name: 'Campaign Builder',
        description: 'Create comprehensive marketing campaigns',
        category: 'email',
        tags: ['email', 'campaign', 'automation', 'strategy'],
        difficulty: 'intermediate',
        estimatedTime: '20-30 minutes',
        prerequisites: ['email-list', 'content-strategy']
      },
      {
        id: 'ab-test-calculator',
        name: 'A/B Test Calculator',
        description: 'Calculate statistical significance for tests',
        category: 'analytics',
        tags: ['analytics', 'testing', 'statistics', 'optimization'],
        difficulty: 'intermediate',
        estimatedTime: '5-10 minutes',
        prerequisites: ['basic-statistics']
      }
    ];

    toolsData.forEach(tool => this.tools.set(tool.id, tool));
  }

  /**
   * Initialize tutorials
   */
  private initializeTutorials() {
    const tutorialsData: Tutorial[] = [
      {
        id: 'title-tag-basics',
        toolId: 'title-tag-tester',
        title: 'Getting Started with Title Tag Optimization',
        estimatedTime: '5 minutes',
        difficulty: 'beginner',
        steps: [
          {
            title: 'Enter Your Title',
            description: 'Type or paste your title tag in the input field',
            action: 'Type in the title input field',
            tips: ['Keep it under 60 characters', 'Include your primary keyword']
          },
          {
            title: 'Review Analysis',
            description: 'Check the real-time analysis of your title',
            action: 'Review the feedback panel',
            tips: ['Green indicators are good', 'Address any red warnings']
          },
          {
            title: 'Apply Suggestions',
            description: 'Use the AI suggestions to improve your title',
            action: 'Click on suggested improvements',
            tips: ['Try multiple variations', 'Test different keyword placements']
          }
        ]
      },
      {
        id: 'advanced-schema',
        toolId: 'schema-markup-generator',
        title: 'Creating Rich Snippets with Schema Markup',
        estimatedTime: '15 minutes',
        difficulty: 'advanced',
        steps: [
          {
            title: 'Select Schema Type',
            description: 'Choose the appropriate schema type for your content',
            action: 'Select from the dropdown menu',
            tips: ['Article for blog posts', 'Product for e-commerce', 'LocalBusiness for stores']
          },
          {
            title: 'Fill Required Fields',
            description: 'Complete all required fields for the schema',
            action: 'Fill in the form fields',
            tips: ['Be accurate and specific', 'Use consistent formatting']
          },
          {
            title: 'Generate and Test',
            description: 'Generate the schema markup and test it',
            action: 'Click Generate and use the testing tool',
            tips: ['Validate with Google\'s tool', 'Check for warnings']
          }
        ]
      }
    ];

    tutorialsData.forEach(tutorial => {
      const existing = this.tutorials.get(tutorial.toolId) || [];
      existing.push(tutorial);
      this.tutorials.set(tutorial.toolId, existing);
    });
  }

  /**
   * Get tool recommendations based on user context
   */
  async getRecommendations(context: UserContext): Promise<ToolRecommendation[]> {
    const recommendations: ToolRecommendation[] = [];

    // Analyze current task
    if (context.currentTask) {
      const taskKeywords = this.extractKeywords(context.currentTask);
      
      this.tools.forEach((tool, toolId) => {
        const relevance = this.calculateRelevance(tool, taskKeywords);
        if (relevance > 0.3) {
          recommendations.push({
            toolId,
            reason: `Relevant for "${context.currentTask}"`,
            confidence: relevance,
            context: taskKeywords
          });
        }
      });
    }

    // Recommend based on skill progression
    const skillRecommendations = this.getSkillProgressionRecommendations(context);
    recommendations.push(...skillRecommendations);

    // Recommend complementary tools
    if (context.recentTools.length > 0) {
      const complementary = this.getComplementaryTools(context.recentTools);
      recommendations.push(...complementary);
    }

    // Sort by confidence and remove duplicates
    const uniqueRecommendations = this.deduplicateRecommendations(recommendations);
    return uniqueRecommendations.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
  }

  /**
   * Search tools
   */
  searchTools(query: string, filters?: {
    category?: string;
    difficulty?: string;
    tags?: string[];
  }): Tool[] {
    const queryLower = query.toLowerCase();
    const results: Array<{ tool: Tool; score: number }> = [];

    this.tools.forEach(tool => {
      let score = 0;

      // Name match (highest weight)
      if (tool.name.toLowerCase().includes(queryLower)) {
        score += 10;
      }

      // Description match
      if (tool.description.toLowerCase().includes(queryLower)) {
        score += 5;
      }

      // Tag match
      tool.tags.forEach(tag => {
        if (tag.toLowerCase().includes(queryLower)) {
          score += 3;
        }
      });

      // Apply filters
      if (filters) {
        if (filters.category && tool.category !== filters.category) {
          score = 0;
        }
        if (filters.difficulty && tool.difficulty !== filters.difficulty) {
          score = 0;
        }
        if (filters.tags && !filters.tags.some(tag => tool.tags.includes(tag))) {
          score = 0;
        }
      }

      if (score > 0) {
        results.push({ tool, score });
      }
    });

    return results
      .sort((a, b) => b.score - a.score)
      .map(result => result.tool);
  }

  /**
   * Get tutorials for a tool
   */
  getTutorials(toolId: string, userLevel?: 'beginner' | 'intermediate' | 'advanced'): Tutorial[] {
    const tutorials = this.tutorials.get(toolId) || [];
    
    if (userLevel) {
      return tutorials.filter(t => t.difficulty === userLevel);
    }
    
    return tutorials;
  }

  /**
   * Get interactive tutorial steps
   */
  getInteractiveTutorial(tutorialId: string): Tutorial | null {
    for (const tutorials of this.tutorials.values()) {
      const tutorial = tutorials.find(t => t.id === tutorialId);
      if (tutorial) return tutorial;
    }
    return null;
  }

  /**
   * Track tool usage for better recommendations
   */
  trackToolUsage(userId: string, toolId: string, context: {
    duration: number;
    completed: boolean;
    satisfaction?: number;
  }) {
    const userPattern = this.userPatterns.get(userId) || {
      toolUsage: {},
      preferences: {},
      skillProgress: {}
    };

    // Update tool usage
    if (!userPattern.toolUsage[toolId]) {
      userPattern.toolUsage[toolId] = {
        count: 0,
        totalDuration: 0,
        completionRate: 0,
        avgSatisfaction: 0
      };
    }

    const usage = userPattern.toolUsage[toolId];
    usage.count++;
    usage.totalDuration += context.duration;
    usage.completionRate = ((usage.completionRate * (usage.count - 1)) + (context.completed ? 1 : 0)) / usage.count;
    
    if (context.satisfaction) {
      usage.avgSatisfaction = ((usage.avgSatisfaction * (usage.count - 1)) + context.satisfaction) / usage.count;
    }

    // Update skill progress
    const tool = this.tools.get(toolId);
    if (tool && context.completed) {
      userPattern.skillProgress[tool.category] = (userPattern.skillProgress[tool.category] || 0) + 1;
    }

    this.userPatterns.set(userId, userPattern);
  }

  /**
   * Get personalized tool suggestions
   */
  getPersonalizedSuggestions(userId: string): ToolRecommendation[] {
    const userPattern = this.userPatterns.get(userId);
    if (!userPattern) return [];

    const suggestions: ToolRecommendation[] = [];

    // Suggest tools in categories with high engagement
    const topCategories = Object.entries(userPattern.skillProgress)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category);

    topCategories.forEach(category => {
      const categoryTools = Array.from(this.tools.values())
        .filter(tool => tool.category === category);
      
      categoryTools.forEach(tool => {
        if (!userPattern.toolUsage[tool.id] || userPattern.toolUsage[tool.id].count < 2) {
          suggestions.push({
            toolId: tool.id,
            reason: `Popular in ${category} category`,
            confidence: 0.7,
            context: [category]
          });
        }
      });
    });

    return suggestions;
  }

  /**
   * Private helper methods
   */
  private extractKeywords(text: string): string[] {
    // Simple keyword extraction
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.has(word));
  }

  private calculateRelevance(tool: Tool, keywords: string[]): number {
    let matches = 0;
    const totalKeywords = keywords.length;

    keywords.forEach(keyword => {
      if (tool.name.toLowerCase().includes(keyword)) matches += 2;
      if (tool.description.toLowerCase().includes(keyword)) matches += 1;
      if (tool.tags.some(tag => tag.includes(keyword))) matches += 1.5;
    });

    return totalKeywords > 0 ? matches / (totalKeywords * 2) : 0;
  }

  private getSkillProgressionRecommendations(context: UserContext): ToolRecommendation[] {
    const recommendations: ToolRecommendation[] = [];
    const userLevel = context.skillLevel;

    this.tools.forEach((tool, toolId) => {
      // Skip tools user has recently used
      if (context.recentTools.includes(toolId)) return;

      // Recommend tools matching user level
      if (tool.difficulty === userLevel) {
        recommendations.push({
          toolId,
          reason: `Matches your ${userLevel} skill level`,
          confidence: 0.6,
          context: [userLevel]
        });
      }

      // Recommend next level tools for progression
      if (userLevel === 'beginner' && tool.difficulty === 'intermediate') {
        recommendations.push({
          toolId,
          reason: 'Ready to try more advanced tools',
          confidence: 0.4,
          context: ['skill-progression']
        });
      }
    });

    return recommendations;
  }

  private getComplementaryTools(recentTools: string[]): ToolRecommendation[] {
    const recommendations: ToolRecommendation[] = [];
    
    // Define tool relationships
    const complementaryPairs: Record<string, string[]> = {
      'title-tag-tester': ['meta-description-optimizer', 'keyword-density-analyzer'],
      'hashtag-generator': ['content-calendar', 'social-preview-tool'],
      'email-subject-tester': ['campaign-builder', 'ab-test-calculator'],
      'competitor-analyzer': ['backlink-checker', 'trend-analyzer']
    };

    recentTools.forEach(toolId => {
      const complements = complementaryPairs[toolId] || [];
      complements.forEach(complementId => {
        if (this.tools.has(complementId)) {
          recommendations.push({
            toolId: complementId,
            reason: `Works well with ${this.tools.get(toolId)?.name}`,
            confidence: 0.8,
            context: ['complementary', toolId]
          });
        }
      });
    });

    return recommendations;
  }

  private deduplicateRecommendations(recommendations: ToolRecommendation[]): ToolRecommendation[] {
    const seen = new Map<string, ToolRecommendation>();
    
    recommendations.forEach(rec => {
      const existing = seen.get(rec.toolId);
      if (!existing || existing.confidence < rec.confidence) {
        seen.set(rec.toolId, rec);
      }
    });

    return Array.from(seen.values());
  }
}

// Export singleton instance
export const toolDiscoveryService = new ToolDiscoveryService();

// Export types
export type { Tool, ToolRecommendation, UserContext, Tutorial, TutorialStep };