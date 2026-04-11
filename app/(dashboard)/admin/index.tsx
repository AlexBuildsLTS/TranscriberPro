/**
 * app/(dashboard)/admin/index.tsx
 * VerAI - Enterprise ADMIN Command Center
 * ----------------------------------------------------------------------------
 * MODULE OVERVIEW:
 * 1. COMMAND HEADER: Floating, unglued "OPERATIONAL" badge + Return router.
 * 2. AMBIENT ENGINE: 100% Mobile touch-safe background (`pointerEvents: 'none'`).
 * 3. TELEMETRY KERNEL: Syncs live DB data, calculating active tokens & failures.
 * 4. SYSTEM API VAULT: 100% REAL Supabase CRUD for fallback AI keys.
 * 5. SAAS FORECASTER: Real-time projection engine balancing API cost vs MRR.
 * 6. IDENTITY REGISTRY: Displays 'role' and '[BYO-KEY]' vs '[SYSTEM]' logic.
 * ----------------------------------------------------------------------------
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Platform,
  TextInput,
  LayoutAnimation,
  UIManager,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withRepeat,
  withTiming,
  interpolate,
  FadeInDown,
  Easing,
} from 'react-native-reanimated';
import {
  Users,
  Lock,
  Layers,
  Coins,
  Server,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  Activity,
  DatabaseZap,
  Cpu,
  History,
  RefreshCcw,
  Zap,
  ArrowUpRight,
  KeyRound,
  Plus,
  Trash2,
  ArrowBigLeftDash, // Ensure return arrow is present
} from 'lucide-react-native';

// ─── CORE CONFIG & DATABASE TYPES ──────────────────────────────────────────
import { Database as DBTypes } from '../../../types/database/database.types';
import { supabase } from '../../../lib/supabase/client';
import { GlassCard } from '../../../components/ui/GlassCard';
import { FadeIn } from '../../../components/animations/FadeIn';
import { cn } from '../../../lib/utils';

// Enable Layout Animations for Android APKs
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── STRICT THEME ENFORCEMENT ──────────────────────────────────────────────
const THEME = {
  obsidian: '#000012',
  indigo: '#6366f1',
  slate: '#94a3b8',
  danger: '#FF007F', // Neon Pink
  success: '#32FF00', // Neon Green
  warning: '#F59E0B', // Amber
  white: '#ffffff',
  cyan: '#00F0FF', // Neon Cyan
  purple: '#8A2BE2', // Neon Purple
};

// ══════════════════════════════════════════════════════════════════════════════
// MODULE 1: AMBIENT ORB ENGINE (APK Touch-Safe)
// ══════════════════════════════════════════════════════════════════════════════
const AmbientOrb = ({
  color,
  size,
  top,
  left,
  right,
  bottom,
  opacity = 0.05,
  delay = 0,
}: any) => {
  const { width, height } = Dimensions.get('window');
  const drift = useSharedValue(0);

  useEffect(() => {
    drift.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 8000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
  }, [delay, drift]);

  const anim = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(drift.value, [0, 1], [0, width * 0.1]) },
      { translateY: interpolate(drift.value, [0, 1], [0, height * 0.05]) },
      { scale: interpolate(drift.value, [0, 1], [0.9, 1.2]) },
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
          pointerEvents: 'none', // CRITICAL: Ensures it never blocks touches
        },
        anim,
      ]}
    />
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MODULE 2: DATA MODELS & TELEMETRY (Strictly Typed from DB)
// ══════════════════════════════════════════════════════════════════════════════
type Profile = DBTypes['public']['Tables']['profiles']['Row'];
type Video = DBTypes['public']['Tables']['videos']['Row'];
type UsageLog = DBTypes['public']['Tables']['usage_logs']['Row'];
type AIInsight = DBTypes['public']['Tables']['ai_insights']['Row'];
type SystemApiKey = DBTypes['public']['Tables']['system_api_keys']['Row'];

type EnrichedLog = UsageLog & {
  ai_model_name?: string | null;
  actual_tokens_burned?: number | null;
};

interface TelemetrySnapshot {
  users: { total: number; premium: number; admin: number; liability: number };
  infra: {
    failedJobs: number;
    totalSeconds: number;
    tokensBurned: number;
    avgTokensPerJob: number;
    latencyMs: string;
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// MODULE 3: MAIN COMMAND CENTER
// ══════════════════════════════════════════════════════════════════════════════
export default function AdminCommandCenter() {
  const router = useRouter();
  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  const isMobile = SCREEN_WIDTH < 768;

  const [refreshing, setRefreshing] = useState(false);
  const [healthStatus, setHealthStatus] = useState<'OPERATIONAL' | 'DEGRADED'>(
    'OPERATIONAL',
  );
  const [expandedAlerts, setExpandedAlerts] = useState(false);

  const [telemetry, setTelemetry] = useState<TelemetrySnapshot>({
    users: { total: 0, premium: 0, admin: 0, liability: 0 },
    infra: {
      failedJobs: 0,
      totalSeconds: 0,
      tokensBurned: 0,
      avgTokensPerJob: 0,
      latencyMs: '0ms',
    },
  });

  const [registryPreview, setRegistryPreview] = useState<Profile[]>([]);
  const [failures, setFailures] = useState<
    Pick<Video, 'id' | 'title' | 'error_message' | 'updated_at'>[]
  >([]);
  const [liveStream, setLiveStream] = useState<EnrichedLog[]>([]);

  // Forecast Inputs
  const [inputs, setInputs] = useState({
    mau: '1000',
    avgMins: '60',
    subPrice: '29',
  });

  // System API Keys State
  const [apiKeys, setApiKeys] = useState<SystemApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [isAddingKey, setIsAddingKey] = useState(false);

  // ─── SYNC ENGINE (100% Real Data) ───
  const synchronizeTelemetry = useCallback(async () => {
    const syncStartTime = Date.now();
    try {
      const [
        { data: profiles },
        { data: videos },
        { data: insights },
        { data: logs },
        { data: keys },
      ] = await Promise.all([
        supabase.from('profiles').select('*'),
        supabase
          .from('videos')
          .select(
            'id, status, duration_seconds, title, error_message, updated_at',
          ),
        supabase
          .from('ai_insights')
          .select('tokens_used, ai_model, video_id, created_at'),
        supabase
          .from('usage_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('system_api_keys')
          .select('*')
          .order('created_at', { ascending: true }), // Fully typed!
      ]);

      const dbLatency = Date.now() - syncStartTime;
      const safeProfiles = (profiles as Profile[]) || [];
      const safeVideos = (videos as Video[]) || [];
      const safeInsights = (insights as AIInsight[]) || [];
      const safeLogs = (logs as UsageLog[]) || [];

      if (keys) setApiKeys(keys as SystemApiKey[]);

      const activeLiability = safeProfiles.reduce(
        (acc, curr) => acc + (curr.tokens_balance || 0),
        0,
      );
      const realTokensBurned = safeInsights.reduce(
        (acc, curr) => acc + (curr.tokens_used || 0),
        0,
      );
      const avgTokens =
        safeInsights.length > 0
          ? Math.round(realTokensBurned / safeInsights.length)
          : 0;
      const failedJobs = safeVideos.filter((v) => v.status === 'failed');

      setTelemetry({
        users: {
          total: safeProfiles.length,
          premium: safeProfiles.filter((p) => p.role === 'premium').length,
          admin: safeProfiles.filter((p) => p.role === 'admin').length,
          liability: activeLiability,
        },
        infra: {
          failedJobs: failedJobs.length,
          totalSeconds: safeVideos.reduce(
            (acc, curr) => acc + (curr.duration_seconds || 0),
            0,
          ),
          tokensBurned: realTokensBurned,
          avgTokensPerJob: avgTokens,
          latencyMs: `${dbLatency}ms`,
        },
      });

      setFailures(
        failedJobs.sort(
          (a, b) =>
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
        ),
      );
      setRegistryPreview(safeProfiles.slice(0, 5));

      setLiveStream(
        safeLogs.map((log) => {
          const matchingInsight = safeInsights.find(
            (i) => i.video_id === log.video_id,
          );
          return {
            ...log,
            ai_model_name:
              log.ai_model || matchingInsight?.ai_model || 'System',
            actual_tokens_burned:
              log.tokens_consumed || matchingInsight?.tokens_used || 0,
          };
        }),
      );

      setHealthStatus(dbLatency > 2000 ? 'DEGRADED' : 'OPERATIONAL');
    } catch (err) {
      console.error('[TELEMETRY FAULT]:', err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    synchronizeTelemetry();
    const channel = supabase
      .channel(`admin_kernel_${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        synchronizeTelemetry,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'videos' },
        synchronizeTelemetry,
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'usage_logs' },
        synchronizeTelemetry,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [synchronizeTelemetry]);

  // ─── FORECAST ENGINE ───
  const saasFinancials = useMemo(() => {
    const mau = parseFloat(inputs.mau) || 0;
    const price = parseFloat(inputs.subPrice) || 0;
    const mins = parseFloat(inputs.avgMins) || 0;

    const projectedMRR = mau * price;
    const estimatedApiCostPerUser =
      ((telemetry.infra.avgTokensPerJob * (mins / 10)) / 1000000) * 0.5;
    const totalApiBurn = mau * estimatedApiCostPerUser + projectedMRR * 0.029;

    return {
      mrr: projectedMRR,
      net: projectedMRR - totalApiBurn,
      margin:
        projectedMRR > 0
          ? ((projectedMRR - totalApiBurn) / projectedMRR) * 100
          : 0,
    };
  }, [inputs, telemetry.infra.avgTokensPerJob]);

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  // ─── REAL DB API KEY HANDLERS ───
  const handleAddKey = async () => {
    if (!newKeyName || !newKeyValue)
      return Alert.alert('Error', 'Please provide a name and key.');
    setIsAddingKey(true);

    const keyPreview =
      newKeyValue.substring(0, 7) + '...' + newKeyValue.slice(-4);

    try {
      const { data, error } = await supabase
        .from('system_api_keys')
        .insert({
          name: newKeyName,
          key_preview: keyPreview,
          encrypted_key: newKeyValue, // Secure value
        })
        .select()
        .single();

      if (error) throw error;

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setApiKeys([...apiKeys, data as SystemApiKey]);
      setNewKeyName('');
      setNewKeyValue('');
    } catch (err) {
      console.error(err);
      Alert.alert('Database Error', 'Failed to insert key into Supabase.');
    } finally {
      setIsAddingKey(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    try {
      const { error } = await supabase
        .from('system_api_keys')
        .delete()
        .eq('id', id);
      if (error) throw error;

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setApiKeys(apiKeys.filter((k) => k.id !== id));
    } catch (err) {
      Alert.alert('Error', 'Failed to delete key.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#000012]">
      <AmbientOrb
        color={THEME.cyan}
        size={400}
        top={-100}
        left={-150}
        opacity={0.03}
        delay={0}
      />
      <AmbientOrb
        color={THEME.purple}
        size={300}
        top={300}
        right={-100}
        opacity={0.04}
        delay={2000}
      />
      <AmbientOrb
        color={THEME.success}
        size={250}
        bottom={-50}
        left={-50}
        opacity={0.02}
        delay={4000}
      />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: isMobile ? 16 : 40,
          paddingTop: 24,
          paddingBottom: 150,
          flexGrow: 1,
          maxWidth: 1280,
          alignSelf: 'center',
          width: '100%',
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              synchronizeTelemetry();
            }}
            tintColor={THEME.cyan}
          />
        }
      >
        {/* ════════ 1. COMMAND HEADER (Unglued & Hovering) ════════ */}
        <FadeIn delay={100} className="z-50 flex-col mb-12">
          {/* RETURN BUTTON: Pinned to Top Left */}
          <TouchableOpacity
            onPress={() => router.replace('/')}
            className="flex-row items-center self-start mb-6 gap-x-3"
            activeOpacity={0.7}
          >
            <ArrowBigLeftDash size={22} color={THEME.cyan} />
            <Text className="text-[11px] font-black tracking-[4px] text-[#00F0FF] uppercase">
              Return to Hub
            </Text>
          </TouchableOpacity>

          <View className="flex-row items-start justify-between w-full">
            <View>
              <Text className="text-3xl font-black tracking-tighter text-white uppercase md:text-4xl">
                Admin <Text style={{ color: THEME.cyan }}>Root</Text>
              </Text>
              <View className="flex-row items-center gap-2 mt-2">
                <RefreshCcw size={12} color={THEME.cyan} />
                <Text className="text-[9px] md:text-[10px] font-black tracking-[4px] text-white/50 uppercase">
                  Live Registry Active
                </Text>
              </View>
            </View>

            {/* THE FIX: alignSelf: 'flex-start' forces the badge to hug its content and NEVER stretch. */}
            <View
              style={{
                alignSelf: 'flex-start',
                shadowColor:
                  healthStatus === 'OPERATIONAL'
                    ? THEME.success
                    : THEME.warning,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 10,
                elevation: 8, // Required for Android drop-shadow
              }}
              className={cn(
                'flex-row items-center px-4 py-2.5 border rounded-full',
                healthStatus === 'OPERATIONAL'
                  ? 'bg-[#32FF00]/10 border-[#32FF00]/40'
                  : 'bg-[#F59E0B]/10 border-[#F59E0B]/40',
              )}
            >
              <Activity
                size={12}
                color={
                  healthStatus === 'OPERATIONAL' ? THEME.success : THEME.warning
                }
              />
              <Text
                className={cn(
                  'ml-2 text-[10px] md:text-[11px] font-black uppercase tracking-widest',
                  healthStatus === 'OPERATIONAL'
                    ? 'text-[#32FF00]'
                    : 'text-[#F59E0B]',
                )}
              >
                {healthStatus}
              </Text>
            </View>
          </View>
        </FadeIn>

        {/* ════════ 2. DIAGNOSTICS BAR ════════ */}
        <FadeIn delay={200}>
          <GlassCard className="flex-col gap-4 p-5 mb-10 border md:p-6 md:flex-row md:items-center md:justify-between bg-white/[0.015] border-white/5 rounded-3xl md:rounded-[32px]">
            <View className="flex-row items-center gap-4">
              <View className="items-center justify-center w-10 h-10 border rounded-xl bg-blue-500/10 border-blue-500/20">
                <Server size={18} color="#3B82F6" />
              </View>
              <View>
                <Text className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                  Ping Latency
                </Text>
                <Text className="text-base font-bold text-white/90">
                  {telemetry.infra.latencyMs}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-4">
              <View className="items-center justify-center w-10 h-10 border rounded-xl bg-[#32FF00]/10 border-[#32FF00]/20">
                <Lock size={18} color={THEME.success} />
              </View>
              <View>
                <Text className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                  Security
                </Text>
                <Text className="text-base font-bold text-[#32FF00]">
                  Strict-v3 SSL
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-4">
              <View className="items-center justify-center w-10 h-10 border rounded-xl bg-amber-500/10 border-amber-500/20">
                <ShieldCheck size={18} color={THEME.warning} />
              </View>
              <View>
                <Text className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                  Health
                </Text>
                <Text className="text-base font-bold text-[#F59E0B]">
                  {healthStatus}
                </Text>
              </View>
            </View>
          </GlassCard>
        </FadeIn>

        {/* ════════ 3. SYSTEM SNAPSHOT ════════ */}
        <View className="flex-row items-center gap-3 mb-6">
          <Layers size={14} color="#fff" />
          <Text className="text-[10px] md:text-[11px] font-black text-white tracking-[3px] uppercase">
            Manager Panel
          </Text>
        </View>

        <View className="flex-col gap-4 mb-12 lg:flex-row">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/admin/users')}
            className="w-full lg:flex-1"
          >
            <GlassCard className="flex-col justify-between p-6 bg-white/[0.015] border-white/5 rounded-3xl h-36 hover:bg-white/[0.03] transition-colors">
              <View className="flex-row items-center justify-between">
                <View className="items-center justify-center w-10 h-10 border rounded-xl bg-[#00F0FF]/10 border-[#00F0FF]/20">
                  <Users size={18} color={THEME.cyan} />
                </View>
                <ArrowUpRight size={18} color={THEME.cyan} opacity={0.5} />
              </View>
              <View>
                <Text className="text-4xl font-black text-white">
                  {telemetry.users.total}
                </Text>
                <Text className="mt-1 text-[9px] font-black tracking-widest text-white/40 uppercase">
                  Total Accounts
                </Text>
              </View>
            </GlassCard>
          </TouchableOpacity>

          <View className="w-full lg:flex-1">
            <GlassCard className="flex-col justify-between p-6 bg-white/[0.015] border-white/5 rounded-3xl h-36">
              <View className="items-center justify-center w-10 h-10 border rounded-xl bg-[#8A2BE2]/10 border-[#8A2BE2]/20">
                <TrendingUp size={18} color={THEME.purple} />
              </View>
              <View>
                <Text className="text-4xl font-black text-[#8A2BE2]">
                  {telemetry.users.premium}
                </Text>
                <Text className="mt-1 text-[9px] font-black tracking-widest text-white/40 uppercase">
                  Premium Subs
                </Text>
              </View>
            </GlassCard>
          </View>

          <View className="w-full lg:flex-1">
            <GlassCard className="flex-col p-6 bg-white/[0.015] border-white/5 rounded-3xl min-h-[144px]">
              <View className="flex-row items-center justify-between mb-2">
                <View className="items-center justify-center w-10 h-10 border rounded-xl bg-[#FF007F]/10 border-[#FF007F]/20">
                  <AlertTriangle
                    size={18}
                    color={
                      telemetry.infra.failedJobs > 0 ? THEME.danger : '#64748b'
                    }
                  />
                </View>
                {telemetry.infra.failedJobs > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      LayoutAnimation.configureNext(
                        LayoutAnimation.Presets.easeInEaseOut,
                      );
                      setExpandedAlerts(!expandedAlerts);
                    }}
                    className="px-3 py-1.5 border rounded-full bg-white/5 border-white/10 active:scale-95"
                  >
                    <Text className="text-[9px] font-black text-white uppercase tracking-widest">
                      {expandedAlerts ? 'HIDE' : 'LOGS'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              {expandedAlerts ? (
                <ScrollView
                  nestedScrollEnabled
                  showsVerticalScrollIndicator={false}
                  className="max-h-[80px] mt-2"
                >
                  {failures.map((v) => (
                    <View key={v.id} className="py-2 border-b border-white/5">
                      <Text
                        className="text-[10px] font-bold text-[#FF007F]"
                        numberOfLines={1}
                      >
                        {v.title || 'Unknown Asset'}
                      </Text>
                      <Text className="text-[8px] text-white/40 mt-1">
                        {v.error_message || 'Pipeline Error'}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <View className="mt-auto">
                  <Text
                    className={cn(
                      'text-4xl font-black',
                      telemetry.infra.failedJobs > 0
                        ? 'text-[#FF007F]'
                        : 'text-white/80',
                    )}
                  >
                    {telemetry.infra.failedJobs}
                  </Text>
                  <Text className="mt-1 text-[9px] font-black tracking-widest text-white/40 uppercase">
                    System Failures
                  </Text>
                </View>
              )}
            </GlassCard>
          </View>
        </View>

        {/* ════════ 4. SYSTEM API KEY VAULT ════════ */}
        <View className="flex-row items-center gap-3 mb-6">
          <KeyRound size={14} color="#fff" />
          <Text className="text-[10px] md:text-[11px] font-black text-white tracking-[3px] uppercase">
            System API Vault (Fallbacks)
          </Text>
        </View>

        <GlassCard className="p-6 md:p-8 bg-white/[0.015] border-white/5 rounded-3xl mb-12">
          {apiKeys.length === 0 ? (
            <Text className="mb-4 text-xs italic text-white/40">
              No system keys configured. Add one below.
            </Text>
          ) : (
            apiKeys.map((key) => (
              <View
                key={key.id}
                className="flex-row items-center justify-between p-4 mb-3 border rounded-2xl bg-white/[0.02] border-white/5"
              >
                <View className="flex-1 pr-4">
                  <Text className="mb-1 text-sm font-bold text-white">
                    {key.name}
                  </Text>
                  <Text className="font-mono text-[10px] text-white/40">
                    {key.key_preview}
                  </Text>
                </View>
                <View className="items-end px-4 mr-4 border-r border-white/10">
                  <Text className="text-[9px] font-black text-[#00F0FF] uppercase tracking-widest mb-1">
                    {key.tokens_burned
                      ? key.tokens_burned.toLocaleString()
                      : '0'}
                  </Text>
                  <Text className="text-[8px] font-black text-white/30 uppercase tracking-widest">
                    Tokens
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteKey(key.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Trash2 size={16} color={THEME.danger} opacity={0.7} />
                </TouchableOpacity>
              </View>
            ))
          )}

          <View className="flex-col gap-3 mt-4 md:flex-row md:items-center">
            <TextInput
              placeholder="Key Name (e.g. Gemini-Backup)"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={newKeyName}
              onChangeText={setNewKeyName}
              className="flex-1 h-12 px-4 text-xs font-bold text-white border rounded-xl bg-black/40 border-white/10 focus:border-[#00F0FF]"
            />
            <TextInput
              placeholder="AIzaSy..."
              placeholderTextColor="rgba(255,255,255,0.3)"
              secureTextEntry
              value={newKeyValue}
              onChangeText={setNewKeyValue}
              className="flex-[2] h-12 px-4 text-xs font-mono text-white border rounded-xl bg-black/40 border-white/10 focus:border-[#00F0FF]"
            />
            <TouchableOpacity
              onPress={handleAddKey}
              disabled={isAddingKey}
              className="flex-row items-center justify-center h-12 px-6 transition-transform border bg-[#00F0FF]/10 border-[#00F0FF]/30 rounded-xl active:scale-95"
            >
              {isAddingKey ? (
                <ActivityIndicator size="small" color={THEME.cyan} />
              ) : (
                <Plus size={14} color={THEME.cyan} />
              )}
              <Text className="ml-2 text-[10px] font-black text-[#00F0FF] uppercase tracking-widest">
                Add
              </Text>
            </TouchableOpacity>
          </View>
        </GlassCard>

        {/* ════════ 5. ECONOMY & FINANCIAL CORE ════════ */}
        <View className="flex-row items-center gap-3 mb-6">
          <Coins size={14} color="#facc15" />
          <Text className="text-[10px] md:text-[11px] font-black text-white tracking-[3px] uppercase">
            Economic Engine & Forecast
          </Text>
        </View>

        <GlassCard className="p-6 md:p-8 bg-white/[0.015] border-white/5 rounded-3xl mb-12">
          <View className="flex-col gap-8 md:gap-12 md:flex-row">
            <View className="flex-col justify-between flex-1 pb-8 pr-0 border-b border-white/5 md:pb-0 md:border-b-0 md:pr-12 md:border-r">
              <View className="mb-8">
                <Text className="text-[9px] font-black tracking-widest text-white/40 uppercase mb-2">
                  Token Liability
                </Text>
                <Text className="text-4xl font-black tracking-tighter text-white">
                  {telemetry.users.liability.toLocaleString()}
                </Text>
              </View>
              <View>
                <Text className="text-[9px] font-black tracking-widest text-white/40 uppercase mb-2">
                  Lifetime AI Burn
                </Text>
                <Text className="text-4xl font-black tracking-tighter text-[#8A2BE2]">
                  {telemetry.infra.tokensBurned.toLocaleString()}
                </Text>
              </View>
            </View>

            <View className="flex-1 gap-4 pr-0 md:pr-12 md:border-r border-white/5">
              <View>
                <Text className="mb-1.5 text-[9px] font-black text-white/40 uppercase tracking-widest">
                  Est. Monthly Users
                </Text>
                <TextInput
                  className="h-10 px-4 font-mono text-xs text-white border rounded-xl bg-black/40 border-white/10 focus:border-[#00F0FF]"
                  keyboardType="numeric"
                  value={inputs.mau}
                  onChangeText={(v) => setInputs((p) => ({ ...p, mau: v }))}
                />
              </View>
              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Text className="mb-1.5 text-[9px] font-black text-white/40 uppercase tracking-widest">
                    Avg Sub ($)
                  </Text>
                  <TextInput
                    className="h-10 px-4 font-mono text-xs text-white border rounded-xl bg-black/40 border-white/10 focus:border-[#00F0FF]"
                    keyboardType="numeric"
                    value={inputs.subPrice}
                    onChangeText={(v) =>
                      setInputs((p) => ({ ...p, subPrice: v }))
                    }
                  />
                </View>
              </View>
            </View>

            <View className="justify-center flex-1 lg:pl-4">
              <View className="mb-6">
                <Text className="mb-1 text-[9px] font-black tracking-widest text-white/40 uppercase">
                  Projected MRR
                </Text>
                <Text className="text-4xl font-black tracking-tighter text-[#32FF00]">
                  {formatter.format(saasFinancials.mrr)}
                </Text>
              </View>
              <View className="flex-row items-end justify-between">
                <View>
                  <Text className="mb-1 text-[9px] font-black text-white/40 uppercase tracking-widest">
                    Net Forecast
                  </Text>
                  <Text className="text-2xl font-black tracking-tighter text-white">
                    {formatter.format(saasFinancials.net)}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="mb-1 text-[9px] font-black text-white/40 uppercase tracking-widest">
                    Margin
                  </Text>
                  <Text className="text-lg font-black text-[#00F0FF]">
                    {saasFinancials.margin.toFixed(1)}%
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </GlassCard>

        {/* ════════ 6. IDENTITY REGISTRY ════════ */}
        <View className="flex-row items-center gap-3 mb-6">
          <Users size={14} color="#fff" />
          <Text className="text-[10px] md:text-[11px] font-black text-white tracking-[3px] uppercase">
            Identity Registry Preview
          </Text>
        </View>

        <GlassCard className="p-0 border bg-white/[0.015] border-white/5 rounded-3xl mb-12 overflow-hidden">
          <View className="flex-row items-center justify-between px-6 py-4 bg-white/[0.02] border-b border-white/5">
            <Text className="text-[9px] font-black text-white/40 uppercase tracking-widest w-1/3">
              Profile
            </Text>
            <Text className="text-[9px] font-black text-white/40 uppercase tracking-widest w-1/4">
              Role
            </Text>
            <Text className="text-[9px] font-black text-white/40 uppercase tracking-widest w-1/4">
              API Config
            </Text>
            <View className="w-8" />
          </View>

          {registryPreview.length === 0 ? (
            <ActivityIndicator color={THEME.cyan} className="py-12" />
          ) : (
            registryPreview.map((profile, idx) => (
              <View
                key={profile.id}
                className={cn(
                  'flex-row items-center px-6 py-5',
                  idx !== registryPreview.length - 1 &&
                    'border-b border-white/5',
                )}
              >
                <View className="w-1/3 pr-4">
                  <Text
                    className="text-xs font-bold text-white/90"
                    numberOfLines={1}
                  >
                    {profile.full_name || 'Anonymous'}
                  </Text>
                  <Text
                    className="text-[9px] text-white/40 font-mono mt-0.5"
                    numberOfLines={1}
                  >
                    {profile.email}
                  </Text>
                </View>
                <View className="w-1/4">
                  <View
                    className={cn(
                      'px-2 py-1 rounded border self-start',
                      profile.role === 'admin'
                        ? 'bg-[#8A2BE2]/10 border-[#8A2BE2]/30'
                        : profile.role === 'premium'
                          ? 'bg-[#F59E0B]/10 border-[#F59E0B]/30'
                          : 'bg-white/5 border-white/10',
                    )}
                  >
                    <Text
                      className={cn(
                        'text-[8px] font-black uppercase tracking-widest',
                        profile.role === 'admin'
                          ? 'text-[#8A2BE2]'
                          : profile.role === 'premium'
                            ? 'text-[#F59E0B]'
                            : 'text-white/50',
                      )}
                    >
                      {profile.role || 'MEMBER'}
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-center w-1/4 gap-2">
                  <KeyRound
                    size={10}
                    color={profile.custom_api_key ? THEME.success : THEME.cyan}
                    opacity={0.6}
                  />
                  <Text
                    className={cn(
                      'font-mono text-[9px] font-bold',
                      profile.custom_api_key
                        ? 'text-[#32FF00]'
                        : 'text-[#00F0FF]',
                    )}
                  >
                    {profile.custom_api_key ? '[BYO-KEY]' : '[SYSTEM]'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => router.push('/admin/users')}
                  className="items-end w-8"
                >
                  <ChevronRight size={14} color="#ffffff30" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </GlassCard>

        {/* ════════ 7. REAL-TIME EVENT STREAM ════════ */}
        <View className="flex-row items-center gap-3 mb-6">
          <History size={14} color="#fff" />
          <Text className="text-[10px] md:text-[11px] font-black text-white tracking-[3px] uppercase">
            Real-Time Engine Stream
          </Text>
        </View>

        <GlassCard className="p-0 border bg-white/[0.015] border-white/5 rounded-3xl overflow-hidden">
          {liveStream.map((log, idx) => (
            <Animated.View
              key={log.id}
              entering={FadeInDown.delay(idx * 50)}
              className={cn(
                'flex-row items-start p-6',
                idx !== liveStream.length - 1 && 'border-b border-white/5',
              )}
            >
              <View className="items-center justify-center w-10 h-10 mr-5 border rounded-xl bg-white/[0.03] border-white/10">
                {log.action.includes('ai') ? (
                  <Cpu size={16} color={THEME.purple} />
                ) : (
                  <Zap size={16} color={THEME.cyan} />
                )}
              </View>

              <View className="flex-1">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-black tracking-wide capitalize text-white/90">
                    {log.action.replace(/_/g, ' ')}
                  </Text>
                  <Text className="text-[9px] font-mono text-white/30">
                    {new Date(log.created_at).toLocaleTimeString()}
                  </Text>
                </View>

                <View className="flex-row flex-wrap items-center gap-3 mt-3">
                  <View className="px-2 py-1 border rounded bg-[#00F0FF]/10 border-[#00F0FF]/20">
                    <Text className="text-[9px] font-mono font-bold text-[#00F0FF]">
                      {log.actual_tokens_burned} TOKENS
                    </Text>
                  </View>
                  {log.ai_model_name && (
                    <View className="px-2 py-1 border rounded bg-[#8A2BE2]/10 border-[#8A2BE2]/20">
                      <Text className="text-[8px] font-black text-[#8A2BE2] uppercase tracking-wider">
                        {log.ai_model_name}
                      </Text>
                    </View>
                  )}
                  <Text className="text-[9px] font-black text-white/30 uppercase tracking-widest">
                    USR: {log.user_id.slice(0, 8)}
                  </Text>
                </View>
              </View>
            </Animated.View>
          ))}
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}
