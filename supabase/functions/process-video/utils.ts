/**
 * supabase/functions/process-video/utils.ts
 * Ironclad Utility Suite - Enterprise Production Tier (2026)
 * ----------------------------------------------------------------------------
 * FEATURES:
 * 1. DATABASE SAFETY: Null-byte scrubbing (\u0000) prevents Postgres crashes.
 * 2. MULTI-CONTEXT IDENTIFIER: Advanced regex for all YouTube variants (Shorts, Live, Embeds).
 * 3. METRIC ANALYTICS: High-precision duration and reading time calculations.
 * 4. TYPE SAFETY: Strictly defined interfaces for JSON3 and VTT parsing.
 */

export interface Json3Segment {
  utf8?: string;
}

export interface Json3Event {
  segs?: Json3Segment[];
}

export interface Json3Data {
  events?: Json3Event[];
}

/**
 * Calculates high-precision millisecond delta from a starting epoch.
 */
export function diffMs(startTime: number): number {
  return Date.now() - startTime;
}

/**
 * Enterprise Reading Time Calculator.
 * Derived using the professional standard of 225 words per minute.
 */
export function estimateReadingTime(wordCount: number): number {
  const wordsPerMinute = 225;
  const time = Math.ceil(wordCount / wordsPerMinute);
  return Math.max(1, time);
}

/**
 * PostgreSQL String Sanitizer.
 * MANDATORY: PostgreSQL driver crashes on the null character (\u0000).
 * Scrubs illegal bytes and normalizes whitespace for optimal storage.
 */
export function sanitizeForDb(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/\u0000/g, '') // Remove illegal binary bytes
    .replace(/\s+/g, ' ')   // Collapse whitespace clusters
    .trim();
}

/**
 * Sovereign YouTube Identifier Extraction Engine.
 * Supports standard, shortened, shorts, live, and embed URLs.
 */
export function extractYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;

  try {
    const urlObject = new URL(url);

    // Pattern 1: Standard Query Parameters (?v=...)
    const queryId = urlObject.searchParams.get('v');
    if (queryId && /^[a-zA-Z0-9_-]{11}$/.test(queryId)) return queryId;

    // Pattern 2: Shortened Domain (youtu.be/...)
    if (urlObject.hostname === 'youtu.be') {
      const pathId = urlObject.pathname.slice(1).split('?')[0];
      if (/^[a-zA-Z0-9_-]{11}$/.test(pathId)) return pathId;
    }
  } catch {
    // Fallback to regex if URL constructor fails
  }

  // Pattern 3: Aggressive Regex Shield for Shorts, Live, and Embeds
  const masterRegex = /(?:v=|\/|youtu\.be\/|shorts\/|embed\/|live\/)([a-zA-Z0-9_-]{11})/;
  const matchResult = url.match(masterRegex);

  return (matchResult && matchResult[1]) ? matchResult[1] : null;
}

/**
 * YouTube JSON3 Event Decoder.
 * Parses undocumented internal event streams into normalized text safely.
 */
export function parseJson3(jsonData: unknown): string | null {
  if (!jsonData) return null;

  try {
    const data = (typeof jsonData === 'string'
      ? JSON.parse(jsonData)
      : jsonData) as Json3Data;

    if (!data?.events || !Array.isArray(data.events)) {
      return null;
    }

    // Memory-efficient reduction for massive transcripts
    const processedText = data.events
      .filter((event: Json3Event) => event.segs && Array.isArray(event.segs))
      .reduce((acc: string[], event: Json3Event) => {
        const line = event.segs!.map((s) => s.utf8 ?? '').join('');
        if (line) acc.push(line);
        return acc;
      }, [])
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    return processedText.length > 50 ? processedText : null;
  } catch (parseErr: any) {
    console.error('[UTILS:JSON3] Parsing exception:', parseErr.message);
    return null;
  }
}

/**
 * Legacy VTT (Web Video Text Tracks) Sanitizer.
 */
export function stripVtt(vttContent: string): string {
  if (!vttContent) return '';

  return vttContent
    .replace(/^WEBVTT[\s\S]*?\n\n/i, '')
    .replace(/^\d{2,}:\d{2}:\d{2}\.\d{3}\s+-->\s+.*$/gm, '')
    .replace(/^\d{2,}:\d{2}:\d{2}\.\d{3}$/gm, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Semantic Keyword Analytics.
 * Generates frequency-based metadata for automated tagging.
 */
export function getKeywordDensity(text: string, limit = 10): string[] {
  if (!text) return [];

  // Filter for words > 4 chars to ignore stop-words
  const words = text.toLowerCase().match(/\b(\w{5,})\b/g);
  if (!words) return [];

  const frequencyMap: Record<string, number> = {};
  words.forEach((word) => {
    frequencyMap[word] = (frequencyMap[word] || 0) + 1;
  });

  return Object.entries(frequencyMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}