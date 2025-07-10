/**
 * Conversation Context Types for Memory and Entity Tracking
 * 
 * These types define the structure for maintaining conversation context,
 * entity extraction, and session memory within TALA AI chat sessions.
 */

export interface ConversationEntity {
  /** Unique identifier for the entity */
  id: string;
  /** Type of entity detected */
  type: EntityType;
  /** The actual value/name of the entity */
  value: string;
  /** Normalized/standardized value for matching */
  normalizedValue: string;
  /** Confidence score from entity extraction (0-1) */
  confidence: number;
  /** When this entity was first mentioned */
  firstMentioned: Date;
  /** When this entity was last referenced */
  lastReferenced: Date;
  /** Count of how many times referenced */
  referenceCount: number;
  /** Context in which it was mentioned */
  context?: string;
  /** Additional metadata specific to entity type */
  metadata?: Record<string, any>;
}

export type EntityType = 
  | 'country'
  | 'city' 
  | 'date'
  | 'passport_expiry'
  | 'travel_date'
  | 'person_name'
  | 'airline'
  | 'hotel'
  | 'visa_type'
  | 'duration'
  | 'currency'
  | 'document_type'
  | 'restaurant'
  | 'activity'
  | 'transportation'
  | 'custom';

export interface ConversationIntent {
  /** Intent identifier */
  id: string;
  /** Type of user intent */
  type: IntentType;
  /** Confidence score (0-1) */
  confidence: number;
  /** When this intent was detected */
  detectedAt: Date;
  /** Entities related to this intent */
  relatedEntities: string[];
  /** Intent-specific parameters */
  parameters?: Record<string, any>;
  /** Whether this intent is still active/relevant */
  isActive: boolean;
}

export type IntentType =
  | 'visa_inquiry'
  | 'passport_check'
  | 'travel_planning'
  | 'restaurant_search'
  | 'hotel_search'
  | 'flight_inquiry'
  | 'document_request'
  | 'general_info'
  | 'itinerary_planning'
  | 'booking_assistance'
  | 'travel_requirements'
  | 'emergency_info'
  | 'cost_inquiry'
  | 'weather_inquiry'
  | 'cultural_info'
  | 'language_help'
  | 'currency_exchange'
  | 'transportation_info'
  | 'activity_search';

export interface ConversationContext {
  /** Unique session identifier */
  sessionId: string;
  /** User ID this context belongs to */
  userId: string;
  /** When this context was created */
  createdAt: Date;
  /** Last time context was updated */
  lastUpdated: Date;
  /** When context was last accessed */
  lastAccessed: Date;
  /** Conversation ID this context belongs to */
  conversationId: string;
  
  /** Current entities in conversation */
  entities: Map<string, ConversationEntity>;
  /** Current active intents */
  intents: ConversationIntent[];
  /** Conversation state variables */
  state: ConversationState;
  
  /** Summary of conversation topics */
  topicSummary?: string;
  /** Primary context (most important current topic) */
  primaryContext?: {
    country?: string;
    city?: string;
    purpose?: string;
    timeframe?: string;
  };
  
  /** Conversation metadata */
  metadata: {
    /** Total message count in conversation */
    messageCount: number;
    /** Languages detected in conversation */
    languages: string[];
    /** Complexity level of conversation */
    complexityLevel: 'simple' | 'moderate' | 'complex';
    /** Whether context needs clarification */
    needsClarification: boolean;
    /** Tags applied to conversation */
    tags: string[];
  };
  
  /** Context expiration settings */
  expiration: {
    /** TTL in milliseconds */
    ttl: number;
    /** Expiry timestamp */
    expiresAt: Date;
    /** Auto-extend on activity */
    autoExtend: boolean;
  };
}

export interface ConversationState {
  /** Current primary country of discussion */
  currentCountry?: string;
  /** Current city of discussion */
  currentCity?: string;
  /** Client information being discussed */
  clientInfo?: {
    passportExpiry?: Date;
    travelDates?: {
      departure?: Date;
      return?: Date;
    };
    nationality?: string;
    specialNeeds?: string[];
  };
  /** Current booking/planning context */
  planningContext?: {
    tripType?: 'business' | 'leisure' | 'emergency' | 'transit';
    travelPurpose?: string;
    groupSize?: number;
    budget?: string;
    preferences?: Record<string, any>;
  };
  /** Conversation flow state */
  flowState?: {
    currentStep?: string;
    completedSteps?: string[];
    nextSuggestedActions?: string[];
  };
}

export interface EntityExtractionResult {
  /** Extracted entities */
  entities: ConversationEntity[];
  /** Detected intents */
  intents: ConversationIntent[];
  /** References to previous entities */
  references: EntityReference[];
  /** Overall confidence in extraction */
  confidence: number;
  /** Suggested context updates */
  contextUpdates: Partial<ConversationState>;
}

export interface EntityReference {
  /** Type of reference (pronoun, demonstrative, etc.) */
  type: 'pronoun' | 'demonstrative' | 'implicit' | 'ellipsis';
  /** The reference text found */
  referenceText: string;
  /** Position in message */
  position: number;
  /** Entity ID this refers to */
  resolvedEntityId?: string;
  /** Confidence in resolution */
  confidence: number;
  /** Suggested clarification if uncertain */
  clarificationNeeded?: boolean;
}

export interface ContextUpdate {
  /** Type of update */
  type: 'entity_add' | 'entity_update' | 'intent_add' | 'state_update' | 'expire_check';
  /** Timestamp of update */
  timestamp: Date;
  /** Specific changes made */
  changes: Record<string, any>;
  /** Message that triggered update */
  triggeredBy?: string;
  /** Whether update was automatic or manual */
  source: 'auto' | 'manual' | 'system';
}

export interface ContextSummary {
  /** Brief summary of conversation context */
  summary: string;
  /** Key entities mentioned */
  keyEntities: string[];
  /** Main topics discussed */
  topics: string[];
  /** Current status/state */
  status: string;
  /** Recommended next actions */
  suggestions?: string[];
}

export interface ContextClarification {
  /** Type of clarification needed */
  type: 'ambiguous_reference' | 'multiple_entities' | 'missing_context' | 'conflicting_info';
  /** The ambiguous text/reference */
  ambiguousText: string;
  /** Possible interpretations */
  possibleMeanings: string[];
  /** Suggested clarification question */
  clarificationQuestion: string;
  /** Priority level */
  priority: 'low' | 'medium' | 'high';
}

// Configuration and constants
export const CONTEXT_CONFIG = {
  /** Default TTL for context (30 minutes) */
  DEFAULT_TTL: 30 * 60 * 1000,
  /** Maximum entities to track per conversation */
  MAX_ENTITIES: 50,
  /** Maximum intents to track */
  MAX_INTENTS: 10,
  /** Confidence threshold for entity extraction */
  ENTITY_CONFIDENCE_THRESHOLD: 0.7,
  /** Confidence threshold for intent detection */
  INTENT_CONFIDENCE_THRESHOLD: 0.6,
  /** Number of messages to include in context summary */
  CONTEXT_WINDOW_SIZE: 10,
  /** Maximum age for referenced entities (in messages) */
  MAX_ENTITY_AGE: 20
};

export const ENTITY_PATTERNS = {
  country: /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g,
  date: /\b(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})\b/g,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  currency: /\$\d+(?:,\d{3})*(?:\.\d{2})?|\d+(?:,\d{3})*(?:\.\d{2})?\s*(?:USD|EUR|GBP|CAD|AUD)\b/g
};

// Helper type for message processing
export interface MessageWithContext {
  /** Original message content */
  content: string;
  /** Extracted context from message */
  extractedContext: EntityExtractionResult;
  /** Updated conversation context */
  updatedContext: ConversationContext;
  /** Any clarifications needed */
  clarifications: ContextClarification[];
}