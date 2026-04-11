/**
 * hooks/mutations/useProcessVideo.ts
 * Pipeline Dispatcher — Enterprise Universal Architecture
 * ----------------------------------------------------------------------------
 * DESIGN PRINCIPLES:
 * - UNIVERSAL COMPATIBILITY: Uses `expo-crypto` to guarantee UUID generation
 * works flawlessly across Web, Android, and iOS without engine crashes.
 * - ANTI-CRASH GUARANTEE: mutationFn NEVER throws. Resolves safely to prevent 
 * React Native LogBox red screens.
 * - QUALITY GATE: Client captions require 50+ words to bypass Edge scraping.
 * - ATOMIC DB WRITES: Failure states are pushed to Supabase BEFORE local cache 
 * clearing to ensure perfect real-time UI synchronization.
 * ----------------------------------------------------------------------------
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto'; // UNIVERSAL: Works on Web, iOS, and Android
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
        mutationFn: async ({
            videoUrl,
            language = 'English',
            difficulty = 'standard',
        }: ProcessVideoParams): Promise<DispatchResult> => {
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
                // UNIVERSAL UUID: Automatically routes to Web Crypto or Native Enclave
                const videoUuid = Crypto.randomUUID();
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

                // Activate polling/realtime
                setActiveVideoId(videoUuid);

                // ── 4. CLIENT CAPTION FAST-PATH (quality-gated) ───────────────────
                let clientTranscript: string | null = null;

                try {
                    const raw = await fetchClientCaptions(parsed.videoId, parsed.platform);

                    if (raw && raw.split(/\s+/).length >= CLIENT_CAPTION_MIN_WORDS) {
                        clientTranscript = raw;
                    } else if (raw) {
                        console.log('[useProcessVideo] Client captions below quality threshold — discarded.');
                    }
                } catch {
                    // Silent: CORS block on web or network error. Edge handles it gracefully.
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
                const msg = err instanceof Error ? err.message : String(err);
                return {
                    success: false,
                    errorMsg: msg,
                    videoId: activeUuid ?? undefined,
                };
            }
        },

        onSuccess: async (result: DispatchResult) => {
            if (result.success) {
                queryClient.invalidateQueries({ queryKey: ['video-history'] });
                queryClient.invalidateQueries({ queryKey: ['videos'] });
                return;
            }

            // ── FAILURE HANDLING ─────────────────────────────────────────────────
            const rawMsg = result.errorMsg ?? 'Unknown error';
            console.log('[useProcessVideo] Pipeline failure:', rawMsg);

            // Persist failed status to DB FIRST so polling/history reflects it
            if (result.videoId) {
                await supabase
                    .from('videos')
                    .update({
                        status: 'failed',
                        error_message: rawMsg,
                        processing_completed_at: new Date().toISOString(),
                    })
                    .eq('id', result.videoId);

                queryClient.invalidateQueries({ queryKey: ['video-history'] });
                queryClient.invalidateQueries({
                    queryKey: ['video_relational', result.videoId],
                });
            }

            // Surface clean error message in the UI
            setError(maskErrorMessage(rawMsg));

            // Clear the active video AFTER DB write + cache invalidation
            if (clearActiveVideo) clearActiveVideo();
        },
    });
};