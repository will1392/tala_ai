export interface HookRequest {
  targetAudience: string;
  offering: string;
  painPoints: string[];
  desiredOutcome: string;
  marketingChannels: string[];
  tone: string;
  campaignGoal: string;
  additionalNotes: string;
  destination: string;
  travelType: string;
}

export interface GeneratedHook {
  id: string;
  text: string;
  type: string;
  awareness: string;
  rationale: string;
  channelNote: string;
  supportingInsights: string[];
  label?: string;
  wordCount?: number;
  angle?: string | null;
}

export interface HookVerificationResult {
  passed: boolean;
  issues: string[];
}

const DEFAULT_CHANNEL_NOTE = 'Deploy as the opening line across channels.';
const MIN_HOOKS_REQUIRED = 20;
const MIN_WORD_COUNT = 6;

interface HookTemplate {
  label: string;
  awareness: string;
  rationale: string;
  build: (context: HookContext) => string;
}

interface HookContext {
  audience: string;
  shortAudience: string;
  pain: string;
  shortPain: string;
  outcome: string;
  shortOutcome: string;
  offering: string;
  shortOffering: string;
  destination: string;
  travelType: string;
  specificOffering: string;
}

const sanitize = (value: string) => value.trim();

const toWords = (value: string) =>
  sanitize(value)
    .replace(/[–—]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

const normalizePhrase = (value: string): string => {
  const lower = value.toLowerCase().trim();
  
  // Convert problematic phrases to concise nouns
  const phraseMap: Record<string, string> = {
    'overwhelmed by planning': 'planning stress',
    'too many options': 'choice overload',
    'limited time to research': 'time constraints',
    'fear of missing hidden gems': 'FOMO on experiences',
    'overwhelmed by research, fear of missing hidden gems': 'research overwhelm',
    'overwhelmed by research, fear of missing': 'research overwhelm',
    'overwhelmed by research, fear': 'research overwhelm',
    'fear of missing gems': 'FOMO',
    'fear of missing': 'FOMO',
    'stress-free, perfectly planned': 'perfect trips',
    'perfectly planned': 'perfect planning',
    'full-service luxury travel': 'luxury planning',
    'spending too much time on': 'time spent on',
    'losing sales due to stockouts': 'stockouts',
    'losing sales due to': 'lost sales',
    'wasting money on': 'wasted spend on',
    'not enough time': 'time constraints',
    'scale marketing without hiring': 'marketing scale',
    'optimized inventory levels and higher profits': 'optimized inventory',
    'river cruise experience in italy': 'Italy river cruises',
    'river cruise experience in': 'river cruises',
    'ocean cruise experience in italy': 'Italy ocean cruises',
    'ocean cruise experience in': 'ocean cruises',
    'land tour experience in italy': 'Italy land tours',
    'land tour experience in': 'land tours',
    'safari experience in': 'safaris',
    'travel planning overwhelm': 'travel planning overwhelm',
    'stress-free, perfectly planned trip': 'perfect trips'
  };
  
  // Try exact matches first
  for (const [phrase, replacement] of Object.entries(phraseMap)) {
    if (lower === phrase) {
      return replacement;
    }
  }
  
  // Try partial matches
  for (const [phrase, replacement] of Object.entries(phraseMap)) {
    if (lower.includes(phrase)) {
      return replacement;
    }
  }
  
  return value;
};

const lowercaseFirst = (str: string): string => {
  if (!str) return str;
  return str.toLowerCase();
};

const capitalizeFirst = (str: string): string => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const shorten = (value: string, fallback: string, maxWords = 4) => {
  const normalized = normalizePhrase(value);
  const words = toWords(normalized);
  if (words.length === 0) return fallback;
  
  // Return normalized phrase if it's already short enough
  if (words.length <= maxWords) {
    return lowercaseFirst(words.join(' '));
  }
  
  // Smart truncation: try to keep meaningful phrases
  const text = words.join(' ').toLowerCase();
  
  // If there's a comma, take the first part
  if (text.includes(',')) {
    const firstPart = text.split(',')[0].trim();
    const firstWords = toWords(firstPart);
    if (firstWords.length > 0 && firstWords.length <= maxWords) {
      return lowercaseFirst(firstWords.join(' '));
    }
  }
  
  // Extract key nouns: remove common verb/preposition starts
  const skipStarts = ['spending', 'losing', 'wasting', 'trying to', 'dealing with'];
  for (const skip of skipStarts) {
    if (text.startsWith(skip)) {
      const remainder = text.slice(skip.length).trim();
      const remainderWords = toWords(remainder);
      if (remainderWords.length > 0 && remainderWords.length <= maxWords) {
        return lowercaseFirst(remainderWords.join(' '));
      }
    }
  }
  
  // Default: take first N words and lowercase
  return lowercaseFirst(words.slice(0, maxWords).join(' '));
};

const extractKeyPhrase = (value: string, maxWords = 3): string => {
  const lower = value.toLowerCase().trim();
  
  // Priority patterns: match specific audience descriptors
  if (lower.includes('affluent') || lower.includes('luxury') || lower.includes('high-net-worth')) {
    return maxWords >= 3 ? 'Luxury travelers' : 'Travelers';
  }
  if (lower.includes('executive') || lower.includes('professional')) {
    return maxWords >= 3 ? 'Busy executives' : 'Executives';
  }
  if (lower.includes('founder') || lower.includes('entrepreneur')) {
    return 'Founders';
  }
  if (lower.includes('small business') || lower.includes('local business')) {
    return maxWords >= 3 ? 'Small businesses' : 'Businesses';
  }
  if (lower.includes('travel') && !lower.includes('luxury')) {
    return 'Travelers';
  }
  if (lower.includes('age') || lower.includes('planning') || lower.includes('vacation')) {
    // Extract core identity before demographic details
    if (lower.includes('affluent') || lower.includes('luxury')) {
      return 'Luxury travelers';
    }
    return 'Travelers';
  }
  
  // Extract first meaningful noun phrase (skip articles and adjectives)
  const words = toWords(value);
  const skipWords = ['the', 'a', 'an', 'aged', 'planning', 'who', 'are', 'is'];
  const meaningful = words.filter(w => !skipWords.includes(w.toLowerCase()));
  
  if (meaningful.length === 0) return 'founders';
  if (meaningful.length <= maxWords) return meaningful.slice(0, maxWords).join(' ');
  
  // Take first maxWords meaningful words
  return meaningful.slice(0, maxWords).join(' ');
};

const deriveContext = (request: HookRequest): HookContext => {
  const audience = sanitize(request.targetAudience) || 'founders';
  const rawPain = request.painPoints.find((point) => sanitize(point).length > 0) || 'losing time on repetitive work';
  const pain = normalizePhrase(rawPain);
  const outcome = sanitize(request.desiredOutcome) || 'scale faster';
  const offering = sanitize(request.offering) || 'our system';
  const destination = sanitize(request.destination) || '';
  const travelType = sanitize(request.travelType) || '';

  // Build destination-specific offering
  let specificOffering = offering;
  if (destination && travelType) {
    const destCapitalized = destination.charAt(0).toUpperCase() + destination.slice(1);
    const typeNormalized = travelType.toLowerCase().replace('_', ' ');
    specificOffering = `${destCapitalized} ${typeNormalized}`;
  } else if (destination) {
    const destCapitalized = destination.charAt(0).toUpperCase() + destination.slice(1);
    specificOffering = `${destCapitalized} travel`;
  } else if (travelType) {
    const typeNormalized = travelType.toLowerCase().replace('_', ' ');
    specificOffering = typeNormalized;
  }

  // Smart extraction: convert verbose inputs to concise phrases
  const shortAudience = extractKeyPhrase(audience, 2);
  const shortPain = shorten(pain, 'wasting time', 3);
  const shortOutcome = shorten(outcome, 'better results', 3);
  const shortOffering = destination || travelType ? specificOffering : shorten(offering, 'this service', 4);

  return {
    audience,
    shortAudience,
    pain,
    shortPain,
    outcome,
    shortOutcome,
    offering,
    shortOffering,
    destination,
    travelType,
    specificOffering
  };
};

const HOOK_TEMPLATES: HookTemplate[] = [
  {
    label: '70-core',
    awareness: 'Problem Aware',
    rationale: 'Agitates the pain so relief feels urgent.',
    build: ({ shortAudience, shortPain }) => `${shortAudience}: still dealing with ${shortPain}? There's a faster way.`
  },
  {
    label: '70-core',
    awareness: 'Solution Aware',
    rationale: 'Shows the path to the promised outcome.',
    build: ({ shortAudience, shortOutcome, shortOffering }) => `${shortAudience} who want ${shortOutcome} start with ${shortOffering}.`
  },
  {
    label: '70-core',
    awareness: 'Product Aware',
    rationale: 'Clarifies why your offer wins the comparison.',
    build: ({ shortAudience, shortOffering }) => `Why ${shortAudience} choose ${shortOffering} over the alternatives.`
  },
  {
    label: '20-adjacent',
    awareness: 'Completely Unaware',
    rationale: 'Sparks curiosity for people not yet shopping.',
    build: ({ shortPain, shortOutcome }) => `What if ${shortPain} turned into ${shortOutcome} overnight?`
  },
  {
    label: '20-adjacent',
    awareness: 'Solution Aware',
    rationale: 'Shows the path to the promised outcome.',
    build: ({ shortAudience, shortOffering, shortOutcome }) => `${shortAudience} use ${shortOffering} to get ${shortOutcome} without the chaos.`
  },
  {
    label: '10-experimental',
    awareness: 'Product Aware',
    rationale: 'Clarifies why your offer wins the comparison.',
    build: ({ shortAudience, shortPain, shortOffering }) => `${shortAudience} ditched ${shortPain} for ${shortOffering}. Here's why.`
  },
  {
    label: '70-core',
    awareness: 'Problem Aware',
    rationale: 'Agitates the pain so relief feels urgent.',
    build: ({ shortAudience, shortPain }) => `${shortAudience}: ${shortPain} is costing you. Stop it now.`
  },
  {
    label: '20-adjacent',
    awareness: 'Completely Unaware',
    rationale: 'Sparks curiosity for people not yet shopping.',
    build: ({ shortOutcome }) => `The one move that gets you ${shortOutcome} without the grind.`
  },
  {
    label: '70-core',
    awareness: 'Solution Aware',
    rationale: 'Shows the path to the promised outcome.',
    build: ({ shortOffering, shortOutcome }) => `Get ${shortOutcome} with ${shortOffering}. No fluff, just results.`
  },
  {
    label: '10-experimental',
    awareness: 'Most Aware',
    rationale: 'Targets warm audience already sold on you.',
    build: ({ shortOffering, shortOutcome }) => {
      const offering = capitalizeFirst(shortOffering);
      return `Back for more? ${offering} just made ${shortOutcome} even easier.`;
    }
  },
  {
    label: '70-core',
    awareness: 'Problem Aware',
    rationale: 'Agitates the pain so relief feels urgent.',
    build: ({ shortAudience, shortPain }) => `${shortAudience}: stop losing hours to ${shortPain}.`
  },
  {
    label: '20-adjacent',
    awareness: 'Product Aware',
    rationale: 'Clarifies why your offer wins the comparison.',
    build: ({ shortAudience, shortOffering }) => `${shortAudience} who tried everything chose ${shortOffering}. Here's why.`
  },
  {
    label: '70-core',
    awareness: 'Solution Aware',
    rationale: 'Shows the path to the promised outcome.',
    build: ({ shortPain, shortOutcome }) => `From ${shortPain} to ${shortOutcome} in under 30 days.`
  },
  {
    label: '20-adjacent',
    awareness: 'Completely Unaware',
    rationale: 'Sparks curiosity for people not yet shopping.',
    build: ({ shortAudience, shortOutcome }) => `${shortAudience} found a shortcut to ${shortOutcome}. It's not what you think.`
  },
  {
    label: '10-experimental',
    awareness: 'Problem Aware',
    rationale: 'Agitates the pain so relief feels urgent.',
    build: ({ shortAudience, shortPain }) => `${shortAudience}: every hour spent on ${shortPain} costs you money.`
  },
  {
    label: '70-core',
    awareness: 'Product Aware',
    rationale: 'Clarifies why your offer wins the comparison.',
    build: ({ shortOffering, shortOutcome }) => {
      const offering = capitalizeFirst(shortOffering);
      return `${offering} beats the competition on ${shortOutcome}. See how.`;
    }
  },
  {
    label: '20-adjacent',
    awareness: 'Solution Aware',
    rationale: 'Shows the path to the promised outcome.',
    build: ({ shortAudience, shortPain, shortOutcome }) => `${shortAudience} trade ${shortPain} for ${shortOutcome}. No tricks.`
  },
  {
    label: '10-experimental',
    awareness: 'Most Aware',
    rationale: 'Targets warm audience already sold on you.',
    build: ({ shortOffering }) => `You know ${shortOffering} works. Here's what's new.`
  },
  {
    label: '70-core',
    awareness: 'Problem Aware',
    rationale: 'Agitates the pain so relief feels urgent.',
    build: ({ shortAudience, shortPain }) => `${shortAudience}: if ${shortPain} drains you, try this.`
  },
  {
    label: '20-adjacent',
    awareness: 'Completely Unaware',
    rationale: 'Sparks curiosity for people not yet shopping.',
    build: ({ shortAudience, shortOutcome }) => {
      // Convert to lowercase for natural phrasing
      const audience = lowercaseFirst(shortAudience);
      return `The ${audience} secret to ${shortOutcome} nobody talks about.`;
    }
  }
];

const channelNoteFromRequest = (request: HookRequest): string => {
  if (!Array.isArray(request.marketingChannels) || request.marketingChannels.length === 0) {
    return DEFAULT_CHANNEL_NOTE;
  }
  if (request.marketingChannels.includes('Paid Ads')) {
    return 'Lead with this line in paid placements to stop the scroll.';
  }
  if (request.marketingChannels.includes('Email')) {
    return 'Use as a subject line or opening sentence to earn the open.';
  }
  if (request.marketingChannels.includes('Organic Social')) {
    return 'Pair with motion or bold typography for social feeds.';
  }
  return DEFAULT_CHANNEL_NOTE;
};

export const buildSupportingInsights = (request: HookRequest): string[] => {
  const insights = new Set<string>();
  if (request.targetAudience) insights.add(`Audience: ${request.targetAudience}`);
  if (request.destination && request.travelType) {
    const destCapitalized = request.destination.charAt(0).toUpperCase() + request.destination.slice(1);
    const typeNormalized = request.travelType.toLowerCase().replace('_', ' ');
    insights.add(`Offer: ${destCapitalized} ${typeNormalized}`);
  } else if (request.destination) {
    const destCapitalized = request.destination.charAt(0).toUpperCase() + request.destination.slice(1);
    insights.add(`Destination: ${destCapitalized}`);
  } else if (request.travelType) {
    const typeNormalized = request.travelType.toLowerCase().replace('_', ' ');
    insights.add(`Travel Type: ${typeNormalized}`);
  } else if (request.offering) {
    insights.add(`Offer: ${request.offering}`);
  }
  if (request.desiredOutcome) insights.add(`Outcome: ${request.desiredOutcome}`);
  if (request.painPoints[0]) insights.add(`Pain: ${request.painPoints[0]}`);
  if (request.campaignGoal) insights.add(`Goal: ${request.campaignGoal}`);
  return Array.from(insights);
};

export const verifyHookSet = (hooks: GeneratedHook[], request: HookRequest): HookVerificationResult => {
  const issues: string[] = [];

  if (!Array.isArray(hooks) || hooks.length === 0) {
    issues.push('No hooks were returned.');
    return { passed: false, issues };
  }

  if (hooks.length < MIN_HOOKS_REQUIRED) {
    issues.push(`Expected ${MIN_HOOKS_REQUIRED} hooks, received ${hooks.length}.`);
  }

  const seen = new Set<string>();
  hooks.forEach((hook, index) => {
    const text = sanitize(hook.text || '');
    if (!text) {
      issues.push(`Hook ${index + 1} is empty.`);
      return;
    }

    const wordCount = toWords(text).length;
    if (wordCount < MIN_WORD_COUNT) {
      issues.push(`Hook ${index + 1} is too short (${wordCount} words).`);
    }

    if (/[\[\]{}<>]/.test(text)) {
      issues.push(`Hook ${index + 1} still contains placeholder characters.`);
    }

    const signature = text.toLowerCase();
    if (seen.has(signature)) {
      issues.push(`Hook ${index + 1} duplicates another line.`);
    } else {
      seen.add(signature);
    }
  });

  const audienceFragment = shorten(request.targetAudience, '').toLowerCase();
  if (audienceFragment && !hooks.some((hook) => hook.text.toLowerCase().includes(audienceFragment))) {
    issues.push('None of the hooks reference the target audience.');
  }

  return {
    passed: issues.length === 0,
    issues
  };
};

export const generateFallbackHooks = (request: HookRequest, desiredCount = 20): GeneratedHook[] => {
  const context = deriveContext(request);
  const channelNote = channelNoteFromRequest(request);
  const insights = buildSupportingInsights(request);

  const hooks: GeneratedHook[] = [];
  let index = 0;

  while (hooks.length < desiredCount) {
    const template = HOOK_TEMPLATES[index % HOOK_TEMPLATES.length];
    const text = template.build(context);

    hooks.push({
      id: `fallback-${hooks.length + 1}`,
      text,
      type: template.label === '10-experimental' ? 'Experimental' : template.label === '20-adjacent' ? 'Adjacent Angle' : 'Core Hook',
      awareness: template.awareness,
      rationale: template.rationale,
      channelNote,
      supportingInsights: insights,
      label: template.label,
      wordCount: toWords(text).length,
      angle: null
    });

    index += 1;
  }

  return hooks;
};
