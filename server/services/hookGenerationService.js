import OpenAI from 'openai';
import { HOOK_KNOWLEDGE } from '../data/hookKnowledge.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

class HookGenerationService {

  buildDiscoveryQA(request) {
    const qa = [
      { question: 'Target audience', answer: request.targetAudience },
      { question: 'Offering', answer: request.offering },
      { question: 'Primary pains', answer: this.buildList(request.painPoints).join('; ') },
      { question: 'Desired outcome', answer: request.desiredOutcome },
      { question: 'Campaign goal', answer: request.campaignGoal },
      { question: 'Tone guidance', answer: request.tone },
      { question: 'Marketing channels', answer: Array.isArray(request.marketingChannels) ? request.marketingChannels.join(', ') : '' },
      { question: 'Additional notes', answer: request.additionalNotes }
    ];

    return qa.filter((item) => item.answer && item.answer.trim());
  }

  buildList(values = []) {
    return values
      .map((value) => value && value.trim())
      .filter(Boolean)
      .map((value) => value.replace(/\s+/g, ' '));
  }

  buildDiscoverySummary(request) {
    const lines = [];
    const pains = this.buildList(request.painPoints);

    lines.push(`Audience: ${request.targetAudience || 'Luxury travelers'}`);
    lines.push(`Offer / Mechanism: ${request.offering || 'Premium travel planning'}`);

    if (pains.length) {
      lines.push('Top pains:');
      pains.slice(0, 4).forEach((pain, index) => {
        lines.push(`  ${index + 1}. ${pain}`);
      });
    }

    if (request.desiredOutcome) {
      lines.push(`Desired outcome: ${request.desiredOutcome}`);
    }

    if (request.campaignGoal) {
      lines.push(`Campaign goal: ${request.campaignGoal}`);
    }

    if (request.tone) {
      lines.push(`Tone to echo: ${request.tone}`);
    }

    if (request.marketingChannels?.length) {
      lines.push(`Primary channels: ${request.marketingChannels.join(', ')}`);
    }

    if (request.additionalNotes) {
      lines.push(`Extra notes: ${request.additionalNotes}`);
    }

    return lines.join('\n');
  }

  buildAngleDirectives(request) {
    const pains = this.buildList(request.painPoints);
    const outcome = request.desiredOutcome || 'the promised trip';
    const offer = request.offering || 'your offer';
    const haystack = ` ${request.offering} ${request.desiredOutcome} ${request.campaignGoal} ${request.additionalNotes}`.toLowerCase();
    const hasSpeedCue = /24\s?-?hour|same\s?-?day|overnight|next day|speed|fast|hours?/.test(haystack);
    const hasUpgradeCue = /upgrade|perk|vip|bonus|suite|amenit/.test(haystack);
    const hasSkipCue = /skip|line|queue|crowd|bypass/.test(haystack);

    const directives = [];

    if (pains.length) {
      pains.forEach((pain) => {
        directives.push(`Flip "${pain}" into a vivid relief, not a copy-paste restatement.`);
      });
    }

    directives.push(`Show how ${offer} delivers ${outcome} without the pains above.`);
    directives.push(
      hasSpeedCue
        ? 'Work in at least one hook about the fast turnaround / blueprint / 24-hour relief that surfaced in discovery.'
        : 'Include a speed or friction-free planning angle to contrast with the current pain.'
    );
    directives.push(
      hasUpgradeCue
        ? 'Highlight the automatic upgrades / perks / VIP treatment discovery mentioned.'
        : 'If perks matter for this avatar, suggest how your process unlocks elevated treatment.'
    );
    directives.push(
      hasSkipCue
        ? 'Mirror the "skip the lines / bypass crowds" insight in at least one hook.'
        : 'Offer at least one hook that removes a major friction moment (long lines, logistics, approvals).'
    );
    directives.push('Blend tangible proof angles (who already won) with curiosity or story seeds for cold audiences.');

    return directives;
  }

  buildHormoziReminders() {
    return [
      'Lead with the avatar or a situational hook (Cocktail Party effect).',
      'Make one promise per line; the hook sells the next 5 seconds, not the full offer.',
      'Keep the writing punchy: 6–14 words, active voice, confident verbs.'
    ];
  }

  buildOriginalityChecks() {
    return [
      'Rewrite the discovery inputs—no phrase longer than three words should appear verbatim unless it is a branded term.',
      'Rotate openers (questions, commands, statements, story seeds) so hooks do not feel templated.',
      'Use Hormozi principles for structure, not for copy/pasting his example sentences.'
    ];
  }
  
  countWords(text) {
    return text.trim().split(/\s+/).length;
  }

  hasPassiveVoice(text) {
    const passivePatterns = /\b(is being|was being|are being|were being|has been|have been|had been|will be|being)\b/i;
    return passivePatterns.test(text);
  }

  hasCTAWords(text) {
    const ctaWords = /\b(book|call|click|schedule|consultation|consult|register|sign up|download|subscribe|buy now|order|purchase)\b/i;
    return ctaWords.test(text);
  }

  hasJargon(text) {
    const jargon = /\b(unlock|leverage|synergy|synergies|paradigm|disrupt|innovative solution|cutting-edge|next-level|game-changing)\b/i;
    return jargon.test(text);
  }

  hasWeaselWords(text) {
    const weasel = /\b(maybe|perhaps|possibly|could|might|somewhat|kind of|sort of)\b/i;
    return weasel.test(text);
  }

  validateHookQuality(hook) {
    const wordCount = this.countWords(hook.text);
    const issues = [];

    if (wordCount < 6) issues.push('too short (<6 words)');
    if (wordCount > 14) issues.push('too long (>14 words)');
    if (this.hasPassiveVoice(hook.text)) issues.push('passive voice detected');
    if (this.hasCTAWords(hook.text)) issues.push('contains CTA words');
    if (this.hasJargon(hook.text)) issues.push('contains jargon');
    if (this.hasWeaselWords(hook.text)) issues.push('contains weasel words');

    return {
      passed: issues.length === 0,
      issues,
      wordCount
    };
  }

  normalizeAwarenessLevel(level) {
    if (!level) {
      return 'Solution Aware';
    }

    const normalized = level.toString().toLowerCase().replace(/[^a-z]/g, '');
    const mapping = {
      most: 'Most Aware',
      product: 'Product Aware',
      solution: 'Solution Aware',
      problem: 'Problem Aware',
      unaware: 'Completely Unaware'
    };

    return mapping[normalized] || 'Solution Aware';
  }

  normalizeLabel(label, index) {
    if (label) {
      const normalized = label.toString().toLowerCase();
      if (normalized.includes('70')) return '70-core';
      if (normalized.includes('20')) return '20-adjacent';
      if (normalized.includes('10')) return '10-experimental';
    }

    if (index < 14) return '70-core';
    if (index < 19) return '20-adjacent';
    return '10-experimental';
  }

  buildHooksmithSystemPrompt() {
    return `ROLE: You are Hooksmith, a conversion-focused ad hook generator trained on Alex Hormozi's ad assembly approach.

TASK: Produce concise, grammatically correct hooks only (no bodies, no CTAs unless requested) that follow Hormozi's Hook Discipline: one clear promise/value, plain language, specific avatar call-out if provided.

QUALITY BAR:
– 6–14 words; active voice; one idea; no filler or stacked clauses.
– Choose exactly one style per hook: Statement / Question / Command / Conditional / Story seed.
– No jargon ("unlock synergies"), no vague verbs ("leverage"), no weasel words ("maybe," "could").
– No combined steps: hooks are separate from "meat" and CTA.
– When asked for multiple hooks, obey the 70-20-10 split (label hooks 70-core, 20-adjacent, 10-experimental).

FORMAT CONTRACT: Return JSON only with keys avatar, topic, hooks[], notes. Each hook entry must contain:
{
  "text": "6-14 word hook",
  "style": "Statement|Question|Command|Conditional|Story seed",
  "awareness_level": "Most|Product|Solution|Problem|Unaware",
  "label": "70-core|20-adjacent|10-experimental"
}

SELF-CHECK BEFORE RETURN:
– Reject any hook with grammar errors, passive mush ("is being"), or >14 words.
– Reject hooks that mix awareness levels or slip in CTA words (book, call, click, schedule, consultation).
– Reject hooks that use jargon or weasel words.
– Read hooks aloud; if they fail the "you'd say it on camera" test, rewrite.

FEW-SHOT EXAMPLES (tone, cadence, awareness labeling):
GOOD:
✓ "Luxury travelers: overwhelmed? Get a free 24-hour plan." (Problem, 70-core)
✓ "Why do our Disney families ride more in a day?" (Product, 70-core)
✓ "Skip lines, not magic—see our Crowd-Beater plan." (Solution, 70-core)
✓ "If trip-planning drains you, borrow our 7-day template." (Problem, 20-adjacent)
✓ "The tiny airport mistake that ruins day one." (Unaware, 10-experimental)

BAD → FIXED:
❌ "Luxury Travelers - Stop letting they are overwhelmed with the planning win the first impression so you can unlock dream vacation with free consult."
✅ "Luxury travelers: overwhelmed? Get a free 24-hour trip plan."

❌ "Families who love Disney will love our value propositions for value destinations."
✅ "Disney families: see more rides, spend less."

❌ "Cruise guys upgrade cabins forever without increase of fares."
✅ "Cruisers: better cabins, same fare."

Return valid JSON only. No markdown, no explanations.`;
  }

  async generateHooks(request) {
    console.log('🎣 Hooksmith generating hooks...');

    const hookStyles = ['Statement', 'Question', 'Command', 'Conditional', 'Story seed'];
    const awarenessLevels = ['Most', 'Product', 'Solution', 'Problem', 'Unaware'];

    const strategicPlan = await this.buildStrategicPlan(request);
    const planAngles = Array.isArray(strategicPlan.angles) ? strategicPlan.angles : [];
    const planAngleSection = planAngles.length
      ? planAngles
          .map((angle, index) => {
            const parts = [];
            parts.push(`Angle ${index + 1}: ${angle.name || 'Unnamed Angle'}`);
            if (angle.pain) parts.push(`Pain to spotlight: ${angle.pain}`);
            if (angle.desiredShift || angle.promise) parts.push(`Promise: ${angle.desiredShift || angle.promise}`);
            if (angle.proof) parts.push(`Proof / credibility move: ${angle.proof}`);
            if (angle.hookGuidance) parts.push(`Hook guidance: ${angle.hookGuidance}`);
            return parts.join('\n');
          })
          .join('\n\n')
      : 'No structured angles returned—fall back to pain/outcome pairing.';

    const planVoice = Array.isArray(strategicPlan.languageRules) && strategicPlan.languageRules.length
      ? strategicPlan.languageRules
      : ['Write for spoken delivery, confident and direct.', 'Keep copy concrete—no abstractions or consultant-speak.'];

    const planProofPoints = Array.isArray(strategicPlan.proofPoints) && strategicPlan.proofPoints.length
      ? strategicPlan.proofPoints
      : ['Reference existing wins, social proof, or tangible process steps.'];

    const planAvoid = Array.isArray(strategicPlan.forbiddenPhrases) && strategicPlan.forbiddenPhrases.length
      ? strategicPlan.forbiddenPhrases
      : ['Do not reuse discovery wording verbatim.', 'Avoid generic promises like "scale faster" or "unlock growth".'];

    const discoverySummary = this.buildDiscoverySummary(request);
    const angleDirectives = this.buildAngleDirectives(request);
    const hormoziReminders = this.buildHormoziReminders();
    const originalityChecks = this.buildOriginalityChecks();

    const provenExamples = HOOK_KNOWLEDGE.provenHookExamples.paid_ads.slice(0, 5);
    const channelList = Array.isArray(request.marketingChannels) && request.marketingChannels.length
      ? request.marketingChannels.join(', ')
      : 'Paid Ads';

    const userPrompt = `Avatar focus: ${request.targetAudience || 'Luxury travelers'}
Topic / offer: ${request.offering || request.desiredOutcome || 'Campaign hook'}
Channels in play: ${channelList}

---
Discovery intake (synthesize into fresh hooks):
${discoverySummary}

---
Strategic plan synthesized from discovery:
Avatar summary: ${strategicPlan.avatar || request.targetAudience}
Primary outcome to promise: ${strategicPlan.primaryOutcome || request.desiredOutcome || request.campaignGoal}
${planAngles.length ? 'Angle breakdown:' : ''}
${planAngleSection}

Voice + message rules:
- ${planVoice.join('\n- ')}

Proof points to weave in:
- ${planProofPoints.join('\n- ')}

Never say:
- ${planAvoid.join('\n- ')}

---
Angle directives (reinterpret, do not copy):
- ${angleDirectives.join('\n- ')}

---
Hormozi guardrails to honor:
- ${hormoziReminders.join('\n- ')}

Originality checks before returning:
- ${originalityChecks.join('\n- ')}

Style rotation required: ${hookStyles.join(', ')}
Awareness coverage required: ${awarenessLevels.join(', ')}

Deliverable:
- 21 hooks in JSON.
- Label each hook 70-core, 20-adjacent, or 10-experimental (70/20/10 split across the set).
- awareness_level must be one of Most/Product/Solution/Problem/Unaware.
- No CTAs, no markdown, no explanations.
- Hooks must read like net-new lines—never reuse the discovery wording verbatim.

Reference Hormozi tones without lifting sentences. Proven examples to mirror cadence only:
${provenExamples.map((example) => `- "${example}"`).join('\n')}`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-5-nano-2025-08-07',
        messages: [
          {
            role: 'system',
            content: this.buildHooksmithSystemPrompt()
          },
          {
            role: 'user',
            content: userPrompt
          }
        ],
        temperature: 0.4,
        top_p: 0.9,
        max_completion_tokens: 3000,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0].message.content.trim();
      const parsed = JSON.parse(content);
      const hooks = Array.isArray(parsed.hooks) ? parsed.hooks : [];

      console.log(`✅ Generated ${hooks.length} raw hooks`);
      if (parsed.avatar || parsed.topic) {
        console.log('🧾 Hooksmith context:', {
          avatar: parsed.avatar,
          topic: parsed.topic,
          notes: parsed.notes,
        });
      }

      // Quality gate: validate each hook
      const validatedHooks = [];
      const rejectedHooks = [];

      hooks.forEach((hook, index) => {
        const validation = this.validateHookQuality(hook);

        if (validation.passed) {
          const assignedAngle = planAngles.length ? planAngles[index % planAngles.length] : null;
          validatedHooks.push({
            text: hook.text.trim(),
            style: hook.style || 'Statement',
            awarenessLevel: this.normalizeAwarenessLevel(hook.awareness_level || hook.awarenessLevel || hook.awareness),
            label: this.normalizeLabel(hook.label, index),
            wordCount: validation.wordCount,
            angle: assignedAngle
          });
        } else {
          rejectedHooks.push({
            text: hook.text,
            issues: validation.issues
          });
          console.log(`⚠️  Rejected hook: "${hook.text}" (${validation.issues.join(', ')})`);
        }
      });

      console.log(`✅ ${validatedHooks.length} hooks passed quality gate`);
      console.log(`❌ ${rejectedHooks.length} hooks rejected`);

      // If we have too few hooks after validation, throw error
      if (validatedHooks.length < 10) {
        throw new Error(`Only ${validatedHooks.length} hooks passed quality gate. Need at least 10.`);
      }

      // Add IDs and format for frontend
      return validatedHooks.map((hook, index) => ({
        id: `hook-${index + 1}`,
        text: hook.text,
        type: hook.style,
        awareness: hook.awarenessLevel,
        label: hook.label,
        wordCount: hook.wordCount,
        angle: hook.angle?.name || null,
        rationale: this.generateRationale(hook, request, hook.angle),
        channelNote: this.generateChannelNote(hook, request.marketingChannels),
        supportingInsights: this.buildInsights(request, hook.angle, strategicPlan)
      }));

    } catch (error) {
      console.error('❌ Hook generation failed:', error);
      throw new Error(`Hook generation failed: ${error.message}`);
    }
  }

  generateRationale(hook, request, angle) {
    const levelDescriptions = {
      'Most Aware': 'Targets warm audience who knows your brand, just needs the offer',
      'Product Aware': 'For those familiar with solutions but unsure about yours',
      'Solution Aware': 'Speaks to people who know they want a solution',
      'Problem Aware': 'Agitates known pain points to create urgency',
      'Completely Unaware': 'Creates curiosity for those who don\'t yet know they need help'
    };
    const base = levelDescriptions[hook.awarenessLevel] || 'Strategically crafted for target audience';
    if (angle?.pain || angle?.desiredShift || angle?.promise) {
      const pain = angle.pain ? `Pain: ${angle.pain}` : null;
      const promise = angle.desiredShift || angle.promise ? `Promise: ${angle.desiredShift || angle.promise}` : null;
      return [base, pain, promise].filter(Boolean).join(' • ');
    }
    return base;
  }

  generateChannelNote(hook, channels) {
    if (!channels || !Array.isArray(channels)) {
      return 'Deploy as opening line across chosen channels';
    }
    if (channels.includes('Paid Ads')) {
      return 'First 3-5 words stop the scroll—front-loaded value';
    } else if (channels.includes('Email')) {
      return 'Use as subject line to earn the open';
    } else if (channels.includes('Organic Social')) {
      return 'Pattern interrupt for social feeds—shareable format';
    }
    return 'Deploy as opening line across chosen channels';
  }

  buildInsights(request, angle, plan) {
    const insights = [
      `Audience: ${request.targetAudience}`,
      `Offer: ${request.offering}`,
      `Outcome: ${request.desiredOutcome}`,
    ];

    if (request.painPoints && request.painPoints.length > 0) {
      insights.push(`Top pain: ${request.painPoints[0]}`);
    }

    if (request.campaignGoal) {
      insights.push(`Goal: ${request.campaignGoal}`);
    }

    insights.push(`Tone: ${request.tone}`);

    if (angle?.name) {
      insights.push(`Angle: ${angle.name}`);
    }

    if (plan?.proofPoints?.length) {
      insights.push(`Proof focus: ${plan.proofPoints[0]}`);
    }

    return [...new Set(insights)].slice(0, 6);
  }

  async generateWithValidation(request) {
    console.log('🚀 Hooksmith pipeline starting...');
    console.log('📋 Request:', {
      audience: request.targetAudience,
      offering: request.offering,
      pains: request.painPoints.length,
      channels: request.marketingChannels
    });

    const hooks = await this.generateHooks(request);

    // Count distribution
    const core = hooks.filter(h => h.label === '70-core').length;
    const adjacent = hooks.filter(h => h.label === '20-adjacent').length;
    const experimental = hooks.filter(h => h.label === '10-experimental').length;

    console.log('✨ Hooksmith pipeline complete!');
    console.log(`   Distribution: ${core} core, ${adjacent} adjacent, ${experimental} experimental`);
    console.log(`   Total: ${hooks.length} camera-ready hooks`);

    return {
      hooks,
      metadata: {
        generatedAt: new Date().toISOString(),
        quality: 'excellent',
        validationSummary: `Generated ${hooks.length} hooks following Hormozi Hook Discipline (6-14 words, active voice, one idea)`,
        distribution: {
          core,
          adjacent,
          experimental
        },
        audience: request.targetAudience,
        offering: request.offering,
        tone: request.tone,
        channels: request.marketingChannels
      }
    };
  }

  buildStrategistSystemPrompt() {
    return `ROLE: You are a marketing strategist named Briefsmith.

TASK: Convert raw discovery answers into a structured angle plan that a hook writer can execute without guessing. Capture the real pains, what relief looks like, and the proof or mechanism that makes the promise credible.

OUTPUT: Return JSON with keys avatar, primaryOutcome, angles[], languageRules[], proofPoints[], forbiddenPhrases[]. Each angle requires name, pain, desiredShift (or promise), proof, hookGuidance.

RULES:
– Stay faithful to the discovery inputs—no fabricating offers we were not told about.
– Keep language concrete and interview-style (no buzzwords).
– Prioritize what feels emotionally urgent and commercially valuable.
– Highlight contradictions or differentiators if provided.`;
  }

  buildStrategistUserPrompt(request) {
    const qaPairs = this.buildDiscoveryQA(request)
      .map((item) => `Q: ${item.question}\nA: ${item.answer}`)
      .join('\n\n');

    const pains = this.buildList(request.painPoints);

    return `Discovery interview transcript:
${qaPairs}

Key pain signals (deduplicated): ${pains.join(' | ') || 'None listed'}

Instruction: Create 3-5 differentiated angles that translate these pains into sharp hook territories. Each angle should map a pain to a specific promise and cite what gives the promise credibility.`;
  }

  async buildStrategicPlan(request) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-5-nano-2025-08-07',
        temperature: 0.2,
        max_completion_tokens: 1200,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: this.buildStrategistSystemPrompt() },
          { role: 'user', content: this.buildStrategistUserPrompt(request) }
        ]
      });

      const raw = response.choices?.[0]?.message?.content?.trim();
      if (!raw) throw new Error('Empty strategist response');

      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Strategic plan parse failure');
      }

      console.log('🧠 Strategic plan synthesized for hooks');
      return parsed;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn('⚠️  Strategic plan generation failed, using heuristic fallback:', message);
      const pains = this.buildList(request.painPoints).slice(0, 3);
      const fallbackAngles = pains.length
        ? pains.map((pain, index) => ({
            name: `Pain relief ${index + 1}`,
            pain,
            desiredShift: request.desiredOutcome || 'Get the promised outcome without the pain',
            proof: request.additionalNotes || 'Reference past client wins or proprietary process.',
            hookGuidance: 'Contrast the painful status quo with the relief the offer delivers.'
          }))
        : [
            {
              name: 'Outcome-first promise',
              pain: request.campaignGoal || 'Lack of momentum',
              desiredShift: request.desiredOutcome || 'Show the fastest path to the outcome',
              proof: request.additionalNotes || 'Lean on expertise, speed, or social proof',
              hookGuidance: 'Lead with the desired future state, then tease the mechanism.'
            }
          ];

      return {
        avatar: request.targetAudience,
        primaryOutcome: request.desiredOutcome || request.campaignGoal,
        angles: fallbackAngles,
        languageRules: ['Keep it sharp and conversational.', 'Speak like a strategist who has seen the problem 100 times.'],
        proofPoints: request.additionalNotes ? [request.additionalNotes] : [],
        forbiddenPhrases: []
      };
    }
  }
}

export default HookGenerationService;
