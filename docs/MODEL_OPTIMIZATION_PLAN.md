# Spotify Auto-Sort: Model Optimization Strategy

> Strategic Planning Document - December 2024
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

| Area | Decision | Why |
|------|----------|-----|
| **Primary Embedding** | `intfloat/e5-large-instruct` | 100% Top-5 accuracy in benchmarks, instruction-aware, proven quality |
| **Emotion Model** | `SamLowe/roberta-base-go_emotions` | 28 granular emotions vs current 3 classes; both research sources agreed |
| **Reranker** | `cross-encoder/ms-marco-MiniLM-L6-v2` | Catches subtle semantic matches vectors miss |
| **Fast Fallback** | ❌ Removed | Cached vectors make it unnecessary; simplifies architecture |
| **Vector Strategy** | Multi-vector (semantic + acoustic) | Different playlist types need different weightings |
| **Weight Strategy** | Heuristic first → Learned later | Start simple, evolve with data |
| **Local Dev** | M1 Mac with MPS | Works well, $0 cost |
| **Production** | Modal Labs (A10) | $30 free/month covers all usage |

---

## 2. Key Research Findings

### 2.1 Embedding Models

| Finding | Source | Impact on Decision |
|---------|--------|-------------------|
| E5-small achieved same 100% Top-5 accuracy as E5-large | AIMultiple Benchmark | Size isn't everything; E5 family is strong |
| E5-instruct outperforms older sentence-transformers | Modal MTEB Analysis | Justified switch from mpnet |
| Instruction prefixes improve retrieval precision | HuggingFace E5 Docs | Need to use proper prefixes |
| BGE-M3 offers hybrid sparse+dense | BAAI Documentation | Consider for future upgrade |

### 2.2 Emotion Detection

| Finding | Source | Impact |
|---------|--------|--------|
| go_emotions has 28 labels vs 3 for twitter-roberta | HuggingFace Model Card | Much richer emotional profiling |
| Both Perplexity and Claude research recommended go_emotions | User's research | Strong consensus |
| go_emotions trained on Reddit, not music lyrics | Model Training Data | Domain gap to monitor |
| F1 scores vary by emotion (0.24 - 0.92) | Model evaluation | Some emotions more reliable than others |

### 2.3 Music-Specific Considerations

| Finding | Source | Impact |
|---------|--------|--------|
| "Lyrics have unique characteristics...limited vocabulary" | Music Emotion Research | General models have domain gap |
| Best lyrics classification: 94.58% with CNN audio + BERT lyrics | Academic papers | Multimodal is optimal |
| Your LLM analysis mitigates domain gap | Codebase analysis | Already extracting meaning first |
| Audio features are native music signals | Spotify API | Acoustic vector is domain-native |

### 2.4 Cost/Infrastructure

| Finding | Source | Impact |
|---------|--------|--------|
| Modal: $30/month free tier | Modal pricing | Usage fits in free tier |
| RunPod: Slightly cheaper per-hour but no free tier | RunPod Pricing | Modal better for this scale |
| Fine-tuning: ~$1-5 per training run | SBERT Training Guide | Very affordable when ready |
| Cached vectors = free matching | Architecture insight | Most cost is one-time embedding |

---

## 3. Edge Cases & Potential Issues

### 3.1 Model-Related Edge Cases

| Edge Case | Risk Level | Mitigation Strategy |
|-----------|------------|---------------------|
| **Lyrics in non-English** | Medium | E5-large-instruct supports 93 languages; monitor quality |
| **Instrumental tracks (no lyrics)** | Medium | Rely more on acoustic vector; lower semantic weight |
| **Very short song descriptions** | Low | LLM analysis already expands context |
| **Controversial/explicit content** | Low | Models trained on general text; may have blind spots |
| **go_emotions misclassifies music emotions** | Medium | Domain gap; compare against LLM mood analysis |
| **Reranker timeout on large batches** | Low | Only reranking top 20; keep batch small |

### 3.2 Infrastructure Edge Cases

| Edge Case | Risk Level | Mitigation |
|-----------|------------|------------|
| **Modal cold start (10-20s)** | Medium | Acceptable for batch; consider warm pool for real-time |
| **Modal free tier exceeded** | Low | Monitor usage; $30 is very generous |
| **M1 MPS memory pressure** | Low | 16GB RAM is plenty for these models |
| **Model version drift** | Medium | Pin model versions; track in DB |
| **Supabase pgvector limits** | Low | 1024d vectors are well within limits |

### 3.3 Data/Quality Edge Cases

| Edge Case | Risk Level | Mitigation |
|-----------|------------|------------|
| **Same song, different analysis** | Medium | Use analysis hash for cache key |
| **Playlist with < 3 songs** | Medium | Fall back to description-only profiling |
| **User has 0 playlists** | N/A | Can't sort without targets |
| **Conflicting emotion signals** | Medium | Use dominant emotion + top-3 for nuance |
| **Very similar playlists** | Low | Cross-encoder helps differentiate |

### 3.4 Migration Edge Cases

| Edge Case | Risk Level | Mitigation |
|-----------|------------|------------|
| **Old vectors incompatible** | High | Must re-embed everything with new model |
| **Dimension mismatch (768 → 1024)** | High | New table structure; migrate data |
| **Partial migration failure** | Medium | Keep old system running in parallel |
| **Performance regression** | Medium | A/B test before full cutover |

---

## 4. Risks & Considerations

### 4.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| E5 doesn't improve results significantly | Low | High | A/B test before full migration |
| go_emotions less accurate than LLM mood | Medium | Medium | Use as signal, not replacement |
| Reranking adds too much latency | Low | Medium | Make it optional; tune top_k |
| Multi-vector complicates debugging | Medium | Low | Good logging and observability |

### 4.2 Operational Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Modal service outage | Low | High | Queue failed jobs; retry logic |
| Model loading takes too long | Low | Medium | Pre-warm containers |
| Embedding costs unexpectedly high | Very Low | Low | Monitor; well within free tier |

### 4.3 Quality Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Worse matching for some genres | Medium | Medium | Per-genre evaluation |
| Over-reliance on semantic vector | Medium | Medium | Ensure acoustic weight is tuned |
| Emotion model bias | Low | Low | Monitor and log predictions |

---

## 5. Implementation Phases

### Phase 1: Validation (1-2 days)

**Goal:** Prove the new models work better before migrating

| Step | What To Do | Why |
|------|------------|-----|
| 1.1 | Set up local Python env with new models | Test on M1 |
| 1.2 | Create 20-30 test cases (songs you know well) | Ground truth for comparison |
| 1.3 | Compare E5 embeddings vs current mpnet | Measure similarity improvement |
| 1.4 | Compare go_emotions vs current sentiment | Check emotion granularity |
| 1.5 | Test reranker on edge cases | Verify it helps ambiguous matches |
| 1.6 | Document results | Go/no-go decision point |

**Success Criteria:**
- E5 shows measurably better semantic similarity for "vibes"
- go_emotions provides useful additional signals
- Reranker improves ranking for close matches
- Performance on M1 is acceptable (~50+ embeddings/minute)

### Phase 2: Database Setup (1 day)

**Goal:** Prepare new schema without breaking existing system

| Step | What To Do | Why |
|------|------------|-----|
| 2.1 | Create new tables (song_vectors, playlist_vectors) | Parallel to existing |
| 2.2 | Set up pgvector indexes | Enable fast similarity search |
| 2.3 | Add model_version column | Track which model created vectors |
| 2.4 | Test vector storage/retrieval | Ensure Supabase handles 1024d |

**Decision Point:** Keep old tables until migration proven successful

### Phase 3: Service Implementation (2-3 days)

**Goal:** Build the embedding service (local + Modal)

| Step | What To Do | Why |
|------|------------|-----|
| 3.1 | Create Python FastAPI service with new models | Core embedding logic |
| 3.2 | Add endpoint for songs (embed + emotions) | Primary use case |
| 3.3 | Add endpoint for playlists | Secondary use case |
| 3.4 | Add reranking endpoint | Precision improvement |
| 3.5 | Test locally on M1 | Verify it works |
| 3.6 | Deploy to Modal | Production environment |
| 3.7 | Test Modal endpoints | Verify cloud works |

**Key Decision:** Use environment variable to switch local vs Modal

### Phase 4: Integration (2-3 days)

**Goal:** Connect new service to Remix app

| Step | What To Do | Why |
|------|------------|-----|
| 4.1 | Create VectorizationServiceV2 | New TypeScript client |
| 4.2 | Update MatchingService to use multi-vector | New matching logic |
| 4.3 | Add playlist type detection | For weight selection |
| 4.4 | Integrate reranking step | Precision layer |
| 4.5 | Add caching to Supabase | Store new vectors |
| 4.6 | Feature flag for old vs new | A/B testing capability |

**Key Decision:** Run both systems in parallel initially

### Phase 5: Migration (1-2 days)

**Goal:** Move existing data to new system

| Step | What To Do | Why |
|------|------------|-----|
| 5.1 | Batch re-embed all existing songs | Populate new vectors |
| 5.2 | Batch re-embed all playlists | Update playlist profiles |
| 5.3 | Compute acoustic centroids for playlists | From contained songs |
| 5.4 | Validate migrated data | Spot check quality |
| 5.5 | A/B test new vs old matching | Measure improvement |

**Success Criteria:**
- All songs have new vectors
- Matching quality improved or maintained
- No performance regressions

### Phase 6: Cutover (1 day)

**Goal:** Switch to new system fully

| Step | What To Do | Why |
|------|------------|-----|
| 6.1 | Switch feature flag to new system | Go live |
| 6.2 | Monitor for issues | Catch problems early |
| 6.3 | Keep old system as fallback (1 week) | Safety net |
| 6.4 | Remove old code and tables | Clean up |

---

## 6. Future: Fine-Tuning Strategy

### 6.1 When to Fine-Tune

| Trigger | Action |
|---------|--------|
| Have 5,000+ playlist-song pairs | Ready to train |
| Seeing consistent mismatches for certain genres | Domain adaptation needed |
| User feedback shows patterns | Incorporate feedback |
| Quarterly maintenance | Refresh with new data |

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

| Aspect | Before Fine-Tuning | After Fine-Tuning |
|--------|-------------------|-------------------|
| Vibe matching accuracy | Good (generic model) | Better (+15-30%) |
| Genre-specific understanding | Moderate | Strong |
| Your vocabulary alignment | Generic | Customized |
| Edge case handling | Weak | Improved |

### 6.4 Fine-Tuning Cost/Effort

| Resource | Estimate |
|----------|----------|
| GPU time | 1-3 hours |
| Cost | $1-5 per training run |
| Data prep | 2-4 hours (one-time) |
| Re-embedding after | $1-3 (batch all songs) |

---

## 7. What Changes vs What Stays

### 7.1 Models (What Changes)

| Before | After | Why |
|--------|-------|-----|
| `all-mpnet-base-v2` | `e5-large-instruct` | Better quality |
| `twitter-roberta-sentiment` (3 class) | `go_emotions` (28 class) | Richer emotions |
| Multiple fallback models | Single model | Simplicity |
| No reranking | Cross-encoder reranking | Precision |

### 7.2 Architecture (What Changes)

| Before | After | Why |
|--------|-------|-----|
| Single hybrid vector | Multi-vector (semantic + acoustic) | Flexibility |
| Fixed weights | Playlist-type adaptive weights | Better matching |
| Local Python only | Local + Modal | Production-ready |
| 768d vectors | 1024d vectors | Model requirement |

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

| Task | Estimate |
|------|----------|
| Embed existing song library (~6000 songs) | $0.50-1.00 |
| Embed playlists | $0.10-0.20 |
| **Total Setup** | **$1-2** |

### 8.2 Ongoing Monthly Costs

| Scenario | New Songs/Month | Embedding Cost | Matching Cost | Total |
|----------|-----------------|----------------|---------------|-------|
| Small usage | 500 | $0.05-0.10 | $0 | ~$0.10/month |
| Medium usage | 5,000 | $0.50-1.00 | $0 | ~$1/month |
| Large usage | 50,000 | $5-10 | $0 | ~$10/month |

### 8.3 Training Costs (Future, Optional)

| Activity | When | Cost |
|----------|------|------|
| Training the model | Once (or quarterly) | $1-5 |
| Re-embedding after training | After each training | $0.50-5 |
| Total per training cycle | - | $2-10 |

### 8.4 Infrastructure

| Environment | Provider | Cost |
|-------------|----------|------|
| Development | Local M1 Mac | $0 |
| Production | Modal Labs (A10 GPU) | $0 (within $30 free tier) |

---

## Appendix: Playlist Type Weight Heuristics

Initial heuristic weights for multi-vector matching:

```yaml
playlist_type_weights:
  workout:      { semantic: 0.3, acoustic: 0.7 }
  chill:        { semantic: 0.6, acoustic: 0.4 }
  emotional:    { semantic: 0.8, acoustic: 0.2 }
  party:        { semantic: 0.4, acoustic: 0.6 }
  focus:        { semantic: 0.4, acoustic: 0.6 }
  nostalgic:    { semantic: 0.7, acoustic: 0.3 }
  romantic:     { semantic: 0.7, acoustic: 0.3 }
  energetic:    { semantic: 0.3, acoustic: 0.7 }
  melancholic:  { semantic: 0.8, acoustic: 0.2 }
  default:      { semantic: 0.5, acoustic: 0.5 }
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
- [RunPod Pricing](https://www.runpod.io/pricing)
- [Modal Labs Pricing](https://modal.com/pricing)
- [Sentence Transformers Training Guide](https://sbert.net/docs/sentence_transformer/training_overview.html)
