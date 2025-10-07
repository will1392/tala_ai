import { DEFAULT_MARKETING_CHANNELS } from '../data/hookKnowledge';

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

interface ToneProfile {
  blocker: string;
  promiseVerb: string;
  solutionLead: string;
  proofLead: string;
  empathyLead: string;
  spark: string;
  vibe: string;
}

interface ChannelInfo {
  noun: string;
  action: string;
}

interface TemplateHelpers {
  tone: ToneProfile;
  callout: string;
  audience: string;
  audiencePlural: string;
  goalFocus: string;
  channel: ChannelInfo;
  getPain: (index?: number) => string;
  listPains: (count?: number) => string;
}

interface Template {
  id: string;
  type: string;
  awareness: string;
  build: (context: GeneratorContext, helpers: TemplateHelpers) => string;
  rationale: (context: GeneratorContext, helpers: TemplateHelpers) => string;
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

const toneProfiles: Record<string, ToneProfile> = {
  'Bold and direct': {
    blocker: 'Stop letting',
    promiseVerb: 'unlock',
    solutionLead: "Here's how to",
    proofLead: 'We just helped',
    empathyLead: 'Truth:',
    spark: 'Your move:',
    vibe: 'bold and decisive'
  },
  'Conversational and empathetic': {
    blocker: "Let's stop letting",
    promiseVerb: 'regain',
    solutionLead: "Let's map out how to",
    proofLead: 'Clients tell us',
    empathyLead: 'I get it—',
    spark: "Let's do this:",
    vibe: 'warm and collaborative'
  },
  'High-energy hype': {
    blocker: "You're not here to let",
    promiseVerb: 'ignite',
    solutionLead: "Here's the play to",
    proofLead: 'Watch how',
    empathyLead: 'Real talk:',
    spark: 'Bring the energy:',
    vibe: 'electric and upbeat'
  },
  'Calm authority': {
    blocker: "It's time to stop letting",
    promiseVerb: 'build',
    solutionLead: "Here's the steady fix to",
    proofLead: 'We quietly guide',
    empathyLead: 'Reminder:',
    spark: 'Next step:',
    vibe: 'measured and confident'
  },
  'Data-driven confidence': {
    blocker: 'The numbers say to stop letting',
    promiseVerb: 'prove',
    solutionLead: 'Use this process to',
    proofLead: 'Our latest sprint helped',
    empathyLead: 'Signal:',
    spark: 'Run the play:',
    vibe: 'evidence-backed and precise'
  }
};

const channelInfoMap: Record<string, ChannelInfo> = {
  'Paid Ads': { noun: 'paid ad opener', action: 'slow the scroll' },
  'Organic Social': { noun: 'social post hook', action: 'stop the thumb' },
  Email: { noun: 'subject line', action: 'win the open' },
  Webinar: { noun: 'webinar intro', action: 'keep viewers logged in' },
  'Landing Page': { noun: 'hero headline', action: 'anchor the page' },
  'Direct Mail': { noun: 'mailpiece headline', action: 'jump off the page' },
  'Sales Call': { noun: 'call opener', action: 'reframe the stakes immediately' }
};

const sanitize = (value: string) => value.trim();

const capitalizeFirst = (value: string) => {
  const trimmed = sanitize(value);
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

const formatList = (items: string[]) => {
  const filtered = items.filter((item) => sanitize(item).length > 0);
  if (filtered.length === 0) return '';
  if (filtered.length === 1) return filtered[0];
  if (filtered.length === 2) return `${filtered[0]} and ${filtered[1]}`;
  return `${filtered.slice(0, -1).join(', ')}, and ${filtered[filtered.length - 1]}`;
};

const truncate = (value: string, max = 60) => {
  const trimmed = sanitize(value);
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
};

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

const resolveTone = (tone: string): ToneProfile => toneProfiles[tone] || toneProfiles['Bold and direct'];

const resolveChannelInfo = (channel?: string): ChannelInfo => {
  if (!channel) {
    return { noun: 'campaign opener', action: 'earn the first five seconds' };
  }
  return channelInfoMap[channel] || { noun: 'campaign opener', action: 'earn the first five seconds' };
};

const createHelpers = (context: GeneratorContext): TemplateHelpers => {
  const tone = resolveTone(context.tone);
  const pains = context.pains.length ? context.pains : [context.primaryPain];
  const audience = capitalizeFirst(context.audience);
  const audiencePlural = capitalizeFirst(context.audiencePlural);
  const getPain = (index = 0) => pains[index % pains.length] || context.primaryPain;
  const listPains = (count = pains.length) => formatList(pains.slice(0, count));
  const goalFocus = context.campaignGoal || context.outcome;
  const channel = resolveChannelInfo(context.marketingChannels[0]);

  return {
    tone,
    callout: `${audience} —`,
    audience,
    audiencePlural,
    goalFocus,
    channel,
    getPain,
    listPains
  };
};

const templates: Template[] = [
  {
    id: 'callout-direct',
    type: 'Label + Promise',
    awareness: 'Solution Aware',
    build: (context, helpers) =>
      `${helpers.callout} ${helpers.tone.blocker} ${helpers.getPain()} win the first impression so you can ${helpers.tone.promiseVerb} ${context.outcome} with ${context.offering}.`,
    rationale: (context, helpers) =>
      `Directly labels ${helpers.audiencePlural} and contrasts ${helpers.getPain()} with the promise of ${context.outcome} for a fast pattern interrupt.`
  },
  {
    id: 'question-victory',
    type: 'Question',
    awareness: 'Problem Aware',
    build: (context, helpers) =>
      `What happens when ${helpers.audiencePlural} finally silence ${helpers.getPain()}? ${helpers.tone.solutionLead} ${context.outcome}.`,
    rationale: (context, helpers) =>
      `Asks a pointed question that agitates ${helpers.getPain()} while positioning ${context.outcome} as the natural answer.`
  },
  {
    id: 'proof-story',
    type: 'Proof Point',
    awareness: 'Product Aware',
    build: (context, helpers) =>
      `${helpers.tone.proofLead} ${helpers.audiencePlural} traded ${helpers.getPain()} for ${context.outcome} with ${context.offering}.`,
    rationale: (context, helpers) =>
      `Shows the transformation ${helpers.audiencePlural} want—moving from ${helpers.getPain()} to ${context.outcome}—and credits the offer.`
  },
  {
    id: 'channel-flip',
    type: 'Channel Remix',
    awareness: 'Solution Aware',
    build: (context, helpers) =>
      `Flip your next ${helpers.channel.noun} into ${context.outcome} bait by leading with relief from ${helpers.getPain()}.`,
    rationale: (context, helpers) =>
      `Gives concrete direction on how to adapt the hook for a ${helpers.channel.noun} while tying relief from ${helpers.getPain()} to ${context.outcome}.`
  },
  {
    id: 'pain-stack',
    type: 'Pain Stack',
    awareness: 'Problem Aware',
    build: (context, helpers) =>
      `${helpers.audiencePlural} keep wrestling with ${helpers.listPains(2)}. This hook drags them straight toward ${context.outcome}.`,
    rationale: (context, helpers) =>
      `Stacks the key pains ${helpers.audiencePlural} feel, then pivots to the promised outcome of ${context.outcome}.`
  },
  {
    id: 'goal-stall',
    type: 'Bold Statement',
    awareness: 'Solution Aware',
    build: (context, helpers) =>
      `Your ${helpers.goalFocus} stalls whenever ${helpers.getPain()} hijacks attention—${helpers.tone.solutionLead} point the story at ${context.outcome}.`,
    rationale: (context, helpers) =>
      `Links the campaign goal (${helpers.goalFocus}) with the cost of ${helpers.getPain()} and points directly toward ${context.outcome}.`
  },
  {
    id: 'tension-lead',
    type: 'Tension Builder',
    awareness: 'Problem Aware',
    build: (context, helpers) =>
      `Every ${helpers.getPain()} costs ${helpers.audiencePlural} momentum on ${helpers.goalFocus}. Lead with this line before you mention ${context.offering}.`,
    rationale: (context, helpers) =>
      `Highlights the stakes of ${helpers.getPain()} and sets up ${context.offering} as the relief without sounding salesy.`
  },
  {
    id: 'quote-opener',
    type: 'Scripted Opener',
    awareness: 'Most Aware',
    build: (context, helpers) =>
      `Open with: "${helpers.callout} ${helpers.tone.solutionLead.toLowerCase()} ${context.outcome} without ${helpers.getPain()}."`,
    rationale: (context, helpers) =>
      `Hands over a word-for-word opening that pairs ${helpers.audience} with the promise of ${context.outcome}.`
  },
  {
    id: 'empathy-swap',
    type: 'Insight',
    awareness: 'Problem Aware',
    build: (context, helpers) =>
      `${helpers.tone.empathyLead} ${capitalizeFirst(helpers.getPain())} signals your message is buried. Swap in this hook and make ${context.outcome} feel inevitable.`,
    rationale: (context, helpers) =>
      `Uses an empathetic lead to acknowledge ${helpers.getPain()} before steering toward ${context.outcome}.`
  },
  {
    id: 'story-moment',
    type: 'Story Teaser',
    awareness: 'Completely Unaware',
    build: (context, helpers) =>
      `${helpers.tone.blocker} ${helpers.getPain()} call the shots—start the story at the moment ${helpers.audiencePlural} feel ${context.outcome}.`,
    rationale: (context, helpers) =>
      `Frames a before-and-after story that centers ${helpers.audiencePlural} finally feeling ${context.outcome}.`
  },
  {
    id: 'before-after',
    type: 'Contrast',
    awareness: 'Solution Aware',
    build: (context, helpers) =>
      `Show the before: "${helpers.getPain()}". Then the after: "${context.outcome}". That's your five-second ${helpers.channel.noun} hook.`,
    rationale: (context, helpers) =>
      `Uses a clear contrast between ${helpers.getPain()} and ${context.outcome} so your ${helpers.channel.noun} instantly communicates the transformation.`
  },
  {
    id: 'pain-first',
    type: 'Bold Statement',
    awareness: 'Problem Aware',
    build: (context, helpers) =>
      `Everyone promises ${context.outcome}; few admit how brutal ${helpers.getPain()} feels. Lead with the pain, then point to ${context.offering}.`,
    rationale: (context, helpers) =>
      `Contrasts the common promise with your willingness to name ${helpers.getPain()}, making the offer feel grounded.`
  },
  {
    id: 'proof-sequence',
    type: 'Proof Point',
    awareness: 'Product Aware',
    build: (context, helpers) =>
      `${helpers.tone.proofLead} ${helpers.audiencePlural} who now enjoy ${context.outcome} started by naming ${helpers.getPain()}. Do the same.`,
    rationale: (context, helpers) =>
      `Shows a simple sequence: acknowledge ${helpers.getPain()} then promise ${context.outcome}, mirroring what worked before.`
  },
  {
    id: 'memory-jog',
    type: 'Story Recall',
    awareness: 'Problem Aware',
    build: (context, helpers) =>
      `Remember when ${helpers.getPain()} torpedoed your ${helpers.goalFocus}? This hook replays the fix and fast-tracks ${context.outcome}.`,
    rationale: (context, helpers) =>
      `Triggers a vivid memory of ${helpers.getPain()} before promising the corrected future of ${context.outcome}.`
  },
  {
    id: 'future-pace',
    type: 'Future Pace',
    awareness: 'Solution Aware',
    build: (context, helpers) =>
      `Picture next quarter: ${context.outcome}, zero ${helpers.getPain(1)}. That future starts with this opener.`,
    rationale: (context, helpers) =>
      `Paints the aspirational future where ${helpers.audiencePlural} live in ${context.outcome} territory and makes the hook the first domino.`
  },
  {
    id: 'objection-flip',
    type: 'Objection Flip',
    awareness: 'Product Aware',
    build: (context, helpers) =>
      `If they shrug that "${helpers.getPain()} is just part of the game," drop this line and walk them toward ${context.outcome}.`,
    rationale: (context, helpers) =>
      `Handles a likely objection by reframing ${helpers.getPain()} as optional once they see ${context.outcome} as the alternative.`
  },
  {
    id: 'metric-frame',
    type: 'Metric Frame',
    awareness: 'Problem Aware',
    build: (context, helpers) =>
      `${helpers.tone.blocker} ${helpers.getPain()} drain your ${helpers.goalFocus}. Highlight the metric ${context.outcome} will move first.`,
    rationale: (context, helpers) =>
      `Connects ${helpers.getPain()} to the metric behind ${helpers.goalFocus}, then reinforces that ${context.outcome} is what moves it.`
  },
  {
    id: 'micro-win',
    type: 'Quick Win',
    awareness: 'Solution Aware',
    build: (context, helpers) =>
      `Give them the quick win: "${context.outcome} in 7 days" and tie it to ending ${helpers.getPain()}. That's the hook.`,
    rationale: (context, helpers) =>
      `Promises a tangible micro-win of ${context.outcome} while naming ${helpers.getPain()} as the pain it resolves.`
  },
  {
    id: 'pattern-break',
    type: 'Pattern Interrupt',
    awareness: 'Problem Aware',
    build: (context, helpers) =>
      `If ${helpers.getPain()} keeps repeating, the opening line is wrong. Replace it with this promise of ${context.outcome}.`,
    rationale: (context, helpers) =>
      `Calls out the failing status quo of living with ${helpers.getPain()} and positions the promise of ${context.outcome} as the corrective lever.`
  },
  {
    id: 'spark-cta',
    type: 'CTA Assist',
    awareness: 'Most Aware',
    build: (context, helpers) =>
      `${helpers.tone.spark} Use it so ${helpers.audiencePlural} connect escaping ${helpers.getPain()} with saying yes to ${context.offering}.`,
    rationale: (context, helpers) =>
      `Pairs the tone-driven call-to-action with a clear link between ${helpers.getPain()}, ${context.outcome}, and saying yes to ${context.offering}.`
  }
];

const buildInsights = (context: GeneratorContext, helpers: TemplateHelpers) => {
  const insights = new Set<string>();
  insights.add(`Audience: ${helpers.audiencePlural}`);
  insights.add(`Offer: ${context.offering}`);
  insights.add(`Outcome: ${context.outcome}`);
  insights.add(`Pain: ${helpers.getPain()}`);
  if (context.pains.length > 1) {
    insights.add(`Also facing: ${helpers.listPains(Math.min(3, context.pains.length))}`);
  }
  insights.add(`Goal: ${helpers.goalFocus}`);
  if (context.notes) {
    insights.add(`Context: ${truncate(context.notes, 70)}`);
  }
  insights.add(`Tone: ${context.tone}`);

  return Array.from(insights).slice(0, 7);
};

const nextId = (() => {
  let counter = 0;
  return () => {
    counter += 1;
    return `hook-${counter}`;
  };
})();

const buildChannelNote = (channels: string[], primaryPain: string, outcome: string) => {
  if (!channels.length) {
    return `Use this wherever attention is scarce to swap ${primaryPain} for ${outcome}.`;
  }

  if (channels.length === 1) {
    const info = resolveChannelInfo(channels[0]);
    return `Run this as your ${info.noun} to ${info.action} by trading ${primaryPain} for ${outcome}.`;
  }

  return `Thread this opening through your ${formatList(channels)} so escaping ${primaryPain} always points to ${outcome}.`;
};

export const generateHooks = (request: HookRequest): GeneratedHook[] => {
  const context = buildContext(request);
  const helpers = createHelpers(context);
  const insights = buildInsights(context, helpers);
  const channelNote = buildChannelNote(context.marketingChannels, context.primaryPain, context.outcome);

  return templates.map((template) => ({
    id: nextId(),
    text: template.build(context, helpers),
    type: template.type,
    awareness: template.awareness,
    rationale: template.rationale(context, helpers),
    channelNote,
    supportingInsights: insights
  }));
};
