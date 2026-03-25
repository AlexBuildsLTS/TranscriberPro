// store/useVideoStore.ts
import { create } from 'zustand';
import { supabase } from '../lib/supabase/client';
import {
  extractYouTubeId,
  fetchYouTubeCaptions,
} from '../utils/youtubeCaptions';
import type { Enums } from '../types/database/database.types';
import { Session } from '@supabase/supabase-js';

// Ensure VideoStatus is only defined ONCE
export type VideoStatus = Enums<'video_status'>;

const VIDEO_STATUS = {
  QUEUED: 'queued',
  FAILED: 'failed',
  COMPLETED: 'completed',
  PROCESSING: 'ai_processing', // Correctly mapped to your DB enum
} as const satisfies Record<string, VideoStatus>;

const ERROR_MESSAGES = {
  EDGE_FUNCTION_FAILED: 'Edge function failed.',
  INVALID_YOUTUBE_URL: 'Please enter a valid YouTube URL.',
  NOT_AUTHENTICATED: 'Not authenticated. Please sign in.',
  FAILED_CREATE_VIDEO_RECORD: 'Failed to create video record.',
  VIDEO_PROCESSING_FAILED: 'Video processing failed.',
  UNEXPECTED_ERROR: 'An unexpected error occurred.',
} as const;

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

const INITIAL_STATE: Pick<
  VideoState,
  'isProcessing' | 'currentVideoId' | 'currentVideoStatus' | 'error'
> = {
  isProcessing: false,
  currentVideoId: null,
  currentVideoStatus: null,
  error: null,
};

// --- Helper Functions ---

/**
 * Ensures a valid session exists before proceeding
 */
async function requireSession(): Promise<Session> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error(ERROR_MESSAGES.NOT_AUTHENTICATED);
  return session;
}

/**
 * Inserts the initial video record into the 'videos' table
 */
async function createQueuedVideoRecord(
  videoUrl: string,
  ytId: string,
  userId: string,
): Promise<string> {
  const { data: video, error } = await supabase
    .from('videos')
    .insert({
      youtube_url: videoUrl,
      youtube_video_id: ytId,
      user_id: userId,
      status: VIDEO_STATUS.QUEUED,
    })
    .select('id')
    .single();

  if (error) throw error;
  if (!video?.id) throw new Error(ERROR_MESSAGES.FAILED_CREATE_VIDEO_RECORD);

  return video.id;
}

/**
 * Invokes the Supabase Edge Function to process the video
 */
async function invokeProcessVideo(
  videoId: string,
  videoUrl: string,
  language: string,
  session: Session,
  transcriptText?: string | null,
) {
  const { data, error } = await supabase.functions.invoke('process-video', {
    body: {
      video_id: videoId,
      video_url: videoUrl,
      language,
      transcript_text: transcriptText,
    },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  // Handle both network-level errors and application-level success flags
  if (error || (data && (data as { success?: boolean }).success === false)) {
    throw new Error(
      (data as { error?: string })?.error ??
        ERROR_MESSAGES.VIDEO_PROCESSING_FAILED,
    );
  }
}

// --- Store Definition ---

export const useVideoStore = create<VideoState>((set, get) => ({
  ...INITIAL_STATE,

  clearError: () => set({ error: null }),

  reset: () => set(INITIAL_STATE),

  updateVideoStatus: (videoId, status) => {
    if (get().currentVideoId === videoId) {
      set({ currentVideoStatus: status });
    }
  },

  processVideo: async (videoUrl: string, language = 'english') => {
    // Prevent concurrent processing runs
    if (get().isProcessing) return;

    // Reset state and start processing
    set({
      ...INITIAL_STATE,
      isProcessing: true,
      error: null,
    });

    try {
      // 1. Validate YouTube ID
      const ytId = extractYouTubeId(videoUrl);
      if (!ytId) throw new Error(ERROR_MESSAGES.INVALID_YOUTUBE_URL);

      // 2. Auth Check
      const session = await requireSession();

      // 3. Fast-Path: Pre-fetch captions on client to save Edge Function time
      const transcriptText = await fetchYouTubeCaptions(ytId);

      // 4. Database: Create initial record
      const videoId = await createQueuedVideoRecord(
        videoUrl,
        ytId,
        session.user.id,
      );

      set({
        currentVideoId: videoId,
        currentVideoStatus: VIDEO_STATUS.QUEUED,
      });

      // 5. Trigger Backend: Hand off to Edge Function for Deepgram/Gemini
      await invokeProcessVideo(
        videoId,
        videoUrl,
        language,
        session,
        transcriptText,
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : ERROR_MESSAGES.UNEXPECTED_ERROR;
      set({
        error: message,
        isProcessing: false,
      });
    }
  },
}));
