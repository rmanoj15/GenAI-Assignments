import { getDb } from '../db/mongo';
import config from '../config';
import EmbeddingService from './EmbeddingService';
import LLMService from './LLMService';

type BM25Filters = {
  minYearsExperience?: number;
  location?: string;
  [key: string]: any;
};

class SearchService {
  async bm25Search(query: string, filters: BM25Filters = {}, topK = 20) {
    if (!query || typeof query !== 'string') throw new Error('query is required');

    const db = getDb();
    const coll = db.collection(config.mongodbCollection);

    // Build $search text stage
    const searchStage: any = {
      $search: {
        index: config.mongodbBm25Index,
        text: {
          query,
          path: ['text', 'skills', 'role', 'experienceSummary', 'jobTitles'],
          fuzzy: { maxEdits: 1 }
        }
      }
    };

    const pipeline: any[] = [searchStage];

    // Optional filters translated to match stage
    const match: any = {};
    if (filters.minYearsExperience != null) {
      match.total_Experience = { $gte: Number(filters.minYearsExperience) };
    }
    if (filters.location) {
      match.location = filters.location;
    }
    if (Object.keys(match).length > 0) pipeline.push({ $match: match });

    // Add score, sort and limit
    pipeline.push({ $addFields: { score: { $meta: 'searchScore' } } });
    pipeline.push({ $sort: { score: -1 } });
    pipeline.push({ $limit: topK });

    // Project useful fields + snippet
    pipeline.push({
      $project: {
        _id: 1,
        name: 1,
        role: 1,
        email: 1,
        location: 1,
        skills: 1,
        total_Experience: 1,
        relevant_Experience: 1,
        score: 1,
        snippet: { $substr: ['$text', 0, 400] }
      }
    });

    const start = Date.now();
    const cursor = coll.aggregate(pipeline, { maxTimeMS: 5000 });
    const results = await cursor.toArray();
    const elapsed = Date.now() - start;

    return { results, timings: { bm25Ms: elapsed } };
  }

  async vectorSearch(query: string, filters: BM25Filters = {}, topK = 20) {
    if (!query || typeof query !== 'string') throw new Error('query is required');
    // Generate query embedding (measure time)
    const embedStart = Date.now();
    const embedding = await EmbeddingService.embed(query);
    const embeddingMs = Date.now() - embedStart;

    const db = getDb();
    const coll = db.collection(config.mongodbCollection);

    // Build $search knn stage for Atlas Vector Search
    const knnStage: any = {
      $search: {
        index: config.mongodbVectorIndex,
        knnBeta: {
          vector: embedding,
          path: 'embedding',
          k: topK
        }
      }
    };

    const pipeline: any[] = [knnStage];

    // apply lightweight filters via $match (non-vector)
    const match: any = {};
    if (filters.minYearsExperience != null) match.total_Experience = { $gte: Number(filters.minYearsExperience) };
    if (filters.location) match.location = filters.location;
    if (Object.keys(match).length > 0) pipeline.push({ $match: match });

    pipeline.push({ $addFields: { score: { $meta: 'searchScore' } } });
    pipeline.push({ $sort: { score: -1 } });
    pipeline.push({ $limit: topK });
    pipeline.push({
      $project: {
        _id: 1,
        name: 1,
        role: 1,
        email: 1,
        location: 1,
        skills: 1,
        total_Experience: 1,
        relevant_Experience: 1,
        score: 1,
        snippet: { $substr: ['$text', 0, 400] }
      }
    });

    const start = Date.now();
    try {
      const cursor = coll.aggregate(pipeline, { maxTimeMS: 5000 });
      const results = await cursor.toArray();
      const elapsed = Date.now() - start;
      return { results, timings: { vectorMs: elapsed, embeddingMs } };
    } catch (err: any) {
      // If vector search is not available (index misconfigured), fallback to BM25
      const elapsed = Date.now() - start;
      const msg = String(err?.message || err);
      if (msg.includes("Cannot execute $search") || msg.toLowerCase().includes('knn') || msg.toLowerCase().includes('vector')) {
        // call bm25Search as fallback
        try {
          const fallback = await this.bm25Search(query, filters, topK);
          return { results: fallback.results, timings: { vectorMs: elapsed, embeddingMs }, fallback: { vectorFallback: true, reason: msg } };
        } catch (fallbackErr: any) {
          throw new Error(`vector_search_failed: ${msg}; bm25_fallback_failed: ${String(fallbackErr?.message || fallbackErr)}`);
        }
      }
      // Unknown error — rethrow
      throw err;
    }
  }

  async hybridSearch(query: string, filters: BM25Filters = {}, options: { topK?: number } = {}) {
    const topK = options.topK ?? 20;
    const start = Date.now();

    // Run BM25 and vector in parallel and capture results/failures
    const [bm25Res, vectorRes] = await Promise.allSettled([
      this.bm25Search(query, filters, topK),
      this.vectorSearch(query, filters, topK)
    ]);

    const elapsed = Date.now() - start;

    const response: any = { timings: { totalMs: elapsed } };

    if (bm25Res.status === 'fulfilled') {
      response.bm25 = bm25Res.value;
    } else {
      response.bm25 = { results: [], timings: {}, error: String((bm25Res as any).reason) };
    }

    if (vectorRes.status === 'fulfilled') {
      response.vector = vectorRes.value;
    } else {
      response.vector = { results: [], timings: {}, error: String((vectorRes as any).reason) };
    }

    return response;
  }

  async endToEndSearch(
    query: string,
    filters: BM25Filters = {},
    options: {
      topK?: number;
      rerankTopK?: number;
      rerank?: boolean;
      summarize?: boolean;
      summarizeStyle?: 'short' | 'detailed';
      maxSummarizeTokens?: number;
    } = {}
  ) {
    const topK = options.topK ?? 20;
    const rerankTopK = options.rerankTopK ?? 10;
    const shouldRerank = options.rerank ?? true;
    const shouldSummarize = options.summarize ?? false;
    const summarizeStyle = options.summarizeStyle ?? 'short';
    const maxSummarizeTokens = options.maxSummarizeTokens ?? 300;

    const timings: any = {};
    const pipelineStart = Date.now();
    const response: any = { query, candidates: [], timings };
    let fallbackReasons: string[] = [];

    try {
      // Step 1: Run BM25 and vector search in parallel
      const hybridRes = await this.hybridSearch(query, filters, { topK });
      timings.bm25Ms = hybridRes.timings.bm25?.bm25Ms || 0;
      timings.vectorMs = hybridRes.timings.vector?.vectorMs || 0;
      timings.embeddingMs = hybridRes.timings.vector?.embeddingMs || 0;

      // Check for fallback conditions
      if (hybridRes.bm25?.fallback?.vectorFallback) {
        fallbackReasons.push(`Vector search fell back to BM25: ${hybridRes.bm25.fallback.reason}`);
      }
      if (hybridRes.bm25?.error) {
        fallbackReasons.push(`BM25 search failed: ${hybridRes.bm25.error}`);
      }
      if (hybridRes.vector?.error) {
        fallbackReasons.push(`Vector search failed: ${hybridRes.vector.error}`);
      }

      // Step 2: Deduplicate and merge results (prioritize BM25, then vector)
      const candidateMap = new Map<string, any>();
      const bm25Results = hybridRes.bm25?.results || [];
      const vectorResults = hybridRes.vector?.results || [];

      // Add BM25 results first (priority)
      bm25Results.forEach((doc: any, idx: number) => {
        const key = String(doc._id);
        candidateMap.set(key, {
          ...doc,
          resumeId: doc._id,
          bm25Rank: idx + 1,
          bm25Score: doc.score
        });
      });

      // Add vector results, update if already present
      vectorResults.forEach((doc: any, idx: number) => {
        const key = String(doc._id);
        const existing = candidateMap.get(key);
        if (existing) {
          existing.vectorRank = idx + 1;
          existing.vectorScore = doc.score;
        } else {
          candidateMap.set(key, {
            ...doc,
            resumeId: doc._id,
            vectorRank: idx + 1,
            vectorScore: doc.score
          });
        }
      });

      // Convert to array, sorted by combined rank (BM25 priority > vector)
      let mergedCandidates = Array.from(candidateMap.values())
        .sort((a, b) => {
          const aBm25 = a.bm25Rank ?? 999999;
          const bBm25 = b.bm25Rank ?? 999999;
          if (aBm25 !== bBm25) return aBm25 - bBm25;
          const aVec = a.vectorRank ?? 999999;
          const bVec = b.vectorRank ?? 999999;
          return aVec - bVec;
        })
        .slice(0, topK);

      // Step 3: Prepare candidates for reranking
      const candidatesForRerank = mergedCandidates.map((c) => ({
        resumeId: String(c.resumeId),
        snippet: c.snippet || ''
      }));

      // Step 4: Rerank if requested
      if (shouldRerank && candidatesForRerank.length > 0) {
        const rerankStart = Date.now();
        try {
          const rerankRes = await LLMService.rerankCandidates(query, candidatesForRerank, rerankTopK);
          timings.rerankMs = Date.now() - rerankStart;

          // Apply rerank results back to candidates
          if (rerankRes.ranked && Array.isArray(rerankRes.ranked)) {
            const rerankMap = new Map<string, any>();
            rerankRes.ranked.forEach((r: any, idx: number) => {
              rerankMap.set(String(r.resumeId), { ...r, rerankRank: idx + 1 });
            });

            // Merge rerank scores back
            mergedCandidates = mergedCandidates
              .filter((c) => rerankMap.has(String(c.resumeId)))
              .map((c) => {
                const rerankInfo = rerankMap.get(String(c.resumeId));
                return { ...c, ...rerankInfo };
              })
              .sort((a, b) => (a.rerankRank ?? 999999) - (b.rerankRank ?? 999999));
          }
        } catch (rerankErr: any) {
          fallbackReasons.push(`Reranking failed, using hybrid ordering: ${String(rerankErr?.message || rerankErr)}`);
          // Keep merged candidates sorted by hybrid heuristic
        }
      }

      response.candidates = mergedCandidates;

      // Step 5: Summarize if requested
      if (shouldSummarize && mergedCandidates.length > 0) {
        const summaries: any[] = [];
        const summarizeStart = Date.now();
        let summarizeErrors = 0;

        for (const candidate of mergedCandidates) {
          try {
            const summaryRes = await LLMService.summarizeCandidateFit(query, candidate, {
              style: summarizeStyle,
              maxTokens: maxSummarizeTokens
            });
            summaries.push(summaryRes);
          } catch (summaryErr: any) {
            summarizeErrors++;
            summaries.push({
              resumeId: candidate.resumeId,
              summary: null,
              error: String(summaryErr?.message || summaryErr)
            });
          }
        }

        timings.summarizeMs = Date.now() - summarizeStart;

        // Attach summaries to candidates
        const summaryMap = new Map<string, any>();
        summaries.forEach((s) => {
          summaryMap.set(String(s.resumeId), s);
        });

        response.candidates = response.candidates.map((c: any) => {
          const summary = summaryMap.get(String(c.resumeId));
          return { ...c, summary: summary?.summary, summaryError: summary?.error };
        });

        if (summarizeErrors > 0) {
          fallbackReasons.push(`${summarizeErrors}/${mergedCandidates.length} summaries failed`);
        }
      }

      response.timings.totalMs = Date.now() - pipelineStart;
      if (fallbackReasons.length > 0) {
        response.fallbackReasons = fallbackReasons;
      }

      return response;
    } catch (err: any) {
      const totalMs = Date.now() - pipelineStart;
      throw new Error(`End-to-end search pipeline failed: ${String(err?.message || err)}`);
    }
  }
}

export default new SearchService();
