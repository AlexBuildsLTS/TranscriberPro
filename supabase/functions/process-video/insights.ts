/**
 * process-video/insights.ts
 * Gemini 2.5 Pro AI insights generation
 */

const API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent';

interface InsightsResult {
  model: string;
  summary: string;
  chapters: unknown[];
  key_takeaways: string[];
  seo_metadata: unknown;
}

export async function generateInsights(
  transcript: string,
  language: string,
  difficulty: string,
): Promise<InsightsResult> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    // Return placeholder if no API key
    return {
      model: 'none',
      summary:
        'Transcript obtained. AI insights generation skipped (no API key).',
      chapters: [],
      key_takeaways: [],
      seo_metadata: { tags: [], suggested_titles: [], description: '' },
    };
  }

  const prompt = buildPrompt(transcript, language, difficulty);

  const res = await fetch(`${API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        { parts: [{ text: buildPrompt(transcript, language, difficulty) }] },
      ],
      systemInstruction: {
        parts: [
          {
            text: 'You are an elite video strategist. Your summaries are used by CEOs and top creators. Be concise, insightful, and formatting-perfect.',
          },
        ],
      },
      generationConfig: {
        temperature: 0.2, // Slightly higher for better 'creative' professional writing
        maxOutputTokens: 4096, // Increased for long-video chapters
        responseMimeType: 'application/json',
      },
    }),
    signal: AbortSignal.timeout(90_000), // Upped to 90s for 1-hour videos
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini error (${res.status}): ${body.substring(0, 300)}`);
  }

  const data = await res.json();
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  if (!rawText) {
    throw new Error('Gemini returned empty response');
  }

  const parsed = JSON.parse(rawText.replace(/```json|```/g, '').trim());

  return {
    model: 'gemini-2.5-pro',
    summary: parsed.summary || 'AI-generated summary',
    chapters: parsed.chapters || [],
    key_takeaways: parsed.key_takeaways || [],
    seo_metadata: parsed.seo_metadata || {
      tags: [],
      suggested_titles: [],
      description: '',
    },
  };
}

function buildPrompt(
  transcript: string,
  language: string,
  difficulty: string,
): string {
  const difficultyMap: Record<string, string> = {
    beginner:
      'Use simple language, avoid jargon. Explain concepts as if teaching a complete beginner.',
    standard:
      'Use clear, professional language. Balance technical accuracy with accessibility.',
    advanced:
      'Use precise technical terminology. Assume expert-level knowledge in the subject matter.',
  };

  const difficultyGuide = difficultyMap[difficulty] || difficultyMap.standard;

  return `
You are a senior content analyst. Analyze this transcript for a ${difficulty} level audience.
Output language: ${language}
${difficultyGuide}

TASK:
- Create a 2-paragraph executive summary
- Extract chronological chapters with timestamps (MM:SS format)
- List 5 key technical takeaways
- Generate SEO tags and suggested titles

STRICT RULES:
- No conversational filler
- No "Transcript obtained" placeholders
- Return valid JSON matching the schema below
- All text MUST be in ${language}

JSON SCHEMA:
{
  "summary": "string",
  "chapters": [{"timestamp": "MM:SS", "title": "string", "description": "string"}],
  "key_takeaways": ["string"],
  "seo_metadata": {
    "tags": ["string"],
    "suggested_titles": ["string"],
    "description": "string"
  }
}

TRANSCRIPT:
${transcript}
`;
}
