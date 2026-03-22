# Transcriber Pro - AI Context & Project Instructions

## Project Overview

Transcriber Pro is an enterprise-grade YouTube transcription SaaS targeting the 2026 market. It focuses on extreme accuracy (95%+), sub-30-second processing times for 10-minute videos, batch capabilities, and multi-language support.

## Tech Stack

- **Frontend Framework:** Expo 54 (React Native) with Expo Router (file-based routing).
- **Language:** Strict TypeScript (No `any` types allowed).
- **Styling:** NativeWind (Tailwind CSS for React Native). Dark mode preferred (`#0A0D14`, `#0D1117`) with glassmorphism UI.
- **State Management:** Zustand (Client state) + TanStack React Query (Server state).
- **Animations:** React Native Reanimated (target: 120fps).
- **Backend / Database:** Supabase (PostgreSQL).
- **Edge/Serverless:** Deno (Supabase Edge Functions).
- **Transcription Engine:** Deepgram Nova-2 (Optimized for speed/accuracy).

## Architectural Rules

1. **State Synchronization:** Avoid database polling. Use Supabase Realtime (`postgres_changes`) to push database changes directly to the Zustand store for buttery-smooth UI updates.
2. **Schema Awareness:** The `transcripts` table has a `1-to-many` relationship with `videos` (to support multiple languages). Queries must handle `transcripts` as an array.
3. **Heavy Processing:** Video downloading and audio extraction (`yt-dlp`) CANNOT happen in Deno Edge Functions due to memory and time limits. Edge functions act as orchestrators, pinging external microservices for heavy lifting, and querying Deepgram for transcription.
4. **Batch Processing:** Handled via the `batch_jobs` table, linking multiple videos to a single workspace event.

## Code Style & Best Practices

- Prioritize modularity. Keep services (`services/`), hooks (`hooks/`), and UI components (`components/ui/`) strictly separated.
- Use standard RESTful or RPC calls to Supabase.
- Always include robust error handling (`try/catch`) in Edge Functions and push failures back to the `videos.status` column as `failed` with an `error_message`.

# TRANSCRIBER-PRO — Project Intelligence

> **Last updated**: 2026-03-19
> **Stack**: Expo SDK 55 · React Native 0.83 · NativeWind v4 · Supabase · Deno Edge Functions
> **AI**: Deepgram Nova-2 (STT) + Gemini 2.5 Pro (primary) + Claude (fallback)

---

## CRITICAL BUG: NativeWind v4 Opacity on Web

**NEVER use `bg-white/[0.01]`, `bg-white/[0.02]`, or any `bg-white/[arbitrary]` in NativeWind className props.**

NativeWind v4 miscompiles arbitrary bracket opacity values to solid white on web. This breaks the entire glassmorphism theme.

**Always use inline style:**

```tsx
// WRONG — renders solid white on web
<View className="bg-white/[0.01]" />

// CORRECT — rgba is preserved
<View style={{ backgroundColor: 'rgba(255,255,255,0.01)' }} />
```

Named opacity values like `bg-white/5`, `bg-white/10` DO work. Only `bg-white/[0.xx]` bracket syntax is broken.

**Detection:** `grep -rn "bg-white/\[" app/ components/`

---

## CRITICAL BUG: NativeWind v4 Dark Mode Conflict

Setting `"userInterfaceStyle": "dark"` in app.json causes NativeWind v4 to throw:
`Cannot manually set color scheme, as dark mode is type 'media'`
(GitHub: nativewind/nativewind#1489)

**Fix:** Use `"userInterfaceStyle": "automatic"` in app.json. Force dark via:

- CSS: `color-scheme: dark` on `:root` in global.css
- iOS: `"infoPlist": { "UIUserInterfaceStyle": "Dark" }` in app.json

---

## SDK 55 Rules

- `newArchEnabled` — removed in SDK 55 (always on). Do NOT include in app.json.
- `jsEngine` — removed in SDK 55 (Hermes only). Do NOT include in app.json.
- `expo-av` — removed in SDK 55. Use `expo-audio` + `expo-video` instead.
- `web.output` — use `"static"` for Expo Router, not `"single"`.
- `@babel/preset-env`, `@babel/preset-react`, `@babel/preset-typescript` — unnecessary with `babel-preset-expo`. Remove from deps.

---

## Architecture

### File Structure

```
transcriber-pro/
├── app/                        # Expo Router (file-based routing)
│   ├── _layout.tsx             # Root: QueryClient + Auth guard + StatusBar
│   ├── (auth)/
│   │   ├── sign-in.tsx         # Email/password login
│   │   └── sign-up.tsx         # Registration + password strength
│   └── (dashboard)/
│       ├── _layout.tsx         # AdaptiveLayout wrapper (sidebar/bottom-nav)
│       ├── index.tsx           # ENGINE — transcription submission
│       ├── history.tsx         # VAULT — transcription history
│       ├── video/[id].tsx      # Video result detail
│       └── settings/
│           ├── index.tsx       # Settings hub
│           ├── profile.tsx     # Name, avatar
│           ├── security.tsx    # Password, biometrics, 2FA
│           └── billing.tsx     # Tier, usage
├── components/
│   ├── animations/FadeIn.tsx   # Reanimated fade wrapper
│   ├── domain/TranscriptViewer.tsx
│   ├── layout/
│   │   ├── AdaptiveLayout.tsx  # Responsive shell (sidebar desktop, bottom-nav mobile)
│   │   └── PageContainer.tsx
│   └── ui/
│       ├── Button.tsx          # Primary/secondary/outline
│       ├── GlassCard.tsx       # ⚠ MUST use inline style for bg
│       ├── Input.tsx           # Text input with label
│       └── ProfileDropdown.tsx
├── hooks/
│   ├── mutations/useDeleteVideo.ts
│   └── queries/
│       ├── useHistoryData.ts
│       ├── useRealtimeVideoStatus.ts  # Supabase Realtime subscription
│       └── useVideoData.ts           # 2s polling until terminal status
├── lib/
│   ├── api/functions.ts        # Edge function wrappers
│   ├── supabase/client.ts      # Supabase client init
│   └── utils.ts                # cn() = clsx + tailwind-merge
├── services/
│   ├── exportBuilder.ts        # SRT, VTT, JSON export
│   └── youtube.ts              # URL validation + ID extraction
├── store/
│   ├── useAuthStore.ts         # Supabase auth session (Zustand)
│   └── useVideoStore.ts        # Video submission orchestration
├── supabase/functions/
│   ├── _shared/                # cors.ts, auth.ts, supabaseAdmin.ts
│   ├── process-video/          # Main pipeline
│   ├── generate-ai-insights/   # Standalone AI regeneration
│   ├── get-captions/           # Server-side caption proxy
│   └── webhook-handler/
├── constants/
│   ├── config.ts               # App limits, tier definitions
│   └── theme.ts                # JS colors for Reanimated
├── types/
│   ├── api/index.ts
│   └── database/database.types.ts
└── utils/
    ├── formatters/time.ts
    ├── validators/auth.ts, youtube.ts
    ├── youtubeAudio.ts
    └── youtubeCaptions.ts
```

### State Management

- **Zustand** (`store/`): Synchronous client state — auth session, active video context
- **TanStack Query** (`hooks/queries/`): Async server state — polling, cache, background refetch
- **Supabase Realtime**: WebSocket subscriptions for live status updates on videos/transcripts/ai_insights

### Processing Pipeline

```
User submits URL → useVideoStore.processVideo()
  ├── Insert video (status: queued)
  ├── Client caption fetch (corsproxy → YouTube timedtext)
  └── Fire process-video edge function
        ├── FastPath: transcript_text provided → skip extraction
        ├── Phase 1: Caption extraction (4 fallback sources)
        ├── Phase 2: Deepgram STT (if no captions)
        └── Phase 3: AI insights (Gemini primary, Claude fallback)
              → summary, chapters, key_takeaways, seo_metadata
              → upsert ai_insights, update status → completed
```

---

## Design System

### Colors

| Token          | Value     | Usage                  |
| -------------- | --------- | ---------------------- |
| background     | `#020205` | App background         |
| neon-cyan      | `#00F0FF` | Primary accent, labels |
| neon-pink      | `#FF007F` | Security/danger accent |
| neon-purple    | `#8A2BE2` | Secondary accent       |
| neon-lime      | `#32FF00` | Success states         |
| neon-orange    | `#FF4500` | Warning/danger zone    |
| text-primary   | `#FFFFFF` | Headings               |
| text-secondary | `#D4D4D8` | Body text              |
| text-muted     | `#A1A1AA` | Hints, labels          |

### Glass Pattern

Every card: transparent bg (`rgba(255,255,255,0.01)` via inline style) + border (`border-white/10`) + backdrop blur (64px via BlurView) + neon glow shadow.

### Screen Template

```tsx
<SafeAreaView className="flex-1 bg-[#020205]">
  {/* Ambient orbs — always behind content */}
  <View className="absolute inset-0 overflow-hidden" pointerEvents="none">
    <NeuralOrb delay={0} color="#00F0FF" />
    <NeuralOrb delay={2500} color="#8A2BE2" />
  </View>
  <ScrollView>{/* Content with GlassCard components */}</ScrollView>
</SafeAreaView>
```

---

## Supabase Schema

### Core Tables

- `workspaces` — multi-tenant container (tier, minutes_used, limits)
- `profiles` — user profile (full_name, avatar_url, avatar_path)
- `videos` — processing records (status enum: queued→downloading→transcribing→ai_processing→completed|failed)
- `transcripts` — STT output (text + JSON + confidence)
- `ai_insights` — AI analysis (summary, chapters, key_takeaways, seo_metadata)
- `usage_logs` — billing/tracking

### Realtime Enabled

`videos`, `transcripts`, `ai_insights`

### RLS

All tables have Row Level Security scoped to workspace membership.

---

## Environment Variables ALL CONFIRMED IN SUPABASE SECRETSD, AND .ENV AND VERCEL

### Client (.env)

```
EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
```

### Edge Function Secrets (Supabase Dashboard) 

```
DEEPGRAM_API_KEY
GEMINI_API_KEY
RAPIDAPI_KEY 
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` auto-injected.

---

## Config Files (Correct State)



### metro.config.js — CORRECT, do not modify

Zustand CJS resolver + withNativeWind wrapper.

### tailwind.config.js — CORRECT, do not modify

nativewind/preset + custom neon colors + blur extensions.

---
```
