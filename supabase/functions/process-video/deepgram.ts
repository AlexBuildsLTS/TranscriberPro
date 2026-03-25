/**
 * process-video/deepgram.ts
 * Deepgram Nova-2 STT wrapper
 */

const DEEPGRAM_URL =
  'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true&diarize=true&detect_language=true';

interface DeepgramResult {
  text: string;
  json: unknown;
  method: string;
}

/**
 * Transcribes audio using Deepgram's Nova-2 API.
 * @param audioUrl - The URL of the audio stream to transcribe.
 * @param options - Optional settings for transcription behavior.
 * @returns An object containing the transcript text, raw JSON response, and metadata.
 * @throws Will throw an error if the API key is missing, the API call fails, or returns an empty transcript.
 */
export async function transcribeAudio(
  audioUrl: string,
  options?: { throwOnEmptyTranscript?: boolean },
): Promise<DeepgramResult> {
  const apiKey = Deno.env.get('DEEPGRAM_API_KEY');
  if (!apiKey) {
    throw new Error(
      'DEEPGRAM_API_KEY is not configured. Cannot perform transcription.',
    );
  }

  console.log('[Deepgram] Sending audio URL for transcription...');
  console.log(`[Deepgram] Audio URL: ${audioUrl.substring(0, 100)}...`);

  const res = await fetch(DEEPGRAM_URL, {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url: audioUrl }),
    signal: AbortSignal.timeout(180_000), // 3-minute timeout for long videos
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`[Deepgram] Error ${res.status}: ${body.substring(0, 500)}`);
    throw new Error(`Deepgram API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const text = data.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? '';
  const confidence =
    data.results?.channels?.[0]?.alternatives?.[0]?.confidence ?? 0;
  const detectedLang = data.results?.channels?.[0]?.detected_language ?? 'en';

  console.log(
    `[Deepgram] ✓ Transcription complete: ${text.length} chars, confidence: ${(confidence * 100).toFixed(1)}%, language: ${detectedLang}`,
  );

  if (!text && options?.throwOnEmptyTranscript) {
    console.warn('[Deepgram] Empty transcript returned');
    throw new Error('Deepgram returned an empty transcript.');
  }

  return { text, json: data, method: 'deepgram' };
}
