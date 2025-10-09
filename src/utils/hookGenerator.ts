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
  outcome: string;
  offering: string;
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
  return words.slice(0, maxWords).join(' ');
};

const deriveContext = (request: HookRequest): HookContext => {
  const audience = sanitize(request.targetAudience) || 'growth-focused founders';
  const pain = request.painPoints.find((point) => sanitize(point).length > 0) || 'losing time repeating answers';
  const outcome = sanitize(request.desiredOutcome) || 'hit their next growth milestone';
  const offering = sanitize(request.offering) || 'our system';

  return {
    audience,
    shortAudience: shorten(request.targetAudience, 'operators'),
    pain: shorten(pain, 'stuck in busywork', 6),
    outcome: shorten(outcome, 'hit their next goal', 6),
    offering: shorten(offering, 'this playbook', 6)
  };
};

const HOOK_TEMPLATES: HookTemplate[] = [
  {
    label: '70-core',
    awareness: 'Problem Aware',
    rationale: 'Agitates the pain so relief feels urgent.',
    build: ({ audience, pain }) => `Still ${pain}? That means ${audience} are stuck in yesterday's systems.`
  },
  {
    label: '70-core',
    awareness: 'Solution Aware',
    rationale: 'Shows the path to the promised outcome.',
    build: ({ shortAudience, outcome }) => `${shortAudience} who ${outcome} start by fixing their first answer-on-demand system.`
  },
  {
    label: '20-adjacent',
    awareness: 'Completely Unaware',
    rationale: 'Sparks curiosity for people not yet shopping.',
    build: ({ pain }) => `What if the question that keeps stealing hours solved itself? ${pain} disappears overnight.`
  },
  {
    label: '20-adjacent',
    awareness: 'Solution Aware',
    rationale: 'Shows the path to the promised outcome.',
    build: ({ audience, offering }) => `${audience} finally have a brain they can copy-paste. ${offering} does the talking.`
  },
  {
    label: '10-experimental',
    awareness: 'Product Aware',
    rationale: 'Clarifies why your offer wins the comparison.',
    build: ({ shortAudience, pain, offering }) => `${shortAudience} still pulling answers from docs? ${offering} replies before Slack even loads.`
  },
  {
    label: '70-core',
    awareness: 'Problem Aware',
    rationale: 'Agitates the pain so relief feels urgent.',
    build: ({ audience, pain }) => `${audience} lose trust every time they ask "where's that link?" ${pain} is the leak.`
  },
  {
    label: '20-adjacent',
    awareness: 'Completely Unaware',
    rationale: 'Sparks curiosity for people not yet shopping.',
    build: ({ outcome }) => `There's a faster way to ${outcome}—it starts by letting answers find your team first.`
  },
  {
    label: '70-core',
    awareness: 'Solution Aware',
    rationale: 'Shows the path to the promised outcome.',
    build: ({ offering, outcome }) => `${offering} turns tribal knowledge into a 24/7 coach so your team can ${outcome}.`
  },
  {
    label: '10-experimental',
    awareness: 'Most Aware',
    rationale: 'Targets warm audience already sold on you.',
    build: ({ offering, outcome }) => `You said "yes" to ${offering}—here's how day one delivers ${outcome}.`
  },
  {
    label: '20-adjacent',
    awareness: 'Product Aware',
    rationale: 'Clarifies why your offer wins the comparison.',
    build: ({ audience, pain, offering }) => `${audience} hire ${offering} when "check the doc" becomes the slowest answer on the team.`
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
      type: template.label === '10-experimental' ? 'Idea Starter' : template.label === '20-adjacent' ? 'Angle Shift' : 'Core Statement',
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
