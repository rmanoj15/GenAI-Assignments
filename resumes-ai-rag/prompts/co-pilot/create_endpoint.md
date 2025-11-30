## Create Endpoint Prompt — Guidance for generating new endpoint code

Purpose
- Provide a step-by-step template for co-pilot to generate a new Express endpoint, service, and tests following project conventions.

System Instructions (use as system message):
- Produce TypeScript code that follows the repository's structure: `src/routes`, `src/services`, `src/types`. Use `async/await`, input validation, structured logging with `requestId`, and return JSON responses. When calling external APIs, read credentials from environment variables via `src/config`.

Task: Implement an embeddings endpoint that accepts a single string input and returns an embedding vector.

Required files to generate:
- `src/services/EmbeddingService.ts` — class with `embed(input: string, model?: string): Promise<number[]>`.
- `src/routes/embeddings.ts` — Express router with `POST /v1/embeddings`.
- Update `src/app.ts` to mount the new route.

Endpoint contract
- Request JSON: `{ "input": "<text>", "model": "<optional model override>" }`
- Response JSON (200): `{ "requestId": "...", "model": "...", "embedding": [<number>], "timings": { "embeddingMs": 123 } }`
- Errors: 400 for invalid input, 502 for external embedding failure. Include `requestId` on errors.

Implementation notes
- Use `process.env.MISTRAL_API_KEY` and `process.env.MISTRAL_EMBEDDING_URL` (optional) in `EmbeddingService`.
- Default model should be read from `src/config` (`config.embeddingModel`) and default to `mistral-embed-small`.
- Validate input type and size; limit request body size via `express.json({ limit: '200kb' })`.
- Add timing around the external call and include `embeddingMs` in response.

Testing notes
- Suggest unit tests that mock fetch to return a known embedding vector and assert the endpoint returns the vector and timings.

Security
- Do not log API keys or full environment variables. Mask/omit secrets in logs.
