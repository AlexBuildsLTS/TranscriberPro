/**
 * app/(auth)/_layout.tsx
 * Handles the visual presentation of unauthenticated routes.
 * CRITICAL FIX: Removed duplicate navigation logic to prevent Router race conditions.
 * Navigation is now strictly handled by the root app/_layout.tsx.
 */

import { Stack } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { useAuthStore } from '../../store/useAuthStore';

const AuthLayout = () => {
  const { isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#01193da9] items-center justify-center">
        <View className="w-12 h-12 border-4 border-[#00F0FF]/20 border-t-[#00F0FF] rounded-full animate-spin" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#010b22]">
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="sign-in" />
      </Stack>
    </View>
  );
};

export default AuthLayout;
