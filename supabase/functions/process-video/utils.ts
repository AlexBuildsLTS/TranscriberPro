/**
 * process-video/utils.ts
 * Utility functions for the video processing pipeline.
 */

/**
 * Extracts a YouTube video ID from various URL formats.
 * @param url - The YouTube URL.
 * @returns The 11-character video ID or null if not found.
 */

/**
 * Parses JSON3 formatted caption data from YouTube.
 * @param jsonData - The raw JSON3 caption data.
 * @returns The extracted and cleaned text, or null if parsing fails.
 */
export function parseJson3(jsonData: unknown): string | null {
  try {
    if (typeof jsonData === 'string') {
      const parsed = JSON.parse(jsonData);
      return extractTextFromJsonEvents(parsed);
    }
    if (typeof jsonData === 'object' && jsonData !== null) {
      return extractTextFromJsonEvents(jsonData as Record<string, unknown>);
    }
  } catch {
    return null;
  }
  return null;
}

export function extractYouTubeId(url: string): string | null {
  try {
    const parsedUrl = new URL(url);

    // Check for 'v' parameter in query string (standard watch URLs)
    const vId = parsedUrl.searchParams.get('v');
    if (vId && /^[\w-]{11}$/.test(vId)) {
      return vId;
    }

    // Check for youtu.be short links
    if (parsedUrl.hostname === 'youtu.be') {
      const id = parsedUrl.pathname.slice(1).split('?')[0];
      if (/^[\w-]{11}$/.test(id)) {
        return id;
      }
    }

    // Check for /embed/, /v/, /shorts/ paths
    const pathMatch = parsedUrl.pathname.match(
      /(?:embed\/|v\/|shorts\/|live\/)([\w-]{11})/,
    );
    if (pathMatch) {
      return pathMatch[1];
    }
  } catch {
    // Fallback to regex for non-standard URLs that can't be parsed
  }

  // Final fallback regex
  const match = url.match(
    /(?:embed\/|shorts\/|watch\?v=|v\/|live\/|youtu\.be\/)([\w-]{11})/,
  );
  return match?.[1] ?? null;
}

/**
 * Cleans and extracts plain text from a VTT caption string.
 * @param vtt - The VTT caption content as a string.
 * @returns The extracted plain text, normalized.
 */
export function stripVtt(vtt: string): string {
  return (
    vtt
      // Remove VTT header and metadata
      .replace(/^WEBVTT[^\n]*\n(?:[^\n]*\n)*\s*\n?/i, '')
      // Remove timestamps and positioning data (handles both : and . separators)
      .replace(
        /\d{2}:\d{2}[:.]\d{2,3}\s*-->\s*\d{2}:\d{2}[:.]\d{2,3}.*?\n/g,
        '',
      )
      // Remove any HTML-like tags
      .replace(/<[^>]+>/g, '')
      // Decode HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      // Normalize whitespace and join lines
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * Extracts and concatenates text from JSON event objects (from YouTube's json3 format).
 * @param data - The JSON object containing an 'events' array with 'segs'.
 * @returns The concatenated text, or null if input is invalid or text is too short.
 */
export function extractTextFromJsonEvents(
  data: Record<string, unknown>,
): string | null {
  if (!data?.events || !Array.isArray(data.events)) {
    return null;
  }

  const text = (data.events as any[])
    .filter((e) => e.segs)
    .flatMap((e) => e.segs.map((s: any) => (s.utf8 ?? '').replace(/\n/g, ' ')))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text.length > 50 ? text : null;
}
