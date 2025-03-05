# Tracks Feature

This feature manages user's saved tracks from Spotify and provides functionality for sorting and organizing them.

## Structure

- `actions/` - Actions related to track management

  - `index.action.server.ts` - Main action for track operations

- `loaders/` - Data loaders for tracks
  - `index.loader.server.ts` - Main loader for fetching tracks

## Functionality

- Fetching user's saved tracks from Spotify
- Displaying tracks in a filterable table
- Updating track sorting status (sorted, unsorted, ignored)
- Syncing tracks with Spotify

## Integration Points

- Uses Spotify API through the lib/api services
- Stores data using repositories from lib/repositories
- Persists state in Zustand stores from lib/stores
- Renders UI using components from shared/components/tracks

## Key Files

- `index.loader.server.ts` - Loads user profile and saved tracks
- `index.action.server.ts` - Handles sync and track status updates

## Usage Example

The main entry point (index route) uses this feature to:

1. Load user profile and saved tracks
2. Display tracks in a filterable table
3. Allow updating track sorting status
4. Enable syncing with Spotify
