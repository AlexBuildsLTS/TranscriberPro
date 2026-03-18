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
    