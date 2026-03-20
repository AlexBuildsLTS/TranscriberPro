/**
 * supabase/functions/generate-ai-insights/index.ts
 * Standalone AI insight regeneration using Google Gemini 2.5 Pro.
 * Upserts summary, chapters, key_takeaways, and seo_metadata into ai_insights.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabaseAdmin.ts';

const API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';
serve(async (req: Request) => {
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders });

  try {
    const { language, difficulty } = await req.json();
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error('Missing GEMINI_API_KEY');
    if (!language || !difficulty)
      throw new Error('Missing language or difficulty parameters');

    const { videoId, text } = await req.json();
    if (!videoId || !text)
      throw new Error('Missing videoId or text in request body.');

    const supabase = createAdminClient();

    // 💡 PROMPT IDEA IS : We give the AI a strict JSON schema and explicit instruction
    // to break the text into chronological chapters and write a real summary
    const prompt = `
      You are a senior content analyst. Analyze this YouTube transcript for a ${difficulty} level audience in ${language}.
      
      TASK:
      - Create a 2-paragraph executive summary.
      - Extract a timeline of chapters with timestamps (MM:SS).
      - List 5 key technical takeaways.
      - Generate SEO tags and suggested titles.

      STRICT RULES:
      - No conversational filler.
      - No "Transcript obtained" placeholders.
      - Return valid JSON matching the schema below.

      JSON SCHEMA:
      {
        "summary": "string",
        "chapters": [{"timestamp": "string", "title": "string", "description": "string"}],
        "key_takeaways": ["string"],
        "seo_metadata": {"tags": ["string"], "suggested_titles": ["string"]}
      }

      TRANSCRIPT:
      ${text.substring(0, 35000)}
    `;

    // 4. Call Gemini with Forced JSON Mode
    const geminiRes = await fetch(`${API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1, // Precision over creativity
          maxOutputTokens: 2048,
          response_mime_type: 'application/json', // ENFORCED JSON MODE
        },
      }),
    });

    if (!geminiRes.ok)
      throw new Error(`Gemini API Error: ${await geminiRes.text()}`);

    const geminiData = await geminiRes.json();
    const aiResponseRaw = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiResponseRaw) throw new Error('AI failed to generate content.');
    const ai = JSON.parse(aiResponseRaw);

    // 5. Atomic DB Operations
    const { error: dbError } = await supabase.from('ai_insights').upsert(
      {
        video_id: videoId,
        summary: ai.summary,
        chapters: ai.chapters,
        key_takeaways: ai.key_takeaways,
        seo_metadata: ai.seo_metadata,
        ai_model: 'gemini-2.0-flash',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'video_id' },
    );

    if (dbError) throw new Error(`Database Upsert Failed: ${dbError.message}`);

    // 6. Complete the workflow
    await supabase
      .from('videos')
      .update({ status: 'completed' })
      .eq('id', videoId);

    return new Response(JSON.stringify({ success: true, data: ai }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error('[CRITICAL_ERROR]:', error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
});
