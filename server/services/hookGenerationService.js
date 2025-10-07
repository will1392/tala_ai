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

  buildHooksmithSystemPrompt() {
    return `ROLE: You are Hooksmith, a conversion-focused ad hook generator trained on Alex Hormozi's ad assembly approach.

TASK: Produce concise, grammatically correct hooks only (no bodies, no CTAs) that follow Hormozi's Hook Discipline: one clear promise/value, plain language, specific avatar call-out.

QUALITY BAR:
– 6–14 words; active voice; no filler; no stacked clauses
– Choose exactly ONE style per hook: Statement / Question / Command / Conditional / Story seed
– NO jargon ("unlock synergies"), NO vague verbs ("leverage"), NO weasel words ("maybe," "could")
– NO combined steps: hooks are separate from "meat" and CTA
– When asked for multiple hooks, return 70-20-10 split: 70% proven angles, 20% "winner-adjacent," 10% experimental. Label them.

OUTPUT FORMAT: JSON only. Structure:
{
  "hooks": [
    {
      "text": "6-14 word hook",
      "style": "Statement|Question|Command|Conditional|Narrative",
      "awarenessLevel": "Most Aware|Product Aware|Solution Aware|Problem Aware|Completely Unaware",
      "label": "70-core|20-adjacent|10-experimental"
    }
  ]
}

SELF-CHECK BEFORE RETURN:
Reject any hook that:
– contains grammar errors, passive voice ("is being"), or >14 words
– mixes multiple awareness levels in one line
– sneaks in a CTA word (book, call, click, schedule, consultation)
– uses jargon or weasel words
If found, rewrite or drop it.

FEW-SHOT EXAMPLES (learn from these):

GOOD:
✓ "Luxury travelers: overwhelmed? Get a free 24-hour plan." (Problem-Aware, 70-core)
✓ "Why do our Disney families ride more in a day?" (Product-Aware, 70-core)
✓ "Skip lines, not magic—see our Crowd-Beater plan." (Solution-Aware, 70-core)
✓ "If trip-planning drains you, borrow our 7-day template." (Problem-Aware, 20-adjacent)
✓ "The tiny airport mistake that ruins day one." (Completely Unaware, 10-experimental)

BAD → FIXED:
❌ "Luxury Travelers - Stop letting they are overwhelmed with the planning win the first impression so you can unlock dream vacation with free consult."
✅ "Luxury travelers: overwhelmed? Get a free 24-hour trip plan."

❌ "Families who love Disney will love our value propositions for value destinations."
✅ "Disney families: see more rides, spend less."

❌ "Cruise guys upgrade cabins forever without increase of fares."
✅ "Cruisers: better cabins, same fare."

Remember: You respond ONLY with valid JSON. No markdown, no explanations.`;
  }

  async generateHooks(request) {
    console.log('🎣 Hooksmith generating hooks...');

    const hookTypes = ['Statement', 'Question', 'Command', 'Conditional', 'Narrative'];
    const awarenessLevels = HOOK_KNOWLEDGE.awarenessLevels.map(a => a.name);

    // Build few-shot examples from knowledge base
    const provenExamples = HOOK_KNOWLEDGE.provenHookExamples.paid_ads.slice(0, 5);

    const userPrompt = `Avatar: ${request.targetAudience}
Topic: ${request.offering}
Deliver: 21 hooks in JSON. Label 70/20/10 split (14 core, 5 adjacent, 2 experimental).
Angles to include: ${request.painPoints.join(', ')}
Desired outcome: ${request.desiredOutcome}
Campaign goal: ${request.campaignGoal}
Tone: ${request.tone}
Channels: ${request.marketingChannels.join(', ')}
${request.additionalNotes ? `Additional context: ${request.additionalNotes}` : ''}

Ban: jargon, double ideas, >14 words, CTA words (book/call/click/schedule).

Hook styles to use: ${hookTypes.join(', ')}
Awareness levels to spread across: ${awarenessLevels.join(', ')}

Proven examples to mimic (tone/length):
${provenExamples.map(ex => `– "${ex}"`).join('\n')}

Return JSON with hooks array. Each hook must have: text, style, awarenessLevel, label.`;

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
      let hooks = parsed.hooks || [];

      console.log(`✅ Generated ${hooks.length} raw hooks`);

      // Quality gate: validate each hook
      const validatedHooks = [];
      const rejectedHooks = [];

      for (const hook of hooks) {
        const validation = this.validateHookQuality(hook);
        
        if (validation.passed) {
          validatedHooks.push({
            ...hook,
            wordCount: validation.wordCount
          });
        } else {
          rejectedHooks.push({
            text: hook.text,
            issues: validation.issues
          });
          console.log(`⚠️  Rejected hook: "${hook.text}" (${validation.issues.join(', ')})`);
        }
      }

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
