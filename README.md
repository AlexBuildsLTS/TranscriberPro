# ⚡ VeraxAI — Transcriber Intelligence Engine

<div align="center">

[![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20iOS%20%7C%20Android-0A0D14.svg?style=flat-square&logo=expo)](https://expo.dev)
[![Framework](https://img.shields.io/badge/Framework-React%20Native%200.83-61DAFB.svg?style=flat-square&logo=react)](https://reactnative.dev)
[![Backend](https://img.shields.io/badge/Backend-Supabase-3ECF8E.svg?style=flat-square&logo=supabase)](https://supabase.com)
[![AI](https://img.shields.io/badge/AI-Gemini%203.1%20Flash--Lite-4285F4.svg?style=flat-square&logo=google)](https://ai.google.dev)
[![Deploy](https://img.shields.io/badge/Deploy-Vercel-000000.svg?style=flat-square&logo=vercel)](https://veraxai.vercel.app/)

**Supabase Ref:** `jhcgkqzjabsitfilajuh`

</div>

---

## 🌐 Universal Audio Intelligence 🌐

**VeraxAI** is a transcription and audio-intelligence platform engineered for the modern digital landscape. this application delivers lightning-fast, 95%+ accurate video-to-text conversion

Designed for content creators and compliance teams, VeraxAI utilizes a multi-stage AI pipeline powered by **Google Gemini 3.1 Flash-Lite** and **Deepgram Nova-2** to generate SEO metadata, chapter markers, and actionable insights — all within a fluid, Reanimated-driven "Liquid Neon" dark glassmorphism interface

---

## 🛡️ The 5 Technical Moats

| Strategic Pillar                | Technological Implementation        | Market Value Proposition                                                                  |
| :------------------------------ | :---------------------------------- | :---------------------------------------------------------------------------------------- |
| **Waterfall Cost Optimization** | Tiered Extraction (`process-video`) | Attempts $0 scraping via native captions first. Falls back to Deepgram only if necessary. |
| **Cascading API Rotation**      | UI-Managed Fallback Matrix          | AI autonomously rotates through database-injected API keys to bypass rate limits.         |
| **Neural Analytics**            | Real-time Telemetry Engine          | Live token burn tracking and SaaS MRR forecasting integrated into the Admin Root.         |
| **Hybrid Edge Architecture**    | Deno + Supabase Functions           | Zero-latency processing with strict schema enforcement for 100% valid JSON payloads.      |
| **"Liquid Neon" UX**            | React Native + Reanimated 4.2       | Hardware-accelerated GlassCards and Touch-Safe Ambient Orbs at 120fps.                    |

---

### The Universal Architecture

```mermaid
graph TD;
    %% Core Nodes
    Input["🔗 Any URL / Upload"]
    Edge["🌩️ Deno Edge Resolver (WASM)"]
    STT["🎙️ Deepgram Nova-2"]
    LLM["🧠 Gemini 3.1 Flash-Lite"]
    DB["🗄️ Supabase PostgreSQL"]
    UI["📱 VeraxAI Clients"]

    %% Flow
    Input -->|Media Stream| Edge
    Edge -->|Universal Audio Extraction| STT
    STT -->|diarize: true / JSON| DB
    DB -->|Trigger Synthesis| LLM
    LLM -->|Speaker-Mapped Insights| DB
    DB -->|Realtime WebSocket| UI

    %% Styling based on Liquid Neon System
    style Input fill:#020205,stroke:#00F0FF,stroke-width:2px,color:#fff
    style Edge fill:#020205,stroke:#8A2BE2,stroke-width:3px,color:#fff
    style STT fill:#020205,stroke:#FF007F,stroke-width:2px,color:#fff
    style LLM fill:#020205,stroke:#32FF00,stroke-width:2px,color:#fff
    style DB fill:#020205,stroke:#00F0FF,stroke-width:2px,color:#fff
    style UI fill:#020205,stroke:#8A2BE2,stroke-width:2px,color:#fff
```

## 🚀 Feature Modules & Micro-Architectures

Every feature in VeraxAI is decoupled and designed for absolute scalability. Below are the architectural flows for our core sub-systems.

### 1. Multi-Language AI Synthesis

_Current System constraint: Raw STT extraction captures the native language. Multi-language output (translation, localization, dialect adaptation) is exclusively handled by Gemini 3.1 Flash-Lite in the Tier 4 synthesis stage._

```mermaid
graph LR
    A["Raw Transcript (e.g., Swedish)"] --> B["Deno Edge: insights.ts"]
    B -->|Prompt Payload + Target Locale| C["🧠 Gemini 3.1 Flash-Lite"]
    C -->|Auto-Translation| D["Localized Summary"]
    C -->|Cross-lingual Indexing| E["Localized Chapters"]
    C -->|Market Adaptation| F["Localized SEO Tags"]

    style A fill:#020205,stroke:#00F0FF,stroke-width:2px,color:#fff
    style B fill:#020205,stroke:#8A2BE2,stroke-width:2px,color:#fff
    style C fill:#020205,stroke:#32FF00,stroke-width:2px,color:#fff
    style D fill:#020205,stroke:#FF007F,stroke-width:1px,color:#fff
    style E fill:#020205,stroke:#FF007F,stroke-width:1px,color:#fff
    style F fill:#020205,stroke:#FF007F,stroke-width:1px,color:#fff
```

### 2. Real-Time Telemetry & UI Feedback

_Utilizes Supabase Realtime (PostgreSQL logical replication) bridged to React Query to update the Liquid Neon interface at 120fps without manual polling._

```mermaid
graph TD
    DB[("PostgreSQL trigger \n (UPDATE videos.status)")] --> WAL["Write-Ahead Log (WAL)"]
    WAL --> Realtime["Supabase Realtime Channel"]
    Realtime -->|WebSocket Payload| Client["React Native Client"]
    Client -->|Zustand Update| UI["GlassCard Processing Loader (SVG)"]

    style DB fill:#020205,stroke:#00F0FF,stroke-width:2px,color:#fff
    style WAL fill:#020205,stroke:#00F0FF,stroke-width:1px,color:#fff
    style Realtime fill:#020205,stroke:#32FF00,stroke-width:2px,color:#fff
    style Client fill:#020205,stroke:#8A2BE2,stroke-width:1px,color:#fff
    style UI fill:#020205,stroke:#8A2BE2,stroke-width:2px,color:#fff
```

### 3. Executive Summaries, Exports & SEO

_Data formatting pipeline bridging the AI output directly to user-facing clipboards and file downloads._

```mermaid
graph LR
    DB["ai_insights JSONB"] --> Query["useVideoData Hook"]
    Query --> UI["[id].tsx View"]
    UI --> EX1["Export JSON"]
    UI --> EX2["Export Markdown"]
    UI --> EX3["Export SRT/VTT"]

    style DB fill:#020205,stroke:#00F0FF,stroke-width:2px,color:#fff
    style Query fill:#020205,stroke:#8A2BE2,stroke-width:2px,color:#fff
    style UI fill:#020205,stroke:#8A2BE2,stroke-width:1px,color:#fff
    style EX1 fill:#020205,stroke:#FF007F,stroke-width:1px,color:#fff
    style EX2 fill:#020205,stroke:#FF007F,stroke-width:1px,color:#fff
    style EX3 fill:#020205,stroke:#FF007F,stroke-width:1px,color:#fff
```

### 4. 2026 Target: Universal Extraction & Diarization

_Next-generation features bypassing specific platform restrictions utilizing Edge WASM binaries and Deepgram's native speaker tagging._

```mermaid
graph TD
    Input["Any Media URL (1000+ Domains)"] --> WASM["Edge WASM Extractor (yt-dlp port)"]
    WASM -->|Raw Audio| DG["Deepgram STT (diarize=true)"]
    DG --> Map{"Speaker Mapped Array"}
    Map -->|Speaker 1| T1["Timestamp"]
    Map -->|Speaker 2| T2["Timestamp"]
    T1 & T2 --> Gem["Gemini 3.1: Dialogue Summary"]

    style Input fill:#020205,stroke:#00F0FF,stroke-width:2px,color:#fff
    style WASM fill:#020205,stroke:#8A2BE2,stroke-width:2px,color:#fff
    style DG fill:#020205,stroke:#FF007F,stroke-width:2px,color:#fff
    style Map fill:#020205,stroke:#FF007F,stroke-width:1px,color:#fff
    style T1 fill:#020205,stroke:#FF007F,stroke-width:1px,color:#fff
    style T2 fill:#020205,stroke:#FF007F,stroke-width:1px,color:#fff
    style Gem fill:#020205,stroke:#32FF00,stroke-width:2px,color:#fff
```

---

**Speaker Diarization Mapping:** The STT engine separates audio into distinct speakers (Speaker 1, Speaker 2). Gemini 3.1 synthesizes this into dialogue-aware chapters (e.g., "Interviewer asked X, Guest answered Y").

**Universal URL Parsing (Edge Extensions):** Moving beyond simple regex to utilizing Rust/WASM-based proxy extractors within the Edge environment, allowing users to paste a URL from over 1,000+ supported audio/video hosting sites.

**Browser Extension Integration:** 1-click execution from any active webpage, beaming the current browser audio stream directly to the VeraxAI `process-video` pipeline via REST API.

## 🗺️ The Pipeline Logic (Current)

This diagram illustrates the **Waterfall Cost Protocol**. If Layer 1 is successful, the system completely bypasses expensive API layers.

```mermaid
sequenceDiagram
    autonumber
    participant User as VeraxAI Client
    participant DB as Supabase (PostgreSQL)
    participant Edge as Deno Edge: process-video
    participant L1 as L1: Caption Scraper ($0)
    participant L2 as L2: Audio Proxy (Premium)
    participant STT as L3: Deepgram Nova-2
    participant AI as L4: Gemini 3.1 Flash-Lite

    User->>DB: 1. INSERT video (status: queued)
    User->>Edge: 2. Invoke Orchestrator
    Edge->>DB: 3. UPDATE status: downloading

    rect rgb(2, 2, 5)
    Note over Edge, L1: TIER 1: Zero-Cost Native Scrape
    Edge->>L1: Attempt XML/JSON3 Scrape
    L1-->>Edge: Success? (Return Transcript)
    end

    alt Scraping Success
        Edge->>DB: 4a. INSERT transcripts (method: captions)
    else Scraping Failed
        rect rgb(10, 0, 20)
        Note over Edge, STT: TIER 2 & 3: Sovereign Fallback
        Edge->>L2: Resolve Audio Stream
        L2-->>Edge: Valid audio_url
        Edge->>STT: Transcribe Audio Stream
        STT-->>Edge: Return NOVA-2 Transcript
        Edge->>DB: 4b. INSERT transcripts (method: deepgram)
        end
    end

    Edge->>DB: 5. UPDATE status: ai_processing

    rect rgb(5, 20, 5)
    Note over Edge, AI: TIER 4: AI Synthesis Rotation
    Edge->>AI: generateInsights (Primary Key -> Fallback Matrix)
    AI-->>Edge: { summary, chapters, takeaways, seo }
    Edge->>DB: 6. UPSERT ai_insights (Track Token Burn)
    end

    Edge->>DB: 7. UPDATE status: completed
    DB-->>User: 8. Realtime WebSocket Update
```

---

| FEATURES                   | TECHNICAL DETAILS                                                          |
| :------------------------- | :------------------------------------------------------------------------- |
| **1. Multi-Language**      | Auto-detects and transcribes 30+ languages with industry-leading accuracy  |
| **2. Real-time Telemetry** | Watch pipeline metrics advance live as your media processes via WebSockets |
| **3. Premium Exports**     | Export instantly to Markdown, SRT, VTT, JSON, or Plain Text                |
| **4. Executive Summaries** | AI generates C-Suite level summaries using Gemini 3.1 Flash-Lite           |
| **5. SEO Metadata**        | Auto-extracts tags and suggested titles for content publishers             |
| **6. Speaker Diarization** | _(2026)_ Millisecond-precise segmentation mapped to distinct speakers      |
| **7. Universal Extractor** | _(2026)_ Edge-deployed WASM parsers to extract audio from 1,000+ domains   |

```VeraxAI/
├── app/                              # EXPO ROUTER (FILE-BASED)
│   ├── admin/                        # ENTERPRISE COMMAND CENTER
│   │   ├── index.tsx                 # Telemetry & SaaS Forecaster
│   │   ├── keys.tsx                  # Secure API Vault & Token Burn Charts
│   │   └── users.tsx                 # Identity Registry & Access Control
│   ├── settings/                     # USER CONFIGURATION ENGINE
│   │   └── security.tsx              # Biometrics & Personal API Vault
│   └── video/                        # ANALYTICS VIEW
│       └── [id].tsx                  # Chronologically mapped insights
├── components/                       # ATOMIC DESIGN SYSTEM
│   ├── ui/                           # LIQUID NEON COMPONENTS
│   │   ├── GlassCard.tsx             # Hardware-accelerated containers
│   │   └── ProcessingLoader.tsx      # SVG orbital spinner
├── hooks/                            # DATA ORCHESTRATION (REACT QUERY)
│   └── mutations/useProcessVideo.ts  # Cross-platform safe UUID dispatcher
├── supabase/                         # BACKEND INFRASTRUCTURE
│   └── functions/process-video/
│                └── index.ts         # Master Pipeline Orchestrator
│
└── assets/                           # BRANDED MEDIA ASSETS
```

### 2026 Feature Roadmap

- Future implementations: universal extraction on the Edge cross-compiling tools like `yt-dlp` into WASM or utilize a lightweight third-party API proxy. Deepgram natively accepts a `diarize=true` query parameter, so that implementation on the `deepgram.ts` edge function will be a trivial flag update once the UI is ready to render speaker tags

- ## 🚀 Universal Diarization Engine

Our core roadmap for 2026 expands VeraxAI beyond standard platforms (YouTube/Vimeo/TikTok) into a **Universal Audio Intelligence** platform. By migrating extraction tasks directly to the Deno Edge using specialized WebAssembly (WASM) resolvers, we can process **ANY** URL. Combined with native Speaker Diarization, the platform will identify _who_ is speaking, unlocking potential for meeting summaries and podcasts
