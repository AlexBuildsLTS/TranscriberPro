/**
 * generate-ai-insights/index.ts — Standalone AI Insight Generator
 * Uses Anthropic Claude Messages API (migrated from Gemini).
 * Supports upsert for regeneration.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabaseAdmin.ts';

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-4-20250514';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY in environment.');

    const { videoId, text } = await req.json();
    if (!videoId || !text) throw new Error('Missing videoId or text payload.');

    const supabase = createAdminClient();

    const prompt = `You are an expert SEO analyst. Analyze this YouTube transcript.
Return ONLY valid JSON, no markdown, no backticks.
{"summary":"2-paragraph summary","chapters":[{"time":"00:00","title":"Intro"}],"seo_metadata":{"tags":["t1"],"suggested_titles":["T1"],"description":"SEO desc"}}
Transcript:
${text.substring(0, 28000)}`;

    const claudeRes = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 2048,
        temperature: 0.2,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!claudeRes.ok)
      throw new Error(
        `Claude Error (${claudeRes.status}): ${await claudeRes.text()}`,
      );

    const claudeData = await claudeRes.json();
    let rawText =
      claudeData.content?.find((b: any) => b.type === 'text')?.text || '{}';
    rawText = rawText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    const aiData = JSON.parse(rawText);

    const { error: dbError } = await supabase.from('ai_insights').upsert(
      {
        video_id: videoId,
        summary: aiData.summary || 'N/A',
        chapters: aiData.chapters || [],
        seo_metadata: aiData.seo_metadata || {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'video_id' },
    );

    if (dbError) throw new Error(`DB Error: ${dbError.message}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[Claude Edge Error]:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
