import { QdrantClient } from '@qdrant/js-client-rest';
import { config } from './env.js';

export const qdrantClient = config.qdrant.url
  ? new QdrantClient({
      url: config.qdrant.url,
      apiKey: config.qdrant.apiKey,
      checkCompatibility: false
    })
  : null;
