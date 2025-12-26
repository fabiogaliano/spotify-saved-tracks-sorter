# Semantic Matching - Work In Progress

## Overview
Implementing semantic similarity matching for themes and moods using embeddings instead of exact string matching.

## Problem Statement
The matching algorithm was giving low scores (35%) for songs that should match highly with playlists because it used exact string matching:
- "Self-Love" vs "Self-Confidence" → 0% match (should be high)
- "empowered" vs "Confident and Empowered" → 0% match (should be high)

## Test Case
**Playlist**: "feelin' it $" (ID: 2762)
- Description: "self-confidence hip-hop and rap"
- Mood: "Confident and Empowered"
- Themes: ["Self-Confidence", "Success and Achievement", "Flexing and Bragging"]

**Song**: "i" by Kendrick Lamar (Track ID: 273)
- Mood: "empowered"
- Themes: ["Self-Love and Affirmation", "Black Empowerment and Community Unity", "Overcoming Adversity and Depression", "Reclaiming Identity and Language"]

**Expected**: High match (80%+)
**Actual (before)**: 35%
**Actual (after SemanticMatcher)**: TBD - needs model tuning

## Implementation Done

### 1. SemanticMatcher Service
`app/lib/services/semantic/SemanticMatcher.ts`
- Uses VectorizationService to embed strings
- Caches embeddings (1 hour TTL, 500 max entries)
- Methods:
  - `areSimilar(str1, str2, threshold)` - boolean check
  - `getSimilarity(str1, str2)` - 0-1 score
  - `countMatches(list1, list2)` - count semantic matches
  - `computeSimilarityMatrix(list1, list2)` - full matrix

### 2. MatchingService Updates
`app/lib/services/matching/MatchingService.ts`
- `calculateThematicAlignment()` now async, uses SemanticMatcher.countMatches()
- `calculateMetadataScore()` now async, uses SemanticMatcher.areSimilar() for moods
- `extractMoodScore()` now async, uses SemanticMatcher.areSimilar()

### 3. Config Changes
`app/lib/services/matching/matching-config.ts`
- `deepAnalysisThreshold`: 0.5 → 0.25 (run thematic analysis more often)
- `fromDescription.thematic`: 0.05 → 0.20 (higher weight for themes)
- `fromDescription.context`: 0.05 → 0.15

## Current Test Results
Using `all-MiniLM-L6-v2` (GENERAL) model:

| Theme 1 | Theme 2 | Similarity |
|---------|---------|------------|
| Self-Love | Self-Confidence | 51% ❌ |
| Self-Love and Affirmation | Self-Confidence | 54% ❌ |
| empowered | Confident and Empowered | 73% ✅ |
| Black Empowerment | Self-Confidence | 28% ❌ |

**Issue**: Default threshold is 65%, but semantically similar themes only score ~51-54%.

## Next Steps

### Option 1: Lower Threshold
Change default threshold from 0.65 to 0.50 in SemanticMatcher config.

### Option 2: Use Better Model
Switch from `all-MiniLM-L6-v2` to `all-mpnet-base-v2` (CREATIVE model) for theme matching.

### Option 3: Research Better Models
See `docs/EMBEDDING_MODEL_RESEARCH_PROMPT.md` for a prompt to research:
- E5, BGE, GTE models
- Instruction-following embeddings
- Music/entertainment domain models

## Files Changed
- `app/lib/services/semantic/SemanticMatcher.ts` (NEW)
- `app/lib/services/matching/MatchingService.ts` (MODIFIED)
- `app/lib/services/matching/matching-config.ts` (MODIFIED)
- `app/lib/services/index.ts` (MODIFIED)

## Test Script
```bash
bun run test-semantic-matching.ts
```

## Current Models (Python API)
| Type | Model | Dims | Notes |
|------|-------|------|-------|
| GENERAL | all-MiniLM-L6-v2 | 384 | Current default for SemanticMatcher |
| CREATIVE | all-mpnet-base-v2 | 768 | Better for semantic, used for hybrid |
| SEMANTIC | multi-qa-mpnet-base-dot-v1 | 768 | QA-optimized |
| FAST | paraphrase-MiniLM-L3-v2 | 384 | Fastest |
