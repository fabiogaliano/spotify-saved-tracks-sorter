# Service Architecture - Clear Naming Convention

## Analysis Services (AI/LLM)
These services perform the actual analysis using AI models:

### `SongAnalysisService` 
**Location**: `/lib/services/analysis/SongAnalysisService.ts`
- Analyzes songs using LLM with cultural context awareness
- Takes artist/song info, fetches lyrics, generates analysis
- Returns structured analysis with themes, moods, cultural markers

### `PlaylistAnalysisService`
**Location**: `/lib/services/analysis/PlaylistAnalysisService.ts`
- Analyzes playlists using LLM
- Takes playlist name/description and optional track list
- Returns structured analysis of playlist cohesion and purpose

### `BatchSongAnalysisService`
**Location**: `/lib/services/analysis/BatchSongAnalysisService.ts`
- Batch processing wrapper for SongAnalysisService
- Handles multiple songs in parallel with rate limiting

## Store Services (Database Logic)
These services handle business logic around data persistence:

### `PlaylistAnalysisStore`
**Location**: `/lib/services/PlaylistAnalysisStore.ts`
- Business logic for playlist analysis persistence
- Handles create-or-update pattern
- Methods: `saveAnalysis`, `getAnalysis`, `getUserAnalyses`, `deleteAnalysis`
- Wraps `PlaylistAnalysisRepository` with additional logic

## Matching Services
These services handle song-to-playlist matching:

### `MatchingService`
**Location**: `/lib/services/matching/MatchingService.ts`
- Hybrid matching algorithm using cultural context
- Combines metadata, vector embeddings, and LLM analysis
- Configurable weights in `matching-config.ts`

## Key Distinction

The naming convention makes the purpose clear:
- **Analysis** services = AI/LLM operations
- **Persistence** services = Database operations
- **Matching** services = Algorithm/logic operations

This separation follows the Single Responsibility Principle and makes the codebase much easier to understand.