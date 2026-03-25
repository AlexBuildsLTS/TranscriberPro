# Supabase / Database / Backend Audit

## Scope reviewed

- `supabase/config.toml`
- `supabase/functions/**`
- `supabase/migrations/20260320223907_remote_schema.sql`
- `supabase/seed.sql`
- `lib/supabase/**`
- `types/database/database.types.ts`

## Executive summary

The backend layer has a few strong foundations: RLS is enabled on application tables, helper functions explicitly set `search_path`, and the main edge function validates bearer tokens in code because gateway JWT verification is disabled for CORS compatibility. However, there are several serious issues:

1. **The project is not Gemini-only** in practice. The main processing flow still depends on **Deepgram** for transcription and stores a default AI model string for **Claude**.
2. **Generated database types are materially out of sync** with the actual schema and can mislead app code.
3. **Database privileges are overly broad** (`GRANT ALL` to `anon`/`authenticated` on public tables and many functions), relying entirely on RLS/policies as the last line of defense.
4. **Several SECURITY DEFINER functions are callable by `anon`/`authenticated` and mutate shared state without ownership checks**.
5. **The auth bootstrap trigger is duplicated**, which risks duplicate side effects on sign-up.
6. **Storage and edge-function access patterns are coarse**, with public/authenticated-wide object reads and a wildcard CORS policy.

---

## Findings

### 1) Critical — Non-Gemini AI providers are still wired into the production backend

**Evidence**

- `supabase/functions/process-video/deepgram.ts`
  - Hard dependency on `DEEPGRAM_API_KEY`
  - Calls `https://api.deepgram.com/v1/listen?...`
  - Returns `method: 'deepgram'`
- `supabase/functions/process-video/index.ts`
  - `import { transcribeAudio } from './deepgram.ts';`
  - Fallback transcription path invokes Deepgram after captions/audio resolution
- `supabase/migrations/20260320223907_remote_schema.sql`
  - `public.ai_insights.ai_model` default is `'claude-sonnet-4-20250514'`

**Why it matters**
This directly conflicts with the user requirement that **Gemini must be the only AI provider used**. Even if Gemini is used for insights, the backend still depends on Deepgram for STT and persists a Claude default model value in the schema.

**Recommended fix**

- Replace Deepgram-based transcription with a Gemini-compatible transcription flow or a non-AI media-to-text path explicitly approved by product requirements.
- Remove all non-Gemini provider identifiers from persisted schema defaults.
- SQL-ready follow-up:
  - `alter table public.ai_insights alter column ai_model set default 'gemini-2.5-flash';`
  - Optionally backfill old values:
    - `update public.ai_insights set ai_model = 'gemini-2.5-flash' where ai_model in ('claude-sonnet-4-20250514', 'deepgram', 'none');`
- Remove/retire `supabase/functions/process-video/deepgram.ts` and the import/call path from `process-video/index.ts` in a later change.

---

### 2) Critical — Generated database types are out of sync with the actual database schema

**Evidence**

- `types/database/database.types.ts` defines a schema centered on:
  - `profiles.email`
  - `profiles.custom_api_key`
  - `profiles.role`
  - `profiles.tier`
  - `profiles.tokens_balance`
  - `videos.user_id`
  - `videos_user_id_fkey`
  - enum `user_role`
  - column `ai_insights.tokens_used`
- `supabase/migrations/20260320223907_remote_schema.sql` actual schema instead contains:
  - `profiles`: only `id`, `full_name`, `avatar_path`, `avatar_url`, timestamps
  - `videos`: `workspace_id`, `uploaded_by`, `batch_id`, no `user_id`
  - no `user_role` enum
  - no `ai_insights.tokens_used`
  - additional real tables missing from types: `batch_jobs`, `usage_logs`, `users`, `workspace_members`, `workspaces`

**Why it matters**
These types are not merely stale; they describe a different data model. This can cause:

- incorrect inserts/updates/select assumptions in app code
- invalid relationship hints
- hidden runtime bugs despite TypeScript “passing”

**Recommended fix**

- Regenerate types from the current local/remote schema and commit them together with migrations.
- Add a release rule that schema migrations and generated TS types must be updated in the same PR.
- Validate app code against the regenerated workspace-based model.

---

### 3) High — Overly broad grants on public tables and functions increase blast radius

**Evidence**

- `supabase/migrations/20260320223907_remote_schema.sql`
  - `GRANT ALL ON TABLE "public"."ai_insights" TO "anon";`
  - same `GRANT ALL` pattern for `batch_jobs`, `profiles`, `transcripts`, `usage_logs`, `users`, `videos`, `workspace_members`, `workspaces`
  - `GRANT ALL` on many functions to `anon`, `authenticated`, `service_role`
  - default privileges also grant `ALL ON FUNCTIONS` and `ALL ON TABLES` to `anon`/`authenticated`

**Why it matters**
RLS may still block rows, but these grants:

- expand the attack surface
- make policy mistakes much more dangerous
- allow execution of mutating functions unless separately constrained
- deviate from least privilege

**Recommended fix**

- Revoke blanket `ALL` grants and grant only required operations.
- Prefer:
  - `GRANT SELECT, INSERT, UPDATE, DELETE` only where truly required
  - `GRANT EXECUTE` only on approved RPCs
- SQL-ready direction:
  - `revoke all on all tables in schema public from anon, authenticated;`
  - `revoke all on all functions in schema public from anon, authenticated;`
  - then re-grant narrowly per table/function based on actual app needs.

---

### 4) High — SECURITY DEFINER mutating functions are callable by broad roles without internal authorization checks

**Evidence**

- `supabase/migrations/20260320223907_remote_schema.sql`
  - `increment_workspace_usage(uuid, numeric)` is `SECURITY DEFINER`
  - `reset_monthly_usage()` is `SECURITY DEFINER`
  - `update_video_status(uuid, video_status, text)` is `SECURITY DEFINER`
  - all three are granted to `anon`, `authenticated`, `service_role`

**Why it matters**
Because they run with elevated privileges, broad execute grants can bypass intended row-level access. In particular:

- `update_video_status` updates any video by id
- `increment_workspace_usage` updates any workspace by id
- `reset_monthly_usage` updates **all** workspaces

Even if the app never calls them directly today, exposed RPC execution is risky.

**Recommended fix**

- Restrict execution to `service_role` unless there is a clear user-facing RPC use case.
- Add explicit authorization checks inside any function that remains callable by authenticated users.
- SQL-ready direction:
  - `revoke execute on function public.update_video_status(uuid, public.video_status, text) from anon, authenticated;`
  - `revoke execute on function public.increment_workspace_usage(uuid, numeric) from anon, authenticated;`
  - `revoke execute on function public.reset_monthly_usage() from anon, authenticated;`
  - `grant execute ... to service_role;`

---

### 5) High — Duplicate auth trigger can create duplicate workspace/user bootstrap side effects

**Evidence**

- `supabase/migrations/20260320223907_remote_schema.sql`
  - `CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users ... EXECUTE FUNCTION public.handle_new_user();`
  - `CREATE TRIGGER trg_on_auth_user_created AFTER INSERT ON auth.users ... EXECUTE FUNCTION public.handle_new_user();`

**Why it matters**
Two triggers on `auth.users` running the same function means sign-up may:

- attempt to create two workspaces
- insert duplicate membership rows
- hit conflicts unpredictably
- leave partial state depending on transaction order and constraints

`users` insert has `ON CONFLICT DO NOTHING`, but `workspaces` creation and `workspace_members` inserts do not fully neutralize double execution.

**Recommended fix**

- Keep exactly one trigger.
- Make `handle_new_user()` idempotent if possible.
- SQL-ready direction:
  - inspect actual trigger names in remote state
  - `drop trigger if exists on_auth_user_created on auth.users;`
  - retain one canonical trigger only
- Consider adding a uniqueness guarantee if every user must own exactly one default workspace bootstrap artifact.

---

### 6) High — `process-video` disables gateway JWT verification and uses wildcard CORS

**Evidence**

- `supabase/config.toml`
  - `[functions.process-video] verify_jwt = false`
- `supabase/functions/_shared/cors.ts`
  - `'Access-Control-Allow-Origin': '*'`
- `supabase/functions/process-video/index.ts`
  - relies on manual `verifyUser(req)` in code

**Why it matters**
Manual verification is acceptable when required for preflight handling, but the current setup means:

- the function is internet-reachable without gateway auth enforcement
- any bug/regression in `verifyUser` becomes a full auth bypass
- wildcard CORS broadens browser-callability from arbitrary origins

**Recommended fix**

- Keep manual JWT verification only if necessary, but tighten surrounding controls:
  - restrict CORS to known app origins
  - ensure every non-OPTIONS path verifies auth before any side effect
  - add structured request validation before processing
- For production config, replace `*` with explicit mobile/web origins.

---

### 7) Medium — Storage read policies are too broad for likely user-owned/private assets

**Evidence**

- `supabase/migrations/20260320223907_remote_schema.sql`
  - `audio_read`: any authenticated user can select any object in bucket `audio`
  - `exports_read`: any authenticated user can select any object in bucket `exports`
  - `avatar_read`: `to public`, any user can read any avatar object

**Why it matters**
If `audio` or `exports` contain per-user/per-workspace assets, any signed-in user can read all of them. That is usually too permissive for transcription exports or uploaded media.

**Recommended fix**

- Scope storage object policies by path convention tied to `auth.uid()` or workspace membership.
- Example SQL-ready direction:
  - require first folder segment to equal `auth.uid()`
  - or map folder segment to `workspace_id` and validate via `public.get_my_workspace_ids()`

---

### 8) Medium — `profiles` and `users` tables look overlapping and can create maintenance drift

**Evidence**

- Actual schema has both:
  - `public.users`
  - `public.profiles`
- `handle_new_user()` inserts into `public.users`
- No trigger shown for creating `public.profiles`
- `profiles` holds display/avatar data
- `users` holds email/full_name/avatar_url/active_workspace_id

**Why it matters**
Two user-adjacent tables with overlapping identity/profile fields create ambiguity:

- which table is canonical?
- which one should frontend query/update?
- how are avatar/full_name fields synchronized?

The out-of-sync TypeScript types reinforce that confusion.

**Recommended fix**

- Consolidate responsibilities:
  - either keep `users` as account/workspace state and `profiles` as public profile projection with explicit sync rules
  - or merge them into one table
- If keeping both, document ownership and add sync triggers or app-layer conventions.

---

### 9) Medium — Mixed/duplicated trigger strategy on `videos.updated_at`

**Evidence**

- `supabase/migrations/20260320223907_remote_schema.sql`
  - `CREATE TRIGGER "handle_updated_at" BEFORE UPDATE ON "public"."videos" EXECUTE FUNCTION "extensions"."moddatetime"('updated_at');`
  - `CREATE TRIGGER "trg_videos_updated_at" BEFORE UPDATE ON "public"."videos" EXECUTE FUNCTION "public"."set_updated_at"();`

**Why it matters**
Two BEFORE UPDATE triggers both modifying `updated_at` on the same table are redundant and can produce non-deterministic maintenance patterns.

**Recommended fix**

- Standardize on one trigger approach across all tables.
- SQL-ready direction:
  - drop one of the two `videos` updated_at triggers and keep a single convention.

---

### 10) Medium — `search_transcripts` is security-definer and granted to `anon`

**Evidence**

- `supabase/migrations/20260320223907_remote_schema.sql`
  - function is `SECURITY DEFINER`
  - granted to `anon`, `authenticated`, `service_role`
  - internally filters by `v.workspace_id = ANY(public.get_my_workspace_ids())`

**Why it matters**
The function does appear to guard rows, but giving `anon` execute access to a definer function is unnecessary and risky. `auth.uid()` will be null for anonymous requests, but least privilege still argues against public execution.

**Recommended fix**

- Revoke execute from `anon`.
- Keep `authenticated` only if app uses it directly.
- Consider `SECURITY INVOKER` if definer privileges are not actually needed.

---

### 11) Medium — Edge function contains a hardcoded YouTube API key-like value

**Evidence**

- `supabase/functions/process-video/index.ts`
  - POST to `https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8...`

**Why it matters**
Even if this is a public Innertube key pattern rather than a private credential, hardcoding external platform keys/capabilities in source is brittle and can break unexpectedly. It also complicates security review and provider-change management.

**Recommended fix**

- Externalize configurable upstream constants.
- Add a comment clarifying whether the key is intentionally public/embedded or replace with a managed setting if policy requires.

---

### 12) Medium — `process-video` returns HTTP 200 even on fatal failure

**Evidence**

- `supabase/functions/process-video/index.ts`
  - catch block returns `status: 200` with `{ success: false, error: message }`

**Why it matters**
This weakens observability, retries, and upstream error handling. Clients, logs, and monitoring may treat failures as successes.

**Recommended fix**

- Return appropriate 4xx/5xx status codes while still updating video status in DB.
- Reserve 200 for successful processing only.

---

### 13) Low — `seed.sql` is empty despite a non-trivial local schema

**Evidence**

- `supabase/seed.sql` is empty
- `supabase/config.toml` has `[db.seed] enabled = true`

**Why it matters**
Local onboarding, reproducible QA, and RLS testing are harder without representative seed data.

**Recommended fix**

- Add minimal non-sensitive seed fixtures for:
  - one workspace
  - one user/profile pair
  - one video
  - one transcript
  - one ai_insights row
- Ensure seed paths reflect the workspace model, not stale `profiles/videos.user_id` assumptions.

---

### 14) Low — Comment/config references to OpenAI inside Supabase config should be cleaned up for Gemini-only clarity

**Evidence**

- `supabase/config.toml`
  - comment: `# OpenAI API Key to use for Supabase AI in the Supabase Studio.`

**Why it matters**
This is only a comment, not active coupling. Still, given the explicit “Gemini only” requirement, such references can confuse maintainers.

**Recommended fix**

- Add internal docs clarifying that Supabase Studio AI features are not used in this project.
- No schema change needed.

---

## Positive patterns worth keeping

- `supabase/functions/_shared/auth.ts` verifies bearer tokens explicitly before processing.
- `createAdminClient()` disables session persistence/refresh, which is appropriate for server-side admin usage.
- Helper SQL functions set `search_path` explicitly, which reduces SECURITY DEFINER risk.
- RLS is enabled across the core public app tables.
- Transcript search indexes (`GIN` FTS + trigram) are a good fit for transcript retrieval workloads.

---

## Type alignment notes

`types/database/database.types.ts` does **not** align with current backend usage expectations:

- actual backend writes to `videos.workspace_id`, `videos.uploaded_by`, `transcripts`, `ai_insights`
- generated types expose a simpler old model with `videos.user_id` and a much richer `profiles` table that does not exist in SQL
- several real tables used for the workspace model are absent from generated types

This should be treated as a blocking maintenance issue before making substantial frontend/backend changes.

---

## Suggested SQL remediation backlog

These are phrased so they can be translated into executable Supabase SQL later:

1. **Gemini-only cleanup**
   - Change `public.ai_insights.ai_model` default to a Gemini model string.
   - Backfill non-Gemini `ai_model` values.

2. **Privilege hardening**
   - Revoke blanket table/function/default privileges from `anon` and `authenticated`.
   - Re-grant only required operations.

3. **Function hardening**
   - Revoke execute on `public.update_video_status`, `public.increment_workspace_usage`, `public.reset_monthly_usage` from `anon`/`authenticated`.
   - Keep `service_role` execute only unless a user-facing RPC is required.

4. **Trigger cleanup**
   - Drop the duplicate `auth.users` bootstrap trigger.
   - Drop one of the duplicate `videos.updated_at` triggers.

5. **Storage policy tightening**
   - Replace bucket-wide authenticated reads with path-scoped owner/workspace checks.

6. **Schema/type synchronization**
   - Regenerate `types/database/database.types.ts` from the current schema after migration cleanup.

**Recommended fix**

- Add internal docs clarifying that Supabase Studio AI features are not used in this project.
- No schema change needed.

---

## Positive patterns worth keeping

- `supabase/functions/_shared/auth.ts` verifies bearer tokens explicitly before processing.
- `createAdminClient()` disables session persistence/refresh, which is appropriate for server-side admin usage.
- Helper SQL functions set `search_path` explicitly, which reduces SECURITY DEFINER risk.
- RLS is enabled across the core public app tables.
- Transcript search indexes (`GIN` FTS + trigram) are a good fit for transcript retrieval workloads.

---

## Type alignment notes

`types/database/database.types.ts` does **not** align with current backend usage expectations:

- actual backend writes to `videos.workspace_id`, `videos.uploaded_by`, `transcripts`, `ai_insights`
- generated types expose a simpler old model with `videos.user_id` and a much richer `profiles` table that does not exist in SQL
- several real tables used for the workspace model are absent from generated types

This should be treated as a blocking maintenance issue before making substantial frontend/backend changes.

---

## Suggested SQL remediation backlog

These are phrased so they can be translated into executable Supabase SQL later:

1. **Gemini-only cleanup**
   - Change `public.ai_insights.ai_model` default to a Gemini model string.
   - Backfill non-Gemini `ai_model` values.

2. **Privilege hardening**
   - Revoke blanket table/function/default privileges from `anon` and `authenticated`.
   - Re-grant only required operations.

3. **Function hardening**
   - Revoke execute on `public.update_video_status`, `public.increment_workspace_usage`, `public.reset_monthly_usage` from `anon`/`authenticated`.
   - Keep `service_role` execute only unless a user-facing RPC is required.

4. **Trigger cleanup**
   - Drop the duplicate `auth.users` bootstrap trigger.
   - Drop one of the duplicate `videos.updated_at` triggers.

5. **Storage policy tightening**
   - Replace bucket-wide authenticated reads with path-scoped owner/workspace checks.

6. **Schema/type synchronization**
   - Regenerate `types/database/database.types.ts` from the current schema after migration cleanup.
