// This defines the strict shape of the JSON returned by Gemini and stored in Supabase.
export interface AiInsightsPayload {
  summary: string;
  chapterMarkers: ReadonlyArray<{ time: string; title: string }>;
  seo_metadata: {
    seoTags: ReadonlyArray<string>;
    suggested_titles: ReadonlyArray<string>;
    description: string;
  };
}

export interface DeepgramWord {
  /** Raw word token as returned by Deepgram. */
  word: string;
  /**
   * Word with punctuation applied (e.g. "Hello," vs "Hello").
   * Present when using Deepgram's Nova-2 and later models.
   */
  punctuated_word: string;
  /** Speaker diarisation index (integer); present when diarize is enabled. */
  speaker?: number;
  confidence: number;
}

/**
 * Represents a single transcription alternative within a Deepgram channel.
 * Includes the full transcript, a confidence score, and word-level details.
 */
export interface TranscriptAlternative {
  transcript: string;
  confidence: number;
  words: ReadonlyArray<DeepgramWord>;
}

/**
 * Represents a single audio channel from Deepgram's transcription API.
 * Contains an array of transcription alternatives.
 */
export interface TranscriptChannel {
  alternatives: ReadonlyArray<TranscriptAlternative>;
}

/**
 * Represents the JSON payload returned by Deepgram's transcription API.
 * The structure is deeply nested:
 * - `results.channels` is an array of audio channels (usually one for mono, two for stereo).
 * - Each channel contains `alternatives`, which are possible transcriptions (typically one, but can be more).
 * - Each alternative includes the full transcript, a confidence score, and an array of `DeepgramWord` objects for word-level detail.
 * This interface is used to parse and process raw transcription results in the application.
 */
export interface TranscriptJsonPayload {
  results: {
    channels: ReadonlyArray<TranscriptChannel>;
  };
}
