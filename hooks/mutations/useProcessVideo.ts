/**
 * hooks/mutations/useProcessVideo.ts
 * Pipeline Dispatcher — Anti-Crash Architecture
 * ----------------------------------------------------------------------------
 * DESIGN PRINCIPLES:
 * - mutationFn NEVER throws. Always resolves with { success, errorMsg?, videoId? }.
 *   This prevents React Native's red LogBox error screens on pipeline failures.
 * - Client caption fast-path enforces a 50-word minimum quality gate before
 *   passing to the edge function. Sub-threshold transcripts are discarded so
 *   the server falls through to its scraper/audio tiers correctly.
 * - DB failure write completes BEFORE clearActiveVideo() is called, ensuring
 *   the realtime subscription and polling can observe the 'failed' status
 *   before the query is deactivated.
 * - Error masking translates raw internal error codes into user-facing copy.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase/client';
import { useVideoStore } from '../../store/useVideoStore';
import { parseVideoUrl } from '../../utils/videoParser';
import { fetchClientCaptions } from '../../utils/clientCaptions';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

// ─── MINIMUM QUALITY GATE ────────────────────────────────────────────────────
// Client-scraped captions under this threshold are considered unreliable.
// Discarding them forces the edge function through its own scraper/audio tiers.
const CLIENT_CAPTION_MIN_WORDS = 50;

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface ProcessVideoParams {
    videoUrl: string;
    language?: string;
    difficulty?: string;
}

interface DispatchResult {
    success: boolean;
    videoId?: string;
    errorMsg?: string;
}

// ─── USER-FACING ERROR MASKING ───────────────────────────────────────────────

/**
 * Maps raw internal/pipeline error codes to clean, user-facing messages.
 * Keeps implementation details out of the UI layer.
 */
function maskErrorMessage(rawMsg: string): string {
    if (
        rawMsg.includes('ALL_AUDIO_PROVIDERS_EXHAUSTED') ||
        rawMsg.includes('TRANSCRIPTION_FAILED') ||
        rawMsg.includes('HTTP 404')
    ) {
        return "We couldn't extract audio for this video due to platform restrictions. Please try another link.";
    }
    if (rawMsg.includes('UNAUTHORIZED')) {
        return 'Your session has expired. Please sign in again.';
    }
    if (rawMsg.includes('INVALID_MEDIA')) {
        return 'The provided URL is not a valid or supported video link.';
    }
    if (rawMsg.includes('DB_INIT_FAILED')) {
        return 'Failed to initialize the process. Please check your connection and try again.';
    }
    if (rawMsg.includes('EDGE_HTTP_ERROR')) {
        return 'The processing server is temporarily unavailable. Please try again shortly.';
    }
    return 'An unexpected error occurred while processing the media.';
}

// ─── HOOK ────────────────────────────────────────────────────────────────────

export const useProcessVideo = () => {
    const queryClient = useQueryClient();
    const setActiveVideoId = useVideoStore((s) => s.setActiveVideoId);
    const setError = useVideoStore((s) => s.setError);
    const clearActiveVideo = useVideoStore((s) => s.clearActiveVideo);

    return useMutation({
        /**
         * mutationFn — always resolves, never throws.
         *
         * Pipeline stages:
         * 1. Validate URL format
         * 2. Assert authenticated session
         * 3. Insert DB row → set activeVideoId (activates polling)
         * 4. Attempt client-side caption fast-path (quality-gated)
         * 5. POST to process-video edge function
         * 6. Return structured result
         */
        mutationFn: async ({
            videoUrl,
            language = 'English',
            difficulty = 'standard',
        }: ProcessVideoParams): Promise<DispatchResult> => {
            // Track the created DB row so the error handler can mark it failed
            let activeUuid: string | null = null;

            try {
                // ── 1. URL VALIDATION ──────────────────────────────────────────────
                const parsed = parseVideoUrl(videoUrl);
                if (!parsed.isValid || !parsed.videoId || !parsed.normalizedUrl) {
                    return {
                        success: false,
                        errorMsg: 'INVALID_MEDIA: URL format not recognised.',
                    };
                }

                // ── 2. SESSION ASSERTION ───────────────────────────────────────────
                const {
                    data: { session },
                    error: authError,
                } = await supabase.auth.getSession();

                if (authError || !session?.user) {
                    return { success: false, errorMsg: 'UNAUTHORIZED: Session required.' };
                }

                // ── 3. DB ROW INITIALISATION ───────────────────────────────────────
                const videoUuid = crypto.randomUUID();
                activeUuid = videoUuid;

                const { error: dbError } = await supabase.from('videos').insert({
                    id: videoUuid,
                    user_id: session.user.id,
                    youtube_url: parsed.normalizedUrl,
                    youtube_video_id: parsed.videoId,
                    platform: parsed.platform,
                    status: 'queued',
                });

                if (dbError) {
                    return {
                        success: false,
                        errorMsg: `DB_INIT_FAILED: ${dbError.message}`,
                    };
                }

                // Activate polling/realtime before the edge call so the UI is
                // responsive to status updates immediately after insert.
                setActiveVideoId(videoUuid);

                // ── 4. CLIENT CAPTION FAST-PATH (quality-gated) ───────────────────
                let clientTranscript: string | null = null;

                try {
                    const raw = await fetchClientCaptions(parsed.videoId, parsed.platform);

                    if (raw && raw.split(/\s+/).length >= CLIENT_CAPTION_MIN_WORDS) {
                        // Meets quality threshold — send to edge to skip its scraper tier
                        clientTranscript = raw;
                    } else if (raw) {
                        // Captured something but it's too short/garbage — discard it.
                        // The edge function will run its own scraper + audio fallback.
                        console.log(
                            '[useProcessVideo] Client captions below quality threshold — discarded.',
                        );
                    }
                } catch {
                    // Silent: CORS block on web or network error. Edge handles it.
                }

                // ── 5. EDGE FUNCTION DISPATCH ──────────────────────────────────────
                const response = await fetch(
                    `${SUPABASE_URL}/functions/v1/process-video`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            apikey: SUPABASE_ANON_KEY,
                            Authorization: `Bearer ${session.access_token}`,
                        },
                        body: JSON.stringify({
                            video_id: videoUuid,
                            video_url: parsed.normalizedUrl,
                            platform: parsed.platform,
                            transcript_text: clientTranscript,
                            language,
                            difficulty,
                        }),
                    },
                );

                if (!response.ok) {
                    return {
                        success: false,
                        errorMsg: `EDGE_HTTP_ERROR: ${response.status}`,
                        videoId: videoUuid,
                    };
                }

                const data = await response.json();

                if (!data.success) {
                    return {
                        success: false,
                        errorMsg: data.error ?? 'EDGE_PROCESSING_FAILED',
                        videoId: videoUuid,
                    };
                }

                return { success: true, videoId: videoUuid };
            } catch (err: unknown) {
                // Catch unexpected network crashes (no internet, DNS failure, etc.)
                const msg = err instanceof Error ? err.message : String(err);
                return {
                    success: false,
                    errorMsg: msg,
                    videoId: activeUuid ?? undefined,
                };
            }
        },

        /**
         * onSuccess — ALL UI logic lives here because mutationFn never throws.
         *
         * Success path: invalidate history/video caches so lists refresh.
         * Failure path:
         *   1. Write 'failed' status to DB (so the history list reflects it).
         *   2. Set user-facing error in the store.
         *   3. THEN clear the active video — after the DB write so polling
         *      can observe the failed state before the query is deactivated.
         */
        onSuccess: async (result: DispatchResult) => {
            if (result.success) {
                // Invalidate history list so the new completed entry appears
                queryClient.invalidateQueries({ queryKey: ['video-history'] });
                queryClient.invalidateQueries({ queryKey: ['videos'] });
                return;
            }

            // ── FAILURE HANDLING ─────────────────────────────────────────────────
            const rawMsg = result.errorMsg ?? 'Unknown error';
            console.log('[useProcessVideo] Pipeline failure:', rawMsg);

            // 1. Persist failed status to DB FIRST so polling/history reflects it
            if (result.videoId) {
                await supabase
                    .from('videos')
                    .update({
                        status: 'failed',
                        error_message: rawMsg,
                        processing_completed_at: new Date().toISOString(),
                    })
                    .eq('id', result.videoId);

                // Invalidate so history list picks up the failed record
                queryClient.invalidateQueries({ queryKey: ['video-history'] });

                // Also invalidate the specific video query so the polling loop
                // receives the final 'failed' state before being deactivated
                queryClient.invalidateQueries({
                    queryKey: ['video_relational', result.videoId],
                });
            }

            // 2. Surface clean error message in the UI
            setError(maskErrorMessage(rawMsg));

            // 3. Deactivate the active video AFTER DB write + cache invalidation
            //    Calling this earlier would kill polling before 'failed' propagates
            if (clearActiveVideo) clearActiveVideo();
        },
    });
};