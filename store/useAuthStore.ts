/**
 * store/useAuthStore.ts
 * Enterprise Authentication State Manager
 */

import { create } from 'zustand';
import { supabase } from '../lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { Database } from '../types/database/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;

  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  isLoading: true,

  signInWithPassword: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      set({ session: data.session, user: data.user });
      await get().refreshProfile();
      return { error: null };
    } catch (err: any) {
      return { error: err?.message || 'Invalid credentials.' };
    }
  },

  signUp: async (email: string, password: string, fullName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: fullName } },
      });
      if (error) throw error;
      if (data.session) {
        set({ session: data.session, user: data.user });
        await get().refreshProfile();
      }
      return { error: null };
    } catch (err: any) {
      return { error: err?.message || 'Registration failed.' };
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, profile: null });
  },

  refreshProfile: async () => {
    const { session } = get();
    if (!session?.user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error) {
        // PGRST116 means "No rows returned". 
        // This is common if the DB trigger hasn't created the profile yet.
        if (error.code === 'PGRST116') {
          console.warn('[Auth] Profile not found for this user yet.');
          set({ profile: null });
          return;
        }
        throw error;
      }

      set({ profile: data });
    } catch (err: any) {
      // Properly extract the message from a Supabase PostgrestError object
      const errorMessage = err?.message || JSON.stringify(err);
      console.error('[Auth] Profile sync failed:', errorMessage);
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

    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null });
      if (session?.user) {
        get().refreshProfile();
      } else {
        set({ profile: null });
      }
    });
  },
}));