# React & React Query Tutorial: Understanding Playlist Management

## Introduction

This tutorial will explain the core React and React Query concepts used in our playlist management feature. We'll break down each concept with examples from the actual code we just implemented.

## Table of Contents
1. [React Fundamentals](#react-fundamentals)
2. [React Query Basics](#react-query-basics)
3. [Our Implementation Explained](#our-implementation-explained)
4. [Common Patterns & Best Practices](#common-patterns--best-practices)

---

## React Fundamentals

### 1. Components and Props

React components are like building blocks. They receive data (props) and return UI.

```typescript
// Basic component structure
const PlaylistManagement = ({ playlists }: PlaylistManagementProps) => {
  // Component logic here
  return <div>UI here</div>;
};
```

**Key Concept**: Components are functions that take props and return JSX (React's syntax for describing UI).

### 2. State Management with useState

State is data that can change over time. When state changes, React re-renders the component.

```typescript
const [pendingSelection, setPendingSelection] = useState<string | null>(null);
```

**What's happening here?**
- `pendingSelection` is the current value
- `setPendingSelection` is a function to update that value
- `null` is the initial value
- `<string | null>` is TypeScript saying it can be a string or null

**Why we used it**: We needed to track which playlist should be selected after creation.

### 3. Side Effects with useEffect

`useEffect` runs code after React renders. It's perfect for synchronizing with external systems or reacting to changes.

```typescript
useEffect(() => {
  if (pendingSelection && filteredPlaylists.length > 0) {
    const newPlaylist = filteredPlaylists.find(p => p.spotifyId === pendingSelection);
    if (newPlaylist) {
      updateSelectedPlaylist(newPlaylist.id);
      setPendingSelection(null);
    }
  }
}, [pendingSelection, filteredPlaylists, updateSelectedPlaylist]);
```

**Breaking this down:**
- **First argument**: Function to run (the effect)
- **Second argument**: Dependencies array `[pendingSelection, filteredPlaylists, updateSelectedPlaylist]`
- React runs this effect whenever any dependency changes

**Why we used it**: To automatically select a playlist once it appears in the filtered list.

### 4. Context API

Context provides a way to share data between components without passing props down manually.

```typescript
const PlaylistUIContext = createContext<PlaylistUIContextType | null>(null);

// Provider wraps components that need access
<PlaylistUIProvider>
  <PlaylistManagementContent playlists={playlists} />
</PlaylistUIProvider>

// Hook to use the context
const { selectedPlaylist, updateSelectedPlaylist } = usePlaylistUIContext();
```

**Why we used it**: To share UI state (selected playlist, tab, search) across multiple components.

---

## React Query Basics

React Query manages server state - data that lives on a server and needs to be synchronized with your UI.

### 1. The Problem React Query Solves

Without React Query, you'd manually handle:
- Loading states
- Error states
- Caching
- Refetching
- Synchronization

React Query handles all of this automatically!

### 2. Queries - Reading Data

Queries fetch and cache data:

```typescript
export function usePlaylists(initialData?: Playlist[]) {
  return useQuery({
    queryKey: playlistKeys.lists(),      // Unique identifier for this data
    queryFn: async () => {                // Function to fetch data
      return initialData || [];
    },
    initialData,                          // Data to use immediately
    staleTime: Infinity,                  // When to consider data "stale"
    gcTime: Infinity,                     // When to garbage collect
  });
}
```

**Key Concepts:**
- **queryKey**: Unique identifier for caching
- **queryFn**: How to fetch the data
- **staleTime**: How long data is "fresh" (no refetch needed)
- **gcTime**: How long to keep in cache when unused

### 3. Mutations - Changing Data

Mutations handle creating, updating, or deleting data:

```typescript
export function useCreatePlaylist() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ name, description }) => {
      // API call to create playlist
      const response = await fetch('/actions/create-ai-playlist', {
        method: 'POST',
        body: formData,
      });
      return data.playlist;
    },
    onSuccess: (newPlaylist) => {
      // Update cache after success
      queryClient.setQueryData(playlistKeys.lists(), (oldData = []) => {
        return [...oldData, newPlaylist].sort(/* sort logic */);
      });
    },
  });
}
```

**Key Concepts:**
- **mutationFn**: The async function that performs the mutation
- **onSuccess**: Runs after successful mutation
- **queryClient.setQueryData**: Updates the cache directly

### 4. Query Keys Pattern

Query keys uniquely identify data in the cache:

```typescript
export const playlistKeys = {
  all: ['playlists'] as const,
  lists: () => [...playlistKeys.all, 'list'] as const,
  detail: (id: string) => [...playlistKeys.details(), id] as const,
};
```

This creates a hierarchy:
- `['playlists']` - All playlist-related data
- `['playlists', 'list']` - List of playlists
- `['playlists', 'detail', '123']` - Specific playlist

---

## Our Implementation Explained

Let's trace through what happens when a user creates a new playlist:

### Step 1: User Creates Playlist

```typescript
const handleCreatePlaylist = async (name: string, description: string) => {
  const result = await createPlaylistMutation.mutateAsync({ name, description });
  if (onPlaylistCreated && result?.spotify_playlist_id) {
    onPlaylistCreated(result.spotify_playlist_id);
  }
};
```

1. `mutateAsync` sends the request and waits for response
2. On success, we get the created playlist data
3. We call `onPlaylistCreated` with the Spotify ID

### Step 2: React Query Updates Cache

```typescript
onSuccess: (newPlaylist) => {
  queryClient.setQueryData(playlistKeys.lists(), (oldData = []) => {
    const updatedData = [newPlaylist, ...oldData];
    return updatedData.sort((a, b) => 
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  });
}
```

1. `setQueryData` updates the cache immediately
2. We add the new playlist and sort by most recent
3. Any component using `usePlaylists` automatically re-renders!

### Step 3: UI Updates

```typescript
const handlePlaylistCreated = (playlistSpotifyId: string) => {
  updateSelectedTab('is_flagged');    // Switch to AI tab
  setPendingSelection(playlistSpotifyId);  // Mark for selection
};
```

1. Switch to the correct tab
2. Set the pending selection in component state

### Step 4: Automatic Selection

```typescript
useEffect(() => {
  if (pendingSelection && filteredPlaylists.length > 0) {
    const newPlaylist = filteredPlaylists.find(p => p.spotifyId === pendingSelection);
    if (newPlaylist) {
      updateSelectedPlaylist(newPlaylist.id);
      setPendingSelection(null);
    }
  }
}, [pendingSelection, filteredPlaylists, updateSelectedPlaylist]);
```

1. This effect runs whenever dependencies change
2. When both pending selection exists AND playlists are loaded
3. Find the playlist and select it
4. Clear the pending selection

---

## Common Patterns & Best Practices

### 1. Separation of Concerns

```
/queries         - React Query hooks (data fetching)
/hooks           - Custom React hooks (business logic)
/components      - UI components (presentation)
/store           - UI state management
```

### 2. Custom Hooks Pattern

Custom hooks encapsulate logic and make it reusable:

```typescript
export function usePlaylistManagement({ playlists: initialPlaylists }) {
  const { data: playlists } = usePlaylists(initialPlaylists);
  
  const mappedPlaylists = useMemo(() => {
    return playlists.map(mapPlaylistToUIFormat);
  }, [playlists]);
  
  // More logic...
  
  return {
    filteredPlaylists,
    selectedPlaylist,
    updateSelectedPlaylist,
  };
}
```

### 3. Optimistic Updates

Update UI immediately, then sync with server:

```typescript
// We update cache immediately in onSuccess
// UI feels instant even though server call takes time
queryClient.setQueryData(key, newData);
```

### 4. Error Handling

React Query provides error states automatically:

```typescript
const { data, isLoading, error } = useQuery({...});

if (isLoading) return <Spinner />;
if (error) return <Error message={error.message} />;
return <PlaylistList data={data} />;
```

### 5. TypeScript Integration

TypeScript helps catch errors and provides intellisense:

```typescript
interface PlaylistUIFormat {
  id: string;
  name: string;
  spotifyId: string;  // We added this to fix our selection issue!
}
```

---

## Key Takeaways

1. **React State**: Use `useState` for UI state that changes over time
2. **React Effects**: Use `useEffect` to synchronize with external systems
3. **React Query**: Handles all server state management complexity
4. **Cache Management**: Update cache directly for instant UI updates
5. **Separation**: Keep data fetching, business logic, and UI separate
6. **TypeScript**: Helps catch errors early and documents your code

## The Problem We Solved

We needed to:
1. Create a playlist on the server
2. Update the local cache
3. Switch to the correct tab
4. Select the new playlist automatically

Our solution uses:
- React Query for server state
- React state for pending selection
- React effects for automatic selection
- TypeScript for type safety

This is a common pattern in React apps: combine server state (React Query) with local UI state (useState) to create smooth user experiences!