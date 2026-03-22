const PROXY = 'https://corsproxy.io/?';

const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://api.piped.yt',
  'https://watchapi.whatever.social',
];

const INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.privacydev.net',
  'https://iv.ggtyler.dev',
  'https://invidious.kavin.rocks',
  'https://inv.tux.pizza',
  'https://yt.drgnz.club',
];

interface PipedAudioStream {
  mimeType?: string;
  url?: string;
  [key: string]: any;
}

async function tryPiped(ytId: string): Promise<string | null> {
  for (const base of PIPED_INSTANCES) {
    try {
      const target = `${base}/streams/${ytId}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);
      const res = await fetch(`${PROXY}${encodeURIComponent(target)}`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) continue;
      const data = await res.json();
      const stream = (data.audioStreams as PipedAudioStream[])?.find(
        (s: PipedAudioStream) =>
          (s.mimeType?.includes('audio/mp4') ||
            s.mimeType?.includes('audio/webm')) &&
          s.url,
      );
      if (stream?.url) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Audio] Piped(${base}) resolved audio URL`);
        }
        return stream.url as string;
      }
    } catch (_) {
      /* next instance */
    }
  }
  return null;
}
interface AdaptiveFormat {
  type?: string;
  url?: string;
  // Add other properties as needed
}

async function tryInvidious(ytId: string): Promise<string | null> {
  for (const base of INVIDIOUS_INSTANCES) {
    try {
      const target = `${base}/api/v1/videos/${ytId}?fields=adaptiveFormats`;
      const res = await fetch(`${PROXY}${encodeURIComponent(target)}`, {
        signal: AbortSignal.timeout(7000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const formats: AdaptiveFormat[] = data.adaptiveFormats ?? [];
      const stream =
        formats.find(
          (f: AdaptiveFormat) => f.type?.includes('audio/mp4') && f.url,
        ) ||
        formats.find(
          (f: AdaptiveFormat) => f.type?.includes('audio/webm') && f.url,
        );
      if (stream?.url) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Audio] Invidious(${base}) resolved audio URL`);
        }
        return stream.url as string;
      }
    } catch (_) {
      /* next instance */
    }
  }
  return null;
}

/**
 * Tries to resolve a direct audio stream URL for a YouTube video.
 * Runs client-side on a residential IP — not subject to server IP blocks.
 * Returns the URL string if found, or null if all methods fail.
 * The edge function will use this URL directly with Deepgram if provided.
 */
export async function fetchYouTubeAudioUrl(
  ytId: string,
): Promise<string | null> {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Audio] Attempting client-side audio resolution for:', ytId);
  }

  const piped = await tryPiped(ytId);
  if (piped) return piped;

  const inv = await tryInvidious(ytId);
  if (inv) return inv;

  if (process.env.NODE_ENV !== 'production') {
    console.log('[Audio] All client-side audio methods failed for:', ytId);
  }
  return null;
}
