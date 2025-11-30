## Debugging Instructions — Common issues & guided fixes

Purpose
- Provide a step-by-step debugging checklist and common fixes to help co-pilot produce patches or diagnostics.

Common failure categories
- Environment / config: missing `MISTRAL_API_KEY`, `MONGODB_URI`, or misconfigured `MODEL` values.
- MongoDB connection: incorrect URI, missing indexes, or Atlas vector search not enabled.
- External API errors: embedding or LLM service timeouts, rate limits, or malformed requests.
- Data issues: incorrectly formatted resume documents, missing `embedding` fields, or inconsistent types.

Checklist for reproducing errors
1. Confirm `.env` variables are set; replicate locally with `ENV_FILE=.env.local node dist/server.js`.
2. Re-run failing unit test(s) using `npm test -- -u <testname>` and collect the stack trace.
3. Reproduce API issue with `curl` or `httpie` including headers and body; capture response and timings.

Common fixes and patches (co-pilot can propose these):
- Add connection retry with exponential backoff for MongoDB client.
- Validate request sizes and return `413` on large payloads.
- Add circuit breaker or retry for embedding/LLM API calls; annotate fallbacks in server response.
- Ensure vector search query uses the correct index name and that embedding vector length matches index dimension.

Example quick diagnostics command (zsh):
```bash
# Run unit tests matching "embedding"
npm test -- -t embedding

# Start server with debug logs
NODE_ENV=development DEBUG=app:* npm run start:dev
```

Patch & PR suggestions (for co-pilot):
- When generating a fix, include the failing test name and produce a minimal patch that adds a focused unit test and implementation change.
- Provide a suggested commit message and short PR description describing the root cause.
