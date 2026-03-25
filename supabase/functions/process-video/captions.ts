/**
 * process-video/captions.ts
 * All caption extraction methods - FAST PATH (no IP blocking)
 */
import { stripVtt, parseJson3 } from './utils.ts';

const INVIDIOUS = [
  'https://inv.nadeko.net',
  'https://invidious.privacydev.net',
  'https://iv.ggtyler.dev',
  'https://inv.tux.pizza',
];

interface CaptionResult {
  text: string;
  json: unknown;
  method: string;
}

/** Method 1: Direct timedtext API - fastest */
async function tryTimedtext(ytId: string): Promise<CaptionResult | null> {
  for (const lang of ['en', 'en-US', 'en-GB', 'a.en']) {
    try {
      const res = await fetch(
        `https://www.youtube.com/api/timedtext?v=${ytId}&lang=${lang}&fmt=json3`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          signal: AbortSignal.timeout(8000),
        }
      );
      if (!res.ok) continue;
      const data = await res.json();
      const text = parseJson3(data);
      if (text) {
        console.log(`[Captions] ✓ timedtext (${lang}): ${text.length} chars`);
        return { text, json: data, method: `timedtext_${lang}` };
      }
    } catch { /* next */ }
  }
  return null;
}

/** Method 2: THE MAGIC - Scrape ytInitialPlayerResponse from watch page */
async function tryWatchPageScrape(ytId: string): Promise<CaptionResult | null> {
  try {
    console.log('[Captions] Trying watch page scrape (THE MAGIC)...');
    const res = await fetch(`https://www.youtube.com/watch?v=${ytId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) return null;
    const html = await res.text();

    // Basic bot detection - YouTube returns truncated HTML when blocked
    if (html.length < 10000) {
      console.log('[Captions] Watch page too short - bot blocked');
      return null;
    }

    // Find ytInitialPlayerResponse in the page
    const marker = 'ytInitialPlayerResponse = {';
    const markerIdx = html.indexOf(marker);
    if (markerIdx === -1) {
      console.log('[Captions] ytInitialPlayerResponse not found');
      return null;
    }

    // Extract JSON using bracket counting (handles nested objects)
    const jsonStart = html.indexOf('{', markerIdx);
    let depth = 0, i = jsonStart;
    for (; i < html.length && i < jsonStart + 500000; i++) {
      if (html[i] === '{') depth++;
      else if (html[i] === '}') {
        depth--;
        if (depth === 0) break;
      }
    }

    const player = JSON.parse(html.substring(jsonStart, i + 1));
    const tracks = player?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];

    if (!tracks.length) {
      console.log('[Captions] No caption tracks in player response');
      return null;
    }

    // Find best English track (prefer manual over auto-generated)
    const track =
      tracks.find((t: any) => t.languageCode === 'en' && t.kind !== 'asr') ||
      tracks.find((t: any) => t.languageCode === 'en') ||
      tracks.find((t: any) => t.languageCode?.startsWith('en')) ||
      tracks[0];

    if (!track?.baseUrl) return null;

    // Fetch the actual caption JSON
    const captionUrl = track.baseUrl.replace(/\\u0026/g, '&') + '&fmt=json3';
    const capRes = await fetch(captionUrl, { signal: AbortSignal.timeout(8000) });
    if (!capRes.ok) return null;

    const capData = await capRes.json();
    const text = parseJson3(capData);
    if (text) {
      console.log(`[Captions] ✓ watch page scrape: ${text.length} chars`);
      return { text, json: capData, method: 'watchpage_scrape' };
    }
  } catch (e) {
    console.log('[Captions] Watch page error:', e instanceof Error ? e.message : e);
  }
  return null;
}

/** Method 3: Invidious public instances */
async function tryInvidious(ytId: string): Promise<CaptionResult | null> {
  for (const inst of INVIDIOUS) {
    try {
      console.log(`[Captions] Trying Invidious (${inst})...`);
      const res = await fetch(`${inst}/api/v1/captions/${ytId}`, {
        signal: AbortSignal.timeout(7000),
      });
      if (!res.ok) continue;
      const list = await res.json();
      if (!list?.captions?.length) continue;

      const track = list.captions.find((c: any) => c.language_code === 'en') || list.captions[0];
      if (!track?.url) continue;

      const vttUrl = track.url.startsWith('http') ? track.url : `${inst}${track.url}`;
      const vttRes = await fetch(vttUrl, { signal: AbortSignal.timeout(6000) });
      if (!vttRes.ok) continue;

      const text = stripVtt(await vttRes.text());
      if (text.length > 50) {
        console.log(`[Captions] ✓ invidious: ${text.length} chars`);
        return { text, json: { source: 'invidious', url: vttUrl }, method: 'invidious' };
      }
    } catch { /* next */ }
  }
  return null;
}

/** Method 4: RapidAPI transcript service */
async function tryRapidAPI(ytId: string): Promise<CaptionResult | null> {
  const key = Deno.env.get('RAPIDAPI_KEY');
  if (!key) return null;

  try {
    console.log('[Captions] Trying RapidAPI transcript...');
    const res = await fetch(
      `https://youtube-transcriptor.p.rapidapi.com/transcript?video_id=${ytId}&lang=en`,
      {
        headers: {
          'X-RapidAPI-Key': key,
          'X-RapidAPI-Host': 'youtube-transcriptor.p.rapidapi.com',
        },
        signal: AbortSignal.timeout(15000),
      }
    );
    if (!res.ok) return null;

    const data = await res.json();
    const item = Array.isArray(data) ? data[0] : data;
    if (!item) return null;

    const text =
      item.transcriptionAsText ||
      (Array.isArray(item.transcription)
        ? item.transcription.map((s: any) => s.text ?? '').join(' ')
        : '');

    if (text && text.length > 50) {
      console.log(`[Captions] ✓ rapidapi: ${text.length} chars`);
      return { text, json: data, method: 'rapidapi' };
    }
  } catch { /* fail */ }
  return null;
}

/** Method 5: Innertube player API */
async function tryInnertube(ytId: string): Promise<CaptionResult | null> {
  const clients = [
    { name: 'WEB', version: '2.20240321.01.00' },
    { name: 'ANDROID', version: '19.09.37' },
    { name: 'IOS', version: '19.09.3' },
  ];

  for (const client of clients) {
    try {
      console.log(`[Captions] Trying Innertube (${client.name})...`);
      const res = await fetch(
        'https://www.youtube.com/youtubei/v1/player?prettyPrint=false',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId: ytId,
            context: {
              client: {
                clientName: client.name,
                clientVersion: client.version,
                hl: 'en',
                gl: 'US',
              },
            },
          }),
          signal: AbortSignal.timeout(12000),
        }
      );

      if (!res.ok) continue;
      const data = await res.json();
      const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
      if (!tracks.length) continue;

      const track = tracks.find((t: any) => t.languageCode === 'en' && !t.kind) || tracks[0];
      if (!track?.baseUrl) continue;

      const capUrl = `${track.baseUrl}&fmt=json3`;
      const capRes = await fetch(capUrl, { signal: AbortSignal.timeout(10000) });
      if (!capRes.ok) continue;

      const capData = await capRes.json();
      const text = parseJson3(capData);
      if (text) {
        console.log(`[Captions] ✓ innertube (${client.name}): ${text.length} chars`);
        return { text, json: capData, method: `innertube_${client.name.toLowerCase()}` };
      }
    } catch { /* next */ }
  }
  return null;
}

/**
 * Master caption extraction - tries ALL methods in order of reliability
 * This is the FAST PATH - fetches text only, bypasses YouTube IP blocking
 */
export async function getCaptions(ytId: string): Promise<CaptionResult | null> {
  console.log(`[Captions] ═══ Starting extraction for: ${ytId} ═══`);
  const start = Date.now();

  const result =
    (await tryTimedtext(ytId)) ??
    (await tryWatchPageScrape(ytId)) ??  // THE MAGIC - added!
    (await tryInvidious(ytId)) ??
    (await tryRapidAPI(ytId)) ??
    (await tryInnertube(ytId)) ??
    null;

  const elapsed = Date.now() - start;
  if (result) {
    console.log(`[Captions] ═══ SUCCESS in ${elapsed}ms via ${result.method} ═══`);
  } else {
    console.log(`[Captions] ═══ ALL METHODS FAILED after ${elapsed}ms ═══`);
  }

  return result;
}
