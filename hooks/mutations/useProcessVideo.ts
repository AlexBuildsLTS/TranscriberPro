/**
 * hooks/mutations/useProcessVideo.ts
 * Enterprise Pipeline Dispatcher (Anti-Crash Architecture)
 * ----------------------------------------------------------------------------
 * CRITICAL FIX: The mutation no longer "throws" errors. It always resolves 
 * successfully with a Payload object { success: boolean, errorMsg?: string }. 
 * This completely circumvents React Native's red LogBox screens.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase/client';
import { useVideoStore } from '../../store/useVideoStore';
import { parseVideoUrl } from '../../utils/videoParser';
import { fetchClientCaptions } from '../../utils/clientCaptions';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

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

export const useProcessVideo = () => {
    const queryClient = useQueryClient();
    const setActiveVideoId = useVideoStore((state) => state.setActiveVideoId);
    const setError = useVideoStore((state) => state.setError);
    const clearActiveVideo = useVideoStore((state) => state.clearActiveVideo);

    return useMutation({
        // The mutationFn now ALWAYS resolves. It never throws.
        mutationFn: async ({ videoUrl, language = 'English', difficulty = 'standard' }: ProcessVideoParams): Promise<DispatchResult> => {
            let activeUuid: string | null = null;

            try {
                const parsed = parseVideoUrl(videoUrl);
                if (!parsed.isValid || !parsed.videoId || !parsed.normalizedUrl) {
                    return { success: false, errorMsg: 'INVALID_MEDIA: URL format not recognized.' };
                }

                const { data: { session }, error: authError } = await supabase.auth.getSession();
                if (authError || !session?.user) {
                    return { success: false, errorMsg: 'UNAUTHORIZED: Session required.' };
                }

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
                    return { success: false, errorMsg: `DB_INIT_FAILED: ${dbError.message}` };
                }

                // Safely update UI state
                setActiveVideoId(videoUuid);

                let clientTranscript: string | null = null;
                try {
                    clientTranscript = await fetchClientCaptions(parsed.videoId, parsed.platform);
                } catch {
                    // Silent
                }

                const response = await fetch(`${SUPABASE_URL}/functions/v1/process-video`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SUPABASE_ANON_KEY,
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
                });

                if (!response.ok) {
                    return { success: false, errorMsg: `EDGE_HTTP_ERROR: ${response.status}`, videoId: videoUuid };
                }

                const data = await response.json();

                if (!data.success) {
                    return { success: false, errorMsg: data.error ?? 'EDGE_PROCESSING_FAILED', videoId: videoUuid };
                }

                return { success: true, videoId: videoUuid };

            } catch (err: unknown) {
                // Catch any unexpected network crashes (e.g. no internet)
                const msg = err instanceof Error ? err.message : String(err);
                return { success: false, errorMsg: msg, videoId: activeUuid ?? undefined };
            }
        },

        // Because mutationFn never throws, all UI logic goes into onSuccess
        onSuccess: async (result) => {
            if (result.success) {
                queryClient.invalidateQueries({ queryKey: ['history'] });
                queryClient.invalidateQueries({ queryKey: ['videos'] });
            } else {
                // IT FAILED. WE HANDLE IT CLEANLY HERE. NO RED SCREENS.
                const rawMsg = result.errorMsg || "Unknown error";
                console.log('[Dispatcher] Handled Failure:', rawMsg);

                // Update database if we created a row
                if (result.videoId) {
                    await supabase.from('videos').update({
                        status: 'failed',
                        error_message: rawMsg,
                        processing_completed_at: new Date().toISOString(),
                    }).eq('id', result.videoId);
                }

                // Professional UI Masking
                let cleanMsg = "An unexpected error occurred while processing the media.";

                if (rawMsg.includes("ALL_AUDIO_PROVIDERS_EXHAUSTED") || rawMsg.includes("TRANSCRIPTION_FAILED") || rawMsg.includes("HTTP 404")) {
                    cleanMsg = "We couldn't extract the audio for this specific video due to severe platform DRM restrictions. Please try another link.";
                } else if (rawMsg.includes("UNAUTHORIZED")) {
                    cleanMsg = "Your session has expired. Please sign in again.";
                } else if (rawMsg.includes("INVALID_MEDIA")) {
                    cleanMsg = "The provided URL is not a valid or supported video link.";
                } else if (rawMsg.includes("DB_INIT_FAILED")) {
                    cleanMsg = "Failed to initialize the process. Please check your connection and try again.";
                }

                setError(cleanMsg);
                if (clearActiveVideo) clearActiveVideo();
            }
        }
    });
};