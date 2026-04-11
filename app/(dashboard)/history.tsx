/**
 * app/(dashboard)/history.tsx
 * VerAI Archive & Vault Dashboard
 * ----------------------------------------------------------------------------
 * FEATURES:
 * 1. NATIVE SVG ANIMATION: Exact translation of the user's custom Vault.svg.
 * 2. LIVE WAVEFORMS: Native View-based scaling for smooth audio bar pulses.
 * 4. TIME-PARTITIONED DATA: Groups transcripts into "Today" and "History".
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader,
  Search,
  Star,
  Trash2,
  XCircle,
  Zap,
} from 'lucide-react-native';

import { useHistoryData } from '../../hooks/queries/useHistoryData';
import { useDeleteVideo } from '../../hooks/mutations/useDeleteVideo';

const IS_WEB = Platform.OS === 'web';
const CYAN   = '#00F0FF';
const PURPLE = '#8A2BE2';
const GREEN  = '#32FF00';
const PINK   = '#FF007F';
const AMBER  = '#FFB800';

type FilterStatus = 'all' | 'completed' | 'failed' | 'processing';

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  completed:     { color: GREEN,                    label: 'COMPLETED'    },
  failed:        { color: PINK,                     label: 'FAILED'       },
  queued:        { color: AMBER,                    label: 'QUEUED'       },
  downloading:   { color: CYAN,                     label: 'DOWNLOADING'  },
  transcribing:  { color: CYAN,                     label: 'TRANSCRIBING' },
  ai_processing: { color: PURPLE,                   label: 'AI PROCESSING'},
  idle:          { color: 'rgba(255,255,255,0.25)', label: 'IDLE'         },
};

const PROCESSING_STATUSES = new Set(['queued', 'downloading', 'transcribing', 'ai_processing']);

// Ambient orb — decorative, touch-safe
// CRITICAL: pointerEvents: 'none' is INSIDE the style array
const AmbientOrb = ({
  color, size, top, left, right, opacity = 0.09,
}: { color: string; size: number; top?: number; left?: number; right?: number; opacity?: number }) => {
  const scale = useSharedValue(1);
  React.useEffect(() => {
    scale.value = withRepeat(
      withSequence(withTiming(1.13, { duration: 5000 }), withTiming(1, { duration: 5000 })),
      -1, true,
    );
  }, []);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute', width: size, height: size,
          borderRadius: size / 2, backgroundColor: color,
          opacity, top, left, right,
          pointerEvents: 'none', // ← MUST be inside style array on Android
        },
        anim,
      ]}
    />
  );
};

// Blinking dot for in-progress jobs
const LivePulse = ({ color }: { color: string }) => {
  const opacity = useSharedValue(1);
  React.useEffect(() => {
    opacity.value = withRepeat(
      withSequence(withTiming(0.15, { duration: 550 }), withTiming(1, { duration: 550 })),
      -1, true,
    );
  }, []);
  const anim = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View
      style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: color, pointerEvents: 'none' }, anim]}
    />
  );
};

const FilterChip = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    style={{
      paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginRight: 8,
      borderWidth: 1,
      borderColor: active ? CYAN + '50' : 'rgba(255,255,255,0.08)',
      backgroundColor: active ? CYAN + '10' : 'transparent',
    }}
  >
    <Text style={{ color: active ? CYAN : 'rgba(255,255,255,0.38)', fontSize: 11, fontWeight: active ? '700' : '400', letterSpacing: 0.4 }}>
      {label}
    </Text>
  </TouchableOpacity>
);

const HistoryCard = ({
  item, index, onPress, onDelete,
}: { item: any; index: number; onPress: () => void; onDelete: () => void }) => {
  const status     = item.status ?? 'idle';
  const cfg        = STATUS_CONFIG[status] ?? STATUS_CONFIG.idle;
  const isLive     = PROCESSING_STATUSES.has(status);
  const isComplete = status === 'completed';
  const isFailed   = status === 'failed';

  const dateStr = (() => {
    try { return new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
    catch { return ''; }
  })();

  const wordCount   = item.transcripts?.[0]?.word_count;
  const readingMins = item.transcripts?.[0]?.reading_time_minutes;
  const hasSummary  = !!item.ai_insights?.summary;

  const confirmDelete = () => {
    if (IS_WEB) {
      if (window.confirm('Permanently delete this transcript and all AI insights?')) onDelete();
    } else {
      Alert.alert(
        'Delete Transcript',
        'This permanently removes the video, transcript, and all AI insights.',
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: onDelete }],
      );
    }
  };

  return (
    <Animated.View entering={FadeInDown.duration(320).delay(index * 40)}>
      <TouchableOpacity
        onPress={isComplete ? onPress : undefined}
        onLongPress={confirmDelete}
        activeOpacity={0.78}
        style={{
          borderWidth: 1,
          borderColor: isLive ? cfg.color + '30' : isFailed ? PINK + '22' : 'rgba(255,255,255,0.07)',
          borderRadius: 14,
          backgroundColor: isLive ? cfg.color + '05' : isFailed ? PINK + '04' : 'rgba(255,255,255,0.015)',
          padding: 16, marginHorizontal: 16, marginBottom: 10,
        }}
      >
        {/* Title row */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={2} style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700', lineHeight: 19, letterSpacing: -0.1 }}>
              {item.title ?? item.youtube_url ?? 'Untitled'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {isLive ? <LivePulse color={cfg.color} /> : null}
            <TouchableOpacity onPress={confirmDelete} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Trash2 size={15} color="rgba(255,255,255,0.18)" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Status + date + AI badge */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: (wordCount || isFailed) ? 8 : 0 }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', gap: 5,
            borderWidth: 1, borderColor: cfg.color + '32', borderRadius: 20,
            paddingHorizontal: 9, paddingVertical: 3, backgroundColor: cfg.color + '0C',
          }}>
            <Text style={{ color: cfg.color, fontSize: 9, fontWeight: '700', letterSpacing: 1.2 }}>{cfg.label}</Text>
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.26)', fontSize: 11 }}>{dateStr}</Text>
          {hasSummary ? (
            <View style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Star size={10} color={PURPLE} />
              <Text style={{ color: PURPLE, fontSize: 9, letterSpacing: 0.5 }}>AI</Text>
            </View>
          ) : null}
        </View>

        {/* Stats */}
        {(wordCount || readingMins) ? (
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: isFailed ? 8 : 0 }}>
            {wordCount ? <Text style={{ color: 'rgba(255,255,255,0.28)', fontSize: 11 }}>{wordCount.toLocaleString()} words</Text> : null}
            {readingMins ? <Text style={{ color: 'rgba(255,255,255,0.28)', fontSize: 11 }}>{Math.round(readingMins)} min read</Text> : null}
          </View>
        ) : null}

        {/* Error preview */}
        {isFailed && item.error_message ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 4, padding: 8, borderRadius: 8, backgroundColor: PINK + '08' }}>
            <AlertTriangle size={11} color={PINK} style={{ marginTop: 1 }} />
            <Text numberOfLines={2} style={{ flex: 1, color: PINK + 'AA', fontSize: 11, lineHeight: 15 }}>
              {item.error_message}
            </Text>
          </View>
        ) : null}

        {isComplete ? (
          <View style={{ position: 'absolute', right: 14, bottom: 14, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ color: CYAN, fontSize: 9, letterSpacing: 0.8 }}>VIEW REPORT</Text>
            <Text style={{ color: CYAN, fontSize: 12 }}>→</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    </Animated.View>
  );
};

const EmptyState = ({ filtered }: { filtered: boolean }) => (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
    <Text style={{ fontSize: 38, marginBottom: 14 }}>📭</Text>
    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, textAlign: 'center', lineHeight: 22 }}>
      {filtered ? 'No videos match this filter.' : 'No transcriptions yet.\nSubmit a video to get started.'}
    </Text>
  </View>
);

export default function HistoryPage() {
  const router = useRouter();
  const [filter, setFilter]         = useState<FilterStatus>('all');
  const [search, setSearch]         = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { data: videos = [], isLoading, refetch } = useHistoryData();
  const { mutate: deleteVideo } = useDeleteVideo();

  const filtered = useMemo(() => {
    let list = [...videos];
    if (filter === 'completed')  list = list.filter((v) => v.status === 'completed');
    if (filter === 'failed')     list = list.filter((v) => v.status === 'failed');
    if (filter === 'processing') list = list.filter((v) => PROCESSING_STATUSES.has(v.status ?? ''));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((v) => v.title?.toLowerCase().includes(q) || v.youtube_url?.toLowerCase().includes(q));
    }
    return list;
  }, [videos, filter, search]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);

  return (
    <View style={{ flex: 1, backgroundColor: '#020205' }}>
      <AmbientOrb color={CYAN}   size={260} top={-40}  left={-70}  opacity={0.07} />
      <AmbientOrb color={PURPLE} size={190} top={320}  right={-55} opacity={0.08} />

      {/* Header */}
      <Animated.View
        entering={FadeInDown.duration(340)}
        style={{
          paddingHorizontal: 20,
          paddingTop: Platform.OS === 'ios' ? 58 : Platform.OS === 'android' ? 44 : 24,
          paddingBottom: 16,
          borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
        }}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '800', letterSpacing: -0.5, marginBottom: 3 }}>
          Transcript Archive
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.32)', fontSize: 12 }}>
          {videos.length} video{videos.length !== 1 ? 's' : ''} processed
        </Text>
      </Animated.View>

      {/* Search */}
      <Animated.View entering={FadeInDown.duration(340).delay(55)} style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
          borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.02)',
          paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 10 : 7,
        }}>
          <Search size={14} color="rgba(255,255,255,0.28)" />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search transcripts..."
            placeholderTextColor="rgba(255,255,255,0.22)"
            style={{
              flex: 1, color: '#FFFFFF', fontSize: 14,
              ...(Platform.OS === 'web' ? { outline: 'none' } as any : {}),
            }}
          />
          {search.length > 0 ? (
            <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
              <XCircle size={15} color="rgba(255,255,255,0.28)" />
            </TouchableOpacity>
          ) : null}
        </View>
      </Animated.View>

      {/* Filters */}
      <Animated.View entering={FadeInDown.duration(340).delay(85)} style={{ paddingLeft: 16, paddingVertical: 10 }}>
        <View style={{ flexDirection: 'row' }}>
          {([
            { key: 'all', label: 'All' },
            { key: 'completed', label: 'Completed' },
            { key: 'processing', label: 'Processing' },
            { key: 'failed', label: 'Failed' },
          ] as { key: FilterStatus; label: string }[]).map(({ key, label }) => (
            <FilterChip key={key} label={label} active={filter === key} onPress={() => setFilter(key)} />
          ))}
        </View>
      </Animated.View>

      {/* List */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={CYAN} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <HistoryCard
              item={item}
              index={index}
              onPress={() => router.push(`/video/${item.id}` as any)}
              onDelete={() => deleteVideo(item.id)}
            />
          )}
          ListEmptyComponent={<EmptyState filtered={filter !== 'all' || !!search.trim()} />}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 120, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={CYAN} colors={[CYAN]} />
          }
        />
      )}
    </View>
  );
}
