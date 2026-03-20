import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { formatTranscriptTime } from '../../utils/formatters/time';

/**
 * @description Premium Transcript Component
 * Features: Deepgram word-level extraction, Speaker grouping,
 * Long-pause detection, and a Raw Payload Debugger.
 */

interface Word {
  word: string;
  punctuated_word?: string;
  start: number;
  end: number;
  speaker?: number;
}

interface TranscriptGroup {
  speaker: number;
  text: string;
  startTime: number;
}

export const TranscriptViewer = ({
  transcriptJson,
}: {
  transcriptJson: any;
}) => {
  const [showRaw, setShowRaw] = useState(false);

  // 1. EXTRACTION LOGIC: Handles Deepgram Nova-2, Flat Arrays, or Raw Text
  const words = useMemo(() => {
    if (!transcriptJson) return [];

    let parsed = transcriptJson;
    if (typeof transcriptJson === 'string') {
      try {
        parsed = JSON.parse(transcriptJson);
      } catch (e) {
        return [];
      }
    }

    // Target 1: Deepgram Standard Format
    if (parsed?.results?.channels?.[0]?.alternatives?.[0]?.words) {
      return parsed.results.channels[0].alternatives[0].words;
    }
    // Target 2: Flat Array
    if (Array.isArray(parsed)) return parsed;
    // Target 3: Generic 'words' wrapper
    if (parsed?.words && Array.isArray(parsed.words)) return parsed.words;
    // Target 4: Fallback for Whisper or raw text
    if (parsed?.text)
      return [{ start: 0, end: 0, word: parsed.text, speaker: 0 }];

    return [];
  }, [transcriptJson]);

  // 2. GROUPING LOGIC: Merges words into paragraphs by speaker and time-gaps
  const groupedTranscript = useMemo(() => {
    if (words.length === 0) return [];

    const groups: TranscriptGroup[] = [];
    let currentGroup: TranscriptGroup = {
      speaker: words[0].speaker ?? 0,
      text: '',
      startTime: words[0].start || 0,
    };

    words.forEach((wordObj: Word, index: number) => {
      const isNewSpeaker =
        wordObj.speaker !== undefined &&
        wordObj.speaker !== currentGroup.speaker;
      const isLongPause =
        index > 0 && wordObj.start - words[index - 1].end > 2.0; // 2 second gap
      const wordText = wordObj.punctuated_word || wordObj.word || '';

      if (isNewSpeaker || isLongPause) {
        // Push existing group and start new one
        groups.push({ ...currentGroup, text: currentGroup.text.trim() });
        currentGroup = {
          speaker: wordObj.speaker ?? 0,
          text: wordText,
          startTime: wordObj.start || 0,
        };
      } else {
        currentGroup.text += ` ${wordText}`;
      }
    });

    // Push the final group
    groups.push({ ...currentGroup, text: currentGroup.text.trim() });
    return groups;
  }, [words]);

  // ── EMPTY / ERROR STATE ───────────────────────────────────────────
  if (words.length === 0) {
    return (
      <View className="p-8 border border-neon-pink/30 rounded-3xl bg-neon-pink/[0.02]">
        <Text className="text-neon-pink font-black text-[10px] tracking-[4px] uppercase mb-4 text-center">
          Payload_Stream_Empty
        </Text>
        <Text className="mb-6 text-xs leading-relaxed text-center text-white/40">
          The node is active, but the transcript data is unreadable or not yet
          synced from the Edge Function.
        </Text>

        <TouchableOpacity
          onPress={() => setShowRaw(!showRaw)}
          className="self-center px-6 py-4 border border-white/10 rounded-xl bg-white/5"
        >
          <Text className="text-white text-[10px] font-bold uppercase tracking-widest">
            {showRaw ? 'Hide_Diagnostic_Data' : 'Inspect_Raw_Payload'}
          </Text>
        </TouchableOpacity>

        {showRaw && (
          <ScrollView className="mt-6 max-h-96 w-full p-4 bg-[#05050A] rounded-xl border border-white/10">
            <Text className="font-mono text-[9px] text-neon-cyan/70 leading-4">
              {JSON.stringify(transcriptJson, null, 2)}
            </Text>
          </ScrollView>
        )}
      </View>
    );
  }

  // ── MAIN RENDER ───────────────────────────────────────────────────
  return (
    <View className="flex-col gap-8 pb-20">
      {groupedTranscript.map((group, index) => (
        <View key={index} className="flex-row items-start gap-4">
          {/* Timestamp Column */}
          <View className="w-16 pt-1">
            <View className="px-2 py-1 border rounded bg-neon-cyan/5 border-neon-cyan/20">
              <Text className="font-mono text-[10px] font-bold text-neon-cyan text-center">
                {formatTranscriptTime(group.startTime)}
              </Text>
            </View>
          </View>

          {/* Content Column */}
          <View className="flex-1 pl-5 border-l border-white/10">
            <Text className="mb-2 text-[8px] font-black tracking-[3px] uppercase text-white/20">
              PART: {group.speaker}
            </Text>
            <Text className="text-sm font-medium leading-7 text-white/90">
              {group.text}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
};
