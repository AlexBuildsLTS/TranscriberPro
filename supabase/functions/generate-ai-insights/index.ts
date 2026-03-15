import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabaseAdmin.ts';

const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

    const { videoId, text } = await req.json();
    if (!videoId || !text) throw new Error('Missing videoId or text payload');

    const supabase = createAdminClient();

    // 1. Construct the Gemini Prompt
    const prompt = `
      You are an expert SEO analyst and copywriter. Analyze the following YouTube transcript.
      Return ONLY a valid JSON object with no markdown formatting or backticks.
      
      Required JSON structure:
      {
        "summary": "A highly engaging 2-paragraph summary of the video.",
        "chapters": [
          { "time": "00:00", "title": "Introduction" }
        ],
        "seo_metadata": {
          "tags": ["tag1", "tag2"],
          "suggested_titles": ["Title 1", "Title 2"],
          "description": "An SEO-optimized YouTube video description."
        }
      }

      Transcript: ${text.substring(0, 30000)}
    `;

    // 2. Call Gemini API
    const geminiResp = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
      }),
    });

    if (!geminiResp.ok) {
      const errText = await geminiResp.text();
      throw new Error(`Gemini API Error: ${errText}`);
    }

    const geminiData = await geminiResp.json();
    let rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    // 3. Clean the JSON output aggressively
    rawText = rawText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const aiData = JSON.parse(rawText);

    // 4. Save to Database
    const { error: dbError } = await supabase.from('ai_insights').insert({
      video_id: videoId,
      summary: aiData.summary,
      chapters: aiData.chapters,
      seo_metadata: aiData.seo_metadata,
    });

    if (dbError) throw new Error(`Database Error: ${dbError.message}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[Gemini Edge Error]:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
