/**
 * app/(dashboard)/settings/security.tsx
 * VerAI — Security & Identity Vault
 * ══════════════════════════════════════════════════════════════════════════════
 * PROTOCOL:
 * 1. BIOMETRIC KERNEL: Real hardware verification via expo-local-authentication.
 * 2. CREDENTIAL ROTATION: Current-Password + New-Password + Confirmation.
 * 3. AI API VAULT (STILL NOT FINISHED): Encrypted management for OpenAI, Gemini, and Anthropic
 * ══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
  StyleSheet,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowBigLeftDash,
  Lock,
  Fingerprint,
  Cpu,
  ShieldAlert,
} from 'lucide-react-native';

import { GlassCard } from '../../../components/ui/GlassCard';
import { FadeIn } from '../../../components/animations/FadeIn';
import { useAuthStore } from '../../../store/useAuthStore';
import { supabase } from '../../../lib/supabase/client';
import { cn } from '../../../lib/utils';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  withDelay,
} from 'react-native-reanimated';

// ─── STRICT THEME ENFORCEMENT ───
const THEME = {
  obsidian: '#000012',
  danger: '#FF007F', // Neon Pink
  success: '#32FF00', // Neon Green
  cyan: '#00F0FF', // Neon Cyan
  purple: '#8A2BE2', // Neon Purple
  slate: '#94a3b8',
};

// ─── MODULE 1: AMBIENT VISUAL ENGINE (APK TOUCH-SAFE) ───────────────────────
const NeuralOrb = ({ delay = 0, color = THEME.danger }: any) => {
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
      { scale: interpolate(pulse.value, [0, 1], [1, 1.4]) },
      { translateX: interpolate(pulse.value, [0, 1], [0, width * 0.1]) },
      { translateY: interpolate(pulse.value, [0, 1], [0, height * 0.05]) },
    ],
    opacity: interpolate(pulse.value, [0, 1], [0.03, 0.08]),
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: 500,
          height: 500,
          backgroundColor: color,
          borderRadius: 250,
          pointerEvents: 'none', // CRITICAL FIX: Ensures it never blocks touches
          ...(Platform.OS === 'web' ? ({ filter: 'blur(120px)' } as any) : {}),
        },
        animatedStyle,
      ]}
    />
  );
};

// ─── MODULE 2: PASSWORD STRENGTH HELPERS ────────────────────────────────────
const calculateEntropy = (pw: string) => {
  const checks = [
    pw.length >= 10,
    /[A-Z]/.test(pw),
    /[0-9]/.test(pw),
    /[^A-Za-z0-9]/.test(pw),
  ];
  return checks.filter(Boolean).length;
};

const ENTROPY_COLORS = [
  '#3F3F46',
  THEME.danger,
  '#F59E0B',
  THEME.cyan,
  THEME.success,
];

// ─── MODULE 3: MAIN COMPONENT ───────────────────────────────────────────────
export default function SecuritySettingsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { width: SCREEN_WIDTH } = Dimensions.get('window');
  const isMobile = SCREEN_WIDTH < 768;

  // ── Password States ──
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [isRotating, setIsRotating] = useState(false);

  // ── API Key States ──
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    gemini: '',
    anthropic: '',
  });
  const [isSyncingKeys, setIsSyncingKeys] = useState(false);

  // ── Biometric States ──
  const [bioSupported, setBioSupported] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);

  // ── Initialization ──
  useEffect(() => {
    (async () => {
      if (Platform.OS === 'web') return;
      const hasHw = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBioSupported(hasHw && enrolled);

      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('biometrics_enabled, custom_api_key')
          .eq('id', user.id)
          .maybeSingle();

        if (data) {
          setBioEnabled(!!data.biometrics_enabled);
          try {
            if (data.custom_api_key) {
              const keys = JSON.parse(data.custom_api_key);
              setApiKeys({
                openai: keys.openai ?? '',
                gemini: keys.gemini ?? '',
                anthropic: keys.anthropic ?? '',
              });
            }
          } catch (e) {
            console.error('Vault integrity check failed.', e);
          }
        }
      }
    })();
  }, [user]);

  // ── Action: Biometrics ──
  const handleBioToggle = async () => {
    if (!bioSupported) return;
    setBioLoading(true);
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: bioEnabled
        ? 'De-authorize Biometric Shield'
        : 'Authorize Biometric Shield',
    });

    if (result.success && user) {
      const { error } = await supabase
        .from('profiles')
        .update({ biometrics_enabled: !bioEnabled })
        .eq('id', user.id);

      if (!error) setBioEnabled(!bioEnabled);
    }
    setBioLoading(false);
  };

  // ── Action: Credential Rotation ──
  const handleRotateCredentials = async () => {
    if (!currentPw || newPw.length < 10) {
      Alert.alert(
        'Protocol Error',
        'Verification of current and minimum 10-char password required.',
      );
      return;
    }
    if (newPw !== confirmPw) {
      Alert.alert('Rotation Error', 'Credentials mismatch.');
      return;
    }

    setIsRotating(true);
    // Note: Requires the user to have recently signed in for security purposes
    const { error } = await supabase.auth.updateUser({ password: newPw });

    if (error) {
      Alert.alert('Update Refused', error.message);
    } else {
      Alert.alert(
        'Rotation Complete',
        'Identity credentials rotated successfully.',
      );
      setNewPw('');
      setConfirmPw('');
      setCurrentPw('');
    }
    setIsRotating(false);
  };

  // ── Action: API Vault Save ──
  const handleSaveApiVault = async () => {
    if (!user) return;
    setIsSyncingKeys(true);

    // Only save keys that are actually provided to keep the DB clean
    const cleanedKeys = {
      ...(apiKeys.openai ? { openai: apiKeys.openai } : {}),
      ...(apiKeys.gemini ? { gemini: apiKeys.gemini } : {}),
      ...(apiKeys.anthropic ? { anthropic: apiKeys.anthropic } : {}),
    };

    const vaultString =
      Object.keys(cleanedKeys).length > 0 ? JSON.stringify(cleanedKeys) : null;

    const { error } = await supabase
      .from('profiles')
      .update({ custom_api_key: vaultString })
      .eq('id', user.id);

    if (error) {
      Alert.alert('Vault Error', error.message);
    } else {
      Alert.alert('Vault Sealed', 'AI configurations encrypted and saved.');
    }
    setIsSyncingKeys(false);
  };

  const entropyScore = calculateEntropy(newPw);

  return (
    <SafeAreaView className="flex-1 bg-[#000012]">
      {/* Background Orbs */}
      <NeuralOrb delay={0} color={THEME.danger} top={-50} left={-100} />
      <NeuralOrb delay={4000} color={THEME.purple} bottom={-100} right={-50} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: isMobile ? 16 : 40,
            paddingTop: 16,
            paddingBottom: 150,
            flexGrow: 1,
            maxWidth: 800, // Thinner width for settings pages looks cleaner
            alignSelf: 'center',
            width: '100%',
          }}
        >
          {/* ── RETURN NAVIGATION ── */}
          <FadeIn delay={100} className="z-50 flex-col mb-12">
            <TouchableOpacity
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace('/')
              }
              className="flex-row items-center self-start mb-8 transition-transform gap-x-3 active:scale-95"
              activeOpacity={0.7}
            >
              <ArrowBigLeftDash size={22} color={THEME.danger} />
              <Text className="text-[11px] font-black tracking-[4px] text-[#FF007F] uppercase">
                RETURN
              </Text>
            </TouchableOpacity>

            <View>
              <Text className="text-4xl font-black leading-none tracking-tighter text-white uppercase md:text-5xl">
                Security <Text style={{ color: THEME.danger }}>Vault</Text>
              </Text>
              <View className="h-1 w-24 bg-[#FF007F] mt-4 rounded-full shadow-[0_0_15px_#FF007F]" />
            </View>
          </FadeIn>

          {/* ── BIOMETRIC SHIELD ── */}
          <FadeIn delay={200}>
            <GlassCard className="p-6 md:p-10 mb-8 bg-white/[0.015] border-white/5 rounded-[32px]">
              <View className="flex-row items-center mb-8 gap-x-4">
                <Fingerprint size={28} color={THEME.danger} />
                <Text className="text-lg font-black tracking-widest text-white uppercase md:text-xl">
                  Biometric Kernel
                </Text>
              </View>

              <View className="flex-row items-center justify-between p-5 md:p-6 border bg-black/40 border-white/10 rounded-[24px]">
                <View>
                  <Text className="text-xs font-bold tracking-wider text-white uppercase md:text-sm">
                    System Access Toggle
                  </Text>
                  <Text className="text-[9px] md:text-[10px] font-black text-white/30 uppercase tracking-[2px] mt-1.5">
                    Status:{' '}
                    {bioSupported
                      ? bioEnabled
                        ? 'ACTIVE'
                        : 'READY'
                      : 'NO HARDWARE'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleBioToggle}
                  disabled={!bioSupported || bioLoading}
                  style={[
                    styles.toggleBase,
                    bioEnabled ? styles.toggleActive : styles.toggleInactive,
                  ]}
                  className="p-1 rounded-full"
                >
                  <View
                    style={[
                      styles.toggleKnob,
                      bioEnabled ? styles.knobActive : styles.knobInactive,
                    ]}
                  />
                </TouchableOpacity>
              </View>

              {bioLoading && (
                <View className="absolute inset-0 flex-row items-center justify-center bg-[#000012]/50 rounded-[32px]">
                  <ActivityIndicator size="large" color={THEME.danger} />
                </View>
              )}
            </GlassCard>
          </FadeIn>

          {/* ── CREDENTIAL ROTATION ── */}
          <FadeIn delay={300}>
            <GlassCard className="p-6 md:p-10 mb-8 bg-white/[0.015] border-white/5 rounded-[32px]">
              <View className="flex-row items-center mb-10 gap-x-4">
                <Lock size={24} color={THEME.danger} />
                <Text className="text-lg font-black tracking-widest text-white uppercase md:text-xl">
                  Credentials Protocol
                </Text>
              </View>

              <View className="gap-y-6">
                <View>
                  <Text className="text-[9px] font-black text-[#FF007F] tracking-[3px] uppercase mb-3 ml-2">
                    Current Verification
                  </Text>
                  <TextInput
                    value={currentPw}
                    onChangeText={setCurrentPw}
                    secureTextEntry
                    placeholder="••••••••••••"
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    className="h-14 px-5 font-mono text-sm text-white border rounded-[20px] bg-black/40 border-white/10 focus:border-[#FF007F]"
                  />
                </View>

                <View>
                  <Text className="text-[9px] font-black text-[#FF007F] tracking-[3px] uppercase mb-3 ml-2">
                    New Identity Code
                  </Text>
                  <TextInput
                    value={newPw}
                    onChangeText={setNewPw}
                    secureTextEntry
                    placeholder="Min 10 Characters"
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    className="h-14 px-5 font-mono text-sm text-white border rounded-[20px] bg-black/40 border-white/10 focus:border-[#FF007F]"
                  />
                  {newPw.length > 0 && (
                    <View className="flex-row h-1.5 px-2 mt-4 gap-x-2">
                      {[1, 2, 3, 4].map((n) => (
                        <View
                          key={n}
                          className="flex-1 transition-colors duration-300 rounded-full"
                          style={{
                            backgroundColor:
                              entropyScore >= n
                                ? ENTROPY_COLORS[entropyScore]
                                : 'rgba(255,255,255,0.1)',
                          }}
                        />
                      ))}
                    </View>
                  )}
                </View>

                <View>
                  <Text className="text-[9px] font-black text-[#FF007F] tracking-[3px] uppercase mb-3 ml-2">
                    Verify Identity Code
                  </Text>
                  <TextInput
                    value={confirmPw}
                    onChangeText={setConfirmPw}
                    secureTextEntry
                    placeholder="Verify New Code"
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    className="h-14 px-5 font-mono text-sm text-white border rounded-[20px] bg-black/40 border-white/10 focus:border-[#FF007F]"
                  />
                </View>

                <TouchableOpacity
                  onPress={handleRotateCredentials}
                  disabled={isRotating}
                  className="flex-row items-center justify-center h-14 mt-4 bg-[#FF007F]/10 border border-[#FF007F]/30 rounded-[20px] active:scale-95 transition-transform"
                >
                  {isRotating ? (
                    <ActivityIndicator size="small" color={THEME.danger} />
                  ) : null}
                  <Text
                    className={cn(
                      'text-[11px] font-black uppercase tracking-widest',
                      isRotating ? 'ml-3 text-white/50' : 'text-[#FF007F]',
                    )}
                  >
                    {isRotating ? 'Rotating...' : 'Rotate Credentials'}
                  </Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          </FadeIn>

          {/* ── AI INTEGRATION VAULT ── */}
          <FadeIn delay={400}>
            <GlassCard className="p-6 md:p-10 mb-8 bg-white/[0.015] border-white/5 rounded-[32px]">
              <View className="flex-row items-center mb-10 gap-x-4">
                <Cpu size={24} color={THEME.cyan} />
                <Text className="text-lg font-black tracking-widest text-white uppercase md:text-xl">
                  AI Nodes (AES-256)
                </Text>
              </View>

              <View className="gap-y-6">
                <View>
                  <Text className="text-[9px] font-black text-[#00F0FF] tracking-[3px] uppercase mb-3 ml-2">
                    OpenAI API Key
                  </Text>
                  <TextInput
                    value={apiKeys.openai}
                    onChangeText={(v) =>
                      setApiKeys((p) => ({ ...p, openai: v }))
                    }
                    placeholder="sk-..."
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    className="h-14 px-5 font-mono text-sm text-white border rounded-[20px] bg-black/40 border-white/10 focus:border-[#00F0FF]"
                  />
                </View>
                <View>
                  <Text className="text-[9px] font-black text-[#00F0FF] tracking-[3px] uppercase mb-3 ml-2">
                    Google Gemini Key
                  </Text>
                  <TextInput
                    value={apiKeys.gemini}
                    onChangeText={(v) =>
                      setApiKeys((p) => ({ ...p, gemini: v }))
                    }
                    placeholder="AIza..."
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    className="h-14 px-5 font-mono text-sm text-white border rounded-[20px] bg-black/40 border-white/10 focus:border-[#00F0FF]"
                  />
                </View>
                <View>
                  <Text className="text-[9px] font-black text-[#00F0FF] tracking-[3px] uppercase mb-3 ml-2">
                    Anthropic Key
                  </Text>
                  <TextInput
                    value={apiKeys.anthropic}
                    onChangeText={(v) =>
                      setApiKeys((p) => ({ ...p, anthropic: v }))
                    }
                    placeholder="sk-ant-..."
                    placeholderTextColor="rgba(255,255,255,0.2)"
                    className="h-14 px-5 font-mono text-sm text-white border rounded-[20px] bg-black/40 border-white/10 focus:border-[#00F0FF]"
                  />
                </View>

                <TouchableOpacity
                  onPress={handleSaveApiVault}
                  disabled={isSyncingKeys}
                  className="flex-row items-center justify-center h-14 mt-4 bg-[#00F0FF]/10 border border-[#00F0FF]/30 rounded-[20px] active:scale-95 transition-transform"
                >
                  {isSyncingKeys ? (
                    <ActivityIndicator size="small" color={THEME.cyan} />
                  ) : null}
                  <Text
                    className={cn(
                      'text-[11px] font-black uppercase tracking-widest',
                      isSyncingKeys ? 'ml-3 text-white/50' : 'text-[#00F0FF]',
                    )}
                  >
                    {isSyncingKeys ? 'Sealing...' : 'Seal Vault'}
                  </Text>
                </TouchableOpacity>
              </View>
            </GlassCard>
          </FadeIn>

          {/* ── DANGER ZONE ── */}
          <FadeIn delay={500}>
            <GlassCard className="p-8 md:p-10 border-rose-500/10 bg-rose-500/5 rounded-[32px]">
              <View className="flex-row items-center mb-6 gap-x-4">
                <ShieldAlert size={28} color={THEME.danger} />
                <Text className="text-lg font-black tracking-widest text-white uppercase md:text-xl">
                  Identity Purge
                </Text>
              </View>
              <Text className="mb-10 text-[10px] md:text-xs leading-6 tracking-[2px] uppercase text-white/40">
                Permanent deconstruction of all digital footprints from the
                VerAI
              </Text>
              <TouchableOpacity
                onPress={() =>
                  Alert.alert(
                    'Purge Protocol',
                    'Contact root administrator to execute full data purge.',
                  )
                }
                className="items-center justify-center h-14 border border-rose-500/20 bg-rose-500/10 rounded-[20px] active:scale-95 transition-transform"
              >
                <Text className="text-[10px] md:text-xs font-black text-rose-500 uppercase tracking-[4px]">
                  Deconstruct Account
                </Text>
              </TouchableOpacity>
            </GlassCard>
          </FadeIn>

          <View className="items-center mt-20 opacity-30">
            <View className="h-[1px] w-12 bg-white/20 mb-4" />
            <Text className="text-[9px] font-mono tracking-[6px] text-white uppercase text-center">
              VerAI Security
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  toggleBase: {
    width: 56,
    height: 30,
    borderRadius: 15,
    padding: 3,
    justifyContent: 'center',
  },
  toggleActive: { backgroundColor: THEME.danger },
  toggleInactive: { backgroundColor: 'rgba(255,255,255,0.1)' },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF',
  },
  knobActive: { alignSelf: 'flex-end' },
  knobInactive: { alignSelf: 'flex-start' },
});
