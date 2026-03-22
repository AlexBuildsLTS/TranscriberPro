/**
 * process-video/deepgram.ts
 * Deepgram Nova-2 STT wrapper
 */

interface DeepgramResult {
  text: string;
  json: unknown;
}

export async function transcribeAudio(audioUrl: string): Promise<DeepgramResult> {
  const apiKey = Deno.env.get('DEEPGRAM_API_KEY');
  if (!apiKey) throw new Error('DEEPGRAM_API_KEY not configured');

const res = await fetch(
  'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&punctuate=true&diarize=true&detect_language=true',
    {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: audioUrl }),
      signal: AbortSignal.timeout(180_000),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Deepgram error (${res.status}): ${body.substring(0, 300)}`);
  }

  const data = await res.json();
  const text = data.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? '';
  
  if (!text) throw new Error('Deepgram returned empty transcript');

  return { text, json: data };
}