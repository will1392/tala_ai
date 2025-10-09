import { makePlan } from './planner.js';
import { generateHook } from './generator.js';
import { critic } from './critic.js';
import { dedupeAndScore } from './scorer.js';
import { retrieveNotes } from '../rag/retrieve.js';
import { embedOne } from '../llm/embeddings.js';

export async function runHookAgent({ avatar, topic, total = 30, corpus }) {
  console.log('🎯 Hook Agent starting:', { avatar, topic, total });
  
  const plan = makePlan(total);
  const baseQuery = `${avatar} ${topic} hooks principles`;
  
  const baseVec = await embedOne(baseQuery).catch((error) => {
    console.warn('⚠️  Failed to embed hook query:', error.message);
    return [];
  });
  
  const angleNotes = retrieveNotes(baseVec, corpus, 3);
  console.log('📚 Retrieved angle notes:', angleNotes ? angleNotes.slice(0, 100) + '...' : 'none');

  const rawCandidates = [];
  let successCount = 0;
  let failCount = 0;

  for (const spec of plan.mix) {
    try {
      const result = await generateHook({
        avatar,
        topic,
        style: spec.style,
        awareness: spec.awareness,
        label: spec.label,
        angleNotes
      });

      if (result && result.text) {
        rawCandidates.push({
          text: result.text,
          style: result.style || spec.style,
          awareness: result.awareness || spec.awareness,
          label: spec.label,
          note: result.note || null
        });
        successCount++;
      } else {
        failCount++;
        console.warn('⚠️  Hook generation returned empty result for:', spec);
      }
    } catch (error) {
      failCount++;
      console.error('❌ Hook generation error:', error.message);
    }
  }

  console.log(`📊 Generation results: ${successCount} successful, ${failCount} failed`);

  if (rawCandidates.length === 0) {
    console.error('❌ No hooks generated at all!');
    return { avatar, topic, hooks: [] };
  }

  const reviewed = rawCandidates
    .map((candidate) => {
      const evaluation = critic(candidate.text);
      if (!evaluation.ok) {
        console.log(`🚫 Critic rejected: "${candidate.text}" (${evaluation.reason})`);
        return null;
      }
      return {
        ...candidate,
        text: evaluation.text,
        note: evaluation.note
      };
    })
    .filter(Boolean);

  console.log(`✅ ${reviewed.length}/${rawCandidates.length} hooks passed critic review`);

  const uniqueTexts = await dedupeAndScore(reviewed.map((item) => item.text));
  console.log(`🔍 ${uniqueTexts.length}/${reviewed.length} hooks after deduplication`);

  const hooks = uniqueTexts
    .map((text) => reviewed.find((candidate) => candidate.text === text))
    .filter(Boolean)
    .map((item, index) => ({
      id: `hook-${index + 1}`,
      text: item.text,
      style: item.style,
      awareness: item.awareness,
      label: item.label,
      note: item.note
    }));

  console.log(`🎉 Final hook count: ${hooks.length}`);
  return { avatar, topic, hooks };
}
