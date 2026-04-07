/**
 * app/(dashboard)/admin/_layout.tsx
 * Sovereign NorthOS - Admin Route Guard
 */
import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { View, ActivityIndicator, Text } from 'react-native';
import { useAuthStore } from '../../../store/useAuthStore';
import { ShieldAlert } from 'lucide-react-native';

export default function AdminLayout() {
  const { profile, isLoading } = useAuthStore();

  // If Zustand is still loading the initial session, show a secure loader
  if (isLoading) {
    return (
      <View className="flex-1 bg-[#01111f] items-center justify-center">
        <ShieldAlert size={32} color="#00F0FF" className="mb-4 opacity-50" />
        <ActivityIndicator size="small" color="#00F0FF" />
        <Text className="text-[10px] text-[#00F0FF] mt-4 font-black tracking-[4px] uppercase opacity-70">
          Verifying Clearance
        </Text>
      </View>
    );
  }

  // STRICT ACCESS CONTROL: Read directly from Zustand store
  const isAdmin = profile?.role === 'admin';

  if (!isAdmin) {
    // Silently redirect unauthorized users to the main dashboard
    return <Redirect href="/(dashboard)" />;
  }

  // If verified, render the admin screens
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#01111f' },
        animation: 'fade',
      }}
    />
  );
}
