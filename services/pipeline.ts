/**
 * services/pipeline.ts
 * Pipeline Orchestration Service
 */

import { supabase } from '../lib/supabase/client';
import { Database } from '../types/database/database.types';
import { parseVideoUrl } from '../utils/videoParser';

type VideoInsert = Database['public']['Tables']['videos']['Insert'];
type VideoStatus = Database['public']['Enums']['video_status'];

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string;

export interface PipelineResult {
    success: boolean;
    videoId?: string;
    batchId?: string;
    error?: string;
}

interface EdgeResponse {
    success: boolean;
    error?: string;
}

// ─── UTILITY: EXPONENTIAL BACKOFF RETRY ─────────────────────────────────────
async function withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 2,
    baseDelayMs: number = 1000,
): Promise<T> {
    let attempt = 0;
    while (attempt < maxRetries) {
        try {
            return await operation();
        } catch (error: unknown) {
            attempt++;
            if (attempt >= maxRetries) throw error;
            const msg = error instanceof Error ? error.message : String(error);
            console.warn(`[Pipeline:Retry] Operation failed. Retrying ${attempt}/${maxRetries}... ${msg}`);
            await new Promise((res) => setTimeout(res, baseDelayMs * Math.pow(2, attempt - 1)));
        }
    }
    throw new Error('Retry loop failed.');
}

// ─── UTILITY: ARRAY CHUNKING ────────────────────────────────────────────────
function chunkArray<T>(array: T[], size: number): T[][] {
    const chunked: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunked.push(array.slice(i, i + size));
    }
    return chunked;
}

export class PipelineService {
    /**
     * Process a single video — background/headless path.
     */
    static async processSingleVideo(
        url: string,
        language: string = 'English',
        difficulty: string = 'standard',
        clientTranscript: string | null = null,
    ): Promise<PipelineResult> {
        try {
            const parsed = parseVideoUrl(url);
            if (!parsed.isValid || !parsed.normalizedUrl) {
                throw new Error('INVALID_MEDIA: URL format not recognized.');
            }

            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) throw new Error('UNAUTHORIZED: Valid session required.');

            const { data: videoRecord, error: dbError } = await supabase
                .from('videos')
                .insert({
                    user_id: session.user.id,
                    youtube_url: parsed.normalizedUrl,
                    youtube_video_id: parsed.videoId,
                    status: 'queued' as VideoStatus,
                    platform: parsed.platform,
                })
                .select('id')
                .single();

            if (dbError || !videoRecord) throw new Error(`DB_SYNC_ERROR: ${dbError?.message}`);

            await withRetry(async () => {
                const response = await fetch(`${SUPABASE_URL}/functions/v1/process-video`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SUPABASE_ANON_KEY,
                        Authorization: `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({
                        video_id: videoRecord.id,
                        video_url: parsed.normalizedUrl,
                        platform: parsed.platform,
                        language,
                        difficulty,
                        transcript_text: clientTranscript,
                    }),
                });

                if (!response.ok) throw new Error(`EDGE_GATEWAY_ERROR: HTTP ${response.status}`);

                const data = (await response.json()) as EdgeResponse;
                if (!data.success) throw new Error(`EDGE_EXECUTION_ERROR: ${data.error ?? 'Unknown'}`);
            });

            return { success: true, videoId: videoRecord.id };
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error('[PipelineService:Single] Critical Failure:', msg);
            return { success: false, error: msg };
        }
    }

    /**
     * High-volume batch orchestrator.
     */
    static async submitBatch(
        urls: string[],
        batchName: string,
    ): Promise<PipelineResult> {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) throw new Error('UNAUTHORIZED: Session expired.');

            const validVideos = urls
                .map(url => parseVideoUrl(url))
                .filter(p => p.isValid && p.normalizedUrl);

            if (validVideos.length === 0) {
                throw new Error('VALIDATION_FAILED: No valid video URLs found in batch.');
            }

            const { data: batch, error: batchError } = await supabase
                .from('batch_jobs')
                .insert({
                    user_id: session.user.id,
                    name: batchName,
                    status: 'processing',
                    total_videos: validVideos.length,
                    completed_videos: 0,
                    failed_videos: 0,
                })
                .select('id')
                .single();

            if (batchError || !batch) throw new Error(`BATCH_INIT_FAILED: ${batchError?.message}`);

            const videoInserts: VideoInsert[] = validVideos.map((parsed) => ({
                user_id: session.user.id,
                batch_job_id: batch.id,
                youtube_url: parsed.normalizedUrl!,
                youtube_video_id: parsed.videoId,
                status: 'queued' as VideoStatus,
                platform: parsed.platform,
            }));

            const chunks = chunkArray(videoInserts, 50);
            for (const chunk of chunks) {
                const { error: chunkError } = await supabase.from('videos').insert(chunk);
                if (chunkError) throw new Error(`CHUNK_INSERT_FAILED: ${chunkError.message}`);
            }

            console.log(`[PipelineService:Batch] Dispatched ${validVideos.length} videos to batch ${batch.id}`);
            return { success: true, batchId: batch.id };
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error('[PipelineService:Batch] Critical Failure:', msg);
            return { success: false, error: msg };
        }
    }

    /**
     * Hard-delete a video record and terminate its processing.
     */
    static async killProcess(videoId: string): Promise<boolean> {
        try {
            const { error } = await supabase.from('videos').delete().eq('id', videoId);
            if (error) throw error;
            console.log(`[PipelineService:Kill] Terminated process: ${videoId}`);
            return true;
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`[PipelineService:Kill] Failed to terminate: ${msg}`);
            return false;
        }
    }
}
