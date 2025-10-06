import { BASE_HOOK_KNOWLEDGE_SNIPPETS, DEFAULT_MARKETING_CHANNELS, HOOK_KNOWLEDGE, type KnowledgeSnippet } from '../data/hookKnowledge';

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
}

interface Template {
  id: string;
  type: string;
  awareness: string;
  build: (context: GeneratorContext) => string;
  rationale: string;
}

interface GeneratorContext {
  audience: string;
  audiencePlural: string;
  offering: string;
  primaryPain: string;
  pains: string[];
  outcome: string;
  marketingChannels: string[];
  tone: string;
  campaignGoal: string;
  notes: string;
}

const channelFallback = (channel: string) => {
  const mapping: Record<string, string> = {
    'Paid Ads': 'Perfect for the first line of a scroll-stopping ad.',
    'Organic Social': 'Use this to slow the scroll on your next reel or short.',
    'Email': 'Drop this in the subject line or first sentence to win the open.',
    'Webinar': 'Open your session with this to lock people in from second one.',
    'Landing Page': 'Anchor your hero section with this promise.',
    'Direct Mail': 'Print this as the bold headline they can\'t ignore in the mailbox.',
    'Sales Call': 'Use this as an icebreaker to reframe the stakes instantly.'
  };
  return mapping[channel] || 'Deploy this hook wherever you fight for the first few seconds of attention.';
};

const sanitize = (value: string) => value.trim();

const toAudiencePlural = (audience: string) => {
  const trimmed = sanitize(audience);
  if (!trimmed) return 'audience';
  if (trimmed.toLowerCase().endsWith('s')) return trimmed;
  if (trimmed.toLowerCase().endsWith('y')) {
    return `${trimmed.slice(0, -1)}ies`;
  }
  return `${trimmed}s`;
};

const ensureMarketingChannels = (channels: string[]) => {
  if (!channels.length) {
    return [DEFAULT_MARKETING_CHANNELS[0]];
  }
  return channels;
};

const buildContext = (request: HookRequest): GeneratorContext => {
  const pains = request.painPoints.filter((item) => sanitize(item).length > 0);
  const primaryPain = pains[0] || 'feeling stuck';
  const marketingChannels = ensureMarketingChannels(request.marketingChannels);

  return {
    audience: sanitize(request.targetAudience) || 'entrepreneur',
    audiencePlural: toAudiencePlural(request.targetAudience || 'entrepreneur'),
    offering: sanitize(request.offering) || 'our offer',
    primaryPain,
    pains,
    outcome: sanitize(request.desiredOutcome) || 'break through plateau',
    marketingChannels,
    tone: sanitize(request.tone) || 'Bold',
    campaignGoal: sanitize(request.campaignGoal) || 'drive conversions',
    notes: sanitize(request.additionalNotes)
  };
};

const templates: Template[] = [
  {
    id: 'hook-question-pain',
    type: 'Question',
    awareness: 'Problem Aware',
    build: ({ audience, primaryPain, outcome }) =>
      `${audience}, still ${primaryPain}? Watch how to ${outcome} without burning out.`,
    rationale: 'Opens with a label and problem-aware question, mirroring the cocktail party effect and pain agitation guidance.'
  },
  {
    id: 'hook-statement-outcome',
    type: 'Bold Statement',
    awareness: 'Solution Aware',
    build: ({ audiencePlural, outcome, offering }) =>
      `${audiencePlural} who master ${offering} unlock ${outcome} faster than anyone else.`,
    rationale: 'Direct statement promising a payoff that positions the offer as the lever.'
  },
  {
    id: 'hook-conditional-fast',
    type: 'Conditional',
    awareness: 'Solution Aware',
    build: ({ primaryPain, outcome }) =>
      `If ${primaryPain} keeps stealing your momentum, this 3-step switch gives it back in 7 days.`,
    rationale: 'Uses the conditional format recommended for promising a transformation tied to relief.'
  },
  {
    id: 'hook-command-read',
    type: 'Command',
    awareness: 'Product Aware',
    build: ({ audience }) => `Read this if you're the ${audience} who refuses to coast on average results.`,
    rationale: 'Direct command followed by an identity statement, echoing "Read this if…" winners.'
  },
  {
    id: 'hook-story-cold',
    type: 'Story Teaser',
    awareness: 'Completely Unaware',
    build: ({ audience, primaryPain }) =>
      `Ten days ago a ${audience} DM'd "${primaryPain} is killing me." Today their calendar is booked.` ,
    rationale: 'Drops the viewer into conflict then hints at the transformation to spark curiosity.'
  },
  {
    id: 'hook-list-number',
    type: 'List',
    awareness: 'Solution Aware',
    build: ({ audiencePlural, primaryPain }) =>
      `7 moves ${audiencePlural} use to erase ${primaryPain} before breakfast.`,
    rationale: 'Numbers signal structure, fulfilling the list guidance from the knowledge base.'
  },
  {
    id: 'hook-exclamation',
    type: 'Emotive Exclamation',
    awareness: 'Problem Aware',
    build: ({ outcome }) => `Wait until you feel how fast ${outcome} arrives when you swap sentence one.`,
    rationale: 'High-energy opener tied to the promise of improved results from better hooks.'
  },
  {
    id: 'hook-label-gift',
    type: 'Label Call Out',
    awareness: 'Product Aware',
    build: ({ audience }) => `${audience.toUpperCase()}—here's the hook template we only give our private clients.`,
    rationale: 'Identity-led hook referencing the "gift" framing from proven ads.'
  },
  {
    id: 'hook-stakes',
    type: 'Bold Statement',
    awareness: 'Problem Aware',
    build: ({ audiencePlural, primaryPain }) =>
      `${audiencePlural} lose more deals to ${primaryPain} than to competitors—here's the fix.`,
    rationale: 'Reframes the real enemy, aligning with bold statement tactics from the playbook.'
  },
  {
    id: 'hook-curiosity',
    type: 'Question',
    awareness: 'Completely Unaware',
    build: ({ audiencePlural }) => `What if your next hook made ${audiencePlural} ask "Where has this been?"`,
    rationale: 'Leans on curiosity while centering the audience\'s reaction to the content.'
  },
  {
    id: 'hook-conditional-proof',
    type: 'Conditional',
    awareness: 'Product Aware',
    build: ({ offering, outcome }) =>
      `If you can say yes to two questions, ${offering} will hand you ${outcome}.`,
    rationale: 'Sets up proof-based storytelling—perfect for product-aware prospects.'
  },
  {
    id: 'hook-command-stop',
    type: 'Command',
    awareness: 'Problem Aware',
    build: ({ primaryPain }) => `Stop scrolling if ${primaryPain} hit you this week—this fixes it fast.`,
    rationale: 'Command + pain callout to harness the cocktail party effect mid-scroll.'
  },
  {
    id: 'hook-story-larry',
    type: 'Story Teaser',
    awareness: 'Solution Aware',
    build: ({ outcome }) => `I swapped one sentence and our ad exploded—steal the line that made ${outcome} inevitable.`,
    rationale: 'References the Larry King lesson: a single opening shift unlocked performance.'
  },
  {
    id: 'hook-list-mistakes',
    type: 'List',
    awareness: 'Problem Aware',
    build: ({ audiencePlural }) => `The 5 hook mistakes keeping ${audiencePlural} invisible (and how to flip them).`,
    rationale: 'Numbered list that agitates mistakes then promises the remedy.'
  },
  {
    id: 'hook-experience',
    type: 'Bold Statement',
    awareness: 'Solution Aware',
    build: ({ audience, outcome }) => `${audience}, experience ${outcome} before your next campaign launches.`,
    rationale: 'Future-paces the payoff to keep solution-aware prospects engaged.'
  },
  {
    id: 'hook-question-identity',
    type: 'Question',
    awareness: 'Product Aware',
    build: ({ audiencePlural, primaryPain }) => `Which ${audiencePlural} double responses when ${primaryPain} hits?`,
    rationale: 'Identity question invites comparison curiosity, a proven high-performer.'
  },
  {
    id: 'hook-command-build',
    type: 'Command',
    awareness: 'Solution Aware',
    build: ({ outcome }) => `Build your next hook around this promise: ${outcome} without the grind.`,
    rationale: 'Command that immediately supplies the payoff copy for them to swipe.'
  },
  {
    id: 'hook-story-flip',
    type: 'Story Teaser',
    awareness: 'Problem Aware',
    build: ({ primaryPain, audience }) =>
      `A ${audience} whispered "${primaryPain}" before we hit record—here's the first line we gave them.`,
    rationale: 'Story teaser that captures raw pain then hints at the winning line.'
  },
  {
    id: 'hook-list-speed',
    type: 'List',
    awareness: 'Most Aware',
    build: ({ offering, outcome }) => `Try these 3 hooks before ${offering} goes live and watch ${outcome} compound.`,
    rationale: 'List-style urgency aimed at people poised to buy or launch now.'
  },
  {
    id: 'hook-curiosity-hidden',
    type: 'Emotive Exclamation',
    awareness: 'Completely Unaware',
    build: ({ primaryPain }) => `The hidden hook tax silently charging you ${primaryPain} every quarter.`,
    rationale: 'Curiosity-driven warning modeled after the hidden-danger examples.'
  }
];

const pickInsights = (extra: KnowledgeSnippet[]) => {
  const combined = [...BASE_HOOK_KNOWLEDGE_SNIPPETS, ...extra];
  return combined.map((snippet) => snippet.title);
};

const nextId = (() => {
  let counter = 0;
  return () => {
    counter += 1;
    return `hook-${counter}`;
  };
})();

export const generateHooks = (request: HookRequest, extraKnowledge: KnowledgeSnippet[]): GeneratedHook[] => {
  const context = buildContext(request);
  const insights = pickInsights(extraKnowledge);
  const channelNotes = context.marketingChannels.map(channelFallback);
  const combinedNote = channelNotes.join(' ');

  return templates.map((template) => ({
    id: nextId(),
    text: template.build(context),
    type: template.type,
    awareness: template.awareness,
    rationale: `${template.rationale} ${HOOK_KNOWLEDGE.reminder}`,
    channelNote: combinedNote,
    supportingInsights: insights
  }));
};
