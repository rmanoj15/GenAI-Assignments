## Extract Metadata Prompt — Structured metadata from resume text

Purpose
- Extract normalized metadata (skills, job titles, experience summary, education, contact info) from unstructured resume text.

System Instructions:
- Output must be strict JSON following the schema below. Normalize skills (sentence-case or canonical tokens) and deduplicate. Parse experience values into numbers (years, fractional allowed). If a field cannot be extracted, return `null` or empty array.

Input: raw resume text (string)

Output Schema:
{
  "name": "<string|null>",
  "email": "<string|null>",
  "phone": "<string|null>",
  "location": "<string|null>",
  "education": ["<string>"],
  "jobTitles": ["<string>"],
  "skills": ["<string>"],
  "totalExperience": <number|null>,
  "relevantExperience": <number|null>,
  "experienceSummary": "<short summary|null>"
}

Extraction rules & normalization:
- `skills`: map similar tokens (e.g., "JS" -> "JavaScript") when obvious; prefer full names.
- `totalExperience` and `relevantExperience`: parse numeric years (e.g., "3.5 years" → 3.5). If only months available, convert to years.
- `email` and `phone`: validate format, otherwise `null`.
- `experienceSummary`: 1-2 sentence synthesis of roles and years of experience.

Confidence scoring (optional): Include heuristics in comments if helpful, but do not modify the JSON schema.

Usage note for co-pilot:
- Use this prompt when generating `LLMService.extractMetadata` implementation and also when creating unit tests (include edge cases: multiple emails, ranges like "2019-2022").
