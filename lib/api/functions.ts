/**
 * lib/api/functions.ts
 * Typed wrappers for Supabase Edge Function invocations.
 * Optimized to bypass YouTube IP blocks by fetching captions client-side.
 */

import { supabase } from '../supabase/client';
import {
  fetchYouTubeCaptions,
  extractYouTubeId,
} from '../../utils/youtubeCaptions';

export const EdgeFunctions = {
  /**
   * Orchestrates the full video processing pipeline.
   * 1. Attempts client-side caption extraction (Fast Path).
   * 2. Invokes 'process-video' Edge Function with transcript (if found).
   */
  startProcessing: async (
    videoId: string,
    videoUrl: string,
    language = 'english',
    difficulty = 'standard',
  ) => {
    let transcriptText: string | null = null;

    // Phase 1: Client-side caption extraction (Bypasses Datacenter IP Blocks)
    try {
      const ytId = extractYouTubeId(videoUrl);
      if (ytId) {
        console.log(
          `[EdgeFunctions] Fast Path: Fetching captions for ${ytId}...`,
        );
        transcriptText = await fetchYouTubeCaptions(ytId);
      }
    } catch (e) {
      console.warn(
        '[EdgeFunctions] Client-side caption fetch failed, falling back to server STT:',
        e,
      );
    }

    // Phase 2: Invoke Edge Function
    // We use snake_case for the body to match Deno Edge Function expectations
    const { data, error } = await supabase.functions.invoke('process-video', {
      body: {
        video_id: videoId,
        video_url: videoUrl,
        transcript_text: transcriptText, // If null, server will try Deepgram/RapidAPI
        language: language.toLowerCase(),
        difficulty: difficulty.toLowerCase(),
      },
    });

    if (error) {
      throw new Error(error.message ?? 'Video processing failed');
    }

    return data;
  },

  /**
   * Manually triggers the pipeline for an existing record.
   * Enhanced to also attempt the Fast Path to avoid server-side failures.
   */
  processVideo: async (videoId: string, videoUrl: string) => {
    let transcriptText: string | null = null;

    try {
      const ytId = extractYouTubeId(videoUrl);
      if (ytId) {
        transcriptText = await fetchYouTubeCaptions(ytId);
      }
    } catch (e) {
      console.warn('[EdgeFunctions] Manual retry: Client-side fetch failed.');
    }

    const { data, error } = await supabase.functions.invoke('process-video', {
      body: {
        video_id: videoId,
        video_url: videoUrl,
        transcript_text: transcriptText,
      },
    });

    if (error) throw new Error(error.message ?? 'Failed to process video');
    return data;
  },

  /**
   * Regenerates AI insights for a video that already has a transcript.
   */
  generateInsights: async (
    videoId: string,
    transcriptText: string,
    language = 'English',
    difficulty = 'standard',
  ) => {
    const { data, error } = await supabase.functions.invoke('insights', {
      body: {
        videoId, // Keep as camelCase if your 'insights' function expects it
        text: transcriptText,
        language,
        difficulty,
      },
    });

    if (error) throw new Error(error.message ?? 'Failed to generate insights');
    return data;
  },

  /**
   * Fetches captions server-side for a YouTube video ID.
   * NOTE: This is likely to fail on Supabase/AWS IPs due to YouTube blocking.
   * Use startProcessing() whenever possible.
   */
  getCaptions: async (videoId: string) => {
    const { data, error } = await supabase.functions.invoke('get-captions', {
      body: { video_id: videoId },
    });

    if (error) throw new Error(error.message ?? 'Failed to fetch captions');
    return data as { transcript: string | null };
  },
};
