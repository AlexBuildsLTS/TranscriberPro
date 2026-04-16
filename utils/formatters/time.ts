/**
 * utils/formatters/time.ts
 * Professional timestamp formatting for transcription display and export.
 * Supports SRT, VTT, and display formats.
 */

/**
 * Converts seconds to display format (MM:SS or HH:MM:SS)
 * @param seconds - Raw seconds (e.g., 3725.4)
 * @returns Formatted string (e.g., "01:02:05")
 */
export function formatTimestamp(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';

  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const mm = minutes.toString().padStart(2, '0');
  const ss = secs.toString().padStart(2, '0');

  if (hours > 0) {
    const hh = hours.toString().padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

/**
 * Converts seconds to SRT format (HH:MM:SS,mmm)
 * @param seconds - Raw seconds with decimals
 * @returns SRT timestamp (e.g., "01:02:05,400")
 */
export function formatSrtTimestamp(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00:00,000';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    secs.toString().padStart(2, '0'),
  ].join(':') + ',' + ms.toString().padStart(3, '0');
}

/**
 * Converts seconds to VTT format (HH:MM:SS.mmm)
 * @param seconds - Raw seconds with decimals
 * @returns VTT timestamp (e.g., "01:02:05.400")
 */
export function formatVttTimestamp(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00:00.000';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    secs.toString().padStart(2, '0'),
  ].join(':') + '.' + ms.toString().padStart(3, '0');
}

/**
 * Converts duration to human-readable format
 * @param seconds - Total duration in seconds
 * @returns Human string (e.g., "1h 23m", "45m 30s", "2m 15s")
 */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0s';

  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  }
  return `${secs}s`;
}

/**
 * Parses timestamp string back to seconds
 * Handles: "1:23", "01:23", "1:02:03", "01:02:03"
 * @param timestamp - Timestamp string
 * @returns Seconds as number
 */
export function parseTimestamp(timestamp: string): number {
  if (!timestamp || typeof timestamp !== 'string') return 0;

  const parts = timestamp.split(':').map((p) => parseFloat(p.replace(',', '.')));

  if (parts.some((p) => !Number.isFinite(p))) return 0;

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parts[0] || 0;
}

/**
 * Estimates timestamp from word position in transcript
 * Assumes average speaking rate of 150 words/minute
 * @param wordIndex - Position of word in transcript
 * @param totalWords - Total word count
 * @param totalDuration - Total video duration in seconds (if known)
 * @returns Estimated timestamp in seconds
 */
export function estimateTimestamp(
  wordIndex: number,
  totalWords: number,
  totalDuration?: number,
): number {
  if (totalWords <= 0 || wordIndex < 0) return 0;

  const position = wordIndex / totalWords;

  if (totalDuration && totalDuration > 0) {
    return Math.floor(position * totalDuration);
  }

  // Fallback: 150 words per minute
  const estimatedMinutes = totalWords / 150;
  return Math.floor(position * estimatedMinutes * 60);
}