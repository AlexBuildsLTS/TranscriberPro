/**
 * supabase/functions/process-video/captions.ts
 * Enterprise Transcript Scraper (Native + RapidAPI Fallback)
 */

export interface CaptionExtractResult {
  text: string;
  json: Record<string, any>;
  method: string;
}

// ─── TIER 1: NATIVE BRACE-COUNTING SCRAPER (FREE) ──────────────────────────
function extractJsonObject(html: string, marker: string): any | null {
  const markerIdx = html.indexOf(marker);
  if (markerIdx === -1) return null;
  const start = html.indexOf('{', markerIdx + marker.length);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (escape) { escape = false; continue; }
    if (inString) {
      if (ch === '\\') escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === '{') { depth++; continue; }
    if (ch === '}') {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.substring(start, i + 1));
        } catch { return null; }
      }
    }
  }
  return null;
}

async function getNativeCaptions(videoId: string): Promise<CaptionExtractResult | null> {
  console.log(`[Captions:Native] Attempting free extraction for ${videoId}...`);
  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': 'CONSENT=YES+cb.20230501-14-p0.en+FX+825',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) return null;
    const html = await response.text();

    const markers = ['ytInitialPlayerResponse = ', 'ytInitialPlayerResponse=', 'window["ytInitialPlayerResponse"] = '];
    let playerResponseJson: any = null;
    for (const marker of markers) {
      const candidate = extractJsonObject(html, marker);
      if (candidate?.captions) {
        playerResponseJson = candidate;
        break;
      }
    }

    if (!playerResponseJson) return null;

    const tracks = playerResponseJson.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    if (!tracks || tracks.length === 0) return null;

    const track = tracks.find((t: any) => t.languageCode.startsWith('en')) ?? tracks[0];
    const xmlResponse = await fetch(track.baseUrl, { signal: AbortSignal.timeout(8000) });
    if (!xmlResponse.ok) return null;

    const xml = await xmlResponse.text();
    const textNodes = xml.match(/<text[^>]*>(.+?)<\/text>/g);
    if (!textNodes) return null;

    let fullTranscript = '';
    for (const node of textNodes) {
      let text = node.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
      fullTranscript += text + ' ';
    }

    const cleanText = fullTranscript.replace(/\s+/g, ' ').trim();
    if (cleanText.length < 50) return null;

    console.log(`[Captions:Native] ✓ Scraped ${cleanText.split(/\s+/).length} words cleanly.`);
    return { text: cleanText, json: { source: 'youtube_native' }, method: 'native_youtube_scraper' };
  } catch (err) {
    return null;
  }
}

// ─── TIER 2: RAPIDAPI TRANSCRIPT BYPASS (PAID) ─────────────────────────────
async function getRapidApiCaptions(videoId: string): Promise<CaptionExtractResult | null> {
  const rapidApiKey = Deno.env.get('RAPIDAPI_KEY');
  if (!rapidApiKey) {
    console.warn('[Captions:RapidAPI] No RAPIDAPI_KEY found in env.');
    return null;
  }

  console.log(`[Captions:RapidAPI] Native failed. Attempting API bypass for ${videoId}...`);
  try {
    // URL mapped EXACTLY to your RapidAPI screenshot parameter: videoId=...
    const res = await fetch(`https://youtube-transcript3.p.rapidapi.com/api/transcript?videoId=${videoId}`, {
      method: 'GET',
      headers: {
        'x-rapidapi-host': 'youtube-transcript3.p.rapidapi.com',
        'x-rapidapi-key': rapidApiKey,
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.warn(`[Captions:RapidAPI] API rejected request: HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();

    // Mapped EXACTLY to the JSON response in your screenshot
    if (data.success === true && Array.isArray(data.transcript) && data.transcript.length > 0) {
      const fullText = data.transcript.map((segment: any) => segment.text).join(' ').replace(/\s+/g, ' ').trim();

      if (fullText.length > 50) {
        console.log(`[Captions:RapidAPI] ✓ SUCCESS. Fetched ${fullText.split(/\s+/).length} words.`);
        return { text: fullText, json: { source: 'rapidapi_transcript3', raw: data }, method: 'rapidapi_transcript3' };
      }
    }

    console.warn(`[Captions:RapidAPI] Failed to extract from API response payload.`);
    return null;
  } catch (err: unknown) {
    console.warn(`[Captions:RapidAPI] Exception: ${(err as Error).message}`);
    return null;
  }
}

// ─── MAIN EXPORT ────────────────────────────────────────────────────────────
export async function getCaptions(videoId: string): Promise<CaptionExtractResult | null> {
  const nativeResult = await getNativeCaptions(videoId);
  if (nativeResult) return nativeResult;

  const apiResult = await getRapidApiCaptions(videoId);
  if (apiResult) return apiResult;

  console.warn('[Captions] All text-extraction methods failed. Escalating to Audio Resolver.');
  return null;
}