# Matching Algorithm: Next Steps

## Current State

The matching algorithm is well-architected with centralized configuration in `matching-config.ts`. This is a solid foundation that follows industry best practices for algorithm development.

### What's Working Well ✅
- **Single source of truth** for all weights and parameters
- **Type-safe** configuration with TypeScript
- **Adaptive weights** based on data availability
- **Clear separation** between tiers (metadata, vector, audio, cultural)
- **Version controlled** changes through Git

## Evolution Roadmap

### Phase 1: Immediate Improvements (1-2 weeks)

#### 1.1 Add User Presets
Let users choose their matching style without exposing raw weights:

```typescript
// In user preferences
export enum MatchingPreset {
  MUSIC_FOCUSED = 'music_focused',    // Prioritizes tempo, energy, key
  LYRICS_FOCUSED = 'lyrics_focused',   // Prioritizes themes, cultural context
  BALANCED = 'balanced',               // Current default
  DISCOVERY = 'discovery'              // More experimental matches
}

// Usage in MatchingService
const preset = await userPreferences.getMatchingPreset(userId)
const weights = MATCHING_WEIGHTS.presets[preset]
```

#### 1.2 Basic Performance Tracking
Start collecting data on what makes a good match:

```typescript
// Track user actions on matches
await trackMatchOutcome({
  userId,
  trackId,
  playlistId,
  matchScore: 0.85,
  componentScores: { audio: 0.9, vector: 0.8, ... },
  outcome: 'added' | 'skipped' | 'played',
  timestamp: new Date()
})
```

#### 1.3 Add Debug Mode
Help power users understand matching decisions:

```typescript
// Return detailed explanation with matches
interface MatchResult {
  track: Track
  score: number
  explanation?: {
    audioFeatures: "High energy match (0.9 vs 0.85)",
    cultural: "Shared themes: empowerment, social justice",
    penalty: "Different era (-0.1)",
    weights: { audio: 0.3, vector: 0.25, ... }
  }
}
```

### Phase 2: Advanced Features (1-2 months)

#### 2.1 A/B Testing Framework
Test algorithm improvements safely:

```typescript
// Simple percentage-based rollout
const TEST_CONFIG = {
  'audio_boost_v1': {
    percentage: 10,  // 10% of users
    weights: { audio: 0.4, vector: 0.2, ... },
    metrics: ['playlist_coherence', 'skip_rate']
  }
}

// Track results
if (isInTest(userId, 'audio_boost_v1')) {
  weights = TEST_CONFIG.audio_boost_v1.weights
  trackTestMetric('audio_boost_v1', userId, outcome)
}
```

#### 2.2 Feedback Loop
Learn from user behavior:

```typescript
class MatchingOptimizer {
  async optimizeWeights(userId: number) {
    const history = await getMatchHistory(userId)
    
    // Find patterns in successful matches
    const addedTracks = history.filter(h => h.outcome === 'added')
    const skippedTracks = history.filter(h => h.outcome === 'skipped')
    
    // Simple optimization: boost successful component
    if (addedTracks.avgAudioScore > skippedTracks.avgAudioScore * 1.2) {
      return { ...currentWeights, audio: currentWeights.audio * 1.1 }
    }
  }
}
```

#### 2.3 Playlist-Specific Weights
Different playlists need different approaches:

```typescript
// Detect playlist type and adjust
const playlistType = detectPlaylistType(playlist) // 'workout', 'chill', 'party'
const weights = MATCHING_WEIGHTS.byType[playlistType] || MATCHING_WEIGHTS.default
```

### Phase 3: Machine Learning Integration (3-6 months)

#### 3.1 Feature Importance Learning
Use ML to discover optimal weights:

```python
# Python service for weight optimization
from sklearn.ensemble import RandomForestRegressor

# Features: component scores
# Target: user engagement (1 if added, 0 if skipped)
model = RandomForestRegressor()
model.fit(X_scores, y_engagement)

# Extract feature importance
importance = dict(zip(
    ['audio', 'vector', 'cultural', 'thematic', 'metadata'],
    model.feature_importances_
))
```

#### 3.2 Personalized Weights
Learn each user's preferences:

```typescript
// Store learned weights per user
interface UserMatchingProfile {
  userId: number
  learnedWeights: WeightSet
  sampleSize: number
  lastUpdated: Date
  performance: {
    precision: number  // % of recommendations added
    diversity: number  // Genre spread of added tracks
  }
}
```

#### 3.3 Real-time Optimization
Adjust weights based on session behavior:

```typescript
class SessionOptimizer {
  private sessionWeights: WeightSet
  private recentOutcomes: MatchOutcome[]
  
  adjustWeights(outcome: MatchOutcome) {
    this.recentOutcomes.push(outcome)
    
    // If last 3 audio-heavy matches were skipped, reduce audio weight
    if (this.detectPattern('high_audio_skipped')) {
      this.sessionWeights.audio *= 0.9
    }
  }
}
```

## Implementation Guidelines

### Do's ✅
1. **Start simple** - Phase 1 features first
2. **Measure everything** - Can't improve what you don't measure
3. **Roll out gradually** - Use feature flags
4. **Keep defaults stable** - Most users won't customize
5. **Document changes** - Track why weights changed

### Don'ts ❌
1. **Don't over-engineer** - Add complexity only when needed
2. **Don't change too fast** - Users need consistency
3. **Don't expose raw weights** - Use presets/abstractions
4. **Don't optimize prematurely** - Get data first
5. **Don't ignore edge cases** - New users, small playlists

## Success Metrics

Track these KPIs to measure algorithm improvements:

1. **Match Acceptance Rate**: % of suggested tracks added to playlists
2. **Skip Rate**: % of added tracks skipped within 30 seconds
3. **Playlist Coherence**: Variance in audio features of playlist
4. **User Retention**: Users still using matching after 30 days
5. **Session Length**: Average number of matches reviewed per session

## Testing Strategy

### Unit Tests
```typescript
describe('MatchingService', () => {
  it('should adapt weights based on available data', () => {
    const weights = service.getAdaptiveWeights(songWithAudio, profileWithAudio)
    expect(weights.audio).toBe(0.3) // Full data available
  })
})
```

### Integration Tests
```typescript
it('should prefer cultural matches for lyrics-focused preset', async () => {
  await userPrefs.setPreset(userId, 'lyrics_focused')
  const matches = await service.match(playlist, songs)
  
  const culturalTrack = songs.find(s => s.hasCulturalMarkers)
  expect(matches[0].track.id).toBe(culturalTrack.id)
})
```

### A/B Test Analysis
```sql
-- Compare test group performance
SELECT 
  test_group,
  AVG(CASE WHEN outcome = 'added' THEN 1 ELSE 0 END) as acceptance_rate,
  AVG(match_score) as avg_score
FROM match_outcomes
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY test_group
```

## Migration Path

1. **Keep current config** as the default
2. **Add new system** alongside (not replacing)
3. **Run in shadow mode** first (log but don't use)
4. **Gradual rollout** by user percentage
5. **Full migration** once proven better

## Resources

- [Spotify's Recommendation System](https://engineering.atspotify.com/2021/12/how-spotify-uses-ml-to-create-the-home-experience/)
- [Netflix's A/B Testing](https://netflixtechblog.com/its-all-a-bout-testing-the-netflix-experimentation-platform-4e1ca458c15)
- [Pandora's Music Genome](https://www.pandora.com/about/mgp)
- [Last.fm's Collaborative Filtering](https://www.last.fm/about)

## Questions to Consider

1. **What's your North Star metric?** (e.g., playlist completion rate)
2. **How much customization do users want?** (survey them)
3. **What's your tolerance for experimentation?** (affects rollout speed)
4. **Do you have enough data for ML?** (need ~10k interactions)
5. **What's your infrastructure budget?** (affects real-time features)