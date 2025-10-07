import OpenAI from 'openai';
import { HOOK_KNOWLEDGE } from '../data/hookKnowledge.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

class HookGenerationService {
  
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

    const provenExamples = HOOK_KNOWLEDGE.provenHookExamples.paid_ads.slice(0, 5);

    const angles = [
      ...request.painPoints,
      request.desiredOutcome,
      request.campaignGoal,
    ].filter(Boolean).join('; ');

    const userPrompt = `Avatar: ${request.targetAudience || 'Luxury travelers'}
Topic: ${request.offering || request.desiredOutcome || 'Campaign hook'}
Deliver: 21 hooks in JSON. Label 70/20/10. Do not include CTAs.
Angles to include: ${angles || 'stress-free planning; upgrades; line-skipping'}
Desired outcome: ${request.desiredOutcome || 'clear promise'}
Campaign goal: ${request.campaignGoal || 'drive conversions'}
Tone: ${request.tone || 'Bold and direct'}
Channels: ${request.marketingChannels.join(', ') || 'Paid Ads'}
${request.additionalNotes ? `Notes: ${request.additionalNotes}` : ''}

Ban: jargon, double ideas, >14 words, CTA words (book/call/click/schedule).
Hook styles to use: ${hookStyles.join(', ')}
Awareness levels to cover: ${awarenessLevels.join(', ')}

Proven examples to mimic (tone/length):
${provenExamples.map(ex => `– "${ex}"`).join('\n')}

Follow the JSON format contract exactly.`;

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
        temperature: 1.0,
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
          validatedHooks.push({
            text: hook.text.trim(),
            style: hook.style || 'Statement',
            awarenessLevel: this.normalizeAwarenessLevel(hook.awareness_level || hook.awarenessLevel || hook.awareness),
            label: this.normalizeLabel(hook.label, index),
            wordCount: validation.wordCount
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
        rationale: this.generateRationale(hook, request),
        channelNote: this.generateChannelNote(hook, request.marketingChannels),
        supportingInsights: this.buildInsights(request)
      }));

    } catch (error) {
      console.error('❌ Hook generation failed:', error);
      throw new Error(`Hook generation failed: ${error.message}`);
    }
  }

  generateRationale(hook, request) {
    const levelDescriptions = {
      'Most Aware': 'Targets warm audience who knows your brand, just needs the offer',
      'Product Aware': 'For those familiar with solutions but unsure about yours',
      'Solution Aware': 'Speaks to people who know they want a solution',
      'Problem Aware': 'Agitates known pain points to create urgency',
      'Completely Unaware': 'Creates curiosity for those who don\'t yet know they need help'
    };
    return levelDescriptions[hook.awarenessLevel] || 'Strategically crafted for target audience';
  }

  generateChannelNote(hook, channels) {
    if (channels.includes('Paid Ads')) {
      return 'First 3-5 words stop the scroll—front-loaded value';
    } else if (channels.includes('Email')) {
      return 'Use as subject line to earn the open';
    } else if (channels.includes('Organic Social')) {
      return 'Pattern interrupt for social feeds—shareable format';
    }
    return 'Deploy as opening line across chosen channels';
  }

  buildInsights(request) {
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

    return insights.slice(0, 6);
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
}

export default HookGenerationService;
