import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * ============================================================================
 * 🔐 MODULE: SECURE STORAGE ADAPTER (CROSS-PLATFORM)
 * ============================================================================
 * Handles token persistence. Uses SecureStore on Native (Encrypted)
 * and localStorage on Web.
 * ============================================================================
 */

const isWeb = Platform.OS === 'web';
// Check if running in a browser environment or SSR
const isBrowser = typeof window !== 'undefined';

export const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (isWeb) {
      if (!isBrowser) return null; // Prevent SSR crash
      return localStorage.getItem(key);
    } else {
      // Native: Uses Expo SecureStore
      return await SecureStore.getItemAsync(key);
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    if (isWeb) {
      if (!isBrowser) return;
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },

  removeItem: async (key: string): Promise<void> => {
    if (isWeb) {
      if (!isBrowser) return;
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

export default ExpoSecureStoreAdapter;
