/**
 * Client-side YouTube caption fetcher.
 * Uses corsproxy.io to bypass browser CORS restrictions on YouTube API.
 */

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

async function fetchWithCorsProxy(url: string): Promise<Response> {
  // corsproxy.io adds Access-Control-Allow-Origin to any URL
  return fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`, {
    signal: AbortSignal.timeout(8000),
  });
}

export async function fetchYouTubeCaptions(
  videoId: string,
): Promise<string | null> {
  const langs = ['en', 'en-US', 'en-GB', 'a.en'];

  for (const lang of langs) {
    try {
      const ytUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}&fmt=json3`;
      console.log(`[YT-Captions] Trying lang=${lang} via corsproxy`);

      const res = await fetchWithCorsProxy(ytUrl);
      if (!res.ok) {
        console.log(`[YT-Captions] ${lang} status:`, res.status);
        continue;
      }

      const data = await res.json();
      const text = parseJson3Events(data);

      if (text) {
        console.log(`[YT-Captions] SUCCESS lang=${lang}: ${text.length} chars`);
        return text;
      }
    } catch (err: any) {
      console.log(`[YT-Captions] ${lang} error:`, err?.message);
    }
  }

  console.warn('[YT-Captions] All languages failed for', videoId);
  return null;
}

export function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/,
  );
  return match ? match[1] : null;
}
