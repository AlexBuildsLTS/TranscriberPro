import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
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
  interpolate,
  withDelay,
} from 'react-native-reanimated';

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

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { width } = Dimensions.get('window');
  const isMobile = width < 768;

  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();
      if (data) {
        setFullName(data.full_name || '');
        setAvatarUrl(data.avatar_url || '');
      }
      setIsLoading(false);
    }
    loadProfile();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);

    const updates = {
      id: user.id,
      full_name: fullName,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('profiles').upsert(updates);
    setIsSaving(false);

    if (error) {
      Alert.alert('Sync Failed', error.message);
    } else {
      await supabase.auth.updateUser({
        data: { full_name: fullName, avatar_url: avatarUrl },
      });
      Alert.alert('Success', 'Identity configuration updated.');
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-[#020205] items-center justify-center">
        <View className="absolute inset-0 overflow-hidden">
          <NeuralOrb delay={0} color="#00F0FF" />
          <NeuralOrb delay={2500} color="#8A2BE2" />
        </View>
        <ActivityIndicator color="#00F0FF" size="large" />
        <Text className="text-neon-cyan font-bold text-[10px] tracking-[6px] uppercase mt-4">
          Loading...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#020205]">
      {/* AMBIENT BACKGROUND */}
      <View className="absolute inset-0 overflow-hidden" pointerEvents="none">
        <NeuralOrb delay={0} color="#00F0FF" />
        <NeuralOrb delay={2500} color="#8A2BE2" />
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: isMobile ? 20 : 60,
          paddingTop: isMobile ? 60 : 60,
          paddingBottom: 150,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Navigation Header */}
        <TouchableOpacity onPress={() => router.back()} className="mb-8">
          <Text className="text-xs font-bold tracking-widest uppercase text-neon-cyan">
            ‹ Back to Parameters
          </Text>
        </TouchableOpacity>

        <FadeIn>
          <View className="mb-12">
            <Text className="text-neon-cyan font-black text-[10px] tracking-[8px] uppercase mb-2">
              Module_Alpha
            </Text>
            <Text className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase leading-[45px]">
              Identity <Text className="text-neon-cyan">Config</Text>
            </Text>
            <View className="h-[2px] w-16 bg-neon-cyan mt-4 rounded-full shadow-[0_0_20px_#00F0FF]" />
          </View>
        </FadeIn>

        <FadeIn delay={200}>
          <GlassCard glowColor="cyan" className="p-8 bg-white/[0.02]">
            {/* Avatar Preview */}
            <View className="items-center mb-8">
              <View className="w-24 h-24 rounded-full border-2 border-neon-cyan/30 bg-black/50 items-center justify-center overflow-hidden mb-4 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <Text className="font-mono text-2xl font-black text-neon-cyan">
                    {fullName
                      ? fullName.charAt(0).toUpperCase()
                      : user?.email?.charAt(0).toUpperCase() || 'U'}
                  </Text>
                )}
              </View>
              <Text className="text-white/40 text-[10px] font-mono uppercase tracking-widest">
                Avatar Display Node
              </Text>
              {user?.email && (
                <Text className="text-white/25 text-[9px] font-mono mt-1">
                  {user.email}
                </Text>
              )}
            </View>

            <View className="gap-y-6">
              <Input
                label="OPERATIVE NAME"
                placeholder="Enter full designation"
                value={fullName}
                onChangeText={setFullName}
              />

              <Input
                label="AVATAR IMAGE URL (OPTIONAL)"
                placeholder="https://domain.com/avatar.png"
                value={avatarUrl}
                onChangeText={setAvatarUrl}
                autoCapitalize="none"
              />

              <Button
                title={isSaving ? 'SYNCING...' : 'UPDATE IDENTITY'}
                onPress={handleSaveProfile}
                isLoading={isSaving}
                variant="primary"
                className="py-5 mt-4 shadow-lg shadow-neon-cyan/20"
              />
            </View>
          </GlassCard>
        </FadeIn>
      </ScrollView>
    </SafeAreaView>
  );
}
