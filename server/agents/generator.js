import { chat } from '../llm/chat.js';

function temperatureForLabel(label) {
  if (label === 'experimental') return 0.6;
  if (label === 'adjacent') return 0.4;
  return 0.25;
}

export async function generateHook({
  avatar,
  topic,
  style,
  awareness,
  label,
  angleNotes
}) {
  const system = [
    'You are Hooksmith, a conversion-focused hook writer.',
    'Write ONE hook only. 6–14 words. Active voice. One idea. No CTA.',
    `Pick the ${style} shape and target ${awareness} awareness.`,
    'Avoid banned words & clichés. Sound natural spoken aloud.',
    `Use simple, specific language relevant to: ${avatar} / ${topic}.`
  ].join('\n');

  const user = [
    `Avatar: ${avatar}`,
    `Topic: ${topic}`,
    'Angles/primitives:',
    angleNotes ? `- ${angleNotes}` : '- (no additional notes)',
    `Return JSON: {"text":"","style":"${style}","awareness":"${awareness}","label":"${label}"}`
  ].join('\n');

  const response = await chat({
    system,
    user,
    temperature: temperatureForLabel(label),
    maxTokens: 120
  }).catch((error) => {
    console.warn('⚠️  Hooksmith chat call failed:', error.message);
    return '';
  });

  return safeJSON(response);
}

function safeJSON(raw) {
  if (!raw) return null;
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch (error) {
    console.warn('⚠️  Failed to parse hook JSON:', error.message);
    return null;
  }
}
