# ReccoBeats Integration

## Overview

ReccoBeats API provides audio features for tracks (replacing deprecated Spotify audio features API).

**Key Points:**
- **Public API** - No authentication required
- **Rate Limited** - 100ms between requests (enforced by client)
- **UUID System** - Requires Spotify ID → ReccoBeats UUID conversion

## Audio Features

```typescript
{
  acousticness: number     // 0.0-1.0
  danceability: number     // 0.0-1.0
  energy: number           // 0.0-1.0
  instrumentalness: number // 0.0-1.0
  liveness: number         // 0.0-1.0
  loudness: number         // -60 to 0 dB
  speechiness: number      // 0.0-1.0
  tempo: number            // 0-250 BPM
  valence: number          // 0.0-1.0 (musical positivity)
}
```

## Integration in Matching Algorithm

Audio features contribute ~30% to matching score when available:

```typescript
{
  energy: 0.2,           // Most important for mood consistency
  valence: 0.15,         // Musical positivity
  danceability: 0.15,    // Rhythm consistency
  tempo: 0.15,           // BPM similarity (normalized)
  acousticness: 0.1,     // Acoustic vs electronic
  instrumentalness: 0.1, // Vocal vs instrumental
  speechiness: 0.05,     // Spoken word content
  liveness: 0.05,        // Live vs studio
}
```

## Data Flow

1. `GET /v1/track?ids={spotifyId}` → ReccoBeats UUID
2. `GET /v1/track/{reccoBeatsId}/audio-features` → Audio features
3. Cache in `audio_features` table

## Files

| File | Purpose |
|------|---------|
| `app/lib/services/reccobeats/ReccoBeatsService.ts` | API client |
| `app/lib/services/audio/AudioFeaturesService.ts` | Wrapper |

## Notes

- No genre data from ReccoBeats (would need Last.fm)
- Fallback: matching works without audio features (reduced accuracy)
- Features cached in database to minimize API calls
