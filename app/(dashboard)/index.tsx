import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  Platform,
  TouchableOpacity,
  Dimensions,
  KeyboardAvoidingView,
  LayoutAnimation,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useVideoStore } from './../../store/useVideoStore';
import { useVideoData } from '../../hooks/queries/useVideoData';
import { GlassCard } from '../../components/ui/GlassCard';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { FadeIn } from '../../components/animations/FadeIn';
import { cn } from '../../lib/utils';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  withDelay,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

/**
 * ============================================================================
 * TYPE DEFINITIONS
 * ============================================================================
 */

interface PipelineStatus {
  text: string;
  progress: string;
  color: string;
  description: string;
  glow: string;
}

interface TelemetryLog {
  id: string;
  timestamp: string;
  message: string;
  level: 'info' | 'warn' | 'error' | 'success';
}

/**
 * ============================================================================
 * OPTIMIZED NEURAL BACKGROUND ELEMENTS
 * ============================================================================
 */

const NeuralOrb = ({ delay = 0, color = '#00F0FF' }) => {
  const pulse = useSharedValue(0);
  const { width, height } = Dimensions.get('window');

  useEffect(() => {
    pulse.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 8000 }), -1, true),
    );
  }, [delay, pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(pulse.value, [0, 1], [1, 1.6]) },
      { translateX: interpolate(pulse.value, [0, 1], [0, width * 0.05]) },
      { translateY: interpolate(pulse.value, [0, 1], [0, height * 0.05]) },
    ],
    opacity: interpolate(pulse.value, [0, 1], [0.03, 0.09]),
  }));

  return (
    <Animated.View
      style={[
        animatedStyle,
        {
          position: 'absolute',
          width: 600,
          height: 600,
          backgroundColor: color,
          borderRadius: 300,
          ...(Platform.OS === 'web' ? { filter: 'blur(120px)' } : {}),
        },
      ]}
    />
  );
};

/**
 * ============================================================================
 * MAIN ENGINE COMPONENT
 * ============================================================================
 */

export default function DashboardScreen() {
  const router = useRouter();
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [logs, setLogs] = useState<TelemetryLog[]>([]);
  const [isUrlValid, setIsUrlValid] = useState(true);


  // Responsive Breakpoint Detection
  const { width: screenWidth } = Dimensions.get('window');
  const isMobile = screenWidth < 768;

  // Store Extraction
  const isProcessing = useVideoStore(
    (state: { isProcessing: any }) => state.isProcessing,
  );
  const currentVideoId = useVideoStore(
    (state: { currentVideoId: any }) => state.currentVideoId,
  );
  const error = useVideoStore((state: { error: any }) => state.error);
  const processVideo = useVideoStore(
    (state: { processVideo: any }) => state.processVideo,
  );

  // Real-time Pipeline Query
  const { data: videoData } = useVideoData(currentVideoId);

  /**
   * --------------------------------------------------------------------------
   * TELEMETRY LOGGING ENGINE
   * --------------------------------------------------------------------------
   */
  const addLog = useCallback(
    (message: string, level: TelemetryLog['level'] = 'info') => {
      const newLog: TelemetryLog = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toLocaleTimeString([], {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        message,
        level,
      };
      setLogs((prev) => [newLog, ...prev].slice(0, 8));
      if (Platform.OS !== 'web') {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
    },
    [],
  );

  useEffect(() => {
    if (videoData?.status) {
      addLog(`STATUS_UPDATE: ${videoData.status.toUpperCase()}`, 'info');
      if (videoData.status === 'completed')
        addLog('LINK_STABILIZED: PAYLOAD_READY', 'success');
      if (videoData.status === 'failed')
        addLog('CRITICAL_SIGNAL_LOSS', 'error');
    }
  }, [videoData?.status, addLog]);

  const handleTranscribe = async () => {
    // Relaxed regex to accept standard http/https links (not just YouTube)
    const urlRegex = /^https?:\/\/.+/;

    if (!youtubeUrl.trim() || !urlRegex.test(youtubeUrl)) {
      setIsUrlValid(false);
      addLog('MALFORMED_URL_SEQUENCE', 'warn');
      return;
    }

    setIsUrlValid(true);
    addLog('HANDSHAKE_START', 'info');

    const WORKSPACE_ID = ''; // no longer needed, useVideoStore fetches it

    if (processVideo) {
      try {
        // Send the universal URL to the Edge Function
       await processVideo(youtubeUrl);
        addLog('HANDSHAKE_SUCCESS', 'success');
      } catch (err) {
        addLog('UPLINK_TIMEOUT', 'error');
      }
    }
  };
  /**
   * --------------------------------------------------------------------------
   * PIPELINE STATUS MAPPING
   * --------------------------------------------------------------------------
   */
  const statusInfo = useMemo((): PipelineStatus | null => {
    if (!videoData && isProcessing) {
      return {
        text: 'INITIALIZING',
        progress: 'w-1/12',
        color: 'bg-white',
        description: 'Booting neural decryption modules...',
        glow: 'shadow-[0_0_15px_rgba(255,255,255,0.4)]',
      };
    }

    if (!videoData?.status) return null;

    const maps: Record<string, PipelineStatus> = {
      queued: {
        text: 'QUEUED',
        progress: 'w-1/5',
        color: 'bg-neon-cyan',
        description: 'Asset assigned to next available processing node.',
        glow: 'shadow-[0_0_15px_#00F0FF]',
      },
      downloading: {
        text: 'EXTRACTING',
        progress: 'w-2/5',
        color: 'bg-neon-purple',
        description: 'Retrieving raw bitstream from source repository.',
        glow: 'shadow-[0_0_15px_#8A2BE2]',
      },
      transcribing: {
        text: 'DECRYPTING',
        progress: 'w-3/5',
        color: 'bg-neon-pink',
        description: 'Converting audio wave-patterns into text data.',
        glow: 'shadow-[0_0_15px_#FF007F]',
      },
      ai_processing: {
        text: 'ANALYZING',
        progress: 'w-4/5',
        color: 'bg-neon-cyan',
        description: 'Applying semantic mapping to transcript payload.',
        glow: 'shadow-[0_0_15px_#00F0FF]',
      },
      completed: {
        text: 'SUCCESS',
        progress: 'w-full',
        color: 'bg-neon-lime',
        description: 'Decryption finalized. Results stored in vault.',
        glow: 'shadow-[0_0_15px_#32FF00]',
      },
      failed: {
        text: 'FAILURE',
        progress: 'w-full',
        color: 'bg-red-500',
        // EXPLICIT FIX: This grabs the actual database error message, or defaults to a safe string.
        description:
          videoData.error_message ||
          'Operation aborted due to backend hardware fault.',
        glow: 'shadow-[0_0_15px_#EF4444]',
      },
    };

    return maps[videoData.status] || null;
  }, [videoData, isProcessing]);

  const effectivelyLoading =
    isProcessing &&
    videoData?.status !== 'completed' &&
    videoData?.status !== 'failed';
const clearError = useVideoStore((state: { clearError: any }) => state.clearError);
  return (
    <SafeAreaView className="flex-1 bg-[#020205]">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* AMBIENT BACKGROUND */}
        <View className="absolute inset-0 overflow-hidden" pointerEvents="none">
          <NeuralOrb delay={0} color="#00F0FF" />
          <NeuralOrb delay={2500} color="#8A2BE2" />
        </View>

        <ScrollView
          contentContainerStyle={{
            padding: isMobile ? 20 : 60,
            paddingTop: isMobile ? 140 : 100,
            paddingBottom: isMobile ? 140 : 200,
            flexGrow: 1,
            justifyContent: 'center',
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* HEADER SECTION */}
          <FadeIn>
            <View className="items-center mb-10 md:mb-16">
              <View className="px-4 py-1 mb-6 border rounded-full bg-neon-cyan/10 border-neon-cyan/20">
                <Text className="text-[8px] md:text-[9px] font-black tracking-[5px] text-neon-cyan uppercase">
                  NorthOS
                </Text>
              </View>

              <Text
                className={cn(
                  'font-black text-white tracking-tighter uppercase text-center',
                  isMobile
                    ? 'text-4xl leading-[38px]'
                    : 'text-6xl leading-[55px]',
                )}
              >
                VIDEO <Text className="text-neon-cyan">TRANSCRIBER</Text>
              </Text>
              <View className="h-[2px] w-16 md:w-20 bg-neon-cyan mt-6 md:mt-8 rounded-full shadow-[0_0_20px_#00F0FF]" />
            </View>
          </FadeIn>


          {/* INPUT SECTION */}
          <View className="self-center w-full max-w-2xl px-2">
            {/* INPUT GLASS MODULE */}
            <FadeIn delay={200}>
              <GlassCard
                glowColor="cyan"
                className={cn('bg-white/[0.01]', isMobile ? 'p-6' : 'p-12')}
              >
                <Input
                  label="VIDEO LINK"
                  placeholder="https://www.youtube.com/..."
                  value={youtubeUrl}
               onChangeText={(v) => {
  setYoutubeUrl(v);
  if (!isUrlValid) setIsUrlValid(true);
  clearError(); // ADD THIS
}}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!effectivelyLoading}
                />

                <Button
                  title={effectivelyLoading ? 'PROCESSING...' : 'START'}
                  onPress={handleTranscribe}
                  isLoading={effectivelyLoading}
                  variant="primary"
                  className="py-5 mt-4 shadow-2xl md:py-6 md:mt-6 shadow-neon-cyan/20"
                />

                {/* ERROR FEEDBACK */}
                {error && ( 
                  <View className="p-6 mt-8 border bg-red-500/10 border-red-500/20 rounded-3xl">
                    <Text className="text-red-500 font-bold text-[10px] tracking-[4px] uppercase text-center mb-2">
                      FAULT_DETECTED
                    </Text>
                    <Text className="text-xs leading-5 text-center text-red-400/70">
                      {error}
                    </Text>
                  </View>
                )}

                {/* PIPELINE TELEMETRY */}
                {(currentVideoId ||
                  effectivelyLoading ||
                  videoData?.status === 'completed') &&
                  statusInfo && (
                    <View className="pt-10 mt-12 border-t border-white/5">
                      <View className="flex-row justify-between mb-5">
                        <View>
                          <Text className="text-white/20 text-[9px] font-bold uppercase tracking-[4px] mb-1">
                            Status
                          </Text>
                          <Text
                            className={cn(
                              'font-black text-xs uppercase tracking-widest',
                              videoData?.status === 'failed'
                                ? 'text-neon-pink'
                                : 'text-neon-cyan',
                            )}
                          >
                            {statusInfo.text}
                          </Text>
                        </View>
                        <View className="items-end">
                          <Text className="text-white/20 text-[9px] font-bold uppercase mb-1">
                            Engine
                          </Text>
                          <Text className="text-white/40 font-mono text-[9px] uppercase">
                            {currentVideoId?.split('-')[0] || 'PENDING'}
                          </Text>
                        </View>
                      </View>

                      <View className="w-full h-1 mb-4 overflow-hidden rounded-full bg-white/5">
                        <View
                          className={cn(
                            'h-full',
                            statusInfo.progress,
                            statusInfo.color,
                            statusInfo.glow,
                          )}
                        />
                      </View>

                      {/* Displaying actual Backend Error text if it fails */}
                      <Text
                        className={cn(
                          'text-[10px] italic font-medium tracking-wide',
                          videoData?.status === 'failed'
                            ? 'text-neon-pink'
                            : 'text-white/40',
                        )}
                      >
                        {statusInfo.description}
                      </Text>

                      {videoData?.status === 'completed' && (
                        <TouchableOpacity
                          onPress={() =>
                            router.push(`/video/${currentVideoId}` as any)
                          }
                          className="items-center justify-center py-5 mt-10 border shadow-2xl rounded-2xl bg-neon-cyan/5 border-neon-cyan/30 shadow-neon-cyan/10"
                        >
                          <Text className="text-neon-cyan font-black text-[10px] tracking-[5px] uppercase">
                            Access Payload
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
              </GlassCard>
            </FadeIn>

            {/* NEURAL LOGS */}
            <FadeIn delay={400}>
              <View className="mx-2 mt-12">
                <Text className="text-white/20 text-[10px] font-bold uppercase tracking-[4px] mb-4 ml-4">
                  Logs
                </Text>
                <View className="relative p-6 overflow-hidden border bg-black/40 border-white/5 rounded-3xl">
                  <BlurView intensity={10} className="absolute inset-0" />
                  {logs.length === 0 ? (
                    <Text className="text-white/10 font-mono text-[10px] text-center italic uppercase">
                      Transcribe
                    </Text>
                  ) : (
                    logs.map((log) => (
                      <View key={log.id} className="flex-row mb-2">
                        <Text className="text-white/20 font-mono text-[9px] w-16">
                          [{log.timestamp}]
                        </Text>
                        <Text
                          className={cn(
                            'font-mono text-[9px] flex-1',
                            log.level === 'info' && 'text-white/50',
                            log.level === 'warn' && 'text-neon-purple',
                            log.level === 'error' && 'text-neon-pink',
                            log.level === 'success' && 'text-neon-lime',
                          )}
                        >
                          {log.message}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              </View>
            </FadeIn>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
