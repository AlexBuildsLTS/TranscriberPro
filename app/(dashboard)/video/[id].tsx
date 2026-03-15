import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoData } from '../../../hooks/queries/useVideoData';
import { GlassCard } from '../../../components/ui/GlassCard';
import { TranscriptViewer } from '../../../components/domain/TranscriptViewer';
import { FadeIn } from '../../../components/animations/FadeIn';
import { TranscriptJsonPayload } from '../../../types/api/index';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

export default function VideoResultScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { data: videoData, isLoading, error } = useVideoData(id as string);

  // Neural pulse background effect
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 4000 }), -1, true);
  }, []);

  const animatedBgStyle = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.03, 0.1]),
  }));

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#020205] items-center justify-center">
        <ActivityIndicator size="large" color="#00F0FF" />
        <Text className="mt-6 text-[10px] font-bold tracking-[6px] text-neon-cyan uppercase">
          Syncing_Neural_Vault...
        </Text>
      </View>
    );
  }

  if (error || !videoData) {
    return (
      <View className="flex-1 bg-[#020205] items-center justify-center p-8">
        <GlassCard glowColor="pink" className="items-center p-10">
          <Text className="mb-2 text-xl font-black tracking-tighter uppercase text-neon-pink">
            Access_Denied
          </Text>
          <Text className="mb-8 text-xs tracking-widest text-center uppercase text-white/40">
            The transcript payload for ID {id?.toString().slice(0, 8)} is
            unreachable.
          </Text>
          <TouchableOpacity
            onPress={() => router.replace('/')}
            className="px-10 py-4 border rounded-full border-neon-pink/30 bg-neon-pink/5"
          >
            <Text className="text-neon-pink text-[10px] font-bold uppercase tracking-[3px]">
              Return_to_Dashboard
            </Text>
          </TouchableOpacity>
        </GlassCard>
      </View>
    );
  }

  const chapters = (videoData.ai_insights?.chapters as any[]) || [];

  return (
    <SafeAreaView className="flex-1 bg-[#020205]">
      <Animated.View
        style={[animatedBgStyle]}
        className="absolute inset-0 bg-neon-cyan blur-[120px] rounded-full"
      />

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 150 }}>
        <FadeIn>
          <View className="mb-12">
            <Text className="text-neon-cyan font-bold text-[10px] tracking-[6px] uppercase mb-3">
              Neural_Decryption_Complete
            </Text>
            <Text className="text-5xl font-black text-white tracking-tighter uppercase leading-[45px]">
              Intelligence <Text className="text-neon-cyan">Report</Text>
            </Text>
          </View>
        </FadeIn>

        <FadeIn delay={200}>
          <GlassCard className="p-8 mb-12" glowColor="purple">
            <Text className="text-white/30 text-[10px] font-bold uppercase tracking-[4px] mb-4">
              Abstract
            </Text>
            <Text className="text-lg font-medium leading-relaxed text-white/90">
              {videoData.ai_insights?.summary || 'No abstract available.'}
            </Text>
          </GlassCard>
        </FadeIn>

        {chapters.length > 0 && (
          <FadeIn delay={400}>
            <View className="mb-12">
              <Text className="text-white/30 text-[10px] font-bold uppercase tracking-[4px] mb-6">
                Timeline_Nodes
              </Text>
              {chapters.map((chapter, i) => (
                <View
                  key={i}
                  className="flex-row items-center p-5 mb-3 bg-white/[0.02] border border-white/5 rounded-3xl"
                >
                  <View className="items-center justify-center w-20 h-10 border rounded-xl bg-neon-cyan/10 border-neon-cyan/20">
                    <Text className="font-mono text-xs font-bold text-neon-cyan">
                      {chapter.timestamp}
                    </Text>
                  </View>
                  <Text className="flex-1 ml-6 text-sm font-bold uppercase text-white/80">
                    {chapter.title}
                  </Text>
                </View>
              ))}
            </View>
          </FadeIn>
        )}

        <FadeIn delay={600}>
          <Text className="text-white/30 text-[10px] font-bold uppercase tracking-[4px] mb-6">
            Raw_Transcript
          </Text>
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
