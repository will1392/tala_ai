import { HOOK_RULES, BAD_TO_FIXED } from './rules.js';

export function critic(raw) {
  if (!raw) return { ok: false, reason: 'empty' };
  const text = raw.trim();
  const words = text.split(/\s+/).filter(Boolean);

  if (words.length < HOOK_RULES.minWords || words.length > HOOK_RULES.maxWords) {
    return { ok: false, reason: 'length' };
  }

  const lower = text.toLowerCase();
  if (HOOK_RULES.banCTA.some((phrase) => lower.includes(phrase))) {
    return { ok: false, reason: 'cta' };
  }

  if (HOOK_RULES.banPhrases.some((phrase) => lower.includes(phrase))) {
    return { ok: false, reason: 'cliche' };
  }

  if (/,|;/.test(text) && /\sand\s/i.test(text)) {
    return { ok: false, reason: 'multi-idea' };
  }

  for (const { bad, fixed } of BAD_TO_FIXED) {
    const snippet = bad.toLowerCase().slice(0, Math.min(18, bad.length));
    if (lower.includes(snippet)) {
      return { ok: true, text: fixed, note: 'auto-fixed' };
    }
  }

  if (/\bis being\b|\bwas\b|\bwere\b/.test(lower)) {
    return { ok: false, reason: 'passive' };
  }

  return { ok: true, text };
}
