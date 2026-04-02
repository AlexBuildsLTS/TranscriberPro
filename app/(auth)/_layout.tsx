/**
 * app/(auth)/_layout.tsx
 * ══════════════════════════════════════════════════════════════════════════════
 * Auth routing layer.
 * Transparent content style to maintain global UI fidelity.
 */
import { Stack } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

export default function AuthLayout() {
  return (
    <View className="flex-1 bg-background">
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" />
      </Stack>
    </View>
  );
}
