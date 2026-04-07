/**
 * FILE: app/(dashboard)/settings/profile.tsx
 * MODULE: User Profile Management (NorthOS)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Dimensions,
  Image,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowBigLeftDash,
  User,
  Mail,
  Sparkles,
  Shield,
  Fingerprint,
  Globe,
  Pencil,
  RotateCcw,
} from 'lucide-react-native';

import { GlassCard } from '../../../components/ui/GlassCard';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { FadeIn } from '../../../components/animations/FadeIn';
import { useAuthStore } from '../../../store/useAuthStore';
import { supabase } from '../../../lib/supabase/client';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  interpolate,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

// 1. THIS IS THE BADGE COLOR HELPER
const getRoleConfig = (role?: string) => {
  switch (role?.toLowerCase()) {
    case 'admin':
      return {
        label: 'ADMIN',
        bg: 'rgba(255, 51, 102, 0.15)',
        text: '#FF3366',
        border: 'rgba(255, 51, 102, 0.3)',
      };
    case 'premium':
      return {
        label: 'PREMIUM',
        bg: 'rgba(255, 170, 0, 0.15)',
        text: '#FFD700',
        border: 'rgba(255, 170, 0, 0.3)',
      };
    default:
      return {
        label: 'MEMBER',
        bg: 'rgba(0, 240, 255, 0.15)',
        text: '#00F0FF',
        border: 'rgba(0, 240, 255, 0.3)',
      };
  }
};

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

const StatPill = ({
  icon: Icon,
  label,
  value,
  color = '#00F0FF',
}: {
  icon: any;
  label: string;
  value: string;
  color?: string;
}) => (
  <View
    className="items-center flex-1 p-4 border rounded-2xl border-white/10"
    style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
  >
    <Icon size={16} color={color} />
    <Text className="text-[8px] font-black uppercase tracking-[2px] text-white/30 mt-2">
      {label}
    </Text>
    <Text
      className="text-[10px] font-bold text-white/80 mt-1"
      numberOfLines={1}
    >
      {value}
    </Text>
  </View>
);

export default function ProfileSettingsScreen() {
  const router = useRouter();

  // 2. WE PULL THE PROFILE HERE TO CHECK THE ROLE
  const { user, profile } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [memberSince, setMemberSince] = useState('');

  // 3. WE SET UP THE BADGE DATA FOR THE UI
  const userRole = profile?.role || 'member';
  const roleConfig = getRoleConfig(userRole);

  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0.3);

  const pulseRing = useCallback(() => {
    ringScale.value = withSequence(withSpring(1.15), withSpring(1));
    ringOpacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(0.3, { duration: 600 }),
    );
  }, []);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', user.id)
          .single();
        if (error) throw error;
        if (data) {
          setFullName(data.full_name ?? '');
          setAvatarUrl(data.avatar_url ?? '');
        }
        if (user.created_at) {
          setMemberSince(
            new Date(user.created_at).toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric',
            }),
          );
        }
      } catch (err) {
        console.error('Profile sync error:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadProfile();
  }, [user]);

  const handlePickImage = useCallback(async () => {
    if (Platform.OS !== 'web') {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Error', 'Gallery access is required.');
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.length) return;
    performAvatarSync(result.assets[0]);
  }, [user]);

  const performAvatarSync = async (asset: ImagePicker.ImagePickerAsset) => {
    setIsUploading(true);
    pulseRing();
    try {
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const fileName = `${user!.id}/avatar_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob, { contentType: `image/${ext}`, upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);
      setAvatarUrl(urlData.publicUrl);

      await supabase
        .from('profiles')
        .update({
          avatar_url: urlData.publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user!.id);
      await supabase.auth.updateUser({
        data: { avatar_url: urlData.publicUrl },
      });
      pulseRing();
    } catch (err: any) {
      Alert.alert(
        'Upload Interrupted',
        err.message || 'Storage node unreachable.',
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProfile = useCallback(async () => {
    if (!user || !fullName.trim()) {
      Alert.alert('Input Required', 'Operative designation cannot be blank.');
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      if (error) throw error;
      await supabase.auth.updateUser({ data: { full_name: fullName.trim() } });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      Alert.alert('Cloud Sync Error', err.message);
    } finally {
      setIsSaving(false);
    }
  }, [user, fullName]);

  // 4. SAFE RETURN HANDLER - Fallback to /settings
  const handleReturn = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/settings'); // Directly to the settings index
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#020205] items-center justify-center">
        <ActivityIndicator color="#00F0FF" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#020205]">
      <View className="absolute inset-0 overflow-hidden" pointerEvents="none">
        <NeuralOrb delay={0} color="#00F0FF" />
        <NeuralOrb delay={4000} color="#FF007F" />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 150 }}
        >
          <View className="w-full max-w-2xl px-6 pt-12 mx-auto">
            {/* THIS IS THE WEB-VISIBLE BACK ARROW */}
            <TouchableOpacity
              onPress={handleReturn}
              className="flex-row items-center mb-12 gap-x-3"
              activeOpacity={0.7}
            >
              <ArrowBigLeftDash size={24} color="#00F0FF" />
              <Text className="text-[11px] font-black tracking-[4px] text-neon-cyan uppercase">
                RETURN
              </Text>
            </TouchableOpacity>

            <FadeIn>
              {/* 5. THIS IS WHERE THE BADGE RENDERS ON THE SCREEN */}
              <View className="flex-row items-center justify-between mb-12">
                <View>
                  <Text className="text-5xl font-black leading-none tracking-tighter text-white uppercase md:text-6xl">
                    <Text className="text-neon-cyan">PROFILE</Text>
                  </Text>
                  <View className="h-1 w-24 bg-neon-cyan mt-6 rounded-full shadow-[0_0_15px_#00F0FF]" />
                </View>

                {/* DYNAMIC ROLE BADGE */}
                <View
                  style={{
                    backgroundColor: roleConfig.bg,
                    borderColor: roleConfig.border,
                    borderWidth: 1,
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 8,
                  }}
                >
                  <Text
                    style={{
                      color: roleConfig.text,
                      fontSize: 10,
                      fontWeight: '900',
                      letterSpacing: 2,
                    }}
                  >
                    {roleConfig.label}
                  </Text>
                </View>
              </View>
            </FadeIn>

            <FadeIn delay={100}>
              <GlassCard className="items-center p-10 mb-8 border-white/5">
                <View className="relative mb-8">
                  <Animated.View
                    style={[
                      ringStyle,
                      {
                        position: 'absolute',
                        inset: -8,
                        borderRadius: 999,
                        borderWidth: 2,
                        borderColor: '#00F0FF',
                      },
                    ]}
                  />

                  <View
                    className="items-center justify-center overflow-hidden border-2 rounded-full bg-black/80 border-neon-cyan/40"
                    style={{ width: 144, height: 144 }}
                  >
                    {isUploading ? (
                      <ActivityIndicator color="#00F0FF" />
                    ) : avatarUrl ? (
                      <Image
                        source={{ uri: avatarUrl }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    ) : (
                      <User size={56} color="#00F0FF" />
                    )}
                  </View>

                  <TouchableOpacity
                    onPress={handlePickImage}
                    className="absolute bottom-1 right-1 w-11 h-11 rounded-full bg-neon-cyan items-center justify-center border-4 border-[#020205] shadow-lg shadow-neon-cyan/50"
                  >
                    <Pencil size={18} color="#020205" />
                  </TouchableOpacity>
                </View>

                <View className="flex-row w-full gap-x-4">
                  <TouchableOpacity
                    onPress={handlePickImage}
                    disabled={isUploading}
                    className="items-center flex-1 py-4 border bg-white/5 border-white/10 rounded-2xl"
                  >
                    <Text className="text-white/60 text-[10px] font-black uppercase tracking-[3px]">
                      {isUploading ? 'Transferring...' : 'AVATAR'}
                    </Text>
                  </TouchableOpacity>

                  {avatarUrl && (
                    <TouchableOpacity
                      onPress={() => setAvatarUrl('')}
                      className="items-center justify-center w-16 border bg-neon-pink/10 border-neon-pink/20 rounded-2xl"
                    >
                      <RotateCcw size={20} color="#FF007F" />
                    </TouchableOpacity>
                  )}
                </View>
              </GlassCard>
            </FadeIn>

            <FadeIn delay={200}>
              <GlassCard className="p-8 mb-8 border-white/5">
                <View className="gap-y-10">
                  <View>
                    <View className="flex-row items-center mb-4 ml-1">
                      <User size={14} color="#00F0FF" />
                      <Text className="text-neon-cyan font-black text-[10px] tracking-[4px] uppercase ml-3">
                        USERNAME
                      </Text>
                    </View>
                    <View className="h-16 px-2 py-1 border justify-left bg-black/60 border-white/15 rounded-2xl">
                      <Input
                        value={fullName}
                        onChangeText={setFullName}
                        placeholder="User Name"
                        className="text-lg font-bold text-white bg-transparent border-1"
                        placeholderTextColor="rgba(255,255,255,0.15)"
                      />
                    </View>
                  </View>

                  <View>
                    <View className="flex-row items-center mb-4 ml-1">
                      <Mail size={14} color="rgba(255,255,255,0.3)" />
                      <Text className="text-white/30 font-black text-[10px] tracking-[4px] uppercase ml-3">
                        System Email
                      </Text>
                    </View>
                    <View className="flex-row items-center justify-between h-16 px-6 border shadow-inner opacity-50 bg-white/5 border-white/5 rounded-2xl">
                      <Text className="font-mono text-sm tracking-tight text-white/40">
                        {user?.email}
                      </Text>
                      <Shield size={14} color="rgba(255,255,255,0.1)" />
                    </View>
                  </View>
                </View>

                <Button
                  title={
                    isSaving
                      ? 'SYNCING...'
                      : saved
                        ? 'IDENTITY UPDATED'
                        : 'SAVE CHANGES'
                  }
                  onPress={handleSaveProfile}
                  variant={saved ? 'secondary' : 'primary'}
                  className="py-5 mt-12 shadow-2xl"
                  isLoading={isSaving}
                />
              </GlassCard>
            </FadeIn>

            <FadeIn delay={300}>
              <View className="flex-row gap-x-4">
                <StatPill
                  icon={Fingerprint}
                  label="Provider"
                  value={
                    user?.app_metadata?.provider?.toUpperCase() || 'EXTERNAL'
                  }
                  color="#8A2BE2"
                />
                <StatPill
                  icon={Globe}
                  label="Network"
                  value="Production-V1"
                  color="#00F0FF"
                />
                <StatPill
                  icon={Sparkles}
                  label="Access Date"
                  value={memberSince}
                  color="#FF007F"
                />
              </View>
            </FadeIn>

            <View className="items-center mt-20 opacity-30">
              <View className="h-[1px] w-12 bg-white/20 mb-4" />
              <Text className="text-[9px] font-mono tracking-[6px] text-white uppercase">
                NorthOS Digital Identity Module
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
