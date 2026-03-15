import { Stack } from 'expo-router';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
        animation: 'slide_from_right', // Smooth drill-down animation
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="security" />
    </Stack>
  );
}
