import React from 'react';
import { View, StyleSheet, Platform, ViewProps } from 'react-native';
import { cn } from '../../lib/utils';

// 1. EXTEND ViewProps so TypeScript knows this component accepts 'style'
interface GlassCardProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
  // 2. ADD 'red' and 'green' for the Admin and Support cards
  glowColor?: 'cyan' | 'purple' | 'pink' | 'lime' | 'red' | 'green';
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  glowColor = 'cyan',
  style, // Extract styles
  ...props // Extract any other standard View props
}) => {
  const glowStyles = {
    cyan: 'border-neon-cyan/20 shadow-[0_0_30px_rgba(0,240,255,0.05)]',
    purple: 'border-neon-purple/20 shadow-[0_0_30px_rgba(138,43,226,0.05)]',
    pink: 'border-neon-pink/20 shadow-[0_0_30px_rgba(255,0,127,0.05)]',
    lime: 'border-neon-lime/20 shadow-[0_0_30px_rgba(50,255,0,0.05)]',
    red: 'border-[#ff4d6d]/20 shadow-[0_0_30px_rgba(255,77,109,0.05)]',
    green: 'border-[#4ade80]/20 shadow-[0_0_30px_rgba(74,222,128,0.05)]',
  };

  return (
    <View
      className={cn(
        'relative overflow-hidden rounded-[32px] border bg-[#0f172a]/40', // Semi-transparent solid bg replaces BlurView
        glowStyles[glowColor],
        className,
      )}
      style={style} // Apply the custom dynamic styles passed from index.tsx
      {...props}
    >
      {/* Content Layer */}
      <View className="relative z-10">{children}</View>
    </View>
  );
};
