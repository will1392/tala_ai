import fs from 'fs';
import path from 'path';
import { ingestHormoziCorpus } from '../rag/ingest.js';

function resolveDataDir() {
  const inServer = path.join(process.cwd(), 'data', 'hormozi');
  if (fs.existsSync(inServer)) return inServer;
  return path.join(process.cwd(), 'server', 'data', 'hormozi');
}

let cached = null;
let lastLoaded = 0;
const CACHE_TTL_MS = 1000 * 60 * 10;

export async function loadCorpus() {
  const now = Date.now();
  if (cached && now - lastLoaded < CACHE_TTL_MS) {
    return cached;
  }

  const storagePath = path.join(resolveDataDir(), 'corpus-cache.json');
  if (fs.existsSync(storagePath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(storagePath, 'utf8'));
      if (Array.isArray(raw) && raw.every((item) => Array.isArray(item.vec))) {
        cached = raw;
        lastLoaded = now;
        return cached;
      }
    } catch (error) {
      console.warn('⚠️  Failed to read cached hook corpus:', error.message);
    }
  }

  const ingested = await ingestHormoziCorpus().catch((error) => {
    console.warn('⚠️  Failed to ingest hook corpus:', error.message);
    return [];
  });
  if (ingested.length > 0) {
    try {
      fs.mkdirSync(path.dirname(storagePath), { recursive: true });
      fs.writeFileSync(storagePath, JSON.stringify(ingested));
    } catch (error) {
      console.warn('⚠️  Failed to cache hook corpus:', error.message);
    }
  }

  cached = ingested;
  lastLoaded = now;
  return cached;
}
