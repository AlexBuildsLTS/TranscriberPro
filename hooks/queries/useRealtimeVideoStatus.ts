/**
 * hooks/queries/useRealtimeVideoStatus.ts
 * Active WebSocket Listener & Store Synchroniser
 * ----------------------------------------------------------------------------
 * DESIGN PRINCIPLES:
 * - Uses `invalidateQueries` instead of `setQueryData` to avoid overwriting
 *   the normalised relational shape that useVideoData produces. Previously,
 *   setQueryData would merge a flat VideoRow onto the relational cache entry,
 *   silently stripping ai_insights and transcripts from the shape useVideoData
 *   returns — causing the results page to render empty fields after completion.
 * - The base query uses its own isolated cache key ['video_status', videoId]
 *   so it never collides with the ['video_relational', videoId] key that
 *   useVideoData owns.
 * - On terminal status (completed | failed), a full history invalidation is
 *   also triggered so the archive list reflects the final state immediately.
 * - Store synchronisation (setActiveVideoId, setError) is kept here so
 *   components using this hook get store updates without extra wiring.
 * ----------------------------------------------------------------------------
 * NOTE: This hook is designed for active in-flight job monitoring.
 *       For the results/dossier view, use useVideoData directly — it handles
 *       relational data fetching and smart polling on its own.
 */

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase/client';
import { useVideoStore } from '../../store/useVideoStore';
import { Database } from '../../types/database/database.types';

type VideoRow = Database['public']['Tables']['videos']['Row'];
type VideoStatus = Database['public']['Enums']['video_status'];

// Statuses that indicate the pipeline has finished (success or failure).
// Once reached, polling stops and the realtime channel is redundant.
const TERMINAL_STATUSES = new Set<VideoStatus>(['completed', 'failed']);

// ─── HOOK ────────────────────────────────────────────────────────────────────

export const useRealtimeVideoStatus = (videoId: string | null) => {
  const queryClient = useQueryClient();
  const { setActiveVideoId, setError } = useVideoStore();

  // ── BASE STATUS QUERY ───────────────────────────────────────────────────
  // Isolated key ['video_status', ...] — never touches the relational cache
  // owned by useVideoData. Fetches only the videos row (no joins needed here).
  const { data, isLoading, error } = useQuery<VideoRow | null>({
    queryKey: ['video_status', videoId],
    queryFn: async () => {
      if (!videoId) return null;

      const { data: row, error: dbError } = await supabase
        .from('videos')
        .select('*')
        .eq('id', videoId)
        .single();

      // PGRST116 = no rows — treat as soft 404 (row may not exist yet)
      if (dbError) {
        if (dbError.code === 'PGRST116') return null;
        throw new Error(dbError.message);
      }

      return row as VideoRow;
    },
    enabled: !!videoId,
    // Poll every 2s while the job is active. The realtime subscription below
    // covers instant updates; polling is a safety net for missed events.
    refetchInterval: (query) => {
      const status = query.state.data?.status as VideoStatus | undefined;
      return status && TERMINAL_STATUSES.has(status) ? false : 2000;
    },
    refetchIntervalInBackground: false,
    staleTime: 2000,
    retry: 1,
  });

  // ── STORE SYNC ──────────────────────────────────────────────────────────
  // Keep the Zustand store in sync with the active video ID whenever it changes.
  useEffect(() => {
    if (videoId) setActiveVideoId(videoId);
  }, [videoId, setActiveVideoId]);

  // ── REALTIME SUBSCRIPTION ───────────────────────────────────────────────
  useEffect(() => {
    if (!videoId) return;

    // Unique channel ID prevents subscription collision on fast remounts
    const channelId = `video-status-${videoId}-${Date.now()}`;

    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'videos',
          filter: `id=eq.${videoId}`,
        },
        (payload) => {
          const updatedRow = payload.new as VideoRow;
          const newStatus = updatedRow.status as VideoStatus;

          // Surface pipeline errors to the UI immediately
          if (newStatus === 'failed' && updatedRow.error_message) {
            setError(updatedRow.error_message);
          }

          // Update this hook's isolated status cache with the latest flat row.
          // This does NOT touch ['video_relational', videoId] so useVideoData's
          // normalised shape (with ai_insights / transcripts) stays intact.
          queryClient.setQueryData(
            ['video_status', videoId],
            (prev: VideoRow | null | undefined) => ({
              ...(prev ?? {}),
              ...updatedRow,
            }),
          );

          // On terminal status: invalidate the RELATIONAL cache so useVideoData
          // re-fetches the full joined payload (transcript + ai_insights).
          // This is the correct way to refresh relational data — let useVideoData
          // handle normalisation rather than merging raw rows here.
          if (TERMINAL_STATUSES.has(newStatus)) {
            queryClient.invalidateQueries({
              queryKey: ['video_relational', videoId],
            });
            queryClient.invalidateQueries({
              queryKey: ['video-history'],
            });
          }
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(
            `[Realtime] Synced to video node ${videoId.slice(0, 8)}`,
          );
        }
        if (status === 'CHANNEL_ERROR') {
          console.warn(
            `[Realtime] Channel error for ${videoId.slice(0, 8)} — polling fallback active`,
          );
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [videoId, queryClient, setError]);

  return { data, isLoading, error };
};