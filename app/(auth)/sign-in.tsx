/**
 * sign-in.tsx — Primary Authentication Screen
 * Dual-mode login: Email/Password + Magic Link fallback.
 * Integrates with Supabase Auth via useAuthStore (Zustand).
 * Preserves "Liquid Neon" glassmorphism + NeuralOrb ambient FX.
 */

import React, { useState, memo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useAuthStore } from '../../store/useAuthStore';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Zap,
  Brain,
  Globe,
  Github,
  Twitter,
  Youtube,
} from 'lucide-react-native';
import Animated, {
  FadeInDown,
  FadeInRight,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  withDelay,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/Button';
import { AuthValidator } from '../../utils/validators/auth';

/* ── Static Assets ─────────────────────────────────────────────────────────── */
const APP_ICON = require('../../assets/icon.png');

/* ── Auth Mode Type ────────────────────────────────────────────────────────── */
type AuthMode = 'password' | 'magic-link';

/* ── Bento Feature Cards ───────────────────────────────────────────────────── */
type BentoItem = { icon: any; title: string; desc: string };

const BENTO_ITEMS: BentoItem[] = [
  {
    icon: Zap,
    title: 'Lightning Engine',
    desc: 'Process massive media payloads with sub-second latency.',
  },
  {
    icon: Brain,
    title: 'Neural Analysis',
    desc: 'Semantic extraction via Anthropic Claude models.',
  },
  {
    icon: Globe,
    title: 'Global Nodes',
    desc: 'Access your secure vault from any authenticated endpoint.',
  },
];

/* ── Ambient Background Orb (Reanimated) ───────────────────────────────────── */
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

/* ══════════════════════════════════════════════════════════════════════════════
 * MAIN SCREEN — SignInScreen
 * Responsive layout: sidebar (desktop) / stacked scroll (mobile).
 * ══════════════════════════════════════════════════════════════════════════════ */
export default function SignInScreen() {
  const { signInWithMagicLink, signInWithPassword } = useAuthStore();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  /* ── Form State ──────────────────────────────────────────────────────────── */
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<AuthMode>('password');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);

  /* ── Password Login Handler ──────────────────────────────────────────────── */
  const handlePasswordLogin = useCallback(async () => {
    const trimmedEmail = email.trim();

    /* Validate email via shared AuthValidator */
    if (!AuthValidator.isValidEmail(trimmedEmail)) {
      return setMessage({
        type: 'error',
        text: 'Valid email address required.',
      });
    }

    /* Validate password presence and strength */
    const passwordCheck = AuthValidator.isValidPassword(password);
    if (!passwordCheck.valid) {
      return setMessage({
        type: 'error',
        text: passwordCheck.error || 'Invalid password.',
      });
    }

    setLoading(true);
    setMessage(null);

    const { error } = await signInWithPassword(trimmedEmail, password);

    if (error) {
      setMessage({ type: 'error', text: error });
    } else {
      /* Auth state listener in useAuthStore handles navigation */
      router.replace('/(dashboard)');
    }
    setLoading(false);
  }, [email, password, signInWithPassword, router]);

  /* ── Magic Link Fallback Handler ─────────────────────────────────────────── */
  const handleMagicLinkLogin = useCallback(async () => {
    const trimmedEmail = email.trim();

    if (!AuthValidator.isValidEmail(trimmedEmail)) {
      return setMessage({
        type: 'error',
        text: 'Valid email address required.',
      });
    }

    setLoading(true);
    setMessage(null);

    const { error } = await signInWithMagicLink(trimmedEmail);

    if (error) {
      setMessage({ type: 'error', text: error });
    } else {
      setMessage({ type: 'success', text: 'Secure link deployed to inbox.' });
    }
    setLoading(false);
  }, [email, signInWithMagicLink]);

  /* ── Unified Submit Dispatcher ───────────────────────────────────────────── */
  const handleLogin = useCallback(() => {
    if (authMode === 'password') return handlePasswordLogin();
    return handleMagicLinkLogin();
  }, [authMode, handlePasswordLogin, handleMagicLinkLogin]);

  /* ── Render ──────────────────────────────────────────────────────────────── */
  return (
    <View className="flex-1 bg-[#020205]">
      {/* Ambient Neural Background */}
      <View className="absolute inset-0 overflow-hidden" pointerEvents="none">
        <NeuralOrb delay={0} color="#00F0FF" />
        <NeuralOrb delay={2500} color="#8A2BE2" />
      </View>

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          {isDesktop ? (
            /* ── Desktop: Sidebar + Scrollable Marketing ────────────────── */
            <View style={styles.desktopContainer}>
              <View style={styles.desktopSidebar}>
                <View style={{ width: '100%', maxWidth: 420 }}>
                  <BrandHeader />
                  <LoginFormContent
                    email={email}
                    setEmail={setEmail}
                    password={password}
                    setPassword={setPassword}
                    authMode={authMode}
                    setAuthMode={setAuthMode}
                    loading={loading}
                    onLogin={handleLogin}
                    message={message}
                  />
                  <SecurityFooter />
                </View>
              </View>
              <ScrollView
                style={styles.desktopScroll}
                contentContainerStyle={styles.desktopScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <MarketingContent isDesktop={true} />
              </ScrollView>
            </View>
          ) : (
            /* ── Mobile: Stacked Scroll ─────────────────────────────────── */
            <ScrollView
              style={styles.mobileScroll}
              contentContainerStyle={styles.mobileScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.mobilePane}>
                <BrandHeader />
                <LoginFormContent
                  email={email}
                  setEmail={setEmail}
                  password={password}
                  setPassword={setPassword}
                  authMode={authMode}
                  setAuthMode={setAuthMode}
                  loading={loading}
                  onLogin={handleLogin}
                  message={message}
                />
                <SecurityFooter />
              </View>
              <View className="h-[1px] bg-white/5 my-10 mx-6" />
              <View style={styles.mobilePane}>
                <MarketingContent isDesktop={false} />
              </View>
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
 * SUB-COMPONENTS
 * ══════════════════════════════════════════════════════════════════════════════ */

/* ── Brand Header: App icon + authenticator label ──────────────────────────── */
const BrandHeader = memo(() => (
  <Animated.View
    entering={FadeInDown.duration(1000).springify()}
    style={styles.brandHeader}
  >
    <Image source={APP_ICON} style={styles.brandIcon} resizeMode="contain" />
    <Text className="text-white/40 font-mono text-[10px] uppercase tracking-[3px] mt-4 text-center">
      Secure Authenticator Node
    </Text>
  </Animated.View>
));
BrandHeader.displayName = 'BrandHeader';

/* ── Login Form: Dual-mode (password / magic link) ─────────────────────────── */
const LoginFormContent = memo(
  ({
    email,
    setEmail,
    password,
    setPassword,
    authMode,
    setAuthMode,
    loading,
    onLogin,
    message,
  }: {
    email: string;
    setEmail: (v: string) => void;
    password: string;
    setPassword: (v: string) => void;
    authMode: AuthMode;
    setAuthMode: (v: AuthMode) => void;
    loading: boolean;
    onLogin: () => void;
    message: { type: 'error' | 'success'; text: string } | null;
  }) => {
    const [showPassword, setShowPassword] = useState(false);
    const passwordRef = useRef<TextInput>(null);

    return (
      <View className="p-8 neural-glass">
        <View style={{ gap: 20 }}>
          {/* ── Auth Mode Toggle ──────────────────────────────────────── */}
          <View className="flex-row bg-white/[0.03] border border-white/10 rounded-2xl p-1">
            <TouchableOpacity
              onPress={() => setAuthMode('password')}
              className={cn(
                'flex-1 py-3 rounded-xl items-center',
                authMode === 'password'
                  ? 'bg-neon-cyan/10 border border-neon-cyan/30'
                  : 'border border-transparent',
              )}
              activeOpacity={0.7}
            >
              <Text
                className={cn(
                  'text-[10px] font-black uppercase tracking-widest',
                  authMode === 'password' ? 'text-neon-cyan' : 'text-white/30',
                )}
              >
                Password
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setAuthMode('magic-link')}
              className={cn(
                'flex-1 py-3 rounded-xl items-center',
                authMode === 'magic-link'
                  ? 'bg-neon-cyan/10 border border-neon-cyan/30'
                  : 'border border-transparent',
              )}
              activeOpacity={0.7}
            >
              <Text
                className={cn(
                  'text-[10px] font-black uppercase tracking-widest',
                  authMode === 'magic-link'
                    ? 'text-neon-cyan'
                    : 'text-white/30',
                )}
              >
                Magic Link
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Email Input ───────────────────────────────────────────── */}
          <View>
            <Text className="text-neon-cyan font-black text-[10px] tracking-widest uppercase mb-2 ml-1">
              Operative Email
            </Text>
            <View className="bg-white/[0.02] border border-white/10 rounded-2xl h-14 flex-row items-center px-4">
              <Mail size={18} color="#A1A1AA" />
              <TextInput
                className="flex-1 h-full ml-3 text-sm font-medium text-white outline-none"
                placeholder="commander@enterprise.com"
                placeholderTextColor="#475569"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType={authMode === 'password' ? 'next' : 'done'}
                onSubmitEditing={() => {
                  if (authMode === 'password') passwordRef.current?.focus();
                  else onLogin();
                }}
                editable={!loading}
                autoComplete="email"
                textContentType="emailAddress"
              />
            </View>
          </View>

          {/* ── Password Input (conditional on authMode) ──────────────── */}
          {authMode === 'password' && (
            <Animated.View entering={FadeInDown.duration(300).springify()}>
              <Text className="text-neon-cyan font-black text-[10px] tracking-widest uppercase mb-2 ml-1">
                Security Key
              </Text>
              <View className="bg-white/[0.02] border border-white/10 rounded-2xl h-14 flex-row items-center px-4">
                <Lock size={18} color="#A1A1AA" />
                <TextInput
                  ref={passwordRef}
                  className="flex-1 h-full ml-3 text-sm font-medium text-white outline-none"
                  placeholder="Min. 8 characters"
                  placeholderTextColor="#475569"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="go"
                  onSubmitEditing={onLogin}
                  editable={!loading}
                  autoComplete="password"
                  textContentType="password"
                />
                {/* Toggle password visibility */}
                <TouchableOpacity
                  onPress={() => setShowPassword((prev) => !prev)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {showPassword ? (
                    <EyeOff size={18} color="#A1A1AA" />
                  ) : (
                    <Eye size={18} color="#A1A1AA" />
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {/* ── Status Message ────────────────────────────────────────── */}
          {message && (
            <View
              className={cn(
                'p-4 border rounded-xl',
                message.type === 'error'
                  ? 'bg-neon-pink/10 border-neon-pink/30'
                  : 'bg-neon-cyan/10 border-neon-cyan/30',
              )}
            >
              <Text
                className={cn(
                  'text-center font-bold text-[10px] tracking-widest uppercase',
                  message.type === 'error'
                    ? 'text-neon-pink'
                    : 'text-neon-cyan',
                )}
              >
                {message.text}
              </Text>
            </View>
          )}

          {/* ── Submit Button ─────────────────────────────────────────── */}
          <Button
            onPress={onLogin}
            isLoading={loading}
            title={
              loading
                ? 'UPLINKING...'
                : authMode === 'password'
                  ? 'AUTHENTICATE'
                  : 'DEPLOY SECURE LINK'
            }
            className="py-4 mt-2 shadow-lg shadow-neon-cyan/20"
          />

          {/* ── Navigation: Sign Up ───────────────────────────────────── */}
          <View className="flex-row items-center justify-center gap-2 mt-4">
            <Text className="text-white/40 text-[10px] font-mono uppercase tracking-widest">
              Unregistered?
            </Text>
            <Link href="/(auth)/sign-up" asChild>
              <TouchableOpacity>
                <Text className="font-bold text-neon-cyan text-[10px] uppercase tracking-widest">
                  Initialize Node
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </View>
    );
  },
);
LoginFormContent.displayName = 'LoginFormContent';

/* ── Encryption Badge ──────────────────────────────────────────────────────── */
const SecurityFooter = memo(() => (
  <View className="flex-row items-center justify-center mt-10 opacity-40">
    <Text className="text-white/80 text-[9px] font-black tracking-[2px] uppercase">
      End-to-End Encrypted Session
    </Text>
  </View>
));
SecurityFooter.displayName = 'SecurityFooter';

/* ── Marketing / Feature Showcase Panel ────────────────────────────────────── */
const MarketingContent = memo(({ isDesktop }: { isDesktop: boolean }) => (
  <View style={{ width: '100%', paddingBottom: 60 }}>
    {/* Hero Headline */}
    <Animated.View
      entering={FadeInRight.duration(1200).springify().delay(200)}
      style={{ marginBottom: 40 }}
    >
      <Text
        className={cn(
          'font-black text-white tracking-tighter uppercase',
          isDesktop ? 'text-6xl leading-[60px]' : 'text-4xl leading-[42px]',
        )}
      >
        Enterprise <Text className="text-neon-cyan">Scale</Text>
      </Text>
      <Text
        className={cn(
          'text-white/50 leading-loose mt-4',
          isDesktop ? 'text-lg' : 'text-sm',
        )}
      >
        Provision your workspace to access military-grade transcription, AI
        semantic mapping, and raw data extraction.
      </Text>
    </Animated.View>

    {/* Bento Feature Grid */}
    <View className="flex-row flex-wrap gap-5 mt-8">
      {BENTO_ITEMS.map((item, index) => (
        <Animated.View
          key={item.title}
          entering={FadeInRight.delay(200 + index * 100).springify()}
          className={cn('neural-glass p-8', isDesktop ? 'w-[48%]' : 'w-full')}
        >
          <View className="items-center justify-center w-12 h-12 mb-5 bg-neon-cyan/10 rounded-2xl">
            <item.icon size={20} color="#00F0FF" />
          </View>
          <Text className="mb-2 text-lg font-black tracking-wide text-white uppercase">
            {item.title}
          </Text>
          <Text className="text-white/40 text-[10px] font-mono uppercase tracking-widest leading-5">
            {item.desc}
          </Text>
        </Animated.View>
      ))}
    </View>

    {/* Social Links */}
    <View className="flex-row items-center justify-center gap-8 mt-20 opacity-40">
      <Youtube color="#FFFFFF" size={24} />
      <Twitter color="#FFFFFF" size={24} />
      <Github color="#FFFFFF" size={24} />
    </View>

    {/* Build Revision Tag */}
    <View className="items-center mt-12 md:items-start opacity-20">
      <Text className="text-white text-[9px] font-black uppercase tracking-[3px]">
        TRANSCRIBER-PRO v1.0.0 | CLAUDE ENGINE
      </Text>
    </View>
  </View>
));
MarketingContent.displayName = 'MarketingContent';

/* ══════════════════════════════════════════════════════════════════════════════
 * STYLESHEET — Static layout dimensions
 * ══════════════════════════════════════════════════════════════════════════════ */
const styles = StyleSheet.create({
  desktopContainer: { flexDirection: 'row', flex: 1 },
  desktopSidebar: {
    width: '40%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.05)',
    zIndex: 10,
    backgroundColor: 'rgba(2, 6, 23, 0.4)',
  },
  desktopScroll: { flex: 1 },
  desktopScrollContent: { padding: 80, paddingBottom: 150 },
  mobileScroll: { flex: 1 },
  mobileScrollContent: { flexGrow: 1, paddingBottom: 100 },
  mobilePane: { padding: 24, paddingTop: 40 },
  brandHeader: { alignItems: 'center', marginBottom: 32 },
  brandIcon: { width: 100, height: 100 },
});
