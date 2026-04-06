/**
 * supabase/functions/process-video/audio.ts
 * Ironclad Audio Stream Resolver (Deno-Safe REST APIs ONLY)
 */

import { extractYouTubeId } from './utils.ts';

interface RapidApiResponse {
  status: string;
  msg?: string;
  link?: string;
  url?: string;
}

export async function getAudioUrl(videoUrl: string): Promise<string> {
  const videoId = extractYouTubeId(videoUrl);
  if (!videoId) throw new Error('INVALID_YOUTUBE_ID');

  console.log(`[Audio] Initiating resolution for ${videoId}`);

  // ─── TIER 1: RAPIDAPI ───────────────────────────────────────────────────
  const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');

  if (rapidApiKey) {
    console.log(`[Audio:RapidAPI] Attempting extraction...`);
    try {
      let attempts = 0;
      while (attempts < 8) {
        const res = await fetch(`https://youtube-mp36.p.rapidapi.com/dl?id=${videoId}`, {
          method: 'GET',
          headers: {
            'x-rapidapi-host': 'youtube-mp36.p.rapidapi.com',
            'x-rapidapi-key': rapidApiKey,
            'Accept': 'application/json'
          },
        });

        if (!res.ok) {
          console.warn(`[Audio:RapidAPI] HTTP ${res.status}`);
          break;
        }

        const data = (await res.json()) as RapidApiResponse;

        if (data.status === 'processing' || data.status === 'waiting') {
          console.log(`[Audio:RapidAPI] Processing... (Attempt ${attempts + 1}/8)`);
          await new Promise(r => setTimeout(r, 2000));
          attempts++;
          continue;
        }

        const finalUrl = data.link || data.url;
        if (finalUrl && (data.status === 'ok' || data.status === 'success')) {
          const check = await fetch(finalUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
          if (check.status !== 404) {
            console.log(`[Audio:RapidAPI] ✓ SUCCESS.`);
            return finalUrl;
          } else {
            console.warn(`[Audio:RapidAPI] Provider returned a 404 dead link.`);
            break;
          }
        }
        break;
      }
    } catch (err: unknown) {
      console.warn(`[Audio:RapidAPI] Exception: ${(err as Error).message}`);
    }
  }

  // ─── TIER 2: COBALT V10 API ──────────────────────────────────────────────
  console.log('[Audio:Cobalt] Attempting extraction...');
  try {
    const res = await fetch('https://api.cobalt.tools/', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify({
        url: videoUrl,
        downloadMode: 'audio',
        aFormat: 'mp3'
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.url) {
        console.log('[Audio:Cobalt] ✓ SUCCESS.');
        return data.url;
      }
    } else {
      console.warn(`[Audio:Cobalt] HTTP ${res.status}`);
    }
  } catch (err: unknown) {
    console.warn(`[Audio:Cobalt] Exception: ${(err as Error).message}`);
  }

  // ─── TIER 3: PIPED API ───────────────────────────────────────────────────
  console.log('[Audio:Piped] Attempting extraction...');
  const pipedInstances = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.tokhmi.xyz'
  ];

  for (const instance of pipedInstances) {
    try {
      const res = await fetch(`${instance}/streams/${videoId}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000)
      });

      if (!res.ok) continue;

      const data = await res.json();
      const audioStreams = data.audioStreams;

      if (audioStreams && audioStreams.length > 0) {
        audioStreams.sort((a: any, b: any) => b.bitrate - a.bitrate);
        console.log(`[Audio:Piped] ✓ SUCCESS via ${instance}`);
        return audioStreams[0].url;
      }
    } catch (err) {
      // Continue
    }
  }

  throw new Error('ALL_AUDIO_PROVIDERS_EXHAUSTED');
}