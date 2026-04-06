/**
 * store/useVideoStore.ts
 * Ironclad State Management & Pipeline Orchestration (2026 Enterprise)
 * ----------------------------------------------------------------------------
 * FEATURES:
 * 1. STRICT SYNC: Fully mapped to your updated database.types.ts schema.
 * 2. PROXY TIMEOUT SHIELDS: Client-side extractors are wrapped in a 12s timeout race.
 * 3. DEEPGRAM FALLBACK ALIGNMENT: Passes null transcript if scraper fails, triggering backend Deepgram.
 * 4. TYPE SAFE: React Native environment-safe timeouts (no NodeJS types).
 */

import { create } from 'zustand';
import { supabase } from '../lib/supabase/client';
import { Database } from '../types/database/database.types';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;
import { parseVideoUrl } from '../utils/videoParser';
import { fetchClientCaptions } from '../utils/clientCaptions';
import { ContentDifficulty, ProcessVideoRequest } from '../types/api';

type VideoRow = Database['public']['Tables']['videos']['Row'];
type VideoStatus = Database['public']['Enums']['video_status'];

interface PipelineEvent {
  event: string;
  timestamp: number;
  details?: string;
  severity: 'info' | 'warn' | 'error' | 'success';
}

interface ProcessingOptions {
  language: string;
  difficulty: ContentDifficulty;
}

interface VideoState {
  videos: VideoRow[];
  activeVideoId: string | null;
  status: VideoStatus | null;
  isProcessing: boolean;
  error: string | null;

  pipelineEvents: PipelineEvent[];
  jobStartTime: number | null;
  jobEndTime: number | null;

  // Actions
  setActiveVideoId: (id: string | null) => void;
  setError: (error: string | null) => void;
  fetchUserVideos: () => Promise<void>;
  processNewVideo: (url: string, options: ProcessingOptions) => Promise<void>;
  recordEvent: (name: string, severity?: PipelineEvent['severity'], details?: string) => void;
  syncStatus: (status: VideoStatus, error?: string | null) => void;
  refreshLocalVideo: (data: Partial<VideoRow>) => void;
  setActiveJob: (video: VideoRow) => void;
  clearState: () => void;
  hardReset: () => void;
  clearActiveVideo: () => void;
}

// ─── UTILITY: STRICT PROMISE TIMEOUT ────────────────────────────────────────
// Using ReturnType<typeof setTimeout> fixes the NodeJS.Timeout React Native error
const withTimeout = <T>(promise: Promise<T>, ms: number, fallbackName: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`TIMEOUT: ${fallbackName} exceeded ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
};

export const useVideoStore = create<VideoState>((set, get) => ({
  videos: [],
  activeVideoId: null,
  status: null,
  isProcessing: false,
  error: null,
  pipelineEvents: [],
  jobStartTime: null,
  jobEndTime: null,

  setActiveVideoId: (id) => set({ activeVideoId: id, error: null }),

  setError: (error) => set({ error }),

  recordEvent: (event, severity = 'info', details) => {
    const newEvent: PipelineEvent = { event, timestamp: Date.now(), severity, details };
    set((state) => ({
      pipelineEvents: [newEvent, ...state.pipelineEvents].slice(0, 50)
    }));
    console.log(`[PIPELINE:${severity.toUpperCase()}] ${event} ${details ? `- ${details}` : ''}`);
  },

  clearState: () => set({ error: null }),

  hardReset: () => set({
    pipelineEvents: [],
    jobStartTime: null,
    jobEndTime: null,
    error: null,
    isProcessing: false,
    activeVideoId: null,
    status: null
  }),

  setActiveJob: (video) =>
    set({
      activeVideoId: video.id,
      status: video.status,
      error: video.error_message,
    }),

  syncStatus: (status, error = null) => set({ status, error }),

  refreshLocalVideo: (data) =>
    set((state) => ({
      videos: state.videos.map((v) =>
        v.id === state.activeVideoId ? { ...v, ...data } : v,
      ),
    })),

  fetchUserVideos: async () => {
    const { recordEvent } = get();
    try {
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError || !session?.user) {
        recordEvent('SESSION_MISSING', 'warn', 'Fetch attempted without valid auth context.');
        return;
      }

      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ videos: data || [], error: null });
      recordEvent('DATA_SYNCED', 'success', `Loaded ${data?.length} historical records.`);
    } catch (error: unknown) {
      recordEvent('SYNC_FAILURE', 'error', error instanceof Error ? error.message : String(error));
    }
  },

  processNewVideo: async (url, options) => {
    const { recordEvent, hardReset } = get();
    hardReset();
    set({ isProcessing: true, jobStartTime: Date.now() });

    let targetDbId: string | null = null;

    try {
      recordEvent('HANDSHAKE_INIT', 'info', 'Validating secure session token...');

      const { data: { session }, error: authError } = await supabase.auth.getSession();
      if (authError || !session?.user) {
        throw new Error('AUTHENTICATION_FAILURE: Token expired. Please sign in again.');
      }

      recordEvent('SIGNATURE_ANALYSIS', 'info', 'Parsing media source format...');
      const parsed = parseVideoUrl(url);
      if (!parsed.isValid || !parsed.videoId || !parsed.normalizedUrl) {
        throw new Error('INCOMPATIBLE_SOURCE: Provided URL format is malformed or unsupported.');
      }

      recordEvent('DB_PROVISIONING', 'info', `Target Media ID: ${parsed.videoId}`);

      // 1. Establish the Database Record to track progress
      const { data: videoRecord, error: dbError } = await supabase
        .from('videos')
        .insert({
          user_id: session.user.id,
          platform: parsed.platform,
          youtube_url: parsed.normalizedUrl,
          youtube_video_id: parsed.videoId,
          status: 'queued',
        })
        .select()
        .single();

      if (dbError || !videoRecord) {
        throw new Error(`CRITICAL_DB_ERROR: ${dbError?.message || 'Provisioning failed.'}`);
      }

      targetDbId = videoRecord.id;
      set((state) => ({ activeVideoId: targetDbId, videos: [videoRecord, ...state.videos] }));

      // ─── CLIENT EXTRACTION (FAST-PATH) ───
      recordEvent('FAST_PATH_INIT', 'info', 'Attempting client-side native extraction...');

      let clientTranscript: string | null = null;

      try {
        // Strict 12s timeout for caption scraping. Backend will fetch audio if this fails.
        clientTranscript = await withTimeout(
          fetchClientCaptions(parsed.videoId, parsed.platform),
          12000,
          'Caption_Proxy'
        );

        if (clientTranscript) {
          recordEvent('FAST_PATH_CAPTIONS', 'success', `Secured verbatim transcript natively.`);
        } else {
          recordEvent('FAST_PATH_CAPTIONS', 'warn', 'Native captions unavailable. Escalating to Sovereign Edge.');
        }
      } catch (e) {
        recordEvent('FAST_PATH_FAIL', 'warn', 'Proxy timed out. Seamlessly escalating to Sovereign Edge.');
      }

      // ─── EDGE DELEGATION ───
      recordEvent('SERVER_HANDOFF', 'info', 'Relaying command payload to Edge Processing Node...');

      // Enforce the exact ProcessVideoRequest type expected by your API
      const requestPayload: ProcessVideoRequest = {
        video_id: targetDbId,
        video_url: parsed.normalizedUrl,
        language: options.language,
        difficulty: options.difficulty,
        transcript_text: clientTranscript,
        audio_url: null // The backend will use audio.ts to resolve this if clientTranscript is null
      };

      const edgeResponse = await fetch(
        `${SUPABASE_URL}/functions/v1/process-video`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_ANON_KEY,
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(requestPayload),
        }
      );

      if (!edgeResponse.ok) {
        const errJson = await edgeResponse.json().catch(() => ({}));
        throw new Error(errJson.error || `NODE_GATEWAY_REFUSED: HTTP ${edgeResponse.status}`);
      }

      const result = await edgeResponse.json();

      if (result.success === false) {
        throw new Error(result.error || 'The remote Edge Node encountered a fatal processing error.');
      }

      recordEvent('PIPELINE_FINALIZED', 'success', 'Assets compiled and stored in vault.');
      set({ jobEndTime: Date.now() });

      await get().fetchUserVideos();

    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      recordEvent('PIPELINE_CRASH', 'error', errMsg);
      set({ error: errMsg, isProcessing: false });

      if (targetDbId) {
        await supabase
          .from('videos')
          .update({
            status: 'failed',
            error_message: errMsg,
            processing_completed_at: new Date().toISOString()
          })
          .eq('id', targetDbId);
      }
    } finally {
      set({ isProcessing: false });
    }
  },

  clearActiveVideo: () => set({ activeVideoId: null, status: null, error: null }),
}));