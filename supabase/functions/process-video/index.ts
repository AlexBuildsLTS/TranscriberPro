/**
 * process-video/index.ts
 * Main orchestrator - uses modular services
 *
 * Pipeline:
 * 1. FAST PATH: Caption extraction (getCaptions) - milliseconds, no IP blocking
 * 2. SLOW FALLBACK: Audio + Deepgram STT - only if captions unavailable
 * 3. AI Insights: Gemini (generateInsights) - full quality chapters/summaries
 */
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

// Use Deno.serve() - NOT deprecated serve() import
Deno.serve(async (req: Request) => {
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
      log.info(`Status → ${status}`);
    } catch (e) {
      log.warn('Status update failed:', e);
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
    log.info('════════════════════════════════════════════════════════════');
    log.info(`Starting: videoId=${videoId}`);
    log.info(`YouTube ID: ${ytId || 'Not a YouTube URL'}`);
    log.info(`Language: ${language}, Difficulty: ${difficulty}`);
    log.info('════════════════════════════════════════════════════════════');

    await updateStatus('downloading');

    // ══════════════════════════════════════════════════════════════════════
    // PHASE 1: CAPTION EXTRACTION (FAST PATH)
    // Tries: timedtext → watch page scrape → invidious → rapidapi → innertube
    // This bypasses YouTube's datacenter IP blocking - fetches TEXT not media
    // ══════════════════════════════════════════════════════════════════════
    let transcriptText: string | null = clientTranscript ?? null;
    let transcriptJson: unknown = clientTranscript
      ? { source: 'client', text: clientTranscript }
      : null;
    let method = clientTranscript ? 'client' : 'unknown';

    if (!transcriptText && ytId) {
      log.info('PHASE 1: Extracting captions (FAST PATH)...');
      const captionResult = await getCaptions(ytId);
      if (captionResult) {
        transcriptText = captionResult.text;
        transcriptJson = captionResult.json;
        method = captionResult.method;
        log.info(
          `PHASE 1 ✓ SUCCESS: ${method} (${transcriptText.length} chars)`,
        );
      } else {
        log.info('PHASE 1: No captions found, proceeding to audio fallback...');
      }
    }

    // ══════════════════════════════════════════════════════════════════════
    // PHASE 2: DEEPGRAM STT (SLOW FALLBACK)
    // Only runs if captions failed - tries: RapidAPI → Innertube → Piped → Invidious
    // Then sends audio URL to Deepgram Nova-2 for transcription
    // ══════════════════════════════════════════════════════════════════════
    if (!transcriptText && ytId) {
      log.info('PHASE 2: Starting Deepgram STT pipeline...');
      await updateStatus('transcribing');

      log.info('PHASE 2: Resolving audio URL...');
      const audioUrl = await getAudioUrl(videoUrl, ytId);
      log.info('PHASE 2: Audio URL resolved, sending to Deepgram Nova-2...');

      const deepgramResult = await transcribeAudio(audioUrl);
      transcriptText = deepgramResult.text;
      transcriptJson = deepgramResult.json;
      method = 'deepgram';
      log.info(`PHASE 2 ✓ SUCCESS: Deepgram (${transcriptText.length} chars)`);
    }

    // Validate transcript
    if (!transcriptText || transcriptText.length < 50) {
      throw new Error(
        'All transcription methods failed - no captions available and audio extraction blocked',
      );
    }

    // ══════════════════════════════════════════════════════════════════════
    // SAVE TRANSCRIPT TO DATABASE
    // ══════════════════════════════════════════════════════════════════════
    log.info('Saving transcript to database...');
    const { error: tErr } = await supabase.from('transcripts').insert({
      video_id: videoId,
      transcript_text: transcriptText,
      transcript_json: transcriptJson,
      confidence_score: method.includes('deepgram') ? 0.95 : 1.0,
      language_code: 'en',
      extraction_method: method,
    });

    if (tErr) {
      log.error('Transcript save failed:', tErr.message);
      throw new Error(`Database error: ${tErr.message}`);
    }
    log.info('✓ Transcript saved');

    // ══════════════════════════════════════════════════════════════════════
    // PHASE 3: AI INSIGHTS (Gemini - full quality)
    // Uses your existing insights.ts with intelligent chapter generation
    // ══════════════════════════════════════════════════════════════════════
    await updateStatus('ai_processing');
    log.info('PHASE 3: Generating AI insights via Gemini...');

    const insights = await generateInsights(
      transcriptText,
      language,
      difficulty,
    );
    log.info(
      `PHASE 3 ✓ SUCCESS: ${insights.chapters?.length || 0} chapters, ${insights.key_takeaways?.length || 0} takeaways`,
    );

    log.info('Saving AI insights to database...');
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

    if (iErr) {
      log.warn('AI insights save warning:', iErr.message);
    } else {
      log.info('✓ AI insights saved');
    }

    // ══════════════════════════════════════════════════════════════════════
    // COMPLETE
    // ══════════════════════════════════════════════════════════════════════
    await updateStatus('completed');
    log.info('════════════════════════════════════════════════════════════');
    log.info(`✓ COMPLETE: method=${method}, chars=${transcriptText.length}`);
    log.info('════════════════════════════════════════════════════════════');

    return new Response(
      JSON.stringify({
        success: true,
        video_id: videoId,
        method,
        transcript_length: transcriptText.length,
        has_insights: insights.model !== 'none',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    log.error('════════════════════════════════════════════════════════════');
    log.error('FATAL:', message);
    log.error('════════════════════════════════════════════════════════════');

    if (videoId) {
      await updateStatus('failed', message.substring(0, 250));
    }

    return new Response(JSON.stringify({ success: false, error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // Return 200 so client can read error
    });
  }
});
