import config from '../config';

type Candidate = {
  resumeId: string;
  snippet: string;
  bm25Score?: number;
  vectorScore?: number;
  metadata?: Record<string, any>;
};

type RerankRequest = {
  query: string;
  candidates: Candidate[];
  topK?: number;
};

type RerankResult = {
  query: string;
  ranked: Array<{
    resumeId: string;
    rank: number;
    score: number;
    reasoning: string;
  }>;
  meta: {
    topKRequested?: number;
    model: string;
  };
};

export class LLMService {
  apiKey: string | undefined;
  apiUrl: string;
  model: string;

  constructor() {
    this.apiKey = process.env.GROQ_API_KEY;
    this.apiUrl = process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions';
    this.model = config.llmModel || 'llama-3.3-70b-versatile';
  }

  async rerankCandidates(query: string, candidates: Candidate[], topK?: number): Promise<RerankResult> {
    if (!query || typeof query !== 'string') throw new Error('query is required');
    if (!Array.isArray(candidates) || candidates.length === 0) throw new Error('candidates array required');
    if (!this.apiKey) throw new Error('GROQ_API_KEY is not set');

    // Build a clear, structured prompt that forces JSON output
    const candidatesText = candidates
      .map((c, i) => `${i + 1}. ID: ${c.resumeId}, Text: ${c.snippet}`)
      .join('\n');

    const systemPrompt = `You are a resume ranker. Rank the provided candidate resumes by relevance to the query.
Return ONLY valid JSON (no other text) with this exact structure:
{
  "query": "the query",
  "ranked": [
    {
      "resumeId": "id",
      "rank": 1,
      "score": 0.95,
      "reasoning": "why this is relevant"
    }
  ],
  "meta": {
    "model": "model name"
  }
}`;

    const userContent = `Query: ${query}

Candidates:
${candidatesText}

TopK: ${topK || candidates.length}

Return ONLY the JSON object, nothing else.`;

    const body = {
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      temperature: 0.0,
      max_tokens: 2048
    };

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
      throw new Error(`LLM API error: ${res.status} ${res.statusText} ${text}`);
    }

    const json = await res.json();
    // Extract the LLM output (Groq returns choices[0].message.content)
    let content = json.choices?.[0]?.message?.content || '';
    
    // Try to extract JSON from markdown code blocks if wrapped
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      content = jsonMatch[1];
    }
    
    let result: RerankResult;
    try {
      result = JSON.parse(content);
    } catch (e) {
      throw new Error(`LLM response is not valid JSON: ${content.slice(0, 200)}`);
    }
    // Attach timing and model info
    result.meta = result.meta || {};
    result.meta.topKRequested = topK;
    result.meta.model = this.model;
    (result as any).timings = { rerankMs: elapsed };
    return result;
  }

  async summarizeCandidateFit(
    query: string,
    candidate: { resumeId: string; snippet: string; metadata?: Record<string, any> },
    options?: { style?: 'short' | 'detailed'; maxTokens?: number }
  ): Promise<{ resumeId: string; summary: string; meta: { model: string; style: string } }> {
    if (!query || typeof query !== 'string') throw new Error('query is required');
    if (!candidate || !candidate.resumeId || !candidate.snippet) {
      throw new Error('candidate with resumeId and snippet is required');
    }
    if (!this.apiKey) throw new Error('GROQ_API_KEY is not set');

    const style = options?.style || 'short';
    const maxTokens = Math.min(options?.maxTokens || 300, 2048);

    const styleInstructions =
      style === 'short'
        ? 'Provide a brief (2-3 sentences) fit assessment.'
        : 'Provide a detailed (4-6 sentences) fit assessment covering strengths, gaps, and suitability.';

    const systemPrompt = `You are a resume fit analyst. Given a role requirement/query and a candidate resume snippet, provide a concise fit assessment.
${styleInstructions}
Be objective and highlight key matches and gaps.`;

    const userContent = `Role/Query: ${query}

Candidate Resume:
${candidate.snippet}

Provide a clear, actionable summary of fit.`;

    const body = {
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      temperature: 0.3,
      max_tokens: maxTokens
    };

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
      throw new Error(`LLM API error: ${res.status} ${res.statusText} ${text}`);
    }

    const json = await res.json();
    const summary = json.choices?.[0]?.message?.content || '';

    return {
      resumeId: candidate.resumeId,
      summary: summary.trim(),
      meta: {
        model: this.model,
        style
      }
    };
  }

  async extractMetadata(
    rawText: string,
    options?: { maxTokens?: number }
  ): Promise<{ skills: string[]; jobTitles: string[]; experienceSummary: string }> {
    if (!rawText || typeof rawText !== 'string') throw new Error('rawText is required');
    if (!this.apiKey) throw new Error('GROQ_API_KEY is not set');

    const maxTokens = Math.min(options?.maxTokens || 500, 2048);

    const systemPrompt = `You are a resume metadata extractor. Extract structured information from resume text.
Return ONLY valid JSON (no other text) with this exact structure:
{
  "skills": ["skill1", "skill2", ...],
  "jobTitles": ["title1", "title2", ...],
  "experienceSummary": "1-2 sentence summary of experience"
}`;

    const userContent = `Resume Text:
${rawText}

Extract metadata and return ONLY the JSON object.`;

    const body = {
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      temperature: 0.0,
      max_tokens: maxTokens
    };

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
      throw new Error(`LLM API error: ${res.status} ${res.statusText} ${text}`);
    }

    const json = await res.json();
    let content = json.choices?.[0]?.message?.content || '';

    // Try to extract JSON from markdown code blocks if wrapped
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      content = jsonMatch[1];
    }

    let result;
    try {
      result = JSON.parse(content);
    } catch (e) {
      throw new Error(`LLM response is not valid JSON: ${content.slice(0, 200)}`);
    }

    return {
      skills: Array.isArray(result.skills) ? result.skills : [],
      jobTitles: Array.isArray(result.jobTitles) ? result.jobTitles : [],
      experienceSummary: result.experienceSummary || ''
    };
  }
}

export default new LLMService();
