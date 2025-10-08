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
  label?: string;
  wordCount?: number;
  angle?: string | null;
}

type HookStyle = 'Statement' | 'Question' | 'Command' | 'Conditional' | 'Story seed';
type HookLabel = '70-core' | '20-adjacent' | '10-experimental';
type HookAwareness =
  | 'Most Aware'
  | 'Product Aware'
  | 'Solution Aware'
  | 'Problem Aware'
  | 'Completely Unaware';

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

interface HookContext extends GeneratorContext {
  callout: string;
  audiencePluralLower: string;
  painSnippet: string;
  outcomeSnippet: string;
  offeringSnippet: string;
  goalSnippet: string;
  planAsset: string;
  stressPromise: string;
  upgradeCue: string;
  skipCue: string;
  speedVerb: string;
}

interface HookBlueprint {
  id: string;
  style: HookStyle;
  awareness: HookAwareness;
  label: HookLabel;
  angle: string;
  build: (context: HookContext) => string;
  rationale: (context: HookContext) => string;
}

const sanitize = (value: string) => value.trim();

const capitalizeFirst = (value: string) => {
  const trimmed = sanitize(value);
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

const toWords = (value: string) => sanitize(value).replace(/[–—]/g, ' ').split(/\s+/).filter(Boolean);

const shortenPhrase = (value: string, maxWords: number, fallback: string) => {
  const words = toWords(value);
  if (!words.length) return fallback;
  return words.slice(0, maxWords).join(' ');
};

const normalizePain = (value: string) => {
  const trimmed = sanitize(value).replace(/[.!?,]/g, '');
  const withoutLead = trimmed.replace(/^\b(feeling|being|getting)\b\s+/i, '');
  return shortenPhrase(withoutLead, 4, 'planning stress').toLowerCase();
};

const normalizeOutcome = (value: string) => {
  const trimmed = sanitize(value).replace(/[.!?,]/g, '');
  return shortenPhrase(trimmed, 4, 'dream trip');
};

const normalizeOffering = (value: string) => {
  const trimmed = sanitize(value).replace(/[.!?,]/g, '');
  return shortenPhrase(trimmed, 4, 'our plan');
};

const normalizeGoal = (value: string) => {
  const trimmed = sanitize(value).replace(/[.!?,]/g, '');
  return shortenPhrase(trimmed, 4, 'win bookings');
};

const toAudiencePlural = (audience: string) => {
  const trimmed = sanitize(audience);
  if (!trimmed) return 'travelers';
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

const detectSpeedDescriptor = (context: GeneratorContext) => {
  const haystack = `${context.notes} ${context.offering} ${context.campaignGoal}`.toLowerCase();
  if (haystack.includes('24-hour') || haystack.includes('24 hour') || haystack.includes('24hr')) {
    return '24-hour';
  }
  if (haystack.includes('same-day') || haystack.includes('same day')) {
    return 'same-day';
  }
  if (haystack.includes('overnight')) {
    return 'overnight';
  }
  return 'next-day';
};

const detectAssetNoun = (context: GeneratorContext) => {
  const haystack = `${context.offering} ${context.notes}`.toLowerCase();
  if (haystack.includes('blueprint')) return 'blueprint';
  if (haystack.includes('template')) return 'template';
  if (haystack.includes('guide')) return 'guide';
  if (haystack.includes('plan')) return 'plan';
  if (haystack.includes('map')) return 'map';
  if (haystack.includes('itinerary')) return 'itinerary';
  return 'plan';
};

const buildContext = (request: HookRequest): HookContext => {
  const pains = request.painPoints.filter((item) => sanitize(item).length > 0);
  const primaryPain = pains[0] || 'planning stress';
  const marketingChannels = ensureMarketingChannels(request.marketingChannels);

  const base: GeneratorContext = {
    audience: sanitize(request.targetAudience) || 'Luxury travelers',
    audiencePlural: toAudiencePlural(request.targetAudience || 'Luxury traveler'),
    offering: sanitize(request.offering) || 'concierge team',
    primaryPain,
    pains,
    outcome: sanitize(request.desiredOutcome) || 'dream trip',
    marketingChannels,
    tone: sanitize(request.tone) || 'Bold and direct',
    campaignGoal: sanitize(request.campaignGoal) || 'drive bookings',
    notes: sanitize(request.additionalNotes),
  };

  const speedDescriptor = detectSpeedDescriptor(base);
  const assetNoun = detectAssetNoun(base);
  const planAsset = `${speedDescriptor} ${assetNoun}`;
  const painSnippet = normalizePain(base.primaryPain);
  const outcomeSnippet = normalizeOutcome(base.outcome);
  const offeringSnippet = normalizeOffering(base.offering);
  const goalSnippet = normalizeGoal(base.campaignGoal || base.outcome);

  const noteLower = base.notes.toLowerCase();
  const upgradeCue = noteLower.includes('perk') || noteLower.includes('upgrade')
    ? 'perks waiting'
    : 'automatic upgrades';

  const skipCue = noteLower.includes('line') || noteLower.includes('queue')
    ? 'skip every line'
    : 'skip lines';

  const stressPromise = `stress-free ${outcomeSnippet}`;
  const speedVerb =
    speedDescriptor === '24-hour' ? 'overnight' : speedDescriptor === 'same-day' ? 'same-day' : 'fast';

  return {
    ...base,
    callout: `${capitalizeFirst(base.audience)}:`,
    audiencePluralLower: base.audiencePlural.toLowerCase(),
    painSnippet,
    outcomeSnippet,
    offeringSnippet,
    goalSnippet,
    planAsset,
    stressPromise,
    upgradeCue,
    skipCue,
    speedVerb,
  };
};

const buildInsights = (context: HookContext) => {
  const insights = new Set<string>();
  insights.add(`Audience: ${capitalizeFirst(context.audiencePlural)}`);
  insights.add(`Offer: ${capitalizeFirst(context.offeringSnippet)}`);
  insights.add(`Outcome: ${capitalizeFirst(context.outcomeSnippet)}`);
  insights.add(`Top pain: ${capitalizeFirst(context.painSnippet)}`);
  if (context.pains.length > 1) {
    const rest = context.pains
      .slice(1)
      .map((pain) => capitalizeFirst(normalizePain(pain)));
    if (rest.length) {
      insights.add(`Also note: ${rest.slice(0, 2).join(', ')}`);
    }
  }
  insights.add(`Goal: ${capitalizeFirst(context.goalSnippet)}`);
  if (context.notes) {
    insights.add(
      `Notes: ${context.notes.length > 70 ? `${context.notes.slice(0, 67)}…` : context.notes}`
    );
  }
  insights.add(`Tone: ${context.tone}`);
  return Array.from(insights).slice(0, 7);
};

const countWords = (value: string) => toWords(value).length;

const hasCTAWords = (value: string) => /\b(book|call|click|schedule|consult|consultation)\b/i.test(value);

const hasPassiveVoice = (value: string) => /\b(is being|was being|were being|has been|have been|had been|will be|being)\b/i.test(value);

const hookBlueprints: HookBlueprint[] = [
  {
    id: 'core-callout-speed',
    style: 'Statement',
    awareness: 'Problem Aware',
    label: '70-core',
    angle: 'Speed',
    build: (context) =>
      `${context.callout} ${capitalizeFirst(context.painSnippet)}? Take our ${context.planAsset}.`,
    rationale: (context) =>
      `Names ${context.painSnippet} then hands them a ${context.planAsset} so relief feels instant.`,
  },
  {
    id: 'core-trade-stress',
    style: 'Statement',
    awareness: 'Problem Aware',
    label: '70-core',
    angle: 'Stress relief',
    build: (context) => `${context.callout} Trade ${context.painSnippet} for ${context.stressPromise} now.`,
    rationale: (context) =>
      `Contrasts the current stress (${context.painSnippet}) with the promise of ${context.stressPromise}.`,
  },
  {
    id: 'core-outcome-trigger',
    style: 'Statement',
    awareness: 'Solution Aware',
    label: '70-core',
    angle: 'Transformation',
    build: (context) => `${context.callout} ${capitalizeFirst(context.outcomeSnippet)} starts once ${context.painSnippet} stops.`,
    rationale: (context) => `Signals the new reality (${context.outcomeSnippet}) begins when ${context.painSnippet} disappears.`,
  },
  {
    id: 'core-command-skip',
    style: 'Command',
    awareness: 'Solution Aware',
    label: '70-core',
    angle: 'Line-skipping',
    build: (context) => `${context.callout} Skip lines; keep ${context.outcomeSnippet} on schedule.`,
    rationale: () => 'Turns line-skipping into the opener so the promise is immediate.',
  },
  {
    id: 'core-conditional-plan',
    style: 'Conditional',
    awareness: 'Problem Aware',
    label: '70-core',
    angle: 'Speed',
    build: (context) => `If ${context.painSnippet} drains you, grab this ${context.planAsset}.`,
    rationale: (context) =>
      `Makes the ${context.planAsset} the obvious fix for anyone stuck in ${context.painSnippet}.`,
  },
  {
    id: 'core-upgrade-signal',
    style: 'Statement',
    awareness: 'Product Aware',
    label: '70-core',
    angle: 'Upgrades',
    build: (context) => `${context.callout} Upgrades land once you drop ${context.painSnippet}.`,
    rationale: (context) => `Links desired perks to eliminating ${context.painSnippet}.`,
  },
  {
    id: 'core-proof',
    style: 'Statement',
    awareness: 'Product Aware',
    label: '70-core',
    angle: 'Proof',
    build: (context) => `${context.callout} Clients ditched ${context.painSnippet} and kept ${context.outcomeSnippet}.`,
    rationale: (context) => `Shows real people escaping ${context.painSnippet} while holding onto ${context.outcomeSnippet}.`,
  },
  {
    id: 'core-plan-vs-tabs',
    style: 'Statement',
    awareness: 'Solution Aware',
    label: '70-core',
    angle: 'Speed',
    build: (context) => `${context.callout} ${capitalizeFirst(context.planAsset)} beats endless tabs every time.`,
    rationale: () => 'Frames the asset as the shortcut compared to chaotic tab-juggling.',
  },
  {
    id: 'core-question-proof',
    style: 'Question',
    awareness: 'Product Aware',
    label: '70-core',
    angle: 'Proof',
    build: (context) =>
      `Why do ${context.audiencePluralLower} trust ${context.offeringSnippet} for ${context.outcomeSnippet}?`,
    rationale: (context) =>
      `Uses social proof—others trust ${context.offeringSnippet} to reach ${context.outcomeSnippet}.`,
  },
  {
    id: 'core-stressfree-plan',
    style: 'Statement',
    awareness: 'Solution Aware',
    label: '70-core',
    angle: 'Stress relief',
    build: (context) => `${context.callout} Stress-free ${context.outcomeSnippet} lives inside this ${context.planAsset}.`,
    rationale: (context) => `Pairs the stress-free promise with the tangible ${context.planAsset}.`,
  },
  {
    id: 'core-speed-verb',
    style: 'Statement',
    awareness: 'Solution Aware',
    label: '70-core',
    angle: 'Speed',
    build: (context) => `${context.callout} ${capitalizeFirst(context.speedVerb)} planning starts with our ${context.planAsset}.`,
    rationale: (context) => `Signals how quickly momentum returns once they use the ${context.planAsset}.`,
  },
  {
    id: 'core-upgrade-follow',
    style: 'Statement',
    awareness: 'Product Aware',
    label: '70-core',
    angle: 'Upgrades',
    build: (context) => `${context.callout} ${capitalizeFirst(context.upgradeCue)} follow our ${context.offeringSnippet}.`,
    rationale: () => 'Connects perks to the offer so upgrades feel automatic.',
  },
  {
    id: 'core-queue-command',
    style: 'Command',
    awareness: 'Solution Aware',
    label: '70-core',
    angle: 'Line-skipping',
    build: (context) => `${context.callout} Breeze past queues with this ${context.planAsset}.`,
    rationale: () => 'Invites them to skip queues by deploying the plan asset immediately.',
  },
  {
    id: 'core-goal-link',
    style: 'Statement',
    awareness: 'Most Aware',
    label: '70-core',
    angle: 'Goal tie-in',
    build: (context) => `${context.callout} ${capitalizeFirst(context.goalSnippet)} needs less ${context.painSnippet}.`,
    rationale: (context) => `Links the campaign goal to removing ${context.painSnippet}.`,
  },
  {
    id: 'adjacent-concierge-script',
    style: 'Command',
    awareness: 'Product Aware',
    label: '20-adjacent',
    angle: 'Upgrades',
    build: (context) => `${context.callout} Borrow our concierge script; watch upgrades stack.`,
    rationale: () => 'Gives a directive that promises visible perks fast.',
  },
  {
    id: 'adjacent-speed-question',
    style: 'Question',
    awareness: 'Solution Aware',
    label: '20-adjacent',
    angle: 'Speed',
    build: (context) =>
      `What if ${context.audiencePluralLower} planned ${context.outcomeSnippet} in minutes?`,
    rationale: (context) => `Opens a curiosity loop about faster planning toward ${context.outcomeSnippet}.`,
  },
  {
    id: 'adjacent-swap-tabs',
    style: 'Command',
    awareness: 'Problem Aware',
    label: '20-adjacent',
    angle: 'Stress relief',
    build: (context) => `${context.callout} Swap midnight spreadsheets for guided ${context.outcomeSnippet}.`,
    rationale: () => 'Paints the relief of dropping chaotic spreadsheets for a guided path.',
  },
  {
    id: 'adjacent-calm-outcome',
    style: 'Statement',
    awareness: 'Solution Aware',
    label: '20-adjacent',
    angle: 'Stress relief',
    build: (context) => `${context.callout} ${capitalizeFirst(context.outcomeSnippet)} without panic lives here.`,
    rationale: () => 'Promises the desired outcome minus the panic.',
  },
  {
    id: 'adjacent-upgrade-shortcut',
    style: 'Conditional',
    awareness: 'Product Aware',
    label: '20-adjacent',
    angle: 'Upgrades',
    build: (context) => `If upgrades matter, our ${context.planAsset} is your shortcut.`,
    rationale: () => 'Reframes the asset as the lever for people chasing perks.',
  },
  {
    id: 'experimental-story-customs',
    style: 'Story seed',
    awareness: 'Completely Unaware',
    label: '10-experimental',
    angle: 'Story',
    build: (context) =>
      `Story seed: ${capitalizeFirst(context.audiencePluralLower)} breezed past customs with one map.`,
    rationale: () => 'Teases a vivid story about stress-free travel moments.',
  },
  {
    id: 'experimental-story-upgrades',
    style: 'Story seed',
    awareness: 'Completely Unaware',
    label: '10-experimental',
    angle: 'Upgrades',
    build: (context) =>
      `Story seed: ${capitalizeFirst(context.audiencePluralLower)} cheered when upgrades greeted them.`,
    rationale: () => 'Hints at a celebration scene to spark curiosity.',
  },
];

const buildChannelNote = (
  channels: string[],
  angle: string,
  primaryPain: string,
  outcome: string
) => {
  const angleLower = angle.toLowerCase();
  if (!channels.length) {
    return `Use this ${angleLower} hook wherever attention is scarce to trade ${primaryPain} for ${outcome}.`;
  }

  if (channels.length === 1) {
    const channel = channels[0];
    const info = resolveChannelInfo(channel);
    return `For your ${info.noun}, lead with the ${angleLower} angle so you ${info.action} while moving from ${primaryPain} to ${outcome}.`;
  }

  return `Thread this ${angleLower} angle through ${channels.join(', ')} so escaping ${primaryPain} always points to ${outcome}.`;
};

const resolveChannelInfo = (channel?: string) => {
  switch (channel) {
    case 'Paid Ads':
      return { noun: 'paid ad opener', action: 'slow the scroll' };
    case 'Organic Social':
      return { noun: 'social hook', action: 'stop the thumb' };
    case 'Email':
      return { noun: 'subject line', action: 'earn the open' };
    case 'Webinar':
      return { noun: 'webinar intro', action: 'keep viewers logged in' };
    case 'Landing Page':
      return { noun: 'hero headline', action: 'anchor the page' };
    case 'Direct Mail':
      return { noun: 'mailpiece headline', action: 'jump off the page' };
    case 'Sales Call':
      return { noun: 'call opener', action: 'reframe the stakes' };
    default:
      return { noun: 'campaign opener', action: 'earn the first five seconds' };
  }
};

const qaPasses = (text: string) => {
  const wordCount = countWords(text);
  if (wordCount < 6 || wordCount > 14) return false;
  if (hasCTAWords(text)) return false;
  if (hasPassiveVoice(text)) return false;
  if (/\b(unlock|leverage|synergy|synergies|paradigm|disrupt|innovative solution|cutting-edge|game-changing)\b/i.test(text)) return false;
  return true;
};

const nextId = (() => {
  let counter = 0;
  return () => {
    counter += 1;
    return `hook-${counter}`;
  };
})();

export const generateHooks = (request: HookRequest): GeneratedHook[] => {
  const context = buildContext(request);
  const insights = buildInsights(context);

  const hooks = hookBlueprints
    .map((blueprint) => {
      const text = blueprint.build(context);
      if (!qaPasses(text)) {
        return null;
      }

      const channelNote = buildChannelNote(
        context.marketingChannels,
        blueprint.angle,
        context.painSnippet,
        context.outcomeSnippet
      );

      const supportingInsights = Array.from(
        new Set([...insights, `Angle: ${blueprint.angle}`])
      ).slice(0, 7);

      return {
        id: nextId(),
        text,
        type: `${blueprint.style} · ${blueprint.angle}`,
        awareness: blueprint.awareness,
        rationale: blueprint.rationale(context),
        channelNote,
        supportingInsights,
        label: blueprint.label,
        angle: blueprint.angle,
      } satisfies GeneratedHook;
    })
    .filter((hook): hook is GeneratedHook => Boolean(hook));

  return hooks;
};
