/**
 * app/(dashboard)/settings/index.tsx
 * Sovereign NorthOS Settings Dashboard
 */

import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { ArrowBigLeftDash } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { GlassCard } from '../../../components/ui/GlassCard';
import { FadeIn } from '../../../components/animations/FadeIn';
import { cn } from '../../../lib/utils';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User,
  ShieldCheck,
  Cpu,
  ChevronRight,
  LifeBuoy,
  Terminal,
} from 'lucide-react-native';
import { useAuthStore } from '../../../store/useAuthStore';

import Svg, { Rect, Path, Circle, Line, G } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withRepeat,
  withTiming,
  interpolate,
  withDelay,
  Easing,
  withSequence,
} from 'react-native-reanimated';

const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ─── TYPESCRIPT INTERFACE (Fixes the red errors) ─────────────────────────────
interface SettingsCardItem {
  id: string;
  title: string;
  desc: string;
  color: string;
  iconHex: string;
  icon: any;
  customBg?: string;
  customBorder?: string;
  routeOverride?: string;
}

// ─── AMBIENT BACKGROUND ORB ──────────────────────────────────────────────────
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

// ─── EXACT SHIELD/NETWORK SVG WITH ANIMATION ─────────────────────────────────
const AnimatedSettingsIcon = () => {
  const floatY = useSharedValue(0);
  const pulseNodes = useSharedValue(0);

  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    pulseNodes.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [floatY, pulseNodes]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  const nodeProps = useAnimatedProps(() => ({
    r: interpolate(pulseNodes.value, [0, 1], [10, 12]),
  }));

  const C = {
    navy: '#1A3370',
    yellow: '#F3CF60',
    purple: '#C496FC',
    lightPurple: '#6A5DF1',
    teal: '#77DFCA',
    white: '#FFFFFF',
    bgCircle: '#E8E9FF',
  };

  return (
    <View
      style={{ width: 140, height: 140, alignSelf: 'center', marginBottom: 24 }}
    >
      <View
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          width: 120,
          height: 120,
        }}
      >
        <Svg width="100%" height="100%" viewBox="0 0 200 200">
          <Path
            d="M 20 50 L 20 160 L 180 160 L 180 50 Z"
            fill={C.white}
            stroke={C.navy}
            strokeWidth="12"
            strokeLinejoin="round"
          />
          <Circle cx="100" cy="100" r="50" fill={C.bgCircle} />
          <Rect
            x="20"
            y="140"
            width="160"
            height="20"
            fill={C.purple}
            stroke={C.navy}
            strokeWidth="8"
          />
          <Path
            d="M 10 170 L 190 170 C 195 170 200 175 200 180 L 200 190 C 200 195 195 200 190 200 L 10 200 C 5 200 0 195 0 190 L 0 180 C 0 175 5 170 10 170 Z"
            fill={C.lightPurple}
            stroke={C.navy}
            strokeWidth="12"
          />
          <Path
            d="M 70 170 L 80 180 L 120 180 L 130 170"
            fill="none"
            stroke={C.navy}
            strokeWidth="12"
            strokeLinejoin="round"
          />
        </Svg>
      </View>

      <Animated.View
        style={[
          { position: 'absolute', top: -5, left: 10, width: 120, height: 120 },
          floatStyle,
        ]}
      >
        <Svg width="100%" height="100%" viewBox="0 0 200 200">
          <G
            stroke={C.lightPurple}
            strokeWidth="10"
            strokeLinejoin="round"
            strokeLinecap="round"
          >
            <Line x1="50" y1="100" x2="80" y2="60" />
            <Line x1="150" y1="100" x2="120" y2="60" />
            <Line x1="100" y1="130" x2="100" y2="100" />
          </G>
          <Circle cx="50" cy="100" r="16" fill={C.navy} />
          <AnimatedCircle
            cx="50"
            cy="100"
            fill={C.teal}
            animatedProps={nodeProps}
          />
          <Circle cx="150" cy="100" r="16" fill={C.navy} />
          <AnimatedCircle
            cx="150"
            cy="100"
            fill={C.teal}
            animatedProps={nodeProps}
          />
          <Circle cx="100" cy="135" r="16" fill={C.navy} />
          <AnimatedCircle
            cx="100"
            cy="135"
            fill={C.teal}
            animatedProps={nodeProps}
          />
          <Path
            d="M 100 110 C 130 90 135 60 135 30 L 100 20 L 65 30 C 65 60 70 90 100 110 Z"
            fill={C.yellow}
            stroke={C.navy}
            strokeWidth="12"
            strokeLinejoin="round"
          />
          <Path
            d="M 85 45 L 115 45 M 100 45 L 100 70"
            stroke={C.navy}
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>
    </View>
  );
};

// ─── MAIN SCREEN COMPONENT ───────────────────────────────────────────────────
export default function SettingsHubScreen() {
  const router = useRouter();
  const { width } = Dimensions.get('window');
  const isMobile = width < 768;

  const { profile } = useAuthStore();
  const userRole = profile?.role || 'member';

  // Apply the SettingsCardItem[] type here
  const SETTING_MODULES: SettingsCardItem[] = useMemo(() => {
    const modules: SettingsCardItem[] = [
      {
        id: 'profile',
        title: 'USER',
        desc: 'Avatar, Bio',
        color: 'cyan',
        iconHex: '#22d3ee',
        icon: User,
      },
      {
        id: 'security',
        title: 'Security',
        desc: 'Account Security, Biometrics, API Keys',
        color: 'pink',
        iconHex: '#fb7185',
        icon: ShieldCheck,
      },
      {
        id: 'billing',
        title: 'BILLING & TOKENS',
        desc: 'System Tiers, Quotas, Usage',
        color: 'purple',
        iconHex: '#c084fc',
        icon: Cpu,
      },
      {
        id: 'support',
        title: 'SUPPORT',
        desc: 'Help Desk, Active Tickets',
        color: 'green',
        iconHex: '#4ade80',
        icon: LifeBuoy,
        customBg: '#0c593840',
        customBorder: '#0c5938',
      },
    ];

    if (userRole === 'admin') {
      modules.push({
        id: 'admin',
        title: 'ADMIN',
        desc: 'Global Telemetry, User Directory',
        color: 'red',
        iconHex: '#ff4d6d',
        icon: Terminal,
        customBg: '#3d010e90',
        customBorder: '#ff4d6d50',
        routeOverride: '/admin',
      });
    }

    return modules;
  }, [userRole]);

  return (
    <SafeAreaView className="flex-1 bg-[#020205]">
      <View className="absolute inset-0 overflow-hidden" pointerEvents="none">
        <NeuralOrb delay={0} color="#3B82F6" />
        <NeuralOrb delay={2500} color="#8B5CF6" />
      </View>

      <View className="flex-1 w-full" style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1, width: '100%' }}
          contentContainerStyle={{
            padding: isMobile ? 16 : 60, // Reduced mobile padding
            paddingTop: isMobile ? 100 : 100,
            paddingBottom: isMobile ? 140 : 200,
            flexGrow: 1,
            alignItems: 'center',
          }}
          showsVerticalScrollIndicator={false}
        >
          <FadeIn>
            <View className="items-center w-full max-w-2xl mb-10 md:mb-16">
              <View className="px-5 py-1.5 mb-8 border rounded-full bg-cyan-500/10 border-cyan-500/20">
                <Text className="text-[9px] md:text-[10px] font-black tracking-[5px] text-cyan-400 uppercase">
                  SETTINGS
                </Text>
              </View>

              <AnimatedSettingsIcon />

              <View className="h-[2px] w-20 bg-cyan-400 mt-6 md:mt-8 rounded-full shadow-[0_0_20px_#22D3EE]" />
            </View>
          </FadeIn>

          <View className="flex-row items-center justify-between px-4 py-4 md:px-8">
            <TouchableOpacity
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace('/')
              }
              className="flex-row items-center mb-10 gap-x-2"
              activeOpacity={0.7}
            >
              <ArrowBigLeftDash size={18} color="#00F0FF" />
              <Text className="text-[10px] font-black tracking-[4px] text-neon-cyan uppercase">
                Return
              </Text>
            </TouchableOpacity>
          </View>
          <View className="w-full max-w-2xl px-2">
            <View className="gap-y-4 md:gap-y-6">
              {SETTING_MODULES.map((mod, index) => (
                <FadeIn key={mod.id} delay={index * 100}>
                  <TouchableOpacity
                    onPress={() => {
                      if (mod.routeOverride) {
                        router.push(mod.routeOverride as any);
                      } else {
                        router.push(`/settings/${mod.id}` as any);
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <GlassCard
                      glowColor={mod.color as any}
                      style={
                        mod.customBg
                          ? {
                              backgroundColor: mod.customBg,
                              borderColor: mod.customBorder,
                              borderWidth: 1,
                            }
                          : {}
                      }
                      // Flex layout forces row, justify-between handles spacing
                      className="flex-row items-center justify-between p-4 md:p-8 bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04] transition-all rounded-3xl"
                    >
                      {/* LEFT SIDE: Group Icon and Text together */}
                      <View className="flex-row items-center flex-1 pr-2 shrink">
                        {/* Icon Container - Responsive sizing */}
                        <View
                          style={
                            mod.customBg
                              ? {
                                  backgroundColor: mod.iconHex + '15',
                                  borderColor: mod.iconHex + '30',
                                  borderWidth: 1,
                                }
                              : {}
                          }
                          className={cn(
                            'w-10 h-10 md:w-12 md:h-12 rounded-full items-center justify-center mr-4',
                            !mod.customBg &&
                              `bg-${mod.color}-500/10 border border-${mod.color}-500/20`,
                          )}
                        >
                          <mod.icon size={20} color={mod.iconHex} />
                        </View>

                        {/* Text Content - Shrink allows it to compress instead of pushing the chevron out */}
                        <View className="flex-1 shrink">
                          <Text
                            className="mb-1 text-sm font-bold tracking-wider text-white uppercase md:tracking-widest md:text-xl"
                            numberOfLines={2}
                          >
                            {mod.title}
                          </Text>
                          <Text
                            className="text-[9px] md:text-xs text-white/40 font-medium uppercase tracking-widest md:tracking-[3px]"
                            numberOfLines={2}
                          >
                            {mod.desc}
                          </Text>
                        </View>
                      </View>

                      {/* RIGHT SIDE: Action Chevron - Shrink-0 ensures it never gets crushed */}
                      <View className="items-center justify-center w-8 h-8 rounded-full md:w-10 md:h-10 bg-white/[0.02] border border-white/5 shrink-0">
                        <ChevronRight size={18} color="#ffffff50" />
                      </View>
                    </GlassCard>
                  </TouchableOpacity>
                </FadeIn>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
