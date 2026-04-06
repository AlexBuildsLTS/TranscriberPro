/**
 * supabase/functions/process-video/insights.ts
 * AI Insights Generation — Gemini 3.1 Flash-Lite
 * ----------------------------------------------------------------------------
 * FEATURES:
 * 1. STRICT SCHEMA ENFORCEMENT: Guarantees 100% valid JSON parsing.
 * 2. NATIVE TRANSLATION: Forces the AI to output values in the target language
 * while preserving English JSON keys to prevent database crashes.
 * 3. EXPONENTIAL BACKOFF: Survives 503s, 429s, and transient network errors.
 */

import { GoogleGenerativeAI, SchemaType, ResponseSchema } from 'npm:@google/generative-ai@^0.24.1';

const InsightsSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    summary: {
      type: SchemaType.STRING,
      description:
        'A highly professional, comprehensive executive summary. Dynamically scale the length and depth to adequately cover the core themes, arguments, and conclusions of the provided content. Provide a clear introduction, body, and synthesis. Do not use arbitrary length constraints.',
    },
    conclusion: {
      type: SchemaType.STRING,
      description:
        'A concise, professional 2-3 sentence concluding synthesis. Distill the most important outcome or lesson from this content. What is the single most valuable thing a reader walks away with? Write it as a definitive closing statement, not a summary repetition.',
    },
    chapters: {
      type: SchemaType.ARRAY,
      description:
        'Chronological chapters representing natural topic transitions. Generate as many or as few as the content demands. Do not force chapters if the content is short and cohesive.',
      items: {
        type: SchemaType.OBJECT,
        properties: {
          timestamp: {
            type: SchemaType.STRING,
            description: 'Estimated timestamp in MM:SS or HH:MM:SS format, inferred from the transcript flow.',
          },
          title: {
            type: SchemaType.STRING,
            description: 'A concise, professional title for this segment.',
          },
          description: {
            type: SchemaType.STRING,
            description: 'A detailed explanation of the specific points covered in this chapter.',
          },
        },
        required: ['timestamp', 'title', 'description'],
      },
    },
    key_takeaways: {
      type: SchemaType.ARRAY,
      description:
        'The most important, actionable insights from this content. Extract points that provide genuine value. Let the content dictate the quantity — do not pad or truncate.',
      items: { type: SchemaType.STRING },
    },
    seo_metadata: {
      type: SchemaType.OBJECT,
      description: 'SEO-optimized metadata for content discovery.',
      properties: {
        tags: {
          type: SchemaType.ARRAY,
          description: 'Relevant keywords and topic tags.',
          items: { type: SchemaType.STRING },
        },
        suggested_titles: {
          type: SchemaType.ARRAY,
          description: 'Engaging, highly relevant alternative titles for this content.',
          items: { type: SchemaType.STRING },
        },
        description: {
          type: SchemaType.STRING,
          description: 'A compelling meta description optimized for search results.',
        },
      },
      required: ['tags', 'suggested_titles', 'description'],
    },
  },
  required: ['summary', 'conclusion', 'chapters', 'key_takeaways', 'seo_metadata'],
};

export type InsightsResult = {
  model: string;
  summary: string;
  conclusion: string;
  chapters: { timestamp: string; title: string; description: string }[];
  key_takeaways: string[];
  seo_metadata: {
    tags: string[];
    suggested_titles: string[];
    description: string;
  };
  tokens_used: number;
};

// Extracts clean JSON even if Gemini wraps it in markdown or extra text
function extractCleanJson(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end >= start) {
    return text.substring(start, end + 1);
  }
  return text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
}

// Exponential backoff retry for transient Gemini errors (503, 429)
async function withRetry<T>(operation: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let attempt = 0;
  while (attempt < maxAttempts) {
    try {
      return await operation();
    } catch (err: unknown) {
      attempt++;
      if (attempt >= maxAttempts) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Insights:Retry] Attempt ${attempt}/${maxAttempts} failed: ${msg}`);
      await new Promise(r => setTimeout(r, 1500 * Math.pow(2, attempt - 1)));
    }
  }
  throw new Error('Retry loop exhausted.');
}

function getContentCategory(transcript: string): 'short' | 'medium' | 'long' {
  const wordCount = transcript.split(/\s+/).length;
  if (wordCount < 1000) return 'short';
  if (wordCount < 5000) return 'medium';
  return 'long';
}

export async function generateInsights(
  transcript: string,
  language: string,
  difficulty: string,
): Promise<InsightsResult> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_CONFIG_ERROR: Gemini API key is not configured.');

  const category = getContentCategory(transcript);
  const targetModel = 'gemini-3.1-flash-lite-preview';

  console.log(`[Insights] Model: ${targetModel} | Target Language: ${language} | Category: ${category}`);

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: targetModel,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: InsightsSchema,
      temperature: 0.2, // Low temperature for high factual accuracy
    },
  });

  // Cap at 800k chars to stay safely within Flash-Lite context window limits
  const safeTranscript = transcript.length > 800000
    ? transcript.substring(0, 800000)
    : transcript;

  const prompt = buildPrompt(safeTranscript, language, difficulty, category);

  try {
    const startTime = Date.now();

    const result = await withRetry(() => model.generateContent(prompt));

    const responseText = result.response.text();
    if (!responseText) throw new Error('EMPTY_RESPONSE: Gemini returned no content.');

    const parsed = JSON.parse(extractCleanJson(responseText));

    const elapsed = Date.now() - startTime;
    const tokens = result.response.usageMetadata?.totalTokenCount ?? 0;

    console.log(`[Insights] ✓ Generated in ${elapsed}ms | Tokens: ${tokens} | Chapters: ${parsed.chapters?.length ?? 0}`);

    return {
      model: targetModel,
      summary: parsed.summary ?? '',
      conclusion: parsed.conclusion ?? '',
      chapters: Array.isArray(parsed.chapters) ? parsed.chapters : [],
      key_takeaways: Array.isArray(parsed.key_takeaways) ? parsed.key_takeaways : [],
      seo_metadata: parsed.seo_metadata ?? { tags: [], suggested_titles: [], description: '' },
      tokens_used: tokens,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Insights:FATAL]', msg);
    throw new Error(`INSIGHTS_GENERATION_FAILED: ${msg}`);
  }
}

function buildPrompt(
  transcript: string,
  language: string,
  difficulty: string,
  category: 'short' | 'medium' | 'long',
): string {
  const difficultyGuides: Record<string, string> = {
    beginner: 'Use accessible language. Define technical terms clearly. Explain concepts as if to an eager beginner.',
    standard: 'Balance clarity with professional precision. Briefly explain specialized terminology when it appears.',
    advanced: 'Use precise technical, industry-standard language. Assume high domain expertise. Focus on nuanced, high-level insights.',
  };

  const depthGuide = {
    short: 'Write 2-3 substantial paragraphs for the summary. Chapters are optional unless clear topic shifts exist.',
    medium: 'Write 3-4 paragraphs for the summary. Extract 3-6 distinct chapters.',
    long: 'Write a comprehensive 4-5 paragraph executive summary. Extract 6-12 distinct, highly navigable chapters.',
  }[category];

  return `You are an elite executive content analyst producing a publication-ready intelligence brief.

TASK: Analyze the transcript below and produce beautifully structured, high-value insights.

TARGET OUTPUT LANGUAGE: ${language}
AUDIENCE: ${difficulty} — ${difficultyGuides[difficulty] ?? difficultyGuides.standard}

CRITICAL TRANSLATION RULE:
- The JSON keys MUST remain in English (exactly as defined in the schema: "summary", "conclusion", "chapters", etc.).
- ALL string values inside the JSON (the actual summary, titles, descriptions, takeaways, tags) MUST be natively written and perfectly translated into ${language}.
- Write with the authority, grammar, and polish of a native-speaking senior analyst in ${language}.

GUIDELINES:
- ${depthGuide}
- Scale your response naturally to the depth and length of the transcript. Do not cut it short artificially.
- The "conclusion" field must be exactly 2-3 sentences — a definitive, high-value closing statement that leaves a lasting impact. Do NOT just repeat the summary.
- Extract highly meaningful, actionable key takeaways. Skip generic filler.
- Chapter timestamps must be sequentially estimated from the narrative flow of the transcript.
- All SEO fields must be highly engaging and relevant to the content.

STRICT RULES:
1. Your ENTIRE response must be valid JSON matching the schema exactly.
2. NO markdown, NO preamble, NO "Here is the analysis..." text.
3. Do not invent facts or hallucinate details not present in the transcript.

TRANSCRIPT:
"""
${transcript}
"""`;
}