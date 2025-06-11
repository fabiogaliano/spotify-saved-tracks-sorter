# Authentication Guide

This guide explains the authentication patterns used in this Spotify application, including token management, session handling, and proper usage of auth utilities.

## Overview

The application uses Spotify OAuth with automatic token refresh. The key challenge is ensuring refreshed tokens are properly propagated back to the client to avoid infinite refresh loops.

## Core Authentication Functions

### 1. `getUserSession(request: Request)`

**Purpose**: Gets the user session if it exists, without redirecting.

**Returns**: 
```typescript
{
  session: SpotifySession | null,
  spotifyApi: SpotifyWebApi,
  userId: number,
  hasSetupCompleted: boolean,
  spotifyUser: { id, name, email, image },
  wasRefreshed: boolean,
  cookieHeader?: string
} | null
```

**When to use**: 
- In loaders that need to work for both authenticated and unauthenticated users
- When you need to check auth status without forcing login

**Example**:
```typescript
export async function loader({ request }: LoaderFunctionArgs) {
  const sessionData = await getUserSession(request)
  
  if (!sessionData) {
    // Handle unauthenticated case
    return { authenticated: false }
  }
  
  // Use sessionData
  const data = await fetchUserData(sessionData.userId)
  
  // IMPORTANT: Use createResponseWithUpdatedSession for the response
  return createResponseWithUpdatedSession(data, sessionData)
}
```

### 2. `requireUserSession(request: Request)`

**Purpose**: Requires a user session, redirecting to home page if not found.

**Returns**: Same as `getUserSession`, but never null (throws redirect instead)

**When to use**:
- In protected routes that require authentication
- In actions (form submissions)
- When you want automatic redirect for unauthenticated users

**Example**:
```typescript
// In an action
export async function action({ request }: ActionFunctionArgs) {
  const sessionData = await requireUserSession(request)
  
  // No need to check if sessionData is null - it will redirect if so
  const formData = await request.formData()
  
  // Process the action...
  await doSomething(sessionData.userId)
  
  // For actions, just return data - no special handling needed
  return { success: true }
}

// In a loader
export async function loader({ request }: LoaderFunctionArgs) {
  const sessionData = await requireUserSession(request)
  
  const data = await fetchProtectedData(sessionData.userId)
  
  // Even with requireUserSession, use createResponseWithUpdatedSession
  return createResponseWithUpdatedSession(data, sessionData)
}
```

### 3. `createResponseWithUpdatedSession(data, sessionData, options?)`

**Purpose**: Creates a JSON response with updated session cookie if the token was refreshed.

**When to use**: 
- In ALL loaders that return JSON data (not redirects)
- In API routes that return JSON

**Why it's needed**: When a token is refreshed server-side, the new token must be sent back to the client via Set-Cookie header. Without this, the client keeps sending the old expired token, causing an infinite refresh loop.

## Authentication Patterns by Route Type

### 1. Actions (Form Submissions)

Actions typically redirect or return JSON. React Router automatically handles session cookies on redirects.

```typescript
// ✅ CORRECT - Actions just need requireUserSession
export async function action({ request }: ActionFunctionArgs) {
  const sessionData = await requireUserSession(request)
  
  // Do your work
  const result = await processForm(sessionData.userId)
  
  // Just return data - no special handling needed
  return { success: true, data: result }
}
```

### 2. Loaders (Data Fetching)

Loaders that return JSON data MUST use `createResponseWithUpdatedSession`.

```typescript
// ✅ CORRECT - Loaders need createResponseWithUpdatedSession
export async function loader({ request }: LoaderFunctionArgs) {
  const sessionData = await getUserSession(request)
  
  if (!sessionData) {
    return redirect('/')
  }
  
  const data = await fetchData(sessionData.userId)
  
  // This ensures refreshed tokens are sent back to client
  return createResponseWithUpdatedSession(data, sessionData)
}

// ❌ WRONG - This will cause token refresh loops
export async function loader({ request }: LoaderFunctionArgs) {
  const sessionData = await getUserSession(request)
  
  if (!sessionData) {
    return redirect('/')
  }
  
  const data = await fetchData(sessionData.userId)
  
  // Missing createResponseWithUpdatedSession!
  return json(data)
}
```

### 3. API Routes

API routes are similar to loaders - they must handle cookie propagation.

```typescript
// ✅ CORRECT
export async function loader({ request }: LoaderFunctionArgs) {
  const sessionData = await requireUserSession(request)
  
  const result = await apiOperation(sessionData.userId)
  
  return createResponseWithUpdatedSession(
    { success: true, data: result },
    sessionData
  )
}
```

### 4. Root Loader

The root loader is special - it runs on every navigation and should handle auth gracefully.

```typescript
export async function loader({ request }: LoaderFunctionArgs) {
  const sessionData = await getUserSession(request)
  
  const responseData = {
    isAuthenticated: !!sessionData,
    user: sessionData?.spotifyUser || null
  }
  
  return createResponseWithUpdatedSession(responseData, sessionData)
}
```

## Token Refresh Flow

1. **Client Request**: Browser sends request with session cookie
2. **Server Check**: Server checks if token expires within 5 minutes
3. **Refresh if Needed**: If expiring soon, server refreshes token with Spotify
4. **Update Session**: Server updates session with new token and expiry
5. **Send Cookie**: Server includes Set-Cookie header in response
6. **Client Update**: Browser automatically updates cookie for future requests

## Common Pitfalls

### 1. Forgetting Cookie Propagation in Loaders

```typescript
// ❌ WRONG - Will cause refresh loops
export async function loader({ request }: LoaderFunctionArgs) {
  const sessionData = await requireUserSession(request)
  return json({ data: 'something' })
}

// ✅ CORRECT
export async function loader({ request }: LoaderFunctionArgs) {
  const sessionData = await requireUserSession(request)
  return createResponseWithUpdatedSession({ data: 'something' }, sessionData)
}
```

### 2. Using createResponseWithUpdatedSession in Actions

```typescript
// ❌ UNNECESSARY - Actions don't need special handling
export async function action({ request }: ActionFunctionArgs) {
  const sessionData = await requireUserSession(request)
  // ... do work ...
  return createResponseWithUpdatedSession({ success: true }, sessionData)
}

// ✅ CORRECT - Actions can just return data
export async function action({ request }: ActionFunctionArgs) {
  const sessionData = await requireUserSession(request)
  // ... do work ...
  return { success: true }
}
```

### 3. Not Handling Unauthenticated State

```typescript
// ❌ WRONG - Assumes session always exists
export async function loader({ request }: LoaderFunctionArgs) {
  const sessionData = await getUserSession(request)
  const userId = sessionData.userId // Might crash!
}

// ✅ CORRECT - Handles null case
export async function loader({ request }: LoaderFunctionArgs) {
  const sessionData = await getUserSession(request)
  
  if (!sessionData) {
    return redirect('/') // or return public data
  }
  
  const userId = sessionData.userId // Safe to use
}
```

## Debugging Authentication

### Enable Debug Logging

Set the `AUTH_DEBUG` environment variable:

```bash
AUTH_DEBUG=true bun run dev
```

This will show:
- Token expiration checks
- Refresh operations
- Session validations

### Common Issues

1. **Infinite Refresh Loops**
   - **Symptom**: Logs show constant token refreshes
   - **Cause**: Loader not using `createResponseWithUpdatedSession`
   - **Fix**: Add proper cookie propagation to all loaders

2. **Session Lost After Refresh**
   - **Symptom**: User logged out after token refresh
   - **Cause**: Cookie not being sent back to client
   - **Fix**: Ensure using `createResponseWithUpdatedSession`

3. **Race Conditions**
   - **Symptom**: Multiple refresh attempts for same user
   - **Cause**: Parallel requests triggering simultaneous refreshes
   - **Status**: Fixed with refresh promise deduplication

## Best Practices

1. **Always use `requireUserSession` for protected routes** - It handles redirects automatically

2. **Always use `createResponseWithUpdatedSession` in loaders** - Even if using `requireUserSession`

3. **Don't assume session structure** - Always check for null/undefined

4. **Keep tokens secure** - Never log tokens or include them in client-side code

5. **Handle errors gracefully** - Network issues during refresh should not crash the app

## Quick Reference

| Route Type | Auth Function | Response Pattern |
|------------|---------------|------------------|
| Public Loader | `getUserSession` | `createResponseWithUpdatedSession` |
| Protected Loader | `requireUserSession` | `createResponseWithUpdatedSession` |
| Action | `requireUserSession` | Plain `return { data }` |
| API Route | `requireUserSession` | `createResponseWithUpdatedSession` |

## Environment Variables

- `AUTH_DEBUG=true` - Enable verbose authentication logging
- `SPOTIFY_CLIENT_ID` - Spotify app client ID
- `SPOTIFY_CLIENT_SECRET` - Spotify app client secret
- `SPOTIFY_CALLBACK_URL` - OAuth callback URL
- `SESSION_SECRET` - Secret for signing session cookies

## Further Reading

- [Spotify Web API Authorization Guide](https://developer.spotify.com/documentation/web-api/tutorials/code-flow)
- [React Router Authentication Patterns](https://reactrouter.com/en/main/guides/auth)
- [Remix Auth Spotify Strategy](https://github.com/remix-run/remix-auth-spotify)