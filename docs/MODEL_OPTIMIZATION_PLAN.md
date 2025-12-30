# Spotify Auto-Sort: Model Optimization Strategy

> Strategic Planning Document - December 2025
>
> This document captures the decisions, research, and roadmap for optimizing the ML models used in the song-to-playlist matching system.

---

## Table of Contents

1. [Final Decisions Summary](#1-final-decisions-summary)
2. [Key Research Findings](#2-key-research-findings)
3. [Edge Cases & Potential Issues](#3-edge-cases--potential-issues)
4. [Risks & Considerations](#4-risks--considerations)
5. [Implementation Phases](#5-implementation-phases)
6. [Future: Fine-Tuning Strategy](#6-future-fine-tuning-strategy)
7. [What Changes vs What Stays](#7-what-changes-vs-what-stays)
8. [Cost Estimates](#8-cost-estimates)

---

## 1. Final Decisions Summary

| Area                     | Decision                                                               | Why                                                                           |
| ------------------------ | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **Primary Embedding**    | `intfloat/multilingual-e5-large-instruct`                              | Strong multilingual quality; supports 100 languages; 1024d; instruction-aware |
| **Emotion Model**        | `SamLowe/roberta-base-go_emotions` (bucketed into ~6-8 meta-emotions)  | Reduce noise from weak labels while keeping useful emotion signal             |
| **Genre Source**         | Last.fm top tags (album → artist fallback)                             | Deterministic genre signal; complements embeddings for queries like "hiphop"  |
| **Reranker**             | `Qwen/Qwen3-Reranker-0.6B`                                             | Apache-2.0, strong multilingual quality, production-ready, much faster        |
| **Vector Persistence**   | Supabase + `pgvector`                                                  | Embed once, reuse forever; enables fast retrieval and stable evaluation       |
| **Backfills**            | SQS-driven backfill jobs (same reliability model as analysis pipeline) | Resumable/idempotent, progress tracked in DB, usable for re-embedding         |
| **Match Caching**        | Versioned `match_context` + invalidation via content/config hashes     | Avoid recompute; safe reuse unless playlists/songs/config changed             |
| **Collaborative Signal** | Deferred: playlist co-occurrence (PMI/PPMI)                            | Only becomes reliable with more playlists/users; too sparse at current scale  |
| **Vector Strategy**      | Content-first (semantic + acoustic + playlist context) → hybrid later  | Content signals work immediately with tiny curated playlists                  |
| **Ranking Strategy**     | Weighted scoring now → rank fusion (RRF) later                         | RRF helps when you have multiple strong rankers; start simpler                |
| **Local Dev**            | M1 Mac with MPS                                                        | Works well, $0 cost                                                           |
| **Production**           | Modal Labs (A10)                                                       | $30 free/month covers all usage                                               |

---

## 2. Key Research Findings

### 2.1 Embedding Models

| Finding                                                | Source               | Impact on Decision                         |
| ------------------------------------------------------ | -------------------- | ------------------------------------------ |
| E5-small achieved same 100% Top-5 accuracy as E5-large | AIMultiple Benchmark | Size isn't everything; E5 family is strong |
| E5-instruct outperforms older sentence-transformers    | Modal MTEB Analysis  | Justified switch from mpnet                |
| Instruction prefixes improve retrieval precision       | HuggingFace E5 Docs  | Need to use proper prefixes                |
| BGE-M3 offers hybrid sparse+dense                      | BAAI Documentation   | Consider for future upgrade                |

### 2.2 Emotion Detection

| Finding                                                     | Source                 | Impact                                  |
| ----------------------------------------------------------- | ---------------------- | --------------------------------------- |
| go_emotions has 28 labels vs 3 for twitter-roberta          | HuggingFace Model Card | Much richer emotional profiling         |
| Both Perplexity and Claude research recommended go_emotions | User's research        | Strong consensus                        |
| go_emotions trained on Reddit, not music lyrics             | Model Training Data    | Domain gap to monitor                   |
| F1 scores vary by emotion (0.24 - 0.92)                     | Model evaluation       | Some emotions more reliable than others |

### 2.3 Music-Specific Considerations

| Finding                                                         | Source                 | Impact                           |
| --------------------------------------------------------------- | ---------------------- | -------------------------------- |
| "Lyrics have unique characteristics...limited vocabulary"       | Music Emotion Research | General models have domain gap   |
| Best lyrics classification: 94.58% with CNN audio + BERT lyrics | Academic papers        | Multimodal is optimal            |
| Your LLM analysis mitigates domain gap                          | Codebase analysis      | Already extracting meaning first |
| Audio features are native music signals                         | Spotify API            | Acoustic vector is domain-native |

### 2.4 Cost/Infrastructure

| Finding                                            | Source               | Impact                          |
| -------------------------------------------------- | -------------------- | ------------------------------- |
| Modal: $30/month free tier                         | Modal pricing        | Usage fits in free tier         |
| RunPod: Slightly cheaper per-hour but no free tier | RunPod Pricing       | Modal better for this scale     |
| Fine-tuning: ~$1-5 per training run                | SBERT Training Guide | Very affordable when ready      |
| Persisted vectors = free matching                  | Architecture insight | Most cost is one-time embedding |

### 2.5 Recommendation System Baselines (What We Borrow)

This project is essentially a small-scale version of *Automatic Playlist Continuation*.

Key takeaways from Spotify’s RecSys Challenge 2018:

- Two-stage systems are standard: fast retrieval first, then reranking for top results.
- Offline evaluation should use ranking metrics, not only “Top-5 accuracy”.
- Recommended offline metrics:
  - NDCG@K (ranking quality near the top)
  - R-Precision (relevant items in the top-R)
  - MRR (how quickly the first correct match appears)

We’ll use the same framing, but trained on and evaluated against the user’s curated playlists.

### 2.6 Collaborative Signals + Rank Fusion (Future, Needs Scale)

Key ideas worth copying from playlist continuation work and classic IR:

- **Co-occurrence is a strong signal**: “songs are similar if you put them together in playlists”.
- **PMI/PPMI weighting**: raw co-occurrence over-recommends globally popular items; PMI counteracts this by comparing co-occurrence against independence.
- **Rank fusion (RRF)**: rather than calibrating scores from different signals, fuse multiple ranked lists using a simple formula.

Notes:
- PMI is known to over-emphasize low-frequency events; use **PPMI** (clip negatives) and/or smoothing.
- The MPD challenge used rank-aggregation ideas as part of evaluation and system comparison.

Practical note for this project right now:
- With ~3-4 playlists and ~4 songs each, co-occurrence/PMI is too sparse to be reliable.
- Treat this as a later optimization when there is enough repeated playlist structure.

---

## 3. Edge Cases & Potential Issues

### 3.1 Model-Related Edge Cases

| Edge Case                                    | Risk Level | Mitigation Strategy                                     |
| -------------------------------------------- | ---------- | ------------------------------------------------------- |
| **Lyrics in non-English**                    | Medium     | Multilingual E5 supports 100 languages; monitor quality |
| **Instrumental tracks (no lyrics)**          | Medium     | Rely more on acoustic vector; lower semantic weight     |
| **Very short song descriptions**             | Low        | LLM analysis already expands context                    |
| **Controversial/explicit content**           | Low        | Models trained on general text; may have blind spots    |
| **go_emotions misclassifies music emotions** | Medium     | Domain gap; compare against LLM mood analysis           |
| **Reranker timeout on large batches**        | Low        | Only reranking top 20-50; keep batch small              |

### 3.2 Infrastructure Edge Cases

| Edge Case                     | Risk Level | Mitigation                                             |
| ----------------------------- | ---------- | ------------------------------------------------------ |
| **Modal cold start (10-20s)** | Medium     | Acceptable for batch; consider warm pool for real-time |
| **Modal free tier exceeded**  | Low        | Monitor usage; $30 is very generous                    |
| **M1 MPS memory pressure**    | Low        | 16GB RAM is plenty for these models                    |
| **Model version drift**       | Medium     | Pin model versions; track in DB                        |
| **Supabase pgvector limits**  | Low        | 1024d vectors are well within limits                   |

### 3.3 Data/Quality Edge Cases

| Edge Case                            | Risk Level | Mitigation                                  |
| ------------------------------------ | ---------- | ------------------------------------------- |
| **Same song, different analysis**    | Medium     | Use analysis hash for cache key             |
| **Playlist with < 3 songs**          | Medium     | Fall back to description-only profiling     |
| **User has 0 playlists**             | N/A        | Can't sort without targets                  |
| **Conflicting emotion signals**      | Medium     | Use dominant emotion + top-3 for nuance     |
| **Missing/low-quality Last.fm tags** | Medium     | Persist NULL; fall back to other signals    |
| **Very similar playlists**           | Low        | Cross-encoder helps differentiate           |
| **Popularity bias in co-occurrence** | Medium     | Use PMI/PPMI and minimum-support thresholds |

### 3.4 Model/Schema Evolution Edge Cases

| Edge Case                           | Risk Level | Mitigation                                                            |
| ----------------------------------- | ---------- | --------------------------------------------------------------------- |
| **New model incompatible with old** | High       | Must re-embed everything with new model                               |
| **Dimension mismatch (768 → 1024)** | High       | Versioned embeddings; keep multiple dims isolated via `model_version` |
| **Backfill interruption**           | Medium     | Idempotent jobs keyed by `content_hash`; resumable batches            |
| **Performance regression**          | Medium     | Measure against the offline evaluation harness before cutover         |

---

## 4. Risks & Considerations

### 4.1 Technical Risks

| Risk                                     | Probability | Impact | Mitigation                                                              |
| ---------------------------------------- | ----------- | ------ | ----------------------------------------------------------------------- |
| E5 doesn't improve results significantly | Low         | High   | Benchmark via offline evaluation harness before cutover                 |
| go_emotions less accurate than LLM mood  | Medium      | Medium | Use as signal, not replacement                                          |
| Reranking adds too much latency          | Low         | Medium | Tune top_k, batch sizes, and infrastructure; measure end-to-end latency |
| Multi-vector complicates debugging       | Medium      | Low    | Good logging and observability                                          |

### 4.2 Operational Risks

| Risk                              | Probability | Impact | Mitigation                     |
| --------------------------------- | ----------- | ------ | ------------------------------ |
| Modal service outage              | Low         | High   | Queue failed jobs; retry logic |
| Model loading takes too long      | Low         | Medium | Pre-warm containers            |
| Embedding costs unexpectedly high | Very Low    | Low    | Monitor; well within free tier |

### 4.3 Quality Risks

| Risk                             | Probability | Impact | Mitigation                      |
| -------------------------------- | ----------- | ------ | ------------------------------- |
| Worse matching for some genres   | Medium      | Medium | Per-genre evaluation            |
| Over-reliance on semantic vector | Medium      | Medium | Ensure acoustic weight is tuned |
| Emotion model bias               | Low         | Low    | Monitor and log predictions     |

---

## 5. Implementation Phases

This plan assumes **breaking changes are acceptable**:
- We do **not** need feature flags or parallel “old/new” codepaths.
- We do **not** need backwards-compatible APIs.
- We optimize for shipping the new pipeline end-to-end, then doing a single cutover.

These phases are **build steps**, not a gradual rollout plan.

### Phase 0: Map Current State (0.5 day)

**Goal:** Align the plan with the current architecture so we don’t “design in a vacuum”.

Current system touchpoints (as implemented today):
- **Remix matching pipeline:** `services/web/app/lib/services/matching/MatchingService.ts`
- **Vectorization client (TS):** `services/web/app/lib/services/vectorization/VectorizationService.ts`
- **Text extraction for embedding:** `services/web/app/lib/services/vectorization/analysis-extractors.ts`
- **Python vectorization API (FastAPI):** `services/vectorization/api.py`
- **In-memory embedding cache:** `services/web/app/lib/services/vectorization/VectorCache.ts` (TTL-based, not persisted)
- **Last.fm genre enrichment (TS):** `services/web/app/lib/services/lastfm/LastFmService.ts` (not yet wired into matching)
- **Analysis pipeline:**
  - Enqueue: `services/web/app/lib/services/queue/SQSService.ts`
  - Worker: `services/web/workers/analysisWorker.ts`
  - Stored analyses: Supabase tables `track_analyses`, `playlist_analyses`
- **Match persistence:** Supabase table `track_playlist_matches` via `services/web/app/lib/repositories/MatchRepository.ts`

Outcome of this phase:
- A single “source of truth” list of the exact fields we will use to compute `content_hash` and to version embeddings.

### Phase 1: Evaluation Harness (Repo-Tailored) (1-2 days)

**Goal:** Make changes measurable using data you already store in Supabase.

What exists today:
- You already store **ground-truth playlist membership** in `playlist_tracks`.
- You already store **track and playlist analyses** in `track_analyses` / `playlist_analyses`.
- You already persist **match outputs** in `track_playlist_matches` (score + factors + model_name).

Implementation plan (high-level):
- **Dataset builder:** generate an offline evaluation dataset by reading `playlist_tracks` and sampling:
  - Hold out K tracks per playlist as positives.
  - Use the rest of liked songs as negatives/candidates.
- **Metrics runner:** compute ranking metrics (NDCG@K, Recall@K, MRR) from the ranked list produced by `MatchingService`.
- **Artifact storage:** write evaluation outputs (metrics + per-playlist examples) to a local results folder (similar to existing `services/vectorization/model_evaluation.py` outputs).

Success criteria:
- You can re-run the same evaluation and get identical results (inputs are versioned, randomness is seeded).

### Phase 2: Supabase Vector Persistence (Schema + Access Layer) (1-2 days)

**Goal:** Stop recomputing embeddings and make model swaps safe (versioned, reproducible).

Schema additions (conceptual):
- **`track_embeddings`**
  - Keys: `track_id`, `embedding_kind` (e.g. `track_semantic_v1`), `model_name`, `model_version`, `dims`, `content_hash`
  - Payload: `embedding` (`pgvector`)
  - Metadata: `created_at`, `updated_at`
- **`track_genres`**
  - Keys: `track_id`, `source` (e.g. `lastfm`), `source_level` (e.g. `album|artist`), `content_hash`
  - Payload: `genres` (text[]) + `genres_with_scores` (json)
  - Metadata: `created_at`, `updated_at`
- **`playlist_profiles`**
  - Keys: `playlist_id`, `profile_kind` (e.g. `playlist_profile_v1`), `model_name`, `model_version`, `dims`, `content_hash`
  - Payload: stored vectors + aggregates (audio centroid, emotion distribution)
  - Metadata: `created_at`, `updated_at`

Indexing requirements (do it right now):
- Add pgvector index(es) for similarity search (HNSW or IVFFLAT depending on Supabase/pgvector support and dataset size).
- Add unique constraints for idempotency:
  - `track_embeddings(track_id, embedding_kind, model_name, model_version, content_hash)`
  - `track_genres(track_id, source, content_hash)`
  - `playlist_profiles(playlist_id, profile_kind, model_name, model_version, content_hash)`

Access layer additions (TS):
- Add repositories mirroring existing patterns (`MatchRepository`, `TrackAnalysisRepository`, `PlaylistAnalysisRepository`) to read/write embeddings and playlist profiles.

Success criteria:
- Matching can reuse persisted embeddings and only calls the Python API on cache-miss.

### Phase 3: Backfill + Versioning Strategy (1 day)

**Goal:** Populate the new tables to support the new pipeline (breaking-change friendly cutover).

Plan:
- Introduce a **content hash** computed from:
  - the extracted vectorization text (`analysis-extractors.ts` output)
  - the embedding configuration (model + weights + extraction version)
- Treat Last.fm genres as a **structured signal only**:
  - Do **not** inject genres into embedding input text.
  - Genre changes should invalidate playlist profiles / cached matches, but should not force re-embedding if the analysis text is unchanged.
- Backfill workflow:
  - Iterate tracks, fetch/store Last.fm genres (album → artist fallback), write `track_genres`.
  - Iterate tracks with `track_analyses` present, compute/store embeddings.
  - Iterate playlists with `playlist_analyses` present, compute/store profiles.
- Execute backfills via the existing SQS job mechanism:
  - Add new `job_type` values (e.g. `track_embedding_backfill`, `playlist_profile_backfill`).
  - Add a genre enrichment job type (e.g. `track_genre_backfill`).
  - Add new SQS message payload variants that encode:
    - item IDs to process
    - model bundle (embedding + reranker + emotion)
    - algorithm/version identifiers
  - Reuse `analysis_jobs` for progress + resumability.

Success criteria:
- Backfill is idempotent (safe to re-run) and resumable.

### Phase 4: Vectorization API V2 (Python) (2-3 days)

**Goal:** Add the new models and endpoints needed by the new matching pipeline.

Current state:
- `services/vectorization/api.py` provides `/embed`, `/embed/batch`, `/embed/hybrid`, `/sentiment`, `/similarity/calculate`.

Planned changes:
- **E5 embeddings (multilingual):** add a model option for `intfloat/multilingual-e5-large-instruct`.
  - Standardize the retrieval framing:
    - **Playlist (query):** `Instruct: Given a playlist's vibe, themes, and listening context, retrieve songs that fit the playlist.\nQuery: <playlist profile text>`
    - **Song (document):** `<track profile text>` (no instruction needed)
  - This affects TS extraction (query vs document strings) and Python embed behavior (query formatting helper).
- **Emotion model:** add a new endpoint based on `SamLowe/roberta-base-go_emotions` returning a distribution (top-N + probs).
- Emotion bucketing (recommended for matching features):
  - Map 28 labels into ~6-8 meta-emotions to reduce noise.
  - Example buckets:
    - Joy: joy, amusement, excitement, love, admiration, optimism
    - Sadness: sadness, grief, disappointment, remorse
    - Anger: anger, annoyance, disapproval, disgust
    - Fear: fear, nervousness
    - Surprise: surprise, confusion, curiosity
    - Peace: relief, gratitude, caring
- **Reranker:** add a rerank endpoint based on `Qwen/Qwen3-Reranker-0.6B` for Top-N candidate refinement.

Operational requirements:
- Model/version pinning, timeouts, batching, structured logging.

### Phase 5: Playlist Profiling V2 (TS + DB) (2-3 days)

**Goal:** Make playlist representation explicit and persisted (instead of recomputed in-memory each match).

Where this lives today:
- Playlist profiling is currently implicit in `MatchingService.profileFromSongs()` / `profileFromDescription()`.

Plan:
- Define a persisted `playlist_profiles` record derived from:
  - Playlist analysis text (from `playlist_analyses`)
  - Track centroid vector (from track embeddings of tracks already in playlist)
  - Genre signal from:
    - explicit genres parsed from playlist name/description (mapped onto the genre whitelist), and/or
    - aggregated genres of existing playlist tracks via `track_genres`
  - Keep genres **out of the embedding text** and use them only for:
    - metadata scoring, and
    - playlist profile structured fields
  - Audio feature centroid (already present in track analysis JSON via `audio_features`)
  - Emotion distribution (bucketed meta-emotions recommended)

Success criteria:
- Profile computation is cached/persisted and can be invalidated via `content_hash` changes.

### Phase 6: Two-Stage Matching V2 (TS Orchestration) (2-4 days)

**Goal:** Improve ranking quality while keeping latency under control.

Stage 1 (fast, in TS):
- Use persisted track embeddings + playlist profiles to score all candidates.
- Continue using the existing multi-signal scoring shape in `MatchingService` (metadata + vector + audio + context/thematic/flow), but swap the vector source from “in-memory cache” to “DB-first”.

Stage 2 (slow):
- Call the Python reranker for Top-N (e.g. 20-50) and blend rerank scores into the final ordering.
- Persist model name/version used for the final ranking in `track_playlist_matches.model_name` (and add a version field strategy if you want multiple match generations side-by-side).

### Phase 7: Match Caching + Invalidation (Do It Once, Reuse Forever) (1-2 days)

**Goal:** If you run matching multiple times, avoid recomputation unless something material changed.

Key idea:
- A match result is only valid for a specific combination of:
  - playlist profile(s) (their `content_hash`)
  - track profiles (their `content_hash`)
  - model bundle (embedding + reranker + emotion)
  - scoring configuration (weights + thresholds)
  - candidate set + playlist set

Plan:
- Introduce a versioned **`match_context`** concept (table or computed hash) that captures:
  - `user_id`
  - `embedding_model_name`, `embedding_model_version`
  - `reranker_model_name`, `reranker_model_version`
  - `algorithm_version` (e.g. `matching_v2`)
  - `config_hash` (hash of weights/thresholds)
  - `playlist_set_hash` (sorted playlist IDs + playlist profile hashes)
  - `candidate_set_hash` (sorted track IDs + track profile hashes)
- Persist match outputs keyed by `(match_context_id, track_id, playlist_id)` (or by a single `match_context_hash`).

Practical DB shape (recommended):
- `match_contexts` (one row per run/config/input-set)
- `match_results` (many rows per context: `(match_context_id, track_id, playlist_id, score, factors, created_at)`)

Where this integrates:
- On “run matching”, compute (or lookup) `match_context` first.
- If results exist for that context, return them without running the matcher.
- Otherwise run the matcher, persist results, then return.

Invalidation behavior (automatic):
- If a playlist gets new analysis or its tracks change → playlist profile hash changes → `playlist_set_hash` changes → cached results are ignored.
- If new songs are added / analyses updated → track profile hash changes → `candidate_set_hash` changes → cached results are ignored.
- If Last.fm genres update for relevant tracks → playlist profile hash changes (via `track_genres`) → cached results are ignored.
- If you change models or scoring config → `config_hash` changes → cached results are ignored.

Success criteria:
- Running matching twice without changes performs **0 embeddings** and **0 reranks** (reads only).
- A single new track analysis triggers embedding only for that track and only recomputes affected caches.

### Phase 8: Collaborative Signals (Future, Requires Scale)

**Goal:** Use “songs go together because people put them together” once the data is sufficient.

Enable this phase only when you have enough repeated structure, e.g.:

- at least ~20 curated playlists, or
- at least ~200+ total playlist track placements, or
- multiple users contributing playlists

| Step | What To Do                                                     | Why                                     |
| ---- | -------------------------------------------------------------- | --------------------------------------- |
| 7.1  | Build co-occurrence counts from playlists (song–song pairs)    | Learns human pairing patterns           |
| 7.2  | Compute PMI/PPMI for song pairs (with min support + smoothing) | Reduces popularity bias                 |
| 7.3  | Add co-occurrence ranking as an additional signal              | Improves “goes together” beyond content |
| 7.4  | Fuse multiple rankers with RRF                                 | Avoid score calibration across signals  |

**Success Criteria:**
- Improves NDCG@10 vs baseline on your curated evaluation set
- Explains “why” each match was chosen (feature-level breakdown)

---

## 6. Future: Fine-Tuning Strategy

### 6.1 When to Fine-Tune

| Trigger                                         | Action                   |
| ----------------------------------------------- | ------------------------ |
| Have 5,000+ playlist-song pairs                 | Ready to train           |
| Seeing consistent mismatches for certain genres | Domain adaptation needed |
| User feedback shows patterns                    | Incorporate feedback     |
| Quarterly maintenance                           | Refresh with new data    |

### 6.2 Training Data Format

```
Required: Pairs of (playlist_description, song_that_belongs)

Example pairs:
- ("Chill lo-fi for late night studying", "Song X with dreamy beats")
- ("High energy workout playlist", "Song Y with intense drops")
- ("Sad songs for rainy days", "Song Z with melancholic lyrics")

Sources for data:
1. Your existing curated playlists (ground truth)
2. User's playlist assignments (implicit feedback)
3. Manual curation (highest quality)
4. Spotify public playlists with descriptions
```

### 6.3 Expected Improvements from Fine-Tuning

| Aspect                       | Before Fine-Tuning   | After Fine-Tuning |
| ---------------------------- | -------------------- | ----------------- |
| Vibe matching accuracy       | Good (generic model) | Better (+15-30%)  |
| Genre-specific understanding | Moderate             | Strong            |
| Your vocabulary alignment    | Generic              | Customized        |
| Edge case handling           | Weak                 | Improved          |

### 6.4 Fine-Tuning Cost/Effort

| Resource           | Estimate               |
| ------------------ | ---------------------- |
| GPU time           | 1-3 hours              |
| Cost               | $1-5 per training run  |
| Data prep          | 2-4 hours (one-time)   |
| Re-embedding after | $1-3 (batch all songs) |

---

## 7. What Changes vs What Stays

### 7.1 Models (What Changes)

| Before                                                                 | After                                 | Why                                               |
| ---------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------- |
| `all-mpnet-base-v2` (hybrid embed) + `all-MiniLM-L6-v2` (single embed) | `multilingual-e5-large-instruct`      | Strong multilingual semantic retrieval            |
| `cardiffnlp/twitter-roberta-base-sentiment-latest` (3 class)           | `roberta-base-go_emotions` (28 class) | Richer emotions (use as feature, not replacement) |
| No reranking                                                           | `Qwen/Qwen3-Reranker-0.6B`            | Higher multilingual quality + much lower latency  |

### 7.2 Architecture (What Changes)

| Before                            | After                                                | Why                                                     |
| --------------------------------- | ---------------------------------------------------- | ------------------------------------------------------- |
| In-memory caching (`VectorCache`) | Persisted vectors + profiles in Supabase             | Stable evaluation + fewer API calls + reproducibility   |
| Unkeyed match recomputation       | Versioned `match_context` + persisted match results  | Avoid recompute; safe reuse with automatic invalidation |
| Single hybrid vector              | Multi-vector profile (semantic + acoustic + emotion) | Better robustness and playlist-type coverage            |
| Fixed weights                     | Playlist-type adaptive weights                       | Better matching                                         |
| Local Python only                 | Local + Modal                                        | Production-ready                                        |
| 768d vectors                      | 1024d vectors                                        | Model requirement                                       |

### 7.3 What Stays The Same

- LLM analysis pipeline (Claude/OpenAI for song analysis)
- Audio features from Spotify/ReccoBeats
- 4-tier matching concept (metadata, vector, audio, deep analysis)
- Supabase as database
- Remix as frontend framework
- Core user experience

---

## 8. Cost Estimates

### 8.1 One-Time Setup Costs

| Task                                      | Estimate   |
| ----------------------------------------- | ---------- |
| Embed existing song library (~6000 songs) | $0.50-1.00 |
| Embed playlists                           | $0.10-0.20 |
| **Total Setup**                           | **$1-2**   |

### 8.2 Ongoing Monthly Costs

| Scenario     | New Songs/Month | Embedding Cost | Matching Cost | Total        |
| ------------ | --------------- | -------------- | ------------- | ------------ |
| Small usage  | 500             | $0.05-0.10     | $0            | ~$0.10/month |
| Medium usage | 5,000           | $0.50-1.00     | $0            | ~$1/month    |
| Large usage  | 50,000          | $5-10          | $0            | ~$10/month   |

### 8.3 Training Costs (Future, Optional)

| Activity                    | When                | Cost    |
| --------------------------- | ------------------- | ------- |
| Training the model          | Once (or quarterly) | $1-5    |
| Re-embedding after training | After each training | $0.50-5 |
| Total per training cycle    | -                   | $2-10   |

### 8.4 Infrastructure

| Environment | Provider             | Cost                      |
| ----------- | -------------------- | ------------------------- |
| Development | Local M1 Mac         | $0                        |
| Production  | Modal Labs (A10 GPU) | $0 (within $30 free tier) |

---

## Appendix: Playlist Type Weight Heuristics

Initial heuristic weights for multi-vector matching:

```yaml
playlist_type_weights:
  # Co-occurrence is deferred until there is enough data; start with content-first scoring.
  workout:      { semantic: 0.25, acoustic: 0.65, emotion: 0.10 }
  chill:        { semantic: 0.55, acoustic: 0.35, emotion: 0.10 }
  emotional:    { semantic: 0.70, acoustic: 0.15, emotion: 0.15 }
  party:        { semantic: 0.30, acoustic: 0.60, emotion: 0.10 }
  focus:        { semantic: 0.35, acoustic: 0.55, emotion: 0.10 }
  nostalgic:    { semantic: 0.60, acoustic: 0.25, emotion: 0.15 }
  romantic:     { semantic: 0.60, acoustic: 0.25, emotion: 0.15 }
  energetic:    { semantic: 0.25, acoustic: 0.65, emotion: 0.10 }
  melancholic:  { semantic: 0.70, acoustic: 0.15, emotion: 0.15 }
  default:      { semantic: 0.45, acoustic: 0.45, emotion: 0.10 }
```

These weights can be learned from data in the future by analyzing which dimension matters more for each playlist type.

---

## Sources

- [AIMultiple: Benchmark of Open Source Embedding Models](https://research.aimultiple.com/open-source-embedding-models/)
- [Modal: Top Embedding Models on MTEB Leaderboard](https://modal.com/blog/mteb-leaderboard-article)
- [HuggingFace: E5-large-v2 Model Card](https://huggingface.co/intfloat/e5-large-v2)
- [HuggingFace: roberta-base-go_emotions](https://huggingface.co/SamLowe/roberta-base-go_emotions)
- [LAION: CLAP (Contrastive Language-Audio Pretraining)](https://github.com/LAION-AI/CLAP)
- [Music Emotion Recognition Survey](https://arxiv.org/html/2504.18799v1)
- [Lyrics Emotion Detection Research](https://github.com/imdiptanu/lyrics-emotion-detection)
- [Spotify Engineering: Introducing the Million Playlist Dataset and RecSys Challenge 2018](https://engineering.atspotify.com/2018/05/introducing-the-million-playlist-dataset-and-recsys-challenge-2018)
- [AIcrowd: Spotify Million Playlist Dataset Challenge (Evaluation Metrics)](https://www.aicrowd.com/challenges/spotify-million-playlist-dataset-challenge)
- [Wikipedia: Pointwise mutual information](https://en.wikipedia.org/wiki/Pointwise_mutual_information)
- [PMI example (popularity bias intuition)](https://minimizeregret.com/post/2018/06/17/instacart-products-bought-together/)
- [Spotify Research: RecSys Challenge 2018 - Automatic Music Playlist Continuation](https://research.atspotify.com/publications/recsys-challenge-2018-automatic-music-playlist-continuation)
- [RunPod Pricing](https://www.runpod.io/pricing)
- [Modal Labs Pricing](https://modal.com/pricing)
- [Sentence Transformers Training Guide](https://sbert.net/docs/sentence_transformer/training_overview.html)
