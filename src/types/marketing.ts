/**
 * Marketing Profile Data Contracts
 * These types define the structure for the marketing assistant system
 */

// User-facing marketing profile (stored per brand/account)
export type MarketingProfile = {
  brandId: string;
  skillLevel: "new" | "intermediate" | "advanced" | "expert";
  assessment: AssessmentResult | null;  // how we decided the level
  goals: Goal[];                      // SMART goals tracked in Tala
  growthPlan: GrowthPlan | null;      // phased learning + execution steps
  evidence: EvidenceItem[];           // linked proofs from connected tools
  updatedAt: string;
  lastCheckIn?: string;               // Last quarterly check-in date
  checkInData?: any;                  // Check-in history
  metrics?: any;                      // Current business metrics
};

export type AssessmentResult = {
  score: number;                      // 0-100
  buckets: Record<string, number>;    // e.g., { analytics: 12, ppc: 20, seo: 18, content: 10, ops: 8 }
  inputs: AssessmentAnswer[];         // raw answers
  signals: EvidenceSignal[];          // derived from GA4/GSC/Ads/CRM, etc.
  confidence: number;                 // 0-1, higher if signals corroborate answers
};

export type AssessmentAnswer = {
  id: string;                         // question id
  value: string | number | boolean | string[];
  confidence?: number;                // user certainty
  timestamp?: string;                 // when answered
};

export type EvidenceSignal = {
  source: "GA4" | "GSC" | "ADS" | "CRM" | "MANUAL" | "TALA";
  key: string;                        // e.g., "ga4_connected", "ads_active_30d"
  value: string | number | boolean;
  observedAt: string;
  metadata?: Record<string, any>;    // additional context
};

export type EvidenceItem = {
  source: string;                     // Source of evidence
  key: string;                        // Evidence key
  timestamp: string;                  // When collected
  data: any;                          // Evidence data
  verified: boolean;                  // Is verified
  confidence: number;                 // Confidence level 0-1
  relatedGoals?: string[];            // Related goal IDs
  claim?: string;                     // "GA4 connected"
  signalKeys?: string[];              // ["ga4_connected"]
  link?: string;                      // where the signal came from (UI link)
  status?: "supported" | "contradicted" | "missing";
  lastVerified?: string;              // when we last checked
};

export type Goal = {
  id: string;
  label?: string;                     // "Increase organic traffic +20% in 6 months"
  metric: string;                     // "ga:users", "ads:cpa", etc.
  baseline?: number;
  target: number;
  current?: number;                   // Current value
  unit: string;                       // More flexible unit type
  due?: string;                       // ISO date
  deadline?: string;                  // Alternative to 'due'
  description?: string;               // Detailed description
  owner: "user" | "tala" | "shared" | "team" | "ai";
  status?: 'active' | 'completed' | 'paused';
  trend?: "up" | "down" | "stable" | "flat";
  progress?: { 
    current: number; 
    lastUpdated: string;
    trend?: "up" | "down" | "flat";
    milestones?: Milestone[];
  };
  milestones?: Milestone[];           // Direct milestones array
  category?: GoalCategory | string;  // Allow string for flexibility
  priority?: "high" | "medium" | "low";
  dependencies?: string[];            // other goal IDs this depends on
  source?: string;                    // Where goal came from
  confidence?: number;                // Confidence in goal
  businessStage?: string;             // Business stage when created
  adjustmentReason?: string;          // Why goal was adjusted
  relatedGoals?: string[];            // Related goal IDs
};

export type Milestone = {
  id?: string;
  label: string;
  value: number;
  date?: string;
  achieved?: boolean;
  completed?: boolean;  // Alternative to achieved
};

export type GoalCategory = 
  | "traffic" 
  | "conversion" 
  | "revenue" 
  | "engagement" 
  | "brand" 
  | "operational"
  | "learning";

export type GrowthPlan = {
  phases: Phase[];
  currentPhase?: string;              // active phase ID
  startedAt?: string;
  estimatedCompletion?: string;
};

export type Phase = {
  id: string;                         // "foundation", "expansion", "optimization", "scaling"
  label: string;
  description?: string;
  prerequisites?: string[];           // signals/steps required
  steps: PlanStep[];                  // bite-sized tasks with evidence hooks
  estimatedWeeks?: number;
  order: number;                      // sequence in plan
};

export type PlanStep = {
  id: string;                         // "setup-ga4", "run-kw-research", etc.
  label: string;
  agent: "SEO" | "PPC" | "CONTENT" | "ANALYTICS" | "OPS" | "GENERAL";
  description: string;
  outputs: string[];                  // artifacts (audit.json, brief.md, campaign.json)
  evidenceRequired?: string[];        // signals needed before moving on
  estimateHours?: number;
  status: "todo" | "in_progress" | "blocked" | "done" | "skipped";
  blockReason?: string;
  completedAt?: string;
  completedBy?: string;               // user ID or "tala"
  resources?: Resource[];             // helpful links, templates, etc.
};

export type Resource = {
  type: "guide" | "template" | "tool" | "example" | "video";
  url: string;
  title: string;
  description?: string;
  internal?: boolean;                 // is this a Tala resource?
};

// Assessment Questions Configuration
export type AssessmentQuestion = {
  id: string;
  category: AssessmentCategory;
  question: string;
  type: "yes_no" | "multiple_choice" | "text" | "number" | "multi_select" | "scale";
  options?: QuestionOption[];
  validation?: ValidationRule;
  weight?: number;                    // importance in scoring
  followUps?: FollowUpCondition[];
  helpText?: string;
  required?: boolean;
};

export type AssessmentCategory = 
  | "business"
  | "analytics" 
  | "channels" 
  | "content" 
  | "operations"
  | "budget"
  | "team"
  | "goals";

export type QuestionOption = {
  value: string | number;
  label: string;
  score?: number;                     // contribution to assessment score
  signals?: string[];                 // evidence signals this implies
};

export type ValidationRule = {
  min?: number;
  max?: number;
  pattern?: string;                   // regex
  custom?: string;                    // function name for complex validation
};

export type FollowUpCondition = {
  if: {
    operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than";
    value: any;
  };
  then: {
    action: "ask" | "skip" | "recommend" | "flag";
    questionId?: string;              // for "ask"
    recommendation?: string;          // for "recommend"
    flag?: string;                    // for "flag" (e.g., "needs_ga4_setup")
  };
};

// Marketing Readiness Score Calculation
export type ReadinessScore = {
  overall: number;                    // 0-100
  breakdown: {
    foundation: number;               // tracking, analytics, goals
    strategy: number;                 // planning, audience, positioning
    execution: number;                // campaigns, content, optimization
    measurement: number;              // ROI, attribution, reporting
  };
  level: "new" | "intermediate" | "advanced" | "expert";
  confidence: number;                // 0-1
  recommendations: string[];         // top 3 next actions
};

// Campaign Management Types
export type Campaign = {
  id: string;
  name: string;
  type: "seo" | "ppc" | "email" | "social" | "content" | "multi";
  status: "draft" | "active" | "paused" | "completed";
  goals: string[];                   // goal IDs this campaign supports
  budget?: Budget;
  timeline: Timeline;
  performance?: PerformanceMetrics;
  managedBy: "user" | "tala" | "shared";
};

export type Budget = {
  total: number;
  spent: number;
  currency: string;
  period: "daily" | "weekly" | "monthly" | "total";
  allocation?: Record<string, number>; // by channel or tactic
};

export type Timeline = {
  startDate: string;
  endDate?: string;
  milestones: TimelineMilestone[];
};

export type TimelineMilestone = {
  date: string;
  label: string;
  status: "pending" | "completed" | "missed";
};

export type PerformanceMetrics = {
  impressions?: number;
  clicks?: number;
  conversions?: number;
  cost?: number;
  revenue?: number;
  roi?: number;
  customMetrics?: Record<string, number>;
  lastUpdated: string;
};

// Integration Status
export type Integration = {
  platform: "GA4" | "GSC" | "GOOGLE_ADS" | "META_ADS" | "HUBSPOT" | "SALESFORCE" | "MAILCHIMP";
  status: "connected" | "disconnected" | "error" | "pending";
  lastSync?: string;
  permissions?: string[];
  accountId?: string;
  error?: string;
};

// User Activity Tracking
export type UserActivity = {
  userId: string;
  brandId: string;
  action: "assessment_completed" | "goal_created" | "step_completed" | "campaign_launched" | "integration_connected";
  timestamp: string;
  metadata?: Record<string, any>;
};

// Export utility type for the entire marketing context
export type MarketingContext = {
  profile: MarketingProfile;
  campaigns: Campaign[];
  integrations: Integration[];
  activities: UserActivity[];
};