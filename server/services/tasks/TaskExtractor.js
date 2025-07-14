/**
 * Task Extractor Service
 * 
 * Uses AI to analyze email content and extract tasks
 */

import ChatService from '../chatService.js';
import DeadlineParser from './DeadlineParser.js';
import { extractTasksPrompt, analyzeTaskContextPrompt } from '../../prompts/taskExtraction.js';

class TaskExtractor {
  constructor(chatService = null) {
    this.chatService = chatService;
    this.deadlineParser = new DeadlineParser();
    
    // Task extraction patterns
    this.taskPatterns = {
      explicit: [
        /please\s+(book|reserve|schedule|arrange|organize)/i,
        /can\s+you\s+(book|reserve|schedule|arrange|organize)/i,
        /could\s+you\s+(book|reserve|schedule|arrange|organize)/i,
        /would\s+you\s+(book|reserve|schedule|arrange|organize)/i,
        /i\s+need\s+(you\s+to\s+)?(book|reserve|schedule|arrange|organize)/i,
        /we\s+need\s+(you\s+to\s+)?(book|reserve|schedule|arrange|organize)/i,
        /kindly\s+(book|reserve|schedule|arrange|organize)/i,
        /make\s+sure\s+to\s+(book|reserve|schedule|arrange|organize)/i
      ],
      implicit: [
        /looking\s+for\s+(hotels?|flights?|restaurants?|activities)/i,
        /interested\s+in\s+(hotels?|flights?|restaurants?|activities)/i,
        /thinking\s+about\s+(visiting|traveling|going)/i,
        /planning\s+(a\s+trip|to\s+visit|to\s+travel)/i,
        /want\s+to\s+(visit|travel|go|stay)/i,
        /considering\s+(hotels?|flights?|restaurants?|activities)/i,
        /options\s+for\s+(hotels?|flights?|restaurants?|activities)/i,
        /recommendations?\s+for\s+(hotels?|flights?|restaurants?|activities)/i
      ],
      followUp: [
        /follow[\s-]?up/i,
        /get\s+back\s+to/i,
        /circle\s+back/i,
        /check\s+on/i,
        /update\s+on/i,
        /status\s+of/i,
        /progress\s+on/i
      ]
    };
    
    // Task type classifications
    this.taskTypes = {
      booking: ['book', 'reserve', 'reservation', 'booking'],
      research: ['find', 'search', 'look for', 'research', 'options', 'recommendations'],
      communication: ['email', 'call', 'contact', 'reach out', 'inform', 'notify'],
      documentation: ['prepare', 'create', 'draft', 'write', 'document'],
      coordination: ['arrange', 'organize', 'coordinate', 'schedule', 'plan']
    };
  }

  /**
   * Extract tasks from email content
   * @param {Object} email - Email object with content, subject, sender, etc.
   * @returns {Object} Extracted tasks with confidence scores
   */
  async extractTasks(email) {
    const { content, subject, from, date, thread = [] } = email;
    
    // First try pattern-based extraction for quick results
    const patternTasks = this.extractTasksFromPatterns(content, subject);
    
    // If AI service is available, use it for deeper analysis
    if (this.chatService) {
      try {
        const aiTasks = await this.extractTasksWithAI(email);
        return this.mergeTasks(patternTasks, aiTasks);
      } catch (error) {
        console.error('AI task extraction failed, using pattern-based only:', error);
      }
    }
    
    // Enhance pattern-based tasks with additional analysis
    const enhancedTasks = await this.enhanceTasks(patternTasks, email);
    
    return {
      tasks: enhancedTasks,
      metadata: {
        extractionMethod: this.chatService ? 'hybrid' : 'pattern-based',
        emailDate: date,
        sender: from,
        hasThread: thread.length > 0
      }
    };
  }

  /**
   * Extract tasks using pattern matching
   * @private
   */
  extractTasksFromPatterns(content, subject) {
    const tasks = [];
    const fullText = `${subject} ${content}`;
    
    // Extract explicit tasks
    for (const pattern of this.taskPatterns.explicit) {
      const matches = fullText.matchAll(pattern);
      for (const match of matches) {
        const taskText = this.extractTaskContext(fullText, match.index, 200);
        tasks.push({
          type: 'explicit',
          text: taskText,
          confidence: 0.9,
          pattern: pattern.source,
          position: match.index
        });
      }
    }
    
    // Extract implicit tasks
    for (const pattern of this.taskPatterns.implicit) {
      const matches = fullText.matchAll(pattern);
      for (const match of matches) {
        const taskText = this.extractTaskContext(fullText, match.index, 200);
        if (!this.isTaskAlreadyFound(tasks, taskText)) {
          tasks.push({
            type: 'implicit',
            text: taskText,
            confidence: 0.7,
            pattern: pattern.source,
            position: match.index
          });
        }
      }
    }
    
    // Extract follow-up tasks
    for (const pattern of this.taskPatterns.followUp) {
      const matches = fullText.matchAll(pattern);
      for (const match of matches) {
        const taskText = this.extractTaskContext(fullText, match.index, 150);
        if (!this.isTaskAlreadyFound(tasks, taskText)) {
          tasks.push({
            type: 'follow-up',
            text: taskText,
            confidence: 0.8,
            pattern: pattern.source,
            position: match.index
          });
        }
      }
    }
    
    return tasks;
  }

  /**
   * Extract task context around a match
   * @private
   */
  extractTaskContext(text, position, contextLength = 200) {
    const start = Math.max(0, position - contextLength / 2);
    const end = Math.min(text.length, position + contextLength / 2);
    let context = text.substring(start, end).trim();
    
    // Try to capture complete sentences
    const sentenceStart = context.indexOf('. ');
    if (sentenceStart > 0 && sentenceStart < 50) {
      context = context.substring(sentenceStart + 2);
    }
    
    const sentenceEnd = context.lastIndexOf('.');
    if (sentenceEnd > context.length - 50 && sentenceEnd < context.length - 1) {
      context = context.substring(0, sentenceEnd + 1);
    }
    
    return context.trim();
  }

  /**
   * Check if task is already found
   * @private
   */
  isTaskAlreadyFound(tasks, taskText) {
    const normalizedText = taskText.toLowerCase();
    return tasks.some(task => {
      const similarity = this.calculateTextSimilarity(
        task.text.toLowerCase(),
        normalizedText
      );
      return similarity > 0.8;
    });
  }

  /**
   * Calculate text similarity
   * @private
   */
  calculateTextSimilarity(text1, text2) {
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    return intersection.size / union.size;
  }

  /**
   * Extract tasks using AI
   * @private
   */
  async extractTasksWithAI(email) {
    const prompt = extractTasksPrompt
      .replace('{emailContent}', email.content)
      .replace('{senderName}', email.from)
      .replace('{subject}', email.subject);
    
    try {
      const response = await this.chatService.processMessage(prompt, null, {
        systemPrompt: 'You are a task extraction specialist. Extract and categorize tasks from emails with high accuracy.',
        temperature: 0.3,
        maxTokens: 1000
      });
      
      return this.parseAIResponse(response);
    } catch (error) {
      console.error('AI task extraction error:', error);
      return [];
    }
  }

  /**
   * Parse AI response
   * @private
   */
  parseAIResponse(response) {
    try {
      // Try to parse JSON response
      const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      
      // Try direct JSON parse
      return JSON.parse(response);
    } catch (error) {
      // Fallback to text parsing
      const tasks = [];
      const lines = response.split('\n');
      let currentTask = null;
      
      for (const line of lines) {
        if (line.match(/^\d+\.|^-|^•/)) {
          if (currentTask) {
            tasks.push(currentTask);
          }
          currentTask = {
            text: line.replace(/^\d+\.|^-|^•/, '').trim(),
            type: 'explicit',
            confidence: 0.8
          };
        } else if (currentTask && line.trim()) {
          currentTask.text += ' ' + line.trim();
        }
      }
      
      if (currentTask) {
        tasks.push(currentTask);
      }
      
      return tasks;
    }
  }

  /**
   * Merge pattern-based and AI tasks
   * @private
   */
  mergeTasks(patternTasks, aiTasks) {
    const merged = [...patternTasks];
    
    for (const aiTask of aiTasks) {
      if (!this.isTaskAlreadyFound(merged, aiTask.text)) {
        merged.push({
          ...aiTask,
          source: 'ai'
        });
      }
    }
    
    // Sort by confidence and position
    merged.sort((a, b) => {
      if (Math.abs(a.confidence - b.confidence) > 0.1) {
        return b.confidence - a.confidence;
      }
      return (a.position || 0) - (b.position || 0);
    });
    
    return {
      tasks: merged,
      metadata: {
        patternCount: patternTasks.length,
        aiCount: aiTasks.length,
        mergedCount: merged.length
      }
    };
  }

  /**
   * Enhance tasks with additional information
   * @private
   */
  async enhanceTasks(tasks, email) {
    const enhanced = [];
    
    for (const task of tasks) {
      const enhancedTask = { ...task };
      
      // Extract deadlines
      const deadline = this.deadlineParser.parseDeadline(task.text, email.date);
      if (deadline) {
        enhancedTask.deadline = deadline;
      }
      
      // Classify task type
      enhancedTask.taskType = this.classifyTaskType(task.text);
      
      // Extract entities
      enhancedTask.entities = this.extractEntities(task.text);
      
      // Add context
      enhancedTask.context = {
        sender: email.from,
        subject: email.subject,
        emailDate: email.date,
        threadId: email.threadId
      };
      
      enhanced.push(enhancedTask);
    }
    
    return enhanced;
  }

  /**
   * Classify task type
   * @private
   */
  classifyTaskType(taskText) {
    const lowerText = taskText.toLowerCase();
    
    for (const [type, keywords] of Object.entries(this.taskTypes)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        return type;
      }
    }
    
    return 'general';
  }

  /**
   * Extract entities from task text
   * @private
   */
  extractEntities(taskText) {
    const entities = {
      locations: [],
      dates: [],
      people: [],
      organizations: []
    };
    
    // Extract locations (simple pattern matching)
    const locationPattern = /(?:in|at|to|from)\s+([A-Z][a-zA-Z\s]+)/g;
    const locations = taskText.matchAll(locationPattern);
    for (const match of locations) {
      entities.locations.push(match[1].trim());
    }
    
    // Extract dates
    const dates = this.deadlineParser.extractAllDates(taskText);
    entities.dates = dates;
    
    // Extract email addresses as people
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = taskText.matchAll(emailPattern);
    for (const match of emails) {
      entities.people.push(match[0]);
    }
    
    return entities;
  }

  /**
   * Extract dependencies between tasks
   * @param {Array} tasks - List of tasks
   * @returns {Array} Tasks with dependency information
   */
  extractDependencies(tasks) {
    const dependencies = [];
    
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const taskLower = task.text.toLowerCase();
      
      // Look for dependency keywords
      if (taskLower.includes('after') || taskLower.includes('once') || taskLower.includes('when')) {
        // Try to find what this task depends on
        for (let j = 0; j < tasks.length; j++) {
          if (i !== j) {
            const otherTask = tasks[j];
            if (this.detectDependency(task.text, otherTask.text)) {
              dependencies.push({
                dependent: i,
                dependency: j,
                type: 'sequential'
              });
            }
          }
        }
      }
    }
    
    return dependencies;
  }

  /**
   * Detect if one task depends on another
   * @private
   */
  detectDependency(dependentText, dependencyText) {
    const dependent = dependentText.toLowerCase();
    const dependency = dependencyText.toLowerCase();
    
    // Extract key action from dependency
    const actionWords = dependency.match(/\b(book|reserve|confirm|arrange|complete)\b/g);
    if (!actionWords) return false;
    
    // Check if dependent references the action
    return actionWords.some(action => 
      dependent.includes(`after ${action}`) ||
      dependent.includes(`once ${action}`) ||
      dependent.includes(`when ${action}`)
    );
  }
}

export default TaskExtractor;