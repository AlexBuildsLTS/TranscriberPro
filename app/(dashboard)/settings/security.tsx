import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { GlassCard } from '../../../components/ui/GlassCard';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { FadeIn } from '../../../components/animations/FadeIn';
import { supabase } from '../../../lib/supabase/client';

export default function SecuritySettingsScreen() {
  const router = useRouter();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(true);

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      Alert.alert(
        'Protocol Error',
        'Password must be at least 8 characters long.',
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Protocol Error', 'Password confirmation does not match.');
      return;
    }

    setIsSaving(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setIsSaving(false);

    if (error) {
      Alert.alert('Update Failed', error.message);
    } else {
      Alert.alert('Success', 'Security credentials updated successfully.');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 150 }}>
      {/* Navigation Header */}
      <TouchableOpacity onPress={() => router.back()} className="mb-8">
        <Text className="text-neon-pink font-bold text-xs uppercase tracking-widest">
          ‹ Back to Parameters
        </Text>
      </TouchableOpacity>

      <FadeIn>
        <View className="mb-12">
          <Text className="text-neon-pink font-black text-[10px] tracking-[8px] uppercase mb-2">
            Module_Beta
          </Text>
          <Text className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase leading-[45px]">
            Security <Text className="text-neon-pink">Protocols</Text>
          </Text>
        </View>
      </FadeIn>

      <FadeIn delay={200}>
        <GlassCard glowColor="pink" className="p-8 bg-white/[0.02] mb-8">
          <View className="mb-6">
            <Text className="text-white font-bold uppercase tracking-widest mb-1">
              Credential Override
            </Text>
            <Text className="text-white/40 text-[10px] font-mono uppercase">
              Update your cryptographic keys
            </Text>
          </View>

          <View className="gap-y-4">
            <Input
              label="NEW PASSWORD"
              placeholder="••••••••"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />

            <Input
              label="CONFIRM PASSWORD"
              placeholder="••••••••"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            <Button
              title={isSaving ? 'ENCRYPTING...' : 'UPDATE CREDENTIALS'}
              onPress={handleUpdatePassword}
              isLoading={isSaving}
              variant="primary"
              className="mt-4 bg-neon-pink shadow-lg shadow-neon-pink/20 py-5"
            />
          </View>
        </GlassCard>
      </FadeIn>

      <FadeIn delay={300}>
        <GlassCard glowColor="pink" className="p-8 bg-white/[0.02]">
          <View className="flex-row justify-between items-center">
            <View className="flex-1 pr-4">
              <Text className="text-white font-bold uppercase tracking-widest mb-1">
                Hardware Biometrics
              </Text>
              <Text className="text-white/40 text-[10px] font-mono uppercase leading-4">
                Require FaceID / TouchID to access the neural vault
              </Text>
            </View>

            {/* Custom Toggle Switch */}
            <TouchableOpacity
              onPress={() => setBiometricsEnabled(!biometricsEnabled)}
              className={`w-14 h-8 rounded-full justify-center px-1 transition-colors ${biometricsEnabled ? 'bg-neon-pink/20 border border-neon-pink/50' : 'bg-white/5 border border-white/10'}`}
            >
              <View
                className={`w-6 h-6 rounded-full transition-transform ${biometricsEnabled ? 'bg-neon-pink translate-x-6 shadow-[0_0_10px_#FF007F]' : 'bg-white/30'}`}
              />
            </TouchableOpacity>
          </View>
        </GlassCard>
      </FadeIn>
    </ScrollView>
  );
}
