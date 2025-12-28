# Playlist Management Feature

## Overview

The Playlist Management feature provides a UI for users to view, manage, and interact with Spotify playlists. It handles two distinct types of playlists: AI-enabled playlists (flagged for sorting) and regular playlists. The feature includes functionality for viewing playlist details, tracks, syncing with Spotify, and enabling AI-based sorting.

## Architecture

### Component Structure

The playlist management feature follows a hierarchical component structure:

```
features/playlist-management/
├── components/                 # UI Components
│   ├── PlaylistManagement.tsx  # Main container component
│   ├── playlist-viewer/        # Components for viewing playlist details
│   │   ├── PlaylistInfo.tsx    # Shows playlist metadata
│   │   ├── TrackList.tsx       # Displays playlist tracks
│   │   └── types.ts            # Types for playlist viewer
│   ├── playlist-selector/      # Components for selecting playlists
│   │   └── PlaylistSelector.tsx # Tab-based playlist selector
│   ├── toolbar/                # Action bar components
│   │   └── ManagementToolbar.tsx # Contains global actions
│   └── ui/                     # Reusable UI components
│       ├── controls.tsx        # Basic UI controls
│       ├── DisplayStates.tsx   # Various display states (loading, empty, etc.)
│       ├── formatting.ts       # Utility functions for UI formatting
│       └── TableElements.tsx   # Table components for track display
├── context/                    # React context providers
│   ├── index.tsx              # Exports context providers
│   └── PlaylistTracksContext.tsx # Manages playlist track data
├── hooks/                      # Custom React hooks
│   ├── useNotifications.tsx   # Manages notification messages
│   ├── usePlaylistManagement.tsx # Main feature logic
│   ├── usePlaylistTracks.tsx  # Manages track data and loading
│   └── useSyncPlaylists.tsx   # Handles playlist syncing with Spotify
└── utils.tsx                  # Utility functions
```

## Data Flow

1. The `PlaylistManagement` component receives a single array of all playlists
2. The `usePlaylistManagement` hook filters playlists based on tab selection (AI vs regular) and search criteria
3. Track data flows through the `PlaylistTracksContext` which provides methods for loading and retrieving tracks
4. The `usePlaylistTracks` hook provides formatted track data and loading methods
5. Individual components consume this data and render the appropriate UI

## Key Implementation Details

### Playlist Types

The system handles two types of playlists:

1. **AI-Enabled Playlists**:
   - Have flags for AI processing (`is_flagged: true`)
   - Shown in the "is_flagged" tab

2. **Regular Playlists**:
   - Standard playlists (`is_flagged: false`)
   - Shown in the "others" tab

**Note:** All playlists now load their tracks on-demand when selected, improving initial load performance.

### Track Data Handling

Track data handling is a critical part of the system and includes special case handling:

```typescript
const formatTrackData = useCallback((track: any) => {
	// Handle different track data formats (API vs UI)
	// If the track already has the right format properties, just ensure date formatting
	if (track.title) {
		return {
			...track,
			dateAdded: track.addedAt ? formatDate(track.addedAt) : track.dateAdded || 'Unknown',
			rawAddedAt: track.addedAt || track.rawAddedAt || '',
		}
	}
	// If the track has API format properties, use mapTrackToUIFormat
	else if (track.name || track.spotify_track_id) {
		const mappedTrack = mapTrackToUIFormat(track)
		// Also add the raw date for hover functionality
		return {
			...mappedTrack,
			rawAddedAt: track.added_at || '',
		}
	}
	// Fallback for unknown format
	return {
		id: track.id || track.spotify_track_id || 'unknown',
		title: track.title || track.name || 'Unknown Title',
		artist: track.artist || 'Unknown Artist',
		album: track.album || 'Unknown Album',
		dateAdded: track.dateAdded || (track.addedAt ? formatDate(track.addedAt) : 'Unknown'),
		rawAddedAt: track.rawAddedAt || track.addedAt || track.added_at || '',
	}
}, [])
```

This function handles multiple potential data formats:

- UI format (with `title` property)
- API format (with `name` or `spotify_track_id` properties)
- Unknown format (with fallback values)

### Date Formatting

Date handling includes two representations:

1. **Relative dates** (`dateAdded`): Shows human-readable format like "Today", "Yesterday", "2 weeks ago"
2. **Raw dates** (`rawAddedAt`): Stores original date string for tooltip display on hover

### Loading States

Track loading states are now handled consistently for all playlist types:

```typescript
const isLoading = getLoadingStateForPlaylist(selectedPlaylist || '')
```

- All playlists show loading indicators when their tracks are being fetched
- The loading state is also used to disable sync buttons during track loading operations

## Context Management

The `PlaylistTracksContext` provides a centralized store for track data and loading states:

- Tracks are stored by playlist ID
- Loading states are tracked per playlist
- Methods for loading, retrieving, and formatting tracks are provided

## Hooks Overview

### usePlaylistManagement

The main hook managing playlist selection, tab navigation, and filtering:

- Handles selected playlist and tab state
- Provides filtered playlists based on search query
- Manages the currently displayed playlist details

### usePlaylistTracks

Manages track data loading and formatting:

- Interfaces with PlaylistTracksContext
- Handles track format normalization
- Provides loading states for playlists

### useSyncPlaylists

Handles syncing playlists with Spotify:

- Manages the global syncing state
- Provides methods for syncing individual playlists

### useNotifications

Provides notification functionality:

- Manages notification messages
- Provides methods for showing success/info messages

## UI States

The component handles multiple UI states:

1. **Loading**: Shown when tracks are being loaded for non-AI playlists
2. **Not Started Sync**: When a playlist hasn't been synced yet
3. **Failed Sync (Empty)**: When sync failed and no tracks are available
4. **Failed Sync (With Tracks)**: When sync failed but some tracks are available
5. **Normal Tracks View**: Shows the track table when data is available

## Special Considerations

### AI vs Regular Playlist Differences

- **Filtering**: Playlists are filtered on the frontend based on their `is_flagged` property
- **UI Indicators**: AI playlists show AI-specific UI elements and flags
- **Feature Access**: AI-specific features (like re-sorting) are only available for AI playlists
- **Loading Behavior**: All playlists now load tracks on-demand for better performance

### Track Data Format Handling

The system needs to handle different data formats:

- Spotify API's track format
- Internal UI track format
- Edge cases with missing data

The `formatTrackData` function handles these conversions, ensuring consistent display regardless of the source.
