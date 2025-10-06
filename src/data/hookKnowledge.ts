export interface KnowledgePrinciple {
  id: string;
  title: string;
  description: string;
}

export interface HookCategory {
  id: string;
  name: string;
  description: string;
  guidance: string[];
  example: string;
}

export interface AwarenessStage {
  id: string;
  name: string;
  focus: string;
  exampleTemplate: string;
}

export interface KnowledgeSnippet {
  id: string;
  title: string;
  content: string;
}

export interface HookKnowledgeBase {
  principles: KnowledgePrinciple[];
  categories: HookCategory[];
  awareness: AwarenessStage[];
  marketingAngles: { channel: string; framing: string; }[];
  reminder: string;
}

export const HOOK_KNOWLEDGE: HookKnowledgeBase = {
  principles: [
    {
      id: 'principle-callout',
      title: 'Lead with the audience',
      description:
        'Open with a call out or label so your ideal prospect instantly knows the message is for them. This leverages the "cocktail party effect" described in Hooks That Get Clicks.'
    },
    {
      id: 'principle-value',
      title: 'Promise a clear payoff',
      description:
        'Follow the call out with a sharp value promise so consuming the content feels worth the effort. Hooks sell the next action, not the entire offer.'
    },
    {
      id: 'principle-iterate',
      title: 'Multiply variations',
      description:
        'Use the 70/20/10 rule: double down on proven hooks, remix adjacent winners, and reserve a few slots for bold experiments so you never run out of angles.'
    },
    {
      id: 'principle-testing',
      title: 'Let data do the teaching',
      description:
        'Document the hooks you test and recycle the top performers. Even a small dataset highlights which openings earn attention and which to retire.'
    },
    {
      id: 'principle-balance',
      title: 'Blend verbal and visual cues',
      description:
        'When the platform allows, pair punchy words with pattern-breaking visuals or sounds to double down on attention capture.'
    }
  ],
  categories: [
    {
      id: 'category-label',
      name: 'Label Call Outs',
      description: 'Directly name the audience so they recognize themselves instantly.',
      guidance: [
        'Use identity phrases like "Agency owners" or "Dental practice leaders".',
        'Stack urgency or curiosity after the call out.',
        'Works well for paid ads and outbound where you need to qualify fast.'
      ],
      example: 'Local business owners, I have a gift for you.'
    },
    {
      id: 'category-question',
      name: 'Questions',
      description: 'Invite the audience to answer a provocative or leading question.',
      guidance: [
        'Problem-aware questions agitate existing pain.',
        'Yes/no questions should feel like a layup for the prospect.',
        'Pair with a fast payoff to avoid vague curiosity.'
      ],
      example: 'Would you pay $1,000 to have the business of your dreams in 30 days?'
    },
    {
      id: 'category-conditional',
      name: 'Conditionals',
      description: 'Introduce an if/then scenario that promises a transformation.',
      guidance: [
        'Highlight the condition your audience is stuck in.',
        'Promise relief or a shortcut when they keep watching/reading.',
        'Great for ads and webinars where you preview a framework.'
      ],
      example: "If you're working all the time and your business isn't growing, you're working on the wrong stuff."
    },
    {
      id: 'category-command',
      name: 'Commands',
      description: 'Tell the prospect exactly what to do next.',
      guidance: [
        'Use decisive verbs like "Read", "Watch", or "Stop".',
        'Make the command feel like a cheat code rather than homework.',
        'Follow with the payoff so it never sounds bossy without benefit.'
      ],
      example: 'Read this if you want to win.'
    },
    {
      id: 'category-statement',
      name: 'Bold Statements',
      description: 'Drop a contrarian or status-boosting statement that reframes the problem.',
      guidance: [
        'Lead with a surprising insight or number.',
        'Contrast the old way versus the new way in one sentence.',
        'Use for feeds where pattern interrupts matter.'
      ],
      example: 'The smartest thing you can do today…'
    },
    {
      id: 'category-story',
      name: 'Story Teasers',
      description: 'Begin with a vivid, incomplete moment that begs for the payoff.',
      guidance: [
        'Drop the audience into the conflict immediately.',
        'Keep it to one or two sentences before promising the lesson.',
        'Ideal for videos, webinars, and long-form email.'
      ],
      example: 'One day I was in the back and this old lady comes in and she was furious.'
    },
    {
      id: 'category-list',
      name: 'Lists & Frameworks',
      description: 'Promise a finite set of steps, mistakes, or secrets.',
      guidance: [
        'Numbers communicate structure and speed.',
        'Use odd or specific counts to avoid sounding generic.',
        'Tie the list to the exact outcome your audience craves.'
      ],
      example: 'In this video I'm going to talk to you about the 28 ways to stay poor.'
    },
    {
      id: 'category-exclamation',
      name: 'Emotive Exclamations',
      description: 'Use expressive language to spark curiosity or excitement.',
      guidance: [
        'Pair the emotion with a promised reward.',
        'Keep it grounded—emotion without payoff falls flat.',
        'Use sparingly for scroll-stopping social hooks.'
      ],
      example: 'Ahhhhh… This is the blueprint to becoming a millionaire.'
    }
  ],
  awareness: [
    {
      id: 'aware-most',
      name: 'Most Aware',
      focus: 'Highlight the specific offer or deal to activate ready buyers.',
      exampleTemplate: 'Get {offer_detail} before {deadline}.'
    },
    {
      id: 'aware-product',
      name: 'Product Aware',
      focus: 'Show proof that your offer works for people like them.',
      exampleTemplate: 'See how {audience} used {offer} to {result}.'
    },
    {
      id: 'aware-solution',
      name: 'Solution Aware',
      focus: 'Promise the desired outcome and position your offer as the vehicle.',
      exampleTemplate: '{Result} in {timeframe} without {pain_point}.'
    },
    {
      id: 'aware-problem',
      name: 'Problem Aware',
      focus: 'Agitate the pain they already feel and hint that relief exists.',
      exampleTemplate: 'Tired of {pain_point}? Try this instead.'
    },
    {
      id: 'aware-unaware',
      name: 'Completely Unaware',
      focus: 'Spark curiosity by pointing to a hidden risk or opportunity.',
      exampleTemplate: 'The hidden {threat_or_opportunity} costing {audience} {stakes}.'
    }
  ],
  marketingAngles: [
    { channel: 'Paid Ads', framing: 'Make it a scroll-stopping line that earns the next 3 seconds.' },
    { channel: 'Organic Social', framing: 'Front-load the dopamine hit to slow the scroll.' },
    { channel: 'Email', framing: 'Treat it like a subject line that must win the open.' },
    { channel: 'Webinar', framing: 'Open the room with a question that keeps them from bouncing.' },
    { channel: 'Landing Page', framing: 'Craft a hero headline that anchors the entire page.' },
    { channel: 'Direct Mail', framing: 'Use bold, legible phrasing that jumps off the page.' },
    { channel: 'Sales Call', framing: 'Turn it into an icebreaker that reframes the stakes.' }
  ],
  reminder:
    'Remember: hooks win attention, not the entire sale. Spend disproportionate effort on the first sentence, then let the rest of the asset deliver.'
};

export const BASE_HOOK_KNOWLEDGE_SNIPPETS: KnowledgeSnippet[] = [
  {
    id: 'snippet-larry-king',
    title: 'The Larry King Hook Lesson',
    content:
      'Dean Graziosi's infomercial only worked after the opening hook focused on the viewer ("Have you ever…") instead of his credentials. Two sentences can make or break a campaign.'
  },
  {
    id: 'snippet-cocktail-party',
    title: 'Cocktail Party Effect',
    content:
      'Great hooks cut through noise the same way your name cuts through a loud room: call out the audience, deliver a crisp promise, and earn permission to keep talking.'
  },
  {
    id: 'snippet-702010',
    title: '70/20/10 Creative Mix',
    content:
      'Devote 70% of resources to proven hooks, 20% to "winner-adjacent" experiments, and 10% to bold new ideas so you always have fresh angles.'
  },
  {
    id: 'snippet-testing',
    title: 'Test Hooks Relentlessly',
    content:
      'Record multiple openings for every asset, split-test subject lines, and log the results. Let the data decide what stays in rotation.'
  }
];

export const DEFAULT_MARKETING_CHANNELS = HOOK_KNOWLEDGE.marketingAngles.map((angle) => angle.channel);
