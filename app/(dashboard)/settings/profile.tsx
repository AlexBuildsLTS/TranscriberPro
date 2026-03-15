import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { GlassCard } from '../../../components/ui/GlassCard';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { FadeIn } from '../../../components/animations/FadeIn';
import { useAuthStore } from '../../../store/useAuthStore';
import { supabase } from '../../../lib/supabase/client';

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch the current profile data from Supabase
  useEffect(() => {
    async function loadProfile() {
      if (!user) return;

      const { data, error } = await supabase
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
      // Update local auth metadata to keep everything in sync
      await supabase.auth.updateUser({
        data: { full_name: fullName, avatar_url: avatarUrl },
      });
      Alert.alert('Success', 'Identity Configuration updated.');
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color="#00F0FF" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 150 }}>
      {/* Navigation Header */}
      <TouchableOpacity onPress={() => router.back()} className="mb-8">
        <Text className="text-neon-cyan font-bold text-xs uppercase tracking-widest">
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
        </View>
      </FadeIn>

      <FadeIn delay={200}>
        <GlassCard glowColor="cyan" className="p-8 bg-white/[0.02]">
          {/* Avatar Preview & URL Input */}
          <View className="mb-8 items-center">
            <View className="w-24 h-24 rounded-full border-2 border-neon-cyan/30 bg-black/50 items-center justify-center overflow-hidden mb-4 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <Text className="text-neon-cyan font-mono text-2xl">
                  {fullName ? fullName.charAt(0).toUpperCase() : 'U'}
                </Text>
              )}
            </View>
            <Text className="text-white/40 text-[10px] font-mono uppercase tracking-widest">
              Avatar Display Node
            </Text>
          </View>

          <View className="gap-y-6">
            <Input
              label="OPERATIVE NAME"
              placeholder="Enter full designation"
              value={fullName}
              onChangeText={setFullName}
            />

            <Input
              label="AVATAR IMAGE URL"
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
              className="mt-4 shadow-lg shadow-neon-cyan/20 py-5"
            />
          </View>
        </GlassCard>
      </FadeIn>
    </ScrollView>
  );
}
