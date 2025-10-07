export const HOOK_KNOWLEDGE = {
  corePhilosophy: {
    larryKingLesson: 'Dean Graziosi\'s infomercial only worked after changing the opening hook from credentials-focused to viewer-focused ("Have you ever..."). Two sentences can make or break a campaign. Spend 80% of your advertising time on the hook.',
    cocktailPartyEffect: 'Great hooks cut through noise the same way your name cuts through a loud room: call out the audience, deliver a crisp promise, and earn permission to keep talking.',
    assemblyProcess: 'Hooks x50 × Meat x3-5 × CTAs x1-3 = 150-750 ads per week. Ads are assembled, not created from scratch.',
    effortAllocation: '80% of prep time on hooks, 20% on meat (content), ~0% on CTAs'
  },

  principles: [
    {
      id: 'principle-callout',
      title: 'Lead with the audience',
      description: 'Open with a call out or label so your ideal prospect instantly knows the message is for them. This leverages the "cocktail party effect."'
    },
    {
      id: 'principle-value',
      title: 'Promise a clear payoff',
      description: 'Follow the call out with a sharp value promise so consuming the content feels worth the effort. Hooks sell the next action, not the entire offer.'
    },
    {
      id: 'principle-iterate',
      title: 'Multiply variations (70/20/10 Rule)',
      description: '70% core business (proven winners), 20% emerging business (winner-adjacent), 10% big new ideas (moonshots). This is Google\'s innovation allocation strategy.'
    },
    {
      id: 'principle-testing',
      title: 'Let data do the teaching',
      description: 'Document hooks you test and recycle top performers. Even a small dataset highlights which openings earn attention and which to retire.'
    },
    {
      id: 'principle-balance',
      title: 'Blend verbal and visual cues',
      description: 'When the platform allows, pair punchy words with pattern-breaking visuals or sounds to double down on attention capture.'
    },
    {
      id: 'principle-scale',
      title: 'Better ads = bigger audiences',
      description: 'You don\'t saturate markets, you hit walls with ad quality. The better your ads, the colder the traffic they convert. Scale comes from making more, better ads.'
    }
  ],

  awarenessLevels: [
    {
      id: 'aware-most',
      level: 1,
      name: 'Most Aware',
      audience: 'Warmest and smallest - knows your product, only needs the deal',
      hookStyle: 'Offer-driven',
      focus: 'Highlight the specific offer or deal to activate ready buyers',
      exampleTemplate: 'Get {offer_detail} before {deadline}',
      b2cExample: 'XFast\'s new formula: Now with 25% more protein – Same great taste!',
      b2bExample: 'DigitalBoost: Now offering social media management at 20% off for new clients',
      conversionRate: 'Highest',
      audienceSize: 'Smallest'
    },
    {
      id: 'aware-product',
      level: 2,
      name: 'Product Aware',
      audience: 'Knows what you sell but isn\'t sure it\'s right for them',
      hookStyle: 'Proof-driven',
      focus: 'Show proof that your offer works for people like them',
      exampleTemplate: 'See how {audience} used {offer} to {result}',
      b2cExample: 'Why 9 out of 10 XFast users reached their goal weight within 3 months',
      b2bExample: 'See how DigitalBoost increased ROI by 150% for 5 different industries',
      conversionRate: 'High',
      audienceSize: 'Small'
    },
    {
      id: 'aware-solution',
      level: 3,
      name: 'Solution Aware',
      audience: 'Knows the result they want but doesn\'t know your product provides it',
      hookStyle: 'Promise-driven',
      focus: 'Promise the desired outcome and position your offer as the vehicle',
      exampleTemplate: '{Result} in {timeframe} without {pain_point}',
      b2cExample: 'Lose 15 pounds in 30 days with our scientifically proven meal replacement system',
      b2bExample: 'Double your online sales in 6 months with our data-driven marketing strategies',
      conversionRate: 'Medium',
      audienceSize: 'Medium'
    },
    {
      id: 'aware-problem',
      level: 4,
      name: 'Problem Aware',
      audience: 'Senses they have a problem but doesn\'t know there\'s a solution',
      hookStyle: 'Pain-driven',
      focus: 'Agitate the pain they already feel and hint that relief exists',
      exampleTemplate: 'Tired of {pain_point}? Try this instead',
      b2cExample: 'Frustrated with crash diets that don\'t last? There\'s a sustainable way to shed pounds',
      b2bExample: 'Is your website getting sales? You might be missing these crucial elements',
      conversionRate: 'Lower',
      audienceSize: 'Large'
    },
    {
      id: 'aware-unaware',
      level: 5,
      name: 'Completely Unaware',
      audience: 'Coldest and largest - doesn\'t know they have a problem or need',
      hookStyle: 'Curiosity-driven',
      focus: 'Spark curiosity by pointing to a hidden risk or opportunity',
      exampleTemplate: 'The hidden {threat_or_opportunity} costing {audience} {stakes}',
      b2cExample: 'The hidden hormonal imbalance that\'s making 1 in 3 Americans gain weight',
      b2bExample: 'The unexpected way your business is losing $1000s each month in untapped revenue',
      conversionRate: 'Lowest',
      audienceSize: 'Largest'
    }
  ],

  hookTypes: {
    verbal: [
      {
        type: 'Labels',
        description: 'Words your avatar identifies with',
        examples: [
          'Local business owners, I have a gift for you',
          'Real quick question… Can I have your email address?',
          'Business owners: Do you ever wonder if you\'re working on the wrong stuff?'
        ],
        whenToUse: 'Paid ads, outbound - need to qualify fast'
      },
      {
        type: 'Questions',
        subtypes: {
          yes: 'Would you pay $1,000 dollars to have the business of your dreams in 30 days?',
          open: 'Which would you rather be? The guy pushing the boulder up the hill? Or the one with the boulder at the top?'
        },
        guidance: 'Problem-aware questions agitate pain. Yes/no questions should feel like layups. Pair with fast payoff.',
        examples: [
          'You guys want to hear something completely insane?',
          'What\'s going on everyone? Today we\'re going to talk about a fun topic which is: I got a message: "I\'m dead broke, what do I do?"'
        ]
      },
      {
        type: 'Conditionals',
        description: 'Scenarios or conditions leading to a result, learning, or command',
        examples: [
          'If you\'re working all the time and your business isn\'t growing, you\'re working on the wrong shit',
          'If you want someone to treat you differently, you have to address it as soon as possible when they do something against it',
          'If you can be in a bad mood for no reason you might as well be in a good mood for no reason'
        ],
        whenToUse: 'Great for ads and webinars where you preview a framework'
      },
      {
        type: 'Commands',
        description: 'Direct commands telling the audience to do something',
        examples: [
          'Read this if you want to win',
          'Read this if you\'re tired of being broke',
          'Throw out your morning routine and switch to a money routine'
        ],
        guidance: 'Use decisive verbs. Make it feel like a cheat code, not homework. Follow with payoff.'
      },
      {
        type: 'Statements',
        description: 'Bold, contrarian, or status-boosting statements',
        examples: [
          'The smartest thing you can do today',
          'How to get ahead of 99% of people',
          'I wrote this for you',
          'The best offer I\'ve ever made',
          'For people who want to quit work someday',
          'Fear is a mile wide and an inch deep',
          'The world belongs to optimists. Because if you\'re going to do anything big, you have to believe it can happen'
        ],
        guidance: 'Lead with surprising insight or number. Contrast old way vs new way. Use for feeds where pattern interrupts matter.'
      },
      {
        type: 'Lists',
        description: 'Promise finite steps, mistakes, or secrets',
        examples: [
          'In this video I\'m going to talk to you about the 28 ways to stay poor',
          '3 hacks to make life suck less',
          'Thirteen lessons I learned after graduating college from the real world that I wish I learned earlier'
        ],
        guidance: 'Numbers communicate structure and speed. Use odd or specific counts. Tie to exact outcome audience craves.'
      },
      {
        type: 'Narratives',
        description: 'Stories and anecdotes - drop audience into conflict immediately',
        examples: [
          'One day I was in the back and this old lady comes in and she was piss angry',
          'Warren Buffet once told the story of his closest friend at Columbia Business School. He said…',
          'On November 30th, 2022, the world changed forever',
          'I\'m at her parents\' house in an extra bedroom. I\'m the guy she met from the internet that she quit her job for, who\'s just lost everything. I had $1000 left'
        ],
        guidance: 'Keep it to one or two sentences before promising the lesson. Ideal for videos, webinars, long-form email.'
      },
      {
        type: 'Exclamations',
        description: 'Express strong emotions like surprise or sadness',
        examples: [
          'Ahhhhh… This is the blueprint to becoming a millionaire and I\'m going to walk you through the levels',
          'The rumors are true…',
          'At last! It\'s finally here'
        ],
        guidance: 'Pair emotion with promised reward. Keep grounded - emotion without payoff falls flat. Use sparingly for scroll-stopping.'
      }
    ],
    nonverbal: [
      {
        type: 'Visual Hooks',
        examples: [
          'Pattern interrupts (unusual visuals)',
          'Before-and-after images',
          'Memes or meme-like content (attracts largest audience)',
          'Product demonstrations',
          'Reactions (unboxing, first-time user)',
          'Catching a banana mid-air'
        ],
        note: 'Memes attract the widest possible audience. Culture-specific memes work like moth to flame for targeted groups.'
      },
      {
        type: 'Audio Hooks',
        examples: [
          'Unexpected sounds',
          'Music changes',
          'Voice tone shifts',
          'Sound effects'
        ]
      }
    ]
  },

  adFormats: [
    {
      name: 'Demonstration Ads',
      description: 'Show the product/service in action',
      variants: [
        'Live use or reactions',
        'Unboxing',
        'Comparisons (before-and-afters)',
        'High production hero ads (Dollar Shave Club, Old Spice style)',
        'Product demonstrations',
        'Service demonstrations (showing results)'
      ],
      whenToUse: 'When you need to prove it works or show how it works'
    },
    {
      name: 'Testimonial Ads',
      description: 'Customer proof and social validation',
      variants: [
        'User-generated content (UGC)',
        'Direct-to-camera testimonials',
        'Podcast style interviews',
        'Professional testimonials',
        'Raw iPhone style testimonials',
        'Walk \'n talk rants',
        'Group testimonials (parade of proof)',
        'Lifecycle ads (before → during → after journey)',
        'Man-on-the-street interviews',
        'Influencer collabs'
      ],
      whenToUse: 'When you have strong customer results and want social proof',
      note: 'Parade of proof (group testimonials showing many customers with results) are extremely powerful'
    },
    {
      name: 'Education Ads',
      description: 'Teach something valuable',
      variants: [
        'Explainer videos',
        'How-to content',
        'Whiteboard explainers',
        'Listicle videos',
        'High-performing organic content repurposed'
      ],
      whenToUse: 'For solution-aware and problem-aware audiences who need education'
    },
    {
      name: 'Story Ads',
      description: 'Narrative-driven emotional connection',
      variants: [
        'Storytelling/narrative',
        'Lifestyle content',
        'Warnings and opportunities',
        'Documentary style',
        'Skits',
        'Brand manifestos'
      ],
      whenToUse: 'When you want emotional connection or need to make unaware audience aware'
    },
    {
      name: 'Faceless Ads',
      description: 'No person on camera',
      variants: [
        'Screenshots of customer comments/texts',
        'Text-only',
        'Slide shows',
        'Animations',
        'Cartoon ads',
        'Visual effect-based ads',
        'Screenshot compilations'
      ],
      whenToUse: 'When you don\'t want to be on camera or want to highlight customer voices',
      note: '80% of Hormozi\'s top 50 ads didn\'t have his face - they were customers'
    }
  ],

  ctaStructure: {
    principle: 'Clear > Clever. Show AND tell them what to do next.',
    components: [
      'What to do: "Take advantage of this offer by..."',
      'How to do it: "...tapping the button on the bottom of your screen..."',
      'When to do it: "...before it expires..."',
      'What they get: "...and you\'ll get $1,000 of free stuff"',
      'What happens next: "...delivered straight to your inbox" (optional)'
    ],
    tactics: [
      'Urgency (deadline, scarcity)',
      'Scarcity (limited quantity)',
      'Guarantees (risk reversal)',
      'Bonuses (added value)',
      'Demonstration (show the next step visually)'
    ],
    examples: [
      '"Start free on the next page"',
      '"Grab your 14-day free trial on the next page"',
      '"Get started on the next page free"'
    ]
  },

  marketingChannels: [
    {
      channel: 'Paid Ads',
      framing: 'First 3-5 words must stop the scroll. Front-load value.',
      hookGuidance: 'Make it a scroll-stopping line that earns the next 3 seconds'
    },
    {
      channel: 'Organic Social',
      framing: 'Pattern interrupt in first line. Make it shareable.',
      hookGuidance: 'Front-load the dopamine hit to slow the scroll'
    },
    {
      channel: 'Email',
      framing: 'Subject line must earn the open. Preview text should tease value.',
      hookGuidance: 'Treat it like a subject line that must win the open'
    },
    {
      channel: 'Webinar',
      framing: 'Promise a clear transformation. Create curiosity gap.',
      hookGuidance: 'Open the room with a question that keeps them from bouncing'
    },
    {
      channel: 'Landing Page',
      framing: 'Bold headline + specific subhead. Hero section power.',
      hookGuidance: 'Craft a hero headline that anchors the entire page'
    },
    {
      channel: 'Direct Mail',
      framing: 'Large, bold headline. Tangible, visual language.',
      hookGuidance: 'Use bold, legible phrasing that jumps off the page'
    },
    {
      channel: 'Sales Call',
      framing: 'Permission-based opener. Qualify and intrigue fast.',
      hookGuidance: 'Turn it into an icebreaker that reframes the stakes'
    }
  ],

  toneProfiles: {
    'Bold and direct': 'Use strong, decisive language. No hedging. Action-oriented verbs.',
    'Conversational and empathetic': 'Warm, relatable language. Show understanding. Use "we" and "you".',
    'High-energy hype': 'Enthusiastic, exciting language. Amp up emotion. Create urgency.',
    'Calm authority': 'Measured, confident language. Expert positioning. Reassuring tone.',
    'Data-driven confidence': 'Evidence-based language. Include numbers/metrics. Logical appeal.'
  },

  provenHookExamples: {
    paid_ads: [
      'Real quick question… Can I have your email address?',
      'You might be wondering why I just caught a banana…',
      'That\'s weird… I don\'t see your name on the invite list?',
      'The rumors are true…',
      'Would you pay $1,000 dollars to have the business of your dreams in 30 days?',
      'Which would you rather be? The guy pushing the boulder up the hill? Or the one with the boulder at the top?',
      'Throw out your morning routine and switch to a money routine',
      'Local business owners, I have a gift for you',
      'I have a confession… Which is I am sick and tired of seeing people who have never run a business before teaching other people how to grow businesses',
      'Business owners: Do you ever wonder if you\'re working on the wrong stuff?',
      'Read this if you want to win',
      'Read this if you\'re tired of being broke',
      'How to get ahead of 99% of people',
      'The smartest thing you can do today',
      'I wrote this for you',
      'For people who want to quit work someday'
    ],
    youtube: [
      'You guys want to hear something completely insane',
      'Agghhhhh… This is the blueprint to becoming a millionaire',
      'On November 30th, 2022, the world changed forever',
      'Warren Buffet once told the story of his closest friend at Columbia Business School',
      'In this video I\'m going to talk to you about the 28 ways to stay poor',
      'One in every 250 businesses does over 10 million dollars a year. That means 99% of entrepreneurs never hit it',
      'What I want to do is show you how to win and impress the only person that really matters',
      'This is my most brutally honest advice to my younger self',
      'We\'re all one decision away from changing our lives and a lot of us don\'t even know it',
      'Fear is a mile wide and an inch deep'
    ],
    instagram: [
      'If you\'re working all the time and your business isn\'t growing, you\'re working on the wrong shit',
      'I\'m at her parents\' house in an extra bedroom. I\'m the guy she met from the internet that she quit her job for, who\'s just lost everything',
      'If you wanna become obscenely wealthy and have your parents question if it\'s ethical or illegal what you\'re doing…',
      'The world belongs to optimists. Because if you\'re going to do anything big, you have to believe it can happen',
      'You don\'t know anything, and you\'re not going to learn it by watching another podcast',
      'Poor people stay poor because they\'re afraid of other poor people judging them for trying to get rich',
      '3 hacks to make life suck less',
      'The most miserable place in business is $1-3 million. It\'s the swamp',
      'If you can be in a bad mood for no reason you might as well be in a good mood for no reason',
      'The most successful people I\'ve met in life are willing to experience a wider range of emotions than those who are not'
    ],
    twitter: [
      'Winners define themselves by what they made happen. Victims define themselves by what\'s happened to them. Your call.',
      'Everyone wants the view from the top, but no one wants the climb.',
      'Losers become winners by trying again.',
      'You just have to be willing to look like an idiot while you figure it out.',
      'Either they make your life better or they don\'t get to be in it. No exceptions.',
      'The sooner you accept that everything is your fault, the sooner you can do something about it.',
      'Youth. Free time. Money. Pick two.',
      'When you\'re strong, appear weak. When you\'re weak, appear strong. — Sun Tzu'
    ]
  },

  hookSourcingStrategy: {
    order: [
      'Winning hooks from your previous ads (past winners - reuse them)',
      'Winning hooks from your free content (top-performing content across platforms)',
      'Winning hooks from other people\'s ads (save ads you like, write down hooks)',
      'Winning hooks from other people\'s free content (content with tons of views in your space)',
      'Platform-specific ad libraries (last resort - hard to know what performs)'
    ],
    innovationRule: {
      core70: 'Use proven winners from your own top 5 performers. Stabilizes advertising, guarantees baseline.',
      emerging20: 'Winner-adjacent. Model concepts that work in other niches. Promising but less proven.',
      experimental10: 'Totally new ideas. Risky but could be huge wins. Moonshots.'
    }
  },

  criticalReminders: [
    'Hooks win attention, not the entire sale. Spend disproportionate effort on the first sentence.',
    'If nobody notices your ad, nobody buys your stuff. The hook is everything.',
    'You can 5x, 10x, or 100x your business just by mastering hooks.',
    'After you write your headline, you\'ve spent eighty cents of your advertising dollar. — David Ogilvy',
    'New customers enter your market every day. Don\'t get bored repeating the same stuff. It\'s still their first time seeing it.',
    'Most people\'s ads don\'t work because of the hook, not the offer or the product.',
    'The better your ads, the bigger the audience they convert. You haven\'t saturated the market, you\'ve hit a wall with ad quality.',
    'Go broader rather than narrower. You still catch warm audience and attract some cold audience too.'
  ]
};

export const DEFAULT_MARKETING_CHANNELS = HOOK_KNOWLEDGE.marketingChannels.map((angle) => angle.channel);
