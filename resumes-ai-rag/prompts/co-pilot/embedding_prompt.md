## Embedding Prompt — Constructing embedding inputs

Purpose
- Guidance for forming embedding inputs for (a) query embeddings and (b) resume embeddings.

General rules
- Keep the embedding input focused and denoised. Remove long irrelevant headers and boilerplate (e.g., "Curriculum Vitae"), but include skill lists, role summaries, and responsibilities.
- For queries (JD): include job title, must-have skills, preferred skills, seniority, and location if relevant. Limit to ~256–512 tokens for best cost/quality tradeoff.
- For resumes: include `experienceSummary`, `skills` list, `mostRecentRole` and `education`. Avoid full PII fields (email/phone) — they add noise.

Format suggestions
- Query embedding example input:
  "Title: Senior Node.js Backend Engineer; Must: Node.js, Express, MongoDB; Preferred: AWS, TypeScript; Years: 5+; Location: Bangalore"
- Resume embedding example input:
  "Name: <redacted>; Summary: 6 years backend dev; Skills: Node.js, TypeScript, MongoDB, AWS; Recent role: Senior Backend Engineer at X (2021-2024)"

Implementation notes for co-pilot:
- When implementing `EmbeddingService.embed(text, model)`, call this prompt to transform raw input into the canonical embedding text, then call the external embedding API.
- Ensure deterministic normalization (lowercase? preserve case?) — pick one convention and document in comments.

Safety & privacy
- Strip or redact PII unless you specifically need it (e.g., for contact extraction elsewhere). For embeddings used for semantic match, PII is unnecessary.
