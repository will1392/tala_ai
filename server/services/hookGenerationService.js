import { runHookAgent } from '../agents/conductor.js';
import { HOOK_RULES } from '../agents/rules.js';
import { loadCorpus } from '../vectorstore/load.js';
import { QdrantClient } from '@qdrant/qdrant-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

function awarenessLabel(level) {
  const mapping = {
    Most: 'Most Aware',
    Product: 'Product Aware',
    Solution: 'Solution Aware',
    Problem: 'Problem Aware',
    Unaware: 'Completely Unaware'
  };
  return mapping[level] || 'Solution Aware';
}

function awarenessRationale(level) {
  const mapping = {
    Most: 'Targets warm audience already sold on you',
    Product: 'Clarifies why your offer wins the comparison',
    Solution: 'Shows the path to the promised outcome',
    Problem: 'Agitates the pain so relief feels urgent',
    Unaware: 'Sparks curiosity for people not yet shopping'
  };
  return mapping[level] || mapping.Solution;
}

function labelTag(label) {
  if (label === 'core') return '70-core';
  if (label === 'adjacent') return '20-adjacent';
  if (label === 'experimental') return '10-experimental';
  return label || '70-core';
}

function countWords(text) {
  return text.trim().split(/\s+/).length;
}

function buildChannelNote(channels = []) {
  if (!Array.isArray(channels) || channels.length === 0) {
    return 'Deploy as the opening line across channels';
  }
  if (channels.includes('Paid Ads')) return 'Front-load value to stop the scroll in paid placements';
  if (channels.includes('Email')) return 'Use as subject line or lead sentence to win the open';
  if (channels.includes('Organic Social')) return 'Pattern interrupt for feeds—pair with visual emphasis';
  return 'Deploy as the opening line across channels';
}

function buildSupportingInsights(request, hook) {
  const values = new Set();
  if (request.targetAudience) values.add(`Audience: ${request.targetAudience}`);
  if (request.offering) values.add(`Offer: ${request.offering}`);
  if (request.desiredOutcome) values.add(`Outcome: ${request.desiredOutcome}`);
  if (Array.isArray(request.painPoints) && request.painPoints[0]) {
    values.add(`Pain: ${request.painPoints[0]}`);
  }
  if (request.campaignGoal) values.add(`Goal: ${request.campaignGoal}`);
  if (hook && hook.awareness) values.add(`Awareness: ${awarenessLabel(hook.awareness)}`);
  return Array.from(values).slice(0, 6);
}

export default class HookGenerationService {
  constructor() {
    this.corpusPromise = null;
    this.qdrant = new QdrantClient({
      url: process.env.QDRANT_URL,
      apiKey: process.env.QDRANT_API_KEY
    });
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async getCorpus() {
    if (!this.corpusPromise) {
      this.corpusPromise = loadCorpus().catch((error) => {
        console.warn('⚠️  Failed to load hook corpus:', error.message);
        return [];
      });
    }
    return this.corpusPromise;
  }

  /**
   * Retrieve relevant proven hooks from Qdrant knowledge base
   * @param {Object} request - HookRequest with destination, audience, etc.
   * @returns {Promise<string>} - Formatted string of 20 relevant hook examples
   */
  async retrieveProvenHooks(request) {
    try {
      // Build semantic search query from request context
      const queryParts = [
        request.destination || '',
        request.travelType || '',
        request.targetAudience || '',
        request.offering || '',
        request.desiredOutcome || '',
        request.campaignGoal || ''
      ].filter(Boolean);

      // Add pain points if available
      if (Array.isArray(request.painPoints) && request.painPoints.length > 0) {
        queryParts.push(...request.painPoints.slice(0, 2));
      }

      const searchQuery = queryParts.join(' ');
      
      if (!searchQuery.trim()) {
        console.warn('⚠️  No search context for hook retrieval');
        return '';
      }

      console.log('🔍 Searching hook knowledge base with:', searchQuery.slice(0, 100));

      // Generate embedding for semantic search
      const embedding = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: searchQuery
      });

      // Query Qdrant for relevant hooks
      const results = await this.qdrant.search('kb_hook_generator', {
        vector: embedding.data[0].embedding,
        limit: 20,
        score_threshold: 0.25,
        with_payload: true
      });

      if (!results || results.length === 0) {
        console.warn('⚠️  No hooks retrieved from knowledge base');
        return '';
      }

      console.log(`✅ Retrieved ${results.length} relevant hooks from knowledge base`);

      // Format the hooks for the prompt
      const hookExamples = results
        .map((result, index) => {
          const content = result.payload?.content || '';
          const metadata = result.payload?.metadata || {};
          const score = result.score ? ` (relevance: ${(result.score * 100).toFixed(0)}%)` : '';
          
          // Extract awareness level and hook style from metadata if available
          const awareness = metadata.awareness_level ? ` [${metadata.awareness_level}]` : '';
          const style = metadata.hook_style ? ` {${metadata.hook_style}}` : '';
          
          return `${index + 1}. ${content}${awareness}${style}${score}`;
        })
        .join('\n\n');

      return hookExamples;
    } catch (error) {
      console.error('❌ Failed to retrieve hooks from Qdrant:', error.message);
      return '';
    }
  }

  buildTopic(request) {
    const pieces = [request.offering, request.desiredOutcome, request.campaignGoal]
      .filter((value) => value && value.trim())
      .map((value) => value.trim());
    if (pieces.length === 0 && Array.isArray(request.painPoints)) {
      pieces.push(...request.painPoints.slice(0, 2));
    }
    return pieces.join(' | ') || 'Campaign hook';
  }

  buildAvatar(request) {
    return request.targetAudience || 'Luxury travelers';
  }

  requestedTotal(request) {
    if (typeof request.total === 'number') return request.total;
    if (typeof request.hookCount === 'number') return request.hookCount;
    if (Array.isArray(request.desiredHooks)) return request.desiredHooks.length;
    return 30;
  }

  async generateHooks(request) {
    const corpus = await this.getCorpus();
    const avatar = this.buildAvatar(request);
    const topic = this.buildTopic(request);
    const total = this.requestedTotal(request);

    // Retrieve proven hooks from Qdrant knowledge base
    const provenHooks = await this.retrieveProvenHooks(request);

    const result = await runHookAgent({
      avatar,
      topic,
      total,
      corpus,
      provenHooks
    });

    const hooks = Array.isArray(result.hooks) ? result.hooks : [];

    return hooks.map((hook, index) => {
      const awareness = hook.awareness || 'Solution';
      return {
        id: hook.id || `hook-${index + 1}`,
        text: hook.text,
        type: hook.style,
        awareness: awarenessLabel(awareness),
        label: labelTag(hook.label),
        wordCount: countWords(hook.text),
        note: hook.note || null,
        rationale: awarenessRationale(awareness),
        channelNote: buildChannelNote(request.marketingChannels),
        supportingInsights: buildSupportingInsights(request, hook)
      };
    });
  }

  async generateWithValidation(request) {
    console.log('🚀 Reinvented hook generator starting...');
    console.log('📋 Request summary:', {
      audience: request.targetAudience,
      offering: request.offering,
      pains: Array.isArray(request.painPoints) ? request.painPoints.length : 0
    });

    const hooks = await this.generateHooks(request);
    const distribution = {
      core: hooks.filter((hook) => hook.label === '70-core').length,
      adjacent: hooks.filter((hook) => hook.label === '20-adjacent').length,
      experimental: hooks.filter((hook) => hook.label === '10-experimental').length
    };

    console.log(`✅ Reinvented generator produced ${hooks.length} hooks`);
    console.log('📊 Distribution:', distribution);

    return {
      hooks,
      metadata: {
        generatedAt: new Date().toISOString(),
        qualityRules: {
          minWords: HOOK_RULES.minWords,
          maxWords: HOOK_RULES.maxWords,
          bannedCTA: HOOK_RULES.banCTA,
          bannedPhrases: HOOK_RULES.banPhrases
        },
        distribution,
        audience: this.buildAvatar(request),
        topic: this.buildTopic(request)
      }
    };
  }
}
