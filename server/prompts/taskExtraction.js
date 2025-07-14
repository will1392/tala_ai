/**
 * Task Extraction Prompts
 * 
 * Prompts for AI-powered task extraction from emails
 */

export const extractTasksPrompt = `You are an intelligent task extraction assistant for a travel agency. Analyze the following email and extract ALL actionable tasks, requests, and follow-up items.

EMAIL DETAILS:
Subject: {subject}
From: {senderName}
Content: {emailContent}

EXTRACTION REQUIREMENTS:
1. Extract all explicit and implicit tasks
2. Identify deadlines and urgency levels
3. Determine task types and categories
4. Extract relevant entities (dates, locations, people)
5. Detect dependencies between tasks
6. Assign confidence scores (0-1)

TASK CATEGORIES:
- booking: Reservations, bookings, confirmations
- research: Finding options, gathering information
- communication: Calls, emails, notifications
- documentation: Creating, updating, or reviewing documents
- coordination: Scheduling, organizing, managing
- follow-up: Status updates, check-ins, reminders

URGENCY LEVELS:
- critical: Emergency, immediate action needed
- high: Today or within 24 hours
- medium: This week or within 3-5 days
- low: Next week or when convenient

RESPONSE FORMAT:
Return a JSON object with the following structure:

{
  "tasks": [
    {
      "title": "Brief descriptive title",
      "description": "Detailed description of what needs to be done",
      "type": "booking|research|communication|documentation|coordination|follow-up",
      "urgency": "critical|high|medium|low",
      "deadline": "YYYY-MM-DD HH:mm" or null,
      "confidence": 0.95,
      "entities": {
        "locations": ["Paris", "London"],
        "dates": ["2024-03-15"],
        "people": ["John Smith"],
        "organizations": ["Air France"]
      },
      "dependencies": ["task_id_1", "task_id_2"],
      "context": "Additional context from email"
    }
  ],
  "summary": "Brief summary of all extracted tasks",
  "emailType": "inquiry|booking_confirmation|complaint|follow_up|general",
  "senderSentiment": "positive|neutral|negative",
  "overallUrgency": "critical|high|medium|low"
}

EXAMPLES:

Example 1 - Booking Request:
Email: "Hi, I need to book a hotel in Paris for March 15-18. Please find options under $200/night near the Eiffel Tower. Also, can you check flight prices from NYC to Paris for March 14?"

Response:
{
  "tasks": [
    {
      "title": "Find hotel options in Paris",
      "description": "Research hotels near Eiffel Tower, under $200/night for March 15-18",
      "type": "research",
      "urgency": "medium",
      "deadline": null,
      "confidence": 0.95,
      "entities": {
        "locations": ["Paris", "Eiffel Tower"],
        "dates": ["2024-03-15", "2024-03-18"],
        "people": [],
        "organizations": []
      },
      "dependencies": [],
      "context": "Customer needs accommodation in Paris"
    },
    {
      "title": "Check flight prices NYC to Paris",
      "description": "Research flight options from NYC to Paris for March 14",
      "type": "research",
      "urgency": "medium",
      "deadline": null,
      "confidence": 0.9,
      "entities": {
        "locations": ["NYC", "Paris"],
        "dates": ["2024-03-14"],
        "people": [],
        "organizations": []
      },
      "dependencies": [],
      "context": "Flight needed day before hotel check-in"
    }
  ],
  "summary": "Customer requesting hotel and flight research for Paris trip in March",
  "emailType": "inquiry",
  "senderSentiment": "neutral",
  "overallUrgency": "medium"
}

Example 2 - Urgent Issue:
Email: "URGENT: My flight was cancelled and I'm stuck at the airport. I need to get to London tonight for an important meeting tomorrow morning. Please help ASAP!"

Response:
{
  "tasks": [
    {
      "title": "Find emergency flight to London",
      "description": "Immediately book alternative flight to London for tonight due to cancellation",
      "type": "booking",
      "urgency": "critical",
      "deadline": "2024-01-15 20:00",
      "confidence": 1.0,
      "entities": {
        "locations": ["London"],
        "dates": ["tonight", "tomorrow morning"],
        "people": [],
        "organizations": []
      },
      "dependencies": [],
      "context": "Customer stranded at airport, has important meeting tomorrow"
    }
  ],
  "summary": "Emergency rebooking needed due to flight cancellation",
  "emailType": "emergency",
  "senderSentiment": "negative",
  "overallUrgency": "critical"
}

Now analyze the provided email and extract tasks following this format exactly.`;

export const analyzeTaskContextPrompt = `You are a task context analyzer. Given a task and its email context, provide additional insights and enrichment.

TASK: {taskTitle}
DESCRIPTION: {taskDescription}
EMAIL CONTEXT: {emailContext}
SENDER: {senderName}

ANALYSIS REQUIREMENTS:
1. Suggest task priority (1-10 scale)
2. Estimate time to complete
3. Identify required resources/tools
4. Suggest next steps
5. Identify potential blockers
6. Recommend task assignment
7. Suggest follow-up actions

RESPONSE FORMAT:
{
  "priority": 8,
  "estimatedDuration": "2-3 hours",
  "requiredResources": ["booking system", "flight database"],
  "nextSteps": [
    "Search available flights",
    "Compare prices and schedules",
    "Present options to customer"
  ],
  "potentialBlockers": [
    "Limited availability",
    "Budget constraints"
  ],
  "recommendedAssignee": "senior_travel_agent",
  "followUpActions": [
    "Confirm booking within 24 hours",
    "Send itinerary to customer"
  ],
  "relatedTasks": [
    "Book ground transportation",
    "Arrange travel insurance"
  ]
}`;

export const taskPriorityPrompt = `You are a task prioritization expert. Analyze the following task and assign an accurate priority score.

TASK: {taskTitle}
DESCRIPTION: {taskDescription}
EMAIL CONTEXT: {emailContext}
SENDER: {senderName}
DEADLINE: {deadline}
CUSTOMER TYPE: {customerType}

PRIORITY FACTORS:
1. Urgency (deadline proximity)
2. Customer importance (VIP, regular, new)
3. Business impact (revenue, reputation)
4. Complexity (time to resolve)
5. Dependencies (blocks other tasks)

SCORING SCALE:
10 = Critical emergency (immediate action required)
9 = Very high (within 1 hour)
8 = High (within 4 hours)
7 = Medium-high (within 8 hours)
6 = Medium (within 24 hours)
5 = Medium-low (within 2 days)
4 = Low (within 1 week)
3 = Very low (when convenient)
2 = Nice to have
1 = Optional

Return a JSON object:
{
  "priorityScore": 8,
  "reasoning": "Customer is stranded with urgent rebooking needed",
  "urgencyLevel": "high",
  "factors": {
    "urgency": 9,
    "customerImportance": 7,
    "businessImpact": 8,
    "complexity": 6,
    "dependencies": 5
  }
}`;

export const taskCategoriesPrompt = `You are a task categorization specialist. Classify the following task into appropriate categories.

TASK: {taskTitle}
DESCRIPTION: {taskDescription}

AVAILABLE CATEGORIES:
Primary Categories:
- booking: Hotel, flight, car, activity reservations
- research: Finding options, comparing prices, gathering information
- communication: Calls, emails, notifications to customers/vendors
- documentation: Creating itineraries, updating records, reports
- coordination: Scheduling, organizing, managing logistics
- follow-up: Status updates, confirmations, reminders
- support: Problem resolution, customer service, troubleshooting

Secondary Categories:
- accommodation: Hotels, apartments, hostels
- transportation: Flights, trains, cars, transfers
- activities: Tours, attractions, dining, entertainment
- visa: Documentation, applications, requirements
- insurance: Travel insurance, coverage options
- payments: Processing, refunds, billing issues

Service Level:
- standard: Regular service timeline
- priority: Expedited handling
- vip: White-glove service

Return JSON:
{
  "primaryCategory": "booking",
  "secondaryCategories": ["accommodation", "transportation"],
  "serviceLevel": "priority",
  "tags": ["urgent", "international", "group_booking"],
  "department": "reservations",
  "skillsRequired": ["booking_system", "vendor_relations"]
}`;

export const deadlineExtractionPrompt = `You are a deadline extraction specialist. Extract and interpret all time-related information from the email.

EMAIL CONTENT: {emailContent}
EMAIL DATE: {emailDate}

EXTRACTION TYPES:
1. Explicit deadlines ("by Friday", "before 5pm")
2. Implicit deadlines ("need this today", "asap")
3. Event dates ("traveling on March 15")
4. Relative dates ("tomorrow", "next week")
5. Business constraints ("before business closes")

TIME CONTEXT:
- Current date/time: {currentDateTime}
- Business hours: 9 AM - 6 PM EST
- Business days: Monday - Friday

Return JSON:
{
  "deadlines": [
    {
      "type": "explicit|implicit|event|relative",
      "originalText": "by Friday 5pm",
      "parsedDate": "2024-01-19T17:00:00Z",
      "urgency": "high",
      "confidence": 0.9,
      "isBusinessHours": true,
      "context": "Customer needs confirmation before weekend"
    }
  ],
  "mostUrgent": "2024-01-19T17:00:00Z",
  "timeZone": "EST",
  "workingDaysUntil": 2
}`;

export const entityExtractionPrompt = `You are an entity extraction specialist for travel emails. Extract all relevant entities.

EMAIL CONTENT: {emailContent}

ENTITY TYPES:
1. Locations: Cities, countries, airports, hotels, landmarks
2. Dates: Travel dates, deadlines, event dates
3. People: Names, contacts, travelers
4. Organizations: Airlines, hotels, tour companies
5. Travel Details: Flight numbers, booking references
6. Financial: Prices, budgets, currency
7. Contact Info: Phone, email, addresses

Return JSON:
{
  "locations": [
    {
      "name": "Paris",
      "type": "city",
      "context": "destination",
      "confidence": 0.95
    }
  ],
  "dates": [
    {
      "date": "2024-03-15",
      "type": "departure",
      "context": "travel_start",
      "confidence": 0.9
    }
  ],
  "people": [
    {
      "name": "John Smith",
      "role": "traveler",
      "context": "primary_contact",
      "confidence": 0.85
    }
  ],
  "organizations": [
    {
      "name": "Air France",
      "type": "airline",
      "context": "preferred_carrier",
      "confidence": 0.8
    }
  ],
  "travelDetails": [
    {
      "type": "booking_reference",
      "value": "ABC123",
      "context": "existing_booking",
      "confidence": 0.95
    }
  ],
  "financial": [
    {
      "amount": 200,
      "currency": "USD",
      "type": "budget_limit",
      "context": "per_night_hotel",
      "confidence": 0.9
    }
  ]
}`;

export const taskDependencyPrompt = `You are a task dependency analyzer. Identify relationships and dependencies between tasks.

TASKS: {tasks}
EMAIL CONTEXT: {emailContext}

DEPENDENCY TYPES:
1. Sequential: Task B depends on Task A completion
2. Parallel: Tasks can be done simultaneously
3. Conditional: Task depends on outcome of another
4. Resource: Tasks require same resource/person
5. Temporal: Time-based dependencies

Return JSON:
{
  "dependencies": [
    {
      "from": "task_1",
      "to": "task_2",
      "type": "sequential",
      "reason": "Need flight details before booking hotel",
      "strength": "strong"
    }
  ],
  "parallelGroups": [
    ["task_3", "task_4"]
  ],
  "criticalPath": ["task_1", "task_2", "task_5"],
  "bottlenecks": [
    {
      "task": "task_1",
      "reason": "Blocks multiple dependent tasks"
    }
  ]
}`;

export const sentimentAnalysisPrompt = `You are a customer sentiment analyzer. Analyze the emotional tone and sentiment of the email.

EMAIL CONTENT: {emailContent}
SENDER: {senderName}

ANALYSIS DIMENSIONS:
1. Overall sentiment (-1 to 1)
2. Emotion detection
3. Urgency indicators
4. Satisfaction level
5. Relationship health

Return JSON:
{
  "overallSentiment": 0.2,
  "sentimentLabel": "slightly_positive",
  "emotions": ["excited", "anxious"],
  "urgencyIndicators": ["asap", "immediately"],
  "satisfactionLevel": "neutral",
  "relationshipHealth": "good",
  "keyPhrases": [
    {
      "phrase": "very excited about the trip",
      "sentiment": 0.8,
      "emotion": "excitement"
    }
  ],
  "responseRecommendations": [
    "Match their enthusiasm",
    "Address anxiety about timing"
  ]
}`;

// Export all prompts as named exports
export const prompts = {
  extractTasksPrompt,
  analyzeTaskContextPrompt,
  taskPriorityPrompt,
  taskCategoriesPrompt,
  deadlineExtractionPrompt,
  entityExtractionPrompt,
  taskDependencyPrompt,
  sentimentAnalysisPrompt
};

export default prompts;