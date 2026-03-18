import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Platform,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { GlassCard } from '../../../components/ui/GlassCard';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { FadeIn } from '../../../components/animations/FadeIn';
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

export default function SecuritySettingsScreen() {
  const router = useRouter();
  const { width } = Dimensions.get('window');
  const isMobile = width < 768;

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(true);

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 8) {
      Alert.alert('Protocol Error', 'Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Protocol Error', 'Passwords do not match.');
      return;
    }
    setIsSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsSaving(false);
    if (error) {
      Alert.alert('Update Failed', error.message);
    } else {
      Alert.alert('Success', 'Security credentials updated.');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#020205]">
      <View className="absolute inset-0 overflow-hidden" pointerEvents="none">
        <NeuralOrb delay={0} color="#FF007F" />
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
        <TouchableOpacity onPress={() => router.back()} className="mb-8">
          <Text className="text-xs font-bold tracking-widest uppercase text-neon-pink">
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
            <View className="h-[2px] w-16 bg-neon-pink mt-4 rounded-full shadow-[0_0_20px_#FF007F]" />
          </View>
        </FadeIn>

        <FadeIn delay={200}>
          <GlassCard glowColor="pink" className="p-8 bg-white/[0.02] mb-6">
            <View className="mb-6">
              <Text className="mb-1 font-bold tracking-widest text-white uppercase">
                Credential Override
              </Text>
              <Text className="text-white/40 text-[10px] font-mono uppercase tracking-widest">
                Update your cryptographic access key
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
                className="py-5 mt-4"
              />
            </View>
          </GlassCard>
        </FadeIn>

        <FadeIn delay={300}>
          <GlassCard glowColor="pink" className="p-8 bg-white/[0.02]">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-4">
                <Text className="mb-1 font-bold tracking-widest text-white uppercase">
                  Hardware Biometrics
                </Text>
                <Text className="text-white/40 text-[10px] font-mono uppercase leading-4">
                  Require FaceID / TouchID to access the neural vault
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setBiometricsEnabled(!biometricsEnabled)}
                style={{
                  width: 56,
                  height: 32,
                  borderRadius: 16,
                  justifyContent: 'center',
                  paddingHorizontal: 4,
                  backgroundColor: biometricsEnabled
                    ? 'rgba(255,0,127,0.15)'
                    : 'rgba(255,255,255,0.05)',
                  borderWidth: 1,
                  borderColor: biometricsEnabled
                    ? 'rgba(255,0,127,0.5)'
                    : 'rgba(255,255,255,0.1)',
                }}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: biometricsEnabled
                      ? '#FF007F'
                      : 'rgba(255,255,255,0.3)',
                    transform: [{ translateX: biometricsEnabled ? 24 : 0 }],
                    shadowColor: biometricsEnabled ? '#FF007F' : 'transparent',
                    shadowOpacity: 1,
                    shadowRadius: 8,
                  }}
                />
              </TouchableOpacity>
            </View>
          </GlassCard>
        </FadeIn>
      </ScrollView>
    </SafeAreaView>
  );
}
