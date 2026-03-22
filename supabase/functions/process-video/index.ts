/**
 * process-video/index.ts
 * Main orchestrator - delegates to modular services
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabaseAdmin.ts';
import { extractYouTubeId } from './utils.ts';
import { getCaptions } from './captions.ts';
import { getAudioUrl } from './audio.ts';
import { transcribeAudio } from './deepgram.ts';
import { generateInsights } from './insights.ts';

const log = {
  info: (...args: unknown[]) => console.log('[process-video]', ...args),
  warn: (...args: unknown[]) => console.warn('[process-video]', ...args),
  error: (...args: unknown[]) => console.error('[process-video]', ...args),
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createAdminClient();
  let videoId: string | null = null;

  const updateStatus = async (status: string, error?: string) => {
    if (!videoId) return;
    try {
      await supabase
        .from('videos')
        .update({
          status,
          error_message: error ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', videoId);
    } catch (_) {
      /* non-fatal */
    }
  };

  try {
    const body = await req.json();
    videoId = body.video_id;
    const videoUrl: string = body.video_url ?? body.youtube_url;
    const language: string = body.language ?? 'english';
    const difficulty: string = body.difficulty ?? 'standard';
    const clientTranscript: string | undefined = body.transcript_text;

    if (!videoId || !videoUrl) {
      return new Response(
        JSON.stringify({ error: 'video_id and video_url required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      );
    }

    const ytId = extractYouTubeId(videoUrl);
    log.info(`Start - videoId=${videoId} ytId=${ytId}`);

    await updateStatus('downloading');

    // ── PHASE 1: Caption Extraction ─────────────────────────────────────────
    let transcriptText: string | null = clientTranscript ?? null;
    let transcriptJson: unknown = clientTranscript
      ? { source: 'client', text: clientTranscript }
      : null;
    let method = clientTranscript ? 'client' : 'unknown';

    if (!transcriptText && ytId) {
      log.info('Phase1 - Extracting captions');
      const captionResult = await getCaptions(ytId);
      if (captionResult) {
        transcriptText = captionResult.text;
        transcriptJson = captionResult.json;
        method = captionResult.method;
      }
    }

    // ── PHASE 2: Deepgram STT ───────────────────────────────────────────────
    if (!transcriptText) {
      log.info('Phase2 - Starting Deepgram STT');
      await updateStatus('transcribing');

      const audioUrl = await getAudioUrl(videoUrl, ytId);
      log.info('Phase2 - Audio resolved, sending to Deepgram');

      const deepgramResult = await transcribeAudio(audioUrl);
      transcriptText = deepgramResult.text;
      transcriptJson = deepgramResult.json;
      method = 'deepgram';
      log.info(`Phase2 - Deepgram success: ${transcriptText.length}c`);
    }

    if (!transcriptText || transcriptText.length < 50) {
      throw new Error('All transcription methods failed');
    }

    // ── SAVE TRANSCRIPT ─────────────────────────────────────────────────────
    await updateStatus('transcribing');
    const { error: tErr } = await supabase.from('transcripts').insert({
      video_id: videoId,
      transcript_text: transcriptText,
      transcript_json: transcriptJson,
      confidence_score: method.includes('caption') ? 1.0 : 0.95,
      language_code: 'en',
    });

    if (tErr) throw new Error(`Transcript save failed: ${tErr.message}`);

    // ── PHASE 3: AI Insights ────────────────────────────────────────────────
    await updateStatus('ai_processing');
    log.info('Phase3 - Generating AI insights');

    const insights = await generateInsights(
      transcriptText,
      language,
      difficulty,
    );

    const { error: iErr } = await supabase.from('ai_insights').upsert(
      {
        video_id: videoId,
        ai_model: insights.model,
        language,
        summary: insights.summary,
        chapters: insights.chapters,
        key_takeaways: insights.key_takeaways,
        seo_metadata: insights.seo_metadata,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'video_id' },
    );

    if (iErr) throw new Error(`AI insights save failed: ${iErr.message}`);

    await updateStatus('completed');
    log.info(`Done - videoId=${videoId} method=${method}`);

    return new Response(
      JSON.stringify({ success: true, video_id: videoId, method }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    log.error('FATAL:', message);
    if (videoId) await updateStatus('failed', message.substring(0, 250));

    return new Response(JSON.stringify({ success: false, error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  }
});
