import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const DEFAULT_MODEL = process.env.OPENAI_HOOK_MODEL || 'gpt-5-nano-2025-08-07';

export async function chat({ system, user, temperature = 0.4, maxTokens = 200 }) {
  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  if (user) {
    if (Array.isArray(user)) {
      messages.push(...user);
    } else {
      messages.push({ role: 'user', content: user });
    }
  }

  const response = await client.chat.completions.create({
    model: DEFAULT_MODEL,
    messages,
    temperature,
    max_tokens: maxTokens
  });

  return response.choices?.[0]?.message?.content?.trim() || '';
}
