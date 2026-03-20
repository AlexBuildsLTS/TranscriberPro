import React, { useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  useHistoryData,
  HistoryItem,
} from '../../hooks/queries/useHistoryData';
import { GlassCard } from '../../components/ui/GlassCard';
import { FadeIn } from '../../components/animations/FadeIn';
import { cn } from '../../lib/utils';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  withDelay,
} from 'react-native-reanimated';

// 1. NEURAL ORB INJECTED DIRECTLY (Matches index.tsx exactly)
const NeuralOrb = ({ delay = 0, color = '#00F0FF' }) => {
  const pulse = useSharedValue(0);
  const { width, height } = Dimensions.get('window');

  useEffect(() => {
    pulse.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 8000 }), -1, true),
    );
  }, [delay, pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(pulse.value, [0, 1], [1, 1.6]) },
      { translateX: interpolate(pulse.value, [0, 1], [0, width * 0.05]) },
      { translateY: interpolate(pulse.value, [0, 1], [0, height * 0.05]) },
    ],
    opacity: interpolate(pulse.value, [0, 1], [0.03, 0.09]),
  }));

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          position: 'absolute',
          width: 600,
          height: 600,
          backgroundColor: color,
          ...(Platform.OS === 'web' ? { filter: 'blur(40px)' } : {}),
          ...(Platform.OS === 'web' ? { filter: 'blur(120px)' } : {}),
        },
      ]}
    />
  );
};

export default function HistoryScreen() {
  const router = useRouter();
  const MOBILE_WIDTH_THRESHOLD = 768;
  const { width } = Dimensions.get('window');
  const isMobile = width < MOBILE_WIDTH_THRESHOLD;

  const { data: history, isLoading, error, refetch } = useHistoryData();

  const groupedHistory = useMemo(() => {
    const today: HistoryItem[] = [];
    const earlier: HistoryItem[] = [];

    if (!history) return { today, earlier };

    const now = new Date();
    history.forEach((item: HistoryItem) => {
      const d = new Date(item.created_at);
      if (
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      ) {
        today.push(item);
      } else {
        earlier.push(item);
      }
    });

    return { today, earlier };
  }, [history]);

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-[#020205] items-center justify-center p-10">
        <GlassCard
          glowColor="pink"
          className="p-8 items-center bg-white/[0.01]"
        >
          <Text className="text-neon-pink font-black text-[10px] tracking-[5px] uppercase mb-4">
            Uplink_Error
          </Text>
          <Text className="mb-8 text-xs leading-relaxed text-center text-white/60">
            {error instanceof Error ? error.message : 'Unknown Fault Detected.'}
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            className="px-8 py-3 border rounded-full border-neon-pink/50 bg-neon-pink/10"
          >
            <Text className="text-neon-pink font-bold text-[10px] tracking-widest uppercase">
              Retry_Connection
            </Text>
          </TouchableOpacity>
        </GlassCard>
      </SafeAreaView>
    );
  }

  return (
    // STRICT DARK BACKGROUND INJECTED HERE
    <SafeAreaView className="flex-1 bg-[#020205]">
      {/* AMBIENT BACKGROUND */}
      <View className="absolute inset-0 overflow-hidden">
        <NeuralOrb delay={0} color="#00F0FF" />
        <NeuralOrb delay={2500} color="#8A2BE2" />
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: isMobile ? 20 : 60,
          paddingTop: isMobile ? 100 : 60,
          paddingBottom: isMobile ? 140 : 200,
          flexGrow: 1,
          justifyContent: 'center',
        }}
        showsVerticalScrollIndicator={false}
      >
        <FadeIn>
          <View className="items-center mb-10 md:mb-16">
            <View className="px-4 py-1 mb-6 border rounded-full bg-neon-cyan/10 border-neon-cyan/20">
              <Text className="text-[8px] md:text-[9px] font-black tracking-[5px] text-neon-cyan uppercase">
                ARCHIVE
              </Text>
            </View>
            <Text
              className={cn(
                'font-black text-white tracking-tighter uppercase text-center',
                isMobile
                  ? 'text-4xl leading-[38px]'
                  : 'text-6xl leading-[55px]',
              )}
            >
              <Text className="text-neon-cyan">VAULT</Text>
            </Text>
            <View className="h-[2px] w-16 md:w-20 bg-neon-cyan mt-6 md:mt-8 rounded-full shadow-[0_0_20px_#00F0FF]" />
          </View>
        </FadeIn>

        {isLoading ? (
          <View className="items-center justify-center py-20">
            <ActivityIndicator size="large" color="#00F0FF" />
            <Text className="mt-6 text-[10px] font-bold tracking-[6px] text-neon-cyan uppercase">
              Syncing_Archive...
            </Text>
          </View>
        ) : (
          <View className="self-center w-full max-w-2xl px-2">
            {groupedHistory.today.length > 0 && (
              <FadeIn delay={100}>
                <View className="mb-8">
                  <Text className="text-white/30 font-bold text-[10px] uppercase tracking-[5px] mb-4 ml-4">
                    Today
                  </Text>
                  <View className="gap-y-4">
                    {groupedHistory.today.map((item: HistoryItem) => (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => router.push(`/video/${item.id}`)}
                        activeOpacity={0.8}
                      >
                        <GlassCard
                          className="flex-row items-center p-6 bg-white/[0.01]"
                          glowColor="cyan"
                        >
                          <View className="flex-1">
                            <Text className="text-base font-bold tracking-wide text-white uppercase">
                              Payload_{String(item.id).slice(0, 8)}
                            </Text>
                            <View className="flex-row items-center mt-2">
                              <View
                                className={cn(
                                  'w-1.5 h-1.5 rounded-full mr-2',
                                  item.status === 'completed'
                                    ? 'bg-neon-lime shadow-[0_0_8px_#32FF00]'
                                    : item.status === 'failed'
                                      ? 'bg-neon-pink shadow-[0_0_8px_#FF007F]'
                                      : 'bg-neon-cyan shadow-[0_0_8px_#00F0FF]',
                                )}
                              />
                              <Text className="text-white/40 text-[9px] font-mono uppercase tracking-widest">
                                Status: {item.status}
                              </Text>
                            </View>
                          </View>
                          <Text className="text-2xl opacity-50 text-neon-cyan">
                            ›
                          </Text>
                        </GlassCard>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </FadeIn>
            )}

            <FadeIn delay={200}>
              <View>
                <Text className="text-white/30 font-bold text-[10px] uppercase tracking-[5px] mb-4 ml-4">
                  HISTORY
                </Text>
                {groupedHistory.earlier.length === 0 ? (
                  <View className="items-center justify-center p-8 border border-white/5 rounded-3xl bg-black/40">
                    <Text className="text-white/20 text-[10px] font-mono uppercase tracking-widest italic">
                      No archived payloads found.
                    </Text>
                  </View>
                ) : (
                  <View className="gap-y-4">
                    {groupedHistory.earlier.map((item: HistoryItem) => (
                      <TouchableOpacity
                        key={item.id}
                        onPress={() => router.push(`/video/${item.id}` as any)}
                        activeOpacity={0.8}
                      >
                        <GlassCard
                          className="flex-row items-center p-6 bg-white/[0.01]"
                          glowColor="purple"
                        >
                          <View className="flex-1">
                            <Text className="text-sm font-bold tracking-wide uppercase text-white/90">
                              Engine Logs {typeof item.id === 'string' ? item.id.slice(0, 8) : String(item.id).slice(0, 8)}
                            </Text>
                            <Text className="text-white/30 text-[9px] font-mono mt-2 uppercase tracking-widest">
                              {format(new Date(item.created_at), 'yyyy-MM-dd')}
                            </Text>
                          </View>
                          <Text className="text-2xl text-neon-purple opacity-40">
                            ›
                          </Text>
                        </GlassCard>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </FadeIn>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
