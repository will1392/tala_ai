import { embedOne } from '../llm/embeddings.js';
import { cosineSim } from '../util/cosine.js';

export async function dedupeAndScore(candidates, minDist = 0.18) {
  if (!Array.isArray(candidates) || candidates.length === 0) return [];

  const vectors = await Promise.all(
    candidates.map((text) =>
      embedOne(text).catch((error) => {
        console.warn('⚠️  Failed to embed hook candidate:', error.message);
        return [];
      })
    )
  );
  const keep = [];
  const keepVecs = [];

  for (let index = 0; index < candidates.length; index += 1) {
    const vector = vectors[index];
    if (!Array.isArray(vector)) continue;

    const isFarEnough = keepVecs.every((existing) => 1 - cosineSim(vector, existing) >= minDist);
    if (isFarEnough) {
      keep.push(candidates[index]);
      keepVecs.push(vector);
    }
  }

  return keep;
}
