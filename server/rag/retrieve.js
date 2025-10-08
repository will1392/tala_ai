import { cosineSim } from '../util/cosine.js';

export function retrieveNotes(queryVec, corpus, k = 3) {
  if (!Array.isArray(queryVec) || queryVec.length === 0 || !Array.isArray(corpus)) {
    return '';
  }

  const scored = corpus
    .map((entry) => ({ entry, score: cosineSim(queryVec, entry.vec || []) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  const bullets = scored
    .map(({ entry }) => toAngleNotes(entry.text))
    .filter(Boolean);

  return bullets.join('\n- ');
}

function toAngleNotes(text) {
  if (!text) return '';
  const lines = text.split('\n');
  const filtered = lines
    .map((line) => line.trim())
    .filter((line) => {
      const lower = line.toLowerCase();
      return (
        lower.startsWith('- ') ||
        lower.includes('hook') ||
        lower.includes('70') ||
        lower.includes('statement') ||
        lower.includes('question') ||
        lower.includes('conditional')
      );
    })
    .slice(0, 8);

  return filtered.join('\n- ');
}
