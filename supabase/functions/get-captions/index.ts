import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.privacydev.net',
  'https://iv.ggtyler.dev',
  'https://invidious.fdn.fr',
  'https://inv.tux.pizza',
  'https://yt.drgnz.club',
  'https://invidious.kavin.rocks',
  'https://invidious.perennialte.ch',
  'https://invidious.nerdvpn.de',
  'https://iv.melmac.space',
];

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

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

async function getCaptionsViaInvidious(
  videoId: string,
): Promise<string | null> {
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      // Get caption track list
      const listRes = await fetch(`${instance}/api/v1/captions/${videoId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(6000),
      });
      if (!listRes.ok) continue;

      const listData = await listRes.json();
      if (!listData?.captions?.length) continue;

      const track =
        listData.captions.find(
          (c: any) => c.language_code === 'en' && !c.label?.includes('auto'),
        ) ||
        listData.captions.find((c: any) => c.language_code === 'en') ||
        listData.captions.find((c: any) => c.language_code?.startsWith('en')) ||
        listData.captions[0];

      if (!track) continue;

      // Fetch VTT through Invidious proxy
      const label = encodeURIComponent(track.label || 'English');
      const vttRes = await fetch(
        `${instance}/api/v1/captions/${videoId}?label=${label}`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(6000),
        },
      );
      if (!vttRes.ok) continue;

      const vtt = await vttRes.text();
      if (!vtt || vtt.length < 50) continue;

      const text = vtt
        .replace(/WEBVTT.*?\n\n/s, '')
        .replace(/\d{2}:\d{2}[:.]\d{2,3} --> \d{2}:\d{2}[:.]\d{2,3}.*?\n/g, '')
        .replace(/<[^>]+>/g, '')
        .split('\n')
        .map((l: string) => decodeHtmlEntities(l.trim()))
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (text.length > 50) return text;
    } catch (_) {
      /* try next */
    }
  }
  return null;
}

async function getCaptionsViaTimedtext(
  videoId: string,
): Promise<string | null> {
  const langs = ['en', 'en-US', 'en-GB', 'a.en'];
  for (const lang of langs) {
    try {
      const res = await fetch(
        `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3&xorb=2&xobt=3&xovt=3`,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          signal: AbortSignal.timeout(6000),
        },
      );
      if (!res.ok) continue;
      const data = await res.json();
      const text = parseJson3Events(data);
      if (text) return text;
    } catch (_) {
      /* try next */
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: corsHeaders });

  try {
    const { video_id } = await req.json();
    if (!video_id) {
      return new Response(JSON.stringify({ error: 'video_id required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Try Invidious first (proxied, no CORS issue from server)
    let transcript = await getCaptionsViaInvidious(video_id);

    // Fall back to timedtext with Googlebot UA
    if (!transcript) {
      transcript = await getCaptionsViaTimedtext(video_id);
    }

    return new Response(JSON.stringify({ transcript: transcript ?? null }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message, transcript: null }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );
  }
});
