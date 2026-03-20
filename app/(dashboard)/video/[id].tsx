import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  Share,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useVideoData } from '../../../hooks/queries/useVideoData';
import { GlassCard } from '../../../components/ui/GlassCard';
import { TranscriptViewer } from '../../../components/domain/TranscriptViewer';
import { FadeIn } from '../../../components/animations/FadeIn';
import { TranscriptJsonPayload } from '../../../types/api/index';
import {
  ArrowBigLeftDash,
  Sparkles,
  Clock,
  Copy,
  Share2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

/**
 * @description Premium Video Result Screen with Neural Pulse UI
 * Includes handling for 'ai_processing' state and industrial-grade error boundaries.
 */
export default function VideoResultScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const {
    data: videoData,
    isLoading,
    error,
    refetch,
  } = useVideoData(id as string);

  // Background Animation Logic
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 4000 }), -1, true);
  }, []);

  const animatedBgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.02, 0.08]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.2]) }],
  }));

  // Logic Mappings
  const chapters = useMemo(
    () => (videoData?.ai_insights?.chapters as any[]) || [],
    [videoData],
  );
  const isAiProcessing = videoData?.status === 'ai_processing';
  const isCompleted = videoData?.status === 'completed';

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Success', 'Transcript copied to neural clipboard.');
  };

  const onShare = async () => {
    try {
      await Share.share({
        message: `Check out the AI Insights for this video: ${videoData?.title}`,
        url: videoData?.youtube_url || '',
      });
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) return <LoadingState />;

  if (error || !videoData)
    return <ErrorState id={id as string} onBack={() => router.replace('/')} />;

  return (
    <SafeAreaView className="flex-1 bg-[#020205]">
      {/* Dynamic Neural Aura */}
      <Animated.View
        style={[animatedBgStyle]}
        className="absolute inset-0 bg-neon-cyan blur-[120px] rounded-full"
      />

      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 150 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header Actions ────────────────────────────────────────────── */}
        <View className="flex-row items-center justify-between mb-8">
          <TouchableOpacity
            onPress={() =>
              router.canGoBack()
                ? router.back()
                : router.replace('/vault' as any)
            }
            className="flex-row items-center px-4 py-2 border rounded-full bg-white/5 border-white/10"
          >
            <ArrowBigLeftDash size={18} color="#00F0FF" />
            <Text className="ml-2 text-[10px] font-bold tracking-[2px] text-neon-cyan uppercase">
              RETURN
            </Text>
          </TouchableOpacity>

          <View className="flex-row space-x-4">
            <TouchableOpacity
              onPress={onShare}
              className="p-2 border rounded-full bg-white/5 border-white/10"
            >
              <Share2 size={18} color="#fff" opacity={0.6} />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Status Banner ────────────────────────────────────────────── */}
        <FadeIn>
          <View className="items-center mb-10">
            <View
              className={`px-4 py-1 mb-4 border rounded-full ${isCompleted ? 'bg-green-500/10 border-green-500/20' : 'bg-neon-cyan/10 border-neon-cyan/20'}`}
            >
              <Text
                className={`text-[8px] font-black tracking-[4px] uppercase ${isCompleted ? 'text-green-400' : 'text-neon-cyan'}`}
              >
                {videoData.status}
              </Text>
            </View>
            <Text className="text-4xl font-black text-white tracking-tighter uppercase text-center leading-[40px]">
              CONTENT <Text className="text-neon-cyan">INTELLIGENCE</Text>
            </Text>
          </View>
        </FadeIn>

        {/* ── AI Insights Section ───────────────────────────────────────── */}
        <FadeIn delay={200}>
          <GlassCard
            className="p-8 mb-10"
            glowColor={isAiProcessing ? 'cyan' : 'purple'}
          >
            <View className="flex-row items-center justify-between mb-6">
              <View className="flex-row items-center">
                <Sparkles size={16} color="#A855F7" />
                <Text className="text-white/40 text-[10px] font-bold uppercase tracking-[4px] ml-3">
                  Executive Summary
                </Text>
              </View>
              {isAiProcessing && (
                <ActivityIndicator size="small" color="#00F0FF" />
              )}
            </View>

            {isAiProcessing ? (
              <Text className="font-mono text-sm italic leading-6 text-white/60">
                Analyzing semantics and generating neural abstract...
              </Text>
            ) : (
              <Text className="text-lg font-medium leading-relaxed text-white/90">
                {videoData.ai_insights?.summary ||
                  'No abstract available for this data-stream.'}
              </Text>
            )}
          </GlassCard>
        </FadeIn>

        {/* ── Timeline Section ──────────────────────────────────────────── */}
        {chapters.length > 0 && (
          <FadeIn delay={400}>
            <View className="mb-12">
              <View className="flex-row items-center mb-6">
                <Clock size={16} color="#00F0FF" />
                <Text className="text-white/30 text-[10px] font-bold uppercase tracking-[4px] ml-3">
                  Timeline Matrix
                </Text>
              </View>

              {chapters.map((chapter, i) => (
                <View
                  key={i}
                  className="flex-row items-start p-5 mb-3 bg-white/[0.03] border border-white/5 rounded-3xl"
                >
                  <View className="px-3 py-1 border rounded-lg bg-neon-cyan/10 border-neon-cyan/20">
                    <Text className="font-mono text-[10px] font-bold text-neon-cyan">
                      {chapter.timestamp}
                    </Text>
                  </View>
                  <View className="flex-1 ml-5">
                    <Text className="mb-1 text-sm font-bold uppercase text-white/90">
                      {chapter.title}
                    </Text>
                    {chapter.description && (
                      <Text className="text-xs leading-5 text-white/40">
                        {chapter.description}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </FadeIn>
        )}

        {/* ── Transcript Section ────────────────────────────────────────── */}
        <FadeIn delay={600}>
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-white/30 text-[10px] font-bold uppercase tracking-[4px]">
              Source Transcript
            </Text>
            <TouchableOpacity
              onPress={() =>
                copyToClipboard(
                  videoData.transcripts?.[0]?.transcript_text || '',
                )
              }
              className="flex-row items-center"
            >
              <Copy size={14} color="#00F0FF" />
              <Text className="ml-2 text-[8px] text-neon-cyan font-bold uppercase tracking-widest">
                Copy Raw
              </Text>
            </TouchableOpacity>
          </View>

          <TranscriptViewer
            transcriptJson={
              videoData.transcripts?.[0]
                ?.transcript_json as unknown as TranscriptJsonPayload
            }
          />
        </FadeIn>
      </ScrollView>
    </SafeAreaView>
  );
}

// Sub-components for better readability
function LoadingState() {
  return (
    <View className="flex-1 bg-[#020205] items-center justify-center">
      <ActivityIndicator size="large" color="#00F0FF" />
      <Text className="mt-8 text-[10px] font-bold tracking-[8px] text-neon-cyan uppercase animate-pulse">
        Synchronizing_Neural_Vault
      </Text>
    </View>
  );
}

function ErrorState({ id, onBack }: { id: string; onBack: () => void }) {
  return (
    <View className="flex-1 bg-[#020205] items-center justify-center p-8">
      <GlassCard glowColor="pink" className="items-center w-full p-10">
        <AlertCircle size={40} color="#FF0055" />
        <Text className="mt-6 mb-2 text-xl font-black tracking-tighter uppercase text-neon-pink">
          Stream_Interrupted
        </Text>
        <Text className="mb-8 text-[10px] tracking-widest text-center uppercase text-white/40 leading-5">
          Data-node {id.slice(0, 12)} is currently unreachable or corrupted.
        </Text>
        <TouchableOpacity
          onPress={onBack}
          className="px-10 py-4 border rounded-full border-neon-pink/30 bg-neon-pink/5"
        >
          <Text className="text-neon-pink text-[10px] font-bold uppercase tracking-[3px]">
            Eject_to_Dashboard
          </Text>
        </TouchableOpacity>
      </GlassCard>
    </View>
  );
}
