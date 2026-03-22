// store/useVideoStore.ts - UPDATED for new schema

import { create } from 'zustand';
import { supabase } from '../lib/supabase/client';
import { extractYouTubeId } from '../utils/youtubeCaptions';
import type { Enums, TablesInsert } from '../types/database/database.types';

export type VideoStatus = Enums<'video_status'>;

interface ProcessVideoPayload {
  video_id: string;
  video_url: string;
  language?: string;
  difficulty?: string;
  transcript_text?: string | null;
}

interface VideoState {
  isProcessing: boolean;
  currentVideoId: string | null;
  currentVideoStatus: VideoStatus | null;
  error: string | null;
  clearError: () => void;
  reset: () => void;
  updateVideoStatus: (videoId: string, status: VideoStatus) => void;
  processVideo: (videoUrl: string, language?: string) => Promise<void>;
}

const INITIAL_STATE = {
  isProcessing: false,
  currentVideoId: null,
  currentVideoStatus: null,
  error: null,
};

export const useVideoStore = create<VideoState>((set, get) => ({
  ...INITIAL_STATE,

  clearError: () => set({ error: null }),
  reset: () => set(INITIAL_STATE),
  updateVideoStatus: (_videoId, status) => set({ currentVideoStatus: status }),

  processVideo: async (videoUrl: string, language: string = 'english') => {
    if (get().isProcessing) return;

    const ytId = extractYouTubeId(videoUrl);
    if (!ytId) {
      set({ error: 'Please enter a valid YouTube URL.' });
      return;
    }

    set({ isProcessing: true, error: null });

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user || !session) throw new Error('Not authenticated.');

      // Insert video record (no workspace_id needed anymore!)
      const videoInsert: TablesInsert<'videos'> = {
        youtube_url: videoUrl,
        youtube_video_id: ytId,
        user_id: user.id,
        status: 'queued',
      };

      const { data: video, error: insertError } = await supabase
        .from('videos')
        .insert([videoInsert])
        .select('id')
        .single();

      if (insertError || !video)
        throw insertError || new Error('Failed to create video record.');

      const videoId = video.id;
      set({ currentVideoId: videoId, currentVideoStatus: 'queued' });

      // Fire edge function — let it handle ALL caption/audio/transcription
      const payload: ProcessVideoPayload = {
        video_url: videoUrl,
        video_id: videoId,
        language: language.toLowerCase(),
        difficulty: 'standard',
        transcript_text: null, // Edge function handles this
      };

      try {
        const { error: fnError } = await supabase.functions.invoke('process-video', {
          body: payload,
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (fnError) {
          console.error('[Store] Edge Function Error:', fnError.message);
          await supabase
            .from('videos')
            .update({ status: 'failed', error_message: fnError.message })
            .eq('id', videoId);
          set({
            currentVideoStatus: 'failed',
            error: 'Processing failed to start.',
          });
        }
      } catch (err) {
        console.error('[Store] Invoke Exception:', err);
        await supabase
          .from('videos')
          .update({
            status: 'failed',
            error_message: 'Network error contacting Edge Function',
          })
          .eq('id', videoId);
        set({
          currentVideoStatus: 'failed',
          error: 'Network error while processing.',
        });
      } finally {
        set({ isProcessing: false });
      }
    } catch (err: any) {
      console.error('[Store] Process Error:', err);
      set({
        error: err.message || 'An unexpected error occurred.',
        isProcessing: false,
      });
    }
  },
}));
