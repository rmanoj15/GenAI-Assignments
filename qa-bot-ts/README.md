**Project Overview**

 - **Purpose**: A minimal TypeScript question-answering (QA) bot that ingests documents, creates a vector index, and answers user queries using hybrid retrieval + LLM reranking.
 - **Stack**: TypeScript, Node.js (>=18.17), Express, LangChain adapters, MongoDB (optional for persistence).

**Quick Start**

 - **Install dependencies**: `npm install`
 - **Run in development**: `npm run dev` (starts the TypeScript server with `tsx` watch)
 - **Build**: `npm run build` (produces JS in `dist/`)
 - **Start (production)**: `npm start` (runs `dist/server.js` after building)
 - **Type-check**: `npm run typecheck`

**Important files & folders**

 - **`src/server.ts`**: Application entrypoint and HTTP server.
 - **`src/config/index.ts`**: Central config and environment wiring.
 - **`src/lib/`**: Core logic:
   - `chain.ts`, `conversationalRAGChain.ts`, `conversationalFilter.ts` — chain and orchestration logic.
   - `loaders.ts` — document loaders and parsing helpers.
   - `embeddings/` — embedding implementations (e.g., `mistralEmbeddings.ts`).
   - `memory/` — chat memory implementations (`chatMemory.ts`).
   - `models/` — model factory and wrappers.
   - `vectorstore/` — vector store implementations and helpers.
 - **`src/pipelines/`**: ingestion and retrieval pipelines (ingest documents, run hybrid search, rerank results).
 - **`scripts/createVectorIndex.ts`**: helper script to build a vector index from `documents/`.

**Environment variables**

Create a `.env` file or provide env vars in your environment. Typical variables used by this project include:

 - **`PORT`**: server port (default: `3000`)
 - **`OPENAI_API_KEY`**: API key for OpenAI (if using OpenAI models)
 - **`MISTRALAI_API_KEY`**: API key for Mistral/other model providers (if configured)
 - **`ANTHROPIC_API_KEY`**: API key (if Anthropic models used)
 - **`MONGODB_URI`**: MongoDB connection string (if using the MongoDB adapter/persistence)

Check `src/config/index.ts` for the exact variables the project reads.

**Common workflows**

 - Ingest documents and build vectors:
   - `npx tsx scripts/createVectorIndex.ts` — runs the TypeScript ingestion script (you can also run it via `node` after `npm run build`).
 - Start the dev server and query the API:
   - `npm run dev` and then send requests to the running server (default `http://localhost:3000`).
 - Run type checks and build for production:
   - `npm run typecheck` then `npm run build` and `npm start`.

**Notes for contributors / maintainers**

 - The retrieval pipeline is implemented in `src/pipelines/retrieval` and uses a hybrid approach (keyword + vector search) with an LLM reranker. See `hybridSearch.ts`, `vectorSearch.ts`, and `llmReranker.ts`.
 - Memory and conversational state live under `src/lib/memory` (see `chatMemory.ts`). If you change memory semantics, update the conversational chain in `conversationalRAGChain.ts`.
 - Model adapters are in `src/lib/models` — update `factory.ts` when adding new provider integrations.
 - Document loaders (`src/lib/loaders.ts`) include helpers for PDF, DOCX, and other formats — add new loaders for additional file types.

**Diagnostics & development tips**

 - If you see type errors: run `npm run typecheck` to get full TypeScript diagnostics.
 - To inspect logs, run `npm run dev` and watch the terminal output; add more structured logging where helpful.
 - Use `git` to create feature branches for changes; keep changes small and focused.

**Next steps / optional improvements**

 - Add automated tests and CI (GitHub Actions) to run `typecheck` and build on PRs.
 - Add a Dockerfile for containerized deployments.
 - Provide a CLI wrapper for ingestion with more configuration flags.

**License & acknowledgements**

 - This project doesn't include a license file by default. If you plan to publish, add an appropriate `LICENSE` file.

If you want, I can also add a short `CONTRIBUTING.md`, CI workflow, or a Dockerfile next.
