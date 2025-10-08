import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';

export async function embedOne(text) {
  if (!text) return [];
  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text
  });
  return response.data?.[0]?.embedding || [];
}

export async function embedMany(texts) {
  if (!Array.isArray(texts) || texts.length === 0) return [];
  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts
  });
  return response.data.map((item) => item.embedding || []);
}
