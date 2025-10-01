const DEFAULT_CACHE_QUERIES = [
  'marketing strategy',
  'customer persona',
  'email campaign',
  'travel requirements',
  'product launch checklist'
];

const DEFAULT_HNSW_PRESETS = [
  {
    maxPoints: 1000,
    config: {
      m: 16,
      ef_construct: 200,
      full_scan_threshold: 100
    }
  },
  {
    maxPoints: 10000,
    config: {
      m: 32,
      ef_construct: 300,
      full_scan_threshold: 500
    }
  },
  {
    maxPoints: Infinity,
    config: {
      m: 48,
      ef_construct: 400,
      full_scan_threshold: 1000,
      max_indexing_threads: 8
    }
  }
];

const DEFAULT_PAYLOAD_INDEXES = [
  { field_name: 'documentId', field_schema: 'keyword' },
  { field_name: 'metadata.category', field_schema: 'keyword' },
  { field_name: 'metadata.destination', field_schema: 'keyword' },
  { field_name: 'metadata.tags', field_schema: 'keyword' },
  { field_name: 'metadata.folderId', field_schema: 'keyword' },
  { field_name: 'metadata.primaryFolderId', field_schema: 'keyword' },
  { field_name: 'metadata.language', field_schema: 'keyword' },
  { field_name: 'metadata.chunkIndex', field_schema: 'integer' },
  { field_name: 'document.userId', field_schema: 'keyword' },
  { field_name: 'document.organizationId', field_schema: 'keyword' }
];

const DEFAULT_CACHE_WARM_LIMIT = 25;

function pickCollectionResult(response) {
  if (!response) return null;
  return response.result ?? response;
}

class QdrantOptimizer {
  constructor(qdrantClient, options = {}) {
    if (!qdrantClient) {
      throw new Error('Qdrant client instance is required to create QdrantOptimizer');
    }

    this.qdrant = qdrantClient;
    this.logger = options.logger || console;
    this.enabled = options.enabled ?? true;
    this.scoreThreshold = options.scoreThreshold ?? 0.4;
    this.cacheWarmLimit = options.cacheWarmLimit || DEFAULT_CACHE_WARM_LIMIT;
    this.embeddingProvider = options.embeddingProvider || null;
    this.payloadIndexes = options.payloadIndexes || DEFAULT_PAYLOAD_INDEXES;
    this.cacheQueries = options.cacheQueries || DEFAULT_CACHE_QUERIES;
    this.hnswPresets = options.hnswConfigs || DEFAULT_HNSW_PRESETS;
    this.statusCache = new Map();
  }

  async optimizeCollection(collectionName, options = {}) {
    const summary = {
      collection: collectionName,
      success: false,
      hnswConfig: null,
      indexesCreated: [],
      indexesSkipped: [],
      cacheWarmed: 0,
      durationMs: 0,
      pointsCount: 0,
      segmentsCount: 0,
      error: null
    };

    const start = Date.now();

    if (!this.enabled) {
      summary.error = 'Optimizer disabled';
      return summary;
    }

    if (!collectionName) {
      summary.error = 'Collection name is required';
      return summary;
    }

    try {
      const info = await this.getCollectionInfo(collectionName);
      if (!info.exists) {
        summary.error = 'Collection does not exist';
        this.log('warn', `⚠️  Qdrant collection not found: ${collectionName}`);
        return summary;
      }

      summary.pointsCount = info.pointsCount;
      summary.segmentsCount = info.segmentsCount;

      const hnswConfig = this.resolveHnswConfig(info.pointsCount);
      if (hnswConfig) {
        const configPayload = { ...hnswConfig };
        try {
          await this.qdrant.updateCollection(collectionName, { hnsw_config: configPayload });
          summary.hnswConfig = configPayload;
          this.log(
            'log',
            `🧠 Applied HNSW config to ${collectionName}: ${JSON.stringify(configPayload)}`
          );
        } catch (error) {
          this.log('warn', `⚠️  Failed to update HNSW config for ${collectionName}: ${error.message}`);
        }
      }

      const indexResult = await this.ensurePayloadIndexes(collectionName, info.payloadSchema);
      summary.indexesCreated = indexResult.created;
      summary.indexesSkipped = indexResult.skipped;

      const cacheWarmLimit = options.cacheWarmLimit || this.cacheWarmLimit;
      summary.cacheWarmed = await this.warmSearchCache(collectionName, cacheWarmLimit);

      summary.durationMs = Date.now() - start;
      summary.success = true;
      summary.optimizedAt = new Date().toISOString();
      this.statusCache.set(collectionName, summary);

      return summary;
    } catch (error) {
      summary.durationMs = Date.now() - start;
      summary.error = error?.message || 'Unknown error';
      this.log('error', `⚠️  Qdrant optimization error for ${collectionName}: ${summary.error}`);
      return summary;
    }
  }

  async getOptimizationStatus(collectionName) {
    const cached = this.statusCache.get(collectionName) || null;
    const info = await this.getCollectionInfo(collectionName);

    if (!info.exists) {
      return {
        collection: collectionName,
        optimized: false,
        error: 'Collection not found'
      };
    }

    const hnswConfig =
      cached?.hnswConfig ||
      info.config?.params?.hnsw_config ||
      info.config?.hnsw_config ||
      null;

    return {
      collection: collectionName,
      optimized: Boolean(cached?.success),
      lastRunAt: cached?.optimizedAt || null,
      pointsCount: info.pointsCount,
      segmentsCount: info.segmentsCount,
      hnswConfig,
      availableIndexes: Object.keys(info.payloadSchema || {}),
      cacheWarmed: cached?.cacheWarmed || 0,
      status: info.status || null
    };
  }

  async ensurePayloadIndexes(collectionName, payloadSchema = {}) {
    const created = [];
    const skipped = [];
    const existingIndexes = new Set(Object.keys(payloadSchema || {}));

    for (const index of this.payloadIndexes) {
      const fieldName = index.field_name;

      if (existingIndexes.has(fieldName)) {
        skipped.push(fieldName);
        continue;
      }

      try {
        await this.qdrant.createPayloadIndex(collectionName, index);
        created.push(fieldName);
        existingIndexes.add(fieldName);
        this.log('log', `📇 Created payload index on ${collectionName}:${fieldName}`);
      } catch (error) {
        if (error?.status === 409 || /already exists/i.test(error?.message || '')) {
          skipped.push(fieldName);
          existingIndexes.add(fieldName);
          continue;
        }

        this.log('warn', `⚠️  Failed to create payload index ${fieldName}: ${error.message}`);
      }
    }

    return { created, skipped };
  }

  async warmSearchCache(collectionName, cacheWarmLimit = DEFAULT_CACHE_WARM_LIMIT) {
    let warmed = 0;

    if (this.embeddingProvider && this.cacheQueries.length > 0) {
      for (const query of this.cacheQueries) {
        try {
          const vector = await this.embeddingProvider(query);
          if (!vector) continue;

          const results = await this.qdrant.search(collectionName, {
            vector,
            limit: 5,
            with_payload: false,
            with_vector: false,
            score_threshold: this.scoreThreshold
          });

          warmed += Array.isArray(results) ? results.length : 0;
        } catch (error) {
          this.log('warn', `⚠️  Cache warm query failed for "${query}": ${error.message}`);
        }
      }

      if (warmed > 0) {
        this.log('log', `🔥 Warmed Qdrant cache for ${collectionName} using ${this.cacheQueries.length} queries`);
        return warmed;
      }
    }

    try {
      const scrollResult = await this.qdrant.scroll(collectionName, {
        limit: cacheWarmLimit,
        with_payload: false,
        with_vector: false
      });

      warmed = Array.isArray(scrollResult?.points) ? scrollResult.points.length : 0;
      this.log('log', `🔥 Warmed Qdrant cache for ${collectionName} by scrolling ${warmed} points`);
      return warmed;
    } catch (error) {
      this.log('warn', `⚠️  Failed to warm cache for ${collectionName}: ${error.message}`);
      return 0;
    }
  }

  resolveHnswConfig(pointsCount) {
    if (typeof pointsCount !== 'number') {
      return this.hnswPresets[0]?.config || null;
    }

    const preset = this.hnswPresets.find(({ maxPoints }) => pointsCount <= maxPoints);
    return preset ? { ...preset.config } : null;
  }

  async getCollectionInfo(collectionName) {
    try {
      const response = await this.qdrant.getCollection(collectionName);
      const result = pickCollectionResult(response);

      if (!result) {
        return { exists: false, error: 'No collection info available' };
      }

      return {
        exists: true,
        status: result.status ?? response?.status ?? null,
        pointsCount: result.points_count ?? result.pointsCount ?? 0,
        segmentsCount: result.segments_count ?? result.segmentsCount ?? 0,
        vectorsCount: result.vectors_count ?? result.vectorsCount ?? 0,
        indexedVectorsCount: result.indexed_vectors_count ?? result.indexedVectorsCount ?? 0,
        payloadSchema: result.payload_schema ?? {},
        config: result.config ?? {},
        raw: result
      };
    } catch (error) {
      if (error?.status === 404 || /not found/i.test(error?.message || '')) {
        return { exists: false, error: 'Collection not found' };
      }

      throw error;
    }
  }

  log(level, message) {
    const logger = this.logger || console;

    switch (level) {
      case 'error':
        return logger.error ? logger.error(message) : console.error(message);
      case 'warn':
        return logger.warn ? logger.warn(message) : console.warn(message);
      case 'log':
      default:
        return logger.log ? logger.log(message) : console.log(message);
    }
  }
}

export default QdrantOptimizer;