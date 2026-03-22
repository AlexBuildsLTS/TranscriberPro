/**
 * lib/api/functions.ts
 * Typed wrappers for Supabase Edge Function invocations.
 * Field names match exactly what each edge function expects in req.json().
 */

import { supabase } from '../supabase/client';

export const EdgeFunctions = {
  /**
   * Manually triggers the full STT + AI pipeline for an existing video record.
   * Called from settings / admin flows; the main flow uses useVideoStore directly.
   */
  processVideo: async (videoId: string, videoUrl: string) => {
    const { data, error } = await supabase.functions.invoke('process-video', {
      body: { video_id: videoId, video_url: videoUrl },
    });
    if (error) throw new Error(error.message ?? 'Failed to process video');
    return data;
  },

  /**
   * Regenerates AI insights for a video that already has a transcript.
   * videoId must exist in the ai_insights table (upsert is used server-side).
   */
  generateInsights: async (
    videoId: string,
    transcriptText: string,
    language = 'English',
    difficulty = 'general',
  ) => {
    const { data, error } = await supabase.functions.invoke(
      'generate-ai-insights',
      {
        body: { videoId, text: transcriptText, language, difficulty },
      },
    );
    if (error) throw new Error(error.message ?? 'Failed to generate insights');
    return data;
  },

  /**
   * Fetches captions server-side for a YouTube video ID.
   * Returns { transcript: string | null }.
   */
  getCaptions: async (videoId: string) => {
    const { data, error } = await supabase.functions.invoke('get-captions', {
      body: { video_id: videoId },
    });
    if (error) throw new Error(error.message ?? 'Failed to fetch captions');
    return data as { transcript: string | null };
  },
};
