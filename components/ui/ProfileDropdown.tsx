/**
 * components/ui/ProfileDropdown.tsx
 * Sovereign NorthOS — User Context & Navigation Node
 * ══════════════════════════════════════════════════════════════════════════════
 * PROTOCOL:
 * 1. COMPILER SAFETY: Uses native React Native shadow props to bypass NativeWind bugs.
 * 2. STRUCTURAL INTEGRITY: Re-implemented w-10/h-10 and absolute positioning for web/mobile.
 * 3. DYNAMIC ROLE BADGING: Visual hierarchy based on user authorization level.
 * 4. GLASSMORPHISM: Safe WebkitBackdropFilter applied conditionally for web browsers.
 * ══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/useAuthStore';

// ─── MODULE 1: UTILITIES & CONFIGURATION ──────────────────────────────────────

const getInitials = (name?: string) => {
  if (!name) return 'U';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
};

const getRoleConfig = (role?: string) => {
  switch (role?.toLowerCase()) {
    case 'admin':
      return {
        label: 'ADMIN',
        bg: 'rgba(255, 51, 102, 0.15)',
        text: '#FF3366',
        border: 'rgba(255, 51, 102, 0.3)',
        shadow: '#FF3366',
      };
    case 'premium':
      return {
        label: 'PREMIUM',
        bg: 'rgba(255, 170, 0, 0.15)',
        text: '#FFD700',
        border: 'rgba(255, 170, 0, 0.3)',
        shadow: '#FFD700',
      };
    default:
      return {
        label: 'MEMBER',
        bg: 'rgba(0, 240, 255, 0.15)',
        text: '#00F0FF',
        border: 'rgba(0, 240, 255, 0.3)',
        shadow: '#00F0FF',
      };
  }
};

// ─── MODULE 2: MAIN COMPONENT ─────────────────────────────────────────────────

export const ProfileDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const { user, profile, signOut } = useAuthStore();

  const fullName =
    user?.user_metadata?.full_name || profile?.full_name || 'Operator';
  const email = user?.email || '';
  const avatarUrl =
    user?.user_metadata?.avatar_url || profile?.avatar_url || null;
  const userRole = profile?.role || 'member';
  const roleConfig = getRoleConfig(userRole);

  const handleSignOut = async () => {
    setIsOpen(false);
    await signOut();
    router.replace('/(auth)/sign-in');
  };

  return (
    <View
      style={{ position: 'relative', alignItems: 'flex-end', zIndex: 9999 }}
    >
      {/* ─── MODULE 3: AVATAR TRIGGER ─── */}
      <TouchableOpacity
        onPress={() => setIsOpen(!isOpen)}
        // CRITICAL: Restored Tailwind structural classes for size and background
        className="w-10 h-10 rounded-full bg-[#020205] border border-white/10 items-center justify-center"
        style={{
          ...(Platform.OS === 'web' ? { cursor: 'pointer' as any } : {}),
          // Compiler-Safe Shadows
          shadowColor: roleConfig.shadow,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8,
          shadowRadius: 10,
          elevation: 5,
        }}
        activeOpacity={0.8}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={{ width: '100%', height: '100%', borderRadius: 20 }}
            resizeMode="cover"
          />
        ) : (
          <Text
            style={{
              color: roleConfig.text,
              fontFamily: Platform.OS === 'web' ? 'monospace' : 'Menlo',
              fontSize: 13,
              fontWeight: '900',
            }}
          >
            {getInitials(fullName)}
          </Text>
        )}
      </TouchableOpacity>

      {/* ─── MODULE 4: FLOATING DROPDOWN MENU ─── */}
      {isOpen && (
        <View
          // CRITICAL: Restored absolute positioning, width, and background
          className="absolute top-14 right-0 w-60 rounded-2xl bg-[#0A0D14]/95 border border-white/10 overflow-hidden"
          style={{
            ...(Platform.OS === 'web'
              ? { WebkitBackdropFilter: 'blur(20px) saturate(180%)' as any }
              : {}),
            // Compiler-Safe Menu Shadows
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 1,
            shadowRadius: 20,
            elevation: 15,
          }}
        >
          {/* Header Info */}
          <View
            style={{
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(255,255,255,0.05)',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 4,
              }}
            >
              <Text
                style={{
                  color: '#ffffff',
                  fontWeight: '800',
                  fontSize: 13,
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {fullName}
              </Text>

              {/* Dynamic Role Badge */}
              <View
                style={{
                  backgroundColor: roleConfig.bg,
                  borderColor: roleConfig.border,
                  borderWidth: 1,
                  paddingHorizontal: 6,
                  paddingVertical: 3,
                  borderRadius: 6,
                  marginLeft: 8,
                }}
              >
                <Text
                  style={{
                    color: roleConfig.text,
                    fontSize: 8,
                    fontWeight: '900',
                    letterSpacing: 1,
                  }}
                >
                  {roleConfig.label}
                </Text>
              </View>
            </View>
            <Text
              style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}
              numberOfLines={1}
            >
              {email}
            </Text>
          </View>

          {/* Action Links */}
          <View style={{ padding: 8 }}>
            {userRole === 'admin' && (
              <TouchableOpacity
                onPress={() => {
                  setIsOpen(false);
                  router.push('/admin');
                }}
                className="flex-row items-center p-3 rounded-xl hover:bg-white/5"
              >
                <Text
                  style={{
                    color: '#FF3366',
                    fontSize: 11,
                    fontWeight: '800',
                    letterSpacing: 1,
                  }}
                >
                  🛡️ ADMIN
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => {
                setIsOpen(false);
                router.push('/settings');
              }}
              className="flex-row items-center p-3 rounded-xl hover:bg-white/5"
            >
              <Text
                style={{
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: 11,
                  fontWeight: '700',
                  letterSpacing: 1,
                }}
              >
                ⚙️ SETTINGS
              </Text>
            </TouchableOpacity>

            <View
              style={{
                height: 1,
                backgroundColor: 'rgba(255,255,255,0.05)',
                marginVertical: 4,
              }}
            />

            <TouchableOpacity
              onPress={handleSignOut}
              className="flex-row items-center p-3 rounded-xl hover:bg-white/5"
            >
              <Text
                style={{
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: 11,
                  fontWeight: '700',
                  letterSpacing: 1,
                }}
              >
                SIGN OUT
              </Text>
              
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};
