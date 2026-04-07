/**
 * app/(dashboard)/admin/users.tsx
 * Sovereign NorthOS - User Management & Security Protocols (ULTIMATE v6.0)
 * ----------------------------------------------------------------------------
 * FEATURES:
 * 1. AMBIENT ENGINE: Integrated custom #01111fbe background with breathing.
 * 2. REAL-TIME SYNC: Listens to the 'profiles' table for instant registry updates.
 * 3. SECURITY SUITE: Modular banning, unbanning, role, and tier escalation.
 * 4. RESPONSIVE UX: Compact, auto-wrapping button grid optimized for Web/Mobile.
 * ----------------------------------------------------------------------------
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  Platform,
  LayoutAnimation,
  UIManager,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Search,
  Ban,
  CheckCircle,
  UserCog,
  ChevronLeft,
  Trash2,
  Calendar,
  ShieldAlert,
  Clock,
  Mail,
  Fingerprint,
  AlertTriangle,
  RefreshCcw,
  Crown,
  Coins,
  XCircle,
  Unlock,
  PlusCircle,
  Shield,
  Activity,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withRepeat,
  withTiming,
  interpolate,
  FadeInDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { supabase } from '../../../lib/supabase/client';
import { Database } from '../../../types/database/database.types';
import { GlassCard } from '../../../components/ui/GlassCard';
import { FadeIn } from '../../../components/animations/FadeIn';
import { cn } from '../../../lib/utils';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const THEME = {
  obsidian: '#020205',
  indigo: '#6366f1',
  slate: '#94a3b8',
  danger: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
  white: '#ffffff',
  cyan: '#00F0FF',
};

type UserRole = Database['public']['Enums']['user_role'];
type UserTier = Database['public']['Enums']['user_tier'];

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  tier: UserTier;
  tokens_balance: number;
  status: string | null;
  banned_until: string | null;
  created_at: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// MODULE 1: AMBIENT BACKGROUND ENGINE (Breathing Animation)
// ══════════════════════════════════════════════════════════════════════════════
const AmbientGradient = ({ delay = 0, color = '#3B82F6' }) => {
  const pulse = useSharedValue(0);
  const { width, height } = Dimensions.get('window');

  useEffect(() => {
    pulse.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 10000 }), -1, true),
    );
  }, [delay, pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(pulse.value, [0, 1], [1, 1.4]) },
      { translateX: interpolate(pulse.value, [0, 1], [0, width * 0.05]) },
      { translateY: interpolate(pulse.value, [0, 1], [0, height * 0.05]) },
    ],
    opacity: interpolate(pulse.value, [0, 1], [0.04, 0.08]),
  }));

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          position: 'absolute',
          width: width * 1.5,
          height: width * 1.5,
          backgroundColor: color,
          borderRadius: width,
        },
      ]}
    />
  );
};

const AmbientEngine = React.memo(() => (
  <View
    className="absolute inset-0 overflow-hidden bg-[#01111fbe]"
    style={{ pointerEvents: 'none', zIndex: 0 }}
  >
    <AmbientGradient delay={0.5} color="#3B82F6" />
    <AmbientGradient delay={3000} color="#8B5CF6" />
  </View>
));

// ══════════════════════════════════════════════════════════════════════════════
// 2. MAIN USER DIRECTORY COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function AdminUsersScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [banModalVisible, setBanModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // --- DATA FETCH ENGINE ---
  const loadUsers = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data as UserProfile[]);
    } catch (e: any) {
      console.error('Fetch error:', e);
      Alert.alert('Error', 'Registry could not be synchronized.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // --- REAL-TIME SUBSCRIPTION ---
  useEffect(() => {
    loadUsers();
    const channelId = `admin_users_registry_${Date.now()}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          loadUsers(true);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadUsers]);

  const triggerHaptic = (type: 'selection' | 'success' | 'warning') => {
    if (Platform.OS !== 'web') {
      if (type === 'selection') Haptics.selectionAsync();
      if (type === 'success')
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (type === 'warning')
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  };

  // --- ADMIN ACTIONS ---

  const handleRoleTierUpdate = async (
    type: 'role' | 'tier',
    newValue: string,
  ) => {
    if (!selectedUser) return;
    triggerHaptic('selection');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [type]: newValue })
        .eq('id', selectedUser.id);

      if (error) throw error;

      setSelectedUser((prev) => (prev ? { ...prev, [type]: newValue } : null));
      triggerHaptic('success');
    } catch (e: any) {
      Alert.alert('Update Failed', e.message);
    }
  };

  const handleAddTokens = async (amount: number) => {
    if (!selectedUser) return;
    triggerHaptic('success');
    try {
      const newBalance = selectedUser.tokens_balance + amount;
      const { error } = await supabase
        .from('profiles')
        .update({ tokens_balance: newBalance })
        .eq('id', selectedUser.id);

      if (error) throw error;
      Alert.alert(
        'Tokens Granted',
        `${amount} tokens added to ${selectedUser.email}`,
      );
    } catch (e: any) {
      Alert.alert('Transaction Failed', e.message);
    }
  };

  const executeBan = async (durationDays: number | null) => {
    if (!selectedUser) return;
    triggerHaptic('warning');
    setBanModalVisible(false);

    try {
      let bannedUntil = null;
      if (durationDays) {
        const date = new Date();
        date.setDate(date.getDate() + durationDays);
        bannedUntil = date.toISOString();
      } else {
        bannedUntil = '2099-12-31T23:59:59.000Z';
      }

      const { error } = await supabase
        .from('profiles')
        .update({ status: 'banned', banned_until: bannedUntil })
        .eq('id', selectedUser.id);

      if (error) throw error;
      triggerHaptic('success');
    } catch (e: any) {
      Alert.alert('Protocol Failed', e.message);
    }
  };

  const executeUnban = async () => {
    if (!selectedUser) return;
    triggerHaptic('success');
    setBanModalVisible(false);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'active', banned_until: null })
        .eq('id', selectedUser.id);

      if (error) throw error;
    } catch (e: any) {
      Alert.alert('Restore Failed', e.message);
    }
  };

  const executeDelete = async () => {
    if (!selectedUser) return;
    setDeleteModalVisible(false);

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', selectedUser.id);

      if (error) throw error;
      triggerHaptic('success');
    } catch (e: any) {
      Alert.alert('Purge Failed', e.message);
    }
  };

  // --- CARD RENDERER ---
  const renderUserCard = ({
    item,
    index,
  }: {
    item: UserProfile;
    index: number;
  }) => {
    const isBanned = item.status === 'banned';
    const roleColor =
      item.role === 'admin'
        ? THEME.danger
        : item.role === 'support'
          ? THEME.indigo
          : item.role === 'premium'
            ? THEME.warning
            : THEME.slate;
    const tierColor =
      item.tier === 'enterprise'
        ? '#c084fc'
        : item.tier === 'pro'
          ? '#38bdf8'
          : THEME.success;

    // Formatting date neatly
    const joinDate = new Date(item.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return (
      <FadeIn delay={index * 50}>
        <GlassCard
          className={cn(
            'p-6 mb-5 border bg-[#0a0f1c]/80 border-white/5 rounded-[24px] w-full max-w-4xl mx-auto shadow-2xl shadow-black/50',
            isBanned && 'bg-rose-500/10 border-rose-500/30',
          )}
        >
          {/* Top Section: Avatar & Info */}
          <View className="flex-row items-start gap-5">
            <View
              className={cn(
                'items-center justify-center overflow-hidden border-2 rounded-full w-14 h-14 shrink-0',
                isBanned
                  ? 'bg-rose-500/10 border-rose-500/40'
                  : 'bg-indigo-500/10 border-indigo-500/30',
              )}
            >
              {item.avatar_url ? (
                <Image
                  source={{ uri: item.avatar_url }}
                  className="w-full h-full"
                />
              ) : (
                <Text
                  className={cn(
                    'text-xl font-black',
                    isBanned ? 'text-rose-400' : 'text-indigo-400',
                  )}
                >
                  {(item.full_name || item.email || 'U')[0].toUpperCase()}
                </Text>
              )}
            </View>

            <View className="flex-1">
              <View className="flex-row flex-wrap items-center justify-between gap-2 mb-1">
                <Text
                  className={cn(
                    'text-lg font-bold text-white',
                    isBanned && 'line-through opacity-50',
                  )}
                >
                  {item.full_name || 'Anonymous Kernel'}
                </Text>

                <View className="flex-row flex-wrap gap-2">
                  {isBanned && (
                    <View className="px-2 py-0.5 rounded border bg-rose-500/20 border-rose-500/50">
                      <Text className="text-[9px] font-black uppercase text-rose-400 tracking-widest">
                        RESTRICTED
                      </Text>
                    </View>
                  )}
                  <View
                    className={cn(
                      'px-2 py-0.5 rounded border bg-white/5',
                      `border-${roleColor}/30`,
                    )}
                  >
                    <Text className="text-[9px] font-black uppercase text-slate-300 tracking-widest">
                      {item.role}
                    </Text>
                  </View>
                  <View
                    className="px-2 py-0.5 rounded border bg-white/5"
                    style={{ borderColor: `${tierColor}40` }}
                  >
                    <Text
                      className="text-[9px] font-black uppercase tracking-widest"
                      style={{ color: tierColor }}
                    >
                      {item.tier}
                    </Text>
                  </View>
                </View>
              </View>

              <View className="flex-row items-center gap-2 mb-3">
                <Mail size={12} color={THEME.slate} />
                <Text className="text-sm font-medium text-slate-400">
                  {item.email}
                </Text>
              </View>

              {/* Enhanced Stats Row */}
              <View className="flex-row flex-wrap items-center gap-x-6 gap-y-2">
                <View className="flex-row items-center gap-1.5">
                  <Coins size={14} color="#facc15" />
                  <Text className="font-mono text-xs font-bold text-yellow-500/90">
                    {item.tokens_balance.toLocaleString()} BAL
                  </Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <Calendar size={12} color={THEME.slate} />
                  <Text className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                    Joined {joinDate}
                  </Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <Fingerprint size={12} color={THEME.slate} />
                  <Text className="text-[10px] font-mono text-slate-500/70">
                    {item.id}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* CRITICAL FIX: Responsive, compact button grid.
            Web: Stays tight and inline. Mobile: Wraps cleanly into a grid.
          */}
          <View className="flex-row flex-wrap items-center gap-2 pt-4 mt-5 border-t border-white/5">
            <TouchableOpacity
              onPress={() => {
                setSelectedUser(item);
                setRoleModalVisible(true);
              }}
              className="flex-row items-center justify-center flex-1 min-w-[100px] max-w-[140px] gap-2 py-2.5 px-3 border border-white/5 bg-white/5 rounded-xl hover:bg-white/10"
            >
              <UserCog size={14} color={THEME.indigo} />
              <Text className="text-[10px] font-black text-slate-200 uppercase tracking-[1px]">
                Access
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleAddTokens(1000)}
              className="flex-row items-center justify-center flex-1 min-w-[100px] max-w-[140px] gap-2 py-2.5 px-3 border border-white/5 bg-white/5 rounded-xl hover:bg-white/10"
            >
              <PlusCircle size={14} color="#38bdf8" />
              <Text className="text-[10px] font-black text-sky-400 uppercase tracking-[1px]">
                +1K TKN
              </Text>
            </TouchableOpacity>

            {/* Placeholder for future detailed audit view */}
            <TouchableOpacity
              onPress={() => console.log('Audit feature pending...')}
              className="flex-row items-center justify-center flex-1 min-w-[100px] max-w-[140px] gap-2 py-2.5 px-3 border border-white/5 bg-white/5 rounded-xl hover:bg-white/10"
            >
              <Activity size={14} color={THEME.cyan} />
              <Text className="text-[10px] font-black text-cyan-400 uppercase tracking-[1px]">
                Audit
              </Text>
            </TouchableOpacity>

            {isBanned ? (
              <TouchableOpacity
                onPress={() => executeUnban()}
                className="flex-row items-center justify-center flex-1 min-w-[100px] max-w-[140px] gap-2 py-2.5 px-3 border border-emerald-500/20 bg-emerald-500/10 rounded-xl hover:bg-emerald-500/20"
              >
                <Unlock size={14} color={THEME.success} />
                <Text className="text-[10px] font-black text-emerald-400 uppercase tracking-[1px]">
                  Restore
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  setSelectedUser(item);
                  setBanModalVisible(true);
                }}
                className="flex-row items-center justify-center flex-1 min-w-[100px] max-w-[140px] gap-2 py-2.5 px-3 border border-white/5 bg-white/5 rounded-xl hover:bg-white/10"
              >
                <Ban size={14} color={THEME.warning} />
                <Text className="text-[10px] font-black text-yellow-500 uppercase tracking-[1px]">
                  Restrict
                </Text>
              </TouchableOpacity>
            )}

            {/* Pushes Purge to the right on wide desktop, wraps normally on mobile */}
            <View className="flex-[2] min-w-[20px] md:block hidden" />

            <TouchableOpacity
              onPress={() => {
                setSelectedUser(item);
                setDeleteModalVisible(true);
              }}
              className="flex-row items-center justify-center flex-1 min-w-[100px] max-w-[140px] gap-2 py-2.5 px-3 border rounded-xl border-rose-500/10 bg-rose-500/5 hover:bg-rose-500/10 ml-auto"
            >
              <Trash2 size={14} color={THEME.danger} />
              <Text className="text-[10px] font-black text-rose-400 uppercase tracking-[1px]">
                Purge
              </Text>
            </TouchableOpacity>
          </View>
        </GlassCard>
      </FadeIn>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#01111f]">
      <AmbientEngine />

      <View className="flex-1 w-full max-w-5xl mx-auto">
        {/* HEADER SECTION */}
        <View className="flex-row items-center justify-between px-6 py-6 border-b border-white/5">
          <View className="flex-row items-center gap-4">
            <TouchableOpacity
              onPress={() => router.back()}
              className="items-center justify-center w-10 h-10 border rounded-2xl bg-white/5 border-white/10"
            >
              <ChevronLeft size={20} color="#fff" />
            </TouchableOpacity>
            <View>
              <Text className="text-2xl font-black tracking-tighter text-white uppercase">
                Registry
              </Text>
              <Text className="text-[10px] font-bold text-slate-500 uppercase tracking-[2px]">
                {users.length} Active PID Logs
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => loadUsers(false)}
            className="items-center justify-center w-10 h-10 border rounded-2xl bg-indigo-500/10 border-indigo-500/20"
          >
            <RefreshCcw size={18} color="#6366f1" />
          </TouchableOpacity>
        </View>

        {/* SEARCH INTERFACE */}
        <View className="w-full max-w-4xl px-6 mx-auto mt-6 mb-6">
          <GlassCard className="flex-row items-center gap-3 px-5 border shadow-lg h-14 rounded-2xl bg-white/5 border-white/10 shadow-black/20">
            <Search size={18} color={THEME.slate} />
            <TextInput
              className="flex-1 text-sm font-bold tracking-wide text-white outline-none"
              placeholder="FILTER BY EMAIL OR UUID..."
              placeholderTextColor="#475569"
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <XCircle size={18} color={THEME.slate} />
              </TouchableOpacity>
            )}
          </GlassCard>
        </View>

        <FlatList
          data={users.filter(
            (u) =>
              u.email.toLowerCase().includes(search.toLowerCase()) ||
              u.id.includes(search),
          )}
          keyExtractor={(item) => item.id}
          renderItem={renderUserCard}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 150 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadUsers(true)}
              tintColor="#6366f1"
            />
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-20 opacity-30">
              <ShieldAlert size={48} color="#fff" />
              <Text className="mt-4 text-xs font-black text-white uppercase tracking-[4px]">
                No Matching Profiles
              </Text>
            </View>
          }
        />
      </View>

      {/* ════════ 4. ADMIN MODALS ════════ */}

      {/* ACCESS MODAL (ROLE & TIER) */}
      <Modal visible={roleModalVisible} transparent animationType="slide">
        <View className="items-center justify-center flex-1 p-6 bg-[#01111f]/90">
          <GlassCard className="w-full max-w-md p-8 border bg-[#0a0f1c] border-white/10 rounded-[40px] shadow-2xl shadow-black">
            <View className="items-center mb-6">
              <View className="items-center justify-center w-16 h-16 mb-4 border rounded-3xl bg-indigo-500/10 border-indigo-500/20">
                <Shield size={32} color="#6366f1" />
              </View>
              <Text className="text-xl font-black tracking-widest text-center text-white uppercase">
                Modify Identity
              </Text>
              <Text className="mt-2 text-[10px] text-slate-500 text-center uppercase tracking-widest leading-4">
                {selectedUser?.email}
              </Text>
            </View>

            <Text className="mb-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
              System Role
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-6">
              {['member', 'premium', 'support', 'admin'].map((role) => (
                <TouchableOpacity
                  key={`role-${role}`}
                  onPress={() => handleRoleTierUpdate('role', role)}
                  className={cn(
                    'px-4 py-2.5 border rounded-xl flex-row items-center gap-2',
                    selectedUser?.role === role
                      ? 'bg-indigo-500/10 border-indigo-500/40'
                      : 'bg-white/5 border-white/10 hover:bg-white/10',
                  )}
                >
                  <Text className="text-[10px] font-black tracking-widest text-white uppercase">
                    {role}
                  </Text>
                  {selectedUser?.role === role && (
                    <CheckCircle size={12} color="#6366f1" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <Text className="mb-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Subscription Tier
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-6">
              {['free', 'pro', 'enterprise'].map((tier) => (
                <TouchableOpacity
                  key={`tier-${tier}`}
                  onPress={() => handleRoleTierUpdate('tier', tier)}
                  className={cn(
                    'px-4 py-2.5 border rounded-xl flex-row items-center gap-2',
                    selectedUser?.tier === tier
                      ? 'bg-emerald-500/10 border-emerald-500/40'
                      : 'bg-white/5 border-white/10 hover:bg-white/10',
                  )}
                >
                  <Text className="text-[10px] font-black tracking-widest text-white uppercase">
                    {tier}
                  </Text>
                  {selectedUser?.tier === tier && (
                    <CheckCircle size={12} color="#10b981" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={() => setRoleModalVisible(false)}
              className="py-4 mt-2"
            >
              <Text className="text-center font-black text-slate-500 uppercase tracking-[4px] text-[10px]">
                Close Panel
              </Text>
            </TouchableOpacity>
          </GlassCard>
        </View>
      </Modal>

      {/* BAN MODAL */}
      <Modal visible={banModalVisible} transparent animationType="fade">
        <View className="items-center justify-center flex-1 p-6 bg-[#01111f]/95">
          <GlassCard className="w-full max-w-sm p-8 border bg-[#0a0f1c] border-white/10 rounded-[40px] shadow-2xl shadow-black">
            <View className="items-center mb-8">
              <ShieldAlert size={40} color={THEME.warning} />
              <Text className="mt-4 text-xl font-black tracking-widest text-white uppercase">
                Restrict PID
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => executeBan(1)}
              className="flex-row items-center gap-4 p-5 mb-3 border bg-white/5 border-white/10 rounded-2xl hover:bg-white/10"
            >
              <Clock size={18} color="#94a3b8" />
              <Text className="text-xs font-bold tracking-widest text-white uppercase">
                24H TIMEOUT
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => executeBan(7)}
              className="flex-row items-center gap-4 p-5 mb-3 border bg-white/5 border-white/10 rounded-2xl hover:bg-white/10"
            >
              <Calendar size={18} color="#94a3b8" />
              <Text className="text-xs font-bold tracking-widest text-white uppercase">
                7 DAY SUSPENSION
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => executeBan(null)}
              className="flex-row items-center gap-4 p-5 border bg-rose-500/10 border-rose-500/20 rounded-2xl hover:bg-rose-500/20"
            >
              <Ban size={18} color="#f43f5e" />
              <Text className="text-xs font-bold tracking-widest uppercase text-rose-400">
                PERMANENT LOCK
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setBanModalVisible(false)}
              className="mt-6"
            >
              <Text className="text-center font-black text-slate-500 uppercase tracking-[4px] text-[10px]">
                Abort
              </Text>
            </TouchableOpacity>
          </GlassCard>
        </View>
      </Modal>

      {/* PURGE MODAL */}
      <Modal visible={deleteModalVisible} transparent animationType="slide">
        <View className="items-center justify-center flex-1 p-6 bg-[#01111f]/95">
          <GlassCard className="w-full max-w-sm p-10 border bg-[#0a0f1c] border-rose-500/20 rounded-[50px] shadow-2xl shadow-rose-900/20">
            <View className="items-center mb-8">
              <AlertTriangle size={64} color={THEME.danger} />
              <Text className="mt-6 text-2xl font-black tracking-tighter text-center text-white uppercase">
                Critical Purge
              </Text>
              <Text className="mt-4 text-xs leading-5 tracking-widest text-center uppercase text-slate-400">
                Are you certain? Deleting{' '}
                <Text className="font-bold text-white">
                  {selectedUser?.email}
                </Text>{' '}
                is an irreversible database transaction.
              </Text>
            </View>

            <TouchableOpacity
              onPress={executeDelete}
              className="py-5 mb-4 border bg-rose-500/10 border-rose-500/30 rounded-3xl hover:bg-rose-500/20"
            >
              <Text className="text-xs font-black tracking-widest text-center uppercase text-rose-400">
                Execute Purge
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setDeleteModalVisible(false)}
              className="py-4"
            >
              <Text className="text-center font-black text-slate-500 uppercase tracking-[4px] text-[10px]">
                Cancel Transaction
              </Text>
            </TouchableOpacity>
          </GlassCard>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
