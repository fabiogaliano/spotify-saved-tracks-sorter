# Matching Algorithm Refactor - Status & Next Steps

> **Last Updated:** December 26, 2025
> **Branch:** `feature/matching-algorithm-v0`
> **Status:** ✅ 100% Complete

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Schema Migration](#schema-migration)
4. [Completed Work](#completed-work)
5. [File Reference](#file-reference)
6. [Configuration](#configuration)
7. [Testing](#testing)

---

## Executive Summary

### What We Built

A **hybrid matching algorithm** that scores songs against playlists using multiple dimensions:

| Tier | Dimension | Weight | Data Source |
|------|-----------|--------|-------------|
| 1 | Metadata | 20% | Genre, mood, era matching |
| 2 | Vector | 30% | Semantic embeddings (vectorization API) |
| 3 | Audio | 20% | ReccoBeats features (tempo, energy, valence) |
| 4 | Context | 15% | Listening context alignment |
| 5 | Thematic | 10% | Theme cohesion |
| 6 | Flow | 5% | Transition quality |

### Current State

- ✅ **Analysis System:** Fully rewritten with new schema, audio features, Valibot validation
- ✅ **Matching Service:** Hybrid scoring complete, uses VectorizationService
- ✅ **Vectorization Service:** Refactored with clean separation of concerns
- ✅ **Python API:** Simplified to generic text→vector (no schema knowledge)
- ✅ **UI Components:** Updated for new schema
- ✅ **Type System:** All typed, no `any` types
- ✅ **Configuration:** Weights in config, API URL from env var

---

## Architecture Overview

### Clean Architecture: TypeScript ↔ Python Separation

```
┌────────────────────────────────────────────────────────────────────┐
│                    TypeScript (Domain Layer)                        │
│                                                                     │
│  ┌─────────────────┐    ┌──────────────────┐    ┌───────────────┐  │
│  │ SongAnalysis    │    │ analysis-        │    │ Vectorization │  │
│  │ PlaylistAnalysis│───▶│ extractors.ts    │───▶│ Service       │  │
│  │ (Schemas)       │    │ (Text Extraction)│    │ (Orchestrator)│  │
│  └─────────────────┘    └──────────────────┘    └───────┬───────┘  │
│                                                          │          │
│  ┌─────────────────┐    ┌──────────────────┐            │          │
│  │ MatchingService │◀───│ VectorCache      │◀───────────┘          │
│  │ (Scoring)       │    │ (1hr TTL)        │                       │
│  └─────────────────┘    └──────────────────┘                       │
└────────────────────────────────────────────────────────────────────┘
                                   │
                                   │ text strings only
                                   ▼
┌────────────────────────────────────────────────────────────────────┐
│                  Python (Infrastructure Layer)                      │
│                                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  ┌──────────┐  │
│  │ /embed      │  │ /embed/batch │  │ /embed/     │  │/sentiment│  │
│  │ text→vector │  │ texts→vectors│  │ hybrid      │  │ text→    │  │
│  │             │  │              │  │ weighted    │  │ scores   │  │
│  └─────────────┘  └──────────────┘  └─────────────┘  └──────────┘  │
│                                                                     │
│            NO knowledge of songs, playlists, or schemas             │
└────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ANALYSIS PIPELINE                               │
└─────────────────────────────────────────────────────────────────────────────┘

  Spotify Track
       │
       ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                         SongAnalysisService                              │
  │  ┌─────────────┐    ┌─────────────────┐    ┌─────────────────────────┐  │
  │  │   Genius    │    │   ReccoBeats    │    │     LLM Provider        │  │
  │  │   Lyrics    │    │ Audio Features  │    │   (Google/Claude)       │  │
  │  └──────┬──────┘    └────────┬────────┘    └────────────┬────────────┘  │
  │         │                    │                          │               │
  │         └────────────────────┼──────────────────────────┘               │
  │                              ▼                                          │
  │                    Enhanced LLM Prompt                                  │
  │                    (lyrics + audio features)                            │
  │                              │                                          │
  │                              ▼                                          │
  │                    Valibot Validation                                   │
  │                    (SongAnalysisSchema)                                 │
  └──────────────────────────────┼──────────────────────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │   track_analyses DB    │
                    │   { analysis: JSON }   │
                    └────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                              MATCHING PIPELINE                               │
└─────────────────────────────────────────────────────────────────────────────┘

  User selects playlist + candidate songs
                    │
                    ▼
        ┌───────────────────────┐
        │   MatchingService     │
        │   profilePlaylist()   │
        └───────────┬───────────┘
                    │
      ┌─────────────┼─────────────┐
      ▼             ▼             ▼
  ┌────────┐   ┌────────┐   ┌────────┐
  │Metadata│   │ Vector │   │  Deep  │
  │ Score  │   │ Score  │   │ Score  │
  └───┬────┘   └───┬────┘   └───┬────┘
      │            │            │
      └────────────┼────────────┘
                   ▼
         ┌─────────────────┐
         │ Weighted Score  │
         │ + Veto Checks   │
         └────────┬────────┘
                  ▼
         ┌─────────────────┐
         │  MatchResult[]  │
         │  sorted by      │
         │  similarity     │
         └─────────────────┘
```

### Key Services

| Service | Location | Purpose |
|---------|----------|---------|
| `SongAnalysisService` | `app/lib/services/analysis/` | LLM-powered song analysis |
| `PlaylistAnalysisService` | `app/lib/services/analysis/` | LLM-powered playlist analysis |
| `ReccoBeatsService` | `app/lib/services/reccobeats/` | Audio features API |
| `VectorizationService` | `app/lib/services/vectorization/` | Text extraction + embedding orchestration |
| `MatchingService` | `app/lib/services/matching/` | Hybrid scoring algorithm |
| `VectorCache` | `app/lib/services/vectorization/` | Embedding cache (1hr TTL) |

---

## Schema Migration

### Song Analysis Schema

We migrated from a simple schema to a comprehensive one. Here are the key differences:

#### Emotional Section

```typescript
// OLD SCHEMA
emotional: {
  dominantMood: {
    mood: string,
    description: string
  },
  progression: Array<{
    section: string,
    mood: string,
    intensity: number,
    description: string
  }>,
  intensity_score: number
}

// NEW SCHEMA
emotional: {
  dominant_mood: string,           // Flattened
  mood_description: string,        // Extracted
  intensity: number,               // Renamed from intensity_score
  valence: number,                 // NEW - from audio features
  energy: number,                  // NEW - from audio features
  journey?: Array<{                // Renamed from progression
    section: string,
    mood: string,
    description: string
  }>,
  emotional_peaks?: string[]       // NEW
}
```

#### New Sections

```typescript
// These are completely NEW in the schema

musical_style: {
  genre_primary: string,
  genre_secondary?: string,
  vocal_style: string,           // rap/singing/spoken/melodic/aggressive/smooth
  production_style: string,      // minimal/lush/electronic/organic/experimental
  sonic_texture?: string,
  distinctive_elements?: string[]
}

matching_profile: {
  mood_consistency: number,      // 0-1: How consistent the mood is
  energy_flexibility: number,    // 0-1: Can fit different energy levels
  theme_cohesion: number,        // 0-1: How focused the themes are
  sonic_similarity: number       // 0-1: Distinctiveness of sound
}

audio_features?: {               // From ReccoBeats API
  tempo: number,
  energy: number,
  valence: number,
  danceability: number,
  acousticness: number,
  instrumentalness: number,
  liveness: number,
  speechiness: number,
  loudness: number
}
```

### Schema Files

| File | Purpose |
|------|---------|
| `analysis-schemas.ts` | Valibot schemas for validation |
| `analysis-types.ts` | TypeScript types derived from schemas |
| `analysis-version.ts` | Version tracking for migrations |

---

## Completed Work

### 1. Analysis System Rewrite ✅

**Files Modified:**
- `app/lib/services/analysis/SongAnalysisService.ts`
- `app/lib/services/analysis/PlaylistAnalysisService.ts`
- `app/lib/services/analysis/analysis-schemas.ts` (NEW)
- `app/lib/services/analysis/analysis-types.ts` (NEW)

**What Was Done:**
- Enhanced LLM prompt with audio features integration
- Valibot schema validation for all LLM outputs
- Batch analysis with parallel lyrics fetching
- Retry logic for failed analyses
- Style guidelines in prompt for consistent output

### 2. ReccoBeats Integration ✅

**Files Added:**
- `app/lib/services/reccobeats/ReccoBeatsService.ts`
- `app/lib/services/audio/AudioFeaturesService.ts`

**What Was Done:**
- Complete ReccoBeats API client (public API, no auth)
- Rate limiting (50ms between requests)
- Batch processing support
- Error handling with fallbacks

### 3. VectorizationService Refactor ✅

**Files Created:**
- `app/lib/services/vectorization/analysis-extractors.ts` (NEW)
- `app/lib/config/vectorization.ts` (NEW)

**Files Modified:**
- `app/lib/services/vectorization/VectorizationService.ts` (REWRITTEN)
- `services/vectorization/api.py` (SIMPLIFIED)

**What Was Done:**
- Created dedicated extractors for Song and Playlist schemas
- TypeScript now owns all schema knowledge
- Python API simplified to generic text→vector service
- API URL configurable via `VECTORIZATION_API_URL` env var
- VectorCache integrated for all embeddings
- Clean separation of concerns

### 4. MatchingService Refactor ✅

**Files Modified:**
- `app/lib/services/matching/MatchingService.ts`
- `app/lib/services/matching/matching-config.ts`
- `app/lib/services/index.ts`

**What Was Done:**
- Removed all direct HTTP calls to vectorization API
- Now uses VectorizationService (benefits from cache)
- Embedding weights moved to matching-config.ts
- Service properly wired via dependency injection

### 5. UI Updates ✅

**Files Modified:**
- `app/components/TrackAnalysisModal.tsx` (1125 lines changed)
- `app/features/matching/MatchingPage.tsx`

**What Was Done:**
- Complete UI rewrite for new schema
- Type-safe rendering with `isSongAnalysis()` guard
- New tabs: Themes & Meaning, Emotional, Context, Style & Matching
- Audio features visualization
- Listening contexts radar display

### 6. Type Consolidation ✅

**Files Modified:**
- `app/lib/models/Matching.ts`
- `app/lib/models/PlaylistAnalysis.ts`

**What Was Done:**
- Removed 50+ lines of duplicate type definitions
- Single source of truth in `analysis-schemas.ts`
- Re-exports for backward compatibility
- Playlist interface uses typed `PlaylistAnalysis` fields

---

## File Reference

### Core Analysis Files

| File | Status | Notes |
|------|--------|-------|
| `app/lib/services/analysis/SongAnalysisService.ts` | ✅ Complete | Instance leak fixed |
| `app/lib/services/analysis/PlaylistAnalysisService.ts` | ✅ Complete | Enhanced prompt |
| `app/lib/services/analysis/analysis-schemas.ts` | ✅ Complete | Valibot schemas |
| `app/lib/services/analysis/analysis-types.ts` | ✅ Complete | Type exports |
| `app/lib/services/analysis/analysis-version.ts` | ✅ Complete | Version tracking |

### Vectorization Files

| File | Status | Notes |
|------|--------|-------|
| `app/lib/services/vectorization/VectorizationService.ts` | ✅ Complete | Uses extractors, clean API |
| `app/lib/services/vectorization/analysis-extractors.ts` | ✅ Complete | Song/Playlist text extraction |
| `app/lib/services/vectorization/VectorCache.ts` | ✅ Complete | Embedding cache (1hr TTL) |
| `app/lib/config/vectorization.ts` | ✅ Complete | Env-based config |
| `services/vectorization/api.py` | ✅ Complete | Generic text→vector, no schemas |

### Matching Files

| File | Status | Notes |
|------|--------|-------|
| `app/lib/services/matching/MatchingService.ts` | ✅ Complete | Uses VectorizationService |
| `app/lib/services/matching/matching-config.ts` | ✅ Complete | Weight config + embedding weights |
| `app/lib/services/matching/matching-config-advanced.ts` | ✅ Complete | Presets, A/B testing |
| `app/routes/api.matching.tsx` | ✅ Complete | Parallel fetching, typed Song objects |

### Audio/ReccoBeats Files

| File | Status | Notes |
|------|--------|-------|
| `app/lib/services/reccobeats/ReccoBeatsService.ts` | ✅ Complete | Full implementation |
| `app/lib/services/audio/AudioFeaturesService.ts` | ✅ Complete | Wrapper |

### UI Files

| File | Status | Notes |
|------|--------|-------|
| `app/components/TrackAnalysisModal.tsx` | ✅ Complete | New schema UI |
| `app/features/matching/MatchingPage.tsx` | ✅ Complete | Matching UI |
| `app/features/matching/MatchingWrapper.tsx` | ✅ Complete | Context wrapper |

### Model/Type Files

| File | Status | Notes |
|------|--------|-------|
| `app/lib/models/Matching.ts` | ✅ Complete | Typed `PlaylistAnalysis` |
| `app/lib/models/PlaylistAnalysis.ts` | ✅ Complete | Types |

---

## Configuration

### Environment Variables

Add to `.env`:

```bash
# Vectorization Service (required)
VECTORIZATION_API_URL=http://localhost:8000

# LLM Provider (required for analysis)
GOOGLE_API_KEY=your_google_api_key

# Genius API (optional, for lyrics)
GENIUS_CLIENT_TOKEN=your_genius_token
```

### Matching Weights

All weights are configurable in `app/lib/services/matching/matching-config.ts`:

```typescript
// Embedding weights for hybrid vectorization
embedding: {
  metadata: 0.3,   // Title, artist, genre
  analysis: 0.5,   // Themes, mood, meaning
  context: 0.2,    // Listening contexts, situations
}

// Matching score weights (adaptive based on data availability)
profiles: {
  fullDataAvailable: { metadata: 0.15, vector: 0.25, audio: 0.25, ... },
  learnedWithAnalysis: { metadata: 0.2, vector: 0.35, audio: 0, ... },
  fromDescription: { metadata: 0.25, vector: 0.45, audio: 0.15, ... },
  default: { metadata: 0.2, vector: 0.3, audio: 0.2, ... }
}
```

---

## Testing

### Start the Python Vectorization Service

```bash
cd services/vectorization
python api.py
```

### Test Commands

```bash
# Test ReccoBeats connectivity
bun run services/web/test-reccobeats.js

# Test matching algorithm
bun run services/web/test-matching-service.js

# Run integration tests
bun run services/web/test-services-integration.js

# Type check
cd services/web && bun tsc --noEmit
```

### Expected Results

- Matching scores: 38-46% (realistic, no NaN)
- 17 songs matched in ~2.5s
- Cache hits on repeated requests
- No TypeScript errors in refactored files

---

## Notes

- This is a greenfield project - no need for backwards compatibility with old analysis format
- ReccoBeats API is public, no authentication needed
- Vectorization service is a Python FastAPI app (see `services/vectorization/api.py`)
- All weights in `matching-config.ts` are tunable - start with defaults, adjust based on results
- Python API has zero knowledge of music schemas - TypeScript handles all extraction
