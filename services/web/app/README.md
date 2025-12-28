# Spotify Auto Sort Liked Songs - Application Structure

This document outlines the structure of the application after refactoring.

## Directory Structure

- `app/`
  - `features/` - Feature-focused modules
    - `auth/` - Authentication functionality
    - `tracks/` - Track management
    - `playlists/` - Playlist functionality
    - `analysis/` - Music analysis
    - `matching/` - Track matching
  - `shared/` - Shared components and utilities
    - `components/` - Reusable UI components
    - `layouts/` - Layout components
    - `hooks/` - Custom React hooks
    - `utils/` - Utility functions
  - `lib/` - Core infrastructure
    - `api/` - API clients
    - `db/` - Database access
    - `models/` - Domain models
    - `repositories/` - Data access layer
    - `services/` - Application services
    - `stores/` - State management
  - `routes/` - React Router routes
  - `types/` - TypeScript type definitions

## Architecture Principles

1. **Feature-First Organization**: Code is organized around features rather than technical concerns
2. **Separation of Concerns**: Clear boundaries between UI, application logic, and data access
3. **Shared Components**: Reusable components are in the shared directory
4. **Domain-Driven Design**: Core business logic is modeled in the lib directory
5. **Composition over Inheritance**: Components are composed rather than extended

## Development Workflow

When adding new functionality:

1. Identify which feature it belongs to
2. Add code to the appropriate feature directory
3. If code is used by multiple features, move it to shared or lib
4. Update routes to compose the new functionality
5. Follow established patterns and naming conventions

## Import Conventions

- Use absolute imports with the `~` alias
- Example: `import { Component } from '~/shared/components/Component'`
- Order imports: React, React Router, third-party, application

## State Management

- Zustand stores are used for global state
- Store files are organized in lib/stores
- Each store has a specific responsibility
- UI components access stores through hooks

## Dependency Notes & Known Issues

### React Router (pinned to 7.6.x)

**Issue:** React Router 7.7.0+ introduces a CSS clearing behavior after initial hydration ([PR #13872](https://github.com/remix-run/react-router/pull/13872)). When combined with browser extensions that modify the DOM (DarkReader, Grammarly, password managers, etc.), this causes:

1. Hydration mismatch (extensions inject content before React hydrates)
2. React falls back to full client re-render
3. Critical CSS gets cleared during this process
4. **Result:** Flash of unstyled content for users with certain extensions

**Current solution:** Pinned to React Router 7.6.3 which doesn't have this CSS clearing behavior.

**Future upgrade path:**

- **React 19** is reportedly more forgiving with hydration mismatches
- Wait for React Router to fix this edge case (CSS shouldn't clear when hydration fails)
- Consider upgrading React to v19 first, then React Router

**Related issues:**

- [remix-run/remix#2947](https://github.com/remix-run/remix/issues/2947) - hydrateRoot with extensions
- [facebook/react#24430](https://github.com/facebook/react/issues/24430) - Hydration mismatch from plugins
