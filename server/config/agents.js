/**
 * Agent Configuration for Multi-Agent Orchestration System
 * 
 * Defines all available agents, their capabilities, and configuration parameters
 */

export const agentsConfig = {
  // Global agent settings
  global: {
    maxConcurrentAgents: 5,
    defaultTimeout: 30000,
    enablePerformanceTracking: true,
    healthCheckInterval: 60000,
    retryPolicy: {
      maxAttempts: 2,
      backoffMultiplier: 2,
      initialDelay: 1000
    }
  },

  // Agent definitions
  agents: {
    'email-monitor': {
      class: 'EmailMonitorAgent',
      name: 'Email Monitor Agent',
      description: 'Specializes in parsing travel emails, extracting bookings, confirmations, and action items',
      llm: 'gpt-4',
      temperature: 0.3,
      specialization: 'email-parsing',
      confidence_threshold: 0.8,
      timeout: 30000,
      capabilities: [
        'email-parsing',
        'booking-extraction',
        'confirmation-detection',
        'action-item-identification',
        'deadline-extraction',
        'contact-extraction',
        'travel-document-parsing'
      ],
      supportedFormats: ['text', 'html', 'eml', 'msg'],
      maxEmailSize: 5 * 1024 * 1024, // 5MB
      patterns: {
        airlines: ['booking confirmation', 'e-ticket', 'flight itinerary'],
        hotels: ['reservation', 'accommodation', 'check-in'],
        general: ['confirmation number', 'reference', 'booking id']
      }
    },

    'itinerary-builder': {
      class: 'ItineraryBuilderAgent',
      name: 'Itinerary Builder Agent',
      description: 'Creates detailed travel itineraries, optimizes routes, and handles complex scheduling',
      llm: 'claude-opus-4',
      temperature: 0.5,
      specialization: 'complex-planning',
      confidence_threshold: 0.75,
      max_execution_time: 30000,
      capabilities: [
        'itinerary-creation',
        'route-optimization',
        'multi-city-planning',
        'schedule-optimization',
        'transportation-planning',
        'accommodation-scheduling',
        'activity-planning',
        'time-zone-handling',
        'budget-allocation'
      ],
      optimizationParams: {
        minLayoverTime: 90,
        maxLayoverTime: 360,
        preferredArrivalWindow: { start: 9, end: 22 },
        maxDailyActivities: 4,
        bufferBetweenActivities: 30
      },
      supportedDestinations: 'worldwide',
      maxCities: 20,
      planningHorizon: 365 // days
    },

    // 'document-analyzer': {
    //   class: 'DocumentAnalyzerAgent',
    //   name: 'Document Analyzer Agent',
    //   description: 'Processes travel documents including passports, visas, tickets, with OCR and AI vision',
    //   llm: 'gemini-2.0',
    //   temperature: 0.2,
    //   specialization: 'document-analysis',
    //   confidence_threshold: 0.85,
    //   timeout: 45000,
    //   capabilities: [
    //     'document-analysis',
    //     'text-extraction',
    //     'image-processing',
    //     'pdf-parsing',
    //     'passport-reading',
    //     'visa-analysis',
    //     'ticket-extraction',
    //     'form-understanding',
    //     'multi-language-ocr'
    //   ],
    //   ocrSettings: {
    //     languages: ['eng', 'spa', 'fra', 'deu', 'ita', 'por', 'chi_sim', 'jpn'],
    //     confidence_threshold: 0.8,
    //     preprocessing: true
    //   },
    //   supportedFormats: ['pdf', 'jpg', 'jpeg', 'png', 'tiff', 'bmp'],
    //   maxFileSize: 10 * 1024 * 1024, // 10MB
    //   documentTypes: {
    //     passport: { requiredFields: ['passport_number', 'full_name', 'nationality', 'expiry_date'] },
    //     visa: { requiredFields: ['visa_number', 'visa_type', 'valid_from', 'valid_until'] },
    //     ticket: { requiredFields: ['flight_number', 'departure', 'arrival', 'date'] }
    //   }
    // },

    'task-extractor': {
      class: 'TaskExtractorAgent',
      name: 'Task Extractor Agent',
      description: 'Identifies tasks from conversations, creates actionable todos with priorities and deadlines',
      llm: 'llama-3.1',
      temperature: 0.4,
      specialization: 'task-extraction',
      confidence_threshold: 0.75,
      timeout: 25000,
      capabilities: [
        'task-extraction',
        'todo-creation',
        'priority-assignment',
        'deadline-detection',
        'dependency-analysis',
        'action-categorization',
        'reminder-generation'
      ],
      taskCategories: {
        booking: { priority: 'high', defaultDeadline: 7 },
        documentation: { priority: 'high', defaultDeadline: 14 },
        preparation: { priority: 'medium', defaultDeadline: 3 },
        research: { priority: 'medium', defaultDeadline: 7 },
        communication: { priority: 'medium', defaultDeadline: 2 },
        payment: { priority: 'high', defaultDeadline: 1 }
      },
      extractionSettings: {
        includeImplicitTasks: true,
        groupRelatedTasks: true,
        autoAssignDeadlines: true,
        detectDependencies: true
      }
    }
  },

  // Agent selection rules
  routingRules: [
    {
      condition: { type: 'email', source: 'email' },
      preferredAgent: 'email-monitor',
      fallbackAgents: ['task-extractor']
    },
    {
      condition: { type: 'itinerary', keywords: ['plan', 'schedule', 'route'] },
      preferredAgent: 'itinerary-builder',
      fallbackAgents: []
    },
    // {
    //   condition: { type: 'document', hasFile: true },
    //   preferredAgent: 'document-analyzer',
    //   fallbackAgents: []
    // },
    {
      condition: { type: 'task', keywords: ['todo', 'need to', 'must'] },
      preferredAgent: 'task-extractor',
      fallbackAgents: []
    }
  ],

  // Multi-agent collaboration patterns
  collaborationPatterns: {
    'email-to-itinerary': {
      description: 'Extract booking from email and create itinerary',
      agents: ['email-monitor', 'itinerary-builder'],
      flow: 'sequential'
    },
    // 'document-to-task': {
    //   description: 'Analyze document and extract required tasks',
    //   agents: ['document-analyzer', 'task-extractor'],
    //   flow: 'sequential'
    // },
    'comprehensive-planning': {
      description: 'Full travel planning from emails',
      agents: ['email-monitor', 'itinerary-builder', 'task-extractor'],
      flow: 'parallel-merge'
    }
  },

  // Performance thresholds
  performanceThresholds: {
    maxExecutionTime: 30000,
    minSuccessRate: 0.8,
    maxRetries: 2,
    alertThresholds: {
      executionTime: 20000,
      errorRate: 0.2,
      queueLength: 10
    }
  },

  // Cost optimization settings
  costOptimization: {
    enabled: true,
    preferredModels: {
      simple: 'llama-3.1',
      moderate: 'gpt-4o-mini',
      complex: 'claude-opus-4',
      vision: 'gemini-2.0'
    },
    maxCostPerTask: 0.50,
    budgetAlerts: true
  }
};

/**
 * Get agent configuration by ID
 */
export function getAgentConfig(agentId) {
  return agentsConfig.agents[agentId] || null;
}

/**
 * Get all agent IDs
 */
export function getAllAgentIds() {
  return Object.keys(agentsConfig.agents);
}

/**
 * Get agents by capability
 */
export function getAgentsByCapability(capability) {
  const agents = [];
  
  for (const [agentId, config] of Object.entries(agentsConfig.agents)) {
    if (config.capabilities.includes(capability)) {
      agents.push({ id: agentId, ...config });
    }
  }
  
  return agents;
}

/**
 * Get routing rule for task
 */
export function getRoutingRule(task) {
  for (const rule of agentsConfig.routingRules) {
    let matches = true;
    
    // Check all conditions
    for (const [key, value] of Object.entries(rule.condition)) {
      if (key === 'type' && task.type !== value) {
        matches = false;
        break;
      }
      
      if (key === 'source' && task.source !== value) {
        matches = false;
        break;
      }
      
      if (key === 'keywords') {
        const taskText = JSON.stringify(task).toLowerCase();
        const hasKeyword = value.some(keyword => taskText.includes(keyword));
        if (!hasKeyword) {
          matches = false;
          break;
        }
      }
      
      if (key === 'hasFile' && value && !task.data?.file) {
        matches = false;
        break;
      }
    }
    
    if (matches) {
      return rule;
    }
  }
  
  return null;
}

/**
 * Get collaboration pattern
 */
export function getCollaborationPattern(patternName) {
  return agentsConfig.collaborationPatterns[patternName] || null;
}

export default agentsConfig;