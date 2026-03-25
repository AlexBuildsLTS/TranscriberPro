/**
 * process-video/audio.ts
 * Audio URL resolution - SLOW FALLBACK (only used when captions fail)
 * Priority: RapidAPI → Innertube → Piped → Invidious
 */

const INVIDIOUS = [
  'https://inv.nadeko.net',
  'https://invidious.privacydev.net',
  'https://iv.ggtyler.dev',
];

const PIPED = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://pipedapi.tokhmi.xyz',
];

/** Method 1: RapidAPI MP3 converter - most reliable */
async function tryRapidAPI(ytId: string): Promise<string | null> {
  const key = Deno.env.get('RAPIDAPI_KEY');
  if (!key) {
    console.log('[Audio] RapidAPI skipped - no key');
    return null;
  }

  // Try multiple RapidAPI hosts
  const hosts = [
    { host: 'youtube-mp36.p.rapidapi.com', path: `/dl?id=${ytId}` },
    { host: 'yt-api.p.rapidapi.com', path: `/dl?id=${ytId}` },
  ];

  for (const { host, path } of hosts) {
    try {
      console.log(`[Audio] Trying RapidAPI (${host})...`);
      const res = await fetch(`https://${host}${path}`, {
        headers: {
          'X-RapidAPI-Key': key,
          'X-RapidAPI-Host': host,
        },
        signal: AbortSignal.timeout(20000),
      });

      if (!res.ok) {
        console.log(`[Audio] RapidAPI ${host} returned ${res.status}`);
        continue;
      }

      const data = await res.json();

      // Handle different response formats
      if (data.status === 'ok' && data.link) {
        console.log(`[Audio] ✓ RapidAPI (${host}) success`);
        return data.link;
      }
      if (data.url) {
        console.log(`[Audio] ✓ RapidAPI (${host}) success`);
        return data.url;
      }

      console.log(
        `[Audio] RapidAPI ${host} response:`,
        JSON.stringify(data).substring(0, 200),
      );
    } catch (e) {
      console.log(
        `[Audio] RapidAPI ${host} error:`,
        e instanceof Error ? e.message : e,
      );
    }
  }
  return null;
}

/** Method 2: Innertube player API */
async function tryInnertube(ytId: string): Promise<string | null> {
  const clients = [
    { name: 'ANDROID', version: '19.09.37' },
    { name: 'IOS', version: '19.09.3' },
    { name: 'WEB', version: '2.20240321.01.00' },
  ];

  for (const client of clients) {
    try {
      console.log(`[Audio] Trying Innertube (${client.name})...`);
      const res = await fetch(
        'https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoId: ytId,
            context: {
              client: {
                clientName: client.name,
                clientVersion: client.version,
              },
            },
          }),
          signal: AbortSignal.timeout(12000),
        },
      );

      if (!res.ok) continue;
      const data = await res.json();
      const formats = [...(data?.streamingData?.adaptiveFormats ?? [])];
      const audio = formats.find(
        (f: any) => f.mimeType?.includes('audio') && f.url,
      );
      if (audio?.url) {
        console.log(`[Audio] ✓ Innertube (${client.name})`);
        return audio.url;
      }
    } catch {
      /* next */
    }
  }
  return null;
}

/** Method 3: Piped instances */
async function tryPiped(ytId: string): Promise<string | null> {
  for (const base of PIPED) {
    try {
      console.log(`[Audio] Trying Piped (${base})...`);
      const res = await fetch(`${base}/streams/${ytId}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const audio = data.audioStreams?.find(
        (s: any) => s.url && s.mimeType?.includes('audio'),
      );
      if (audio?.url) {
        console.log(`[Audio] ✓ Piped (${base})`);
        return audio.url;
      }
    } catch {
      /* next */
    }
  }
  return null;
}

/** Method 4: Invidious instances */
async function tryInvidious(ytId: string): Promise<string | null> {
  for (const base of INVIDIOUS) {
    try {
      console.log(`[Audio] Trying Invidious (${base})...`);
      const res = await fetch(
        `${base}/api/v1/videos/${ytId}?fields=adaptiveFormats`,
        {
          signal: AbortSignal.timeout(8000),
        },
      );
      if (!res.ok) continue;
      const data = await res.json();
      const audio = data.adaptiveFormats?.find(
        (f: any) => f.type?.includes('audio') && f.url,
      );
      if (audio?.url) {
        console.log(`[Audio] ✓ Invidious (${base})`);
        return audio.url;
      }
    } catch {
      /* next */
    }
  }
  return null;
}

/**
 * Master audio URL resolution - tries ALL methods
 * This is the SLOW FALLBACK - only used when captions are not available
 */
export async function getAudioUrl(
  videoUrl: string,
  ytId: string | null,
): Promise<string> {
  if (!ytId) throw new Error('Not a YouTube URL');

  console.log(`[Audio] ═══ Starting audio resolution for: ${ytId} ═══`);
  const start = Date.now();

  // Try in order of reliability
  const rapidapi = await tryRapidAPI(ytId);
  if (rapidapi) return rapidapi;

  const innertube = await tryInnertube(ytId);
  if (innertube) return innertube;

  const piped = await tryPiped(ytId);
  if (piped) return piped;

  const invidious = await tryInvidious(ytId);
  if (invidious) return invidious;

  const elapsed = Date.now() - start;
  console.log(`[Audio] ═══ ALL METHODS FAILED after ${elapsed}ms ═══`);
  throw new Error(
    'All audio methods failed: RapidAPI, Innertube, Piped, Invidious exhausted. YouTube may be blocking datacenter IPs. Ensure RAPIDAPI_KEY is set and valid.',
  );
}
