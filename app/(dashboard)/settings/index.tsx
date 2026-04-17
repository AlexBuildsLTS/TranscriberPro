/**
 * app/(dashboard)/settings/index.tsx
 * VeraxAI Settings Dashboard — Master Configuration
 * ══════════════════════════════════════════════════════════════════════════════
 * PROTOCOL:
 * 1. NEBULA AMBIENT ENGINE: 120fps UI-thread physics using Sine/Cosine for organic drift.
 * 2. TOUCH SAFETY: pointerEvents="none" guarantees zero UI block on all platforms.
 * 3. ADAPTIVE LAYOUT: Core pulse anchors perfectly behind the settings shield icon.
 * 4. STRICT THEME: Liquid Neon palette over an Obsidian (#000012) void.
 * ══════════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  StyleSheet,
} from 'react-native';
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
  ArrowBigLeftDash,
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
  useFrameCallback,
} from 'react-native-reanimated';

const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ─── THEME CONSTANTS ─────────────────────────────────────────────────────────
const THEME = {
  obsidian: '#000012',
  cyan: '#00F0FF',
  purple: '#8A2BE2',
  pink: '#FF007F',
  green: '#32FF00',
  red: '#FF3333',
};

const IS_WEB = Platform.OS === 'web';

// ══════════════════════════════════════════════════════════════════════════════
// MODULE 1: TYPESCRIPT INTERFACES
// ══════════════════════════════════════════════════════════════════════════════
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

// ══════════════════════════════════════════════════════════════════════════════
// MODULE 2: NEBULA AMBIENT ENGINE (Organic UI-Thread Physics)
// ══════════════════════════════════════════════════════════════════════════════

const CorePulse = ({ delay, color, size, centerX, centerY }: any) => {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 8000, easing: Easing.out(Easing.cubic) }),
        -1,
        false,
      ),
    );
  }, [delay, pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.8, 2.5]) }],
    opacity: interpolate(pulse.value, [0, 0.4, 1], [0.3, 0.1, 0]),
  }));

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          position: 'absolute',
          left: centerX - size / 2,
          top: centerY - size / 2,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: `${color}15`, // Faint solid fill instead of border for a smoother glow
          ...(IS_WEB ? ({ filter: 'blur(20px)' } as any) : {}),
        },
      ]}
    />
  );
};

interface OrganicOrbProps {
  color: string;
  size: number;
  initialX: number;
  initialY: number;
  speedX: number;
  speedY: number;
  phaseOffsetX: number;
  phaseOffsetY: number;
  opacityBase: number;
}

const OrganicOrb = ({
  color,
  size,
  initialX,
  initialY,
  speedX,
  speedY,
  phaseOffsetX,
  phaseOffsetY,
  opacityBase,
}: OrganicOrbProps) => {
  const { width, height } = Dimensions.get('window');
  const time = useSharedValue(0);

  // 120fps UI Thread loop utilizing Sine/Cosine for smooth, non-linear drifting
  useFrameCallback((frameInfo) => {
    if (frameInfo.timeSincePreviousFrame === null) return;
    // Increment time; scale down the delta so the movement is slow and elegant
    time.value += frameInfo.timeSincePreviousFrame / 1000;
  });

  const animatedStyle = useAnimatedStyle(() => {
    // Calculate organic positions using Lissajous curves (Math.sin / Math.cos)
    // This creates a smooth "figure-8" or looping orbit that never hard-bounces.
    const xOffset =
      Math.sin(time.value * speedX + phaseOffsetX) * (width * 0.3);
    const yOffset =
      Math.cos(time.value * speedY + phaseOffsetY) * (height * 0.2);

    // Add a breathing effect to the scale
    const breathe = 1 + Math.sin(time.value * 0.5) * 0.15;

    return {
      transform: [
        { translateX: initialX + xOffset },
        { translateY: initialY + yOffset },
        { scale: breathe },
      ],
      // Opacity pulses slightly as it breathes
      opacity: opacityBase + Math.sin(time.value * 0.5) * 0.02,
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          top: -size / 2,
          left: -size / 2,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          ...(IS_WEB ? ({ filter: 'blur(60px)' } as any) : {}), // Massive blur for the "Nebula" look
        },
        animatedStyle,
      ]}
    />
  );
};

const AmbientArchitecture = React.memo(() => {
  const { width, height } = Dimensions.get('window');
  const isDesktop = width >= 1024;

  // Dynamically calculate the center of the Settings Shield Icon
  const coreX = width / 2;
  // Mobile needs a smaller offset because the icon is higher up the screen
  const coreY = isDesktop ? 160 : 120;
  const basePulseSize = isDesktop ? 300 : 200;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* ── CORE BREATHING PULSES (Anchored exactly behind the shield) ── */}
      <CorePulse
        delay={0}
        color={THEME.cyan}
        size={basePulseSize}
        centerX={coreX}
        centerY={coreY}
      />
      <CorePulse
        delay={2500}
        color={THEME.purple}
        size={basePulseSize}
        centerX={coreX}
        centerY={coreY}
      />
      <CorePulse
        delay={5000}
        color={THEME.pink}
        size={basePulseSize}
        centerX={coreX}
        centerY={coreY}
      />

      {/* ── ORGANIC DRIFTING NEBULAS ── */}
      {/* These use Sine/Cosine to orbit smoothly without ever touching an edge */}
      <OrganicOrb
        color={THEME.cyan}
        size={width * 0.5}
        initialX={width * 0.6}
        initialY={height * 0.3}
        speedX={0.2}
        speedY={0.15}
        phaseOffsetX={0}
        phaseOffsetY={Math.PI / 2}
        opacityBase={0.06}
      />
      <OrganicOrb
        color={THEME.purple}
        size={width * 0.6}
        initialX={width * 0.8}
        initialY={height * 0.4}
        speedX={0.15}
        speedY={0.25}
        phaseOffsetX={Math.PI}
        phaseOffsetY={0}
        opacityBase={0.08}
      />
      <OrganicOrb
        color={THEME.pink}
        size={width * 0.4}
        initialX={width * 0.4}
        initialY={height * 0.8}
        speedX={0.25}
        speedY={0.1}
        phaseOffsetX={Math.PI / 4}
        phaseOffsetY={Math.PI}
        opacityBase={0.05}
      />
    </View>
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// MODULE 3: SETTINGS SHIELD SVG
// ══════════════════════════════════════════════════════════════════════════════
const AnimatedSettingsIcon = () => {
  const floatY = useSharedValue(0);
  const pulseNodes = useSharedValue(0);

  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(6, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    pulseNodes.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(2, { duration: 5000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [floatY, pulseNodes]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  const nodeProps = useAnimatedProps(() => ({
    r: interpolate(pulseNodes.value, [0, 1], [12, 18]),
  }));

  const C = {
    navy: '#050B14',
    yellow: '#F3CF60',
    purple: '#C496FC',
    lightPurple: '#6A5DF1',
    teal: '#77DFCA',
    white: '#FFFFFF',
    bgCircle: '#E8E9FF',
  };

  return (
    <View
      style={{
        width: 140,
        height: 140,
        alignSelf: 'center',
        marginBottom: 24,
        zIndex: 10,
      }}
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

// ══════════════════════════════════════════════════════════════════════════════
// MODULE 4: MAIN SCREEN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function SettingsHubScreen() {
  const router = useRouter();
  const { width } = Dimensions.get('window');
  const isMobile = width < 768;

  const { profile } = useAuthStore();
  const userRole = profile?.role || 'member';

  const SETTING_MODULES: SettingsCardItem[] = useMemo(() => {
    const modules: SettingsCardItem[] = [
      {
        id: 'profile',
        title: 'USER',
        desc: 'Avatar, Bio',
        color: 'cyan',
        iconHex: THEME.cyan,
        icon: User,
        customBg: `${THEME.cyan}08`,
        customBorder: `${THEME.cyan}25`,
      },
      {
        id: 'security',
        title: 'Security',
        desc: 'Account Security, Biometrics, API Keys',
        color: 'pink',
        iconHex: THEME.pink,
        icon: ShieldCheck,
        customBg: `${THEME.pink}08`,
        customBorder: `${THEME.pink}25`,
      },
      {
        id: 'billing',
        title: 'BILLING & TOKENS',
        desc: 'System Tiers, Quotas, Usage',
        color: 'purple',
        iconHex: THEME.purple,
        icon: Cpu,
        customBg: `${THEME.purple}08`,
        customBorder: `${THEME.purple}25`,
      },
      {
        id: 'support',
        title: 'SUPPORT',
        desc: 'Help Desk, Active Tickets',
        color: 'green',
        iconHex: THEME.green,
        icon: LifeBuoy,
        customBg: `${THEME.green}08`,
        customBorder: `${THEME.green}25`,
      },
    ];

    if (userRole === 'admin') {
      modules.push({
        id: 'admin',
        title: 'ADMIN',
        desc: 'Global Telemetry, User Directory',
        color: 'red',
        iconHex: THEME.red,
        icon: Terminal,
        customBg: `${THEME.red}08`,
        customBorder: `${THEME.red}25`,
        routeOverride: '/admin',
      });
    }

    return modules;
  }, [userRole]);

  return (
    <SafeAreaView className="flex-1 bg-[#000012]">
      {/* ── ISOLATED AMBIENT KERNEL ── */}
      {/* Physically rendered beneath the ScrollView, pointerEvents="none" guarantees zero touch overlap */}
      <AmbientArchitecture />

      {/* ── MAIN CONTENT LAYER ── */}
      <View className="flex-1 w-full" style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1, width: '100%' }}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            padding: isMobile ? 16 : 60,
            paddingTop: isMobile ? 60 : 80,
            paddingBottom: isMobile ? 140 : 200,
            flexGrow: 1,
            alignItems: 'center',
          }}
          showsVerticalScrollIndicator={false}
        >
          <FadeIn>
            <View className="items-center w-full max-w-2xl mb-10 md:mb-16">
              <View className="px-5 py-1.5 mb-8 border rounded-full bg-[#00F0FF]/10 border-[#00F0FF]/20">
                <Text className="text-[9px] md:text-[10px] font-black tracking-[5px] text-[#00F0FF] uppercase">
                  SETTINGS
                </Text>
              </View>

              <AnimatedSettingsIcon />

              <View className="h-[2px] w-20 bg-[#00F0FF] mt-6 md:mt-8 rounded-full shadow-[0_0_20px_#00F0FF]" />
            </View>
          </FadeIn>

          <View className="flex-row items-center justify-between w-full max-w-2xl px-4 py-4 md:px-8">
            <TouchableOpacity
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace('/')
              }
              className="flex-row items-center mb-10 gap-x-2"
              activeOpacity={0.7}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <ArrowBigLeftDash size={18} color={THEME.cyan} />
              <Text className="text-[10px] font-black tracking-[4px] text-[#00F0FF] uppercase">
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
                    delayPressIn={0}
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
                      className="flex-row items-center justify-between p-4 transition-all md:p-8 hover:bg-white/[0.04] rounded-3xl"
                    >
                      <View className="flex-row items-center flex-1 pr-2 shrink">
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
