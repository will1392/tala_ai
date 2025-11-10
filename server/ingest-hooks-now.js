#!/usr/bin/env node

import { ingestHookKnowledge } from './scripts/ingest-hook-knowledge.js';

console.log('Starting hook knowledge ingestion...');

ingestHookKnowledge()
  .then(() => {
    console.log('✅ Ingestion complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Ingestion failed:', error);
    process.exit(1);
  });
