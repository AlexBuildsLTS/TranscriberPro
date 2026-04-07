/**
 * app/_layout.tsx
 * ══════════════════════════════════════════════════════════════════════════════
 * Root routing topology and global provider wrapper.
 * Enforces the NeonDarkTheme across the React Navigation layer to prevent
 * white flashes during nested navigator transitions.
 */
import 'react-native-gesture-handler';
import '../global.css';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../store/useAuthStore';
import { View, ActivityIndicator } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'nativewind';
import { ThemeProvider, DarkTheme } from '@react-navigation/native';

const NeonDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#020205',
    card: '#05050A',
    border: 'rgba(255, 255, 255, 0.1)',
    text: '#FFFFFF',
  },
};

export default function RootLayout() {
  const { setColorScheme } = useColorScheme();
  
  // 1. Pull session directly from the store instead of making a new listener
  const { initialize, isLoading, session } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  // 2. Safely scope the QueryClient to the component lifecycle
  const [queryClient] = useState(() => new QueryClient());

  useEffect(() => {
    setColorScheme('dark');
  }, [setColorScheme]);

  useEffect(() => {
    // 3. CORRECTLY capture and return the cleanup function to prevent memory leaks
    const cleanup = initialize();
    return cleanup;
  }, [initialize]);

  // 4. Clean routing logic based purely on Zustand state
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (session && inAuthGroup) {
      router.replace('/(dashboard)');
    } else if (!session && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    }
  }, [session, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-[#020205] items-center justify-center">
        <ActivityIndicator size="large" color="#00F0FF" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={NeonDarkTheme}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#020205' },
          }}
        >
          <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
          <Stack.Screen name="(dashboard)" options={{ animation: 'fade' }} />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}