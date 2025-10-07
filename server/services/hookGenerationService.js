import OpenAI from 'openai';
import { HOOK_KNOWLEDGE } from '../../src/data/hookKnowledge.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

class HookGenerationService {
  async normalizePainPoints(painPoints, targetAudience, offering) {
    const painList = painPoints.filter(p => p && p.trim()).join('\n- ');
    
    const prompt = `You are an expert marketing strategist analyzing customer pain points. Convert messy pain point descriptions into clean, concise noun phrases suitable for marketing hooks.

TARGET AUDIENCE: ${targetAudience}
OFFERING: ${offering}

RAW PAIN POINTS:
- ${painList}

TASK: For each pain point, extract the core problem and convert it to a clean marketing phrase.

RULES:
1. Remove pronouns ("they", "their", "you", etc.)
2. Convert to noun phrases or gerunds ("lack of time", "planning overwhelm", "missed opportunities")
3. Keep it punchy (2-5 words ideal)
4. Focus on the emotional/practical blocker
5. Make it universal to the audience

OUTPUT FORMAT (JSON array of strings):
["pain phrase 1", "pain phrase 2", "pain phrase 3"]

Example conversions:
- "they do not have time to plan their trips" → "planning time constraints"
- "customers are frustrated with slow response" → "slow response frustration"
- "fear of making the wrong decision" → "decision paralysis"

Return ONLY the JSON array, no additional text.`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a marketing expert who converts messy pain point descriptions into clean, concise marketing phrases. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      const content = response.choices[0].message.content.trim();
      const normalized = JSON.parse(content);
      
      console.log('✅ Normalized pain points:', {
        original: painPoints,
        normalized
      });
      
      return normalized;
    } catch (error) {
      console.error('❌ Pain normalization failed:', error);
      return painPoints.map(p => p.trim()).filter(Boolean);
    }
  }

  buildKnowledgeContext() {
    const principles = HOOK_KNOWLEDGE.principles.map(p => 
      `${p.title}: ${p.description}`
    ).join('\n\n');

    const categories = HOOK_KNOWLEDGE.categories.map(c =>
      `${c.name}:\n${c.description}\nGuidance: ${c.guidance.join(' ')}\nExample: "${c.example}"`
    ).join('\n\n');

    const awareness = HOOK_KNOWLEDGE.awareness.map(a =>
      `${a.name}: ${a.focus}\nTemplate: "${a.exampleTemplate}"`
    ).join('\n\n');

    return `# HOOK GENERATION KNOWLEDGE BASE

## Core Principles
${principles}

## Hook Categories
${categories}

## Awareness Stages
${awareness}

## Critical Reminder
${HOOK_KNOWLEDGE.reminder}`;
  }

  async generateHooks(request) {
    console.log('🎣 Generating hooks with AI agent...');
    
    const normalizedPains = await this.normalizePainPoints(
      request.painPoints,
      request.targetAudience,
      request.offering
    );

    const knowledgeBase = this.buildKnowledgeContext();
    const toneGuidance = this.getToneGuidance(request.tone);
    const channelGuidance = this.getChannelGuidance(request.marketingChannels);

    const prompt = `You are an expert copywriter trained on the "Hooks That Get Clicks" methodology. Generate 20 unique, high-performing hooks for a marketing campaign.

# CAMPAIGN BRIEF

TARGET AUDIENCE: ${request.targetAudience}
OFFERING: ${request.offering}
PAIN POINTS: ${normalizedPains.join(', ')}
DESIRED OUTCOME: ${request.desiredOutcome}
CAMPAIGN GOAL: ${request.campaignGoal}
TONE: ${request.tone} (${toneGuidance})
MARKETING CHANNELS: ${request.marketingChannels.join(', ')}
${request.additionalNotes ? `ADDITIONAL CONTEXT: ${request.additionalNotes}` : ''}

# CHANNEL GUIDANCE
${channelGuidance}

${knowledgeBase}

# TASK

Generate 20 unique hooks following these rules:

1. VARIETY: Mix hook types (Questions, Bold Statements, Conditionals, Commands, Story Teasers, Lists, Labels, Contrasts)
2. AWARENESS: Spread across awareness stages (Completely Unaware, Problem Aware, Solution Aware, Product Aware, Most Aware)
3. GRAMMAR: Ensure perfect grammar and natural flow
4. AUDIENCE: Always lead with or immediately reference the target audience
5. PAIN → OUTCOME: Connect pain points to desired outcomes clearly
6. TONE: Match the ${request.tone} voice consistently
7. CHANNEL FIT: Make hooks deployable on ${request.marketingChannels.join(', ')}

OUTPUT FORMAT (JSON array of objects):
[
  {
    "text": "The hook copy itself",
    "type": "Hook category (e.g., Question, Bold Statement)",
    "awareness": "Awareness stage (e.g., Problem Aware)",
    "rationale": "Why this hook works for this audience and campaign",
    "channelNote": "How to deploy this specifically on the chosen channels"
  }
]

Return ONLY valid JSON. No markdown, no explanations, just the JSON array of 20 hooks.`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a world-class copywriting expert specializing in attention-grabbing hooks. You follow the "Hooks That Get Clicks" methodology precisely and always generate grammatically perfect, strategically sound hooks. You respond only with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      });

      const content = response.choices[0].message.content.trim();
      let hooks = JSON.parse(content);
      
      console.log('✅ Generated', hooks.length, 'hooks');
      
      hooks = hooks.map((hook, index) => ({
        id: `hook-${index + 1}`,
        text: hook.text,
        type: hook.type,
        awareness: hook.awareness,
        rationale: hook.rationale,
        channelNote: hook.channelNote,
        supportingInsights: this.buildInsights(request, normalizedPains)
      }));

      return hooks;
    } catch (error) {
      console.error('❌ Hook generation failed:', error);
      throw new Error(`Hook generation failed: ${error.message}`);
    }
  }

  async validateHooks(hooks, request) {
    console.log('🔍 Validating generated hooks...');
    
    const hooksPreview = hooks.slice(0, 5).map((h, i) => 
      `${i + 1}. [${h.type}] "${h.text}"`
    ).join('\n');

    const prompt = `You are a quality control expert reviewing marketing hooks. Check if these hooks are grammatically correct, strategically sound, and ready to deploy.

CAMPAIGN BRIEF:
- Audience: ${request.targetAudience}
- Offering: ${request.offering}
- Desired Outcome: ${request.desiredOutcome}
- Tone: ${request.tone}

SAMPLE HOOKS (reviewing ${hooks.length} total):
${hooksPreview}

VALIDATION CRITERIA:
1. Grammar: Perfect sentence structure, no pronoun issues
2. Clarity: Hooks make sense and are immediately understandable
3. Audience fit: Speaks directly to ${request.targetAudience}
4. Value: Connects pain to desired outcome clearly
5. Tone: Matches ${request.tone} voice

TASK: Review ALL ${hooks.length} hooks and identify any that fail validation.

OUTPUT FORMAT (JSON object):
{
  "isValid": true/false,
  "failedHooks": [
    {
      "hookIndex": 0,
      "originalText": "the bad hook",
      "issue": "what's wrong",
      "correctedText": "fixed version"
    }
  ],
  "overallQuality": "excellent/good/needs-improvement",
  "summary": "brief assessment"
}

If all hooks pass, return:
{
  "isValid": true,
  "failedHooks": [],
  "overallQuality": "excellent",
  "summary": "All hooks are grammatically correct and strategically sound."
}

Return ONLY valid JSON.`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a meticulous QA expert who catches grammar issues, unclear messaging, and strategic misalignments in marketing copy. You respond only with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 2000
      });

      const validation = JSON.parse(response.choices[0].message.content.trim());
      
      console.log('✅ Validation complete:', validation.summary);
      
      if (!validation.isValid && validation.failedHooks.length > 0) {
        console.log(`⚠️  Found ${validation.failedHooks.length} hooks that need correction`);
        
        validation.failedHooks.forEach(failed => {
          if (failed.hookIndex < hooks.length && failed.correctedText) {
            console.log(`   Fixing hook ${failed.hookIndex + 1}: ${failed.issue}`);
            hooks[failed.hookIndex].text = failed.correctedText;
          }
        });
      }

      return {
        hooks,
        validation: {
          quality: validation.overallQuality,
          summary: validation.summary
        }
      };
    } catch (error) {
      console.error('❌ Validation failed:', error);
      return {
        hooks,
        validation: {
          quality: 'unknown',
          summary: 'Validation check failed, but hooks were generated successfully.'
        }
      };
    }
  }

  buildInsights(request, normalizedPains) {
    const insights = [
      `Audience: ${request.targetAudience}`,
      `Offer: ${request.offering}`,
      `Outcome: ${request.desiredOutcome}`,
      `Top pain: ${normalizedPains[0] || 'unspecified'}`,
    ];

    if (normalizedPains.length > 1) {
      insights.push(`Also: ${normalizedPains.slice(1, 3).join(', ')}`);
    }

    if (request.campaignGoal) {
      insights.push(`Goal: ${request.campaignGoal}`);
    }

    insights.push(`Tone: ${request.tone}`);

    return insights.slice(0, 7);
  }

  getToneGuidance(tone) {
    const toneMap = {
      'Bold and direct': 'Use strong, decisive language. No hedging. Action-oriented verbs.',
      'Conversational and empathetic': 'Warm, relatable language. Show understanding. Use "we" and "you".',
      'High-energy hype': 'Enthusiastic, exciting language. Amp up emotion. Create urgency.',
      'Calm authority': 'Measured, confident language. Expert positioning. Reassuring tone.',
      'Data-driven confidence': 'Evidence-based language. Include numbers/metrics. Logical appeal.'
    };
    return toneMap[tone] || 'Clear, professional language.';
  }

  getChannelGuidance(channels) {
    const channelMap = {
      'Paid Ads': 'First 3-5 words must stop the scroll. Front-load value.',
      'Organic Social': 'Pattern interrupt in first line. Make it shareable.',
      'Email': 'Subject line must earn the open. Preview text should tease value.',
      'Webinar': 'Promise a clear transformation. Create curiosity gap.',
      'Landing Page': 'Bold headline + specific subhead. Hero section power.',
      'Direct Mail': 'Large, bold headline. Tangible, visual language.',
      'Sales Call': 'Permission-based opener. Qualify and intrigue fast.'
    };

    return channels.map(c => `- ${c}: ${channelMap[c] || 'Clear value proposition'}`).join('\n');
  }

  async generateWithValidation(request) {
    console.log('🚀 Starting AI-powered hook generation pipeline...');
    console.log('📋 Request:', {
      audience: request.targetAudience,
      offering: request.offering,
      pains: request.painPoints.length,
      channels: request.marketingChannels
    });

    const hooks = await this.generateHooks(request);
    
    const { hooks: validatedHooks, validation } = await this.validateHooks(hooks, request);

    console.log('✨ Pipeline complete!');
    console.log(`   Quality: ${validation.quality}`);
    console.log(`   ${validation.summary}`);

    return {
      hooks: validatedHooks,
      metadata: {
        generatedAt: new Date().toISOString(),
        quality: validation.quality,
        validationSummary: validation.summary,
        audience: request.targetAudience,
        offering: request.offering,
        tone: request.tone,
        channels: request.marketingChannels
      }
    };
  }
}

export default HookGenerationService;
