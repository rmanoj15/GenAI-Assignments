# Co-pilot Prompts for resumes-ai-rag

Purpose: Guidance and reusable prompts for the co-pilot side chat to generate, edit, and debug code for the Resume Search RAG project.

Location: `prompts/co-pilot`

How to use:
- Use these prompts as the system or assistant message when asking co-pilot for code generation or editing.
- Keep temperature low (0.0-0.2) for deterministic code generation; increase slightly (0.2-0.5) when brainstorming.
- Use the provided JSON schemas and examples in each prompt to ensure structured outputs.
- When requesting changes, include the file path and a concise summary of desired behavior.

Files included:
- `rerank_prompt.md` : LLM re-ranking prompt + output schema + examples
- `summarize_prompt.md` : Summarization prompt for candidate fit
- `extract_metadata_prompt.md` : Metadata extraction rules and schema
- `embedding_prompt.md` : Guidelines for constructing embedding inputs
- `search_pipeline_prompt.md` : Orchestration prompt for end-to-end search pipeline
- `code_generation_instructions.md` : Engineering guidelines for generating TypeScript code
- `debugging_instructions.md` : Debugging checklist, common failures, and fix patterns

Suggested co-pilot settings:
- Model: use the configured LLM service (groq / mistral) for real runs; for local editing use default co-pilot model.
- Temperature: 0.0 (code), 0.2 (prompts & examples), 0.4 (creative refactors)
- Max tokens: 1024 for single-file edits, 2048 for multi-file generation or long explanations

Workflow suggestions:
- Start by using `code_generation_instructions.md` when asking co-pilot to generate new services or routes.
- Use `debugging_instructions.md` when tests fail or runtime errors occur.
- For ranking/summarization behaviour, use `rerank_prompt.md` and `summarize_prompt.md` as system messages to ensure consistent outputs.

If you want, I can now scaffold the TypeScript project files and implement the first endpoints (`/v1/health`, `/v1/health/db`).
