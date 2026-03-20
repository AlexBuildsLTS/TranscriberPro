import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { GlassCard } from '../../../components/ui/GlassCard';
import { FadeIn } from '../../../components/animations/FadeIn';
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
          borderRadius: 300,
          ...(Platform.OS === 'web' ? { filter: 'blur(120px)' } : {}),
        },
      ]}
    />
  );
};

const SETTING_MODULES = [
  {
    id: 'profile',
    title: 'Identity Config',
    desc: 'Avatar, Username, Bio',
    color: 'cyan',
    textClass: 'text-neon-cyan',
  },
  {
    id: 'security',
    title: 'Security Protocols',
    desc: 'Account Security, Keys, Biometrics',
    color: 'pink',
    textClass: 'text-neon-pink',
  },
  {
    id: 'billing',
    title: 'Resource Allocation',
    desc: 'System Tiers, Quotas, Usage',
    color: 'purple',
    textClass: 'text-neon-purple',
  },
] as const;

export default function SettingsHubScreen() {
  const router = useRouter();
  const { width } = Dimensions.get('window');
  const isMobile = width < 768;

  return (
    // STRICT DARK BACKGROUND INJECTED HERE
    <SafeAreaView className="flex-1 bg-[#020205]">
      {/* AMBIENT BACKGROUND */}
      <View className="absolute inset-0 overflow-hidden">
        <NeuralOrb delay={0} color="#00F0FF" />
        <NeuralOrb delay={2500} color="#FF007F" />
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
                NorthOS
              </Text>
            </View>
            <Text className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase text-center leading-[45px] md:leading-[55px]">
              <Text className="text-cyan/40">SETTINGS</Text>
            </Text>
            <View className="h-[2px] w-16 md:w-20 bg-neon-cyan mt-6 md:mt-8 rounded-full shadow-[0_0_20px_#00F0FF]" />
          </View>
        </FadeIn>

        <View className="self-center w-full max-w-2xl px-2">
          <View className="gap-y-6">
            {SETTING_MODULES.map((mod, index) => (
              <FadeIn key={mod.id} delay={index * 100}>
                <TouchableOpacity
                  onPress={() => router.push(`/settings/${mod.id}` as any)}
                  activeOpacity={0.8}
                >
                  <GlassCard
                    glowColor={mod.color as 'cyan' | 'pink' | 'purple'}
                    className="flex-row items-center p-6 md:p-8 bg-white/[0.01]"
                  >
                    <View className="flex-1">
                      <Text className="mb-2 text-lg font-bold tracking-widest text-white uppercase md:text-xl">
                        {mod.title}
                      </Text>
                      <Text className="text-[10px] text-white/40 font-mono uppercase tracking-widest">
                        {mod.desc}
                      </Text>
                    </View>

                    <Text className={`text-2xl opacity-80 ${mod.textClass}`}>
                      ›
                    </Text>
                  </GlassCard>
                </TouchableOpacity>
              </FadeIn>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
