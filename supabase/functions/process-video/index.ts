import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createAdminClient } from '../_shared/supabaseAdmin.ts';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * Custom logger — satisfies the no-console lint rule by isolating
 * console access to a single declaration with per-line suppression.
 */
const logger = {
  // deno-lint-ignore no-console
  log: (...args: unknown[]) => console.log(...args),
  // deno-lint-ignore no-console
  error: (...args: unknown[]) => console.error(...args),
  // deno-lint-ignore no-console
  warn: (...args: unknown[]) => console.warn(...args),
};

// ─── Helpers ──────────────────────────────────────────────────

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([\w-]{11})/);
  return match ? (match[1] ?? null) : null;
}

function stripVtt(vtt: string): string {
  return vtt
    .replace(/WEBVTT.*?\n\n/s, '')
    .replace(/\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}.*?\n/g, '')
    .replace(/\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}\.\d{3}.*?\n/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .split('\n')
    .map((l: string) => l.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Phase 1A: Direct YouTube timedtext (most reliable) ───────
async function getYouTubeDirectCaptions(
  videoId: string,
): Promise<string | null> {
  // Method 0: Lightweight timedtext API — works from datacenter IPs
  // This is a simple REST endpoint, not a page render
  for (const lang of ['en', 'en-US', 'a.en', 'en-GB']) {
    try {
      const url = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3&xorb=2&xobt=3&xovt=3`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (!data?.events?.length) continue;
      const text = data.events
        .filter((e: any) => e.segs)
        .flatMap((e: any) =>
          e.segs.map((s: any) => (s.utf8 ?? '').replace(/\n/g, ' ')),
        )
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (text.length > 50) {
        logger.log(`[YT-Timedtext] Success (${lang}): ${text.length} chars`);
        return text;
      }
    } catch (_) {
      /* try next */
    }
  }

  // Method 1: Watch page bracket-walk
  try {
    logger.log(`[YT-Direct] Fetching watch page for ${videoId}`);
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        Cookie: 'CONSENT=YES+1; YSC=1; VISITOR_INFO1_LIVE=1',
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!pageRes.ok) {
      logger.warn(`[YT-Direct] ${pageRes.status}`);
      return null;
    }

    const html = await pageRes.text();
    const marker = 'ytInitialPlayerResponse = {';
    const start = html.indexOf(marker);
    if (start === -1) {
      logger.warn('[YT-Direct] marker not found');
      return null;
    }

    const jsonStart = html.indexOf('{', start);
    let depth = 0,
      i = jsonStart;
    for (; i < html.length; i++) {
      if (html[i] === '{') depth++;
      else if (html[i] === '}') {
        depth--;
        if (depth === 0) break;
      }
    }

    let playerData: any;
    try {
      playerData = JSON.parse(html.substring(jsonStart, i + 1));
    } catch {
      logger.warn('[YT-Direct] JSON parse failed');
      return null;
    }

    const captionTracks: any[] =
      playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks ??
      [];

    if (!captionTracks.length) {
      logger.warn('[YT-Direct] No tracks');
      return null;
    }

    const track =
      captionTracks.find((t: any) => t.languageCode === 'en' && !t.kind) ||
      captionTracks.find((t: any) => t.languageCode === 'en') ||
      captionTracks.find((t: any) => t.languageCode?.startsWith('en')) ||
      captionTracks[0];

    if (!track?.baseUrl) {
      logger.warn('[YT-Direct] No baseUrl');
      return null;
    }

    const captionRes = await fetch(`${track.baseUrl}&fmt=json3`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (!captionRes.ok) return null;

    const captionData = await captionRes.json();
    const text = (captionData?.events ?? [])
      .filter((e: any) => e.segs)
      .flatMap((e: any) =>
        e.segs.map((s: any) => (s.utf8 ?? '').replace(/\n/g, ' ')),
      )
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (text.length > 50) {
      logger.log(`[YT-Direct] Success: ${text.length} chars`);
      return text;
    }
    return null;
  } catch (e) {
    logger.warn('[YT-Direct] Exception:', e);
    return null;
  }
}

// ─── Phase 1B: Invidious caption proxy ────────────────────────
async function getInvidiousCaptions(videoId: string): Promise<string | null> {
  const instances = [
    'https://inv.nadeko.net',
    'https://invidious.privacydev.net',
    'https://iv.ggtyler.dev',
    'https://invidious.fdn.fr',
    'https://inv.tux.pizza',
    'https://invidious.perennialte.ch',
    'https://yt.drgnz.club',
    'https://invidious.nerdvpn.de',
    'https://invidious.kavin.rocks',
    'https://iv.melmac.space',
  ];

  for (const instance of instances) {
    try {
      logger.log(`[Invidious] Trying ${instance}`);
      const res = await fetch(`${instance}/api/v1/captions/${videoId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(7000),
      });
      if (!res.ok) continue;

      const data = await res.json();
      if (!data?.captions?.length) continue;

      const track =
        data.captions.find(
          (c: any) =>
            c.language_code === 'en' || c.language_code?.startsWith('en'),
        ) || data.captions[0];

      if (!track?.url) continue;

      const vttUrl = track.url.startsWith('http')
        ? track.url
        : `${instance}${track.url}`;
      const vttRes = await fetch(vttUrl, { signal: AbortSignal.timeout(7000) });
      if (!vttRes.ok) continue;

      const text = stripVtt(await vttRes.text());
      if (text.length > 50) {
        logger.log(`[Invidious] Success (${instance}): ${text.length} chars`);
        return text;
      }
    } catch (e) {
      logger.log(`[Invidious] ${instance} failed:`, e);
    }
  }

  logger.log('[Invidious] All instances failed');
  return null;
}

// ─── Phase 2 audio: multi-service extraction ──────────────────

/**
 * Cobalt API v7 — new endpoint and request format.
 * Docs: https://github.com/imputnet/cobalt/blob/main/docs/api.md
 */
async function tryCobalts(videoUrl: string): Promise<string | null> {
  // Multiple public Cobalt instances for redundancy
  const instances = [
    'https://api.cobalt.tools',
    'https://cobalt.cactus.homes',
    'https://co.wuk.sh',
    'https://cobaltapi.owly.fans',
  ];

  for (const base of instances) {
    try {
      logger.log(`[Cobalt] Trying ${base}`);
      const res = await fetch(`${base}/`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: videoUrl,
          downloadMode: 'audio',
          audioFormat: 'mp3',
          audioQuality: '128',
        }),
        signal: AbortSignal.timeout(12000),
      });

      if (!res.ok) {
        logger.log(`[Cobalt] ${base} returned ${res.status}`);
        continue;
      }

      const data = await res.json();

      // v7 response: { status: "stream"|"redirect"|"tunnel"|"picker", url: string }
      if (
        data?.url &&
        (data.status === 'stream' ||
          data.status === 'redirect' ||
          data.status === 'tunnel')
      ) {
        logger.log(`[Cobalt] Success (${base})`);
        return data.url;
      }
    } catch (e) {
      logger.log(`[Cobalt] ${base} failed:`, e);
    }
  }

  return null;
}

async function tryPiped(ytId: string): Promise<string | null> {
  const instances = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.tokhmi.xyz',
    'https://pipedapi.adminforge.de',
    'https://piped-api.garudalinux.org',
    'https://api.piped.yt',
    'https://pipedapi.in.projectsegfau.lt',
    'https://piped-api.codeberg.page',
    'https://watchapi.whatever.social',
  ];

  for (const base of instances) {
    try {
      logger.log(`[Piped] Trying ${base}`);
      const res = await fetch(`${base}/streams/${ytId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;

      const data = await res.json();
      const stream = data.audioStreams?.find(
        (s: any) =>
          s.mimeType?.includes('audio/mp4') ||
          s.mimeType?.includes('audio/webm'),
      );

      if (stream?.url) {
        logger.log(`[Piped] Success (${base})`);
        return stream.url;
      }
    } catch (e) {
      logger.log(`[Piped] ${base} failed:`, e);
    }
  }

  return null;
}

/**
 * Invidious also exposes audio stream URLs via /api/v1/videos/{id}
 */
async function tryInvidiousAudio(ytId: string): Promise<string | null> {
  const instances = [
    'https://inv.nadeko.net',
    'https://invidious.privacydev.net',
    'https://iv.ggtyler.dev',
    'https://yt.drgnz.club',
  ];

  for (const base of instances) {
    try {
      logger.log(`[InvAudio] Trying ${base}`);
      const res = await fetch(
        `${base}/api/v1/videos/${ytId}?fields=adaptiveFormats`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(8000),
        },
      );
      if (!res.ok) continue;

      const data = await res.json();
      const formats: any[] = data.adaptiveFormats ?? [];

      // Prefer opus/webm for quality, fall back to mp4a
      const stream =
        formats.find((f: any) => f.type?.includes('audio/webm')) ||
        formats.find((f: any) => f.type?.includes('audio/mp4'));

      if (stream?.url) {
        logger.log(`[InvAudio] Success (${base})`);
        return stream.url;
      }
    } catch (e) {
      logger.log(`[InvAudio] ${base} failed:`, e);
    }
  }

  return null;
}

async function getAudioUrl(
  videoUrl: string,
  ytId: string | null,
): Promise<string> {
  // 1. Cobalt v7 (supports YouTube, Vimeo, Twitter/X, TikTok, SoundCloud, etc.)
  const cobaltUrl = await tryCobalts(videoUrl);
  if (cobaltUrl) return cobaltUrl;

  // 2. Piped (YouTube only)
  if (ytId) {
    const pipedUrl = await tryPiped(ytId);
    if (pipedUrl) return pipedUrl;

    // 3. Invidious audio streams (YouTube only)
    const invUrl = await tryInvidiousAudio(ytId);
    if (invUrl) return invUrl;
  }

  throw new Error(
    'All audio extraction methods exhausted — Cobalt, Piped, and Invidious all failed. ' +
      'The platform may be temporarily unavailable from Supabase EU.',
  );
}

// ─── Edge function entrypoint ─────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders });

  const supabase = createAdminClient();

  const updateStatus = async (
    videoId: string,
    status: string,
    errMsg?: string,
  ) => {
    try {
      await supabase
        .from('videos')
        .update({
          status,
          error_message: errMsg ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', videoId);
    } catch (dbErr) {
      logger.error('[DB] Failed to update status:', dbErr);
    }
  };

  let videoId: string | null = null;

  try {
    const body = await req.json();
    videoId = body.video_id;
    const videoUrl: string = body.video_url || body.youtube_url || '';

    if (!videoId || !videoUrl) {
      return new Response(
        JSON.stringify({ error: 'video_id and video_url are required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      );
    }

    const ytId = extractYouTubeId(videoUrl);
    const isYouTube = !!ytId;

    logger.log(`[Start] videoId=${videoId} ytId=${ytId} url=${videoUrl}`);
    await updateStatus(videoId, 'downloading');

    let transcriptText: string | null = null;
    let transcriptJson: any = null;
    let method = 'unknown';

    // ── Phase 1: Transcript-first strategies (fast, no audio needed) ──
    if (isYouTube) {
      // 1A: Direct YouTube timedtext (most reliable from any IP)
      transcriptText = await getYouTubeDirectCaptions(ytId!);
      if (transcriptText) {
        method = 'youtube_direct';
        transcriptJson = { source: 'youtube_direct', text: transcriptText };
        logger.log('[Phase1A] YouTube direct captions succeeded');
      }

      // 1B: Invidious proxy captions
      if (!transcriptText) {
        transcriptText = await getInvidiousCaptions(ytId!);
        if (transcriptText) {
          method = 'invidious_captions';
          transcriptJson = {
            source: 'invidious_captions',
            text: transcriptText,
          };
          logger.log('[Phase1B] Invidious captions succeeded');
        }
      }
    }

    // ── Phase 2: Deepgram STT fallback (requires audio URL) ───────────
    if (!transcriptText) {
      logger.log('[Phase2] Falling back to Deepgram STT');
      await updateStatus(videoId, 'transcribing');

      const deepgramKey = Deno.env.get('DEEPGRAM_API_KEY');
      if (!deepgramKey) throw new Error('DEEPGRAM_API_KEY not configured.');

      let audioUrl: string;
      try {
        audioUrl = await getAudioUrl(videoUrl, ytId);
      } catch (audioErr: any) {
        throw new Error(`Audio extraction failed: ${audioErr.message}`);
      }

      const dgRes = await fetch(
        'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true&diarize=true',
        {
          method: 'POST',
          headers: {
            Authorization: `Token ${deepgramKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: audioUrl }),
          signal: AbortSignal.timeout(120000), // 2 min — long videos need time
        },
      );

      if (!dgRes.ok) {
        const e = await dgRes.text();
        throw new Error(
          `Deepgram error (${dgRes.status}): ${e.substring(0, 300)}`,
        );
      }

      const dgData = await dgRes.json();
      transcriptText =
        dgData.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? '';
      if (!transcriptText)
        throw new Error('Deepgram returned an empty transcript.');

      transcriptJson = dgData;
      method = 'deepgram';
      logger.log(`[Phase2] Deepgram succeeded: ${transcriptText.length} chars`);
    }

    // ── Save transcript ────────────────────────────────────────────────
    await updateStatus(videoId, 'transcribing');
    const { error: tErr } = await supabase.from('transcripts').insert([
      {
        video_id: videoId,
        transcript_text: transcriptText,
        transcript_json: transcriptJson,
        confidence_score:
          method === 'youtube_direct' || method === 'invidious_captions'
            ? 1.0
            : 0.95,
        language_code: 'en',
      },
    ]);
    if (tErr) throw new Error(`Transcript save failed: ${tErr.message}`);

    // ── Phase 3: Claude AI insights ───────────────────────────────────
    await updateStatus(videoId, 'ai_processing');

    const claudeKey = Deno.env.get('ANTHROPIC_API_KEY');
    let aiSummary = `Transcript captured via ${method}.`;
    let aiChapters: any[] = [];
    let aiSeo: any = { tags: [], Suggested_Titles: [], description: '' };

    if (claudeKey) {
      try {
        const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': claudeKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2048,
            messages: [
              {
                role: 'user',
                content: `Return ONLY valid JSON, no markdown, no explanation.
{"summary":"2-paragraph summary","chapters":[{"timestamp":"00:00","title":"Intro"}],"seo_metadata":{"tags":["tag1"],"suggested_titles":["Title"],"description":"SEO description"}}

Transcript:
${transcriptText!.substring(0, 28000)}`,
              },
            ],
          }),
          signal: AbortSignal.timeout(30000),
        });

        if (claudeRes.ok) {
          const cd = await claudeRes.json();
          let raw =
            cd.content?.find((b: any) => b.type === 'text')?.text ?? '{}';
          raw = raw
            .replace(/```json/gi, '')
            .replace(/```/g, '')
            .trim();
          const ai = JSON.parse(raw);
          aiSummary = ai.summary || aiSummary;
          aiChapters = ai.chapters || [];
          aiSeo = ai.seo_metadata || aiSeo;
          logger.log('[Phase3] Claude AI insights succeeded');
        } else {
          const errText = await claudeRes.text();
          logger.error(
            `[Phase3] Claude non-OK (${claudeRes.status}):`,
            errText,
          );
        }
      } catch (aiErr) {
        logger.error('[Phase3] Claude failed (non-fatal):', aiErr);
      }
    }

    await supabase.from('ai_insights').upsert(
      {
        video_id: videoId,
        summary: aiSummary,
        chapters: aiChapters,
        seo_metadata: aiSeo,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'video_id' },
    );

    await updateStatus(videoId, 'completed');
    logger.log(`[Done] videoId=${videoId} method=${method}`);

    return new Response(
      JSON.stringify({ success: true, video_id: videoId, method }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  } catch (error: any) {
    logger.error('[FATAL]', error.message);
    if (videoId)
      await updateStatus(videoId, 'failed', error.message.substring(0, 250));

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  }
});
