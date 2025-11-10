export interface HookRequest {
  targetAudience: string;
  offering: string;
  painPoints: string[];
  desiredOutcome: string;
  marketingChannels: string[];
  tone: string;
  campaignGoal: string;
  additionalNotes: string;
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
}

const sanitize = (value: string) => value.trim();

const toWords = (value: string) =>
  sanitize(value)
    .replace(/[–—]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

const shorten = (value: string, fallback: string, maxWords = 4) => {
  const words = toWords(value);
  if (words.length === 0) return fallback;
  if (words.length <= maxWords) return words.join(' ');
  return words.slice(0, maxWords).join(' ');
};

const extractKeyPhrase = (value: string, maxWords = 3): string => {
  const lower = value.toLowerCase();
  
  if (lower.includes('affluent') || lower.includes('luxury') || lower.includes('high-net-worth')) {
    return maxWords >= 3 ? 'Luxury travelers' : 'Executives';
  }
  if (lower.includes('executive') || lower.includes('professional')) {
    return maxWords >= 3 ? 'Busy executives' : 'Executives';
  }
  if (lower.includes('founder') || lower.includes('entrepreneur')) {
    return 'Founders';
  }
  if (lower.includes('small business') || lower.includes('local business')) {
    return maxWords >= 3 ? 'Small business owners' : 'Business owners';
  }
  
  return shorten(value, 'founders', maxWords);
};

const deriveContext = (request: HookRequest): HookContext => {
  const audience = sanitize(request.targetAudience) || 'founders';
  const pain = request.painPoints.find((point) => sanitize(point).length > 0) || 'losing time on repetitive work';
  const outcome = sanitize(request.desiredOutcome) || 'scale faster';
  const offering = sanitize(request.offering) || 'our system';

  return {
    audience,
    shortAudience: extractKeyPhrase(audience, 2),
    pain,
    shortPain: shorten(pain, 'wasting time', 3),
    outcome,
    shortOutcome: shorten(outcome, 'grow faster', 3),
    offering,
    shortOffering: shorten(offering, 'this system', 2)
  };
};

const HOOK_TEMPLATES: HookTemplate[] = [
  {
    label: '70-core',
    awareness: 'Problem Aware',
    rationale: 'Agitates the pain so relief feels urgent.',
    build: ({ audience, shortPain }) => `${audience}: still ${shortPain}? There's a faster way.`
  },
  {
    label: '70-core',
    awareness: 'Solution Aware',
    rationale: 'Shows the path to the promised outcome.',
    build: ({ shortAudience, shortOutcome, shortOffering }) => `${shortAudience} who ${shortOutcome} start with ${shortOffering}.`
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
    build: ({ audience, shortOffering, shortOutcome }) => `${audience} use ${shortOffering} to ${shortOutcome} without the chaos.`
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
    build: ({ audience, shortPain }) => `${audience}: ${shortPain} is the leak. Plug it today.`
  },
  {
    label: '20-adjacent',
    awareness: 'Completely Unaware',
    rationale: 'Sparks curiosity for people not yet shopping.',
    build: ({ shortOutcome }) => `The one move that gets ${shortOutcome} without the grind.`
  },
  {
    label: '70-core',
    awareness: 'Solution Aware',
    rationale: 'Shows the path to the promised outcome.',
    build: ({ shortOffering, shortOutcome }) => `${shortOffering} delivers ${shortOutcome}. No fluff, just results.`
  },
  {
    label: '10-experimental',
    awareness: 'Most Aware',
    rationale: 'Targets warm audience already sold on you.',
    build: ({ shortOffering, shortOutcome }) => `Back for more? ${shortOffering} just made ${shortOutcome} even easier.`
  },
  {
    label: '70-core',
    awareness: 'Problem Aware',
    rationale: 'Agitates the pain so relief feels urgent.',
    build: ({ shortAudience, shortPain }) => `${shortAudience} lose hours to ${shortPain}. Stop the bleed.`
  },
  {
    label: '20-adjacent',
    awareness: 'Product Aware',
    rationale: 'Clarifies why your offer wins the comparison.',
    build: ({ audience, shortOffering }) => `${audience} who tried everything picked ${shortOffering}. Here's the proof.`
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
    build: ({ audience, shortPain }) => `${audience}: every minute you spend on ${shortPain} costs you money.`
  },
  {
    label: '70-core',
    awareness: 'Product Aware',
    rationale: 'Clarifies why your offer wins the comparison.',
    build: ({ shortOffering, shortOutcome }) => `${shortOffering} beats the competition on ${shortOutcome}. See how.`
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
    build: ({ audience, shortPain }) => `${audience}: if ${shortPain} drains you, try this.`
  },
  {
    label: '20-adjacent',
    awareness: 'Completely Unaware',
    rationale: 'Sparks curiosity for people not yet shopping.',
    build: ({ shortAudience, shortOutcome }) => `The ${shortAudience} secret to ${shortOutcome} nobody talks about.`
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
  if (request.offering) insights.add(`Offer: ${request.offering}`);
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
