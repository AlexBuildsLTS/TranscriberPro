/**
 * process-video/audio.ts
 * Audio URL resolution via Innertube/Piped/Invidious
 */

const INVIDIOUS = [
  'https://inv.nadeko.net',
  'https://invidious.privacydev.net',
];

const PIPED = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.tokhmi.xyz',
];

async function tryInnertube(ytId: string): Promise<string | null> {
  const clients = [
    { name: 'ANDROID', header: '3', version: '19.09.37' },
    { name: 'IOS', header: '5', version: '19.09.3' },
  ];

  for (const client of clients) {
    try {
      const res = await fetch(
        'https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId: ytId,
            context: { client: { clientName: client.name, clientVersion: client.version } },
          }),
          signal: AbortSignal.timeout(12000),
        }
      );

      if (!res.ok) continue;
      const data = await res.json();
      const formats = [...(data?.streamingData?.adaptiveFormats ?? [])];
      const audio = formats.find((f: any) => f.mimeType?.includes('audio') && f.url);
      if (audio?.url) return audio.url;
    } catch (_) { /* next */ }
  }
  return null;
}

async function tryPiped(ytId: string): Promise<string | null> {
  for (const base of PIPED) {
    try {
      const res = await fetch(`${base}/streams/${ytId}`, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const data = await res.json();
      const audio = data.audioStreams?.find((s: any) => s.url);
      if (audio?.url) return audio.url;
    } catch (_) { /* next */ }
  }
  return null;
}

async function tryInvidious(ytId: string): Promise<string | null> {
  for (const base of INVIDIOUS) {
    try {
      const res = await fetch(`${base}/api/v1/videos/${ytId}?fields=adaptiveFormats`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const audio = data.adaptiveFormats?.find((f: any) => f.type?.includes('audio') && f.url);
      if (audio?.url) return audio.url;
    } catch (_) { /* next */ }
  }
  return null;
}

export async function getAudioUrl(videoUrl: string, ytId: string | null): Promise<string> {
  if (!ytId) throw new Error('Not a YouTube URL');

  const innertube = await tryInnertube(ytId);
  if (innertube) return innertube;

  const piped = await tryPiped(ytId);
  if (piped) return piped;

  const inv = await tryInvidious(ytId);
  if (inv) return inv;

  throw new Error('All audio methods failed');
}