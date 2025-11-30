import config from '../config';

type EmbeddingResponse = {
  model: string;
  embedding: number[];
  // accept different vendor shapes
  data?: Array<{ embedding: number[] }>;
};

export class EmbeddingService {
  apiKey: string | undefined;
  apiUrl: string;

  constructor() {
    this.apiKey = process.env.MISTRAL_API_KEY;
    this.apiUrl = process.env.MISTRAL_EMBEDDING_URL || 'https://api.mistral.ai/v1/embeddings';
  }

  async embed(input: string, model?: string): Promise<number[]> {
    if (!input || typeof input !== 'string') throw new Error('input must be a non-empty string');
    const usedModel = model || config.embeddingModel || 'mistral-embed-small';

    if (!this.apiKey) throw new Error('MISTRAL_API_KEY is not set in environment');

    const body = { model: usedModel, input };

    const start = Date.now();
    const res = await (globalThis as any).fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const elapsed = Date.now() - start;
    if (!res.ok) {
      let text = '';
      try { text = await res.text(); } catch (e) { /* ignore */ }
      throw new Error(`Embedding API error: ${res.status} ${res.statusText} ${text}`);
    }

    const json: EmbeddingResponse = await res.json();
    // Support multiple shapes: { embedding: [...] } or { data: [{embedding: [...]}] }
    const embedding = (json.embedding as number[] | undefined) || (json.data && json.data[0] && json.data[0].embedding) || null;
    if (!embedding) throw new Error('Embedding response missing embedding vector');

    // Optionally: validate dimension if EMBEDDING_DIM is set
    const expectedDim = Number(process.env.EMBEDDING_DIM || 0);
    if (expectedDim > 0 && embedding.length !== expectedDim) {
      // Log a warning but still return the vector
      // (In production, you may want to treat this as an error)
      // eslint-disable-next-line no-console
      console.warn(`Embedding dimension mismatch: expected ${expectedDim}, got ${embedding.length}`);
    }

    return embedding as number[];
  }
}

export default new EmbeddingService();
