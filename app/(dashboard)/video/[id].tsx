/**
 * app/(dashboard)/video/[id].tsx
 * Master Intelligence Dossier - Sovereign Monolithic Layout
 * ══════════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE & USER DIRECTIVES:
 * 1. MONOLITHIC DESIGN: The Transcript Viewer is now baked directly into this file.
 * Zero chance of external components failing to render the raw text.
 * 2. TOP-LEVEL EXPORT: Export matrix moved above the intelligence data.
 * 3. THE MEGA-BOX: A single, continuous GlassCard containing the Title, Summary,
 * Indicators, and the side-by-side Timeline + Raw Verbatim Transcript.
 * 4. TYPESCRIPT SECURED: Strict `?? undefined` fallback for all database 'null' types.
 * 5. PLATFORM AGNOSTIC: Fluid flex-layouts that stack on mobile and expand on desktop.
 * ══════════════════════════════════════════════════════════════════════════════
 */

import React, { useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Platform,
  StatusBar,
  Linking,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Sparkles,
  Clock,
  Copy,
  AlertCircle,
  FileText,
  Download,
  Terminal,
  Layers,
  Target,
  ExternalLink,
  AlignLeft,
  CheckCircle2,
  ShieldCheck,
  Zap,
  Milestone,
  BookOpen,
} from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
  withDelay,
  Easing,
  FadeInDown,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';

// ─── INTERNAL DEPENDENCIES ───────────────────────────────────────────────────
import { useVideoData } from '../../../hooks/queries/useVideoData';
import { GlassCard } from '../../../components/ui/GlassCard';
import { ExportBuilder } from '../../../services/exportBuilder';
import { cn } from '../../../lib/utils';
import type {
  Video,
  Transcript,
  AiInsights,
  Chapter,
} from '../../../types/api';

// ══════════════════════════════════════════════════════════════════════════════
// 1. AMBIENT BACKGROUND ENGINE
// ══════════════════════════════════════════════════════════════════════════════
const AmbientEngine = React.memo(() => {
  const { width, height } = Dimensions.get('window');
  const pulse1 = useSharedValue(0);
  const pulse2 = useSharedValue(0);

  useEffect(() => {
    pulse1.value = withRepeat(
      withTiming(1, { duration: 15000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    pulse2.value = withDelay(
      5000,
      withRepeat(
        withTiming(1, { duration: 18000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
  }, [pulse1, pulse2]);

  const style1 = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(pulse1.value, [0, 1], [1, 1.4]) },
      { translateX: interpolate(pulse1.value, [0, 1], [0, width * 0.1]) },
    ],
    opacity: interpolate(pulse1.value, [0, 1], [0.03, 0.08]),
  }));

  const style2 = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(pulse2.value, [0, 1], [1, 1.6]) },
      { translateY: interpolate(pulse2.value, [0, 1], [0, height * 0.1]) },
    ],
    opacity: interpolate(pulse2.value, [0, 1], [0.02, 0.06]),
  }));

  return (
    <View className="absolute inset-0 overflow-hidden pointer-events-none bg-[#020205] z-0">
      <Animated.View
        style={[
          style1,
          {
            position: 'absolute',
            width: 900,
            height: 900,
            borderRadius: 450,
            backgroundColor: '#00F0FF',
            top: -200,
            left: -200,
            ...(Platform.OS === 'web' ? { filter: 'blur(120px)' } : {}),
          },
        ]}
      />
      <Animated.View
        style={[
          style2,
          {
            position: 'absolute',
            width: 1000,
            height: 1000,
            borderRadius: 500,
            backgroundColor: '#8A2BE2',
            bottom: -300,
            right: -300,
            ...(Platform.OS === 'web' ? { filter: 'blur(150px)' } : {}),
          },
        ]}
      />
      <View
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            Platform.OS === 'web'
              ? 'radial-gradient(circle at center, #ffffff 1px, transparent 1px)'
              : 'none',
          backgroundSize: '32px 32px',
        }}
      />
    </View>
  );
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. EXPORT MATRIX COMPONENT (Top Level)
// ══════════════════════════════════════════════════════════════════════════════
const ExportControlMatrix = React.memo(
  ({ onExport }: { onExport: (format: any) => void }) => {
    const formats = [
      { id: 'md', label: 'MARKDOWN', icon: FileText, color: '#FCD34D' },
      { id: 'srt', label: 'SUB-RIP (SRT)', icon: Terminal, color: '#F472B6' },
      { id: 'json', label: 'RAW SCHEMA', icon: Layers, color: '#A855F7' },
      { id: 'txt', label: 'PLAINTEXT', icon: AlignLeft, color: '#60A5FA' },
    ];

    return (
      <Animated.View
        entering={FadeInDown.duration(600).springify()}
        className="w-full mb-12"
      >
        <View className="flex-row items-center mb-6 ml-2">
          <Download size={20} color="#00F0FF" />
          <Text className="text-white/50 text-[11px] md:text-xs font-black uppercase tracking-[5px] ml-4">
            Extraction & Export Matrix
          </Text>
        </View>
        <View className="flex-row flex-wrap gap-3 md:gap-4">
          {formats.map((format) => (
            <TouchableOpacity
              key={format.id}
              onPress={() => onExport(format.id)}
              activeOpacity={0.7}
              className="flex-1 min-w-[140px] md:min-w-[180px] p-5 md:p-6 border rounded-3xl bg-[#05050A]/90 border-white/5 hover:bg-white/[0.04] transition-all group flex-row items-center justify-between shadow-xl"
            >
              <View className="flex-row items-center">
                <format.icon
                  size={18}
                  color={format.color}
                  opacity={0.8}
                  className="mr-3 md:mr-4"
                />
                <Text className="text-[10px] md:text-xs font-black tracking-widest uppercase text-white/70 group-hover:text-white transition-colors">
                  {format.label}
                </Text>
              </View>
              <Download
                size={14}
                color="#ffffff20"
                className="transition-colors group-hover:text-white/60"
              />
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    );
  },
);

// ══════════════════════════════════════════════════════════════════════════════
// 3. THE UNIFIED MEGA-BOX COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
interface MegaBoxProps {
  title?: string;
  youtubeUrl?: string;
  summary?: string;
  transcriptText?: string;
  chapters: Chapter[];
  takeaways: string[];
  isProcessing: boolean;
  extractionMethod?: string;
  wordCount?: number;
  readingTime?: number;
}

const UnifiedMegaBox = React.memo(
  ({
    title,
    youtubeUrl,
    summary,
    transcriptText,
    chapters,
    takeaways,
    isProcessing,
    extractionMethod,
    wordCount,
    readingTime,
  }: MegaBoxProps) => {
    const [copySuccess, setCopySuccess] = React.useState(false);

    const handleCopyAll = async () => {
      const payload = `TITLE: ${title}\n\nEXECUTIVE ABSTRACT:\n${summary || 'N/A'}\n\nVERBATIM TRANSCRIPT:\n${transcriptText || 'N/A'}`;
      await Clipboard.setStringAsync(payload);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    };

    return (
      <Animated.View
        entering={FadeInDown.duration(700).springify()}
        className="mb-16"
      >
        <GlassCard
          glowColor="cyan"
          className="p-0 bg-[#07070E]/95 border-white/5 rounded-[48px] overflow-hidden shadow-2xl"
        >
          {/* ── PART A: HERO & TITLE (Inside the Box) ── */}
          <View className="px-8 pt-12 pb-8 border-b md:px-14 bg-white/[0.01] border-white/5 relative overflow-hidden">
            <View
              className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[120px]"
              pointerEvents="none"
            />

            <View className="flex-row items-center justify-between mb-8">
              <View className="flex-row items-center px-4 py-2 border rounded-xl bg-cyan-500/10 border-cyan-500/30">
                <BookOpen size={14} color="#00F0FF" />
                <Text className="ml-3 text-[10px] font-black text-cyan-400 uppercase tracking-[4px]">
                  Video Report
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleCopyAll}
                className="flex-row items-center p-3 transition-colors border bg-white/5 rounded-xl hover:bg-white/10 active:scale-95 border-white/5"
              >
                {copySuccess ? (
                  <CheckCircle2 size={16} color="#34D399" />
                ) : (
                  <Copy size={16} color="#00F0FF" opacity={0.8} />
                )}
                <Text className="ml-3 text-[10px] font-black uppercase text-white/50 tracking-widest hidden md:flex">
                  Copy All
                </Text>
              </TouchableOpacity>
            </View>

            <Text className="mb-6 text-4xl font-black leading-tight tracking-tighter text-white md:text-5xl lg:text-6xl">
              {title || 'Untitled Video'}
            </Text>

            <View className="flex-row flex-wrap items-center gap-6 md:gap-10 opacity-80">
              <View className="flex-row items-center">
                <Clock size={16} color="#00F0FF" />
                <Text className="ml-3 font-mono text-xs tracking-widest text-white uppercase">
                  {readingTime || 0} Min Read
                </Text>
              </View>
              <View className="flex-row items-center">
                <AlignLeft size={16} color="#00F0FF" />
                <Text className="ml-3 font-mono text-xs tracking-widest text-white uppercase">
                  {wordCount?.toLocaleString() || 0} Words
                </Text>
              </View>
              {youtubeUrl && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(youtubeUrl)}
                  className="flex-row items-center transition-opacity hover:opacity-70"
                >
                  <ExternalLink size={16} color="#C084FC" />
                  <Text className="ml-3 text-purple-400 font-black text-[10px] uppercase tracking-widest">
                    View Source
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* ── LOADING STATE ── */}
          {isProcessing ? (
            <View className="items-center justify-center py-32">
              <ActivityIndicator size="large" color="#00F0FF" />
              <Text className="mt-8 text-cyan-400/60 font-mono text-xs uppercase tracking-[5px] text-center leading-loose">
                Decrypting Neural Matrix...{'\n'}Synthesizing Abstract &
                Verbatim Data.
              </Text>
            </View>
          ) : (
            <View className="px-8 py-12 md:px-14">
              {/* ── PART B: EXECUTIVE ABSTRACT ── */}
              <View className="mb-16">
                <View className="flex-row items-center mb-8">
                  <Sparkles size={20} color="#C084FC" />
                  <Text className="text-purple-400 font-black text-[11px] md:text-xs uppercase tracking-[5px] ml-4">
                    Summary
                  </Text>
                </View>
                <Text className="text-white/90 leading-[32px] md:leading-[38px] text-base md:text-lg font-medium text-justify mb-12">
                  {summary || (
                    <Text className="italic opacity-50">
                      Summary pending or unavailable.
                    </Text>
                  )}
                </Text>

                {/* ── PART C: KEY TAKEAWAYS ── */}
                {takeaways.length > 0 && (
                  <View className="p-8 border bg-black/20 border-white/5 rounded-[32px]">
                    <Text className="text-white/40 font-black text-[10px] uppercase tracking-[4px] mb-6">
                      Key Takeaways
                    </Text>
                    <View className="gap-y-4">
                      {takeaways.map((point, idx) => (
                        <View key={idx} className="flex-row items-start">
                          <View className="items-center justify-center w-6 h-6 mt-1 mr-4 border rounded-full bg-purple-500/10 border-purple-500/30">
                            <Text className="text-[9px] font-black text-purple-400">
                              {idx + 1}
                            </Text>
                          </View>
                          <Text className="flex-1 text-base font-medium leading-8 text-white/70">
                            {point}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              <View className="w-full h-px mb-16 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              {/* ── PART D: SIDE-BY-SIDE TIMELINE AND RAW TEXT ── */}
              {/* Using standard flex-col to flex-row for responsive layout */}
              <View className="flex-col gap-12 lg:flex-row lg:gap-16">
                {/* ── LEFT COLUMN: TIMELINE MAPPING ── */}
                {chapters.length > 0 && (
                  <View className="w-full lg:w-1/3">
                    <View className="flex-row items-center mb-10">
                      <Milestone size={20} color="#C084FC" />
                      <Text className="text-white/50 text-[11px] font-black uppercase tracking-[4px] ml-4">
                        Chapters
                      </Text>
                    </View>

                    <View className="relative pl-2 md:pl-4">
                      {/* Continuous Vertical Line */}
                      <View className="absolute left-[39px] md:left-[43px] top-4 bottom-4 w-[2px] bg-white/10 rounded-full" />

                      {chapters.map((chapter, idx) => (
                        <View
                          key={idx}
                          className="relative flex-row items-start mb-10 group"
                        >
                          {/* Glowing Node Dot */}
                          <View className="absolute left-[34px] md:left-[38px] top-[14px] w-[12px] h-[12px] rounded-full bg-[#07070E] border-[2px] border-purple-500 shadow-[0_0_15px_#C084FC] z-10 transition-transform group-hover:scale-125 group-hover:bg-purple-400" />

                          {/* Timestamp Label */}
                          <View className="items-end w-12 pt-1 pr-6 md:w-14">
                            <Text className="text-[10px] font-bold font-mono text-purple-400/80 group-hover:text-purple-400 transition-colors">
                              {chapter.timestamp}
                            </Text>
                          </View>

                          {/* Chapter Text */}
                          <View className="flex-1 pl-4">
                            <Text className="mb-2 text-base font-black tracking-tight text-white/90">
                              {chapter.title}
                            </Text>
                            {chapter.description && (
                              <Text className="text-sm font-medium leading-relaxed transition-colors text-white/50 group-hover:text-white/80">
                                {chapter.description}
                              </Text>
                            )}
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* ── RIGHT COLUMN: RAW VERBATIM TRANSCRIPT ── */}
                <View
                  className={cn(
                    'w-full',
                    chapters.length > 0 ? 'lg:w-2/3' : 'lg:w-full',
                  )}
                >
                  <View className="flex-row items-center mb-10">
                    <Zap size={20} color="#34D399" />
                    <Text className="text-white/50 text-[11px] font-black uppercase tracking-[4px] ml-4">
                      Transcript
                    </Text>
                  </View>

                  {transcriptText ? (
                    <View className="p-8 border bg-black/20 border-white/5 rounded-[32px] relative overflow-hidden">
                      <View
                        className="absolute top-0 right-0 w-full h-40 bg-emerald-500/5 blur-[80px]"
                        pointerEvents="none"
                      />

                      {/* The Full Text Box */}
                      <Text
                        className="text-base md:text-lg font-medium leading-[36px] md:leading-[42px] tracking-wide text-white/70"
                        style={{ textAlign: 'justify' }}
                      >
                        {transcriptText}
                      </Text>

                      {/* Metadata Footer for the text */}
                      <View className="flex-row items-center justify-between pt-8 mt-12 border-t border-white/5">
                        <View>
                          <Text className="text-white/30 text-[9px] font-black uppercase tracking-[3px]">
                            Extraction Method
                          </Text>
                          <Text className="mt-1.5 font-mono text-[10px] uppercase text-emerald-400/60">
                            {extractionMethod || 'SYSTEM_DEFAULT'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <View className="items-center justify-center p-16 border border-white/5 rounded-[32px] bg-black/20">
                      <Terminal size={32} color="#ffffff20" />
                      <Text className="mt-6 font-mono text-xs text-white/30 uppercase tracking-[4px]">
                        Transcript not available
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}
        </GlassCard>
      </Animated.View>
    );
  },
);

// ══════════════════════════════════════════════════════════════════════════════
// 4. CONCLUDING SYNTHESIS BOX
// ══════════════════════════════════════════════════════════════════════════════
const ConcludingSynthesis = React.memo(({ conclusion }: { conclusion?: string }) => (
  <Animated.View
    entering={FadeInDown.duration(900).springify()}
    className="mb-20"
  >
    <GlassCard
      glowColor="lime"
      className="p-8 md:p-12 bg-emerald-500/[0.02] border-emerald-500/10 rounded-[40px]"
    >
      <View className="flex-row items-center justify-center mb-6">
        <ShieldCheck size={28} color="#34D399" />
      </View>
      <Text className="text-emerald-400 font-black text-xs md:text-sm uppercase tracking-[6px] text-center mb-6">
        Concluding Synthesis
      </Text>
      <Text className="px-4 text-base font-medium leading-relaxed text-center text-white/70 md:text-lg md:px-10">
        {conclusion || 'Analysis complete. All intelligence has been extracted and preserved.'}
      </Text>
    </GlassCard>
  </Animated.View>
));

// ══════════════════════════════════════════════════════════════════════════════
// 5. MASTER PAGE CONTROLLER
// ══════════════════════════════════════════════════════════════════════════════
export default function MasterIntelligenceView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = Dimensions.get('window');
  const isMobile = screenWidth < 768;

  // ─── QUERY ENGINE ───
  const { data: videoRecord, isLoading, error } = useVideoData(id);
  const scrollY = useSharedValue(0);

  // ─── DATA DESTRUCTURING & STRICT TYPE SAFETY (null handled) ───
  const insights = videoRecord?.ai_insights;
  const transcript = videoRecord?.transcripts?.[0];

  const chapters = useMemo<Chapter[]>(() => {
    if (!insights?.chapters) return [];
    return Array.isArray(insights.chapters)
      ? (insights.chapters as unknown as Chapter[])
      : [];
  }, [insights]);

  const takeaways = useMemo<string[]>(() => {
    if (!insights?.key_takeaways) return [];
    return Array.isArray(insights.key_takeaways)
      ? (insights.key_takeaways as string[])
      : [];
  }, [insights]);

  const seoMetadata = useMemo(() => {
    if (!insights?.seo_metadata)
      return { suggested_titles: [], description: '', tags: [] };
    const raw = insights.seo_metadata as Record<string, any>;
    return {
      suggested_titles: Array.isArray(raw.suggested_titles)
        ? raw.suggested_titles
        : [],
      description: typeof raw.description === 'string' ? raw.description : '',
      tags: Array.isArray(raw.tags) ? raw.tags : [],
    };
  }, [insights]);

  const displayTitle =
    seoMetadata.suggested_titles[0] ||
    videoRecord?.title ||
    'Decrypted Media Payload';
  const isProcessing =
    videoRecord?.status === 'transcribing' ||
    videoRecord?.status === 'ai_processing' ||
    videoRecord?.status === 'queued';
  const isCompleted = videoRecord?.status === 'completed';

  // ─── EXPORT DISPATCHER ───
  const handleExport = useCallback(
    async (format: 'txt' | 'srt' | 'json' | 'md') => {
      if (!videoRecord || !transcript) return;
      const exportPayload = {
        video: videoRecord as unknown as Video,
        transcript: transcript as unknown as Transcript,
        insights: insights as unknown as AiInsights,
      };
      const options = {
        format,
        includeTimestamps: true,
        includeSpeakers: true,
        includeSummary: true,
        includeChapters: true,
      };

      try {
        const result = ExportBuilder.exportTranscript(exportPayload, options);
        if (Platform.OS === 'web') {
          ExportBuilder.downloadExport(result);
        } else {
          await Clipboard.setStringAsync(result.content);
          alert(
            `Exported ${format.toUpperCase()} payload copied to clipboard.`,
          );
        }
      } catch (err) {
        console.error('[Export Failure]', err);
      }
    },
    [videoRecord, transcript, insights],
  );

  // ─── ANIMATED STYLES ───
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(2, 2, 5, ${interpolate(scrollY.value, [0, 50], [0, 0.9])})`,
    borderBottomWidth: 1,
    borderBottomColor: `rgba(255, 255, 255, ${interpolate(scrollY.value, [0, 50], [0, 0.08])})`,
    backdropFilter:
      Platform.OS === 'web'
        ? `blur(${interpolate(scrollY.value, [0, 50], [0, 20])}px)`
        : undefined,
  }));

  // ─── FATAL ERROR STATE ───
  if (error || (!isLoading && !videoRecord)) {
    return (
      <View className="flex-1 bg-[#020205] items-center justify-center p-6 md:p-12 z-50">
        <AmbientEngine />
        <GlassCard
          glowColor="pink"
          className="items-center w-full max-w-lg p-10 md:p-16 border-rose-500/20 bg-[#0a0a14]/90 z-50"
        >
          <AlertCircle size={48} color="#F43F5E" className="mb-8" />
          <Text className="mb-4 text-2xl font-black tracking-widest text-center uppercase text-rose-500">
            Node Unreachable
          </Text>
          <Text className="mb-12 text-sm leading-relaxed text-center text-white/40">
            The requested intelligence payload could not be located.
          </Text>
          <TouchableOpacity
            onPress={() => router.replace('/history')}
            className="items-center justify-center w-full py-4 transition-colors border bg-white/5 border-white/10 rounded-xl hover:bg-white/10"
          >
            <Text className="text-white font-black text-[10px] uppercase tracking-[4px]">
              Return to Vault
            </Text>
          </TouchableOpacity>
        </GlassCard>
      </View>
    );
  }

  // ─── MAIN RENDER PIPELINE ───
  return (
    <View className="flex-1 bg-[#020205]">
      <StatusBar barStyle="light-content" />
      <AmbientEngine />

      {/* STICKY HEADER */}
      <Animated.View
        style={[
          headerStyle,
          {
            paddingTop: insets.top,
            zIndex: 100,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          },
        ]}
      >
        <View className="flex-row items-center justify-between px-4 py-4 md:px-8">
          <TouchableOpacity
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace('/history')
            }
            className="flex-row items-center p-2 transition-colors rounded-xl hover:bg-white/5 active:scale-95"
          >
            <ArrowLeft size={20} color="#00F0FF" />
            {!isMobile && (
              <Text className="ml-3 text-cyan-400 font-black text-[10px] uppercase tracking-[3px]">
                Vault
              </Text>
            )}
          </TouchableOpacity>
          <View className="flex-row items-center gap-4">
            <View
              className={cn(
                'px-4 py-1.5 rounded-full border flex-row items-center shadow-lg',
                isCompleted
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-blue-500/10 border-blue-500/30',
              )}
            >
              {isProcessing && (
                <ActivityIndicator
                  size="small"
                  color="#60A5FA"
                  className="mr-2"
                />
              )}
              {isCompleted && (
                <CheckCircle2 size={12} color="#34D399" className="mr-2" />
              )}
              <Text
                className={cn(
                  'text-[9px] font-black uppercase tracking-[3px]',
                  isCompleted ? 'text-emerald-400' : 'text-blue-400',
                )}
              >
                {videoRecord?.status
                  ? videoRecord.status.replace('_', ' ')
                  : 'SYNCING'}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* CONTINUOUS DOSSIER SCROLL */}
      <Animated.ScrollView
        className="z-10 flex-1"
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        contentContainerStyle={{
          paddingTop: insets.top + 100,
          paddingBottom: 150,
          paddingHorizontal: isMobile ? 16 : '8%',
          maxWidth: 1400,
          alignSelf: 'center',
          width: '100%',
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. EXPORT MATRIX (Top Level) */}
        {!isProcessing && isCompleted && (
          <ExportControlMatrix onExport={handleExport} />
        )}

        {/* 2. THE UNIFIED MEGA-BOX */}
        <UnifiedMegaBox
          title={displayTitle ?? undefined}
          youtubeUrl={videoRecord?.youtube_url ?? undefined}
          summary={insights?.summary ?? undefined}
          transcriptText={transcript?.transcript_text ?? undefined}
          chapters={chapters}
          takeaways={takeaways}
          isProcessing={isProcessing}
          extractionMethod={transcript?.extraction_method ?? undefined}
          wordCount={transcript?.word_count ?? undefined}
          readingTime={transcript?.reading_time_minutes ?? undefined}
        />

        {/* 3. CONCLUDING SYNTHESIS BOX */}
        {!isProcessing && isCompleted && (
          <ConcludingSynthesis conclusion={(insights?.conclusion as string | null) ?? undefined} />
        )}
      </Animated.ScrollView>
    </View>
  );
}
