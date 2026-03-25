import { createClient } from '@supabase/supabase-js';

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
/**
 * RapidAPI key for YouTube audio extraction services
 * Used as fallback method when Piped/Invidious instances are unavailable
 */
const RAPIDAPI_KEY = process.env.EXPO_PUBLIC_RAPIDAPI_KEY || '';
const RAPIDAPI_HOST = 'yt-api.p.rapidapi.com';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'Content-Type': 'application/json',
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

interface RapidAPIAudioResponse {
  status: string;
  contents?: Array<{
    videoRenderer?: {
      videoId?: string;
      thumbnail?: { thumbnails?: Array<{ url?: string }> };
      title?: { runs?: Array<{ text?: string }> };
    };
  }>;
  [key: string]: any;
}

/**
 * Attempts to extract audio URL via RapidAPI YouTube endpoint
 * Serves as premium fallback for client-side audio resolution
 * @param ytId - YouTube video ID
 * @returns Audio stream URL or null if extraction fails
 */

async function tryRapidAPI(ytId: string): Promise<string | null> {
  try {
    // FIX: Added the ?id= parameter
    const target = `https://${RAPIDAPI_HOST}/dl?id=${ytId}`;
    const res = await fetch(target, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': RAPIDAPI_KEY,
        'x-rapidapi-host': RAPIDAPI_HOST,
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;
    const data: RapidAPIAudioResponse = await res.json();

    // Check the specific response structure of your RapidAPI provider
    if (data.status === 'ok' && data.link) {
      return data.link;
    }
  } catch (error) {
    console.error('[Audio] RapidAPI failed:', error);
  }
  return null;
}

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
  // FIX: Actually call the RapidAPI fallback!
  const rapid = await tryRapidAPI(ytId);
  if (rapid) return rapid;

  const piped = await tryPiped(ytId);
  if (piped) return piped;

  const inv = await tryInvidious(ytId);
  if (inv) return inv;

  if (process.env.NODE_ENV !== 'production') {
    console.log('[Audio] All client-side audio methods failed for:', ytId);
  }
  return null;
}
