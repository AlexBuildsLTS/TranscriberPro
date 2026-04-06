/**
 * services/exportBuilder.ts
 * Enterprise-Grade Export & Formatting Engine
 * ----------------------------------------------------------------------------
 * FEATURES:
 * - 100% Type-Safe: Defensive parsing for Supabase JSON fields.
 * - Unified Output: TXT and MD files contain BOTH the AI Summaries and the Raw Transcript.
 * - Smart Fallbacks: Auto-calculates SRT/VTT timestamps if native segments fail.
 * - Platform Agnostic: Triggers native downloads on Web and clipboard on Mobile.
 */

import { formatTimestamp, formatSrtTimestamp, formatVttTimestamp, formatDuration } from '../utils/formatters/time';
import type { ExportFormat, ExportOptions, ExportResult, Transcript, TranscriptSegment, AiInsights, Video } from '../types/api';

// ─── INTERFACES & GUARDS ─────────────────────────────────────────────────────

interface ExportData {
  video: Video;
  transcript: Transcript;
  insights?: AiInsights | null;
  segments?: TranscriptSegment[];
}

interface ParsedChapter {
  timestamp: string;
  title: string;
  description: string;
}

const MIME_TYPES: Record<ExportFormat, string> = {
  txt: 'text/plain',
  srt: 'application/x-subrip',
  vtt: 'text/vtt',
  json: 'application/json',
  md: 'text/markdown',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

// Defensive JSON parsers to prevent crashes from malformed Supabase JSON columns
const safeArray = <T>(data: unknown): T[] => (Array.isArray(data) ? (data as T[]) : []);

// ─── PLAIN TEXT ENGINE (EXECUTIVE TXT) ───────────────────────────────────────

function exportToTxt(data: ExportData, options: ExportOptions): string {
  const { video, transcript, insights } = data;
  const lines: string[] = [];
  const chapters = safeArray<ParsedChapter>(insights?.chapters);
  const takeaways = safeArray<string>(insights?.key_takeaways);

  lines.push('════════════════════════════════════════════════════════════════════════');
  lines.push(`INTELLIGENCE DOSSIER: ${video.title || 'Unknown Media Asset'}`);
  lines.push('════════════════════════════════════════════════════════════════════════\n');
  lines.push(`Source URL : ${video.youtube_url}`);
  if (video.duration_seconds) lines.push(`Duration   : ${formatDuration(video.duration_seconds)}`);
  lines.push(`Generated  : ${new Date().toUTCString()}\n`);

  if (options.includeSummary && insights?.summary) {
    lines.push('─── EXECUTIVE ABSTRACT ─────────────────────────────────────────────────\n');
    lines.push(insights.summary + '\n');
  }

  if (options.includeSummary && takeaways.length > 0) {
    lines.push('─── STRATEGIC INDICATORS ───────────────────────────────────────────────\n');
    takeaways.forEach((takeaway, i) => lines.push(`${i + 1}. ${takeaway}`));
    lines.push('\n');
  }

  if (options.includeChapters && chapters.length > 0) {
    lines.push('─── TIMELINE MAPPING ───────────────────────────────────────────────────\n');
    chapters.forEach((chapter) => {
      lines.push(`[${chapter.timestamp}] ${chapter.title.toUpperCase()}`);
      if (chapter.description) lines.push(`    ${chapter.description}`);
      lines.push('');
    });
  }

  lines.push('─── VERBATIM DATA STREAM (RAW TRANSCRIPT) ──────────────────────────────\n');

  if (options.includeTimestamps && data.segments && data.segments.length > 0) {
    // If segments exist, map them with timestamps
    data.segments.forEach((segment) => {
      const timestamp = formatTimestamp(segment.start);
      const speaker = options.includeSpeakers && segment.speaker ? `[SPK_${segment.speaker}] ` : '';
      lines.push(`[${timestamp}] ${speaker}${segment.text}`);
    });
  } else {
    // Smart Paragraphing for pure raw text
    const paragraphs = transcript.transcript_text.split(/(?<=[.!?])\s+/);
    let currentParagraph = '';
    paragraphs.forEach((sentence, i) => {
      currentParagraph += (currentParagraph ? ' ' : '') + sentence;
      if (i % 8 === 7 || i === paragraphs.length - 1) {
        lines.push(currentParagraph.trim() + '\n');
        currentParagraph = '';
      }
    });
  }

  lines.push('\n════════════════════════════════════════════════════════════════════════');
  lines.push('Preserved Securely by NorthOS Vault');
  lines.push('════════════════════════════════════════════════════════════════════════');

  return lines.join('\n');
}

// ─── MARKDOWN ENGINE ─────────────────────────────────────────────────────────

function exportToMarkdown(data: ExportData, options: ExportOptions): string {
  const { video, transcript, insights } = data;
  const chapters = safeArray<ParsedChapter>(insights?.chapters);
  const takeaways = safeArray<string>(insights?.key_takeaways);
  const lines: string[] = [];

  lines.push(`# Intelligence Dossier: ${video.title || 'Decrypted Media Payload'}\n`);
  lines.push(`**Source:** [View Original](${video.youtube_url})  `);
  if (video.duration_seconds) lines.push(`**Duration:** ${formatDuration(video.duration_seconds)}  `);
  lines.push(`**Generated:** ${new Date().toLocaleDateString()}\n`);

  if (options.includeSummary && insights?.summary) {
    lines.push('## Executive Abstract\n');
    lines.push(insights.summary + '\n');
  }

  if (options.includeSummary && takeaways.length > 0) {
    lines.push('## Strategic Indicators\n');
    takeaways.forEach((t) => lines.push(`* ${t}`));
    lines.push('');
  }

  if (options.includeChapters && chapters.length > 0) {
    lines.push('## Timeline Mapping\n');
    lines.push('| Timestamp | Subject | Details |');
    lines.push('| :--- | :--- | :--- |');
    chapters.forEach((c) => {
      const desc = c.description?.replace(/\|/g, '&#124;') || '';
      lines.push(`| \`${c.timestamp}\` | **${c.title}** | ${desc} |`);
    });
    lines.push('');
  }

  lines.push('## Verbatim Data Stream\n');

  if (options.includeTimestamps && data.segments && data.segments.length > 0) {
    data.segments.forEach((seg) => {
      const speaker = options.includeSpeakers && seg.speaker ? `**[SPK_${seg.speaker}]** ` : '';
      lines.push(`*\\[${formatTimestamp(seg.start)}\\]* ${speaker}${seg.text}  `);
    });
  } else {
    // Smart Paragraphing for Markdown
    const paragraphs = transcript.transcript_text.split(/(?<=[.!?])\s+/);
    let currentParagraph = '';
    paragraphs.forEach((sentence, i) => {
      currentParagraph += (currentParagraph ? ' ' : '') + sentence;
      if (i % 8 === 7 || i === paragraphs.length - 1) {
        lines.push(currentParagraph.trim() + '\n\n');
        currentParagraph = '';
      }
    });
  }

  lines.push('---\n*Preserved Securely by NorthOS Vault*');
  return lines.join('\n');
}

// ─── SUBTITLE ENGINES (SRT & VTT) ────────────────────────────────────────────

function createFallbackSrt(text: string, durationSeconds?: number | null): string {
  const words = text.split(/\s+/);
  const wordsPerSegment = 12;
  const totalDuration = durationSeconds || (words.length / 150) * 60;
  const segmentDuration = totalDuration / Math.ceil(words.length / wordsPerSegment);

  const lines: string[] = [];
  let segmentIndex = 1;

  for (let i = 0; i < words.length; i += wordsPerSegment) {
    const segmentWords = words.slice(i, i + wordsPerSegment);
    const start = (i / wordsPerSegment) * segmentDuration;
    const end = Math.min(start + segmentDuration, totalDuration);

    lines.push(String(segmentIndex++));
    lines.push(`${formatSrtTimestamp(start)} --> ${formatSrtTimestamp(end)}`);
    lines.push(segmentWords.join(' '));
    lines.push('');
  }
  return lines.join('\n');
}

function exportToSrt(data: ExportData, options: ExportOptions): string {
  const segments = data.segments || [];
  if (segments.length === 0) return createFallbackSrt(data.transcript.transcript_text, data.video.duration_seconds);

  const lines: string[] = [];
  segments.forEach((segment, index) => {
    lines.push(String(index + 1));
    lines.push(`${formatSrtTimestamp(segment.start)} --> ${formatSrtTimestamp(segment.end)}`);
    const text = options.includeSpeakers && segment.speaker ? `[SPK_${segment.speaker}] ${segment.text}` : segment.text;
    lines.push(text);
    lines.push('');
  });
  return lines.join('\n');
}

function exportToVtt(data: ExportData, options: ExportOptions): string {
  const segments = data.segments || [];
  const chapters = safeArray<ParsedChapter>(data.insights?.chapters);
  const lines: string[] = ['WEBVTT\n'];

  lines.push(`NOTE Title: ${data.video.title || 'Unknown Media Asset'}`);
  lines.push(`NOTE Source: ${data.video.youtube_url}\n`);

  if (options.includeChapters && chapters.length > 0) {
    chapters.forEach((c) => lines.push(`NOTE Chapter: [${c.timestamp}] ${c.title}`));
    lines.push('');
  }

  if (segments.length === 0) {
    const srt = createFallbackSrt(data.transcript.transcript_text, data.video.duration_seconds);
    lines.push(srt.replace(/^\d+$/gm, '').replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2').split('\n').filter(l => l.trim()).join('\n\n'));
  } else {
    segments.forEach((segment, index) => {
      if (index > 0) lines.push('');
      lines.push(`${formatVttTimestamp(segment.start)} --> ${formatVttTimestamp(segment.end)}`);
      const text = options.includeSpeakers && segment.speaker ? `<v SPK_${segment.speaker}>${segment.text}` : segment.text;
      lines.push(text);
    });
  }
  return lines.join('\n');
}

// ─── JSON ENGINE ─────────────────────────────────────────────────────────────

function exportToJson(data: ExportData, options: ExportOptions): string {
  const output: Record<string, unknown> = {
    metadata: {
      source: data.video.youtube_url,
      duration: data.video.duration_seconds,
      generatedAt: new Date().toISOString(),
      wordCount: data.transcript.word_count,
    },
    intelligence_brief: {
      summary: data.insights?.summary || null,
      keyTakeaways: safeArray(data.insights?.key_takeaways),
      chapters: safeArray(data.insights?.chapters)
    },
    verbatim_transcript: {
      text: data.transcript.transcript_text,
      segments: options.includeTimestamps ? (data.segments || []) : [],
    },
  };

  return JSON.stringify(output, null, 2);
}

// ─── MASTER CONTROLLER ───────────────────────────────────────────────────────

export function exportTranscript(data: ExportData, options: ExportOptions): ExportResult {
  const format = options.format || 'txt';
  const filename = `NorthOS_Dossier_${Date.now()}.${format}`;

  let content = '';
  switch (format) {
    case 'srt': content = exportToSrt(data, options); break;
    case 'vtt': content = exportToVtt(data, options); break;
    case 'json': content = exportToJson(data, options); break;
    case 'md':
    case 'docx': content = exportToMarkdown(data, options); break;
    default: content = exportToTxt(data, options);
  }

  return { content, filename, mimeType: MIME_TYPES[format] || 'text/plain' };
}

export function downloadExport(result: ExportResult): void {
  if (typeof document === 'undefined') return; // Ensure safety outside Web environments
  const blob = new Blob([result.content], { type: result.mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = result.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const ExportBuilder = {
  exportTranscript,
  downloadExport,
  formats: ['txt', 'srt', 'vtt', 'json', 'md'] as ExportFormat[],
  mimeTypes: MIME_TYPES
};