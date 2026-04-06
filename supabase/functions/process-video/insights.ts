/**
 * supabase/functions/process-video/insights.ts
 * Master AI Insights Generation — Gemini 3.1 Flash-Lite [TITAN TIER]
 * ----------------------------------------------------------------------------
 * ARCHITECTURE & PROTOCOLS:
 * 1. STRICT SCHEMA ENFORCEMENT: Guarantees 100% valid JSON payload parsing.
 * 2. NATIVE TRANSLATION MATRIX: Forces flawless native translation of all 
 * output values into the user's selected language, while strictly preserving 
 * English JSON keys to maintain database schema integrity.
 * 3. DYNAMIC CHRONOLOGY: AI autonomously determines chapter count (1-8) 
 * based on raw media length, prioritizing deep, analytical summaries over volume.
 * 4. SURVIVAL PROTOCOL: Exponential backoff handles 503s, 429s, and transient network errors.
 * ----------------------------------------------------------------------------
 */

import { GoogleGenerativeAI, SchemaType, ResponseSchema } from 'npm:@google/generative-ai@^0.24.1';

// ─── INTELLIGENCE SCHEMA DEFINITION ──────────────────────────────────────────
const InsightsSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    summary: {
      type: SchemaType.STRING,
      description:
        'A highly professional, comprehensive executive summary. Must scale dynamically in depth to perfectly cover the core themes, arguments, and conclusions of the entire content. Written with elite analytical precision.',
    },
    conclusion: {
      type: SchemaType.STRING,
      description:
        'A definitive, professional 2-3 sentence concluding synthesis. Distills the single most valuable outcome or lesson from the content. A powerful closing statement.',
    },
    chapters: {
      type: SchemaType.ARRAY,
      description:
        'Between 1 and 8 chronological chapters. The AI must scale this dynamically based on video length. Long videos get fewer, but massively detailed chapters.',
      items: {
        type: SchemaType.OBJECT,
        properties: {
          timestamp: {
            type: SchemaType.STRING,
            description: 'Estimated starting timestamp in MM:SS or HH:MM:SS format.',
          },
          title: {
            type: SchemaType.STRING,
            description: 'A highly professional, engaging title for this specific segment.',
          },
          description: {
            type: SchemaType.STRING,
            description: 'An extensive, deeply accurate explanation of the specific points, arguments, and events covered in this chapter.',
          },
        },
        required: ['timestamp', 'title', 'description'],
      },
    },
    key_takeaways: {
      type: SchemaType.ARRAY,
      description:
        'The absolute most important, profound, and actionable insights extracted from the content. Maximum of 5 to 8 takeaways.',
      items: { type: SchemaType.STRING },
    },
    seo_metadata: {
      type: SchemaType.OBJECT,
      description: 'Highly optimized SEO metadata for content categorization and discovery.',
      properties: {
        tags: {
          type: SchemaType.ARRAY,
          description: 'Highly relevant keywords and topic tags.',
          items: { type: SchemaType.STRING },
        },
        suggested_titles: {
          type: SchemaType.ARRAY,
          description: 'Engaging, highly accurate alternative titles for the overarching content.',
          items: { type: SchemaType.STRING },
        },
        description: {
          type: SchemaType.STRING,
          description: 'A compelling, accurate meta description optimized for search indexing.',
        },
      },
      required: ['tags', 'suggested_titles', 'description'],
    },
  },
  required: ['summary', 'conclusion', 'chapters', 'key_takeaways', 'seo_metadata'],
};

// ─── TYPE DEFINITIONS ────────────────────────────────────────────────────────
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

// ─── UTILITY ENGINES ─────────────────────────────────────────────────────────

/**
 * Extracts clean JSON even if the AI model wraps it in markdown blocks or prepends text.
 */
function extractCleanJson(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end >= start) {
    return text.substring(start, end + 1);
  }
  return text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
}

/**
 * Exponential backoff retry wrapper to survive transient Gemini API errors (503, 429).
 */
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

/**
 * Categorizes the raw transcript by word count to inform the AI's generation depth.
 */
function getContentCategory(transcript: string): 'short' | 'medium' | 'long' {
  const wordCount = transcript.split(/\s+/).length;
  if (wordCount < 1000) return 'short';
  if (wordCount < 5000) return 'medium';
  return 'long';
}

// ─── MAIN GENERATION PIPELINE ────────────────────────────────────────────────

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
      temperature: 0.15, // Ultra-low temperature for maximum factual accuracy and strict adherence
    },
  });

  // Cap at 800k chars to stay safely within Flash-Lite's 1M context window limit
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

    console.log(`[Insights] ✓ Intelligence Generated in ${elapsed}ms | Tokens: ${tokens} | Chapters: ${parsed.chapters?.length ?? 0}`);

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

// ─── PROMPT ENGINEERING CORE ─────────────────────────────────────────────────

function buildPrompt(
  transcript: string,
  language: string,
  difficulty: string,
  category: 'short' | 'medium' | 'long',
): string {
  const difficultyGuides: Record<string, string> = {
    beginner: 'Use highly accessible, clear language. Define any complex terminology simply and accurately.',
    standard: 'Maintain a pristine, professional executive tone. Balance analytical depth with optimal readability.',
    advanced: 'Assume elite domain expertise. Use precise technical or industry-standard terminology. Provide nuanced, forensic-level analysis.',
  };

  const depthGuide = {
    short: 'Write a highly concentrated 2-paragraph summary. Output 1 to 3 distinct chapters based on natural shifts in the content.',
    medium: 'Write an elite 3-4 paragraph executive summary. Output 3 to 6 detailed chapters mapping the chronology.',
    long: 'Write a massive, profound 4-6 paragraph executive summary. Output exactly 5 to 8 major chronological chapters. Do not spam micro-chapters. Group large timeframes into massive, highly detailed chapter descriptions.',
  }[category];

  return `You are an elite, top-tier Senior Intelligence Analyst tasked with producing a flawless, publication-ready dossier.

TASK: Decrypt and analyze the verbatim transcript below to produce perfectly structured, extremely accurate insights.

TARGET OUTPUT LANGUAGE: ${language}
AUDIENCE CALIBRATION: ${difficulty} — ${difficultyGuides[difficulty] ?? difficultyGuides.standard}

CRITICAL TRANSLATION PROTOCOL (MANDATORY):
1. The JSON keys MUST remain in pure English (e.g., "summary", "conclusion", "chapters").
2. ALL string values INSIDE the JSON (the actual generated text, titles, descriptions, takeaways, tags) MUST be translated into ${language} with absolute grammatical perfection and native fluency. 
3. Do not output English content inside the values if the Target Language is not English.

CRITICAL COVERAGE PROTOCOL (MANDATORY):
- You MUST process the narrative from the absolute 00:00 mark to the FINAL WORD of the transcript. Do not stop analyzing halfway through.
- ${depthGuide}
- Prioritize extreme quality and analytical depth over sheer volume. A summary of a chapter should be comprehensive, accurate, and highly professional.

STRICT RULES:
1. Your ENTIRE response must be valid JSON matching the schema exactly.
2. NO markdown formatting outside of the JSON string values. NO preamble.
3. Zero hallucinations. Extract data strictly from the provided text.

VERBATIM TRANSCRIPT:
"""
${transcript}
"""`;
}