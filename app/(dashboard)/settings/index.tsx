/* app/(dashboard)/settings/index.tsx
 Lingua VertAI Settings Dashboard
  MODULE OVERVIEW:
  TYPES & INTERFACES: Strongly typed models for the settings cards.
  AMBIENT ORB ENGINE: Drifting, bouncing background visualizer.
   NATIVE SVG: Floating animated settings shield.
  SETTINGS MODULES: Configuration array for all glass cards.
  MAIN UI: Centered, non-stretching layout for Web & Mobile.
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

// ══════════════════════════════════════════════════════════════════════════════
// MODULE 1: TYPESCRIPT INTERFACES
// Defines the configuration structure for each settings card.
// ══════════════════════════════════════════════════════════════════════════════
interface SettingsCardItem {
  id: string;
  title: string;
  desc: string;
  color: string;
  iconHex: string;
  icon: any;
  customBg?: string; // <-- Allows injecting specific glass colors
  customBorder?: string; // <-- Allows injecting specific border colors
  routeOverride?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// MODULE 2: AMBIENT ORB ENGINE (UPDATED TO DRIFT & BOUNCE)
// Replicates the dashboard speed/transparency, but with smaller, wandering orbs.
// Change color or size props in the main component to adjust visual weight.
// ══════════════════════════════════════════════════════════════════════════════
const AmbientOrb = ({
  color,
  size,
  top,
  left,
  right,
  bottom,
  delay = 0,
  opacity = 0.08,
}: {
  color: string;
  size: number;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
  delay?: number;
  opacity?: number;
}) => {
  const { width, height } = Dimensions.get('window');
  const drift = useSharedValue(0);

  React.useEffect(() => {
    // 9-second slow drift matching the Dashboard engine speed
    drift.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
  }, [delay, drift]);

  const anim = useAnimatedStyle(() => ({
    transform: [
      // Translates to simulate wandering/bouncing off invisible walls
      { translateX: interpolate(drift.value, [0, 1], [0, width * 0.25]) },
      { translateY: interpolate(drift.value, [0, 1], [0, height * 0.15]) },
      { scale: interpolate(drift.value, [0, 1], [0.85, 1.15]) },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size,
          backgroundColor: color,
          opacity,
          top,
          left,
          right,
          bottom,
          pointerEvents: 'none', // ← CRITICAL: MUST be inside style array on Android
        },
        anim,
      ]}
    />
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MODULE 3: EXACT SHIELD/NETWORK SVG WITH ANIMATION
// Handles the floating/pulsing settings icon graphic.
// ══════════════════════════════════════════════════════════════════════════════
const AnimatedSettingsIcon = () => {
  const floatY = useSharedValue(0);
  const pulseNodes = useSharedValue(0);

  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 100, easing: Easing.inOut(Easing.ease) }),
        withTiming(6, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
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

// ══════════════════════════════════════════════════════════════════════════════
// MODULE 4: MAIN SCREEN COMPONENT & CARD CONFIGURATION
// Contains the central layout and the exact glass-card color mappings.
// ══════════════════════════════════════════════════════════════════════════════
export default function SettingsHubScreen() {
  const router = useRouter();
  const { width } = Dimensions.get('window');
  const isMobile = width < 768;

  const { profile } = useAuthStore();
  const userRole = profile?.role || 'member';

  // ─── CARD COLOR CONFIGURATION ───
  // Update customBg (background) and customBorder (stroke) here.
  // Using 08/0C hex suffix for subtle glass transparency (e.g., #00F0FF08).
  const SETTING_MODULES: SettingsCardItem[] = useMemo(() => {
    const modules: SettingsCardItem[] = [
      {
        id: 'profile',
        title: 'USER',
        desc: 'Avatar, Bio',
        color: 'cyan',
        iconHex: '#00F0FF',
        icon: User,
        customBg: '#00F0FF08', // Light blue glass (Cyan)
        customBorder: '#00F0FF25',
      },
      {
        id: 'security',
        title: 'Security',
        desc: 'Account Security, Biometrics, API Keys',
        color: 'pink',
        iconHex: '#FF007F',
        icon: ShieldCheck,
        customBg: '#FF007F08', // Pink/Red glass
        customBorder: '#FF007F25',
      },
      {
        id: 'billing',
        title: 'BILLING & TOKENS',
        desc: 'System Tiers, Quotas, Usage',
        color: 'purple',
        iconHex: '#8A2BE2',
        icon: Cpu,
        customBg: '#8A2BE208', // Purple glass
        customBorder: '#8A2BE225',
      },
      {
        id: 'support',
        title: 'SUPPORT',
        desc: 'Help Desk, Active Tickets',
        color: 'green',
        iconHex: '#32FF00',
        icon: LifeBuoy,
        customBg: '#32FF0008', // Green glass
        customBorder: '#32FF0025',
      },
    ];

    if (userRole === 'admin') {
      modules.push({
        id: 'admin',
        title: 'ADMIN',
        desc: 'Global Telemetry, User Directory',
        color: 'red',
        iconHex: '#FF3333',
        icon: Terminal,
        customBg: '#FF333308', // Dark Red glass
        customBorder: '#FF333325',
        routeOverride: '/admin',
      });
    }

    return modules;
  }, [userRole]);

  return (
    <SafeAreaView className="flex-1 bg-[#000011]">
      {/* ── AMBIENT ORB DEPLOYMENT ──
Smaller sizes (180-220), varied start points, random delays for bouncing effect.
Change the color or size properties here to modify the background. */}
      <View
        className="absolute inset-0 overflow-hidden"
        style={{ pointerEvents: 'none' }}
      >
        <AmbientOrb
          color="#00F0FF" // Cyan
          size={200}
          top={-50}
          left={-50}
          opacity={0.06}
          delay={0}
        />
        <AmbientOrb
          color="#8A2BE2" // Purple
          size={180}
          top={250}
          right={-60}
          opacity={0.07}
          delay={2000}
        />
        <AmbientOrb
          color="#054aeb" // Deep Blue
          size={220}
          bottom={100}
          left={-40}
          opacity={0.05}
          delay={4000}
        />
      </View>

      {/* ── MAIN CONTENT LAYER ── */}
      <View className="flex-1 w-full" style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1, width: '100%' }}
          contentContainerStyle={{
            padding: isMobile ? 16 : 60,
            paddingTop: isMobile ? 100 : 100,
            paddingBottom: isMobile ? 140 : 200,
            flexGrow: 1,
            alignItems: 'center', // Centers the max-w-2xl container for Web
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

              <View className="h-[2px] w-20 bg-cyan-400 mt-6 md:mt-8 rounded-full shadow-[0_0_20px_#00F0FF]" />
            </View>
          </FadeIn>

          <View className="flex-row items-center justify-between w-full max-w-2xl px-4 py-4 md:px-8">
            <TouchableOpacity
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace('/')
              }
              className="flex-row items-center mb-10 gap-x-2"
              activeOpacity={0.7}
            >
              <ArrowBigLeftDash size={18} color="#00F0FF" />
              <Text className="text-[10px] font-black tracking-[4px] text-cyan-400 uppercase">
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
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
                      className="flex-row items-center justify-between p-4 transition-all md:p-8 hover:bg-white/[0.04] rounded-3xl"
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
