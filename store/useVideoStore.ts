import { create } from 'zustand';
import { supabase } from '../lib/supabase/client';
import { extractYouTubeId } from '../utils/youtubeCaptions';

interface VideoState {
  isProcessing: boolean;
  currentVideoId: string | null;
  error: string | null;
  clearError: () => void;
  processVideo: (videoUrl: string) => Promise<void>;
}

export const useVideoStore = create<VideoState>((set) => ({
  isProcessing: false,
  currentVideoId: null,
  error: null,

  clearError: () => set({ error: null }),

  processVideo: async (videoUrl: string) => {
    set({ isProcessing: true, error: null, currentVideoId: null });

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user)
        throw new Error('Not authenticated. Please sign in again.');

      const { data: memberData, error: memberError } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (memberError || !memberData)
        throw new Error('No workspace found. Please sign out and back in.');

      const workspaceId = memberData.workspace_id;
      const ytId = extractYouTubeId(videoUrl);

      // ── Fetch captions via server-side proxy (no CORS issues) ──────────
      // The get-captions edge function runs on Deno — no CORS restrictions.
      // It calls Invidious/YouTube server-side and returns the transcript.
      let clientTranscript: string | null = null;
      let captionMethod = 'server';

      if (ytId) {
        try {
          console.log('[Store] Fetching captions via server proxy for:', ytId);
          const { data: captionData, error: captionError } =
            await supabase.functions.invoke('get-captions', {
              body: { video_id: ytId },
            });

          if (!captionError && captionData?.transcript) {
            clientTranscript = captionData.transcript;
            captionMethod = 'proxy_captions';
            console.log(
              '[Store] Proxy captions success:',
              clientTranscript?.length,
              'chars',
            );
          } else {
            console.log(
              '[Store] Proxy captions returned nothing, server will use Deepgram',
            );
          }
        } catch (captionErr) {
          console.warn('[Store] Caption proxy failed:', captionErr);
        }
      }

      // ── Insert video record ────────────────────────────────────────────
      const { data: videoData, error: insertError } = await supabase
        .from('videos')
        .insert([
          {
            youtube_url: videoUrl,
            youtube_video_id: ytId ?? null,
            workspace_id: workspaceId,
            uploaded_by: user.id,
            status: 'queued',
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      set({ currentVideoId: videoData.id });

      // ── Invoke process-video — fire and forget ─────────────────────────
      const body: Record<string, unknown> = {
        video_id: videoData.id,
        video_url: videoUrl,
      };

      if (clientTranscript) {
        body.transcript_text = clientTranscript;
        body.transcript_method = captionMethod;
      }

      supabase.functions
        .invoke('process-video', { body })
        .then(({ error: fnError }) => {
          if (fnError)
            console.warn('[Store] Edge function warning:', fnError.message);
        })
        .catch((err) =>
          console.warn('[Store] Edge function invoke warning:', err),
        );

      set({ isProcessing: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[Store] processVideo error:', message);
      set({ error: message, isProcessing: false });
    }
  },
}));
