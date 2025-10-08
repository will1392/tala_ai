import { HOOK_RULES } from './rules.js';

export function makePlan(total = 30) {
  const counts = {
    core: Math.round(total * 0.7),
    adjacent: Math.round(total * 0.2),
    experimental: total - Math.round(total * 0.7) - Math.round(total * 0.2)
  };

  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  const mix = Array.from({ length: total }).map((_, index) => {
    const label =
      index < counts.core
        ? 'core'
        : index < counts.core + counts.adjacent
        ? 'adjacent'
        : 'experimental';

    return {
      label,
      awareness: pick([...HOOK_RULES.awareness]),
      style: pick([...HOOK_RULES.styles])
    };
  });

  return { total, mix };
}
