/**
 *
 * Client-side YouTube caption fetcher.
 * ALL requests go through corsproxy.io — including the final signed caption URL.
 * YouTube's signed CDN URLs return an empty body to direct browser requests
 * but work fine when routed through a proxy.
 *
 * Strategy:
 *   1. timedtext REST API via corsproxy (fastest, works for ~80% of videos)
 *   2. Watch page scrape via corsproxy → extract baseUrl → fetch captions via corsproxy
 */

const PROXY = 'https://corsproxy.io/?';

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseJson3Events(data: any): string | null {
  if (!data?.events?.length) return null;
  const text = data.events
    .filter((e: any) => e.segs)
    .flatMap((e: any) =>
      e.segs.map((s: any) => (s.utf8 ?? '').replace(/\n/g, ' ')),
    )
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 50 ? text : null;
}

/**
 * Fetch any URL through corsproxy.
 * encodeURIComponent is REQUIRED — & in the target URL must not reach corsproxy
 * as query params, or it will only forward up to the first &.
 */
async function proxyFetch(
  targetUrl: string,
  timeoutMs = 10000,
): Promise<Response | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${PROXY}${encodeURIComponent(targetUrl)}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok ? res : null;
  } catch (_) {
    clearTimeout(timeout);
    return null;
  }
}

// ── Method 1: timedtext JSON REST API ─────────────────────────────────────────
async function tryTimedtext(videoId: string): Promise<string | null> {
  for (const lang of ['en', 'en-US', 'en-GB', 'a.en']) {
    try {
      const res = await proxyFetch(
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3`,
      );
      if (!res) continue;
      const data = await res.json();
      const text = parseJson3Events(data);
      if (text) {
        console.log(`[Captions] timedtext(${lang}): ${text.length}c`);
        return text;
      }
    } catch (_) {
      /* try next lang */
    }
  }
  return null;
}

// ── Method 2: watch page scrape → baseUrl → fetch via proxy ───────────────────
async function tryWatchPage(videoId: string): Promise<string | null> {
  try {
    // Fetch watch page through proxy to get player data
    const res = await proxyFetch(
      `https://www.youtube.com/watch?v=${videoId}`,
      14000,
    );
    if (!res) return null;

    const html = await res.text();
    if (html.length < 10000) {
      console.log('[Captions] Watch page too short — likely bot block');
      return null;
    }

    // Extract ytInitialPlayerResponse via bracket-walking
    const marker = 'ytInitialPlayerResponse = {';
    const markerIdx = html.indexOf(marker);
    if (markerIdx === -1) return null;

    const jsonStart = html.indexOf('{', markerIdx);
    let depth = 0,
      i = jsonStart;
    for (; i < html.length; i++) {
      if (html[i] === '{') depth++;
      else if (html[i] === '}') {
        depth--;
        if (depth === 0) break;
      }
    }

    let player: any;
    try {
      player = JSON.parse(html.substring(jsonStart, i + 1));
    } catch {
      return null;
    }

    const tracks: any[] =
      player?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];

    console.log('[Captions] Tracks found:', tracks.length);
    if (!tracks.length) return null;

    // Prefer non-auto English, then auto-generated English, then first track
    const track =
      tracks.find((t: any) => t.languageCode === 'en' && !t.kind) ||
      tracks.find((t: any) => t.languageCode === 'en') ||
      tracks.find((t: any) => t.languageCode?.startsWith('en')) ||
      tracks[0];

    if (!track?.baseUrl) return null;

    // Decode escaped unicode/slashes that YouTube embeds in the JSON
    const baseUrl = track.baseUrl
      .replace(/\\u0026/g, '&')
      .replace(/\\\//g, '/');

    // CRITICAL: fetch the signed caption URL through corsproxy, not directly.
    // Direct browser requests return HTTP 200 with an empty body.
    // corsproxy forwards with a server User-Agent which YouTube serves properly.
    const captionUrl = `${baseUrl}&fmt=json3`;
    console.log('[Captions] Fetching caption URL via proxy (encoded)');

    const capRes = await proxyFetch(captionUrl);
    if (!capRes) return null;

    const body = await capRes.text();
    if (!body || body.trim() === '') {
      console.log('[Captions] Caption response body is empty');
      return null;
    }

    let capData: any;
    try {
      capData = JSON.parse(body);
    } catch (e) {
      console.log('[Captions] Watch page error:', (e as Error).message);
      return null;
    }

    const text = parseJson3Events(capData);
    if (text) {
      console.log('[Captions] Watch page SUCCESS:', text.length, 'chars');
      return text;
    }
    return null;
  } catch (err: any) {
    console.log('[Captions] Watch page exception:', err?.message);
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fetches the English transcript for a YouTube video client-side.
 * Returns the full transcript as a plain text string, or null if unavailable.
 * Call this in useVideoStore before invoking the edge function.
 */
export async function fetchYouTubeCaptions(
  videoId: string,
): Promise<string | null> {
  console.log('[Captions] Starting for:', videoId);

  const m1 = await tryTimedtext(videoId);
  if (m1) return m1;

  const m2 = await tryWatchPage(videoId);
  if (m2) return m2;

  console.log('[Captions] All methods exhausted for:', videoId);
  return null;
}

/**
 * Extracts the 11-character YouTube video ID from any valid YouTube URL.
 * Handles: watch?v=, youtu.be/, embed/, shorts/, and m.youtube.com variants.
 * Returns null for non-YouTube URLs.
 */
export function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|m\/watch\?v=))([\w-]{11})/,
  );
  return match ? match[1] : null;
}
