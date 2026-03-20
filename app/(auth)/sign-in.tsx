/**
 * sign-in.tsx — Unified Authentication Screen
 * Dual-mode: Sign In / Create Account.
 * Integrates with Supabase Auth via useAuthStore (Zustand).
 * Features Glassmorphism cards and interactive social links.
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
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/useAuthStore';
import {
  Mail,
  Lock,
  User,
  AtSign,
  Eye,
  EyeOff,
  CheckCircle2,
  Circle,
  Shield,
  Zap,
  Brain,
  Globe,
  Github,
  Twitter,
  Youtube,
  ChevronRight,
} from 'lucide-react-native';
import Animated, {
  FadeInDown,
  FadeInRight,
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
type AuthMode = 'sign-in' | 'sign-up';

/* ── Bento Feature Cards ───────────────────────────────────────────────────── */
type BentoItem = { icon: any; title: string; desc: string; color: string };

const BENTO_ITEMS: BentoItem[] = [
  {
    icon: Zap,
    title: 'Lightning Engine',
    desc: 'Process massive media payloads with sub-second latency.',
    color: '#00F0FF', // Cyan
  },
  {
    icon: Brain,
    title: 'Neural Analysis',
    desc: 'Semantic extraction via Anthropic Claude models.',
    color: '#8A2BE2', // Purple
  },
  {
    icon: Globe,
    title: 'Global Nodes',
    desc: 'Access your transcripts from any authenticated endpoint.',
    color: '#00F0FF', // Cyan
  },
];

/* ── Ambient Background Orb ────────────────────────────────────────────────── */
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

/* ── Password Strength Calculator ──────────────────────────────────────────── */
const getPasswordStrength = (password: string) => {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: 'WEAK', color: '#FF007F' };
  if (score <= 2) return { score, label: 'FAIR', color: '#FF4500' };
  if (score <= 3) return { score, label: 'GOOD', color: '#00F0FF' };
  return { score, label: 'STRONG', color: '#32FF00' };
};

/* ══════════════════════════════════════════════════════════════════════════════
 * MAIN SCREEN — SignInScreen
 * ══════════════════════════════════════════════════════════════════════════════ */
export default function SignInScreen() {
  const { signInWithPassword, signUp } = useAuthStore();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  /* ── Form State ──────────────────────────────────────────────────────────── */
  const [authMode, setAuthMode] = useState<AuthMode>('sign-in');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);

  /* ── Unified Action Handler ──────────────────────────────────────────────── */
  const handleAction = useCallback(async () => {
    setMessage(null);
    const trimmedEmail = email.trim();

    // Common Validation
    if (!AuthValidator.isValidEmail(trimmedEmail)) {
      return setMessage({
        type: 'error',
        text: 'Valid email address required.',
      });
    }

    setLoading(true);

    if (authMode === 'sign-in') {
      // Sign In Logic
      const { error } = await signInWithPassword(trimmedEmail, password);
      if (error) {
        setMessage({ type: 'error', text: error });
      } else {
        router.replace('/(dashboard)');
      }
    } else {
      // Sign Up Logic
      if (!fullName.trim())
        return (
          setMessage({ type: 'error', text: 'Full name is required.' }),
          setLoading(false)
        );
      if (password.length < 8)
        return (
          setMessage({
            type: 'error',
            text: 'Password must be at least 8 characters.',
          }),
          setLoading(false)
        );
      if (password !== confirmPassword)
        return (
          setMessage({ type: 'error', text: 'Passwords do not match.' }),
          setLoading(false)
        );
      if (!agreedToTerms)
        return (
          setMessage({
            type: 'error',
            text: 'You must accept the Terms of Service.',
          }),
          setLoading(false)
        );

      const { error } = await signUp(trimmedEmail, password, fullName.trim());
      if (error) {
        setMessage({ type: 'error', text: error });
      } else {
        setMessage({
          type: 'success',
          text: 'Account created. Check your email to verify.',
        });
        setAuthMode('sign-in'); // Switch back to sign in mode after successful registration
      }
    }
    setLoading(false);
  }, [
    authMode,
    fullName,
    email,
    password,
    confirmPassword,
    agreedToTerms,
    signInWithPassword,
    signUp,
    router,
  ]);

  /* ── Render ──────────────────────────────────────────────────────────────── */
  return (
    <View className="flex-1 bg-[#020205]">
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
            <View style={styles.desktopContainer}>
              <View style={styles.desktopSidebar}>
                <ScrollView
                  style={{ flex: 1, width: '100%' }}
                  contentContainerStyle={{
                    maxWidth: 440,
                    alignSelf: 'center',
                    paddingVertical: 40,
                  }}
                  showsVerticalScrollIndicator={false}
                >
                  <BrandHeader authMode={authMode} />
                  <AuthForm
                    authMode={authMode}
                    setAuthMode={setAuthMode}
                    fullName={fullName}
                    setFullName={setFullName}
                    username={username}
                    setUsername={setUsername}
                    email={email}
                    setEmail={setEmail}
                    password={password}
                    setPassword={setPassword}
                    confirmPassword={confirmPassword}
                    setConfirmPassword={setConfirmPassword}
                    agreedToTerms={agreedToTerms}
                    setAgreedToTerms={setAgreedToTerms}
                    loading={loading}
                    onAction={handleAction}
                    message={message}
                  />
                  <SecurityFooter />
                </ScrollView>
              </View>
              <ScrollView
                style={styles.desktopScroll}
                contentContainerStyle={styles.desktopScrollContent}
              >
                <MarketingContent isDesktop={true} />
              </ScrollView>
            </View>
          ) : (
            <ScrollView
              style={styles.mobileScroll}
              contentContainerStyle={styles.mobileScrollContent}
            >
              <View style={styles.mobilePane}>
                <BrandHeader authMode={authMode} />
                <AuthForm
                  authMode={authMode}
                  setAuthMode={setAuthMode}
                  fullName={fullName}
                  setFullName={setFullName}
                  username={username}
                  setUsername={setUsername}
                  email={email}
                  setEmail={setEmail}
                  password={password}
                  setPassword={setPassword}
                  confirmPassword={confirmPassword}
                  setConfirmPassword={setConfirmPassword}
                  agreedToTerms={agreedToTerms}
                  setAgreedToTerms={setAgreedToTerms}
                  loading={loading}
                  onAction={handleAction}
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

const BrandHeader = memo(({ authMode }: { authMode: AuthMode }) => (
  <Animated.View
    entering={FadeInDown.duration(1000).springify()}
    style={styles.brandHeader}
  >
    <Image source={APP_ICON} style={styles.brandIcon} resizeMode="contain" />
    <Text className="text-white/40 font-mono text-[10px] uppercase tracking-[3px] mt-4 text-center">
      {authMode === 'sign-in'
        ? 'Secure Authenticator Node'
        : 'CREATE ACCOUNT'}
    </Text>
  </Animated.View>
));
BrandHeader.displayName = 'BrandHeader';

const FormField = ({ label, icon: Icon, children }: any) => (
  <View>
    <Text className="text-neon-cyan font-black text-[10px] tracking-widest uppercase mb-2 ml-1">
      {label}
    </Text>
    <View className="bg-white/[0.02] border border-white/10 rounded-2xl h-14 flex-row items-center px-4">
      <Icon size={18} color="#A1A1AA" />
      {children}
    </View>
  </View>
);

const AuthForm = memo(
  ({
    authMode,
    setAuthMode,
    fullName,
    setFullName,
    username,
    setUsername,
    email,
    setEmail,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    agreedToTerms,
    setAgreedToTerms,
    loading,
    onAction,
    message,
  }: any) => {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const isSignUp = authMode === 'sign-up';
    const strength = getPasswordStrength(password);
    const passwordsMatch =
      confirmPassword.length > 0 && password === confirmPassword;

    return (
      <View className="p-8 border neural-glass rounded-3xl border-white/5 bg-black/40">
        <View style={{ gap: 20 }}>
          {/* Auth Toggle */}
          <View className="flex-row bg-white/[0.03] border border-white/10 rounded-2xl p-1 mb-2">
            <TouchableOpacity
              onPress={() => setAuthMode('sign-in')}
              className={cn(
                'flex-1 py-3 rounded-xl items-center',
                !isSignUp
                  ? 'bg-neon-cyan/10 border border-neon-cyan/30'
                  : 'border border-transparent',
              )}
            >
              <Text
                className={cn(
                  'text-[10px] font-black uppercase tracking-widest',
                  !isSignUp ? 'text-neon-cyan' : 'text-white/30',
                )}
              >
                Sign In
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setAuthMode('sign-up')}
              className={cn(
                'flex-1 py-3 rounded-xl items-center',
                isSignUp
                  ? 'bg-neon-cyan/10 border border-neon-cyan/30'
                  : 'border border-transparent',
              )}
            >
              <Text
                className={cn(
                  'text-[10px] font-black uppercase tracking-widest',
                  isSignUp ? 'text-neon-cyan' : 'text-white/30',
                )}
              >
                Create Account
              </Text>
            </TouchableOpacity>
          </View>

          {isSignUp && (
            <Animated.View entering={FadeInDown.duration(300)}>
              <FormField label="Full Name" icon={User}>
                <TextInput
                  className="flex-1 h-full ml-3 text-sm font-medium text-white outline-none"
                  placeholder="John Doe"
                  placeholderTextColor="#475569"
                  value={fullName}
                  onChangeText={setFullName}
                  editable={!loading}
                />
              </FormField>
            </Animated.View>
          )}

          {isSignUp && (
            <Animated.View
              entering={FadeInDown.duration(400)}
              style={{ marginTop: -4 }}
            >
              <FormField label="Username" icon={AtSign}>
                <TextInput
                  className="flex-1 h-full ml-3 text-sm font-medium text-white outline-none"
                  placeholder="Username"
                  placeholderTextColor="#475569"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  editable={!loading}
                />
              </FormField>
            </Animated.View>
          )}

          <FormField label="Email" icon={Mail}>
            <TextInput
              className="flex-1 h-full ml-3 text-sm font-medium text-white outline-none"
              placeholder="commander@enterprise.com"
              placeholderTextColor="#475569"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
          </FormField>

          <View>
            <Text className="text-neon-cyan font-black text-[10px] tracking-widest uppercase mb-2 ml-1">
              PASSWORD
            </Text>
            <View className="bg-white/[0.02] border border-white/10 rounded-2xl h-14 flex-row items-center px-4">
              <Lock size={18} color="#A1A1AA" />
              <TextInput
                className="flex-1 h-full ml-3 text-sm font-medium text-white outline-none"
                placeholder="Min. 8 characters"
                placeholderTextColor="#475569"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {showPassword ? (
                  <EyeOff size={18} color="#A1A1AA" />
                ) : (
                  <Eye size={18} color="#A1A1AA" />
                )}
              </TouchableOpacity>
            </View>

            {isSignUp && password.length > 0 && (
              <View className="px-1 mt-3">
                <View className="flex-row h-1 gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <View
                      key={level}
                      style={{
                        flex: 1,
                        borderRadius: 99,
                        backgroundColor:
                          strength.score >= level
                            ? strength.color
                            : 'rgba(255,255,255,0.1)',
                      }}
                    />
                  ))}
                </View>
                <View className="flex-row items-center justify-between">
                  <Text className="text-white/20 text-[8px] font-mono uppercase tracking-widest">
                    8+ chars, uppercase, number, symbol
                  </Text>
                  <Text
                    style={{ color: strength.color }}
                    className="text-[8px] font-black uppercase tracking-widest"
                  >
                    {strength.label}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {isSignUp && (
            <Animated.View entering={FadeInDown.duration(500)}>
              <Text className="text-neon-cyan font-black text-[10px] tracking-widest uppercase mb-2 ml-1">
                Confirm Security Key
              </Text>
              <View
                className={cn(
                  'border rounded-2xl h-14 flex-row items-center px-4',
                  confirmPassword.length > 0 && !passwordsMatch
                    ? 'border-neon-pink/50'
                    : passwordsMatch
                      ? 'border-neon-lime/50'
                      : 'border-white/10',
                )}
                style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
              >
                <Shield size={18} color="#A1A1AA" />
                <TextInput
                  className="flex-1 h-full ml-3 text-sm font-medium text-white outline-none"
                  placeholder="Re-enter Password"
                  placeholderTextColor="#475569"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirm}
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirm(!showConfirm)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  {showConfirm ? (
                    <EyeOff size={18} color="#A1A1AA" />
                  ) : (
                    <Eye size={18} color="#A1A1AA" />
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {isSignUp && (
            <TouchableOpacity
              onPress={() => setAgreedToTerms(!agreedToTerms)}
              className="flex-row items-start gap-3 mt-2"
              activeOpacity={0.7}
            >
              {agreedToTerms ? (
                <CheckCircle2 size={20} color="#00F0FF" />
              ) : (
                <Circle size={20} color="rgba(255,255,255,0.2)" />
              )}
              <Text className="flex-1 text-white/40 text-[11px] leading-5">
                I agree to the{' '}
                <Text className="font-bold text-neon-cyan">
                  Terms of Service
                </Text>{' '}
                and{' '}
                <Text className="font-bold text-neon-cyan">Privacy Policy</Text>
              </Text>
            </TouchableOpacity>
          )}

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

          <Button
            onPress={onAction}
            isLoading={loading}
            title={
              loading
                ? 'PROCESSING...'
                : isSignUp
                  ? 'CREATE ACCOUNT'
                  : 'AUTHENTICATE'
            }
            className="py-4 mt-2 shadow-lg shadow-neon-cyan/20"
          />
        </View>
      </View>
    );
  },
);
AuthForm.displayName = 'AuthForm';

const SecurityFooter = memo(() => (
  <View className="flex-row items-center justify-center mt-10 opacity-40">
    <Text className="text-white/80 text-[9px] font-black tracking-[2px] uppercase">
      End-to-End Encrypted Session
    </Text>
  </View>
));
SecurityFooter.displayName = 'SecurityFooter';

/* ── Styled Glass Cards Matching the Settings UI provided ──────────────────── */
const MarketingContent = memo(({ isDesktop }: { isDesktop: boolean }) => {
  const openSocial = (url: string) =>
    Linking.openURL(url).catch((err) =>
      console.error('Error opening URL', err),
    );

  return (
    <View
      style={{
        width: '100%',
        paddingBottom: 60,
        paddingHorizontal: isDesktop ? 0 : 16,
      }}
    >
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
          Extract Any Videos Audio With The Latest AI
        </Text>
      </Animated.View>

      <View className="flex-col gap-5 mt-4">
        {BENTO_ITEMS.map((item, index) => (
          <Animated.View
            key={item.title}
            entering={FadeInRight.delay(200 + index * 100).springify()}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              className="p-6 rounded-3xl"
              style={{
                backgroundColor: 'rgba(5, 5, 10, 0.6)',
                borderColor: `rgba(${item.color === '#00F0FF' ? '0,240,255' : '138,43,226'}, 0.3)`,
                borderWidth: 1,
                shadowColor: item.color,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
              }}
            >
              <View className="flex-row items-center gap-4 mb-2">
                <View
                  className="items-center justify-center w-10 h-10 rounded-xl"
                  style={{ backgroundColor: `${item.color}15` }}
                >
                  <item.icon size={18} color={item.color} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-black tracking-wide text-white uppercase">
                    {item.title}
                  </Text>
                  <Text className="text-white/40 text-[10px] font-mono uppercase tracking-widest leading-4 mt-1">
                    {item.desc}
                  </Text>
                </View>
                <ChevronRight
                  size={16}
                  color={item.color}
                  className="opacity-70"
                />
              </View>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>

      <View className="flex-row items-center justify-center gap-10 mt-24 opacity-60">
        <TouchableOpacity
          onPress={() => openSocial('https://youtube.com')}
          className="p-2 hover:opacity-80"
        >
          <Youtube color="#FFFFFF" size={26} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => openSocial('https://twitter.com')}
          className="p-2 hover:opacity-80"
        >
          <Twitter color="#FFFFFF" size={26} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => openSocial('https://github.com')}
          className="p-2 hover:opacity-80"
        >
          <Github color="#FFFFFF" size={26} />
        </TouchableOpacity>
      </View>

      <View className="items-center mt-12 md:items-start opacity-20">
        <Text className="text-white text-[9px] font-black uppercase tracking-[3px]">
          TRANSCRIBER-PRO v1.0.0 | CLAUDE ENGINE
        </Text>
      </View>
    </View>
  );
});
MarketingContent.displayName = 'MarketingContent';

/* ══════════════════════════════════════════════════════════════════════════════
 * STYLESHEET
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
