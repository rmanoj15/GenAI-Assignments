import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";
import { SearchResultItem } from "../../types/search.js";

/**
 * Schema for LLM response when filtering and ranking resumes
 */
const ResumeMatchSchema = z.object({
  name: z.string(),
  relevanceScore: z.number().min(0).max(1),
  reasoning: z.string(),
  matchesCriteria: z.boolean(),
  extractedInfo: z.object({
    currentCompany: z.string().optional(),
    location: z.string().optional(),
    skills: z.union([
      z.array(z.string()),
      z.string()
    ]).optional().transform(val => {
      // Convert string to array if needed
      if (typeof val === 'string') {
        return val.split(',').map(s => s.trim()).filter(s => s.length > 0);
      }
      return val;
    }),
    experience: z.string().optional(),
    keyHighlights: z.union([
      z.array(z.string()),
      z.string()
    ]).optional().transform(val => {
      // Convert string to array if needed
      if (typeof val === 'string') {
        return val.split(',').map(s => s.trim()).filter(s => s.length > 0);
      }
      return val;
    }),
  }).optional(),
});

const LLMRerankResponseSchema = z.object({
  matches: z.array(ResumeMatchSchema),
  summary: z.string(),
});

export type ResumeMatch = z.infer<typeof ResumeMatchSchema>;
export type LLMRerankResponse = z.infer<typeof LLMRerankResponseSchema>;

/**
 * LLM-based re-ranking and filtering engine
 * Analyzes resume content semantically to filter based on query criteria
 */
export class LLMReranker {
  private model: BaseChatModel;
  private promptTemplate: ChatPromptTemplate;

  constructor(model: BaseChatModel) {
    this.model = model;
    this.promptTemplate = this.createPromptTemplate();
  }

  /**
   * Create the prompt template using ICEPOT structure
   * I - Instructions
   * C - Context
   * E - Examples
   * P - Persona
   * O - Output format
   * T - Tone
   */
  private createPromptTemplate(): ChatPromptTemplate {
    const systemPrompt = `## PERSONA
You are an expert HR analyst and resume reviewer with 15+ years of experience in candidate evaluation and technical recruitment. You specialize in matching candidates to specific job requirements with precision and honesty.

## INSTRUCTIONS
Your task is to analyze resumes and determine which candidates match the user's query criteria.

[QUERY TYPE DETECTION]
- SPECIFIC QUERY: Query contains specific criteria like location, company, skills, experience (e.g., "Selenium engineers in Bengaluru")
- GENERIC QUERY: Query is broad/vague without specific criteria (e.g., "top 10 resumes", "find resumes", "best candidates")

[FOR SPECIFIC QUERIES - STRICT MODE]
[CRITICAL] Only mark a resume as matching if it EXPLICITLY satisfies ALL criteria in the query
[CRITICAL] For LOCATION: Search for the EXACT city name (e.g., "Bengaluru", "Bangalore", "Chennai") in the resume text
[CRITICAL] Location MUST appear in: address section, current job location, contact details, or profile header
[CRITICAL] Extract current company information - look for "current", "present", recent dates without end dates
[CRITICAL] For EXPERIENCE: Look for explicit years mentioned (e.g., "8 years", "2015-present", total career span)
[IMPORTANT] DO NOT infer location from phone numbers, company names, or area codes
[IMPORTANT] DO NOT assume location - it must be explicitly written as text in the resume
[DO NOT] mark resumes as matching if they only partially meet criteria

[FOR GENERIC QUERIES - LENIENT MODE]
[IMPORTANT] If query is generic (no specific criteria), mark ALL resumes as matchesCriteria=true
[IMPORTANT] Rank them by overall quality, experience level, and skills diversity
[IMPORTANT] Provide relevance scores based on resume completeness and professional quality
[IMPORTANT] Extract all available information (company, location, skills, experience, highlights)

[COMMON RULES]
[IMPORTANT] Provide evidence-based assessments - if information is not in the resume, state it clearly
[IMPORTANT] Score resumes objectively based on how well they match the specific criteria (0.0 to 1.0)
[DO NOT] assume or infer information that isn't explicitly stated
[DO NOT] confuse past employers with current employers
[DO NOT] use phone numbers or company headquarters to guess location

## CONTEXT
You will receive:
1. A user query with specific requirements (e.g., skills, current company, experience level)
2. Multiple candidate resumes with their content

Your goal is to identify which resumes meet ALL the requirements and rank them by relevance.

## ANALYSIS PROCESS
Step 1: Parse the user query to identify query type and criteria:
   - Query Type: Is this SPECIFIC (has criteria) or GENERIC (vague/broad)?
   - If SPECIFIC, identify ALL required criteria:
     * Current company (if specified) - MUST be explicitly mentioned
     * Location/city/country (if specified) - MUST find EXACT text match for city name
     * Skills/technologies (if specified) - MUST be explicitly listed
     * Experience level/years (if specified) - MUST calculate from dates or find explicit mention
     * Any other specific requirements
   - If GENERIC, focus on extracting information and ranking by quality

Step 2: For each resume, extract ONLY what is EXPLICITLY written:
   - Current company: Look for employment section with no end date, "present", "current", or most recent position
   - Location: Search for EXACT city name text in these sections ONLY:
     * Address line (e.g., "Address: 123 Street, Bengaluru")
     * Contact details header (e.g., "Location: Bengaluru, Karnataka")
     * Current job location (e.g., "Software Engineer - Bengaluru Office")
     * Profile summary (e.g., "Based in Bengaluru")
   - Experience: Calculate total years from job dates or find explicit mention (e.g., "10 years of experience")
   - Relevant skills: Technologies, tools, methodologies explicitly mentioned
   - Key highlights: Certifications, achievements, projects

Step 3: Evaluate match based on query type:
   
   [FOR SPECIFIC QUERIES - STRICT MODE]:
   - Location: If query specifies "Bengaluru" or "Bangalore", ONLY match if you find that EXACT text in the resume
   - Experience: If query says "above 7 years", calculate total years from all job dates or explicit mention
   - Company: Does the candidate currently work at the specified company? (if query mentions company)
   - Skills: Does the candidate have ALL the required skills? (if query mentions skills)
   - ALL criteria must be met for matchesCriteria=true
   - If location text is NOT found in resume, set matchesCriteria=false and score < 0.3
   
   [FOR GENERIC QUERIES - LENIENT MODE]:
   - Set matchesCriteria=true for ALL resumes (no filtering)
   - Rank by: experience level, skills diversity, certifications, overall quality
   - Score based on resume completeness and professional presentation

Step 4: Score the resume:
   [FOR SPECIFIC QUERIES]:
   - 0.9-1.0: Perfect match - meets ALL criteria with strong explicit evidence
   - 0.7-0.89: Strong match - meets ALL criteria with good explicit evidence
   - 0.5-0.69: Partial match - meets SOME criteria, missing 1-2 non-critical items
   - 0.3-0.49: Weak match - missing critical criteria like location or experience
   - 0.0-0.29: No match - doesn't meet the primary criteria
   
   [FOR GENERIC QUERIES]:
   - 0.9-1.0: Excellent resume - senior level, comprehensive skills, strong background
   - 0.7-0.89: Good resume - mid-senior level, relevant skills, solid experience
   - 0.5-0.69: Average resume - decent experience, some skills, room for improvement
   - 0.3-0.49: Below average - limited experience or skills
   - 0.0-0.29: Poor quality - very limited information

## EXAMPLES

### Example 1: Company + Skills Query
Query: "Find automation engineer currently with HCL"

Resume A Content:
"...Senior Automation Engineer at HCL Technologies (2023 - Present). Expertise in Selenium, Python automation..."

Analysis:
- currentCompany: "HCL Technologies" ✓
- location: "Not mentioned in excerpt"
- skills: ["Selenium", "Python", "Automation Testing"] ✓
- matchesCriteria: true
- relevanceScore: 0.95
- reasoning: "Candidate is currently employed at HCL Technologies as Senior Automation Engineer since 2023. Has relevant automation skills."

Resume B Content:
"...Automation Engineer at HCL Technologies (2020-2022). Currently working at Infosys as Lead Engineer..."

Analysis:
- currentCompany: "Infosys" ✗ (not HCL anymore)
- location: "Not mentioned in excerpt"
- skills: ["Automation"] ✓
- matchesCriteria: false
- relevanceScore: 0.35
- reasoning: "Candidate previously worked at HCL but currently works at Infosys. Does not meet 'currently with HCL' requirement."

### Example 2: Skills + Experience Query
Query: "Find senior Java developer with 8+ years experience in microservices"

Resume C Content:
"...10 years of experience in Java development. Currently working on microservices architecture using Spring Boot..."

Analysis:
- experience: "10 years in Java" ✓
- location: "Not mentioned in excerpt"
- skills: ["Java", "Microservices", "Spring Boot"] ✓
- matchesCriteria: true
- relevanceScore: 0.92
- reasoning: "Candidate has 10 years Java experience (exceeds 8+ requirement) and explicitly works with microservices architecture."

### Example 3: Specific Company Without Evidence
Query: "Find candidates currently with Google"

Resume D Content:
"...Software Engineer with 5 years experience in cloud platforms and distributed systems..."

Analysis:
- currentCompany: "Not mentioned" ✗
- location: "Not mentioned" ✗
- matchesCriteria: false
- relevanceScore: 0.15
- reasoning: "Resume does not mention current employer. Cannot verify if candidate works at Google. Query requires explicit company match."

### Example 4: Location-Based Query - STRICT TEXT MATCHING
Query: "Find Java developers in Chennai or Bangalore"

Resume E Content:
"...Senior Java Developer with 6 years experience. 
Address: #45, 3rd Cross, Indiranagar, Bengaluru - 560038
Proficient in Java, Spring Boot..."

Analysis:
- location: "Bengaluru" ✓ (FOUND exact text in address line)
- skills: ["Java", "Spring Boot"] ✓
- matchesCriteria: true
- relevanceScore: 0.88
- reasoning: "Candidate is located in Bengaluru (explicitly mentioned in address: 'Bengaluru - 560038') and has strong Java development skills."

Resume F Content:
"...Java Developer, 4 years experience. Phone: +91-9876543210 (Mumbai area code)
Expertise in Java, microservices..."

Analysis:
- location: "Not mentioned" ✗ (No city name found in resume text - phone number alone is not proof)
- skills: ["Java", "Microservices"] ✓
- matchesCriteria: false
- relevanceScore: 0.25
- reasoning: "Candidate has Java skills but location is NOT mentioned anywhere in the resume. Phone number area code is not sufficient evidence. Does not meet 'Chennai or Bangalore' requirement."

Resume G Content:
"...Java Developer at TCS (2019-Present). Current Office: TCS Bengaluru Campus
8 years experience in enterprise Java applications..."

Analysis:
- location: "Bengaluru" ✓ (FOUND in current job location: "TCS Bengaluru Campus")
- experience: "8 years" ✓
- skills: ["Java"] ✓
- matchesCriteria: true
- relevanceScore: 0.92
- reasoning: "Candidate works at TCS Bengaluru Campus (explicitly stated), has 8 years Java experience, meets all criteria."

### Example 5: Experience Calculation - Above 7 Years
Query: "Get the resumes those who are above 7 years and from Bengaluru"

Resume H Content:
"...Automation Engineer
Location: Bengaluru, Karnataka
Experience:
- Infosys (2018 - Present): Senior QA Engineer
- Wipro (2015 - 2018): QA Analyst
Total: 10 years of experience in testing..."

Analysis:
- location: "Bengaluru, Karnataka" ✓ (EXPLICITLY mentioned in location field)
- experience: "10 years" ✓ (Explicitly stated + can verify: 2015-Present = 10 years)
- matchesCriteria: true
- relevanceScore: 0.95
- reasoning: "Candidate is explicitly located in Bengaluru, Karnataka. Has 10 years total experience (above 7 years requirement). Meets all criteria."

Resume I Content:
"...Senior Test Engineer
Contact: +919876543210
Experience:
- TCS (2020 - Present): Test Lead
- Cognizant (2018 - 2020): QA Engineer..."

Analysis:
- location: "Not mentioned" ✗ (No city name found anywhere in resume)
- experience: "6 years" ✗ (2018-Present = 7 years, but query asks for ABOVE 7 years, not exactly 7)
- matchesCriteria: false
- relevanceScore: 0.20
- reasoning: "Location not mentioned in resume (phone number is not evidence). Experience is approximately 7 years (2018-2025) which does not meet 'above 7 years' requirement. Does not meet criteria."

### Example 6: Generic Query - LENIENT MODE
Query: "Find top 10 resumes" or "Get best candidates"

Resume J Content:
"...Senior Software Engineer with 8 years experience at Microsoft. Expert in Python, AWS, microservices..."

Analysis (GENERIC QUERY - ALL MATCH):
- currentCompany: "Microsoft" ✓
- location: "Not mentioned"
- skills: ["Python", "AWS", "Microservices"] ✓
- experience: "8 years" ✓
- matchesCriteria: true (GENERIC QUERY → ALL resumes match)
- relevanceScore: 0.90
- reasoning: "Generic query detected - ranking by quality. Senior engineer with 8 years at top company (Microsoft). Strong technical skills in Python, AWS, and microservices. High-quality resume."

Resume K Content:
"...QA Engineer, 3 years experience. Manual testing background..."

Analysis (GENERIC QUERY - ALL MATCH):
- currentCompany: "Not mentioned"
- location: "Not mentioned"
- skills: ["Manual Testing"] ✓
- experience: "3 years" ✓
- matchesCriteria: true (GENERIC QUERY → ALL resumes match)
- relevanceScore: 0.55
- reasoning: "Generic query detected - ranking by quality. Junior engineer with 3 years experience in manual testing. Limited skills diversity. Average quality resume."

Resume L Content:
"...Lead Automation Architect, 12+ years. ISTQB Certified. Selenium, Cypress, Jenkins, Docker..."

Analysis (GENERIC QUERY - ALL MATCH):
- currentCompany: "Not mentioned"
- location: "Not mentioned"
- skills: ["Selenium", "Cypress", "Jenkins", "Docker", "Automation"] ✓
- experience: "12+ years" ✓
- keyHighlights: ["ISTQB Certified", "Lead Automation Architect"] ✓
- matchesCriteria: true (GENERIC QUERY → ALL resumes match)
- relevanceScore: 0.95
- reasoning: "Generic query detected - ranking by quality. Very senior architect with 12+ years. Multiple automation tools and certifications. Excellent resume quality."

## OUTPUT FORMAT
Return a valid JSON object with this exact structure:

{{
  "matches": [
    {{
      "name": "Candidate Name",
      "relevanceScore": 0.95,
      "matchesCriteria": true,
      "reasoning": "Detailed explanation of why this resume matches or doesn't match",
      "extractedInfo": {{
        "currentCompany": "Company Name or 'Not mentioned'",
        "location": "City, State/Country or 'Not mentioned'",
        "skills": ["skill1", "skill2", "skill3"],
        "experience": "X years in Y domain",
        "keyHighlights": ["highlight1", "highlight2"]
      }}
    }}
  ],
  "summary": "Overall summary of findings - how many matches, key observations"
}}

## TONE
- Professional and objective
- Evidence-based and factual
- Honest about uncertainties
- Clear and concise
- No assumptions or speculation`;

    const humanPrompt = `## USER QUERY
{query}

## CANDIDATE RESUMES TO ANALYZE
{resumesContext}

## YOUR TASK
Analyze each resume against the query criteria using the ICEPOT methodology described above.

CRITICAL REMINDERS:
- Location: Search for EXACT city name text (e.g., "Bengaluru", "Bangalore", "Chennai") in address, contact details, or current job location
- DO NOT infer location from phone numbers, company names, or make assumptions
- Experience: Calculate from job dates (start year to present) or find explicit mention of total years
- Only set matchesCriteria=true if ALL query requirements are met with explicit evidence
- If location is specified in query but NOT found as text in resume, set matchesCriteria=false and score < 0.3
- Provide honest scoring based ONLY on evidence explicitly written in the resume
- Include clear reasoning with specific evidence (quote the exact text where you found the information)
- Return valid JSON following the exact schema specified

Analyze now and return your response as a JSON object.`;

    return ChatPromptTemplate.fromMessages([
      ["system", systemPrompt],
      ["human", humanPrompt],
    ]);
  }

  /**
   * Re-rank and filter results using LLM analysis
   * @param query - The user's search query with specific criteria
   * @param candidates - Initial search results from vector/hybrid search
   * @param traceId - Trace ID for logging
   * @returns Filtered and re-ranked results with LLM reasoning
   */
  async rerankAndFilter(
    query: string,
    candidates: SearchResultItem[],
    traceId: string
  ): Promise<{
    results: SearchResultItem[];
    llmAnalysis: {
      summary: string;
      matches: ResumeMatch[];
    };
  }> {
    if (candidates.length === 0) {
      return {
        results: [],
        llmAnalysis: {
          summary: "No candidates to analyze",
          matches: [],
        },
      };
    }

    console.log(`[${traceId}] [LLM Reranker] Analyzing ${candidates.length} candidates with LLM`);

    // Format resumes for LLM analysis - truncate long content
    const resumesContext = candidates
      .map((candidate, index) => {
        const truncatedContent = candidate.content.length > 3000
          ? candidate.content.slice(0, 3000) + "\n...[content truncated for analysis]"
          : candidate.content;

        return `
### Resume ${index + 1}: ${candidate.name}
**Email:** ${candidate.email}
**Phone:** ${candidate.phoneNumber}
**Content:**
${truncatedContent}
`;
      })
      .join("\n" + "=".repeat(80) + "\n");

    // Invoke LLM with structured output
    const formattedPrompt = await this.promptTemplate.format({
      query,
      resumesContext,
    });

    console.log(`[${traceId}] [LLM Reranker] Invoking LLM for semantic analysis`);

    try {
      // Call LLM
      const response = await this.model.invoke(formattedPrompt);
      const responseText = typeof response.content === 'string' 
        ? response.content 
        : JSON.stringify(response.content);

      // Parse JSON response
      let parsedResponse: LLMRerankResponse;
      try {
        // Extract JSON from markdown code blocks if present
        const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : responseText;
        const rawJson = JSON.parse(jsonStr.trim());
        parsedResponse = LLMRerankResponseSchema.parse(rawJson);
      } catch (parseError) {
        console.error(`[${traceId}] [LLM Reranker] Failed to parse LLM response:`, parseError);
        console.error(`[${traceId}] [LLM Reranker] Raw response preview:`, responseText.slice(0, 500));
        
        // Fallback: return original results with warning
        return {
          results: candidates,
          llmAnalysis: {
            summary: "Failed to parse LLM response. Returning original vector search results without filtering.",
            matches: candidates.map(c => ({
              name: c.name,
              relevanceScore: c.score,
              reasoning: "LLM parsing failed - using original vector search score",
              matchesCriteria: true,
            })),
          },
        };
      }

      // Filter and re-rank based on LLM analysis
      const rerankedResults: SearchResultItem[] = [];

      for (const match of parsedResponse.matches) {
        // Only include results that match ALL criteria
        if (!match.matchesCriteria) {
          console.log(
            `[${traceId}] [LLM Reranker] ⛔ Filtered out ${match.name} (score: ${match.relevanceScore})`
          );
          console.log(`[${traceId}] [LLM Reranker]    Reason: ${match.reasoning}`);
          continue;
        }

        // Find original candidate by name
        const originalCandidate = candidates.find(c => c.name === match.name);
        if (!originalCandidate) {
          console.warn(`[${traceId}] [LLM Reranker] Warning: ${match.name} not found in original candidates`);
          continue;
        }

        // Create enhanced result with LLM score and metadata
        rerankedResults.push({
          ...originalCandidate,
          score: match.relevanceScore,
          matchType: "llm-reranked" as any,
          // @ts-ignore - Adding extra metadata for response
          llmReasoning: match.reasoning,
          extractedInfo: match.extractedInfo,
        });
      }

      // Sort by LLM relevance score (descending)
      rerankedResults.sort((a, b) => b.score - a.score);

      console.log(
        `[${traceId}] [LLM Reranker] ✅ Results: ${candidates.length} retrieved → ${rerankedResults.length} matched criteria`
      );
      console.log(`[${traceId}] [LLM Reranker] Summary: ${parsedResponse.summary}`);

      return {
        results: rerankedResults,
        llmAnalysis: {
          summary: parsedResponse.summary,
          matches: parsedResponse.matches,
        },
      };
    } catch (error) {
      console.error(`[${traceId}] [LLM Reranker] ❌ Error during LLM analysis:`, error);
      
      // Return original results on error
      return {
        results: candidates,
        llmAnalysis: {
          summary: `Error during LLM analysis: ${error instanceof Error ? error.message : 'Unknown error'}. Returning unfiltered results.`,
          matches: candidates.map(c => ({
            name: c.name,
            relevanceScore: c.score,
            reasoning: "Error during LLM analysis - score from vector search",
            matchesCriteria: true,
          })),
        },
      };
    }
  }
}
