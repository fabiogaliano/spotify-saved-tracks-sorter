# Model Optimization Implementation Tasks

This document translates `docs/MODEL_OPTIMIZATION_PLAN.md` into a concrete, codebase-aligned task list.

It is intentionally biased toward *integration points* and *software patterns* so you can build the new pipeline end-to-end and cut over (breaking changes are acceptable).

---

## 0) Current Architecture Snapshot (as implemented today)

### Web (Remix) side
- **Matching orchestration**
  - `services/web/app/routes/api.matching.tsx` builds `Playlist` + `Song[]` and calls `matchingService.matchSongsToPlaylist(...)`.
  - Matching results are returned directly to the client.
- **Matching core**
  - `services/web/app/lib/services/matching/MatchingService.ts`
  - Uses:
    - `VectorizationService.vectorizeSong()` and `.vectorizePlaylist()` to get vectors.
    - `SemanticMatcher` (embedding-based) for semantic comparisons (moods/themes).
  - **Note:** `MatchingService` is constructed with `MatchRepository` but does **not** currently persist results.
- **Vectorization client (TS)**
  - `services/web/app/lib/services/vectorization/VectorizationService.ts`
  - Uses **in-memory** `VectorCache` keyed by a naive hash of `JSON.stringify(analysis)`.
  - Track cache key uses `artist-title` string, not the DB `track_id` (collision risk).
  - Hybrid embedding endpoint is used (`/embed/hybrid`) and the Python side forces `creative` model.
- **Supabase persistence currently in place**
  - Analyses: `track_analyses`, `playlist_analyses`.
  - Ground truth membership: `playlist_tracks`.
  - Match table exists: `track_playlist_matches` (upserted by `MatchRepository`, but not actively used by matching route).

### Workers / queue
- **Queue**
  - `services/web/app/lib/services/queue/SQSService.ts` defines an `AnalysisJobPayload` with `type: 'track' | 'playlist'`.
- **Worker**
  - `services/web/workers/analysisWorker.ts` consumes SQS and persists analyses.
  - Progress tracking uses `analysis_jobs` + `JobPersistenceService`.

### Vectorization (Python FastAPI)
- `services/vectorization/api.py`
  - Endpoints: `/embed`, `/embed/batch`, `/embed/hybrid`, `/sentiment`, `/similarity/calculate`.
  - Model selection is via `ModelType` enum (`general/creative/semantic/fast`), not arbitrary `model_name`.
  - `/embed/hybrid` currently pads/truncates on dimension mismatch (not compatible with a strict `pgvector` persistence strategy).

---

## 1) Guiding Architectural Decisions (turn these into “contracts”)

- **DB-first artifacts**
  - Embeddings and playlist profiles should be persisted and treated as *immutable outputs keyed by a content/config hash*.
  - In-memory caches become an L1 optimization only.

- **Version everything that can change semantics**
  - Embedding extractor version (TS), embedding model name/version/dims, reranker model, emotion model, and matching algorithm version.

- **Explicit “model bundle”**
  - Introduce a single config object (in TS) that represents the active set of models:
    - embedding model
    - emotion model
    - reranker model
    - plus algorithm version + config hash

- **Repository pattern for all new persistence**
  - Match existing repository style (`TrackAnalysisRepository`, `MatchRepository`) for new tables.
  - Keep DB access out of `MatchingService` where possible; inject repositories/services.

- **Idempotent background jobs**
  - Use unique constraints + upserts so backfills can restart safely.
  - Track progress in `analysis_jobs` (or a parallel table if you want strict separation).

---

## 1.5) Working Assumptions (for this document)

- We do **not** need backwards compatibility.
- We do **not** need feature flags.
- We optimize for a **single cutover** to the new pipeline.

---

## 2) Phase 0 — Define Source-of-Truth Hashing + Versioning

### 2.1 Define "embedding input contract"
Tasks:
- [x] **[Task]** Decide the canonical text inputs for:
  - **Track document text** (from `SongAnalysis` + metadata)
  - **Playlist query text** (from `PlaylistAnalysis` and/or persisted profile)
  - [Done] Using existing `VectorizationText` structure (metadata/analysis/context) from `analysis-extractors.ts`
- [x] **[Task]** Decide whether E5 uses:
  - a single combined text string, or
  - structured fields (metadata/analysis/context) that are combined on the TS side.
  - [Done] Decision: Structured fields combined on TS side (Python stays "dumb")

Implementation guidance:
- Keep Python "dumb": it embeds/reranks strings; TS owns domain extraction.
- Add an explicit extractor version constant (e.g. `VECTOR_EXTRACTOR_VERSION = 1`) close to `analysis-extractors.ts`.
- [Done] Added `EXTRACTOR_VERSION` in `versioning.ts`, re-exported from `analysis-extractors.ts`

### 2.2 Implement stable hashes (don't reuse current `VectorCache.hashContent()`)
Tasks:
- [x] **[Task]** Add a small hashing utility that:
  - produces a deterministic hash across runs
  - is not sensitive to object key ordering
  - can hash: extracted texts, config objects, and ordered ID sets
  - [Done] Implemented in `hashing.ts` using SHA-256 with `stableStringify()` for key ordering
- [x] **[Task]** Define these hashes:
  - `track_content_hash` -> `hashTrackContent()`
  - `playlist_profile_hash` -> `hashPlaylistProfile()`
  - `config_hash` (matching weights/thresholds) -> `hashMatchingConfig()`
  - `model_bundle_hash` -> `hashModelBundle()`
  - `candidate_set_hash` and `playlist_set_hash` -> `hashCandidateSet()`, `hashPlaylistSet()`
  - [Done] All hash functions implemented with versioned prefixes (e.g., `te_v1_xxx`)

Pattern:
- Use a single "hashing service" (pure functions) and keep it reusable across routes, workers, and services.
- [Done] All functions are pure, exported from `hashing.ts`

### 2.3 Define version identifiers
Tasks:
- [x] **[Task]** Create a version strategy aligned with existing `ANALYSIS_VERSION`:
  - `MATCHING_ALGO_VERSION` (e.g. `matching_v2`)
  - `EMBEDDING_SCHEMA_VERSION` (structure of stored embedding row)
  - `PLAYLIST_PROFILE_VERSION`
  - [Done] All constants defined in `versioning.ts` with `PIPELINE_VERSIONS` combined object

---

## 3) Phase 1 — Offline Evaluation Harness (Repo-tailored)

Goal: measure changes before switching defaults.

Tasks:
- [ ] **[Task] Dataset builder**
  - Read `playlist_tracks` as positives.
  - Create holdout splits per playlist.
  - Sample negatives from the user's liked songs.
- [ ] **[Task] Metrics runner**
  - Run `MatchingService` in an "offline mode" (no UI) and compute NDCG@K, Recall@K, MRR.
  - Ensure reproducibility (seeded sampling).
- [ ] **[Task] Artifact persistence**
  - Store results locally (as the plan suggests) and keep them versioned by model bundle + config hash.

Integration guidance:
- Prefer a *script-style* harness that imports your TS services/repositories (so it exercises the real matching logic).
- Keep it read-only by default (no writes to matches tables unless explicitly enabled).

---

## 4) Phase 2 — Supabase Schema for Vector Persistence

Goal: persist embeddings + profiles with explicit versioning and strict dimensions.

### 4.1 Add pgvector-backed tables
Tasks:
- [ ] **[Task] Create `track_embeddings`**
  - Keys: `track_id`, `embedding_kind`, `model_name`, `model_version`, `dims`, `content_hash`
  - Payload: `embedding` (pgvector)
  - Metadata: timestamps
- [ ] **[Task] Create `playlist_profiles`**
  - Keys: `playlist_id`, `profile_kind`, `model_bundle_hash`, `dims`, `content_hash`
  - Payload: a stored vector + structured aggregates (audio centroid, genre aggregates, emotion buckets)
- [ ] **[Task] Create `track_genres`**
  - Keys: `track_id`, `source`, `source_level`, `content_hash`
  - Payload: `genres[]`, `genres_with_scores` (json)
- [ ] **[Task] Create match caching tables** (recommended new tables rather than overloading `track_playlist_matches`):
  - `match_contexts`
  - `match_results`

### 4.2 Constraints + indexing (critical for idempotency)
Tasks:
- [ ] **[Task] Unique constraints** to guarantee safe upserts for backfills.
- [ ] **[Task] Vector index** for similarity search if you later move to true retrieval.

Notes:
- Even if you don’t use SQL similarity search immediately, persisting vectors still enables stable evaluation and avoids recompute.

---

## 5) Phase 3 — TS Access Layer (Repositories + Services)

Goal: mirror existing repository style and keep matching code clean.

Tasks:
- [ ] **[Task] Implement repositories**
  - `TrackEmbeddingRepository`
  - `PlaylistProfileRepository`
  - `TrackGenreRepository`
  - `MatchContextRepository` / `MatchResultRepository`
- [ ] **[Task] Define "DB-first" read path**
  - For embeddings: `getBy(track_id, kind, model, version, content_hash)`
  - For profiles: `getBy(playlist_id, profile_kind, model_bundle_hash, content_hash)`

Pattern:
- Keep repository methods narrow and composable.
- Add “upsert if missing” helper methods only if they remain deterministic/idempotent.

---

## 6) Phase 4 — Vectorization Service: DB-first Embeddings

Goal: replace `VectorCache` as the source of truth.

Tasks:
- [ ] **[Task] Introduce a new orchestration layer** (recommended name: `EmbeddingService`)
  - Inputs:
    - `track_id` + `SongAnalysis`
    - `playlist_id` + `PlaylistAnalysis`
    - `model bundle`
  - Behavior:
    - Extract canonical text
    - Compute `content_hash`
    - Check DB for persisted embedding
    - If miss: call Python API, validate dims, persist
    - Cache in-memory (L1) only as a performance optimization

Integration guidance:
- Avoid baking DB logic into `DefaultVectorizationService`. Treat it as an HTTP client.
- Replace `artist-title` cache keys with `track.id` / `playlist.id`.

---

## 7) Phase 5 — Vectorization API V2 (Python)

Goal: add E5 embeddings + go_emotions + reranker as the new pipeline API surface.

### 7.1 Embeddings: E5 instruct
Tasks:
- [ ] **[Task] Add E5 model loading** (`intfloat/multilingual-e5-large-instruct`).
- [ ] **[Task] Standardize query/document formatting**
  - Playlist should be treated as query.
  - Track should be treated as document.
- [ ] **[Task] Add a model registry**
  - Map `model_name` → tokenizer/model + dims.
  - Avoid dimension mismatch hacks; reject mismatches instead.

### 7.2 Emotion endpoint (go_emotions)
Tasks:
- [ ] **[Task] Add `/emotions` endpoint** returning distribution (top-N + probabilities).
- [ ] **[Task] Implement bucketing** (28 labels → ~6–8 meta buckets) on the server side OR TS side.

### 7.3 Reranker endpoint
Tasks:
- [ ] **[Task] Add `/rerank` endpoint** using `Qwen/Qwen3-Reranker-0.6B`.
- [ ] **[Task] Define request/response contract**
  - Input: one query string + list of candidate strings
  - Output: scores + ordering

Operational tasks:
- [ ] **[Task] Add timeouts, max batch sizes, and structured logs.**
- [ ] **[Task] Pin model versions and expose them in responses** (so TS can persist `model_version`).

---

## 8) Phase 6 — Playlist Profiling V2 (Persisted)

Goal: make playlist representation explicit, persisted, and invalidatable.

Tasks:
- [ ] **[Task] Implement `PlaylistProfilingService`** that produces a persisted profile record.
  - Inputs:
    - playlist analysis
    - playlist track IDs
    - track embeddings for those tracks
    - track genres
    - audio features aggregates (already in analysis JSON)
    - emotion distributions
  - Outputs:
    - `playlist_profiles` row with:
      - primary vector (centroid)
      - audio centroid
      - genre distribution (structured)
      - emotion bucket distribution
      - content hash

Invalidation design tasks:
- [ ] **[Task] Define what changes playlist profile hash**
  - playlist analysis changes
  - playlist membership changes
  - track embeddings change (new model/version)
  - track genre updates

Integration point:
- `MatchingService.profilePlaylist()` should attempt:
  - DB profile read first
  - fallback to compute-and-persist if missing

---

## 9) Phase 7 — Two-Stage Matching V2

Goal: keep current weighted multi-signal scoring but improve ranking with reranking.

### 9.1 Stage 1 (fast, TS)
Tasks:
- [ ] **[Task] Replace direct calls to `vectorization.vectorizeSong/Playlist`** with calls to the new DB-first embedding/profile services.
- [ ] **[Task] Ensure weights/config are externalized** so `config_hash` is stable.

### 9.2 Stage 2 (slow rerank)
Tasks:
- [ ] **[Task] Build reranker inputs**
  - Query: playlist profile text
  - Candidate docs: per-song profile text
- [ ] **[Task] Rerank top-N** (20–50) and blend into final score.

Persistence tasks:
- [ ] **[Task] Persist which model bundle produced the final ordering** (embedding + reranker + emotions).

Rollout guidance:
- No feature flags. If reranker is part of the active model bundle, it runs.

---

## 10) Phase 8 — Match Caching + Invalidation (`match_context`)

Goal: repeated matching runs should do 0 embeddings and 0 reranks when nothing changed.

Tasks:
- [ ] **[Task] Implement `match_contexts` concept**
  - Includes:
    - user_id
    - model bundle identifiers
    - algorithm version
    - config_hash
    - playlist_set_hash
    - candidate_set_hash
- [ ] **[Task] Implement `match_results`** keyed by `match_context_id`.
- [ ] **[Task] Update `api.matching.tsx` flow**
  - Compute context → check cached results → return cached OR compute+persist.

Integration note:
- Decide whether `track_playlist_matches` is:
  - deprecated (and replaced by match context tables), or
  - retained as a “latest snapshot” table for UI convenience.

---

## 11) Phase 9 — Backfills via SQS (Embeddings, Profiles, Genres)

Goal: re-embed / re-profile safely and resumably.

Tasks:
- [ ] **[Task] Extend job taxonomy**
  - Add new `job_type` values beyond `track_batch` and `playlist`.
- [ ] **[Task] Extend SQS payload**
  - Current payload is `type: 'track' | 'playlist'`.
  - Add a discriminated union for backfill job types (embedding/profile/genre) including:
    - ids to process
    - model bundle
    - extraction/profile versions
- [ ] **[Task] Worker implementation**
  - Option A: extend `analysisWorker.ts` to handle new job types.
  - Option B: create a separate worker to keep concerns isolated.
- [ ] **[Task] Idempotency**
  - Use DB unique constraints + upserts.
  - Track progress in `analysis_jobs`.

---

## 12) Phase 10 — Observability + Quality Guardrails

Tasks:
- [ ] **[Task] Add structured logs and counters**
  - embedding DB hit/miss
  - rerank call count + latency
  - profile recomputation count
  - match-context hit/miss
- [ ] **[Task] Add "dims mismatch" hard failures**
  - remove silent padding/truncation paths for persisted vectors.
- [ ] **[Task] Add evaluation gates**
  - block switching defaults unless harness metrics improve.

---

## 13) Recommended Implementation Order (minimal risk)

- [x] **[Step 1]** Hashing/versioning contracts (Phase 0)
- [ ] **[Step 2]** DB schema + repositories (Phases 2–3)
- [ ] **[Step 3]** DB-first embeddings (Phase 4)
- [ ] **[Step 4]** Persisted playlist profiles (Phase 6)
- [ ] **[Step 5]** Match caching/context (Phase 8)
- [ ] **[Step 6]** Backfills via SQS (Phase 9)
- [ ] **[Step 7]** Python API V2 models + reranker + emotions (Phase 5)
- [ ] **[Step 8]** Two-stage matching + rerank integration (Phase 7)

---

## 14) Open Questions to Resolve Early (to avoid rework)

- **[Model identity]** What exact `model_version` format do you want to persist?
  - HF revision hash, explicit semver, or “frozen at date”.
- **[E5 formatting]** Do you want all text templating in TS, or do you want Python to apply prefixes?
- **[Match table migration]** Do you want to migrate away from `track_playlist_matches` entirely?
- **[Worker boundaries]** Keep embedding/profile backfills in the same worker or isolate?

---

## 15) Source

- `docs/MODEL_OPTIMIZATION_PLAN.md`
