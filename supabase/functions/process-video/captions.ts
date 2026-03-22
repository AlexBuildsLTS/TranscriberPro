/**
 * process-video/captions.ts
 * All caption extraction methods
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

async function tryTimedtext(ytId: string): Promise<CaptionResult | null> {
  for (const lang of ['en', 'en-US', 'en-GB', 'a.en']) {
    try {
      const res = await fetch(
        `https://www.youtube.com/api/timedtext?v=${ytId}&lang=${lang}&fmt=json3`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
          signal: AbortSignal.timeout(8000),
        }
      );
      if (!res.ok) continue;
      const data = await res.json();
      const text = parseJson3(data);
      if (text) {
        return { text, json: data, method: `timedtext_${lang}` };
      }
    } catch (_) { /* next */ }
  }
  return null;
}

async function tryInvidious(ytId: string): Promise<CaptionResult | null> {
  for (const inst of INVIDIOUS) {
    try {
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
        return { text, json: { source: 'invidious', url: vttUrl }, method: 'invidious' };
      }
    } catch (_) { /* next */ }
  }
  return null;
}

async function tryRapidAPI(ytId: string): Promise<CaptionResult | null> {
  const key = Deno.env.get('RAPIDAPI_KEY');
  if (!key) return null;

  try {
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

    const text = item.transcriptionAsText || 
      (Array.isArray(item.transcription) 
        ? item.transcription.map((s: any) => s.text ?? '').join(' ')
        : ''
      );

    if (text && text.length > 50) {
      return { text, json: data, method: 'rapidapi' };
    }
  } catch (_) { /* fail */ }
  return null;
}

async function tryInnertube(ytId: string): Promise<CaptionResult | null> {
  const clients = [
    { name: 'WEB', header: '1', version: '2.20240101.01.00' },
    { name: 'TVHTML5', header: '7', version: '7.20240101.08.01' },
  ];

  for (const client of clients) {
    try {
      const res = await fetch(
        'https://www.youtube.com/youtubei/v1/player?prettyPrint=false',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0',
            'X-Youtube-Client-Name': client.header,
            'X-Youtube-Client-Version': client.version,
          },
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
        return { text, json: capData, method: `innertube_${client.name.toLowerCase()}` };
      }
    } catch (_) { /* next */ }
  }
  return null;
}

export async function getCaptions(ytId: string): Promise<CaptionResult | null> {
  return (
    (await tryTimedtext(ytId)) ??
    (await tryInvidious(ytId)) ??
    (await tryRapidAPI(ytId)) ??
    (await tryInnertube(ytId)) ??
    null
  );
}