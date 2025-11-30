## Code Generation Instructions — Engineering guidelines for co-pilot

Purpose
- Provide deterministic engineering rules and style guidance so co-pilot produces maintainable TypeScript code for this project.

Project conventions
- Language: TypeScript (>=4.x). Use `async/await` idioms and `Promise` returns.
- Files: follow the architecture in `Architecture.md` (`src/services`, `src/repositories`, `src/routes`, `src/middleware`, `src/types`).
- Logging: Use structured JSON via a `LoggingService` or middleware. Always include `requestId` and component timings in responses.
- Configuration: read secrets and API keys from environment via `src/config/index.ts`. Never hardcode keys in code.

Function & module guidelines
- Export named functions/classes unless the module naturally contains a single default entity.
- Keep functions small (<= ~120 lines). Break complex logic into testable helpers.
- Validate inputs and throw typed errors (e.g., `BadRequestError`, `ServiceUnavailableError`).

Testing & types
- Add unit tests for each service using small mocks for `ResumeRepository` and the external LLM/embedding clients.
- Provide TypeScript interfaces in `src/types/index.ts` for all public shapes (e.g., `SearchQuery`, `Candidate`, `RerankResult`).

Pull request & commit guidance (for co-pilot to include in the assistant message):
- Commit messages: `<area>: <short description>` (e.g., `service: add EmbeddingService`)
- Create small, focused commits and include tests. Use `feat/` or `fix/` branch prefixes.

Examples for requesting code from co-pilot
- To generate `EmbeddingService`, include: file path, role name, method signatures, and sample unit test expectations.
- For route handlers, include the target HTTP path (`/v1/embeddings`) and expected request/response JSON.

Security & safety
- Sanitize any user-provided text before sending to external APIs. Enforce request size limits and return `413 Payload Too Large` when exceeded.
