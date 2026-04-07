/**
 * store/useAuthStore.ts
 * Sovereign NorthOS - Enterprise Authentication State Manager (Production Ready)
 */

import { create } from 'zustand';
import { supabase } from '../lib/supabase/client';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { Database } from '../types/database/database.types';
import { Platform } from 'react-native';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;

  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  initialize: () => () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  error: null,

  signInWithPassword: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      set({ session: data.session, user: data.user });
      await get().refreshProfile();

      return { error: null };
    } catch (err: unknown) {
      const authError = err as AuthError;
      const msg = authError?.message || 'Invalid credentials.';
      set({ error: msg, isLoading: false });
      return { error: msg };
    }
  },

  signUp: async (email: string, password: string, fullName: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: Platform.OS === 'web' ? window.location.origin : undefined
        },
      });

      if (error) throw error;

      if (data.session) {
        set({ session: data.session, user: data.user });
        await get().refreshProfile();
      }

      return { error: null };
    } catch (err: unknown) {
      const authError = err as AuthError;
      const msg = authError?.message || 'Registration failed.';
      set({ error: msg, isLoading: false });
      return { error: msg };
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, profile: null, error: null, isLoading: false });
  },

  refreshProfile: async () => {
    const { session } = get();
    const userId = session?.user?.id;

    if (!userId) {
      set({ profile: null });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        // FIXED: Only log in development
        if (__DEV__) console.error(`[Auth Kernel] Sync Error: ${error.message}`);

        if (error.message.includes('recursion')) {
          set({ error: 'Database Security Policy Loop. Check RLS.' });
        }
        return;
      }

      if (data) {
        set({ profile: data as Profile, error: null });
      }
    } catch (err: unknown) {
      const dbError = err as Error;
      // FIXED: Only log in development
      if (__DEV__) console.error('[Auth Kernel] Critical Store Crash:', dbError.message);
      set({ profile: null });
    }
  },

  initialize: () => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ session, user: session?.user ?? null });

      if (session?.user) {
        get().refreshProfile().finally(() => set({ isLoading: false }));
      } else {
        set({ isLoading: false });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // FIXED: Silent in production, visible in development
      if (__DEV__) console.log(`[Auth Kernel] Event: ${event}`);

      set({ session, user: session?.user ?? null });

      if (session?.user) {
        get().refreshProfile();
      } else {
        set({ profile: null, isLoading: false });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  },
}));