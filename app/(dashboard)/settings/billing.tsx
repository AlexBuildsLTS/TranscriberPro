/**
 * app/(dashboard)/settings/billing.tsx
 * Sovereign NorthOS — Resource Allocation & Token Economy (ULTIMATE v16.0)
 * ══════════════════════════════════════════════════════════════════════════════
 * PROTOCOL:
 * 1. TRIPLE-FLEX ARCHITECTURE: SafetyView -> Keyboard -> Scroll flex mapping.
 * 2. REAL-TIME LEDGER: Bi-directional sync with Supabase profiles and usage logs.
 * 3. TOKEN ECONOMY: Member (50 Daily Refill) | Pro (2000 Monthly) | Enterprise (10K+ Custom).
 * 4. WEB STABILITY: Native shadow props used to bypass NativeWind boxShadow crashes.
 * 5. SCROLL ENGINE: flexGrow: 1 with 150px padding offset for infinite scroll.
 * ══════════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Dimensions,
  Linking,
  StyleSheet,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowBigLeftDash,
  Zap,
  Star,
  Crown,
  TrendingUp,
  Info,
  Coins,
  RefreshCw,
  Activity,
  ShieldCheck,
  Clock,
  ChevronRight,
  Database,
  History,
  ZapOff,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GlassCard } from '../../../components/ui/GlassCard';
import { FadeIn } from '../../../components/animations/FadeIn';
import { useAuthStore } from '../../../store/useAuthStore';
import { supabase } from '../../../lib/supabase/client';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  withDelay,
} from 'react-native-reanimated';

// ─── MODULE 1: AMBIENT VISUAL ENGINE ────────────────────────────────────────

const NeuralOrb = ({ delay = 0, color = '#8A2BE2' }) => {
  const pulse = useSharedValue(0);
  const { width } = Dimensions.get('window');

  useEffect(() => {
    pulse.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 12000 }), -1, true),
    );
  }, [delay, pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(pulse.value, [0, 1], [1, 1.4]) },
      { translateX: interpolate(pulse.value, [0, 1], [0, width * 0.03]) },
    ],
    opacity: interpolate(pulse.value, [0, 1], [0.03, 0.07]),
  }));

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          position: 'absolute',
          width: 700,
          height: 700,
          backgroundColor: color,
          borderRadius: 350,
          ...(Platform.OS === 'web' ? ({ filter: 'blur(140px)' } as any) : {}),
        },
      ]}
    />
  );
};

// ─── MODULE 2: ECONOMIC CONFIGURATION ───────────────────────────────────────

const TIER_CONFIG = {
  free: {
    label: 'Standard Member',
    color: '#00F0FF',
    icon: Zap,
    badge: 'DAILY REFILL',
    allowance: 50,
    resetLabel: 'Refills daily at 00:00 UTC',
  },
  pro: {
    label: 'Premium Teams',
    color: '#FFD700',
    icon: Star,
    badge: 'PRO ACCESS',
    allowance: 2000,
    resetLabel: 'Monthly quota reset active',
  },
  enterprise: {
    label: 'Enterprise',
    color: '#FF3366',
    icon: Crown,
    badge: 'UNLIMITED',
    allowance: 10000,
    resetLabel: 'High-volume reserve active',
  },
};

const PROTOCOLS = {
  free: [
    '50 Token Daily Refill Protocol',
    'Standard Speech-to-Text Speed',
    'YouTube Metadata Extraction (Free)',
    'Community Support Infrastructure',
  ],
  pro: [
    '2,000 Token Monthly Reservoir',
    'Priority Neural Processing',
    'Full Export Layers (SRT/VTT/JSON)',
    'Gemini 3.1 Flash-Lite Support',
    'Dedicated Slack Support Node',
  ],
  enterprise: [
    'Custom Bulk Token Allocation',
    'Zero-Latency Synthesis Node',
    'Custom Prompt Engineering Vault',
    'Batch Video Submission Access',
    'Dedicated Account Architect',
  ],
};

// ─── MODULE 3: MAIN COMPONENT ───────────────────────────────────────────────

export default function BillingScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [tier, setTier] = useState<'free' | 'pro' | 'enterprise'>('free');
  const [balance, setBalance] = useState(0);
  const [consumed, setConsumed] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  const isMobile = SCREEN_WIDTH < 768;

  // ── DATA FETCH ENGINE ──
  const syncEconomy = useCallback(async () => {
    if (!user?.id) return;
    try {
      // 1. Sync Base Profile
      const { data: profile, error: pErr } = await supabase
        .from('profiles')
        .select('tier, tokens_balance')
        .eq('id', user.id)
        .single();

      if (pErr) throw pErr;

      const currentTier = (profile.tier as any) ?? 'free';
      setTier(currentTier);
      setBalance(profile.tokens_balance ?? 0);

      // 2. Aggregate Consumption Logs
      const now = new Date();
      const cycleStart =
        currentTier === 'free'
          ? new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate(),
            ).toISOString()
          : new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { data: logs } = await supabase
        .from('usage_logs')
        .select('tokens_consumed')
        .eq('user_id', user.id)
        .gte('created_at', cycleStart);

      const totalBurn =
        logs?.reduce((acc, log) => acc + (log.tokens_consumed || 0), 0) || 0;
      setConsumed(totalBurn);
    } catch (err) {
      console.error('[ECONOMY FAULT]: Identity Sync Interrupted.');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    syncEconomy();
  }, [syncEconomy]);

  const config = TIER_CONFIG[tier] || TIER_CONFIG.free;
  const usagePercentage = Math.min(
    100,
    config.allowance > 0 ? Math.round((consumed / config.allowance) * 100) : 0,
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#00F0FF" size="large" />
        <Text style={styles.loadingText}>Accessing Ledger Nodes...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.rootContainer}>
      {/* ── AMBIENT CANVAS ── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <NeuralOrb delay={0} color="#8A2BE2" />
        <NeuralOrb delay={6000} color="#00F0FF" />
      </View>

      {/* ── CORE SCROLL ENGINE ── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flexOne}
      >
        <ScrollView
          style={styles.flexOne}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.maxLayoutWidth}>
            {/* ── HEADER ── */}
            <TouchableOpacity
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace('/settings')
              }
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <ArrowBigLeftDash size={22} color={config.color} />
              <Text style={[styles.backText, { color: config.color }]}>
                System Return
              </Text>
            </TouchableOpacity>

            <FadeIn>
              <View style={styles.headerTitleBlock}>
                <Text style={styles.moduleBadge}>Economy Interface</Text>
                <Text style={styles.mainTitle}>
                  Resource{' '}
                  <Text style={{ color: config.color }}>Allocation</Text>
                </Text>
                <View
                  style={[styles.titleRule, { backgroundColor: config.color }]}
                />
              </View>
            </FadeIn>

            {/* ── MODULE: IDENTITY STATUS ── */}
            <FadeIn delay={100}>
              <GlassCard style={styles.glassCardOverride}>
                <View style={styles.statusHeaderRow}>
                  <View>
                    <Text style={styles.metaLabel}>Active clearance</Text>
                    <View style={styles.tierNameBlock}>
                      <config.icon size={26} color={config.color} />
                      <Text style={styles.tierLabelText}>{config.label}</Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.badgeContainer,
                      {
                        borderColor: `${config.color}40`,
                        backgroundColor: `${config.color}12`,
                      },
                    ]}
                  >
                    <Text style={[styles.badgeText, { color: config.color }]}>
                      {config.badge}
                    </Text>
                  </View>
                </View>

                {/* CAPACITY METER */}
                <View style={styles.meterContainer}>
                  <View style={styles.meterInfoRow}>
                    <View style={styles.meterLabelBlock}>
                      <Coins size={16} color="#FFD700" />
                      <Text style={styles.meterTitle}>Reserve Tokens</Text>
                    </View>
                    <Text style={styles.balanceValue}>
                      {balance.toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.progressBarTrack}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${100 - usagePercentage}%`,
                          backgroundColor: config.color,
                          // SAFE NATIVE SHADOWS - NO BOX-SHADOW STRING
                          shadowColor: config.color,
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.8,
                          shadowRadius: 10,
                          elevation: 5,
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.meterFooter}>
                    <View style={styles.footerInfoBlock}>
                      <RefreshCw size={12} color="rgba(255,255,255,0.2)" />
                      <Text style={styles.footerText}>{config.resetLabel}</Text>
                    </View>
                    <Text style={styles.consumedText}>{consumed} burned</Text>
                  </View>
                </View>

                {/* PROTOCOL LIST */}
                <View style={styles.protocolBlock}>
                  <Text style={styles.metaLabel}>Active Network Protocols</Text>
                  <View style={styles.protocolList}>
                    {PROTOCOLS[tier].map((protocol, i) => (
                      <View key={i} style={styles.protocolRow}>
                        <ShieldCheck size={14} color={`${config.color}70`} />
                        <Text style={styles.protocolText}>{protocol}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </GlassCard>
            </FadeIn>

            {/* ── MODULE: SCALING OPTIONS ── */}
            {tier !== 'enterprise' && (
              <FadeIn delay={200}>
                <GlassCard style={styles.glassCardOverride}>
                  <View style={styles.upgradeHeader}>
                    <Database size={20} color="#FF3366" />
                    <Text style={styles.upgradeTitle}>
                      Expand Core Reservoirs
                    </Text>
                  </View>
                  <Text style={styles.upgradeSubtext}>
                    Initiate token migration to unlock high-priority neural
                    lanes and infinite synthesis.
                  </Text>

                  <View style={styles.ctaGrid}>
                    {tier === 'free' && (
                      <TouchableOpacity
                        onPress={() =>
                          Linking.openURL('https://transcriber-pro.vercel.app/')
                        }
                        style={styles.proCta}
                        activeOpacity={0.8}
                      >
                        <Star size={18} color="#00F0FF" />
                        <Text style={styles.proCtaText}>Teams Plan — $29</Text>
                        <ChevronRight size={14} color="#00F0FF" />
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      onPress={() =>
                        Linking.openURL('https://transcriber-pro.vercel.app/')
                      }
                      style={styles.enterpriseCta}
                      activeOpacity={0.8}
                    >
                      <Crown size={18} color="#FF3366" />
                      <Text style={styles.enterpriseCtaText}>Enterprise</Text>
                      <ChevronRight size={14} color="#FF3366" />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.stripeDisclaimer}>
                    Transactions secured via AES-256 Stripe Infrastructure
                  </Text>
                </GlassCard>
              </FadeIn>
            )}

            {/* ── MODULE: LEDGER LOGIC ── */}
            <FadeIn delay={300}>
              <View style={styles.footerLedger}>
                <View style={styles.ledgerHeaderRow}>
                  <Clock size={16} color="#FFF" />
                  <Text style={styles.ledgerTitle}>Ledger Logic</Text>
                </View>
                <View style={styles.ledgerList}>
                  <View style={styles.ledgerRow}>
                    <View style={styles.ledgerBullet} />
                    <Text style={styles.ledgerText}>
                      <Text style={styles.boldWhite}>Daily Refill:</Text> Member
                      tiers receive 50 tokens at 00:00 UTC. Non-accumulative.
                    </Text>
                  </View>
                  <View style={styles.ledgerRow}>
                    <View style={styles.ledgerBullet} />
                    <Text style={styles.ledgerText}>
                      <Text style={styles.boldWhite}>Synthesis Cost:</Text> 1
                      Token is depleted per 60 seconds of AI speech-to-text.
                    </Text>
                  </View>
                  <View style={styles.ledgerRow}>
                    <View style={styles.ledgerBullet} />
                    <Text style={styles.ledgerText}>
                      <Text style={styles.boldWhite}>Captions:</Text> YouTube
                      caption extraction is bypass-certified (Zero Cost).
                    </Text>
                  </View>
                </View>
              </View>
            </FadeIn>

            {/* SYSTEM FOOTER */}
            <View style={styles.systemManifest}>
              <History size={16} color="rgba(255,255,255,0.15)" />
              <Text style={styles.manifestText}>
                NORTHOS RESOURCE ENGINE V16.0.0
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── MODULE 4: STYLING KERNEL ───────────────────────────────────────────────

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    backgroundColor: '#020205',
  },
  flexOne: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 150,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#020205',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#00F0FF',
    marginTop: 24,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 6,
    textTransform: 'uppercase',
  },
  maxLayoutWidth: {
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
    gap: 12,
  },
  backText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  headerTitleBlock: {
    marginBottom: 48,
  },
  moduleBadge: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 8,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  mainTitle: {
    color: '#FFF',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -2,
    textTransform: 'uppercase',
  },
  titleRule: {
    width: 60,
    height: 4,
    marginTop: 20,
    borderRadius: 2,
  },
  glassCardOverride: {
    padding: 32,
    marginBottom: 32,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 40,
  },
  metaLabel: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  tierNameBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tierLabelText: {
    color: '#FFF',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
    textTransform: 'uppercase',
  },
  badgeContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
  },
  meterContainer: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    padding: 24,
  },
  meterInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  meterLabelBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  meterTitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  balanceValue: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: '900',
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'Menlo',
  },
  progressBarTrack: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 3,
    overflow: 'visible', // Changed to visible so glow is seen
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  meterFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  footerInfoBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  consumedText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  protocolBlock: {
    marginTop: 40,
  },
  protocolList: {
    gap: 14,
    marginTop: 12,
  },
  protocolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  protocolText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    fontWeight: '600',
  },
  upgradeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  upgradeTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  upgradeSubtext: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 28,
  },
  ctaGrid: {
    gap: 12,
  },
  proCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    backgroundColor: 'rgba(0,240,255,0.05)',
    borderColor: 'rgba(0,240,255,0.2)',
    borderWidth: 1,
    borderRadius: 14,
    gap: 12,
  },
  proCtaText: {
    color: '#00F0FF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  enterpriseCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    backgroundColor: 'rgba(255,51,102,0.05)',
    borderColor: 'rgba(255,51,102,0.2)',
    borderWidth: 1,
    borderRadius: 14,
    gap: 12,
  },
  enterpriseCtaText: {
    color: '#FF3366',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  stripeDisclaimer: {
    textAlign: 'center',
    marginTop: 20,
    color: 'rgba(255,255,255,0.12)',
    fontSize: 8,
    fontFamily: 'monospace',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  footerLedger: {
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
    borderRadius: 24,
    padding: 24,
    marginTop: 20,
  },
  ledgerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  ledgerTitle: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  ledgerList: {
    gap: 16,
  },
  ledgerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  ledgerBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginTop: 6,
  },
  ledgerText: {
    flex: 1,
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    lineHeight: 16,
  },
  boldWhite: {
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '800',
  },
  systemManifest: {
    alignItems: 'center',
    marginTop: 100,
    opacity: 0.1,
  },
  manifestText: {
    color: '#FFF',
    fontSize: 8,
    fontFamily: 'monospace',
    letterSpacing: 8,
    marginTop: 10,
    textTransform: 'uppercase',
  },
});
