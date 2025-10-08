import fs from 'fs';
import path from 'path';
import { embedMany } from '../llm/embeddings.js';

function resolveDataDir() {
  const inServer = path.join(process.cwd(), 'data', 'hormozi');
  if (fs.existsSync(inServer)) return inServer;
  return path.join(process.cwd(), 'server', 'data', 'hormozi');
}

export async function ingestHormoziCorpus() {
  const dir = resolveDataDir();
  if (!fs.existsSync(dir)) {
    return [];
  }

  const files = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.txt'))
    .sort();

  const docs = files.flatMap((file) => {
    const text = fs.readFileSync(path.join(dir, file), 'utf8');
    return chunk(text, 1500, 200).map((section, index) => ({
      id: `${file}-${index}`,
      text: section,
      meta: { file }
    }));
  });

  if (docs.length === 0) return [];

  const vectors = await embedMany(docs.map((doc) => doc.text));
  return docs.map((doc, index) => ({ ...doc, vec: vectors[index] }));
}

function chunk(text, size, overlap) {
  if (!text) return [];
  const clean = text.replace(/\r/g, '');
  const parts = [];
  for (let index = 0; index < clean.length; index += size - overlap) {
    const slice = clean.slice(index, index + size);
    if (slice.trim()) {
      parts.push(slice);
    }
    if (index + size >= clean.length) break;
  }
  return parts;
}
