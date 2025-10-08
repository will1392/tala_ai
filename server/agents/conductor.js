import { makePlan } from './planner.js';
import { generateHook } from './generator.js';
import { critic } from './critic.js';
import { dedupeAndScore } from './scorer.js';
import { retrieveNotes } from '../rag/retrieve.js';
import { embedOne } from '../llm/embeddings.js';

export async function runHookAgent({ avatar, topic, total = 30, corpus }) {
  const plan = makePlan(total);
  const baseQuery = `${avatar} ${topic} hooks principles`;
  const baseVec = await embedOne(baseQuery).catch((error) => {
    console.warn('⚠️  Failed to embed hook query:', error.message);
    return [];
  });
  const angleNotes = retrieveNotes(baseVec, corpus, 3);

  const rawCandidates = [];

  for (const spec of plan.mix) {
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
    }
  }

  const reviewed = rawCandidates
    .map((candidate) => {
      const evaluation = critic(candidate.text);
      if (!evaluation.ok) return null;
      return {
        ...candidate,
        text: evaluation.text,
        note: evaluation.note
      };
    })
    .filter(Boolean);

  const uniqueTexts = await dedupeAndScore(reviewed.map((item) => item.text));
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

  return { avatar, topic, hooks };
}
